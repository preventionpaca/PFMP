'use strict';
/* DEV671 — Courriel de l'équipe en arrière-plan : l'élève a sa confirmation tout de suite, l'équipe reçoit le tableau ensuite. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

function monde(opts) {
  opts = opts || {};
  const props = {}, triggers = [], envoyes = [], journal = { tableaux: 0, verrous: 0 };
  let horloge = 1000000, uuid = 0;
  const s = {
    console: { log() {} }, JSON, Object, String, Number, Array, Math, Error, RegExp,
    Date: { now: () => horloge },
    Utilities: { getUuid: () => 'abcdef12-' + (uuid++) },
    LockService: { getScriptLock: () => ({ tryLock: () => { journal.verrous++; return opts.verrou !== false; }, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; },
      getProperties: () => Object.assign({}, props) }) },
    ScriptApp: {
      newTrigger: h => ({ timeBased: () => ({ after: ms => ({ create: () => { if (opts.quota) throw new Error('Trop de déclencheurs'); triggers.push({ h, ms }); } }) }) }),
      getProjectTriggers: () => triggers.map(t => ({ getHandlerFunction: () => t.h, t })),
      deleteTrigger: x => { triggers.splice(triggers.indexOf(x.t), 1); } },
    MailApp: { sendEmail: m => { if (opts.panne && opts.panne-- > 0) throw new Error('Service courriel indisponible'); envoyes.push(m); } },
    EUC_DEV663_recapEquipe_: (info, c, p, e, num) => { journal.tableaux++; return { texte: 'EQ ' + num, html: '<p>EQ</p>', pj: [{ pdf: [c, p, e, num].join('|') }] }; }
  };
  vm.createContext(s); vm.runInContext(read('apps-script/EUC_DEV671_EquipeDifferee.js'), s);
  return { s, props, triggers, envoyes, journal, avancer: ms => { horloge += ms; } };
}
const charge = num => ({ to: 'pp@ex.test,bfe@ex.test', subject: '[Dépôt] ' + num, name: 'Lycée', info: { numero: num }, classeId: 7, periodeId: 40, eleveId: 3, numero: num });
const file = props => Object.keys(props).filter(k => k.startsWith('EUC_DEV671_Q_'));

test('dépôt : rien n’est construit ni envoyé à l’équipe pendant le dépôt ; un seul déclencheur à une minute', () => {
  const w = monde();
  assert.equal(w.s.EUC_DEV671_expedier_({ to: 'x', subject: 'S', differe: charge('N1') }), 'DIFFERE');
  w.avancer(5000); assert.equal(w.s.EUC_DEV671_expedier_({ to: 'x', subject: 'S', differe: charge('N2') }), 'DIFFERE');
  assert.equal(w.journal.tableaux, 0, 'tableau non construit pendant le dépôt'); assert.equal(w.envoyes.length, 0);
  assert.equal(file(w.props).length, 2); assert.equal(w.triggers.length, 1, 'pas un déclencheur par dépôt');
  assert.deepEqual([w.triggers[0].h, w.triggers[0].ms], ['EUC_DEV671_traiterFile', 60000]);
  const famille = { to: 'eleve@ex.test', subject: 'Ta convention', body: 'B' };
  assert.equal(w.s.EUC_DEV671_expedier_(famille), 'IMMEDIAT'); assert.equal(w.envoyes[0], famille, 'élève et famille : envoi immédiat, sans tableau');
});

test('traitement : courriels de l’équipe envoyés dans l’ordre, tableau joint, file vidée, déclencheur supprimé, jamais deux fois', () => {
  const w = monde();
  w.s.EUC_DEV671_differer_(charge('N1')); w.avancer(10); w.s.EUC_DEV671_differer_(charge('N2'));
  const r = w.s.EUC_DEV671_traiterFile();
  assert.deepEqual([r.envoyes, r.abandons, r.restants], [2, 0, 0]);
  assert.deepEqual(w.envoyes.map(m => m.subject), ['[Dépôt] N1', '[Dépôt] N2']);
  assert.deepEqual(w.envoyes[0].attachments, [{ pdf: '7|40|3|N1' }]); assert.equal(w.envoyes[0].to, 'pp@ex.test,bfe@ex.test'); assert.equal(w.envoyes[0].body, 'EQ N1');
  assert.equal(file(w.props).length, 0); assert.equal(w.triggers.length, 0); assert.equal(w.props.EUC_DEV671_PLANIFIE, undefined);
  w.s.EUC_DEV671_traiterFile(); assert.equal(w.envoyes.length, 2, 'un second passage n’envoie rien de plus');
  w.s.EUC_DEV671_differer_(charge('N3')); assert.equal(w.triggers.length, 1, 'dépôt suivant : nouveau déclencheur');
});

test('secours : déclencheur impossible, verrou indisponible ou données trop longues → l’équipe reçoit tout de suite, tableau joint', () => {
  for (const o of [{ quota: true }, { verrou: false }]) {
    const w = monde(o);
    assert.equal(w.s.EUC_DEV671_expedier_({ to: 'x', subject: 'S', differe: charge('N9') }), 'IMMEDIAT');
    assert.equal(w.envoyes.length, 1); assert.deepEqual(w.envoyes[0].attachments, [{ pdf: '7|40|3|N9' }]); assert.equal(file(w.props).length, 0, 'rien de laissé en file');
  }
  const w = monde(), gros = charge('N8'); gros.info.texte = 'x'.repeat(9000);
  assert.equal(w.s.EUC_DEV671_differer_(gros), false); assert.equal(w.s.EUC_DEV671_expedier_({ differe: gros }), 'IMMEDIAT'); assert.equal(w.envoyes.length, 1);
});

test('panne du courriel : nouvel essai planifié, abandon après trois échecs ; déclencheur perdu replanifié au dépôt suivant', () => {
  const w = monde({ panne: 1 });
  w.s.EUC_DEV671_differer_(charge('N1'));
  let r = w.s.EUC_DEV671_traiterFile(); assert.deepEqual([r.envoyes, r.restants], [0, 1]); assert.equal(w.triggers.length, 1, 'nouvel essai planifié');
  r = w.s.EUC_DEV671_traiterFile(); assert.equal(r.envoyes, 1); assert.equal(w.envoyes[0].subject, '[Dépôt] N1');
  const p = monde({ panne: 99 }); p.s.EUC_DEV671_differer_(charge('N2'));
  for (let i = 0; i < 3; i++) p.s.EUC_DEV671_traiterFile();
  assert.equal(file(p.props).length, 0, 'abandon après trois essais'); assert.equal(p.triggers.length, 0);
  const q = monde(); q.s.EUC_DEV671_differer_(charge('N3')); q.triggers.length = 0; /* déclencheur perdu */
  q.avancer(16 * 60 * 1000); q.s.EUC_DEV671_differer_(charge('N4')); assert.equal(q.triggers.length, 1, 'replanifié après 15 minutes');
});

test('le module est livré et ne touche ni Grist ni l’élève', () => {
  const src = read('apps-script/EUC_DEV671_EquipeDifferee.js');
  assert.doesNotMatch(src, /EUC_ENT_grist|famille|eleve@/);
  assert.match(src, /var EUC_DEV671_HANDLER_ = 'EUC_DEV671_traiterFile';/); assert.match(src, /^function EUC_DEV671_traiterFile\(\)/m);
});
console.log(n + ' tests DEV671 réussis.');
