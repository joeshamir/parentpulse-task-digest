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
import { sendTask } from './ingest.js';
import { transcribeVoice } from './transcribe.js';
import {
  startHealthServer,
  setState,
  markQr,
  markMessage,
  markTaskSent,
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
function isTracked(groupName) {
  if (env.trackedGroups.length === 0) return true;
  return env.trackedGroups.some((name) =>
    groupName.toLowerCase().includes(name.toLowerCase()),
  );
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
  if (!jid || !jid.endsWith('@g.us')) return; // groups only
  if (message.key.fromMe) return;

  let groupName = jid;
  try {
    const metadata = await sock.groupMetadata(jid);
    groupName = metadata?.subject || jid;
  } catch {
    /* fall back to jid */
  }
  if (!isTracked(groupName)) return;

  let text = textOf(message);

  const audio = message.message?.audioMessage;
  if (!text && audio) {
    const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger });
    text = await transcribeVoice(buffer);
  }
  if (!text) return;

  markMessage();
  const task = extractTask(text, groupName);
  // text stays in memory only; it is never written to disk or a database
  if (task) {
    await sendTask(task);
    markTaskSent();
  }
}

// --- Connection --------------------------------------------------------
let reconnectDelay = 2000;
let qrAttempt = 0;

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
      console.log('[whatsapp] connected');
    }
    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        console.error('[whatsapp] logged out — delete the auth volume and re-pair');
        return;
      }
      if (shuttingDown) return;
      console.warn(`[whatsapp] disconnected (${status}); reconnecting in ${reconnectDelay}ms`);
      setTimeout(() => {
        connect().catch((error) => console.error('[whatsapp] reconnect failed:', error.message));
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 60_000);
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      try {
        await handleMessage(socket, message);
      } catch (error) {
        console.error('[handler] message failed:', error.message);
      }
    }
  });
}

console.log('[boot] ParentPulse worker starting');
console.log(`[boot] auth dir: ${path.resolve(env.authDir)}`);
connect().catch((error) => {
  console.error('[boot] initial connect failed:', error?.stack || error);
  setTimeout(() => connect().catch(() => {}), 5000);
});
