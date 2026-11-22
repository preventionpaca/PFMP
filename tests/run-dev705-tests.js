/* DEV705 — Lieu de stage distinct du siège sur toutes les cartes : règles, index, placement, géocodage, pages. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

function ctx(extra) {
  const k = Object.assign({ console: { log() {} }, JSON, Math, Date, Object, Array, String, Number, Error, RegExp, isFinite,
    Utilities: { base64EncodeWebSafe: b => Buffer.from(b).toString('base64'), computeDigest: (a, v) => Array.from(crypto.createHash('sha256').update(String(v)).digest()), DigestAlgorithm: { SHA_256: 1 }, sleep() {} },
    EUC_LIEN_: () => 'https://exemple.invalid/' }, extra || {});
  vm.createContext(k);
  ['apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js', 'apps-script/EUC_DEV583_CarteSuivi.js', 'apps-script/EUC_DEV649_LieuStageRecap.js', 'apps-script/EUC_DEV705_LieuxStage.js']
    .forEach(f => vm.runInContext(read(f), k, { filename: f }));
  return k;
}
const conv = o => Object.assign({ Entreprise_raison_sociale: 'TECHNIDRILL', Entreprise_siret: '12345678901234', Entreprise_adresse: '10 rue de l’Industrie', Entreprise_code_postal: '69680', Entreprise_commune: 'Chassieu' }, o);
const geo = (id, f) => ({ id, fields: Object.assign({ Statut: 'GEOCODE_AUTOMATIQUE', Pays: 'FRANCE' }, f) });

test('lieu distinct : vide, recopie du siège (DEV662), numéro ajouté à la voie du siège (DEV666), autre adresse', () => {
  const k = ctx();
  assert.equal(k.EUC_DEV705_lieuDistinct_(conv({})), '', 'aucun lieu saisi');
  assert.equal(k.EUC_DEV705_lieuDistinct_(conv({ Lieu_stage_adresse: '10 rue de l’Industrie', Lieu_stage_code_postal: '69680', Lieu_stage_commune: 'Chassieu' })), '', 'recopie du siège');
  assert.equal(k.EUC_DEV705_lieuDistinct_(conv({ Entreprise_adresse: 'rue de l’Industrie', Lieu_stage_adresse: '12 rue de l’Industrie', Lieu_stage_code_postal: '69680', Lieu_stage_commune: 'Chassieu' })), '', 'DEV666 : siège numéroté, pas un autre lieu');
  assert.equal(k.EUC_DEV705_lieuDistinct_(conv({ Lieu_stage_adresse: '5 avenue Pierre Sola', Lieu_stage_code_postal: '06100', Lieu_stage_commune: 'Nice' })), '5 avenue Pierre Sola, 06100 Nice');
});

test('index : une ligne par année, entreprise et lieu ; élèves distincts ; élève d’essai exclu ; année du dépôt par son n°', () => {
  const k = ctx({ EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire || ((String(a.Numero_enregistrement).match(/PFMP-(20\d{2})-/) || [])[1] ? RegExp.$1 + '-' + (Number(RegExp.$1) + 1) : '') });
  const lieu = { Lieu_stage_adresse: '5 avenue Pierre Sola', Lieu_stage_code_postal: '06100', Lieu_stage_commune: 'Nice' };
  const ix = J(k.EUC_DEV705_construireIndex_(fn => {
    fn(conv(Object.assign({ Annee_scolaire: '2026-2027' }, lieu)), { id: 1 }, {}, { eleveId: 1, classe: 'TMVA1' });
    fn(conv(Object.assign({ Annee_scolaire: '2026-2027' }, lieu)), { id: 1 }, {}, { eleveId: 1, classe: 'TMVA1' });
    fn(conv(Object.assign({ Annee_scolaire: '2026-2027' }, lieu)), { id: 2 }, {}, { eleveId: 2, classe: 'TMVA1' });
    fn(conv(Object.assign({ Annee_scolaire: '2026-2027' }, lieu)), { id: 3 }, { Donnee_test: true }, { eleveId: 3, classe: 'TMVA1' });
    fn(conv(Object.assign({}, lieu)), { id: 4 }, {}, { eleveId: 4, classe: '1MVA', numero: 'PFMP-2025-S12' });
    fn(conv({ Annee_scolaire: '2026-2027' }), { id: 5 }, {}, { eleveId: 5, classe: 'TMVA1' });
  }));
  assert.deepEqual(ix.map(x => [x.a, x.s, x.l, x.k]), [['2026-2027', '12345678901234', '5 avenue Pierre Sola, 06100 Nice', 2], ['2025-2026', '12345678901234', '5 avenue Pierre Sola, 06100 Nice', 1]]);
  assert.ok(!JSON.stringify(ix).match(/eleveId|"v"/), 'aucun identifiant d’élève dans l’index');
  assert.deepEqual(J(k.EUC_DEV705_lieuxDe_(ix, ['2026-2027'], 'Autre nom', '12345678901234')), { '5 avenue Pierre Sola, 06100 Nice': 2 }, 'par SIRET');
  assert.deepEqual(J(k.EUC_DEV705_lieuxDe_(ix, [], 'Technidrill SAS', '')), { '5 avenue Pierre Sola, 06100 Nice': 3 }, 'par nom, toutes années');
  assert.deepEqual(J(k.EUC_DEV705_lieuxDe_(ix, ['2024-2025'], 'TECHNIDRILL', '12345678901234')), {}, 'hors années');
  assert.deepEqual(J(k.EUC_DEV705_lieuxDe_(ix, [], 'TECHNIDRILL', '99999999999999')), {}, 'autre SIRET : pas le même établissement');
});

test('placement : identité ou adresse du lieu, jamais le SIRET du siège ; lieu à moins de 50 m ignoré ; sans position listé', () => {
  const k = ctx();
  const ix = k.EUC_DEV583_indexGeo_([
    geo(1, { SIRET: '12345678901234', Entreprise: 'TECHNIDRILL', Adresse_source: '10 rue de l’Industrie, 69680 Chassieu', Latitude: 45.74, Longitude: 4.96 }),
    geo(2, { Entreprise: 'TECHNIDRILL', Adresse_source: '5 avenue Pierre Sola, 06100 Nice', Latitude: 43.715, Longitude: 7.27 }),
    geo(3, { Entreprise: 'GARAGE', Adresse_source: '2 rue B, 06000 Nice', Latitude: 43.7001, Longitude: 7.2601 }),
    geo(4, { Entreprise: 'GARAGE', Adresse_source: '9 rue C, 06200 Nice', Latitude: 43.69, Longitude: 7.2, Statut: 'A_VALIDER_MANUELLEMENT' })]);
  const pts = [
    { entreprise: 'TECHNIDRILL', adresse: 'Chassieu', latitude: 45.74, longitude: 4.96, _lieux: { '5 avenue Pierre Sola, 06100 Nice': 2, '1 rue Inconnue, 06300 Nice': 1 } },
    { entreprise: 'GARAGE', adresse: '1 rue A, 06000 Nice', latitude: 43.7, longitude: 7.26, _lieux: { '2 rue B, 06000 Nice': 1, '9 rue C, 06200 Nice': 1 } }];
  const r = J(k.EUC_DEV705_positionner_(pts, ix));
  assert.equal(r.lieux, 1);
  assert.deepEqual(J(pts[0].lieux).map(l => [l.adresse, l.latitude, l.longitude, l.eleves]), [['5 avenue Pierre Sola, 06100 Nice', 43.715, 7.27, 2]]);
  assert.ok(pts[0].lieux[0].km > 200, 'distance siège → lieu indiquée');
  assert.equal(pts[1].lieux, undefined, 'lieu à moins de 50 m du siège : même endroit, pas de second point');
  assert.ok(!('_lieux' in pts[0]), 'champ de travail retiré');
  assert.deepEqual(r.sansPosition.map(x => [x.adresse, x.statut]), [['1 rue Inconnue, 06300 Nice', 'A_GEOCODER'], ['9 rue C, 06200 Nice', 'A_VALIDER_MANUELLEMENT']]);
  /* Le lieu n'est jamais placé par le SIRET (ce serait le siège). */
  const ix2 = k.EUC_DEV583_indexGeo_([geo(1, { SIRET: '12345678901234', Latitude: 45.74, Longitude: 4.96 })]);
  const p2 = [{ entreprise: 'TECHNIDRILL', siret: '12345678901234', latitude: 45.74, longitude: 4.96, _lieux: { '5 avenue Pierre Sola, 06100 Nice': 1 } }];
  assert.equal(k.EUC_DEV705_positionner_(p2, ix2).sansPosition[0].statut, 'A_GEOCODER');
});

test('carte du suivi : lieu de la fiche du modèle rattaché au point de l’entreprise', () => {
  const k = ctx();
  const fiche = (lieu) => ({ entreprise: 'TECHNIDRILL', adresse: '10 rue de l’Industrie, 69680 Chassieu', siret: '12345678901234', lieu: lieu, contact: {}, tuteur: {} });
  const m = { annee: '2026-2027', classes: [{ id: 21, nom: 'TMVA1', famille: 'BACPRO', eleves: [{ id: 1, libelle: 'A' }, { id: 2, libelle: 'B' }, { id: 3, libelle: 'C' }], periodes: [{ id: 300, libelle: 'PFMP n°1', resume: {
    statuts: { 1: 'AVEC', 2: 'AVEC', 3: 'AVEC' }, fiches: { 1: fiche('5 avenue Pierre Sola, 06100 Nice'), 2: fiche('5 avenue Pierre Sola, 06100 Nice'), 3: fiche('') } } }] }] };
  const ent = k.EUC_DEV583_entreprises_(m, {}, false);
  assert.deepEqual(J(ent[0].lieux), { '5 avenue Pierre Sola, 06100 Nice': 2 });
  const ix = k.EUC_DEV583_indexGeo_([geo(1, { SIRET: '12345678901234', Latitude: 45.74, Longitude: 4.96 }), geo(2, { Entreprise: 'TECHNIDRILL', Adresse_source: '5 avenue Pierre Sola, 06100 Nice', Latitude: 43.715, Longitude: 7.27 })]);
  const res = k.EUC_DEV583_points_(ent, ix, false), lx = J(k.EUC_DEV705_placer_(res.points, ix, false));
  assert.equal(lx.lieux, 1); assert.equal(lx.geocodes, 0);
  assert.deepEqual(J(res.points[0].lieux).map(l => [l.adresse, l.eleves]), [['5 avenue Pierre Sola, 06100 Nice', 2]]);
  assert.match(read('apps-script/EUC_DEV583_CarteSuivi.js'), /EUC_DEV583_VERSION_ = '1\.0\.0-dev\.705'/, 'cache de la carte renouvelé');
});

test('géocodage du lieu : même moteur et même table (BAN France, Nominatim Monaco), sans SIRET ; personnels seulement', () => {
  const urls = [], ecrits = [];
  let lignes = [geo(1, { SIRET: '12345678901234', Latitude: 45.74, Longitude: 4.96 })];
  const k = ctx({
    UrlFetchApp: {
      fetchAll: reqs => reqs.map(r => { urls.push(r.url); return { getContentText: () => JSON.stringify({ features: [{ geometry: { coordinates: [7.27, 43.715] }, properties: { score: 0.9, label: '5 Avenue Pierre Sola 06100 Nice', postcode: '06100', city: 'Nice', type: 'housenumber', housenumber: '5', street: 'Avenue Pierre Sola', name: '5 Avenue Pierre Sola' } }] }) }; }),
      fetch: u => { urls.push(u); return { getResponseCode: () => 200, getContentText: () => JSON.stringify([{ lat: '43.735', lon: '7.42', display_name: '1 boulevard Albert Ier, Monaco', type: 'house', address: { country_code: 'mc', postcode: '98000', city: 'Monaco' } }]) }; } },
    EUC_ENT_grist: () => ({}), EUC_DEV441_ensureGeoTable_: () => {},
    EUC_DEV441_geoRows_: () => lignes
  });
  k.EUC_DEV441_geoRows_ = () => lignes; k.EUC_DEV540_geoCandidate_ = f => f.length ? { feature: f[0], specific: true } : null;
  k.EUC_DEV445_geoBatchUpsert_ = items => { items.forEach(x => { ecrits.push(x); lignes = lignes.concat([geo(10 + ecrits.length, Object.assign({ SIRET: x.item.siret, Entreprise: x.item.entreprise, Adresse_source: x.item.adresse }, x.fields))]); }); return { saved: items, errors: [] }; };
  const pts = [{ entreprise: 'TECHNIDRILL', latitude: 45.74, longitude: 4.96, _lieux: { '5 avenue Pierre Sola, 06100 Nice': 1, '1 boulevard Albert Ier, 98000 Monaco': 1 } }];
  const sansDroit = J(k.EUC_DEV705_placer_(JSON.parse(JSON.stringify(pts)), null, false));
  assert.equal(urls.length, 0, 'familles et public : aucun appel ni écriture'); assert.equal(sansDroit.sansPosition.length, 2);
  const r = J(k.EUC_DEV705_placer_(pts, null, true));
  assert.ok(urls.some(u => /geopf|geocodage/.test(u)) && urls.some(u => /nominatim/.test(u) && /countrycodes=mc/.test(u)), 'BAN et Nominatim');
  assert.ok(ecrits.every(x => x.item.siret === '' && x.item.entreprise === 'TECHNIDRILL'), 'ligne du lieu : nom + adresse du lieu, sans SIRET');
  assert.equal(r.geocodes, 2); assert.equal(r.lieux, 2);
  assert.deepEqual(pts[0].lieux.map(l => l.adresse).sort(), ['1 boulevard Albert Ier, 98000 Monaco', '5 avenue Pierre Sola, 06100 Nice']);
  assert.equal(ecrits.find(x => /Monaco/.test(x.item.adresse)).fields.Fournisseur, 'OpenStreetMap / Nominatim');
  assert.match(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), /fields=EUC_DEV537_champsMonaco_\(json,x\.codePostal\);/, 'page Géocodage : même construction des champs Monaco');
});

test('service : book (personnels, élèves), ancienne carte et entreprise seule reçoivent les lieux ; erreur non bloquante', () => {
  const book = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.match(book, /lx=EUC_DEV705_enrichir_\(points,EUC_DEV538_yearsForScope_\(parent\?\{annee:'ALL',fenetre:3\}:safe\),!parent\)/);
  assert.match(book, /EUC_DEV705_enrichir_\(base\.points\|\|\[\],parent\?years:EUC_DEV538_yearsForScope_\(q\),allowed\)/);
  assert.match(book, /dev576Cle='EUC_DEV705_CARTE_'/, 'cache de l’ancienne carte renouvelé');
  assert.match(book, /catch\(e705\)\{lx=\{lieux:0,sansPosition:\[\],erreur:'Lieux de stage indisponibles\.'\}/);
  const k = ctx({ EUC_DEV538_admin_: () => {}, EUC_DEV538_staffAllowed_: () => false, EUC_DEV538_norm_: v => String(v || '').toUpperCase(), EUC_DEV538_yearsForScope_: () => ['2026-2027'],
    EUC_DEV549_publicBookIndex_: () => [{ entreprise: 'TECHNIDRILL' }], EUC_DEV441_geoRows_: () => [geo(2, { Entreprise: 'TECHNIDRILL', Adresse_source: '5 avenue Pierre Sola, 06100 Nice', Latitude: 43.715, Longitude: 7.27 })],
    EUC_DEV688_parcourir_: (a, fn) => fn(conv({ Annee_scolaire: '2026-2027', Lieu_stage_adresse: '5 avenue Pierre Sola', Lieu_stage_code_postal: '06100', Lieu_stage_commune: 'Nice' }), { id: 1 }, {}, { eleveId: 1, classe: 'TMVA1' }),
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire || '' });
  k.EUC_DEV441_geoRows_ = () => [geo(2, { Entreprise: 'TECHNIDRILL', Adresse_source: '5 avenue Pierre Sola, 06100 Nice', Latitude: 43.715, Longitude: 7.27 })];
  const r = J(k.EUC_DEV705_lieuxEntreprise({ mode: 'STUDENT', entreprise: 'TECHNIDRILL', siret: '12345678901234', latitude: 45.74, longitude: 4.96 }));
  assert.equal(r.lieux.length, 1); assert.equal(r.lieux[0].adresse, '5 avenue Pierre Sola, 06100 Nice');
  assert.ok(!/eleve"|libelle|Donnee/.test(JSON.stringify(r)), 'aucune donnée d’élève');
  assert.throws(() => k.EUC_DEV705_lieuxEntreprise({ mode: 'STUDENT', entreprise: 'INCONNUE' }), /absente du book public/);
  k.EUC_DEV688_parcourir_ = () => { throw new Error('Grist indisponible'); };
  k.EUC_SUIVI2_temoin_ = () => 'T2';
  const p = [{ entreprise: 'TECHNIDRILL', latitude: 45.74, longitude: 4.96 }];
  assert.equal(k.EUC_DEV705_enrichir_(p, [], true).erreur, 'Lieux de stage indisponibles.', 'erreur : la carte des sièges reste affichée');
});

/* Simulation du script partagé dans une fausse carte Leaflet. */
function leaflet() {
  const ajouts = [];
  const couche = { addTo(l) { l.push(this); return this; }, bindTooltip(t) { this.tooltip = t; return this; }, bindPopup(p) { this.popup = p; return this; } };
  const L = {
    polyline: (ll, o) => Object.assign(Object.create(couche), { type: 'trait', ll, o }),
    circleMarker: (ll, o) => Object.assign(Object.create(couche), { type: 'lieu', ll, o }),
    control: () => { const el = { attrs: {}, setAttribute(a, b) { this.attrs[a] = b; }, innerHTML: '' }; return { onAdd: null, addTo(m) { this.el = this.onAdd(m); ajouts.push(this.el); return this; }, getContainer() { return this.el; } }; },
    DomUtil: { create: () => ({ attrs: {}, setAttribute(a, b) { this.attrs[a] = b; }, innerHTML: '' }) }, DomEvent: { disableClickPropagation() {} }
  };
  return { L, ajouts };
}
test('pages : script partagé inclus, pastille orange reliée au siège, légende, états vide / succès / erreur', () => {
  const part = read('apps-script/Carte_Lieux_DEV705.html'), code = part.match(/<script id="EUC_DEV705_CARTE_LIEUX">([\s\S]*?)<\/script>/)[1];
  const { L, ajouts } = leaflet(), w = { L }; w.window = w;
  vm.createContext(w); vm.runInContext(code, w);
  const E = w.EUC705, layer = [], map = {};
  const x = { entreprise: 'TECHNIDRILL <b>', adresse: 'Chassieu', latitude: 45.74, longitude: 4.96, lieux: [{ adresse: '5 avenue Pierre Sola, 06100 Nice', latitude: 43.715, longitude: 7.27, eleves: 2, km: 296 }] };
  const bornes = E.ajouter(layer, x);
  assert.deepEqual(bornes, [[43.715, 7.27]]);
  const lieu = layer.find(c => c.type === 'lieu'), trait = layer.find(c => c.type === 'trait');
  assert.equal(lieu.o.fillColor, E.couleur); assert.equal(trait.o.dashArray, '6 6'); assert.deepEqual(trait.ll, [[45.74, 4.96], [43.715, 7.27]]);
  assert.match(lieu.tooltip, /Lieu de stage — TECHNIDRILL &lt;b&gt;/, 'libellé échappé reliant le lieu à son entreprise');
  assert.match(lieu.popup, /Siège : Chassieu \(296 km\)/); assert.match(lieu.popup, /2 élèves en stage à cette adresse/); assert.match(lieu.popup, /Itinéraire vers le lieu de stage/);
  assert.match(E.resume(x), /Lieu de stage distinct du siège/); assert.equal(E.resume({ lieux: [] }), '');
  assert.equal(E.ajouter(layer, { latitude: 1, longitude: 1 }).length, 0, 'entreprise sans lieu distinct : rien ajouté');
  E.legende(map, true);
  assert.equal(ajouts.length, 1); assert.match(ajouts[0].innerHTML, /Siège de l’entreprise/); assert.match(ajouts[0].innerHTML, /Lieu de stage distinct du siège/); assert.match(ajouts[0].innerHTML, /relie le lieu de stage à son siège/);
  E.legende(map, false);
  assert.equal(ajouts.length, 1, 'une seule légende par carte'); assert.match(ajouts[0].innerHTML, /Aucun lieu distinct pour ces filtres/);
  assert.equal(E.statut({}), '', 'état vide');
  assert.equal(E.statut({ lieux: 3, lieuxSansPositionTotal: 1 }), ' · 3 lieux de stage distincts du siège (pastilles orange) · 1 lieu de stage pas encore localisé');
  assert.match(E.statut({ lieuxErreur: 'Lieux de stage indisponibles.' }), /indisponibles/, 'état erreur');
  assert.equal(E.compter([x, { lieux: [] }, {}]), 1);
  for (const f of ['Cartographie_PFMP_DEV441', 'Book_Entreprises_DEV538', 'Book_Entreprises_Eleves_DEV546']) {
    const h = read('apps-script/' + f + '.html');
    assert.ok(h.indexOf("<?!= EUC_ENT_inclure('Carte_Lieux_DEV705') ?>") > h.indexOf('leaflet.js'), f + ' : script inclus après Leaflet');
    assert.match(h, /EUC705\.ajouter\(/, f); assert.match(h, /EUC705\.legende\(/, f); assert.match(h, /EUC705\.statut\(/, f); assert.match(h, /EUC705\.resume\(/, f);
  }
  for (const f of ['Book_Entreprises_DEV538', 'Book_Entreprises_Eleves_DEV546']) {
    const h = read('apps-script/' + f + '.html');
    assert.match(h, /lieuxSeul\(c,marker\)/, f + ' : entreprise seule'); assert.match(h, /20000\);google\.script\.run/, f + ' : délai');
    assert.match(h, /withFailureHandler\(e=>\{fin\(' · lieux de stage indisponibles : '/, f + ' : erreur affichée'); assert.match(h, /EUC_DEV705_lieuxEntreprise/, f);
  }
  assert.ok(!/https?:\/\/[^"']*(alternance|eucalyptus|loucodi)/i.test(part), 'aucune adresse publique en dur');
});

console.log(n + ' tests DEV705 réussis');
