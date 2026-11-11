/* DEV655 — parcours différencié : deux conventions distinctes (dernière PFMP + convention PDIF), page « Fin de Terminale » rétablie. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

const ANNEE = '2026-2027';
const META = { classes: [{ id: 3, nom: 'TMELEC' }], periodes: [
  { id: 20, annee: ANNEE, type: 'PFMP', debut: '2027-03-01', fin: '2027-03-19', classesConcernees: [3] },
  { id: 21, annee: ANNEE, type: 'PDIF', debut: '2027-05-24', fin: '2027-06-04', classesConcernees: [3] }
] };
const ELEVES = [{ id: 11, nom: 'UN', prenom: 'Élève', classe: 'TMELEC' }, { id: 12, nom: 'DEUX', prenom: 'Élève', classe: 'TMELEC' }, { id: 13, nom: 'TROIS', prenom: 'Élève', classe: '1MELEC' }];

const payload = () => ({ meta: META, eleves: ELEVES, groupes: [{ key: 'TMELEC', nom: 'TMELEC', effectif: 2 }, { key: '1MELEC', nom: '1MELEC', effectif: 1 }, { key: 'TCAP', nom: 'TCAP EQB', effectif: 5 }] });
function contexte(acces, pdifRows) {
  const posts = [], patchs = [], lots = {};
  let seq = 0;
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, encodeURIComponent,
    Utilities: { getUuid: () => 'uuid-' + (++seq), computeDigest: () => [1, 2, 3], DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 } },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://exec' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put(k2, v) { lots[k2] = JSON.parse(v); } }) },
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_IMPORT_dateExistanteISO_: v => String(v || '').slice(0, 10),
    EUC_IMPORT_exigerAdminTexte_: () => ({ email: 'ddfpt@test', role: 'DDFPT', autorise: true }),
    EUC_DEV526_generateurPayload_: payload,
    EUC_IMPORT_lireRecords_: t => t === 'EUC_PARCOURS_DIFFERENCIE_PFMP' ? pdifRows : acces,
    EUC_ENT_grist: (m, url, body) => {
      if (/columns$/.test(url) && m === 'get') return { columns: ['Eleve', 'Annee_scolaire', 'Parcours_differencie', 'Mode_fin_terminale', 'Actif', 'Remarque', 'Date_decision', 'Date_modification', 'Auteur'].map(id => ({ id })) };
      if (m === 'post') posts.push({ url, body }); if (m === 'patch') patchs.push({ url, body }); return { records: [{ id: 900 }] };
    }
  };
  vm.createContext(k);
  ['apps-script/EUC_CONVENTION_PFMP_Service.gs', 'apps-script/EUC_CONVENTION_PFMP_GroupesClasses.gs', 'apps-script/EUC_DEV655_FinTerminale.js'].forEach(f => vm.runInContext(read(f), k));
  Object.assign(k, { EUC_DEV526_generateurPayload_: payload, EUC_CONVENTION_assurerTableAcces_() {}, EUC_CONVENTION_debutRafraichissementV511_: () => null, EUC_CONVENTION_token_: () => 'tok' + (++seq), EUC_CONVENTION_hash_: t => 'h' + t });
  return { k, posts, patchs, lots };
}
const conventionsCreees = posts => [].concat(...posts.filter(p => /EUC_ACCES_FORMULAIRES_PFMP/.test(decodeURIComponent(p.url))).map(p => p.body.records)).map(r => r.fields);
const choixEcrits = (posts, patchs) => [].concat(...posts.concat(patchs).filter(p => /EUC_PARCOURS_DIFFERENCIE_PFMP/.test(p.url)).map(p => p.body.records)).map(r => r.fields);

test('dernière PFMP : dates officielles pour tous, convention PDIF à part pour l’élève en entreprise, choix enregistrés', () => {
  const { k, posts, patchs } = contexte([], []);
  const r = k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 20, pdifPeriodeId: 21, parcoursDifferencie: { 11: 'ENTREPRISE', 12: 'LYCEE' } });
  const c = conventionsCreees(posts);
  assert.equal(c.length, 3, 'deux PFMP + une PDIF');
  c.filter(f => f.Periode === 20).forEach(f => { assert.equal(f.Date_debut, '2027-03-01'); assert.equal(f.Date_fin, '2027-03-19', 'plus de prolongation'); assert.ok(!/PDIF/.test(f.Periode_libelle)); });
  const pd = c.filter(f => f.Periode === 21);
  assert.equal(pd.length, 1); assert.equal(pd[0].Eleve, 11); assert.equal(pd[0].Date_debut, '2027-05-24'); assert.equal(pd[0].Date_fin, '2027-06-04'); assert.equal(pd[0].PDIF_mode, 'ENTREPRISE');
  assert.equal(r.pdifEntreprise, 1); assert.equal(r.pdifLycee, 1); assert.equal(r.items.filter(i => i.conventionPdif).length, 1);
  const ch = choixEcrits(posts, patchs);
  assert.deepEqual(ch.map(f => [f.Eleve, f.Mode_fin_terminale]).sort(), [[11, 'POURSUITE_PFMP2_ENTREPRISE'], [12, 'PARCOURS_DIFF_LYCEE']]);
});

test('relance : conventions existantes réimprimées, PDIF ajoutée pour un élève passé en entreprise, alerte pour un élève revenu au lycée', () => {
  const acces = [
    { id: 1, Eleve: 11, Periode: 20, Annee_scolaire: ANNEE, Date_debut: '2027-03-01', Date_fin: '2027-03-19', Date_officielle_debut: '2027-03-01', Statut: 'CONVENTION_GENEREE' },
    { id: 2, Eleve: 12, Periode: 20, Annee_scolaire: ANNEE, Date_debut: '2027-03-01', Date_fin: '2027-03-19', Date_officielle_debut: '2027-03-01', Statut: 'CONVENTION_GENEREE' },
    { id: 3, Eleve: 11, Periode: 21, Annee_scolaire: ANNEE, Date_debut: '2027-05-24', Date_fin: '2027-06-04', Date_officielle_debut: '2027-05-24', Statut: 'CONVENTION_GENEREE' }
  ];
  const { k, posts } = contexte(acces, []);
  const r = k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 20, pdifPeriodeId: 21, parcoursDifferencie: { 11: 'LYCEE', 12: 'ENTREPRISE' } });
  const c = conventionsCreees(posts);
  assert.equal(c.length, 1, 'seule la PDIF de l’élève 12 est créée'); assert.equal(c[0].Eleve, 12); assert.equal(c[0].Periode, 21);
  assert.equal(r.reprises, 2); assert.deepEqual(J(r.pdifAAnnuler), ['UN Élève'], 'rien n’est annulé automatiquement');
});

test('période PDIF choisie directement : convention seulement pour les élèves en entreprise ; choix obligatoire', () => {
  const { k, posts } = contexte([], []);
  const r = k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 21, parcoursDifferencie: { 11: 'LYCEE', 12: 'ENTREPRISE' } });
  const c = conventionsCreees(posts);
  assert.equal(c.length, 1); assert.equal(c[0].Eleve, 12); assert.equal(c[0].Periode, 21); assert.ok(r.periodePdif);
  const x = contexte([], []);
  assert.throws(() => x.k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 21, parcoursDifferencie: { 11: 'LYCEE' } }), /Parcours différencié à préciser pour DEUX/);
});

test('page « Fin de Terminale » : classes de Terminale, élèves et choix, enregistrement sans écriture inutile', () => {
  const rows = [{ id: 5, Eleve: 11, Annee_scolaire: ANNEE, Mode_fin_terminale: 'POURSUITE_PFMP2_ENTREPRISE', Remarque: 'BTS' }, { id: 6, Eleve: 12, Annee_scolaire: ANNEE, Parcours_differencie: true }];
  const { k, posts, patchs } = contexte([], rows);
  assert.deepEqual(J(k.EUC_DEV655_terminales_()).map(c => c.nom), ['TMELEC'], 'ni 1re ni CAP');
  const l = J(k.EUC_DEV285B_loadChoices(ANNEE, 0, 'TMELEC'));
  assert.deepEqual(l.students.map(s => [s.id, s.mode, s.remarque]), [[11, 'POURSUITE_PFMP2_ENTREPRISE', 'BTS'], [12, 'PARCOURS_DIFF_LYCEE', '']]);
  assert.deepEqual(J(k.EUC_DEV655_modesFinTerminale(ANNEE).modes), { 11: 'ENTREPRISE', 12: 'LYCEE' });
  k.EUC_DEV285B_saveChoice({ annee: ANNEE, eleveId: 11, mode: 'POURSUITE_PFMP2_ENTREPRISE', remarque: 'BTS' });
  assert.equal(posts.length + patchs.length, 0, 'choix identique : aucune écriture');
  k.EUC_DEV285B_saveChoice({ annee: ANNEE, eleveId: 11, mode: 'A_DEFINIR', remarque: '' });
  assert.equal(patchs.length, 1); assert.equal(patchs[0].body.records[0].id, 5); assert.equal(patchs[0].body.records[0].fields.Mode_fin_terminale, '');
  assert.throws(() => k.EUC_DEV285B_saveChoice({ annee: ANNEE, eleveId: 11, mode: 'N_IMPORTE' }), /invalide/);
});

test('générateur : périodes PDIF proposées en Terminale, choix pré-remplis, plus de convention prolongée', () => {
  const h = read('apps-script/Convention_PFMP_Generateur.html');
  assert.match(h, /kind==='TERMINALE'&&isPdifPeriod\(p\)/);
  assert.match(h, /\.EUC_DEV655_modesFinTerminale\(an\)/);
  assert.match(h, /modesFT\[e\.id\]==='ENTREPRISE'\?' selected':''/);
  assert.ok(!/convention prolongée/.test(h));
  assert.match(h, /pdifPeriodeId:0,pdifMode:'',scenarioDates/, 'génération individuelle : une convention à la fois');
  const s = read('apps-script/EUC_CONVENTION_PFMP_Service.gs');
  assert.ok(!/EUC_CONVENTION_maxDate_\(p\.fin,pdif\.fin\)/.test(s), 'fin de PFMP jamais repoussée');
  const p = read('apps-script/Parcours_Differencie_PFMP_V190X.html');
  assert.ok(!/Poursuite PFMP2<small>/.test(p)); assert.match(p, /PDIF en entreprise<small>Convention PDIF séparée/);
  assert.match(read('apps-script/EUC_PFMP_DEV190X_CleanModules.js'), /terminalOnly&&!rows\.length&&typeof EUC_DEV655_terminales_==='function'/);
});
test('DEV660 : relance d’une classe : conventions déjà éditées hors du PDF de la classe, lot complet à part', () => {
  const acces = [
    { id: 1, Eleve: 11, Periode: 20, Annee_scolaire: ANNEE, Date_debut: '2027-03-01', Date_fin: '2027-03-19', Date_officielle_debut: '2027-03-01', Statut: 'CONVENTION_GENEREE', Drive_pdf_date: '2026-11-10T08:00:00Z' },
    { id: 2, Eleve: 12, Periode: 20, Annee_scolaire: ANNEE, Date_debut: '2027-03-01', Date_fin: '2027-03-19', Date_officielle_debut: '2027-03-01', Statut: 'CONVENTION_GENEREE' }
  ];
  const { k, lots } = contexte(acces, []);
  const r = J(k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 20 }));
  assert.equal(r.dejaEditees, 1); assert.equal(r.items.find(i => i.eleveId === 11).editeeLe, '2026-11-10'); assert.equal(r.items.find(i => i.eleveId === 12).editeeLe, '');
  assert.deepEqual(lots['EUC_CONV_LOT_' + r.lot].items.map(i => i.eleveId), [12], 'PDF de la classe : seulement la convention pas encore éditée');
  assert.deepEqual(lots['EUC_CONV_LOT_' + r.lot + '-TOUT'].items.map(i => i.eleveId).sort(), [11, 12]);
  assert.match(r.urlImpressionLotTout, /-TOUT$/); assert.ok(r.urlImpressionLot);
  acces[1].Drive_pdf_date = '2026-11-09T10:00:00Z';
  const x = contexte(acces, []), r2 = J(x.k.EUC_CONVENTION_preparerAccesClasseNom({ classeElevesNom: 'TMELEC', anneeConvention: ANNEE, classeConventionId: 3, periodeId: 20 }));
  assert.equal(r2.dejaEditees, 2); assert.equal(r2.urlImpressionLot, '', 'tout est déjà édité : pas de PDF de classe par défaut');
  const m = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isNaN, isFinite }; vm.createContext(m); vm.runInContext(read('apps-script/EUC_SUIVI2_Moteur.js'), m);
  assert.equal(m.EUC_SUIVI2_edition_([{ id: 1, Statut_administratif: 'CONVENTION_GENEREE', Drive_pdf_date: 1794300000 }]), '2026-11-10');
  assert.equal(m.EUC_SUIVI2_edition_([{ id: 1, Statut_administratif: 'CONVENTION_GENEREE' }]), '-', 'convention sans PDF édité');
  assert.equal(m.EUC_SUIVI2_edition_([{ id: 1, Statut_administratif: 'ANNULEE_AVANT_DEMARRAGE', Drive_pdf_date: 1794300000 }]), '', 'convention annulée ignorée');
  assert.equal(m.EUC_SUIVI2_edition_([]), '');
  assert.match(read('apps-script/EUC_SUIVI2_Enseignants.js'), /\(r\.editions \|\| \{\}\)\[e\.id\]/);
  const se = read('apps-script/Suivi_Enseignants_DEV576.html'); assert.match(se, /🖨 Éditée le/); assert.match(se, /Non éditée/); assert.match(se, /\['Conventions éditées',oui\.length/); assert.match(se, /\['Conventions non éditées',non\.length,non\]/);
  assert.match(se, /id="versAdmin"[^>]*color:#0b4f40;background:#fff/, 'lien de retour lisible sur le bandeau clair');
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.661'/, 'modèle du suivi recalculé (cache par version)');
  const ad = read('apps-script/Admin_Conventions_PFMP.html'); assert.match(ad, /id="edition"/); assert.match(ad, /déjà été éditée le/);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs'), /editeeLe:EUC_IMPORT_dateExistanteISO_\(a\.Drive_pdf_date\)/);
  const g = read('apps-script/Convention_PFMP_Generateur.html'); assert.match(g, /id="batchPrintTout"/); assert.match(g, /pas encore éditée/);
  /* Réimpression d'une convention perdue : PDF Drive (rang dans le PDF de classe) et impression de la seule convention. */
  assert.deepEqual(J(m.EUC_SUIVI2_pdf_([{ id: 4, Statut_administratif: 'CONVENTION_GENEREE', Drive_pdf_date: 1794300000, Drive_pdf_url: 'https://drive/f', Drive_pdf_rang: '3/24' }, { id: 9, Statut_administratif: 'ANNULEE_AVANT_DEMARRAGE', Drive_pdf_date: 1794400000 }])), [4, 'https://drive/f', '3/24']);
  assert.deepEqual(J(m.EUC_SUIVI2_pdf_([{ id: 5, Statut_administratif: 'CONVENTION_GENEREE' }])), [5, '', ''], 'convention jamais éditée : impression possible');
  assert.equal(m.EUC_SUIVI2_pdf_([]), null);
  const pdf = read('apps-script/EUC_CONVENTION_PFMP_PdfV95.gs');
  assert.match(pdf, /Drive_pdf_rang:ids\.length>1\?\(i\+1\)\+'\/'\+ids\.length:''/); assert.match(pdf, /function EUC_PDF_dossierDriveV660\(\)\{EUC_PDF_exigerAdmin_\(\)/);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_Service.gs'), /c\('Drive_pdf_rang','Rang dans le PDF archivé'\)/);
  const ens = read('apps-script/EUC_SUIVI2_Enseignants.js');
  assert.match(ens, /if \(!admin\) \(vue\.classes \|\| \[\]\)\.forEach[\s\S]*p\.lignes\[k\]\[6\] = 0/, 'liens Drive retirés pour les enseignants');
  assert.ok(ens.indexOf('if (!admin) (vue.classes') < ens.lastIndexOf('t.donnees = JSON.stringify(vue)'), 'données écrites après le retrait');
  assert.match(se, /CFG\.admin&&l\[6\]&&l\[6\]\[0\]/); assert.match(se, /page=convention-pfmp-print&rid=/); assert.match(se, /a\.reimp\[data-date\]/);
  assert.match(g, /id="dossierDrive"[^>]*hidden/); assert.match(g, /\.EUC_PDF_dossierDriveV660\(\)/);
});
console.log(n + ' tests DEV655 réussis.');
