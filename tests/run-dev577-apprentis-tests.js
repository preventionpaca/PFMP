'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('apps-script/EUC_DEV577_Apprentis.js'), page = read('apps-script/Suivi_Apprentis_DEV577.html'),
  release = read('apps-script/EUC_PFMP_ReleaseChannel.js'), verrou = read('apps-script/ZZ_EUC_ACCES_Verrou.js'),
  carteApp = read('apps-script/Cartographie_Apprentis_DEV545.html'), cartePfmp = read('apps-script/Cartographie_PFMP_DEV441.html'), book = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }

/* Aides du socle DEV538, réduites à leur comportement. */
const c = { console, JSON, Math, Date, Object, Array, String, Number,
  EUC_DEV538_fields_: r => (r && r.fields) || r || {},
  EUC_DEV538_pick_: (f, ks) => { for (const k of ks) if (f[k] != null && f[k] !== '') return f[k]; return ''; },
  EUC_DEV538_date_: v => v ? new Date(v + 'T12:00:00Z') : null,
  EUC_DEV538_bool_: v => v === true,
  EUC_DEV538_iso_: d => d ? d.toISOString().slice(0, 10) : '' };
vm.createContext(c); vm.runInContext(src, c);
const NOW = new Date('2026-10-16T12:00:00Z'), etat = (f, print) => c.EUC_DEV577_etat_({ fields: f }, print ? new Date(print + 'T12:00:00Z') : null, NOW);

test('circuit : distribué seul = apprenti potentiel', () => {
  const s = etat({ Date_distribution_dossier: '2026-09-10' });
  assert.deepEqual([s.potentiel, s.futur, s.apprenti, s.distribue, s.rapporte], [true, false, false, true, false]);
});
test('circuit : dossier rapporté signé = futur apprenti (plus potentiel), distribution conservée', () => {
  const s = etat({ Date_distribution_dossier: '2026-09-10', Date_remise_dossier: '2026-09-25' });
  assert.deepEqual([s.potentiel, s.futur, s.rapporte, s.dates.distribution], [false, true, true, '2026-09-10']);
});
test('circuit : contrat commencé = apprenti (ni futur ni potentiel) ; contrat à venir = futur', () => {
  const a = etat({ Dossier_distribue: true, Dossier_remis: true, Dossier_transmis_CFA: true, Date_contrat_officielle: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-08-31' });
  assert.deepEqual([a.apprenti, a.futur, a.potentiel, a.valide, a.cfa], [true, false, false, true, true]);
  const f = etat({ Dossier_remis: true, Date_contrat_officielle: '2026-11-02', Date_debut: '2026-11-02', Date_fin: '2028-08-31' });
  assert.deepEqual([f.apprenti, f.futur], [false, true]);
});
test('circuit : rupture passée = ni apprenti ni futur, comptée en rupture', () => {
  const s = etat({ Date_contrat_officielle: '2026-09-01', Date_debut: '2026-09-01', Date_fin: '2028-08-31', Date_rupture_contrat: '2026-10-01' });
  assert.deepEqual([s.rompu, s.apprenti, s.futur, s.valide], [true, false, false, false]);
});
test('impression du dossier = distribution', () => {
  assert.equal(etat({}, '2026-09-05').potentiel, true);
});
test('page : script valide, données échappées, bulles et liste au clic, carte avec retour', () => {
  const m = page.match(/<script>([\s\S]*)<\/script>/);
  assert.doesNotThrow(() => new Function(m[1].replace('<?!= donnees ?>', '{"annee":"2026-2027","groupes":[],"cartes":{},"totaux":{}}').replace('<?!= config ?>', '{"base":"x"}')));
  assert.match(src, /replace\(\/<\/g, '\\\\u003c'\)/);
  assert.match(page, /colonnesParClasse/); assert.match(page, /retour=enseignants/);
  assert.match(page, /EUC_DEV577_temoinActuel/);
});
test('route servie avant le routage historique, protégée par la clé des enseignants', () => {
  assert.match(release, /page === 'suivi-apprentis-enseignants'\)\s*\?\s*EUC_DEV577_pageApprentis_\(e\)/);
  assert.match(verrou, /'suivi-apprentis-enseignants': 1/);
});
test('cartes : points hors zone France–Monaco écartés et signalés ; carte des apprentis en cache par témoin', () => {
  assert.match(carteApp, /la>41&&la<51\.5&&lo>-5\.5&&lo<10/); assert.match(cartePfmp, /la>41&&la<51\.5&&lo>-5\.5&&lo<10/);
  assert.match(book, /function EUC_DEV545_apprenticeMapData\(q\)\{[\s\S]{0,300}EUC_SUIVI2_temoin_/);
  assert.match(src, /reglages/, 'quotas et modes (propriétés) dans la clé de cache');
});

test('observation de l’origine des ouvertures (Atrium) notée dans le journal des accès, sans blocage', () => {
  assert.match(verrou, /if \(enseignant && p\.orig != null\) EUC_ACCES_noter_\('origine'/);
  assert.match(verrou, /setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\);\n\}/, 'page de refus affichable dans pfmp.loucodi.fr');
});

test('carte des apprentis : détail nominatif pour les enseignants, liste sous la carte, PDF, apprentis non placés signalés', () => {
  assert.match(book, /nominatif=EUC_DEV538_staffAllowed_\(\)/); assert.match(book, /if\(!nominatif\)delete p\.details/);
  assert.match(book, /absent\(student,'Entreprise pas encore géolocalisée/); assert.match(book, /absents:absents/);
  assert.match(book, /'EUC_DEV578B_CARTE_'/);
  assert.match(carteApp, /BOOT\.mode==='ADMIN'\|\|NOMINATIF/); assert.match(carteApp, /id="listeCarte"/); assert.match(carteApp, /jspdf-autotable@3\.8\.2/);
  assert.match(carteApp, /non placés sur la carte/);
  assert.match(carteApp, /EUC_DEV576_historiquesCarte\(\{annee:'ALL'\}\)/, 'historique toutes années, apprentis et scolaires');
  assert.match(carteApp, /function focusEntreprise/); assert.match(page, /data-carte="1"/); assert.match(page, /&focus='\+encodeURIComponent/);
  assert.match(carteApp, /x\.professeurVisiteur\?'<small>Professeur visiteur/, 'pas de nom de professeur si aucun programmé');
  assert.match(book, /b\.webappUrl=EUC_RELEASE_serviceBase_\(\)/, 'retour sans page blanche googleusercontent');
});

test('historique des entreprises toujours prêt : servi depuis la dernière version, recalculé en arrière-plan seulement si Grist change', () => {
  const src578 = read('apps-script/EUC_DEV578_HistoriquesPrets.js'), cache = new Map(); let calculs = 0, temoin = 't1', triggers = [];
  const k = { console, JSON, Date, Math, Object, Array, String, Number, Infinity,
    EUC_SUIVI2_temoin_: () => temoin, EUC_DEV441_digest_: v => 'd-' + v,
    EUC_DEV538_history_: q => { calculs++; assert.equal(q.annee, 'ALL'); return [{ identity: 'SIRET|1', entreprise: 'Garage', adresse: '1 rue 06200 Nice', historique: [{ annee: '2026-2027', eleve: 'X', apprenti: true }] }]; },
    EUC_DEV572_lire_: key => cache.has(key) ? JSON.parse(cache.get(key)) : null, EUC_DEV572_ecrire_: (key, v) => cache.set(key, JSON.stringify(v)),
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    ScriptApp: { getProjectTriggers: () => triggers, newTrigger: h => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => triggers.push({ getHandlerFunction: () => h }) }) }) }) } };
  vm.createContext(k); vm.runInContext(src578, k);
  const a = k.EUC_DEV578_historiquesTous_(); assert.equal(calculs, 1); assert.ok(a.par['d-SIRET|1'.slice(0, 32)]);
  assert.equal(triggers.length, 1, 'déclencheur installé');
  k.EUC_DEV578_historiquesTous_(); assert.equal(calculs, 1, 'deuxième ouverture instantanée');
  k.EUC_DEV578_prechaufferHistoriques(); assert.equal(calculs, 1, 'Grist inchangé : pas de recalcul');
  temoin = 't2'; const stale = k.EUC_DEV578_historiquesTous_(); assert.equal(calculs, 1); assert.equal(stale.aJour, false, 'servi sans attendre');
  k.EUC_DEV578_prechaufferHistoriques(); assert.equal(calculs, 2, 'Grist modifié : recalcul en arrière-plan');
  assert.match(read('apps-script/EUC_DEV576_CarteHistoriques.js'), /return EUC_DEV578_historiquesTous_\(\)/);
  assert.match(cartePfmp, /EUC_DEV576_historiquesCarte\(\{annee:'ALL'\}\)/); assert.match(cartePfmp, /function ficheHtml/);
  assert.equal(a.noms['X|'] === undefined, true);
  const cle = k.EUC_DEV578_cleNom_('Garage Marino', '2 BOULEVARD CARLONE, 06200 NICE'); assert.equal(cle, 'GARAGE MARINO|06200');
  const cn = new Function(cartePfmp.match(/function cleNom\(e,a\)\{[^\n]*/)[0] + ';return cleNom')();
  assert.equal(cn('Garage Marino', '2 BOULEVARD CARLONE, 06200 NICE'), cle, 'même clé navigateur / serveur');
  assert.match(cartePfmp, /PREFETCH\.par\[\(PREFETCH\.noms\|\|\{\}\)\[cleNom\(x\.entreprise,x\.adresse\)\]\]/);
  assert.match(carteApp, /HIST\.par\[\(HIST\.noms\|\|\{\}\)\[cleNom\(p\.entreprise,p\.adresse\)\]\]/);
  assert.match(read('apps-script/Suivi_Enseignants_DEV576.html'), /url=window\.eucAvecJeton\(url\)/); assert.match(page, /url=window\.eucAvecJeton\(url\)/);
  assert.match(verrou, /window\.eucAvecJeton=function/);
});

console.log(`\n${n} tests DEV577 suivi des apprentis réussis.`);
