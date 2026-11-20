/* DEV687 — Élèves démissionnaires encore dans Pronote : masqués tout de suite, gardés masqués par l'import, archivés quand ils n'y sont plus. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx(eleves, admin) {
  const appels = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __appels: appels };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV687_Demission.js'), k);
  Object.assign(k, { EUC_IMPORT_exigerAdminTexte_: () => { if (admin === false) throw new Error('Accès non autorisé.'); return { email: 'admin@lycee.test' }; },
    EUC_IMPORT_lireRecords_: () => eleves, EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v, EUC_IMPORT_normaliserSourcePronote_: v => String(v).toUpperCase(),
    EUC_ENT_grist: (m, u, b) => { appels.push({ m, u, b }); return m === 'get' ? { columns: [{ id: 'Actif' }] } : {}; } });
  return k;
}
const E = () => [{ id: 7, Nom: 'DUPONT', Prenom: 'Léo', Classe: 10, Code_classe_importe: '1CAR', Actif: true }, { id: 8, Nom: 'MARTIN', Prenom: 'Zoé', Classe: 11, Actif: true }];
test('marquer : administration seulement, élève masqué (Actif faux), date, auteur, motif ; colonnes créées si absentes', () => {
  assert.throws(() => ctx(E(), false).EUC_DEV687_marquer({ eleveId: 7 }), /non autorisé/);
  const k = ctx(E()), r = J(k.EUC_DEV687_marquer({ eleveId: 7, motif: 'Démission le 15/11' }));
  assert.equal(r.eleve, 'DUPONT Léo');
  const col = k.__appels.find(a => a.m === 'post'); assert.deepEqual(col.b.columns.map(c => c.id), ['Demission_app', 'Date_demission_app', 'Demission_par', 'Demission_motif']);
  const f = k.__appels.find(a => a.m === 'patch').b.records[0]; assert.equal(f.id, 7); assert.equal(f.fields.Actif, false); assert.equal(f.fields.Demission_app, true); assert.equal(f.fields.Demission_par, 'admin@lycee.test'); assert.equal(f.fields.Demission_motif, 'Démission le 15/11');
  const el = E(); el[0].Demission_app = true; assert.equal(J(ctx(el).EUC_DEV687_marquer({ eleveId: 7 })).deja, true);
  assert.throws(() => ctx(E()).EUC_DEV687_marquer({ eleveId: 99 }), /introuvable/);
});
test('annuler et liste : rétablissement tant que non archivé ; liste par classe avec état', () => {
  const el = E(); el[0].Demission_app = true; el[0].Actif = false; el[0].Date_demission_app = 1800000000;
  const k = ctx(el); k.EUC_DEV687_annuler({ eleveId: 7 }); const p = k.__appels.find(a => a.m === 'patch').b.records[0].fields; assert.equal(p.Actif, true); assert.equal(p.Demission_app, false);
  assert.throws(() => ctx(E()).EUC_DEV687_annuler({ eleveId: 8 }), /pas marqué/);
  const ar = E(); ar[0].Demission_app = true; ar[0].Statut_scolarite = 'SORTI'; ar[0].Present_dernier_import = false; assert.throws(() => ctx(ar).EUC_DEV687_annuler({ eleveId: 7 }), /déjà été archivé/);
  const l = J(ctx(el).EUC_DEV687_liste({ classeId: 10 })); assert.equal(l.length, 1); assert.equal(l[0].archive, false); assert.equal(l[0].classe, '1CAR'); assert.ok(l[0].date);
  assert.equal(J(ctx(el).EUC_DEV687_liste({ classeId: 11 })).length, 0);
});
test('import Pronote : démissionnaire encore présent reste masqué ; absent du nouvel export archivé (sorti), autres élèves intouchés', () => {
  const k = ctx([]);
  const common = { Actif: true, Nom: 'DUPONT' }; k.EUC_DEV687_garderMasque_({ Demission_app: true }, common); assert.equal(common.Actif, false);
  const c2 = { Actif: true }; k.EUC_DEV687_garderMasque_({}, c2); assert.equal(c2.Actif, true);
  const existants = [
    { id: 1, fields: { Demission_app: true, Annee_scolaire: 5, Source_Pronote: 'lp' } },
    { id: 2, fields: { Demission_app: true, Annee_scolaire: 5, Source_Pronote: 'LP' } },
    { id: 3, fields: { Annee_scolaire: 5, Source_Pronote: 'LP' } },
    { id: 4, fields: { Demission_app: true, Annee_scolaire: 4, Source_Pronote: 'LP' } },
    { id: 5, fields: { Demission_app: true, Annee_scolaire: 5, Source_Pronote: 'LGT' } },
    { id: 6, fields: { Demission_app: true, Annee_scolaire: 5, Source_Pronote: 'LP', Statut_scolarite: 'SORTI', Present_dernier_import: false } } ];
  const a = J(k.EUC_DEV687_archivages_(existants, { 2: true }, 5, 'LP', 'now', 'LOT'));
  assert.deepEqual(a.map(x => x.id), [1], 'présent (2), non démissionnaire (3), autre année (4), autre source (5), déjà archivé (6) exclus');
  assert.deepEqual(a[0].fields, { Actif: false, Statut_scolarite: 'SORTI', Sortie_confirmee: true, Present_dernier_import: false, Date_modification: 'now', Identifiant_lot_import: 'LOT' });
  const imp = read('apps-script/EUC_IMPORT_PFMP_RichData.gs');
  assert.match(imp, /dejaVus\[Number\(old\.id\)\]=true;.*EUC_DEV687_garderMasque_\(f,common\);var diff=EUC_IMPORT_diffObjRich_\(f,common\);/);
  assert.match(imp, /EUC_DEV687_archivages_\(existing,dejaVus,anneeId,source,now,lot\)/); assert.match(imp, /demissionnairesArchives:demArchives\.length/); assert.match(imp, /aucuneSuppression:true/);
});
test('suivi des PFMP (administration) : bouton par élève, liste des démissionnaires avec rétablissement, indicateurs', () => {
  const h = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(h, /\(CFG\.admin\?'<br><button class="btn demission noprint"/); assert.match(h, /id="demissions">Élèves démissionnaires<\/button>/);
  assert.match(h, /appelDem\(b,'Enregistrement…','EUC_DEV687_marquer'/); assert.match(h, /appelDem\(b,'Rétablissement…','EUC_DEV687_annuler'/); assert.match(h, /\.EUC_DEV687_liste\(\{classeId:Number\(c\.id\)\}\)/);
  assert.match(h, /b\.disabled=true;b\.innerHTML='<span class="spin" aria-hidden="true"><\/span>'\+txt/);
});
console.log(n + ' tests DEV687 réussis.');
