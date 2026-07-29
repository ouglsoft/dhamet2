import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const parity = read('js/rules-parity-runtime.js');
const game = read('js/game.js');
const online = read('js/online.js');
const ui = read('js/ui.js');
const souflaView = read('js/ui/soufla-view.js');
const dashboardKnownBad = [
  '__AI_SEARCH_LIMITS',
  '__aiCrownPriority',
  '__skipFx',
  'applyMoveSim',
  'isSquareCapturableBy',
];

for (const name of dashboardKnownBad) {
  assert.ok(!game.includes(name) && !online.includes(name), `undefined or removed-only symbol remains: ${name}`);
}

for (const name of ['expireUnclaimedSouflaOnMoveStart', 'serializeSouflaPending', 'restoreSouflaPending', 'resetTransientGameState']) {
  assert.match(parity, new RegExp(`function ${name}\\(`), `${name} must be a local strict-mode declaration`);
  assert.doesNotMatch(parity, new RegExp(`^\\s*${name}\\s*=`, 'm'), `${name} must not be assigned as an undeclared global`);
}

assert.match(online, /_applyRemoteState:\s*function \(data, applyOptions\)/);
assert.match(online, /const skipFx = !!\(applyOptions && applyOptions\.skipFx\)/);
assert.doesNotMatch(online, /__skipFx/);
assert.doesNotMatch(online, /_maybeRecordOpponentMoveForTraining/);
const onlineOnlyCorpus = [game, online, ui, souflaView, read('js/message-parity-runtime.js')].join('\n');
for (const forbidden of [
  /\bTrainRecorder\b/i,
  /\bDhametAI\b|\bAI_LEVEL\w*\b|\baiLevel\w*\b/i,
  /showSouflaAgainstHuman|soufla\.cpu|players\.computer/i,
  /vsComputer|normalizeAdvancedSettings|thinkTime|evalNoise|moveMistake/i,
  /controls-pvc|mode-pvc|btnEndLocalMatch|btnNew|btnSave|btnResume/i,
  /\bSessionGame\b/i,
  /availableSouflaForHuman|isHumanTurn|btnExportHuman|btnHint/i,
]) assert.doesNotMatch(onlineOnlyCorpus, forbidden);

const prefillCalls = ui.match(/UI\.showSettingsModal\(prefill\)/g) || [];
assert.equal(prefillCalls.length, 0, 'the online-only settings modal must not retain advanced-settings prefill paths');
assert.doesNotMatch(ui, /modals\.forcedOpening[\s\S]{0,500}showSettingsModal\(prefill\)/);
assert.doesNotMatch(ui, /!Game\.history\.length[\s\S]{0,350}showSettingsModal\(prefill\)/);

assert.match(souflaView, /Rules:\s*deps\.Rules\s*\|\|\s*root\.DhametRules/);
assert.match(souflaView, /const Rules = d\.Rules/);

// Execute the parity runtime in strict mode with the bindings genuinely supplied
// by game.js. A missing override target must throw here instead of being hidden by
// source-pattern tests.
const declaredFunctions = [...game.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]);
const context = {
  console,
  setTimeout: () => 0,
  clearTimeout() {},
  setInterval: () => 0,
  clearInterval() {},
  Map,
  Set,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date,
};
context.globalThis = context;
context.window = context;
for (const name of declaredFunctions) context[name] = function () {};
context.Game = {
  board: [],
  player: 1,
  forcedEnabled: true,
  forcedPly: 0,
  forcedSeq: [],
  deferredPromotion: null,
  deferredPromotions: [],
  history: [],
  availableSouflaForHuman: null,
  souflaPending: null,
  awaitingPenalty: false,
  _souflaApplying: false,
};
context.Turn = { ctx: null, start() {} };
context.Visual = new Proxy({}, { get: () => () => {} });
context.UI = new Proxy({}, { get: () => () => {} });
context.Input = { selected: null };
context.DhametRules = {
  TOP: 1,
  BOT: -1,
  MAN: 1,
  MOVE_CAPTURE: 'capture',
  kind: () => 1,
  owner: () => 1,
  isBackRank: () => false,
  forcedOpeningExpectedOptions: () => [],
  openingStarterSide: () => 1,
};
context.DhametState = {
  normalizeDeferredPromotions: () => [],
  sanitizeDeferredPromotions: () => [],
  capture: () => ({}),
  restore: () => ({}),
};
context.DhametTurnResolution = {};
context.DhametSoufla = {};
vm.createContext(context);
assert.doesNotThrow(() => vm.runInContext(parity, context, { filename: 'rules-parity-runtime.js' }));
assert.equal(context.DhametRulesParity?.source, 'primary-shared-rules');

console.log('hidden runtime audit passed');
