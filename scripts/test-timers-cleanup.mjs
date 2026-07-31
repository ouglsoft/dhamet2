import fs from 'node:fs';

const passive = fs.readFileSync('js/online.passive.js', 'utf8');
const online = fs.readFileSync('js/online.js', 'utf8');
const rules = fs.readFileSync('database.rules.json', 'utf8');
const workflow = fs.readFileSync('.github/workflows/firebase-secondary-cleanup.yml', 'utf8');
const cleanup = fs.readFileSync('scripts/firebase-secondary-cleanup.mjs', 'utf8');

const requiredPassive = [
  'const PRESENCE_STABLE_TTL_MS = 180 * 1000',
  'const PRESENCE_HEARTBEAT_MS = 25 * 1000',
  'const GAME_PRESENCE_HEARTBEAT_MS = 12 * 1000',
  'const SPECTATOR_COUNT_STALE_MS = 180 * 1000',
  'const ROOM_LOBBY_STALE_MS = 2 * 60 * 1000',
  'const ROOM_ABANDONED_CLEANUP_MS = 30 * 60 * 1000',
  'const ROOM_ENDED_PURGE_DELAY_MS = 60 * 60 * 1000',
  'const ROOM_REJECTED_PURGE_DELAY_MS = 15 * 60 * 1000',
  'const ROOM_PENDING_PURGE_DELAY_MS = 2 * 24 * 60 * 60 * 1000',
  'const INVITE_TTL_MS = 60 * 1000',
  'const UNDO_REQUEST_TTL_MS = 5 * 60 * 1000',
  'const PERSIST_GAME_TTL_MS = 1000 * 60 * 60 * 12',
  'Date.now() - ts > PERSIST_GAME_TTL_MS',
  'No room-data deletion here.',
];
for (const token of requiredPassive) {
  if (!passive.includes(token)) throw new Error(`Missing timer contract: ${token}`);
}
for (const token of [
  'setInterval(() =>',
  'SPECTATOR_HEARTBEAT_MS',
  'nowTs() - undoRequestedAt >= UNDO_REQUEST_TTL_MS',
  '[1500, 5000, 12000]',
  '[4000, 8000, 15000]',
  '_lastReadWriteAt',
]) {
  if (!online.includes(token)) throw new Error(`Missing runtime timer behavior: ${token}`);
}
if (!rules.includes("newData.hasChildren(['uid','nickname','joinedAt','updatedAt'])")) {
  throw new Error('Spectator heartbeat timestamp is not allowed by Firebase rules');
}
for (const token of ['schedule:', '7,22,37,52 * * * *', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'firebase-secondary-cleanup.mjs']) {
  if (!workflow.includes(token)) throw new Error(`Secondary cleanup workflow missing: ${token}`);
}
for (const token of ['activeAbandoned: 30 * 60_000', 'ended: 60 * 60_000', 'rejected: 15 * 60_000', 'pending: 2 * 24 * 60 * 60_000', 'maxChatMessages: 200', 'undo: 5 * 60_000']) {
  if (!cleanup.includes(token)) throw new Error(`Secondary cleanup policy missing: ${token}`);
}
if (!/Unknown\/future states[\s\S]*LIMITS\.pending/.test(cleanup)) {
  throw new Error('Unknown game states must use the conservative pending retention window');
}
if (/catch \(e\) \{[\s\S]{0,350}roomList[\s\S]{0,100}remove\(\)[\s\S]{0,100}return true/.test(passive)) {
  throw new Error('A transient stale-room read failure must not remove the room');
}
console.log('timer and Firebase secondary cleanup tests passed');
