const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const service = fs.readFileSync(path.join(root, 'apps-script', 'EUC_CONVENTION_PFMP_Service.gs'), 'utf8');
const groups = fs.readFileSync(path.join(root, 'apps-script', 'EUC_CONVENTION_PFMP_GroupesClasses.gs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'apps-script', 'Convention_PFMP_Generateur.html'), 'utf8');

let count = 0;
function test(name, fn) {
  try {
    fn();
    count++;
    console.log('✓', name);
  } catch (error) {
    console.error('✗', name, error.message);
    process.exitCode = 1;
  }
}

function context(stats) {
  stats=stats||{classes:0,records:{}};
  const classes = [{id: 32, nom: 'TRMO', libelle: 'TRMO', actif: true}];
  const students = [{id: 7, Nom: 'TEST', Prenom: 'Eleve', Classe: ['L', 32], Actif: true}];
  const periods = [{id: 9, Annee_scolaire:'2026-2027', Classes_concernees:[32], Date_debut:'2026-09-01', Date_fin:'2026-09-18', Type:'PFMP'}];
  const ctx = {
    console,
    EUC_IMPORT_exigerAdminTexte_: () => ({autorise: true}),
    EUC_IMPORT_chargerClassesCamin_: () => {stats.classes++;return classes;},
    EUC_IMPORT_lireRecords_: table => {stats.records[table]=(stats.records[table]||0)+1;return table === 'EUC_ELEVES_PFMP' ? students : (table==='Planning_Periodes'?periods:[]);},
    EUC_IMPORT_dateExistanteISO_: value => String(value || ''),
    EUC_PFMP_hash_: value => value,
    EUC_PFMP_ref_: value => Array.isArray(value) && value[0] === 'L' ? Number(value[1]) : Number(value) || 0
  };
  vm.createContext(ctx);
  vm.runInContext(service, ctx);
  vm.runInContext(groups, ctx);
  return ctx;
}

test('la classe est reconstruite depuis la référence Grist de l’élève', () => {
  const student = context().EUC_CONVENTION_lireElevesAdmin()[0];
  assert.equal(student.classe, 'TRMO');
  assert.equal(student.classeId, 32);
});

test('une promotion est construite même sans Code_classe_importe recopié', () => {
  const result = context().EUC_CONVENTION_lireGroupesClassesElevesAdmin();
  assert.equal(result.length, 1);
  assert.equal(result[0].nom, 'TRMO');
  assert.equal(result[0].classeConventionId, 32);
  assert.equal(result[0].effectif, 1);
});

test('le chargement consolidé ne lit qu’une fois classes élèves et périodes', () => {
  const stats={classes:0,records:{}},result=context(stats).EUC_CONVENTION_chargerGenerateurAdmin();
  assert.equal(stats.classes,1);
  assert.equal(stats.records.EUC_ELEVES_PFMP,1);
  assert.equal(stats.records.Planning_Periodes,1);
  assert.equal(result.meta.classes.length,1);
  assert.equal(result.meta.periodes.length,1);
  assert.equal(result.eleves.length,1);
  assert.equal(result.groupes.length,1);
});

test('le client attend les trois retours sans exiger trois listes non vides', () => {
  assert.match(html, /chargements=\{meta:false,eleves:false,groupes:false\}/);
  assert.match(html, /if\(!chargements\.meta\|\|!chargements\.eleves\|\|!chargements\.groupes\)return/);
  assert.doesNotMatch(html, /if\(!meta\.classes\.length\|\|!eleves\.length\|\|!groupes\.length\)return/);
});

test('un chargement incomplet quitte Chargement et affiche une erreur exploitable', () => {
  assert.match(html, /Aucune classe disponible/);
  assert.match(html, /Aucun élève disponible/);
  assert.match(html, /Aucune promotion disponible/);
  assert.match(html, /Chargement incomplet/);
  assert.match(html, /Chargement impossible/);
  assert.match(html, /EUC_CONVENTION_chargerGenerateurAdmin\(\)/);
  assert.match(html, /20000/);
  assert.match(html, /le serveur n’a pas répondu sous 20 secondes/);
  assert.doesNotMatch(html, /\.EUC_CONVENTION_lireClassesEtPeriodesAdmin\(\)/);
  assert.doesNotMatch(html, /\.EUC_CONVENTION_lireElevesAdmin\(\)/);
  assert.doesNotMatch(html, /\.EUC_CONVENTION_lireGroupesClassesElevesAdmin\(\)/);
});

if (!process.exitCode) console.log(`\n${count} tests DEV488 chargement conventions réussis.`);
