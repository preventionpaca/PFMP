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
  assert.match(book, /'EUC_DEV578C_CARTE_'/);
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
  assert.match(page, /id=\"pdf\">Exporter PDF/); assert.match(page, /function exporterClasse/); assert.match(page, /jspdf-autotable@3\.8\.2/);
});

test('codes postaux : 4 chiffres détectés, colonne Nombre passée en Texte puis 0 remis ; formules jamais modifiées', () => {
  const src = read('apps-script/EUC_DEV578_CodesPostaux.js'), appels = [];
  const cols = { EUC_APPRENTISSAGE_PFMP: [{ id: 'Code_postal', fields: { type: 'Numeric', label: 'Code postal' } }, { id: 'Ville', fields: { type: 'Text' } }],
    EUC_GEO: [{ id: 'Code_postal', fields: { type: 'Text' } }, { id: 'CP_calc', fields: { type: 'Any', isFormula: true } }] };
  const recs = { EUC_APPRENTISSAGE_PFMP: [{ id: 1, fields: { Code_postal: 6160 } }, { id: 2, fields: { Code_postal: 98000 } }, { id: 3, fields: { Code_postal: null } }],
    EUC_GEO: [{ id: 5, fields: { Code_postal: '6200', CP_calc: 6500 } }, { id: 6, fields: { Code_postal: '06000' } }, { id: 7, fields: { Code_postal: '0600' } }] };
  const k = { console, JSON, String, Number, Math, isFinite,
    EUC_SUIVI2_exigerAdmin_: () => ({ email: 'admin@x' }), LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    EUC_ENT_grist: (m, url, body) => { appels.push([m, url, body]); if (url === '/tables') return { tables: [{ id: 'EUC_APPRENTISSAGE_PFMP' }, { id: 'EUC_GEO' }] };
      let t = url.split('/')[2]; if (m === 'get' && url.endsWith('/columns')) return { columns: cols[t] }; if (m === 'get') return { records: recs[t] }; return {}; } };
  vm.createContext(k); vm.runInContext(src, k);
  const a = k.EUC_DEV578_cpAnalyse();
  assert.deepEqual(a.map(c => [c.table, c.colonne, c.nombre]), [['EUC_APPRENTISSAGE_PFMP', 'Code_postal', 1], ['EUC_GEO', 'Code_postal', 1], ['EUC_GEO', 'CP_calc', 1]]);
  assert.equal(appels.filter(x => x[0] !== 'get').length, 0, 'analyse en lecture seule');
  assert.equal(k.EUC_DEV578_cpCorrige_('0600'), null, 'saisie incomplète jamais complétée');
  assert.throws(() => k.EUC_DEV578_cpCorriger('oui'), /Confirmation/);
  const r = k.EUC_DEV578_cpCorriger('CORRIGER'), w = appels.filter(x => x[0] === 'patch');
  assert.deepEqual(w[0], ['patch', '/tables/EUC_APPRENTISSAGE_PFMP/columns', { columns: [{ id: 'Code_postal', fields: { type: 'Text' } }] }], 'type changé avant les valeurs');
  assert.deepEqual(w[1][2].records, [{ id: 1, fields: { Code_postal: '06160' } }]);
  assert.deepEqual(w[2][2].records, [{ id: 5, fields: { Code_postal: '06200' } }]);
  assert.equal(w.length, 3, 'colonne formule jamais modifiée'); assert.equal(r.rapport.find(x => x.colonne === 'CP_calc').ignore, 'colonne calculée par formule');
  assert.match(read('apps-script/EUC_PFMP_DEV449_ApprentisRapides.js'), /\/\^\\d\{4\}\$\/\.test\(cp\)\?'0'\+cp/, 'saisie des apprentis : 0 remis');
  assert.match(read('apps-script/Controle_Chiffres_DEV575.html'), /EUC_DEV578_cpCorriger\('CORRIGER'\)/);
});

test('géocodage : les entreprises des apprentis entrent dans la liste (adresse corrigée, SIRET, classe)', () => {
  const src = read('apps-script/EUC_DEV578_GeoApprentis.js');
  const k = { console, JSON, String, Number, Object, Array,
    EUC_DEV368_year: y => y || '2026-2027', EUC_DEV541_apprentissageClasses_: () => [{ id: 24, classe: 'TMVA2', famille: 'BACPRO' }],
    EUC_DEV538_records_: () => [{ id: 1, fields: { Classe: 24 } }, { id: 2, fields: { Classe: 99 } }],
    EUC_DEV538_fields_: r => r.fields || r, EUC_DEV538_n_: v => Number(v) || 0, EUC_DEV538_ref_: v => Number(v) || 0, EUC_DEV538_t_: v => v == null ? '' : String(v).trim(),
    EUC_DEV538_pick_: (f, ks) => { for (const x of ks) if (f[x] != null && f[x] !== '') return f[x]; return ''; },
    EUC_DEV540_normalizeAddress_: v => String(v).toUpperCase(),
    EUC_DEV538_optionalRecords_: () => [], EUC_DEV538_latestByStudent_: () => ({ 1: { fields: { Nom_entreprise: 'ALER', Adresse_entreprise: '13 bd Raymond Poincaré', Code_postal: '06160', Ville: 'Antibes', SIRET: '993 649 789 00019' } },
      2: { fields: { Nom_entreprise: 'HORS CLASSE', Adresse_entreprise: 'x', Code_postal: '06000' } } }) };
  vm.createContext(k); vm.runInContext(src, k);
  const d = k.EUC_DEV578_geoApprentisDetails_({ annee: '2026-2027' });
  assert.equal(d.length, 1); assert.equal(d[0].classe.id, 24); assert.equal(d[0].periode.libelle, 'Apprentissage');
  assert.deepEqual(JSON.parse(JSON.stringify(d[0].lignes)), [{ eleveId: 1, entreprise: 'ALER', adresseEntreprise: '13 BD RAYMOND POINCARÉ, 06160, ANTIBES', siretEntreprise: '99364978900019' }]);
  const geo = read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js');
  assert.match(geo, /concat\(typeof EUC_DEV578_geoApprentisDetails_==='function'/); assert.match(geo, /EUC_DEV457_revision_\('EUC_APPRENTISSAGE_PFMP'\)/); assert.match(geo, /DEV578-GEO-6/);
});

test('administration des conventions : liste des dossiers servie depuis le cache tant que Grist ne change pas', () => {
  const src = read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs'), cache = new Map(); let calculs = 0, temoin = '7';
  const fn = src.slice(src.indexOf('function EUC_DEV578_dossiersAdminEnCache_'), src.indexOf('function EUC_DEV578_listerDossiersAdmin'));
  const k = { String, Array, JSON, EUC_SUIVI2_temoin_: () => temoin, EUC_DEV572_lire_: x => cache.has(x) ? JSON.parse(cache.get(x)) : null, EUC_DEV572_ecrire_: (x, v) => cache.set(x, JSON.stringify(v)),
    EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148: a => { calculs++; return [{ id: 1, annee: a }]; } };
  vm.createContext(k); vm.runInContext(fn, k);
  k.EUC_DEV578_dossiersAdminEnCache_('2026-2027'); k.EUC_DEV578_dossiersAdminEnCache_('2026-2027'); assert.equal(calculs, 1, 'deuxième ouverture depuis le cache');
  temoin = '8'; k.EUC_DEV578_dossiersAdminEnCache_('2026-2027'); assert.equal(calculs, 2, 'Grist modifié : recalcul');
  assert.match(src, /tpl\.dossiersJson=JSON\.stringify\(EUC_DEV578_dossiersAdminEnCache_\(ctxAnnee\.active\)\)/);
  assert.match(read('apps-script/Admin_Conventions_PFMP.html'), /\.EUC_DEV578_listerDossiersAdmin\(yearContext\.active\)/);
});

test('gestion des apprentis : tableau de bord en cache (témoin, réglages, jour) ; indicateur « Chargement… » sur les pages admin', () => {
  assert.match(book, /function EUC_DEV545_dashboardLive\(annee\)\{\n  return EUC_DEV578_memoApprentis_\('APPLIVE'/);
  assert.match(book, /function EUC_DEV545_dashboardDetails\(annee\)\{\n  return EUC_DEV578_memoApprentis_\('APPDET'/);
  ['apps-script/Apprentissage_PFMP_V190X.html', 'apps-script/Admin_Conventions_PFMP.html'].forEach(f => {
    const h = read(f); assert.match(h, /id="eucOccupe"/, f);
    const code = h.match(/DEV578 : indicateur global[\s\S]*?<script>([\s\S]*?)<\/script>/)[1]; assert.doesNotThrow(() => new Function(code), f);
  });
});

test('mesure des temps de l’administration : réservée à l’administration, une mesure par appel, erreurs rapportées', () => {
  const src = read('apps-script/EUC_DEV578_Mesures.js'); let admin = true;
  const k = { String, JSON, Date, Error, EUC_SUIVI2_exigerAdmin_: () => { if (!admin) throw new Error('Accès réservé'); },
    EUC_DEV368_year: () => '2026-2027', EUC_SUIVI2_temoin_: () => '42', EUC_SUIVI2_modele_: a => { throw new Error('panne ' + a); } };
  vm.createContext(k); vm.runInContext(src, k);
  assert.ok(k.EUC_DEV578_mesuresListe().length >= 15);
  const t = k.EUC_DEV578_mesurer('temoin', ''); assert.equal(t.ok, true); assert.ok(t.ms >= 0);
  const s = k.EUC_DEV578_mesurer('suivi', '2025-2026'); assert.equal(s.ok, false); assert.match(s.erreur, /panne 2025-2026/);
  admin = false; assert.throws(() => k.EUC_DEV578_mesurer('temoin'), /réservé/);
  assert.match(read('apps-script/Controle_Chiffres_DEV575.html'), /\.EUC_DEV578_mesurer\(liste\[i\]\.id,annee\(\)\)/);
});

test('diagnostic de classe : référentiel, traces par référence ou nom exact, exclusion Pronote, présence dans le suivi', () => {
  const src = read('apps-script/EUC_DEV578_DiagClasse.js');
  const tables = { Classes: [{ id: 40, fields: { Nom: '1MELEC C', Actif: false } }, { id: 12, fields: { Nom: '1MELEC' } }],
    EUC_ELEVES_PFMP: [{ id: 1, fields: { Classe: 40, Actif: true } }, { id: 2, fields: { Classe: 12, Code_classe_importe: '1MELEC C' } }],
    EUC_CORRESPONDANCE_CLASSES_PRONOTE: [{ id: 9, fields: { Nom_classe_Pronote: '1MELEC C', Exclure_import: true, Annee_scolaire: '2026-2027' } }],
    Planning_Periodes: [{ id: 5, fields: { Classes_concernees: ['L', 12, 40] } }] };
  const k = { String, Object, Array, Number, EUC_SUIVI2_exigerAdmin_: () => {}, EUC_DEV368_year: () => '2026-2027',
    EUC_ENT_grist: (m, url) => { const t = decodeURIComponent(url.split('/')[2]); if (!tables[t]) throw new Error('absent'); return { records: tables[t] }; },
    EUC_DEV542_activeClassesConfig_: () => ({}), EUC_DEV542_classActive_: () => true, EUC_SUIVI2_modele_: () => ({ classes: [{ nom: '1MELEC', eleves: [1] }] }) };
  vm.createContext(k); vm.runInContext(src, k);
  const r = JSON.parse(JSON.stringify(k.EUC_DEV578_diagClasse('1melec-c')));
  assert.deepEqual(r.referentiel.map(c => [c.id, c.exact, c.actif]), [[40, true, false], [12, false, undefined]]);
  const t = n => r.traces.find(x => x.table === n);
  assert.equal(t('EUC_ELEVES_PFMP').lignes, 2, 'référence 40 et nom importé');
  assert.equal(t('EUC_CORRESPONDANCE_CLASSES_PRONOTE').exemples[0].exclure, true);
  assert.equal(t('Planning_Periodes').lignes, 1); assert.equal(t('EUC_APPRENTISSAGE_PFMP').erreur, 'tableau illisible ou absent');
  assert.equal(r.suivi.presente, false);
  assert.match(read('apps-script/Controle_Chiffres_DEV575.html'), /\.EUC_DEV578_diagClasse\(/);
});

test('réparation de classe : aperçu sans écriture, puis classe créée sans identifiant du modèle, périodes de l’année, exclusion levée', () => {
  const src = read('apps-script/EUC_DEV578_DiagClasse.js'), ecrits = [];
  const tables = { Classes: [{ id: 12, fields: { Nom: '1MELEC', Niveau: 'Première', Formation: 'BAC PRO MELEC', Identifiant_Pronote: 'X9', Actif: true } }],
    Annees_Scolaires: [{ id: 1, fields: { Code: '2026-2027' } }, { id: 2, fields: { Code: '2025-2026' } }],
    Planning_Periodes: [{ id: 5, fields: { Libelle: 'PFMP 1', Annee_scolaire: 1, Classes_concernees: ['L', 12, 13] } }, { id: 6, fields: { Libelle: 'Ancienne', Annee_scolaire: 2, Classes_concernees: ['L', 12] } }],
    EUC_CORRESPONDANCE_CLASSES_PRONOTE: [{ id: 30, fields: { Nom_classe_Pronote: '1MELEC2', Exclure_import: true, Annee_scolaire: '2026-2027' } }] };
  const k = { String, Object, Array, Number, JSON, EUC_SUIVI2_exigerAdmin_: () => ({ email: 'a@x' }), EUC_DEV368_year: () => '2026-2027',
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    EUC_ENT_grist: (m, url, body) => { const t = decodeURIComponent(url.split('/')[2]);
      if (m === 'get' && url.endsWith('/columns')) return { columns: [{ id: 'Nom', fields: {} }, { id: 'Niveau', fields: {} }, { id: 'Formation', fields: {} }, { id: 'Identifiant_Pronote', fields: {} }, { id: 'Actif', fields: {} }, { id: 'Effectif', fields: { isFormula: true } }] };
      if (m === 'get') return { records: tables[t] || [] }; ecrits.push([m, t, body]); return m === 'post' ? { records: [{ id: 77 }] } : {}; } };
  vm.createContext(k); vm.runInContext(src, k);
  const ap = k.EUC_DEV578_reparerClasse('1MELEC2', '1MELEC', '2026-2027', '');
  assert.equal(ap.apercu, true); assert.equal(ecrits.length, 0, 'aperçu : aucune écriture');
  assert.deepEqual(Array.from(ap.periodes), ['PFMP 1']);
  const r = k.EUC_DEV578_reparerClasse('1MELEC2', '1MELEC', '2026-2027', 'REPARER');
  assert.equal(r.id, 77);
  assert.deepEqual(ecrits[0][2].records[0].fields, { Niveau: 'Première', Formation: 'BAC PRO MELEC', Actif: true, Nom: '1MELEC2' }, 'pas d’identifiant Pronote du modèle');
  assert.deepEqual(ecrits[1][2].records, [{ id: 5, fields: { Classes_concernees: ['L', 12, 13, 77] } }], 'seulement la période de l’année');
  assert.deepEqual(ecrits[2][2].records, [{ id: 30, fields: { Exclure_import: false, Classe_Grist: 77, Classe_Grist_nom: '1MELEC2' } }]);
  tables.Classes.push({ id: 77, fields: { Nom: '1MELEC2' } });
  assert.throws(() => k.EUC_DEV578_reparerClasse('1MELEC2', '1MELEC', '2026-2027', ''), /existe déjà/);
});

test('listes des élèves par classe : effectifs du moteur, coordonnées de l’import, route admin, émargement et PDF', () => {
  const src = read('apps-script/EUC_DEV578_ListesEleves.js');
  const k = { String, Number, EUC_SUIVI2_modele_: () => ({ annee: '2026-2027', classes: [{ id: 3, nom: 'TMELEC', famille: 'BACPRO', niveau: 'Terminale', eleves: [{ id: 2, nom: 'ZOLA', prenom: 'Emile' }, { id: 1, nom: 'ARNOULD', prenom: 'Mathis' }] }, { id: 4, nom: 'VIDE', eleves: [] }] }),
    EUC_DEV538_records_: () => [{ id: 1, fields: { Nom: 'ARNOULD', Prenom: 'Mathis', Telephone_eleve: '0600000000', Email_eleve: 'm@x.fr' } }], EUC_DEV538_fields_: r => r.fields };
  vm.createContext(k); vm.runInContext(src, k);
  const d = JSON.parse(JSON.stringify(k.EUC_DEV578_listesEleves_('2026-2027')));
  assert.equal(d.classes.length, 1, 'classe sans élève écartée');
  assert.deepEqual(d.classes[0].eleves, [['ARNOULD', 'Mathis', '0600000000', 'm@x.fr'], ['ZOLA', 'Emile', '', '']]);
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'listes-eleves-pfmp':\s*return EUC_DEV578_afficherListesEleves\(e\);/);
  assert.match(read('apps-script/Admin_PFMP.html'), /page=listes-eleves-pfmp/);
  const h = read('apps-script/Listes_Eleves_DEV578.html'); assert.match(h, /id="colSign" checked/); assert.match(h, /jspdf-autotable@3\.8\.2/);
  assert.match(src, /EUC_SUIVI2_exigerAdmin_\(\)/);
});

console.log(`\n${n} tests DEV577 suivi des apprentis réussis.`);
