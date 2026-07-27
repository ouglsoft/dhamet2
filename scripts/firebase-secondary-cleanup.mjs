import { createSign } from 'node:crypto';

const NOW = Date.now();
const DB_URL = String(process.env.FIREBASE_DATABASE_URL || 'https://dhamet2-default-rtdb.firebaseio.com').replace(/\/+$/, '');
const DRY_RUN = /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || ''));

const LIMITS = Object.freeze({
  lobbyPresence: 180_000,
  secondaryPresencePurge: 15 * 60_000,
  invite: 60_000,
  roomListStale: 2 * 60_000,
  gamePresence: 45_000,
  activeAbandoned: 30 * 60_000,
  ended: 60 * 60_000,
  rejected: 15 * 60_000,
  pending: 2 * 24 * 60 * 60_000,
  spectator: 180_000,
  undo: 5 * 60_000,
  rtc: 2 * 60_000,
  chatRead: 7 * 24 * 60 * 60_000,
  userEventFallback: 2 * 24 * 60 * 60_000,
  maxChatMessages: 200,
});

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function base64url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseServiceAccount() {
  const raw = required('FIREBASE_SERVICE_ACCOUNT_JSON');
  try {
    return JSON.parse(raw);
  } catch (_) {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

async function oauthAccessToken() {
  const account = parseServiceAccount();
  if (!account.client_email || !account.private_key) throw new Error('Firebase service account is incomplete');
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(account.private_key))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Firebase OAuth failed (${response.status})`);
  return { kind: 'access_token', value: data.access_token };
}

async function credentials() {
  const direct = String(process.env.FIREBASE_CLEANUP_TOKEN || '').trim();
  if (direct) return { kind: 'auth', value: direct };
  return oauthAccessToken();
}

function pathUrl(path, cred) {
  const clean = String(path || '').replace(/^\/+|\/+$/g, '');
  const key = cred.kind === 'auth' ? 'auth' : 'access_token';
  return `${DB_URL}/${clean ? `${clean}.json` : '.json'}?${key}=${encodeURIComponent(cred.value)}`;
}

async function read(path, cred) {
  const response = await fetch(pathUrl(path, cred), { headers: { accept: 'application/json' } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Firebase read ${path} failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

async function patchRoot(updates, cred) {
  if (!Object.keys(updates).length || DRY_RUN) return;
  const response = await fetch(pathUrl('', cred), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Firebase cleanup PATCH failed (${response.status}): ${JSON.stringify(data)}`);
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function latest(...values) {
  return Math.max(0, ...values.map(num));
}

function gameActivity(game, room) {
  const presence = object(game.presence);
  const presenceTimes = Object.values(presence).map((p) => latest(p && p.updatedAt, p && p.joinedAt));
  return latest(
    game.createdAt,
    game.acceptedAt,
    game.endedAt,
    game.lastMove && game.lastMove.ts,
    room && room.updatedAt,
    ...presenceTimes,
  );
}

function hasFreshGamePresence(game) {
  return Object.values(object(game.presence)).some((p) => {
    const ts = latest(p && p.updatedAt, p && p.joinedAt);
    return ts && NOW - ts <= LIMITS.gamePresence;
  });
}

function purgeRoom(updates, gid) {
  for (const prefix of ['games', 'roomList', 'chats', 'rtc', 'spectators']) updates[`${prefix}/${gid}`] = null;
}

function cleanupNestedInvites(invites, updates, counts) {
  for (const [toUid, items] of Object.entries(object(invites))) {
    for (const [inviteId, invite] of Object.entries(object(items))) {
      const createdAt = num(invite && invite.createdAt);
      const expiresAt = num(invite && invite.expiresAt) || createdAt + LIMITS.invite;
      if (expiresAt && NOW >= expiresAt) {
        updates[`invites/${toUid}/${inviteId}`] = null;
        counts.invites += 1;
      }
    }
  }
}

function cleanupUserEvents(events, updates, counts) {
  for (const [uid, items] of Object.entries(object(events))) {
    for (const [eventId, event] of Object.entries(object(items))) {
      const createdAt = num(event && event.createdAt);
      const expiresAt = num(event && event.expiresAt) || createdAt + LIMITS.userEventFallback;
      if (expiresAt && NOW >= expiresAt) {
        updates[`userEvents/${uid}/${eventId}`] = null;
        counts.userEvents += 1;
      }
    }
  }
}

function cleanupChats(chats, games, purgedGameIds, updates, counts) {
  for (const [gid, chat] of Object.entries(object(chats))) {
    if (purgedGameIds.has(gid)) continue;
    if (!games[gid]) {
      updates[`chats/${gid}`] = null;
      counts.orphans += 1;
      continue;
    }
    const messages = object(chat && chat.messages);
    const ordered = Object.entries(messages).sort((a, b) => latest(a[1] && a[1].ts) - latest(b[1] && b[1].ts));
    for (const [id] of ordered.slice(0, Math.max(0, ordered.length - LIMITS.maxChatMessages))) {
      updates[`chats/${gid}/messages/${id}`] = null;
      counts.chatMessages += 1;
    }
    for (const [uid, readState] of Object.entries(object(chat && chat.reads))) {
      const ts = latest(readState && readState.updatedAt, readState && readState.lastReadTs);
      if (!ts || NOW - ts >= LIMITS.chatRead) {
        updates[`chats/${gid}/reads/${uid}`] = null;
        counts.chatReads += 1;
      }
    }
  }
}

function cleanupRtc(rtc, games, purgedGameIds, updates, counts) {
  for (const [gid, data] of Object.entries(object(rtc))) {
    if (purgedGameIds.has(gid)) continue;
    if (!games[gid]) {
      updates[`rtc/${gid}`] = null;
      counts.orphans += 1;
      continue;
    }
    for (const [uid, participant] of Object.entries(object(data && data.participants))) {
      const ts = latest(participant && participant.lastSeen, participant && participant.joinedAt);
      if (!ts || NOW - ts >= LIMITS.rtc) {
        updates[`rtc/${gid}/participants/${uid}`] = null;
        counts.rtcParticipants += 1;
      }
    }
    for (const [toUid, fromMap] of Object.entries(object(data && data.signals))) {
      for (const [fromUid, signals] of Object.entries(object(fromMap))) {
        for (const [sigId, signal] of Object.entries(object(signals))) {
          const ts = num(signal && signal.ts);
          if (!ts || NOW - ts >= LIMITS.rtc) {
            updates[`rtc/${gid}/signals/${toUid}/${fromUid}/${sigId}`] = null;
            counts.rtcSignals += 1;
          }
        }
      }
    }
  }
}

function cleanupSpectators(spectators, games, roomList, purgedGameIds, updates, counts) {
  for (const [gid, items] of Object.entries(object(spectators))) {
    if (purgedGameIds.has(gid)) continue;
    if (!games[gid]) {
      updates[`spectators/${gid}`] = null;
      counts.orphans += 1;
      continue;
    }
    let remaining = 0;
    let changed = false;
    for (const [uid, spec] of Object.entries(object(items))) {
      const ts = latest(spec && spec.updatedAt, spec && spec.joinedAt);
      if (!ts || NOW - ts >= LIMITS.spectator) {
        updates[`spectators/${gid}/${uid}`] = null;
        counts.spectators += 1;
        changed = true;
      } else {
        remaining += 1;
      }
    }
    if (changed) {
      const count = Math.max(0, Math.min(3, remaining));
      updates[`games/${gid}/spectatorCount`] = count;
      updates[`games/${gid}/spectatorCountUpdatedAt`] = NOW;
      if (roomList[gid]) {
        updates[`roomList/${gid}/spectatorCount`] = count;
        updates[`roomList/${gid}/spectatorCountUpdatedAt`] = NOW;
      }
    }
  }
}

async function main() {
  const cred = await credentials();
  const [players, invites, gamesRaw, roomListRaw, spectators, chats, rtc, userEvents] = await Promise.all([
    read('players', cred), read('invites', cred), read('games', cred), read('roomList', cred),
    read('spectators', cred), read('chats', cred), read('rtc', cred), read('userEvents', cred),
  ]);
  const games = object(gamesRaw);
  const roomList = object(roomListRaw);
  const updates = {};
  const purgedGameIds = new Set();
  const counts = {
    players: 0, invites: 0, games: 0, roomList: 0, undo: 0, recovery: 0,
    spectators: 0, rtcParticipants: 0, rtcSignals: 0, chatMessages: 0,
    chatReads: 0, userEvents: 0, orphans: 0,
  };

  for (const [uid, player] of Object.entries(object(players))) {
    const ts = num(player && player.updatedAt);
    if (!ts || NOW - ts >= LIMITS.secondaryPresencePurge) {
      updates[`players/${uid}`] = null;
      counts.players += 1;
    }
  }

  cleanupNestedInvites(invites, updates, counts);
  cleanupUserEvents(userEvents, updates, counts);

  for (const [gid, game] of Object.entries(games)) {
    const status = String(game && game.status || '').toLowerCase();
    const room = roomList[gid] || null;
    const activity = gameActivity(game, room);
    const freshPresence = hasFreshGamePresence(game);
    let purge = false;

    if (status === 'ended') purge = !!(num(game.endedAt) && NOW - num(game.endedAt) >= LIMITS.ended);
    else if (status === 'rejected') {
      const base = latest(game.endedAt, game.createdAt);
      purge = !!(base && NOW - base >= LIMITS.rejected);
    } else if (status === 'pending') {
      const base = num(game.createdAt);
      purge = !!(base && NOW - base >= LIMITS.pending);
    } else if (status === 'active') {
      purge = !freshPresence && !!(activity && NOW - activity >= LIMITS.activeAbandoned);
      if (!purge && !freshPresence && room) {
        const roomTs = latest(room.updatedAt, room.acceptedAt, room.createdAt);
        if (roomTs && NOW - roomTs >= LIMITS.roomListStale) {
          updates[`roomList/${gid}`] = null;
          counts.roomList += 1;
        }
      }
    } else {
      // Unknown/future states are not equivalent to rejection. Keep them for the
      // conservative pending-game window before secondary cleanup removes them.
      const base = latest(game.endedAt, game.createdAt, activity);
      purge = !!(base && NOW - base >= LIMITS.pending);
    }

    if (purge) {
      purgeRoom(updates, gid);
      purgedGameIds.add(gid);
      counts.games += 1;
      continue;
    }

    const undo = game && game.undoRequest;
    const undoState = String(undo && undo.status || '').toLowerCase();
    const requestedAt = num(undo && undo.requestedAt);
    if ((undoState === 'pending' || undoState === 'active') && requestedAt && NOW - requestedAt >= LIMITS.undo) {
      updates[`games/${gid}/undoRequest`] = null;
      counts.undo += 1;
    }
    const recoveryTs = num(game && game.recoverySignal && game.recoverySignal.ts);
    if (recoveryTs && NOW - recoveryTs >= LIMITS.rtc) {
      updates[`games/${gid}/recoverySignal`] = null;
      counts.recovery += 1;
    }
  }

  for (const gid of Object.keys(roomList)) {
    if (!games[gid]) {
      updates[`roomList/${gid}`] = null;
      counts.orphans += 1;
    }
  }

  cleanupSpectators(spectators, games, roomList, purgedGameIds, updates, counts);
  cleanupChats(chats, games, purgedGameIds, updates, counts);
  cleanupRtc(rtc, games, purgedGameIds, updates, counts);

  const updatePaths = Object.keys(updates).sort();
  for (let i = 0; i < updatePaths.length; i += 1) {
    for (let j = i + 1; j < updatePaths.length; j += 1) {
      if (updatePaths[j].startsWith(`${updatePaths[i]}/`)) {
        throw new Error(`Overlapping Firebase cleanup paths: ${updatePaths[i]} and ${updatePaths[j]}`);
      }
    }
  }
  await patchRoot(updates, cred);
  console.log(JSON.stringify({ ok: true, dryRun: DRY_RUN, now: NOW, updateCount: updatePaths.length, counts }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
