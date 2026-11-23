'use strict';
/* DEV723 — Soumissions à traiter : l'entreprise retenue remplace la saisie de l'élève (jamais responsable ni tuteur) ;
 * adresse de l'entreprise retenue corrigée par le bureau (dépôt et fiche de la base des entreprises). Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function depot(id, extra) {
  return { id, fields: Object.assign({ Submission_ID: 'SECOURS-PFMP-2026-S0099', Eleve_match_id: 7, Eleve_match_libelle: 'Léa TEST', Classe_match_libelle: '1CAR', Periode_numero: 'PFMP n°1',
    Entreprise_saisie: 'Garage du coin', Adresse_entreprise: 'Les baumettes', CP_entreprise: '', Ville_entreprise: 'Villeneuve loubet',
    Nom_responsable: 'Jean RESP', Telephone_entreprise: '06 00 00 00 01', Email_entreprise: 'resp@ex.test', Nom_tuteur: 'Ana TUT', Fonction_tuteur: 'Chef', Telephone_tuteur: '06 00 00 00 02', Email_tuteur: 'tut@ex.test',
    Lieu_stage_adresse: '', Lieu_stage_code_postal: '', Lieu_stage_commune: '', Pays_officiel: 'FR', SIRET_brut: '12345678900011', SIRET_statut: 'A_CONTROLER', Niveau_controle: 'ROUGE', Decision: 'A_CONTROLER',
    Alertes: 'Entreprise non vérifiée' }, extra || {}) };
}
const COLS = ['SIRET_normalise', 'SIRET_source', 'Raison_sociale_officielle', 'Nom_commercial', 'Adresse_officielle', 'Complement_adresse_officielle', 'CP_officiel', 'Ville_officielle',
  'Entreprise_identifiant_type', 'NIS_normalise', 'NIS_brut', 'NIS_statut', 'Valide_par', 'Date_validation'];
function contexte(lignes, fiche) {
  const cols = new Set(Object.keys(depot(0).fields).concat(COLS)), appels = [];
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, __appels: appels,
    EUC_V160_TABLE_: 'EUC_MIGRATION_JOTFORM_PFMP', EUC_IMPORT_exigerAdminTexte_: () => ({ email: 'bureau@ex.test' }), Utilities: { formatDate: () => '23/11/2026 12:00' },
    EUC_ENT_validerSiret: s => /^\d{14}$/.test(s) ? { valide: true } : { valide: false, message: '14 chiffres' },
    EUC_ENT_rechercherSiret: () => ({ source: 'grist', entreprise: { raisonSociale: 'GARAGE OFFICIEL', enseigne: 'GO', adresseComplete: 'AVENUE DES PINS', codePostal: '06270', commune: 'VILLENEUVE-LOUBET', etat: 'Actif' } }),
    EUC_ENT_verifierDoublonGrist: s => fiche && fiche.SIRET === s ? Object.assign({ id: 501 }, fiche) : null,
    EUC_DEV646_table_: () => 'EUC_ENTREPRISES',
    EUC_ENT_grist(method, p, body) {
      appels.push([method, p, body && J(body)]);
      if (/\/columns$/.test(p)) return { columns: [...cols].map(id => ({ id })) };
      if (/EUC_ENTREPRISES/.test(p)) { if (method === 'patch') body.records.forEach(r => Object.assign(fiche, r.fields)); return {}; }
      const m = /\/records(?:\?filter=(.*))?$/.exec(p);
      if (method === 'get') { if (!m[1]) return { records: lignes }; const ids = JSON.parse(decodeURIComponent(m[1])).id; return { records: lignes.filter(r => ids.includes(r.id)) }; }
      if (method === 'patch') body.records.forEach(r => Object.keys(r.fields).forEach(c => { assert.ok(cols.has(c), 'colonne existante : ' + c); lignes.find(x => x.id === r.id).fields[c] = r.fields[c]; }));
      return {};
    } };
  vm.createContext(k);
  ['apps-script/EUC_DEV665_DemandesAide.js', 'apps-script/EUC_DEV672_LienCorrection.js', 'apps-script/EUC_DEV723_EntrepriseRetenue.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  return k;
}
const CONTACTS = ['Nom_responsable', 'Telephone_entreprise', 'Email_entreprise', 'Nom_tuteur', 'Fonction_tuteur', 'Telephone_tuteur', 'Email_tuteur', 'Lieu_stage_adresse', 'Lieu_stage_code_postal', 'Lieu_stage_commune'];
const contacts = f => CONTACTS.map(c => f[c]);

test('SIRET vérifié par le bureau : nom et adresse retenus remplacent la saisie de l’élève ; responsable, tuteur et lieu intacts ; ancienne saisie tracée', () => {
  const l = [depot(10)], avant = contacts(l[0].fields), k = contexte(l);
  const r = k.EUC_DEV665_verifierSiret({ id: 10, siret: '12345678900011' });
  const f = l[0].fields;
  assert.deepEqual([f.Entreprise_saisie, f.Adresse_entreprise, f.CP_entreprise, f.Ville_entreprise], ['GARAGE OFFICIEL', 'AVENUE DES PINS', '06270', 'VILLENEUVE-LOUBET']);
  assert.deepEqual(contacts(f), avant, 'responsable, tuteur, lieu du stage jamais touchés');
  assert.equal(f.Nom_commercial, 'GO');
  assert.match(f.Alertes, /SIRET corrigé par le bureau : 12345678900011 \(23\/11\/2026 12:00\) — Saisie de l’élève remplacée par l’entreprise retenue \(avant : Garage du coin — Les baumettes, Villeneuve loubet\)/);
  assert.equal(r.soumission.saisie.nom, 'GARAGE OFFICIEL');
  assert.equal(k.__appels.filter(a => a[0] === 'patch').length, 1, 'une seule écriture');
});

test('NIS de Monaco enregistré par le bureau : même reprise dans la saisie', () => {
  const l = [depot(11, { Pays_officiel: 'MC' })], k = contexte(l);
  k.EUC_DEV665_ajouterBaseMonaco_ = () => ({ ajoutee: false });
  k.EUC_DEV665_enregistrerMonaco({ id: 11, nis: '7112B19343', nom: 'SAM TEST', adresse: '2 rue du Port', cp: '98000', ville: 'Monaco' });
  assert.deepEqual([l[0].fields.Entreprise_saisie, l[0].fields.Adresse_entreprise, l[0].fields.CP_entreprise, l[0].fields.Ville_entreprise], ['SAM TEST', '2 rue du Port', '98000', 'Monaco']);
  assert.equal(l[0].fields.Nom_responsable, 'Jean RESP');
});

test('bouton « Reprendre » pour un dépôt déjà vérifié : saisie alignée, rien si déjà identique, refus sans entreprise retenue', () => {
  const l = [depot(12, { SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678900011', Raison_sociale_officielle: 'BYCAR', Adresse_officielle: 'AVENUE X', CP_officiel: '06270', Ville_officielle: 'VILLENEUVE' })];
  const k = contexte(l), avant = contacts(l[0].fields);
  const r = J(k.EUC_DEV723_reprendre({ id: 12 }));
  assert.deepEqual(r.soumission.saisie, { nom: 'BYCAR', adresse: 'AVENUE X', cp: '06270', ville: 'VILLENEUVE' });
  assert.deepEqual(contacts(l[0].fields), avant);
  assert.equal(J(k.EUC_DEV723_reprendre({ id: 12 })).inchange, true);
  assert.throws(() => contexte([depot(13)]).EUC_DEV723_reprendre({ id: 13 }), /Aucune entreprise retenue/);
});

test('adresse corrigée : dépôt (officielle et saisie) et fiche de la base du même SIRET ; colonnes existantes seulement ; responsable et tuteur intacts', () => {
  const fiche = { SIRET: '12345678900011', Raison_sociale: 'BYCAR', Numero_voie: 'AVENUE DES BAUMETTES', Adresse_complete: 'AVENUE DES BAUMETTES', Code_postal: '06270', Commune: 'VILLENEUVE-LOUBET', Telephone: '04' };
  const l = [depot(14, { SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678900011', Raison_sociale_officielle: 'BYCAR', Adresse_officielle: 'AVENUE DES BAUMETTES', CP_officiel: '06270', Ville_officielle: 'VILLENEUVE-LOUBET' })];
  const k = contexte(l, fiche), avant = contacts(l[0].fields);
  const r = J(k.EUC_DEV723_corrigerAdresse({ id: 14, adresse: '62 avenue des Baumettes', cp: '06 270', ville: 'VILLENEUVE-LOUBET', base: true }));
  const f = l[0].fields;
  assert.deepEqual([f.Adresse_officielle, f.CP_officiel, f.Ville_officielle], ['62 avenue des Baumettes', '06270', 'VILLENEUVE-LOUBET']);
  assert.deepEqual([f.Entreprise_saisie, f.Adresse_entreprise, f.CP_entreprise], ['BYCAR', '62 avenue des Baumettes', '06270']);
  assert.deepEqual(contacts(f), avant);
  assert.equal(fiche.Numero_voie, '62 avenue des Baumettes'); assert.equal(fiche.Adresse_complete, '62 avenue des Baumettes'); assert.equal(fiche.Telephone, '04');
  const pb = k.__appels.filter(a => a[0] === 'patch' && /EUC_ENTREPRISES/.test(a[1]));
  assert.equal(pb.length, 1); assert.deepEqual(pb[0][2], { records: [{ id: 501, fields: { Numero_voie: '62 avenue des Baumettes', Adresse_complete: '62 avenue des Baumettes' } }] }, 'seules les colonnes qui changent');
  assert.equal(r.base.misAJour, true);
  assert.match(f.Alertes, /Adresse de l’entreprise corrigée par le bureau : AVENUE DES BAUMETTES, 06270 VILLENEUVE-LOUBET → 62 avenue des Baumettes, 06270 VILLENEUVE-LOUBET \(base des entreprises aussi\)/);
});

test('adresse : contrôles ; base non touchée sans demande, sans SIRET vérifié ou sans fiche', () => {
  const ret = { Raison_sociale_officielle: 'BYCAR', Adresse_officielle: 'AV', CP_officiel: '06270', Ville_officielle: 'V' };
  let k = contexte([depot(15, ret)]);
  assert.throws(() => k.EUC_DEV723_corrigerAdresse({ id: 15, adresse: '', cp: '06270', ville: 'V' }), /numéro et la voie/);
  assert.throws(() => k.EUC_DEV723_corrigerAdresse({ id: 15, adresse: '1 av', cp: '6270', ville: 'V' }), /5 chiffres/);
  assert.throws(() => k.EUC_DEV723_corrigerAdresse({ id: 15, adresse: '1 av', cp: '06270', ville: '' }), /ville/);
  const fiche = { SIRET: '12345678900011', Numero_voie: 'AV' };
  k = contexte([depot(16, ret)], fiche);
  let r = J(k.EUC_DEV723_corrigerAdresse({ id: 16, adresse: '1 av', cp: '06270', ville: 'V', base: true }));
  assert.equal(r.base.misAJour, false); assert.match(r.base.message, /SIRET non vérifié/); assert.equal(fiche.Numero_voie, 'AV');
  k = contexte([depot(17, Object.assign({ SIRET_statut: 'VERIFIE', SIRET_normalise: '99999999900011' }, ret))], fiche);
  r = J(k.EUC_DEV723_corrigerAdresse({ id: 17, adresse: '1 av', cp: '06270', ville: 'V', base: true }));
  assert.match(r.base.message, /aucune fiche/);
  k = contexte([depot(18, Object.assign({ SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678900011' }, ret))], fiche);
  r = J(k.EUC_DEV723_corrigerAdresse({ id: 18, adresse: '1 av', cp: '06270', ville: 'V' }));
  assert.equal(r.base.demande, false); assert.equal(fiche.Numero_voie, 'AV', 'case décochée : base intacte');
  assert.throws(() => contexte([depot(19)]).EUC_DEV723_corrigerAdresse({ id: 19, adresse: '1 av', cp: '06270', ville: 'V' }), /Aucune entreprise retenue/);
});

test('page : reprise et correction d’adresse sur la carte, boutons protégés (spinner, délai, retour en succès et en erreur)', () => {
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  assert.match(h, /' — pas encore vérifié'\)\+'<\/span><\/div>'\+retenue\(x\)/);
  assert.match(h, /bouton\('reprendre',x\.id,'Reprendre l’entreprise retenue dans la saisie de l’élève','leger'\)/);
  assert.match(h, /id="rb'\+x\.id\+'" checked> Corriger aussi la fiche de la base des entreprises/);
  assert.match(h, /if\(a==='reprendre'\)\{\s*occupe\(b,true,'Reprise…'\);msg\(id,''\);\s*appel\('EUC_DEV723_reprendre',\{id:id\},60000,function\(r\)\{occupe\(b,false\);[^]*?function\(e\)\{occupe\(b,false\);msg\(id,/);
  assert.match(h, /occupe\(b,true,'Enregistrement…'\);msg\(id,''\);\s*appel\('EUC_DEV723_corrigerAdresse',q,60000,function\(r\)\{occupe\(b,false\);[^]*?function\(e\)\{occupe\(b,false\);msg\(id,/);
});

console.log(n + ' tests DEV723 réussis.');
