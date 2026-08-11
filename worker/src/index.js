import { mkdirSync } from 'node:fs';
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
import { extractTask } from './extract.js';
import { sendTask, syncGroups, getReconnectRequest } from './ingest.js';
import { transcribeVoice } from './transcribe.js';
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

  const task = extractTask(text, groupName);
  // text stays in memory only; it is never written to disk or a database
  if (task) {
    markActionable();
    const sent = await sendTask(task);
    if (sent) {
      markTaskSent();
      logDecision('task-sent', groupName);
    } else {
      markIngestFailure();
      logDecision('ingest-failed', groupName);
    }
  } else {
    markSkipped('not-actionable');
    logDecision('not-actionable', groupName);
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
      setState('connected');
      console.log('[whatsapp] connected');
      void refreshGroups(socket);
    }
    if (connection === 'close') {
      setState('disconnected');
      void syncGroups([], 'disconnected');
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error('[whatsapp] logged out — delete the auth volume and re-pair');
        return;
      }
      if (shuttingDown) return;
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
  // "Re-scan QR", we end the socket so Baileys generates a fresh QR.
  if (reconnectPollInterval) clearInterval(reconnectPollInterval);
  reconnectPollInterval = setInterval(async () => {
    const requestedAt = await getReconnectRequest();
    if (!requestedAt) return;
    if (lastReconnectRequestAt && new Date(requestedAt) <= new Date(lastReconnectRequestAt)) return;
    lastReconnectRequestAt = requestedAt;
    console.log('[whatsapp] reconnect requested from app; restarting socket for fresh QR');
    try {
      socket?.end?.(undefined);
    } catch {
      /* ignore */
    }
  }, 5_000).unref();
}

console.log('[boot] ParentPulse worker starting');
console.log(`[boot] auth dir: ${path.resolve(env.authDir)}`);
startHealthServer();
connect().catch((error) => {
  console.error('[boot] initial connect failed:', error?.stack || error);
  setTimeout(() => connect().catch(() => {}), 5000);
});
