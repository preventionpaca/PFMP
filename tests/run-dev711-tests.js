'use strict';
/* DEV711 — Soumissions à traiter : « Garder ce SIRET (vérifié par le bureau) » pour un établissement fermé selon l'INSEE. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

function ctx(fields) {
  const ecrits = [], ligne = { id: 79, fields };
  const s = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, encodeURIComponent,
    EUC_IMPORT_exigerAdminTexte_() {}, EUC_V160_TABLE_: 'T', Utilities: { formatDate: () => '23/11/2026 10:00' },
    EUC_ENT_grist(m, u, body) {
      if (m === 'get' && /columns$/.test(u)) return { columns: Object.keys(fields).concat(['Niveau_controle', 'Decision', 'Alertes']).map(id => ({ id })) };
      if (m === 'get') return { records: [ligne] };
      ecrits.push([m, u, body]); return {};
    } };
  vm.createContext(s); vm.runInContext(read('apps-script/EUC_DEV665_DemandesAide.js'), s);
  s.ecrits = ecrits; return s;
}
const ferme = () => ({ Submission_ID: 'SECOURS-PFMP-2026-S0079', Decision: 'A_CONTROLER', Niveau_controle: 'ORANGE', SIRET_statut: 'VERIFIE', SIRET_normalise: '88514123400033', Alertes: 'Établissement fermé selon l’INSEE' });

test('avant : dépôt dans le suivi mais « à traiter » à cause de l’établissement fermé', () => {
  const s = ctx(ferme());
  const x = s.EUC_DEV665_enAttente_([{ id: 79, fields: ferme() }])[0];
  assert.equal(x.dansSuivi, true); assert.equal(x.ferme, true); assert.equal(x.aTraiter, true);
});

test('garder le SIRET : une seule ligne de la table d’attente, contrôle vert, motif tracé, plus rien à traiter ; ni convention ni courriel', () => {
  const s = ctx(ferme());
  const r = JSON.parse(JSON.stringify(s.EUC_DEV711_accepterFerme({ id: 79, motif: 'entreprise contactée : en activité' })));
  assert.equal(s.ecrits.length, 1);
  const [m, u, body] = s.ecrits[0];
  assert.equal(m, 'patch'); assert.equal(u, '/tables/T/records');
  assert.equal(body.records.length, 1); assert.equal(body.records[0].id, 79);
  assert.deepEqual(Object.keys(body.records[0].fields).sort(), ['Alertes', 'Decision', 'Niveau_controle']);
  assert.equal(body.records[0].fields.Niveau_controle, 'VERT'); assert.equal(body.records[0].fields.Decision, 'A_VALIDER');
  assert.match(body.records[0].fields.Alertes, /SIRET 88514123400033 gardé par le bureau — entreprise contactée : en activité \(23\/11\/2026 10:00\)$/);
  assert.equal(r.soumission.aTraiter, false); assert.equal(r.soumission.dansSuivi, true);
  const code = read('apps-script/EUC_DEV665_DemandesAide.js'), f = code.slice(code.indexOf('function EUC_DEV711_accepterFerme'), code.indexOf('/* Sans suite'));
  assert.doesNotMatch(f, /MailApp|importSelection|ACCES_TABLE/);
});

test('refus : sans motif, sans alerte « fermé », ou SIRET pas encore vérifié', () => {
  assert.throws(() => ctx(ferme()).EUC_DEV711_accepterFerme({ id: 79, motif: ' ' }), /motif/);
  assert.throws(() => ctx(Object.assign(ferme(), { Niveau_controle: 'VERT' })).EUC_DEV711_accepterFerme({ id: 79, motif: 'x' }), /pas d’alerte/);
  assert.throws(() => ctx(Object.assign(ferme(), { SIRET_statut: 'A_CONTROLER', Decision: 'A_CONTROLER' })).EUC_DEV711_accepterFerme({ id: 79, motif: 'x' }), /Vérifiez d’abord/);
  assert.equal(ctx(ferme()).ecrits.length, 0);
});

test('page : bouton seulement pour un établissement fermé déjà dans le suivi ; confirmation, spinner, délai, erreur', () => {
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  assert.match(h, /\(x\.ferme&&x\.dansSuivi&&!x\.doublonDe\?bouton\('garderSiret',x\.id,'Garder ce SIRET \(vérifié par le bureau\)','leger'\):''\)/);
  const b = h.slice(h.indexOf("if(a==='garderSiret')"), h.indexOf("if(a==='sansSuite')"));
  assert.match(b, /prompt\(/); assert.match(b, /Aucune convention n’est créée et aucun courriel n’est envoyé/);
  assert.match(b, /occupe\(b,true,'Enregistrement…'\)/);
  assert.match(b, /appel\('EUC_DEV711_accepterFerme',\{id:id,motif:vu\},60000,function\(r\)\{occupe\(b,false\);remplacer\(r\.soumission\)/);
  assert.match(b, /function\(e\)\{occupe\(b,false\);msg\(id,\(e&&e\.message\)\|\|'Enregistrement impossible\.','erreur'\)/);
});

console.log(n + ' tests DEV711 réussis.');
