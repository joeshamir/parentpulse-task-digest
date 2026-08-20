import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';

import { env } from './env.js';
import { extractTasks } from './extract.js';
import { sendTask, syncGroups, getReconnectRequest, ackReconnect } from './ingest.js';
import { transcribeVoice } from './transcribe.js';
import { startNotificationScheduler } from './notify.js';
import {
  startHealthServer,
  setState,
  markQr,
  markMessage,
  markTaskSent,
  markActionable,
  markIngestFailure,
  markSkipped,
  markGroupSync,
  logDecision,
} from './health.js';

const logger = pino({ level: 'warn' });

// --- Process lifecycle -------------------------------------------------
// A background worker must never exit on an isolated failure: log and keep going.
process.on('uncaughtException', (error) => {
  console.error('[fatal] uncaughtException:', error?.stack || error);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

let shuttingDown = false;
let socket;

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[lifecycle] ${signal} received, closing WhatsApp socket`);
    try {
      socket?.end?.(undefined);
    } catch {
      /* ignore */
    }
    setTimeout(() => process.exit(0), 1500).unref();
  });
}

// Keeps the event loop alive even if the socket is temporarily down.
setInterval(() => {}, 1 << 30);

// --- Message handling --------------------------------------------------
let selectedGroupJids = new Set();
let hasCloudSelections = false;
let lastSelectionRefreshAt = 0;
let selectionRefreshPromise;

function isTracked(groupName, jid) {
  if (hasCloudSelections) return selectedGroupJids.has(jid);
  if (env.trackedGroups.length === 0) return true;
  return env.trackedGroups.some((name) =>
    groupName.toLowerCase().includes(name.toLowerCase()),
  );
}

async function refreshSelections() {
  const now = Date.now();
  if (selectionRefreshPromise) return selectionRefreshPromise;
  if (now - lastSelectionRefreshAt < 5000) return;
  lastSelectionRefreshAt = now;
  selectionRefreshPromise = syncGroups([], 'connected')
    .then((rows) => {
      if (!rows) return;
      const selected = rows.filter((group) => group.is_tracked);
      selectedGroupJids = new Set(selected.map((group) => group.group_jid));
      hasCloudSelections = rows.length > 0;
      markGroupSync(selected.length, selected.map((group) => group.group_name));
    })
    .finally(() => {
      selectionRefreshPromise = undefined;
    });
  return selectionRefreshPromise;
}

function textOf(message) {
  const content = message.message;
  if (!content) return '';
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ''
  );
}

async function handleMessage(sock, message) {
  const jid = message.key?.remoteJid;
  if (!jid || !jid.endsWith('@g.us')) {
    markSkipped('not-group');
    return;
  }
  markMessage();
  if (message.key.fromMe) {
    markSkipped('sent-by-self');
    return;
  }

  await refreshSelections();

  let groupName = jid;
  try {
    const metadata = await sock.groupMetadata(jid);
    groupName = metadata?.subject || jid;
  } catch {
    /* fall back to jid */
  }
  if (!isTracked(groupName, jid)) {
    markSkipped('group-not-tracked');
    logDecision('group-not-tracked', groupName);
    console.log(`[filter] ignored unselected group: ${groupName}`);
    return;
  }

  let text = textOf(message);

  const audio = message.message?.audioMessage;
  if (!text && audio) {
    const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger });
    text = await transcribeVoice(buffer);
  }
  if (!text) {
    const reason = audio ? 'transcription-unavailable' : 'no-text';
    markSkipped(reason);
    logDecision(reason, groupName);
    return;
  }

  // text stays in memory only; it is never written to disk or a database
  const { tasks, source } = await extractTasks(text, groupName);
  markClassifierSource(source);

  if (tasks.length === 0) {
    const reason = source === 'keyword' ? 'not-actionable-keyword' : 'not-actionable-ai';
    markSkipped(reason);
    logDecision(reason, groupName);
    return;
  }

  for (const task of tasks) {
    markActionable();
    const sent = await sendTask(task);
    if (sent) {
      markTaskSent();
      logDecision('task-sent', groupName, source);
    } else {
      markIngestFailure();
      logDecision('ingest-failed', groupName, source);
    }
  }
}

async function refreshGroups(sock, state = 'connected') {
  try {
    const metadata = await sock.groupFetchAllParticipating();
    const available = Object.values(metadata).map((group) => ({
      jid: group.id,
      name: group.subject || group.id,
    }));
    const rows = await syncGroups(available, state);
    if (!rows) return;
    const selected = rows.filter((group) => group.is_tracked);
    selectedGroupJids = new Set(selected.map((group) => group.group_jid));
    hasCloudSelections = rows.length > 0;
    lastSelectionRefreshAt = Date.now();
    markGroupSync(selected.length, selected.map((group) => group.group_name));
    console.log(`[groups] synced ${available.length} groups; ${selected.length} selected`);
  } catch (error) {
    console.error('[groups] refresh failed:', error.message);
  }
}

// --- Connection --------------------------------------------------------
let reconnectDelay = 2000;
let qrAttempt = 0;
let lastReconnectRequestAt = null;
let reconnectPollInterval;
let heartbeatInterval;
let watchdogInterval;
// Current state as the app should see it, plus when we entered it. Used for
// the heartbeat (liveness) and the stuck-state watchdog.
let currentState = 'pending_qr';
let stateSince = Date.now();

function setConnectionState(next) {
  if (currentState !== next) {
    currentState = next;
    stateSince = Date.now();
  }
  setState(next === 'connected' ? 'connected' : next === 'disconnected' ? 'disconnected' : 'pending_qr');
}


async function connect() {
  const authDir = path.resolve(env.authDir);
  mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrAttempt += 1;
      markQr();
      setConnectionState('pending_qr');
      void syncGroups([], 'pending_qr', qr);
      console.log(`\n[whatsapp] ===== QR #${qrAttempt} (use the NEWEST one) =====`);
      console.log('[whatsapp] Easiest: open this link in your browser and scan the image:');
      console.log(
        `[whatsapp] https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`,
      );
      console.log('[whatsapp] Or scan the code below in WhatsApp > Linked devices:');
      qrcode.generate(qr, { small: false });
      console.log(`[whatsapp] raw pairing string (fallback): ${qr}`);
      console.log('[whatsapp] ===== end QR =====\n');
    }
    if (connection === 'open') {
      reconnectDelay = 2000;
      setConnectionState('connected');
      console.log('[whatsapp] connected');
      void refreshGroups(socket);
    }
    if (connection === 'close') {
      setConnectionState('disconnected');
      void syncGroups([], 'disconnected');

      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        if (restarting) return;
        console.error('[whatsapp] logged out — clearing session so a fresh QR is generated');
        void forceFreshQr();
        return;
      }
      if (shuttingDown || restarting) return;
      console.warn(`[whatsapp] disconnected (${code}); reconnecting in ${reconnectDelay}ms`);
      setTimeout(() => {
        connect().catch((error) => console.error('[whatsapp] reconnect failed:', error.message));
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 60_000);
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    // 'append' carries messages that land while the socket is (re)syncing.
    if (type !== 'notify' && type !== 'append') {
      markSkipped(`event-${type || 'unknown'}`);
      return;
    }
    for (const message of messages) {
      try {
        await handleMessage(socket, message);
      } catch (error) {
        console.error('[handler] message failed:', error.message);
      }
    }
  });

  setInterval(() => {
    if (socket) void refreshGroups(socket);
  }, 60_000).unref();

  // Watch for reconnect requests from the app. When the user taps
  // "Re-scan QR", we drop the stored WhatsApp session entirely so Baileys
  // must emit a fresh QR (simply ending the socket would silently re-login).
  // Polled fast so the QR appears within a couple of seconds.
  if (reconnectPollInterval) clearInterval(reconnectPollInterval);
  reconnectPollInterval = setInterval(async () => {
    if (restarting) return;
    const requestedAt = await getReconnectRequest();
    if (!requestedAt) return;
    if (lastReconnectRequestAt && new Date(requestedAt) <= new Date(lastReconnectRequestAt)) return;
    lastReconnectRequestAt = requestedAt;
    await forceFreshQr();
  }, 2_000).unref();

  // Heartbeat: refresh the session row so the app can tell the bridge is
  // alive (it compares whatsapp_sessions.updated_at against "now").
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (restarting) return;
    void syncGroups([], currentState);
  }, 15_000).unref();

  // Watchdog: if we never reach "open" (or stay closed) for two minutes,
  // rebuild the session ourselves so the user never has to redeploy.
  if (watchdogInterval) clearInterval(watchdogInterval);
  watchdogInterval = setInterval(() => {
    if (restarting || shuttingDown) return;
    if (currentState === 'connected') return;
    if (Date.now() - stateSince < 120_000) return;
    console.warn('[whatsapp] stuck in a non-connected state for 2 minutes; self-restarting');
    void forceFreshQr();
  }, 20_000).unref();
}


let restarting = false;

async function forceFreshQr() {
  restarting = true;
  console.log('[whatsapp] reconnect requested from app; clearing session for a fresh QR');
  // Reset the watchdog clock so a restart is not immediately retried.
  setConnectionState('pending_qr');
  stateSince = Date.now();
  // Tell the app immediately so the UI stops showing a stale "Connected".
  await syncGroups([], 'pending_qr', null, true);

  try {
    await socket?.logout?.();
  } catch (error) {
    console.warn('[whatsapp] logout failed (continuing):', error?.message);
  }
  try {
    socket?.end?.(undefined);
  } catch {
    /* ignore */
  }
  socket = undefined;
  try {
    rmSync(path.resolve(env.authDir), { recursive: true, force: true });
  } catch (error) {
    console.error('[whatsapp] could not clear auth dir:', error?.message);
  }
  // Give the old socket a moment to unwind before opening a new one.
  await new Promise((r) => setTimeout(r, 1500));
  restarting = false;
  connect().catch((error) => console.error('[whatsapp] fresh connect failed:', error?.message));
}

console.log('[boot] ParentPulse worker starting');
console.log(`[boot] auth dir: ${path.resolve(env.authDir)}`);
startHealthServer();
startNotificationScheduler();
// Treat any pending request as already handled: a boot is a fresh connection.
// If the app asked for a reconnect while the worker was offline, clear the
// flag so the worker does not immediately restart right after coming up.
getReconnectRequest()
  .then(async (requestedAt) => {
    if (!requestedAt) return;
    console.log('[boot] clearing stale reconnect request from app');
    lastReconnectRequestAt = requestedAt;
    await ackReconnect();
  })
  .catch(() => {});
connect().catch((error) => {
  console.error('[boot] initial connect failed:', error?.stack || error);
  setTimeout(() => connect().catch(() => {}), 5000);
});

