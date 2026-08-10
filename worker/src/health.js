import http from 'node:http';

const startedAt = Date.now();

// Shared, non-sensitive status. No chat content, no secrets.
export const status = {
  state: 'starting', // starting | qr-pending | connected | disconnected
  connected: false,
  lastQrAt: null,
  lastMessageAt: null,
  lastTaskAt: null,
  tasksSent: 0,
  messagesReceived: 0,
  actionableMessages: 0,
  ingestFailures: 0,
  selectedGroups: 0,
  lastGroupSyncAt: null,
  skipped: {},
  selectedGroupNames: [],
  // Rolling log of the last decisions. Never contains message text.
  recentDecisions: [],
};

const MAX_DECISIONS = 20;

export function logDecision(decision, groupName = null, detail = null) {
  status.recentDecisions.unshift({
    at: new Date().toISOString(),
    decision,
    group: groupName ? String(groupName).slice(0, 80) : null,
    detail: detail ? String(detail).slice(0, 80) : null,
  });
  if (status.recentDecisions.length > MAX_DECISIONS) status.recentDecisions.pop();
}

export function setState(state) {
  status.state = state;
  status.connected = state === 'connected';
}

export function markQr() {
  status.lastQrAt = new Date().toISOString();
  setState('qr-pending');
}

export function markMessage() {
  status.messagesReceived += 1;
  status.lastMessageAt = new Date().toISOString();
}

export function markActionable() {
  status.actionableMessages += 1;
}

export function markIngestFailure() {
  status.ingestFailures += 1;
}

export function markSkipped(reason) {
  status.skipped[reason] = (status.skipped[reason] || 0) + 1;
}

export function markTaskSent() {
  status.tasksSent += 1;
  status.lastTaskAt = new Date().toISOString();
}

export function markGroupSync(selectedGroups, names = []) {
  status.selectedGroups = selectedGroups;
  status.selectedGroupNames = names.slice(0, 100);
  status.lastGroupSyncAt = new Date().toISOString();
}

export function startHealthServer() {
  const port = Number(process.env.PORT) || 8080;

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url !== '/' && url !== '/health') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }

    const body = {
      service: 'parentpulse-worker',
      ...status,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    };

    res.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body, null, 2));
  });

  server.on('error', (error) => {
    console.error('[health] server error:', error.message);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[health] status endpoint listening on :${port} (/health)`);
  });

  return server;
}
