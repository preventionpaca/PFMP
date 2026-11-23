'use strict';
/* DEV719 — Simulation des formulaires élève : vraies pages, élève fictif, SIRET de la base, aucun enregistrement. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const S1 = '12345678200010', S2 = '12345678200028', S3 = '12345678200036';
/* Données fictives. */
const conv = (id, siret, o) => Object.assign({ id, Entreprise_siret: siret, Entreprise_raison_sociale: 'GARAGE TEST ' + id,
  Responsable_prenom: 'Paul', Responsable_nom: 'MARTIN', Responsable_telephone: '06 00 00 00 01', Responsable_courriel: 'paul@garage.test',
  Tuteur_prenom: 'Léa', Tuteur_nom: 'DURAND', Tuteur_telephone: '06 00 00 00 02', Tuteur_courriel: 'lea@garage.test' }, o || {});
const CONVS = [conv(1, S1, { Tuteur_prenom: 'Paul', Tuteur_nom: 'MARTIN' }), conv(2, S2), conv(3, S3, { Revoked: true })];

function serveur(admin) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k);
  ['apps-script/EUC_DEV706_Contacts.js', 'apps-script/EUC_DEV717_ContactsConnus.js', 'apps-script/EUC_DEV719_SimulationFormulaires.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  const gabarits = [];
  Object.assign(k, {
    EUC_SUIVI2_exigerAdmin_: () => { if (!admin) throw new Error('Accès réservé à l’administration PFMP.'); return { role: 'ADMIN_PFMP' }; },
    EUC_CONVENTION_lireAccesFraisV108_: () => CONVS, EUC_IMPORT_lireRecords_: () => [], EUC_DEV706_references_: () => [],
    EUC_RELEASE_serviceBase_: () => 'BASE',
    EUC_ENT_grist: () => { throw new Error('aucune écriture attendue'); },
    HtmlService: {
      createHtmlOutputFromFile: () => ({ getContent: () => '<script id="EUC_DEV719_SCRIPT"></script>' }),
      createTemplateFromFile: nom => { const t = { nom }; gabarits.push(t); t.evaluate = () => ({ setTitle: x => { t.titre = x; return { addMetaTag: () => t }; } }); return t; }
    }
  });
  k.gabarits = gabarits; return k;
}

test('serveur : personnes connues réservées à l’administration, sans jeton d’élève, lecture seule', () => {
  assert.throws(() => serveur(false).EUC_DEV719_contactsConnus({ siret: S2 }), /administration/);
  const r = J(serveur(true).EUC_DEV719_contactsConnus({ siret: S2 }));
  assert.deepEqual(r.personnes.map(p => p.nom).sort(), ['DURAND', 'MARTIN']);
});

test('SIRET au hasard : au moins deux personnes connues, conventions annulées écartées, tirage reproductible', () => {
  const k = serveur(true);
  /* Le tirage tombe d'abord sur S1 (une seule personne : MARTIN responsable et tuteur), puis sur S2. */
  const x = J(k.EUC_DEV719_choisirSiret_(CONVS, [], [], () => 0));
  assert.deepEqual(x, { siret: S2, entreprise: 'GARAGE TEST 2', personnes: 2 });
  const seul = J(k.EUC_DEV719_choisirSiret_([CONVS[0], CONVS[2]], [], [], () => 0));
  assert.equal(seul.siret, S1); assert.equal(seul.personnes, 1);
  assert.equal(J(k.EUC_DEV719_choisirSiret_([CONVS[2]], [], [], () => 0)).siret, '');
});

test('page : administration seulement, vrai gabarit, configuration injectée, liens construits depuis l’adresse de service', () => {
  assert.throws(() => serveur(false).EUC_DEV719_afficher({ parameter: { formulaire: 'qr' } }), /administration/);
  const k = serveur(true);
  const t = k.EUC_DEV719_afficher({ parameter: { formulaire: 'declaration', siret: S1 } });
  assert.equal(t.nom, 'Declaration_Entreprise_DEV603'); assert.match(t.titre, /^SIMULATION/);
  const cfg = JSON.parse(/EUC_DEV719_CONFIG=(.*?);<\/script>/.exec(t.simulation719)[1]);
  assert.equal(cfg.formulaire, 'declaration'); assert.equal(cfg.siret, S1); assert.equal(cfg.entreprise, 'GARAGE TEST 1');
  assert.equal(cfg.liens.qr, 'BASE?page=simulation-formulaires-eleve&formulaire=qr&siret=' + S1);
  assert.ok(!cfg.lecture.some(f => /enregistrer|deposer|identifier|signaler|verifierIdentite/i.test(f)), 'aucune fonction d’écriture ou d’identification transmise');
  const q = k.EUC_DEV719_afficher({ parameter: {} });
  assert.equal(q.nom, 'PFMP_Acces_QR_V116'); assert.equal(q.secoursUrl, '');
  ['apps-script/PFMP_Acces_QR_V116.html', 'apps-script/Declaration_Entreprise_DEV603.html'].forEach(f => {
    const h = read(f), i = h.indexOf("<?!= typeof simulation719 !== 'undefined' ? simulation719 : '' ?>");
    assert.ok(i > 0 && i < h.indexOf('<script'), f + ' : simulation chargée avant les scripts de la page');
  });
  const routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js');
  assert.ok(routes.includes("case 'simulation-formulaires-eleve':\n      return EUC_DEV719_afficher(e);"));
  assert.ok(read('scripts/pfmp-release-config.json').includes('"page": "simulation-formulaires-eleve", "scope": "admin"'));
  assert.ok(read('apps-script/Admin_PFMP.html').includes('?page=simulation-formulaires-eleve&amp;formulaire=qr">Simulation des formulaires élève'));
});

function client(formulaire, figer) {
  const html = read('apps-script/Simulation_Formulaires_DEV719.html'), src = /<script id="EUC_DEV719_SCRIPT">([\s\S]*?)<\/script>/.exec(html)[1];
  const envoyes = [], corps = [];
  const vraiRun = (ok, ko) => new Proxy({}, { get: (t, k) => k === 'withSuccessHandler' ? h => vraiRun(h, ko) : k === 'withFailureHandler' ? h => vraiRun(ok, h) : k === 'withUserObject' ? () => vraiRun(ok, ko) : (...a) => { envoyes.push([k, a]); if (ok) ok({ serveur: k }); } });
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, scrollIntoView() {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } });
  const document = { body: { firstChild: null, insertBefore: x => corps.push(x), appendChild: x => corps.push(x) }, createElement: el, getElementById: () => null, addEventListener() {} };
  const script = { run: vraiRun(), url: { getLocation: cb => cb({ parameter: { page: 'simulation-formulaires-eleve' } }) } };
  if (figer) Object.freeze(script);
  const w = { EUC_DEV719_CONFIG: { formulaire, siret: S1, entreprise: 'GARAGE TEST 1', personnes: 2, lecture: ['EUC_ENT_rechercherSiret'], liens: {} }, google: { script } };
  const k = { window: w, google: w.google, document, setTimeout: f => f(), Proxy, JSON, Object, String, Number, Array, Date, Error, RegExp, encodeURIComponent, Event: function() {} };
  vm.createContext(k); vm.runInContext(src, k);
  return { g: script, envoyes, corps, w };
}

test('navigateur : identification, dépôt et enregistrement simulés, jamais envoyés ; recherches et personnes connues transmises', () => {
  const c = client('declaration'), res = {}, err = {};
  const run = nom => c.g.run.withSuccessHandler(r => { res[nom] = r; }).withFailureHandler(e => { err[nom] = e.message; });
  run('EUC_DEV603_classes').EUC_DEV603_classes({});
  run('EUC_DEV603_identifier').EUC_DEV603_identifier({ nom: 'TEST', prenom: 'Élève', captcha: 'SIMUL' });
  run('EUC_DEV603_deposer').EUC_DEV603_deposer({ jeton: 'SIMULATION-DEV719', siret: S1, responsable: { nom: 'MARTIN' } });
  run('EUC_DEV603_signalerProbleme').EUC_DEV603_signalerProbleme({ jeton: 'SIMULATION-DEV719' });
  run('EUC_CONVENTION_enregistrerEntrepriseV117').EUC_CONVENTION_enregistrerEntrepriseV117('SIMULATION-DEV719', { entrepriseSiret: S1 });
  run('EUC_DEV628_inconnu').EUC_DEV628_inconnu({});
  run('EUC_ENT_rechercherSiret').EUC_ENT_rechercherSiret(S1);
  run('EUC_DEV717_contactsConnus').EUC_DEV717_contactsConnus({ siret: S1, jeton: 'SIMULATION-DEV719' });
  assert.deepEqual(J(c.envoyes), [['EUC_ENT_rechercherSiret', [S1]], ['EUC_DEV719_contactsConnus', [{ siret: S1 }]]]);
  assert.equal(res.EUC_DEV603_classes.classes[0].nom, 'CLASSE TEST (simulation)');
  assert.equal(res.EUC_DEV603_identifier.periodes.length, 1);
  assert.match(res.EUC_DEV603_deposer.numero, /SIMULATION/);
  assert.match(res.EUC_CONVENTION_enregistrerEntrepriseV117.numeroEnregistrement, /SIMULATION/);
  assert.match(err.EUC_DEV628_inconnu, /bloqué/);
  assert.ok(c.corps.some(x => /SIMULATION — rien n’est enregistré/.test(x.innerHTML || '')), 'bandeau affiché');
  assert.ok(c.corps.some(x => /rien n’a été enregistré/.test(x.innerHTML || '')), 'récapitulatif de ce qui aurait été envoyé');
});

test('navigateur : formulaire du QR code avec convention fictive ; page bloquée si l’appel serveur ne peut pas être remplacé', () => {
  const c = client('qr'); let loc, ident;
  c.g.url.getLocation(l => { loc = l; });
  assert.equal(loc.parameter.rid, 'SIMULATION');
  c.g.run.withSuccessHandler(r => { ident = r; }).EUC_CONVENTION_verifierIdentiteV113('SIMULATION', 1, 1);
  assert.equal(ident.saisieAutorisee, true); assert.equal(ident.resume, 'SIMULATION-DEV719'); assert.equal(c.envoyes.length, 0);
  const f = client('qr', true);
  assert.ok(f.corps.some(x => /Simulation impossible/.test(x.textContent || '')), 'page bloquée');
  f.g.run.EUC_DEV603_deposer({});
  assert.equal(f.envoyes.length, 1, 'remplacement impossible : voile plein écran, aucune simulation partielle');
});

test('formulaire du QR code : la recherche SIRET du contrôleur FIX9 propose aussi les personnes connues (défaut DEV717 révélé par la simulation)', () => {
  const h = read('apps-script/PFMP_Acces_QR_V116.html'), fix9 = h.slice(h.indexOf('<script id="EUC_QR_CONTROLLER_FIX9">'));
  assert.ok(h.includes('window.EUC_QR_proposerContacts717=proposerContactsConnus717;'));
  assert.equal((fix9.match(/window\.EUC_QR_proposerContacts717\(\)/g) || []).length, 2, 'les deux réponses positives (fiche connue et annuaire officiel)');
  assert.ok(h.includes("champs:{civ:field(pre+'Civilite'),prenom:field(pre+'Prenom')"));
  const c717 = read('apps-script/Contacts_Connus_DEV717.html');
  assert.equal((c717.match(/<input type="radio" form="euc717-hors-formulaire" name="/g) || []).length, 2, 'choix de la personne jamais envoyé avec le formulaire');
  assert.ok(!/<input type="radio" name=/.test(c717));
});

test('identité remise en ordre : nom complet saisi dans « nom », prénom et nom inversés d’après le courriel (données fictives)', () => {
  const k = serveur(true);
  assert.deepEqual(J(k.EUC_DEV717_identite_('', 'DUPONT Claire', '')), { prenom: 'Claire', nom: 'DUPONT' });
  assert.deepEqual(J(k.EUC_DEV717_identite_('Durand', 'Hugo', 'hugo.durand@garage.test')), { prenom: 'Hugo', nom: 'Durand' });
  assert.deepEqual(J(k.EUC_DEV717_identite_('Paul', 'MARTIN', 'paul.martin@garage.test')), { prenom: 'Paul', nom: 'MARTIN' });
  assert.deepEqual(J(k.EUC_DEV717_identite_('Paul', 'MARTIN', 'contact@garage.test')), { prenom: 'Paul', nom: 'MARTIN' });
  const convs = [conv(10, S1, { Responsable_prenom: '', Responsable_nom: 'DUPONT Claire', Responsable_courriel: 'rh@garage.test', Tuteur_prenom: 'Durand', Tuteur_nom: 'Hugo', Tuteur_courriel: 'hugo.durand@garage.test' }),
    conv(11, S1, { Responsable_prenom: 'Claire', Responsable_nom: 'DUPONT', Tuteur_prenom: 'Hugo', Tuteur_nom: 'DURAND' })];
  const r = J(k.EUC_DEV717_calculer_(S1, { conventions: convs, depots: [], references: [] }));
  assert.equal(r.personnes.length, 2, 'les saisies remises en ordre rejoignent la même personne');
  assert.ok(r.personnes.some(p => p.prenom === 'Claire' && p.nom === 'DUPONT'));
  assert.ok(r.personnes.some(p => p.prenom === 'Hugo' && /^durand$/i.test(p.nom)));
});

test('accélération : index de toutes les entreprises calculé une fois, gardé 20 min en cache ; une demande ne relit plus Grist', () => {
  const k = serveur(true);
  const idx = J(k.EUC_DEV717_index_(CONVS, [], []));
  assert.deepEqual(Object.keys(idx).sort(), [S1, S2], 'convention annulée (S3) absente de l’index');
  assert.deepEqual(idx[S2], J(k.EUC_DEV717_calculer_(S2, { conventions: CONVS, depots: [], references: [] })).personnes, 'même résultat que le calcul SIRET par SIRET');
  let lectures = 0; const cache = {};
  k.EUC_CONVENTION_lireAccesFraisV108_ = () => { lectures++; return CONVS; };
  k.CacheService = { getScriptCache: () => ({ get: c => cache[c] || null, getAll: l => { const o = {}; l.forEach(c => { if (c in cache) o[c] = cache[c]; }); return o; }, putAll: (o, ttl) => { assert.equal(ttl, 1200); Object.assign(cache, o); } }) };
  const r1 = J(k.EUC_DEV717_calculer_(S2)), r2 = J(k.EUC_DEV717_calculer_(S1));
  assert.equal(lectures, 1, 'une seule lecture des conventions pour deux SIRET');
  assert.equal(r1.personnes.length, 2); assert.equal(r2.personnes.length, 1);
  assert.equal(J(k.EUC_DEV717_calculer_('99999999999999')).personnes.length, 0);
  assert.throws(() => k.EUC_DEV717_prechauffer({}), /Accès refusé/);
  assert.equal(J(k.EUC_DEV719_prechauffer()).ok, true); assert.throws(() => serveur(false).EUC_DEV719_prechauffer(), /administration/);
});

test('accélération : préchauffage dès l’identification et demande lancée au clic « Rechercher », dans les trois formulaires', () => {
  const qr = read('apps-script/PFMP_Acces_QR_V116.html'), v117 = read('apps-script/PFMP_Continuation_QR_V117.html'), dec = read('apps-script/Declaration_Entreprise_DEV603.html');
  assert.ok(qr.includes('if(window.EUC717)EUC717.prechauffer({reprise:RESUME});'));
  assert.ok(qr.includes("window.EUC_QR_prechargerContacts717=function(siret){if(window.EUC717)EUC717.precharger(siret,{reprise:RESUME});};"));
  assert.ok(/ident\.value=siret;\n[^\n]*window\.EUC_QR_prechargerContacts717\(siret\)/.test(qr), 'contrôleur FIX9 : demande au clic');
  assert.ok(v117.includes('initData(r);\n          /* DEV719 : index des personnes connues préparé à l\'avance. */if(window.EUC717)EUC717.prechauffer({reprise:RESUME});'));
  assert.ok(v117.includes("if(window.EUC717)EUC717.precharger(field('entrepriseSiret').value,{reprise:RESUME});"));
  assert.ok(dec.includes('JETON=r.jeton;PERIODES=r.periodes;/* DEV719 : index des personnes connues préparé à l\'avance. */if(window.EUC717)EUC717.prechauffer({jeton:JETON});'));
  assert.ok(dec.includes("occupe(b,'Vérification…');/* DEV719 */if(window.EUC717)EUC717.precharger(s,{jeton:JETON});"));
  const sim = read('apps-script/Simulation_Formulaires_DEV719.html');
  assert.ok(sim.includes("if(nom==='EUC_DEV717_prechauffer'){nom='EUC_DEV719_prechauffer';args=[];}"));
});

console.log(n + ' tests DEV719 réussis.');
