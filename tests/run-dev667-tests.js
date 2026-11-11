/* DEV667 — Registre de Monaco (RCI), entreprise de Monaco au SIRET français, numéro interne, coordonnées plausibles. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const base = () => { const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite }; vm.createContext(k); return k; };

test('coordonnées : 0,0 et points hors France et Monaco refusés (Renault Retail Group au large du Bénin)', () => {
  const k = base(); vm.runInContext(read('apps-script/EUC_DEV667_Coordonnees.js'), k);
  assert.equal(k.EUC_DEV667_coordOk_(43.7183, 7.2861), true, 'Nice-Riquier');
  assert.equal(k.EUC_DEV667_coordOk_(43.7384, 7.4246), true, 'Monaco');
  assert.equal(k.EUC_DEV667_coordOk_(41.92, 8.73), true, 'Corse');
  assert.equal(k.EUC_DEV667_coordOk_(0, 0), false, '0,0'); assert.equal(k.EUC_DEV667_coordOk_('', ''), false); assert.equal(k.EUC_DEV667_coordOk_(null, 7), false);
  assert.equal(k.EUC_DEV667_coordOk_(7.28, 43.71), false, 'latitude et longitude inversées');
});
test('book, carte du suivi, géocodage : garde-fou appliqué partout ; point invalide à regéocoder', () => {
  const b = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.ok(/function EUC_DEV538_geoOk_\(a,b\)\{return typeof EUC_DEV667_coordOk_==='function'/.test(b));
  assert.ok((b.match(/EUC_DEV538_geoOk_\(/g) || []).length >= 8, 'tous les chemins du book');
  assert.ok(!/c\.latitude=g\.latitude==null\?null:Number\(g\.latitude\)/.test(b), 'Number(\'\') = 0 ne passe plus');
  assert.match(read('apps-script/EUC_DEV583_CarteSuivi.js'), /function EUC_DEV583_valide_\(g\) \{ return g && \(typeof EUC_DEV667_coordOk_ !== 'function' \|\| EUC_DEV667_coordOk_\(g\.Latitude, g\.Longitude\)\)/);
  const k = base(); k.EUC_DEV441_t_ = v => v == null ? '' : String(v).trim();
  vm.runInContext(read('apps-script/EUC_DEV667_Coordonnees.js'), k);
  const g = read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), i = g.indexOf('function EUC_DEV443_savedStatus_'); vm.runInContext(g.slice(i, g.indexOf('\n', g.indexOf('return s||classified.statut', i)) + 1), k);
  assert.equal(k.EUC_DEV443_savedStatus_({ Statut: 'GEOCODE_AUTOMATIQUE', Latitude: 0, Longitude: 0 }, { pays: 'FRANCE', statut: 'A_GEOCODER' }), 'A_REGEOCODER');
  assert.equal(k.EUC_DEV443_savedStatus_({ Statut: 'GEOCODE_AUTOMATIQUE', Latitude: 43.71, Longitude: 7.28 }, { pays: 'FRANCE', statut: 'A_GEOCODER' }), 'GEOCODE_AUTOMATIQUE');
  assert.match(g, /if\(feature&&coords&&coords\.length>=2&&\(typeof EUC_DEV667_coordOk_!=='function'\|\|EUC_DEV667_coordOk_\(coords\[1\],coords\[0\]\)\)\)/, 'résultat BAN hors zone refusé');
});
const FICHE = `<p class="mb-2"><strong>Numéro RCI :</strong> 17S07483</p><span class="text-bold">État :</span>
<p class="mb-2"><strong>Raison sociale :</strong> TITAN ENGINEERING MONACO</p><p class="mb-2"><strong>Activité :</strong> En matière d&#39;ingénierie</p>
<p class="mb-2"><strong>Enseigne de l'établissement :</strong> TITANE</p><p class="mb-2"><strong>Adresse :</strong> 2 Rue du Gabian ; Les Industries ; 98000 Monaco</p>
<p class="mb-0"><strong>Numéro d'identification Statistique (NIS*) de l'établissement principal :</strong> 7112Y19343</p>`;
test('RCI : recherche (actives d’abord, entreprises individuelles comprises) et fiche lue en français ou en anglais', () => {
  const k = base(); vm.runInContext(read('apps-script/EUC_DEV667_RciMonaco.js'), k);
  const r = JSON.parse(JSON.stringify(k.EUC_DEV667_lireRecherche_({ data: [{ numeroRci: '72S01371', titre: 'TITAN S.A.', etat: 'RADIATION_DEFINITIVE', etatLibelle: 'Radiation Définitive', formJuridique: 'SAM' },
    { numeroRci: '17S07483', titre: 'TITAN ENGINEERING MONACO', etat: 'ACTIVE', etatLibelle: 'Active', formJuridique: 'SARL' }, { numeroRci: '99P00001', titre: 'M. X', etat: 'ACTIVE', commercant: true }] })));
  assert.deepEqual(r.map(x => x.rci), ['17S07483', '99P00001', '72S01371']); assert.equal(r[2].actif, false); assert.equal(r[1].forme, 'Commerçant (entreprise individuelle)');
  const f = k.EUC_DEV667_lireFiche_(FICHE);
  assert.deepEqual(JSON.parse(JSON.stringify(f)), { rci: '17S07483', nom: 'TITAN ENGINEERING MONACO', enseigne: 'TITANE', etat: '', adresse: '2 Rue du Gabian, Les Industries', cp: '98000', ville: 'Monaco', nis: '7112Y19343' });
  const en = k.EUC_DEV667_lireFiche_(FICHE.replace('Numéro RCI', 'RCI Number').replace('Raison sociale', 'Company name').replace('Adresse', 'Address').replace(/Numéro d'identification Statistique \(NIS\*\)/, 'Statistical Identification Number (SIN*)'));
  assert.equal(en.nis, '7112Y19343'); assert.equal(en.nom, 'TITAN ENGINEERING MONACO'); assert.equal(en.cp, '98000');
  assert.equal(k.EUC_DEV667_rciValide_('17S07483'), true); assert.equal(k.EUC_DEV667_rciValide_('17S07483/../x'), false);
});
test('RCI : appels serveur (nom ≥ 3 lettres, numéro RCI contrôlé, cache) ; numéro interne réservé au bureau', () => {
  const k = base(), urls = [], cache = {};
  Object.assign(k, { Utilities: { base64EncodeWebSafe: s => Buffer.from(s).toString('base64') }, CacheService: { getScriptCache: () => ({ get: c => cache[c] || null, put: (c, v) => { cache[c] = v; } }) },
    UrlFetchApp: { fetch: u => { urls.push(u); return { getResponseCode: () => 200, getContentText: () => /extrait/.test(u) ? FICHE : JSON.stringify({ total: 1, data: [{ numeroRci: '17S07483', titre: 'TITAN ENGINEERING MONACO', etat: 'ACTIVE' }] }) }; } },
    EUC_IMPORT_exigerAdminTexte_: () => { k.__admin = true; }, EUC_IMPORT_lireRecords_: () => [{ NIS: 'EUC-MC-0002' }], EUC_DEV646_table_: () => 'EUC_ENTREPRISES', EUC_DEV646_numeroSuivant_: rows => 'EUC-MC-000' + (rows.length + 2) });
  vm.runInContext(read('apps-script/EUC_DEV667_RciMonaco.js'), k);
  assert.equal(k.EUC_DEV667_rechercherRci('titan').resultats[0].rci, '17S07483'); k.EUC_DEV667_rechercherRci('titan'); assert.equal(urls.length, 1, 'cache');
  assert.match(urls[0], /^https:\/\/teleservice\.gouv\.mc\/rci\/recherche\/page\?value=titan&page=1&size=10$/);
  assert.throws(() => k.EUC_DEV667_rechercherRci('ab'), /3 lettres/); assert.throws(() => k.EUC_DEV667_ficheRci('x'), /RCI invalide/);
  assert.equal(k.EUC_DEV667_ficheRci({ rci: '17s07483' }).nis, '7112Y19343');
  assert.equal(k.EUC_DEV667_numeroInterne().nis, 'EUC-MC-0003'); assert.equal(k.__admin, true);
});
test('recherche Monaco par nom : entreprise de Monaco au SIRET français (Conti) proposée avec son SIRET', () => {
  const k = base(); vm.runInContext(read('apps-script/EUC_DEV646_MonacoSansNis.js'), k);
  const rows = [{ id: 1, Raison_sociale: 'SAM SACOM CONTI', SIRET: '123 456 789 00012', Numero_voie: '1 AV ALBERT II', Code_postal: '98000', Commune: 'MONACO' },
    { id: 2, Raison_sociale: 'CONTI NICE', SIRET: '11111111100011', Commune: 'NICE', Code_postal: '06000' }, { id: 3, Raison_sociale: 'CONTI MC', NIS: '7112B19343', Commune: 'Monaco' }];
  const r = JSON.parse(JSON.stringify(k.EUC_DEV646_filtrerParNom_(rows, 'conti')));
  assert.deepEqual(r.map(x => x.nom), ['CONTI MC', 'SAM SACOM CONTI'], 'pas l’entreprise de Nice');
  assert.equal(r[1].siret, '12345678900012'); assert.equal(r[1].nis, ''); assert.equal(r[0].nis, '7112B19343'); assert.equal(r[0].siret, '');
});
test('formulaire en ligne et page du QR code synchronisés : SIRET français repris, registre de Monaco en repli', () => {
  const f = read('apps-script/Declaration_Entreprise_DEV603.html'), q = read('apps-script/PFMP_Acces_QR_V116.html');
  assert.match(f, /if\(x\.siret\)\{etape\(3\);\$\('siret'\)\.value=x\.siret;/); assert.match(q, /if\(x\.siret\)choisirSiret\(x\.siret\);else choisir\(x\.nis\);/);
  [f, q].forEach(h => { assert.ok(h.includes("EUC_DEV667_rechercherRci"), 'recherche RCI'); assert.ok(h.includes("EUC_DEV667_ficheRci"), 'fiche RCI'); assert.ok(/chercher au registre de Monaco/.test(h)); });
  assert.match(f, /if\(!l\.length\)\{rciMonaco\(b,t\);return;\}/); assert.match(q, /if\(!l\.length\)\{chercherRci\(texte\);return;\}/);
  assert.match(q, /if\(b\.disabled\)return;busy\(b,true,'Lecture de la fiche…'\)/, 'bouton protégé'); assert.equal((q.match(/busy\(bt,false\)/g) || []).length, 3, 'registre : succès, erreur et délai rendent la main'); assert.match(f, /occupe\(bt,'Lecture de la fiche…'\)/);
  const p = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  ['EUC_DEV667_rechercherRci', 'EUC_DEV667_ficheRci', 'EUC_DEV667_numeroInterne'].forEach(x => assert.ok(p.includes("'" + x + "'"), x));
  assert.match(p, /bouton\('rci',x\.id,'Chercher au registre de Monaco \(RCI\)','gris'\)/); assert.match(p, /bouton\('interne',x\.id,'Pas de NIS : numéro interne','gris'\)/);
});
console.log(n + ' tests DEV667 réussis.');
