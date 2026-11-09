/* DEV652 — « Mes visites » : le professeur visiteur ajuste le lieu de visite et réimprime sa page 2. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function contexte(conventions, lignesDetail) {
  const patchs = [];
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp,
    Utilities: { Charset: { UTF_8: 'utf8' },
      base64EncodeWebSafe: (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: (s) => Array.from(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
      formatDate: () => '2026-11-10 08:30' },
    Session: { getScriptTimeZone: () => 'Europe/Paris' },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/a/macros/ex/s/ID/exec' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => 'OK', put() {} }) },
    EUC_DEV598_sig_: t => crypto.createHmac('sha256', 'secret-test').update(String(t)).digest('hex').slice(0, 32),
    EUC_DEV598_egal_: (a, b) => a === b,
    EUC_CONVENTION_ACCES_TABLE_: 'EUC_ACCES_FORMULAIRES_PFMP',
    EUC_CONVENTION_rowV525_: r => Object.assign({ id: r.id }, r.fields),
    EUC_PFMP_ref_: v => v,
    EUC_ENT_grist: (m, url, body) => { if (m === 'patch') { patchs.push(body); return {}; } return { records: conventions.map(c => ({ id: c.id, fields: c })) }; },
    EUC_DEV649_lieuTexte_: a => [a.Lieu_stage_adresse, [a.Lieu_stage_code_postal, a.Lieu_stage_commune].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    EUC_DEV649_assurerColonnesAcces_() {},
    EUC_DEV374_missionDetail_: () => ({ classe: { nom: '1MELEC' }, periode: { libelle: 'PFMP 2', debutFr: '23/11/2026', finFr: '18/12/2026' }, lignes: lignesDetail }),
    EUC_DEV374_missionEligible_: () => true,
    EUC_DEV368_mapTransport: () => ({}),
    EUC_DEV368_year: v => v || '2026-2027',
    EUC_DEV440_missionLine_: (x, t) => ({ eleveId: x.eleveId, eleve: x.nom, entreprise: x.entreprise, transport: t || 'Véhicule personnel', lieuStage: '', siege: x.adresseEntreprise })
  };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV652_MesVisites.js'), k);
  return { k, patchs };
}
const LIGNES = [
  { eleveId: 11, nom: 'ELEVE Un', entreprise: 'ELEC TEST', adresseEntreprise: '1 rue du Siège, 06000 Nice', professeurVisiteur: 'M. PROF' },
  { eleveId: 12, nom: 'ELEVE Deux', entreprise: 'AUTRE', adresseEntreprise: '2 rue Y, 06000 Nice', professeurVisiteur: 'Mme AUTRE' }
];
const CONV = [{ id: 501, Eleve: 11, Periode: 7, Annee_scolaire: '2026-2027', Statut_administratif: 'ENREGISTREE', Historique_admin_JSON: '[]' },
  { id: 400, Eleve: 11, Periode: 7, Annee_scolaire: '2026-2027', Revoked: true }];

test('lien signé : relu à l’identique, refusé s’il est altéré', () => {
  const { k } = contexte([], []);
  const t = k.EUC_DEV652_jeton_('2026-2027', 'BACPRO', 31, 7, 'M. PROF');
  assert.deepEqual(J(k.EUC_DEV652_lireJeton_(t)), { annee: '2026-2027', famille: 'BACPRO', classeId: 31, periodeId: 7, prof: 'M. PROF' });
  const autre = k.EUC_DEV652_jeton_('2026-2027', 'BACPRO', 31, 7, 'Mme AUTRE');
  assert.throws(() => k.EUC_DEV652_lireJeton_(t.split('.')[0] + '.' + autre.split('.')[1]), /Lien « Mes visites » invalide/);
  assert.throws(() => k.EUC_DEV652_lireJeton_(''), /invalide/);
  assert.match(k.EUC_DEV652_lien_('2026-2027', 'BACPRO', 31, 7, 'M. PROF'), /\/exec\?page=mes-visites-pfmp&t=v[A-Za-z0-9_-]+\.[0-9a-f]{32}$/);
});

test('page du professeur : seulement ses élèves, lieu relu dans la convention active', () => {
  const conv = [Object.assign({}, CONV[0], { Lieu_stage_adresse: 'Chantier Les Pins', Lieu_stage_code_postal: '06200', Lieu_stage_commune: 'Nice', Lieu_stage_modifie_par: 'M. PROF', Lieu_stage_modifie_le: '2026-11-09 18:00' }), CONV[1]];
  const { k } = contexte(conv, LIGNES);
  const g = J(k.EUC_DEV652_ouvrir({ t: k.EUC_DEV652_jeton_('2026-2027', 'BACPRO', 31, 7, 'M. PROF') }));
  assert.equal(g.lignes.length, 1); assert.equal(g.classe, '1MELEC'); assert.equal(g.debut, '23/11/2026');
  const l = g.lignes[0];
  assert.equal(l.lieuStage, 'Chantier Les Pins, 06200 Nice'); assert.equal(l.modifiePar, 'M. PROF'); assert.equal(l.convention, true);
  assert.equal(l.adresse, '⚠ LIEU DU STAGE : Chantier Les Pins, 06200 Nice\n(siège : 1 rue du Siège, 06000 Nice)', 'page 2 : lieu de visite et siège');
  const sans = J(contexte([], LIGNES).k.EUC_DEV652_ouvrir({ t: k.EUC_DEV652_jeton_('2026-2027', 'BACPRO', 31, 7, 'M. PROF') }));
  assert.equal(sans.lignes[0].convention, false); assert.equal(sans.lignes[0].adresse, '1 rue du Siège, 06000 Nice');
});

test('modification : écrit le lieu, le professeur, la date et l’historique ; retour au siège possible', () => {
  const { k, patchs } = contexte(CONV.map(c => Object.assign({}, c)), LIGNES);
  const t = k.EUC_DEV652_jeton_('2026-2027', 'BACPRO', 31, 7, 'M. PROF');
  k.EUC_DEV652_modifierLieu({ t, eleveId: 11, adresse: ' Chantier  Les Pins ', codePostal: '06200', commune: 'Nice' });
  const f = patchs[0].records[0];
  assert.equal(f.id, 501, 'convention active la plus récente');
  assert.equal(f.fields.Lieu_stage_adresse, 'Chantier Les Pins'); assert.equal(f.fields.Lieu_stage_modifie_par, 'M. PROF'); assert.equal(f.fields.Lieu_stage_modifie_le, '2026-11-10 08:30');
  const h = JSON.parse(f.fields.Historique_admin_JSON); assert.equal(h[0].action, 'LIEU_VISITE_PROFESSEUR'); assert.equal(h[0].auteur, 'Professeur visiteur : M. PROF');
  k.EUC_DEV652_modifierLieu({ t, eleveId: 11, effacer: true });
  const e = patchs[1].records[0].fields;
  ['Lieu_stage_adresse', 'Lieu_stage_code_postal', 'Lieu_stage_commune', 'Lieu_stage_modifie_par', 'Lieu_stage_modifie_le'].forEach(c => assert.equal(e[c], '', c + ' vidé'));
  assert.equal(JSON.parse(e.Historique_admin_JSON).pop().action, 'LIEU_VISITE_RETOUR_SIEGE');
  assert.throws(() => k.EUC_DEV652_modifierLieu({ t, eleveId: 12, adresse: 'x', commune: 'y' }), /ne fait pas partie de vos visites/);
  assert.throws(() => k.EUC_DEV652_modifierLieu({ t, eleveId: 11, adresse: '', commune: '' }), /adresse et la commune/);
  assert.throws(() => k.EUC_DEV652_modifierLieu({ t, eleveId: 11, adresse: '1 rue', codePostal: '067700', commune: 'X' }), /5 chiffres/);
  assert.equal(patchs.length, 2, 'aucune écriture refusée');
});

test('ordre de mission : lien « Mes visites » sur la page 2 et dans le courriel, jamais bloquant', () => {
  const s = read('apps-script/EUC_PFMP_DEV370_AdminTools.js');
  assert.match(s, /if\(typeof EUC_DEV652_lienGroupe_==='function'\)g\.lienVisites=EUC_DEV652_lienGroupe_\(q,g\);\n    doc=DocumentApp\.openById\(id\);body=doc\.getBody\(\);EUC_DEV438_appendVisitRecap_\(body,g\);/);
  assert.match(s, /if\(g\.lienVisites\)\{[^]*lien\.setLinkUrl\(g\.lienVisites\)/);
  assert.match(s, /var lienVisites=typeof EUC_DEV652_lienGroupe_==='function'\?EUC_DEV652_lienGroupe_\(q,g\):'';[^]*body\+='\\n\\n'\+phrase\+lienVisites;[^]*htmlBody\+=/);
  const { k } = contexte([], []);
  assert.equal(k.EUC_DEV652_lienGroupe_({}, null), '');
  assert.match(k.EUC_DEV652_lienGroupe_({ annee: '2026-2027' }, { famille: 'BACPRO', classeId: 31, periodeId: 7, professeur: 'M. PROF' }), /page=mes-visites-pfmp&t=v/);
});

test('page « Mes visites », route, suivi', () => {
  const h = read('apps-script/Mes_Visites_DEV652.html');
  ['bPdf'].forEach(b => assert.match(h, new RegExp('id="' + b + '"><span class="spin"></span>')));
  assert.match(h, /class="enregistrer"><span class="spin"><\/span>/); assert.match(h, /class="leger effacer"><span class="spin"><\/span>/);
  assert.match(h, /b\.disabled=on;b\.classList\.toggle\('busy',on\)/); assert.match(h, /DELAI=90000/);
  assert.match(h, /Aucun élève à visiter/); assert.match(h, /Lien incomplet/); assert.match(h, /Chargement de vos visites/);
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'mes-visites-pfmp':\n      return EUC_DEV652_afficher\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "mes-visites-pfmp", "scope": "admin", "expected": "Mes visites"/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /lieuPar: P\(a\.Lieu_stage_modifie_par\) \? 'modifié par '/);
  assert.match(read('apps-script/Suivi_Enseignants_DEV576.html'), /f\.lieuPar\?'<br><span/);
});
console.log(n + ' tests DEV652 réussis.');
