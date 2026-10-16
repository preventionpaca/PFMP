'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const moteur = read('apps-script/EUC_SUIVI2_Moteur.js'), ens = read('apps-script/EUC_SUIVI2_Enseignants.js'),
  page = read('apps-script/Suivi_Enseignants_DEV576.html'), release = read('apps-script/EUC_PFMP_ReleaseChannel.js'),
  verrou = read('apps-script/ZZ_EUC_ACCES_Verrou.js');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }

const c = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(c); vm.runInContext(moteur + '\n' + ens, c);
const R = (id, fields) => ({ id, fields });
function sources() {
  return {
    annees: [R(1, { Code: '2026-2027' })],
    classes: [R(10, { Nom: 'TMVA1' })],
    periodes: [
      R(100, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2026-11-02', Date_fin: '2026-11-27', Type: 'PFMP Tbac' }),
      R(102, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2027-05-03', Date_fin: '2027-05-21', Type: 'P.dif' })
    ],
    eleves: [
      R(1, { Nom: 'ALPHA', Prenom: 'Ana', Classe: 10, Annee_scolaire: 1 }),
      R(2, { Nom: 'BETA', Prenom: 'Bob', Classe: 10, Annee_scolaire: 1 }),
      R(3, { Nom: 'GAMMA', Prenom: 'Gil', Classe: 10, Annee_scolaire: 1 })
    ],
    dossiers: [
      R(500, { Eleve: 1, Periode: 100, Statut_administratif: 'CONVENTION_FINALISEE', Entreprise_siret: '12345678901234', Entreprise_raison_sociale: 'GARAGE <B>', Entreprise_adresse: '1 rue A', Entreprise_code_postal: '06000', Entreprise_commune: 'NICE', Tuteur_nom: 'DUPONT', Tuteur_prenom: 'Luc', Tuteur_telephone: '06 00 00 00 00', Responsable_nom: 'MARTIN', Responsable_courriel: 'm@x.fr' })
    ],
    apprentissage: [R(900, { Eleve: 3, Date_debut: '2026-11-16', Date_fin: '2028-08-31' })],
    pdif: [R(1, { Eleve: 2, Annee_scolaire: '2026-2027', Mode_fin_terminale: 'PARCOURS_DIFF_LYCEE' })],
    affectations: [
      R(1, { Annee_scolaire: '2026-2027', Classe: 10, Periode: 100, Eleve: 1, Type_suivi: 'TELEPHONE', Nom_professeur_snapshot: 'M. TEL' }),
      R(2, { Annee_scolaire: '2026-2027', Classe: 10, Periode: 100, Eleve: 1, Type_suivi: 'VISITE', Nom_professeur_snapshot: 'Mme VISITE' })
    ],
    professeurs: [R(7, { Civilite: 'M.', Prenom: 'Paul', Nom: 'PRINCIPAL' })],
    classesProfs: [R(1, { Classe: 10, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL' })]
  };
}
const M = c.EUC_SUIVI2_calculer_(sources(), '2026-2027', '2026-10-16');
const V = c.EUC_SUIVI2_vueEnseignants_(M);

test('la vue enseignants porte classes, périodes, statuts, entreprises, PP et suivis', () => {
  const k = V.classes[0], p1 = k.periodes[0], pd = k.periodes[1];
  assert.deepEqual([...k.pp], ['M. Paul PRINCIPAL']);
  assert.equal(p1.n.avec, 1); assert.equal(p1.n.scolaires, 3);
  const l1 = p1.lignes[1];
  assert.equal(l1[0], 'AVEC');
  const f = V.fiches[l1[1]];
  assert.equal(f.entreprise, 'GARAGE <B>'); assert.equal(f.adresse, '1 rue A, 06000 NICE');
  assert.equal(f.tuteur.nom, 'Luc DUPONT'); assert.equal(f.contact.nom, 'MARTIN'); assert.equal(f.contact.mail, 'm@x.fr');
  assert.deepEqual([l1[2], l1[3]], ['M. TEL', 'Mme VISITE']);
  assert.deepEqual([...p1.lignes[3][4]], ['2026-11-16', '2028-08-31'], 'devient apprenti pendant la période');
  assert.equal(pd.lignes[3][0], 'APPRENTI', 'apprenti au P.dif');
  assert.equal(pd.lignes[2][0], 'PDIF_LYCEE');
});

test('la vue enseignants ne transmet ni motifs ni garde-fou', () => {
  const t = JSON.stringify(V);
  assert.doesNotMatch(t, /motifs|gardeFou|jotformToutes/);
});

test('la page reçoit les données échappées et son script est valide', () => {
  const m = page.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(m && /<\?!= donnees \?>/.test(m[1]));
  assert.doesNotThrow(() => new Function(m[1].replace('<?!= donnees ?>', JSON.stringify(V))));
  assert.match(ens, /replace\(\/<\/g, '\\\\u003c'\)/, 'aucun « </script> » possible dans les données');
  assert.match(page, /function esc\(/);
});

test('la route est servie avant le routage historique et protégée par la clé des enseignants', () => {
  assert.match(release, /suivi-pfmp-enseignants'\s*\)\s*\?\s*EUC_SUIVI2_pageEnseignants_\(e\)/);
  assert.ok(release.indexOf('EUC_ACCES_controlerRoute_(e)') < release.indexOf('EUC_SUIVI2_pageEnseignants_(e)'));
  assert.match(verrou, /'suivi-pfmp-enseignants': 1/);
  assert.match(ens, /function EUC_SUIVI2_pageEnseignants_\(/, 'non appelable par google.script.run');
});

console.log(`\n${n} tests DEV576 page des enseignants réussis.`);
