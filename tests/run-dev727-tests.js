'use strict';
/* DEV727 — affectation des professeurs instantanée : tableau mis à jour au clic, envois regroupés en arrière-plan,
 * retour à l'état précédent des seules opérations en échec. Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

/* ---------- serveur ---------- */
function serveur(o) {
  o = o || {}; const appels = [];
  const k = { JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __appels: appels,
    EUC_DEV448_t_: v => String(v == null ? '' : v).trim(), EUC_DEV448_n_: v => Number(v) || 0, EUC_DEV448_family_: v => String(v || '').toUpperCase(),
    EUC_V156_contexteAdmin_: () => o.refus ? null : { email: 'admin@ex.test' },
    EUC_DEV448_lookupPp_: (c) => { appels.push(['lookup', c]); if (c !== 'BON-CODE') throw new Error('Code inconnu ou révoqué.'); return { id: 7, Annee_scolaire: '2026-2027', Famille: 'BACPRO', Classe_id: 11, Periode_id: 22, Professeur_id: 3 }; },
    EUC_DEV448_assertPpScope_: () => true, EUC_DEV448_cachedAllowed_: () => [101, 102, 103], EUC_DEV448_cacheAllowed_: () => [], EUC_DEV448_detailRecord_: () => ({}),
    EUC_DEV448_core_: (q, actor) => { appels.push(['core', q.type, q.profId, q.eleveIds.slice(), actor, q._allowedIds]); if (q.profId === 99) throw new Error('Professeur introuvable ou inactif.'); return { type: q.type, professeur: { id: q.profId, nom: 'M. Test ' + q.profId }, eleveIds: q.eleveIds }; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV727_AffectationInstantanee.js'), k); return k;
}

test('serveur : plusieurs affectations en un appel, un seul contrôle d’accès, une erreur n’arrête pas les suivantes', () => {
  const k = serveur(), r = k.EUC_DEV727_affecterLot({ annee: '2026-2027', famille: 'BACPRO', classeId: 11, periodeId: 22, scopeIds: [101, 102, 103],
    operations: [{ id: 'a1', type: 'visite', profId: 5, eleveIds: [101, 102] }, { id: 'a2', type: 'VISITE', profId: 99, eleveIds: [103] }, { id: 'a3', type: 'TELEPHONE', profId: 6, eleveIds: ['103'] }] });
  assert.deepStrictEqual(r.resultats.map(x => [x.id, x.ok]), [['a1', true], ['a2', false], ['a3', true]]);
  assert.strictEqual(r.resultats[1].message, 'Professeur introuvable ou inactif.');
  const cores = k.__appels.filter(a => a[0] === 'core');
  assert.deepStrictEqual(cores.map(a => [a[1], a[2], a[3]]), [['VISITE', 5, [101, 102]], ['VISITE', 99, [103]], ['TELEPHONE', 6, [103]]]);
  assert.ok(cores.every(a => a[4] === 'admin@ex.test' && a[5].length === 3), 'périmètre de la classe transmis à chaque écriture');
});

test('serveur : code du professeur principal vérifié une seule fois ; refus sans code ni administration', () => {
  const k = serveur(), r = k.EUC_DEV727_affecterLot({ code: 'BON-CODE', annee: '2026-2027', classeId: 11, periodeId: 22, operations: [{ id: 'x', type: 'VISITE', profId: 5, eleveIds: [101] }, { id: 'y', type: 'VISITE', profId: 6, eleveIds: [102] }] });
  assert.ok(r.resultats.every(x => x.ok));
  assert.strictEqual(k.__appels.filter(a => a[0] === 'lookup').length, 1);
  assert.ok(k.__appels.filter(a => a[0] === 'core').every(a => a[4] === 'PP_TEMP:3' && a[5].join() === '101,102,103'));
  assert.throws(() => serveur({ refus: true }).EUC_DEV727_affecterLot({ operations: [{ id: 'z', type: 'VISITE', profId: 5, eleveIds: [1] }] }), /administrateur/);
  assert.throws(() => k.EUC_DEV727_affecterLot({ operations: [] }), /Aucune affectation/);
  assert.strictEqual(k.EUC_DEV727_operations_(new Array(60).fill({ type: 'VISITE', profId: 1, eleveIds: [1] })).length, 40);
});

/* ---------- page : bloc DEV727 exécuté avec un faux environnement ---------- */
const html = read('apps-script/Suivi_Enseignants_DEV576.html');
const bloc = html.slice(html.indexOf('    /* DEV727'), html.indexOf("etat727();pompe727();};") + "etat727();pompe727();};".length);
function page() {
  const el = {}, envois = [], timers = [];
  const mk = (id, extra) => (el[id] = Object.assign({ id, value: '', disabled: false, textContent: '', innerHTML: '' }, extra || {}));
  mk('ppAffecter'); mk('ppProf', { value: '5' }); mk('ppType', { value: 'VISITE' });
  const etatPP = mk('ppEtat'); let coches = [];
  const k = { Object, String, Number, Array, JSON, Math, console, etatPP, modifie: false, code: { value: '' }, CFG: { admin: true },
    c: { famille: 'BACPRO', eleves: [[101, 'A'], [102, 'B'], [103, 'C']] }, portee: { annee: '2026-2027', classeId: 11, periodeId: 22 },
    p: { lignes: {} }, profsPP: [{ id: 5, nom: 'M. Paul DURAND' }, { id: 6, nom: 'Mme Léa MARTIN' }],
    donnees: { lignes: [{ eleveId: 101, telephone: '', visite: '' }, { eleveId: 102, telephone: '', visite: 'Mme Ancienne PROF' }, { eleveId: 103, telephone: '', visite: '' }] },
    rendus: 0, afficher() { k.rendus++; coches = []; },
    esc: v => String(v), setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: () => {},
    window: { addEventListener() {} },
    document: { getElementById: id => el[id], querySelectorAll: sel => sel === '.ppEleve:checked' ? coches.map(v => ({ value: String(v) })) : coches.map(v => ({ value: String(v), checked: true })) },
    google: { script: { get run() { const h = {}; const r = { withSuccessHandler(f) { h.ok = f; return r; }, withFailureHandler(f) { h.ko = f; return r; }, EUC_DEV727_affecterLot(q) { envois.push({ q, h }); } }; return r; } } } };
  vm.createContext(k); vm.runInContext(bloc, k);
  return { k, el, envois, timers, cocher: ids => { coches = ids; }, clic: () => { el.ppAffecter.disabled = false; el.ppAffecter.onclick.call(el.ppAffecter); } };
}
const visite = (k, id) => k.donnees.lignes.find(x => x.eleveId === id).visite;

test('page : le tableau change dès le clic, avant toute réponse du serveur ; indicateur d’enregistrement en arrière-plan', () => {
  const t = page(); t.cocher([101, 102]); t.clic();
  assert.strictEqual(visite(t.k, 101), 'M. Paul DURAND'); assert.strictEqual(visite(t.k, 102), 'M. Paul DURAND');
  assert.strictEqual(t.k.p.lignes[101][3], 'M. Paul DURAND');
  assert.strictEqual(t.envois.length, 1); assert.ok(/class="spin"/.test(t.el.ppEtat.innerHTML) && /arrière-plan/.test(t.el.ppEtat.innerHTML));
  assert.strictEqual(t.el.ppAffecter.disabled, true, 'protégé contre le double clic');
  assert.strictEqual(t.envois[0].q.operations[0].type, 'VISITE'); assert.deepStrictEqual(t.envois[0].q.scopeIds, [101, 102, 103]);
});

test('page : clics pendant un envoi regroupés dans un seul envoi suivant ; succès → message enregistré', () => {
  const t = page(); t.cocher([101]); t.clic();
  t.el.ppProf.value = '6'; t.cocher([102]); t.clic(); t.cocher([103]); t.clic();
  assert.strictEqual(t.envois.length, 1, 'un seul appel en cours');
  assert.strictEqual(visite(t.k, 103), 'Mme Léa MARTIN');
  t.envois[0].h.ok({ resultats: [{ id: t.envois[0].q.operations[0].id, ok: true }] });
  assert.strictEqual(t.envois.length, 2); assert.strictEqual(t.envois[1].q.operations.length, 2, 'deux clics, un appel');
  t.envois[1].h.ok({ resultats: t.envois[1].q.operations.map(o => ({ id: o.id, ok: true })) });
  assert.ok(/Affectations enregistrées/.test(t.el.ppEtat.innerHTML)); assert.strictEqual(t.k.window.__eucPp727, 0);
});

test('page : échec partiel → seules les affectations refusées reviennent à leur état précédent ; erreur réseau → tout le lot', () => {
  const t = page(); t.cocher([101, 102]); t.clic();
  const ops = t.envois[0].q.operations;
  t.envois[0].h.ok({ resultats: [{ id: ops[0].id, ok: false, message: 'Professeur introuvable ou inactif.' }] });
  assert.strictEqual(visite(t.k, 101), ''); assert.strictEqual(visite(t.k, 102), 'Mme Ancienne PROF');
  assert.ok(/Erreur : Professeur introuvable/.test(t.el.ppEtat.innerHTML) && /état précédent/.test(t.el.ppEtat.innerHTML));
  const u = page(); u.cocher([103]); u.clic(); u.envois[0].h.ko(new Error('réseau'));
  assert.strictEqual(visite(u.k, 103), ''); assert.ok(/Erreur : réseau/.test(u.el.ppEtat.innerHTML));
});

test('page : une affectation plus récente sur le même élève n’est pas effacée par l’échec d’une précédente ; délai dépassé géré', () => {
  const t = page(); t.cocher([101]); t.clic(); t.el.ppProf.value = '6'; t.cocher([101]); t.clic();
  t.envois[0].h.ko(new Error('réseau'));
  assert.strictEqual(visite(t.k, 101), 'Mme Léa MARTIN', 'la seconde, en attente, reste affichée');
  const u = page(); u.cocher([101]); u.clic();
  u.timers.find(x => x.ms === 120000).f();
  assert.strictEqual(visite(u.k, 101), ''); assert.ok(/délai dépassé/.test(u.el.ppEtat.innerHTML));
  u.envois[0].h.ok({ resultats: [{ id: u.envois[0].q.operations[0].id, ok: true }] });
  assert.strictEqual(visite(u.k, 101), '', 'une réponse tardive après le délai est ignorée');
});

test('page : professeur et élèves obligatoires ; appel unique à EUC_DEV727_affecterLot, plus d’appel par clic à l’ancienne fonction', () => {
  const t = page(); t.cocher([]); t.clic(); assert.strictEqual(t.envois.length, 0); assert.ok(/Cochez au moins un élève/.test(t.el.ppEtat.textContent));
  t.el.ppProf.value = ''; t.cocher([101]); t.clic(); assert.strictEqual(t.envois.length, 0); assert.ok(/Choisissez un professeur/.test(t.el.ppEtat.textContent));
  assert.ok(!/EUC_DEV448_affecterAdmin'|EUC_DEV448_affecterPp'/.test(html));
  assert.ok(/beforeunload/.test(bloc), 'avertit si l’on quitte avec des enregistrements en attente');
});

console.log(n + ' tests DEV727 réussis');
