/* DEV653 — « Mes visites », lot 2 : visites effectuées, tournée, kilomètres, page 2 pré-remplie. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function contexte(opts) {
  opts = opts || {};
  const ecrits = [], appelsMaps = [];
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp,
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha' }, computeDigest: (a, s) => Array.from(Buffer.from(String(s))), base64EncodeWebSafe: b => Buffer.from(b).toString('base64'), formatDate: () => '2026-11-26 17:00' },
    Session: { getScriptTimeZone: () => 'Europe/Paris' },
    CacheService: { getScriptCache: () => ({ get: c => c === 'EUC_DEV653_TABLE_OK' ? 'OK' : null, put() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Maps: { DirectionFinder: { Mode: { DRIVING: 'driving' } }, newDirectionFinder: () => { const d = {}; const f = { setOrigin: o => (d.o = o, f), setDestination: x => (d.x = x, f), setMode: () => f, setLanguage: () => f,
      getDirections: () => { appelsMaps.push(J(d)); if (opts.mapsVide) return { routes: [] }; return { routes: [{ legs: [{ distance: { value: 12400 } }] }] }; } }; return f; } },
    EUC_ENT_grist: (m, url, body) => { if (m === 'get') return { records: opts.existants || [] }; ecrits.push({ m, url, body }); return {}; },
    EUC_PARAM_CONV_lire_: () => ({ ADRESSE: '7 avenue des Eucalyptus, 06200 NICE' }),
    EUC_DEV652_lireJeton_: () => ({ annee: '2026-2027', famille: 'BACPRO', classeId: 31, periodeId: 7, prof: 'M. PROF' }),
    EUC_DEV652_ouvrir: () => ({ ok: true })
  };
  k.EUC_DEV652_groupe_ = () => GROUPE;
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV653_Tournee.js'), k);
  return { k, ecrits, appelsMaps };
}
const GROUPE = { lignes: [
  { eleveId: 11, eleve: 'ELEVE Un', siege: '1 rue du Siège, 06000 Nice', lieuStage: '' },
  { eleveId: 12, eleve: 'ELEVE Deux', siege: '2 rue Y, 06000 Nice', lieuStage: 'Chantier Les Pins, 06200 Nice' },
  { eleveId: 13, eleve: 'ELEVE Trois', siege: '3 rue Z, 06700 Saint-Laurent-du-Var', lieuStage: '' }] };
const BASE = { t: 'x', date: '2026-11-26', heureArrivee: '09:00', heureDepart: '10:00', transport: 'Véhicule personnel' };

test('tournée : départ lycée, visite précédente (lieu de stage si différent du siège), domicile', () => {
  const { k } = contexte();
  const ek = J(k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'EK' }), GROUPE, 11, '7 avenue des Eucalyptus'));
  assert.equal(ek.origine, '7 avenue des Eucalyptus'); assert.equal(ek.destination, '1 rue du Siège, 06000 Nice'); assert.equal(ek.champs.Depart, 'EK');
  const tour = J(k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: '2' }), GROUPE, 13, 'L'));
  assert.equal(tour.origine, 'Chantier Les Pins, 06200 Nice', 'départ = lieu de visite du n°2'); assert.equal(tour.destination, '3 rue Z, 06700 Saint-Laurent-du-Var');
  assert.equal(J(k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'd', domicile: '5 rue Maison, Cagnes' }), GROUPE, 11, 'L')).origine, '5 rue Maison, Cagnes');
  const visio = J(k.EUC_DEV653_preparer_(Object.assign({}, BASE, { transport: 'Visioconférence' }), GROUPE, 11, 'L'));
  assert.equal(visio.sansKm, true); assert.equal(visio.champs.Depart, '');
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: '1' }), GROUPE, 11, 'L'), /autre visite que celle-ci/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: '9' }), GROUPE, 11, 'L'), /numéro de visite inconnu/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: '' }), GROUPE, 11, 'L'), /lieu de départ/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'EK', date: '' }), GROUPE, 11, 'L'), /date/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'EK', heureArrivee: '25:00' }), GROUPE, 11, 'L'), /Heure d’arrivée invalide/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'EK', km: 'beaucoup' }), GROUPE, 11, 'L'), /kilomètres invalide/);
  assert.throws(() => k.EUC_DEV653_preparer_(Object.assign({}, BASE, { depart: 'EK' }), GROUPE, 99, 'L'), /ne fait pas partie/);
});

test('kilomètres : calculés par l’itinéraire, modifiables, domicile jamais enregistré', () => {
  let c = contexte();
  c.k.EUC_DEV653_enregistrerVisite(Object.assign({}, BASE, { eleveId: 13, depart: '2' }));
  assert.equal(c.appelsMaps[0].o, 'Chantier Les Pins, 06200 Nice, France');
  let f = c.ecrits[0].body.records[0].fields;
  assert.equal(c.ecrits[0].m, 'post'); assert.equal(f.Km_calcules, 12); assert.equal(f.Km_retenus, 12); assert.equal(f.Eleve_id, 13); assert.equal(f.Professeur, 'M. PROF'); assert.equal(f.Depart, '2');
  c = contexte({ existants: [{ id: 77, fields: { Eleve_id: 11, Professeur: 'M. PROF', Date_visite: '2026-11-25' } }] });
  c.k.EUC_DEV653_enregistrerVisite(Object.assign({}, BASE, { eleveId: 11, depart: 'D', domicile: '5 rue Maison, Cagnes', km: '15', motif: 'travaux' }));
  f = c.ecrits[0].body.records[0];
  assert.equal(c.ecrits[0].m, 'patch'); assert.equal(f.id, 77); assert.equal(f.fields.Km_calcules, 12); assert.equal(f.fields.Km_retenus, 15); assert.equal(f.fields.Km_motif, 'travaux');
  assert.ok(!JSON.stringify(c.ecrits).includes('Maison'), 'adresse du domicile jamais écrite');
  c = contexte({ mapsVide: true });
  assert.throws(() => c.k.EUC_DEV653_enregistrerVisite(Object.assign({}, BASE, { eleveId: 11, depart: 'EK' })), /saisissez les kilomètres vous-même/);
  assert.throws(() => c.k.EUC_DEV653_enregistrerVisite(Object.assign({}, BASE, { eleveId: 11, depart: 'D' })), /adresse de départ/);
  assert.equal(c.ecrits.length, 0);
  c = contexte();
  c.k.EUC_DEV653_enregistrerVisite(Object.assign({}, BASE, { eleveId: 11, transport: 'Visioconférence' }));
  assert.equal(c.appelsMaps.length, 0); assert.equal(c.ecrits[0].body.records[0].fields.Km_retenus, 0);
});

test('retrait : la ligne est vidée, jamais supprimée', () => {
  const c = contexte({ existants: [{ id: 77, fields: { Eleve_id: 11, Professeur: 'M. PROF', Date_visite: '2026-11-25' } }] });
  c.k.EUC_DEV653_retirerVisite({ t: 'x', eleveId: 11 });
  assert.equal(c.ecrits[0].m, 'patch'); assert.equal(c.ecrits[0].body.records[0].fields.Date_visite, ''); assert.equal(c.k.EUC_DEV653_vue_(c.ecrits[0].body.records[0].fields), null);
  assert.ok(!/records\/delete|data\/delete/.test(read('apps-script/EUC_DEV653_Tournee.js')));
});

test('page 2 pré-remplie : cellules, écart signalé, total', () => {
  const { k } = contexte();
  const v = J(k.EUC_DEV653_vue_({ Date_visite: '2026-11-26', Depart: '2', Heure_arrivee: '09:00', Heure_depart: '10:00', Transport: 'Véhicule personnel', Km_calcules: 12, Km_retenus: 15 }));
  assert.equal(v.ecart, true);
  assert.deepEqual(J(k.EUC_DEV653_cellules_(v)), { date: '26/11/2026', depart: '2', arrivee: '09:00', km: '15\n(calc. 12)', departHeure: '10:00', transport: 'Véhicule personnel' });
  assert.equal(k.EUC_DEV653_cellules_(J(k.EUC_DEV653_vue_({ Date_visite: '2026-11-26', Transport: 'Visioconférence', Km_retenus: 0, Km_calcules: 0 }))).km, 'visio');
  assert.equal(k.EUC_DEV653_totalKm_([{ visite: v }, { visite: null }, { visite: { transport: 'Véhicule personnel', km: 8 } }]), 23);
  const s = read('apps-script/EUC_PFMP_DEV370_AdminTools.js');
  assert.match(s, /var v=typeof EUC_DEV653_cellules_==='function'\?EUC_DEV653_cellules_\(x\.visite\)\|\|\{\}:\{\};rows\.push\(\[String\(i\+1\),x\.eleve\|\|'',x\.entreprise\|\|'',x\.adresse\|\|'',x\.contactEntreprise\|\|'',x\.contactTuteur\|\|'',v\.date\|\|'',v\.depart\|\|'',v\.arrivee\|\|'',v\.km\|\|'',v\.departHeure\|\|'',v\.transport\|\|x\.transport\|\|''\]\)/);
  assert.match(s, /Total des kilomètres déclarés : '\+EUC_DEV653_totalKm_\(g\.lignes\)/);
  assert.match(read('apps-script/EUC_DEV652_MesVisites.js'), /lignes\.forEach\(function\(l, i\) \{ l\.numero = i \+ 1; l\.visite = /);
});

test('page « Mes visites » : rendu simulé avec une visite, formulaire et boutons', () => {
  const h = read('apps-script/Mes_Visites_DEV652.html'), js = h.match(/<script>([\s\S]*?)<\/script>/)[1].replace('<?!= JSON.stringify(jeton) ?>', '"jeton"');
  const els = {}, el = id => els[id] || (els[id] = { id, hidden: false, innerHTML: '', textContent: '', className: '', dataset: {}, querySelector: () => null });
  const G = { professeur: 'M. PROF', classe: '1MELEC', periode: 'PFMP 2', debut: '23/11/2026', fin: '18/12/2026', lignes: [
    { eleveId: 11, numero: 1, eleve: 'ELEVE <Un>', entreprise: 'ELEC', siege: '1 rue', lieuStage: '', lieu: { adresse: '', codePostal: '', commune: '' }, convention: true, transport: 'Véhicule personnel',
      visite: { date: '2026-11-26', depart: 'EK', heureArrivee: '09:00', heureDepart: '10:00', transport: 'Véhicule personnel', km: 15, kmCalcules: 12, motif: 'travaux', ecart: true } },
    { eleveId: 12, numero: 2, eleve: 'ELEVE Deux', entreprise: 'AUTRE', siege: '2 rue', lieuStage: 'Chantier', lieu: { adresse: 'Chantier', codePostal: '', commune: 'Nice' }, convention: true, visite: null }] };
  const ctx = { document: { getElementById: el, querySelectorAll: () => [], querySelector: () => null, body: { appendChild() {} } }, setTimeout: () => 0, clearTimeout() {}, localStorage: { getItem: () => '5 rue Maison' },
    google: { script: { run: (() => { const r = { withSuccessHandler: f => (r.ok = f, r), withFailureHandler: () => r, EUC_DEV652_ouvrir: () => r.ok(G) }; return r; })() } } };
  vm.createContext(ctx); vm.runInContext(js, ctx);
  const liste = els.liste.innerHTML;
  assert.ok(liste.includes('<span class="num">1</span>ELEVE &lt;Un&gt;'), 'numéro et échappement');
  assert.match(liste, /✓ Visite du 26\/11\/2026 · 09:00–10:00/); assert.match(liste, /Départ : lycée · Véhicule personnel · <b>15 km<\/b> <span class="ecart">\(calculé : 12 km\)/);
  assert.match(liste, /<option value="2">n°2 — après la visite de ELEVE Deux<\/option>/); assert.ok(!/<option value="1">n°1/.test(liste.split('data-id="12"')[0]), 'pas de départ depuis la visite elle-même');
  assert.match(liste, /class="enregistrerVisite"><span class="spin"><\/span>/); assert.match(liste, /class="leger retirerVisite"><span class="spin"><\/span>/);
  assert.match(liste, /J’y suis allé/); assert.match(liste, /value="5 rue Maison"/, 'domicile relu sur l’appareil');
  assert.equal(els.etat.hidden, true); assert.equal(els.contenu.hidden, false);
  assert.match(h, /localStorage\.setItem\('EUC_DEV653_DOMICILE',v\)/); assert.match(h, /try\{return localStorage\.getItem/);
});
console.log(n + ' tests DEV653 réussis.');
