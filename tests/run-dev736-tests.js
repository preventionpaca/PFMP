/* DEV736 — Tableau de bord de la direction : effectifs (rendu partagé), liens Atrium activés par jeton, accès par code direction. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function ctx() {
  const k = { String, Number, Array, Object, JSON, Date, Error, RegExp, console: { log() {} } }; vm.createContext(k);
  vm.runInContext(read('apps-script/EUC_DEV736_TableauDeBord.js'), k);
  k.EUC_DEV441_codeCanon_ = v => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  k.EUC_DEV441_codeHash_ = (c, s) => crypto.createHash('sha256').update(String(s) + '|' + k.EUC_DEV441_codeCanon_(c)).digest('hex');
  return k;
}
const CODE = 'ABCD-EFGH-JKLM-NPQR';
const ligne = (k, o) => Object.assign({ id: 1, Famille: 'DIRECTION', Actif: true, Professeur_nom: 'Direction fictive', Code_salt: 's1', Code_hash: k.EUC_DEV441_codeHash_(CODE, 's1') }, o || {});
test('code direction : actif reconnu ; révoqué, désactivé, code PP d’une classe, trop court ou faux refusés', () => {
  const k = ctx();
  assert.equal(k.EUC_DEV736_ligneDirection_('abcd efgh jklm npqr', [ligne(k)]).Professeur_nom, 'Direction fictive', 'casse et séparateurs ignorés');
  assert.equal(k.EUC_DEV736_ligneDirection_(CODE, [ligne(k, { Actif: false })]), null);
  assert.equal(k.EUC_DEV736_ligneDirection_(CODE, [ligne(k, { Date_revocation: '2026-11-01' })]), null);
  assert.equal(k.EUC_DEV736_ligneDirection_(CODE, [ligne(k, { Famille: 'BACPRO' })]), null, 'un code PP ne donne pas le tableau de bord');
  assert.equal(k.EUC_DEV736_ligneDirection_('ABCD', [ligne(k)]), null); assert.equal(k.EUC_DEV736_ligneDirection_('ZZZZ-EFGH-JKLM-NPQR', [ligne(k)]), null);
});
test('effectifs : servis à l’administration ou au code direction (même calcul que l’accueil), refusés sinon ; jeton 12 h pour les liens', () => {
  const k = ctx(); let admin = false, appels = [];
  k.EUC_PFMP_contexteAdmin_ = () => admin ? { autorise: true, role: 'DDFPT' } : { autorise: false, role: 'ENSEIGNANT' };
  k.EUC_DEV441_ppRows_ = () => [ligne(k)];
  k.EUC_DEV592_effectifsCalcul_ = (a, o) => { appels.push([a, o.forcer]); return { total: { effectif: 3 }, groupes: [] }; };
  k.EUC_ACCES_creerJeton_ = () => '123.abc';
  assert.throws(() => k.EUC_DEV736_effectifs({ code: 'faux-code-de-seize-car' }), /Code direction inconnu ou révoqué/);
  assert.throws(() => k.EUC_DEV736_effectifs({}), /Code direction/); assert.equal(appels.length, 0, 'aucun calcul sans accès');
  const r = J(k.EUC_DEV736_effectifs({ code: CODE, forcer: true }));
  assert.deepEqual([r.total.effectif, r.nom, r.jeton], [3, 'Direction fictive', '123.abc']); assert.deepEqual(appels[0], ['', true]);
  admin = true; assert.equal(J(k.EUC_DEV736_effectifs({})).nom, '', 'administration sans code');
  const p = read('apps-script/EUC_DEV592_Effectifs.js');
  assert.match(p, /function EUC_DEV592_effectifs\(annee, options\) \{\n  EUC_SUIVI2_exigerAdmin_\(\);\n  return EUC_DEV592_effectifsCalcul_\(annee, options\);/, 'accueil : contrôle admin conservé');
});
test('page : route, rendu partagé, liens Atrium avec jeton, code retenu (option), boutons avec spinner, états vide / erreur', () => {
  const h = read('apps-script/Tableau_De_Bord_DEV736.html');
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'tableau-de-bord':\n      return EUC_DEV736_afficher\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "tableau-de-bord", "scope": "admin", "expected": "Tableau de bord"/);
  assert.match(read('scripts/generate-acces-liste.js'), /'Tableau_De_Bord_DEV736',/, 'fonction de la page ouverte même clé exigée (contrôle propre par code)');
  assert.ok(h.includes("EUC_PFMP_inclure_('Effectifs_Rendu_DEV736')") && h.includes("EUC_PFMP_inclure_('Apprentis_Classes_DEV635_Rendu')") && h.includes("EUC736.rendre(D,$('effTuiles'),$('effClasses'))"));
  ['href="__LIEN_PFMP__"', 'href="__LIEN_PFMP__?page=book-entreprises-public-pfmp"', 'href="__LIEN_APPRENTIS__"', 'href="__LIEN_APPRENTIS__?page=cartographie-apprentis-public-pfmp"'].forEach(x => assert.ok(h.includes(x), x));
  assert.ok(!/https?:\/\/[a-z-]+\.(lycee-les-eucalyptus\.org|loucodi\.fr)/.test(h), 'aucune adresse publique en dur');
  assert.match(h, /u\.searchParams\.set\('jeton',jeton\)/); assert.match(h, /activerLiens\(r\.jeton\)/);
  assert.match(h, /\.EUC_DEV736_effectifs\(\{code:CODE,forcer:forcer\}\)/); assert.match(h, /if\(\/Code direction\/\.test\(m\)\)\{ecrire\(''\);CODE='';demanderCode\(m\);return;\}/);
  assert.match(h, /function occupe\(b,on,lib\)\{[^}]*b\.disabled=!!on;b\.innerHTML=on\?'<span class="spin"/); assert.match(h, /180000/); assert.match(h, /chiffres précédents conservés/);
  assert.match(h, /try\{return localStorage\.getItem\(CLE\)\|\|'';\}catch\(e\)\{return '';\}/);
});
test('rendu partagé : tuiles et liste d’une classe entière (simulation DOM)', () => {
  const inc = read('apps-script/Effectifs_Rendu_DEV736.html'), w = { String, Object, Array, Number }; w.window = w; vm.createContext(w);
  const h635 = read('apps-script/Apprentis_Classes_DEV635_Rendu.html'); vm.runInContext(h635.slice(h635.indexOf('<script>') + 8, h635.lastIndexOf('</script>')), w);
  vm.runInContext(inc.slice(inc.indexOf('<script>') + 8, inc.lastIndexOf('</script>')), w);
  const el = () => ({ innerHTML: '', boutons: [], querySelectorAll() { return this.boutons; } }), T = el(), C = el();
  const D = { total: { classes: 2, effectif: 5, scolaires: 2, apprentis: 3, stagiaires: 0, general: true, apprentisMixite: 1, apprentisClasseEntiere: 2, entreprises: 2 },
    groupes: [{ nom: 'CFAI', totaux: { classes: 1, effectif: 2, scolaires: 0, apprentis: 2, stagiaires: 0, organisme: true, entreprises: 1, entreprisesNonRenseignees: 1, entreprisesEstimees: 2 },
      classes: [{ id: 7, nom: 'CQPM ASC', mode: 'CLASSE_ENTIERE', opco: 'CFAI', organismes: ['GRETA', 'CFAI'], effectif: 2, scolaires: 0, apprentis: 2, stagiaires: 0, entreprises: 1, entreprisesNonRenseignees: 1, liste: [{ nom: 'JEUNE A', statut: 'APPRENTI', entreprise: 'ENTREPRISE X' }, { nom: 'JEUNE B', statut: 'APPRENTI', entreprise: '', organismeFormation: 'AFPI PROVENCE' }] }] }] };
  w.EUC736.rendre(D, T, C);
  assert.match(T.innerHTML, /3 apprenti\(s\) \(1 en mixité, 2 en classe entière\)/); assert.match(T.innerHTML, /≈ 2 entreprise\(s\) : 1 identifiée\(s\) \+ 1 non renseignée\(s\)/);
  assert.equal(C.innerHTML, '', 'aucun groupe choisi : pas de vignettes');
});
console.log(n + ' tests DEV736 réussis.');
