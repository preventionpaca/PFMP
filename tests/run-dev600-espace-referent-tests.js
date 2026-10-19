'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_DEV597_Echeancier.js', 'EUC_DEV598_BilanVisite.js', 'EUC_DEV599_Livret.js', 'EUC_DEV600_EspaceReferent.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
const deq = (a, b) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), b);
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const octets = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));

function contexte(tables) {
  const props = { EUC_DEV598_SECRET: 'secret-de-test' }, mails = [], cache = {};
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, encodeURIComponent,
    Utilities: { computeHmacSha256Signature: (t, s) => octets(crypto.createHmac('sha256', s).update(t, 'utf8').digest()), computeDigest: (a, t) => octets(crypto.createHash('sha256').update(t, 'utf8').digest()), DigestAlgorithm: {}, Charset: {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: x => props[x] || null, setProperty: (x, v) => { props[x] = v; } }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ID/exec' }) },
    CacheService: { getScriptCache: () => ({ get: x => x === 'EUC_DEV597_TABLES2' ? '1' : cache[x] || null, put: (x, v) => { cache[x] = v; } }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mails.push(m) },
    EUC_ENT_grist(method, p) { const m = /^\/tables\/([^/?]+)\/records/.exec(p); return m && method === 'get' ? { records: tables[m[1]] || [] } : {}; }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-20';
  k.EUC_SUIVI2_exigerAdmin_ = () => ({ email: 'admin@example.org' });
  k.EUC_SUIVI2_modele_ = () => ({ annee: '2026-2027', classes: [{ nom: '1CAPP', eleves: [{ id: 7, libelle: 'DUPONT Léa' }, { id: 8, libelle: 'MARTIN Tom' }] }, { nom: 'MELEC G', eleves: [{ id: 9, libelle: 'RIVA Noé' }] }] });
  Object.assign(k, { __props: props, __mails: mails });
  return k;
}
const R = (id, fields) => ({ id, fields });
function tables() {
  return {
    EUC_APPRENTISSAGE_PFMP: [R(12, { Eleve: 7, Nom_entreprise: 'Carrosserie Martin', Date_debut: '2026-09-15', Tuteur_nom: 'MARTIN' }), R(13, { Eleve: 8, Nom_entreprise: 'Garage Sud', Date_debut: '2026-10-01' }), R(14, { Eleve: 9, Nom_entreprise: 'Elec Pro', Date_debut: '2026-09-01' })],
    EUC_REFERENTS_APPRENTIS_PFMP: [R(1, { Eleve: 7, Annee_scolaire: '2026-2027', Professeur: 5, Professeur_nom: 'M. Prof', Actif: true }), R(2, { Eleve: 8, Annee_scolaire: '2026-2027', Professeur: 6, Professeur_nom: 'Mme Autre', Actif: true }), R(3, { Eleve: 9, Annee_scolaire: '2026-2027', Professeur: 5, Professeur_nom: 'M. Prof', Actif: true })],
    EUC_PROFESSEURS_PFMP: [R(5, { Prenom: 'Jean', Nom: 'Prof', Email: 'Jean.Prof@ac-nice.fr' }), R(6, { Prenom: 'Ana', Nom: 'Autre', Email: 'ana@ac-nice.fr', Actif: false })],
    EUC_CONTACTS_ENTREE_APPRENTIS: [], EUC_BILANS_VISITE_APPRENTIS: [],
    EUC_LIVRET_APPRENTIS: [R(1, { Eleve: 7, Statut: 'VALIDE', Lieu: 'ENTREPRISE' }), R(2, { Eleve: 7, Statut: 'A_VALIDER', Lieu: 'LYCEE', Du: '2026-10-05', Au: '2026-10-09' }), R(3, { Eleve: 7, Statut: 'BROUILLON' })]
  };
}

test('DEV600 : classes masquées — retirées des lignes et des compteurs, listées pour le réglage, réglage réservé à l’administration', () => {
  const k = contexte(tables());
  let d = k.EUC_DEV597_donnees_('');
  assert.strictEqual(d.lignes.length, 3); deq(d.classes.map(c => [c.nom, c.apprentis, c.masquee]), [['1CAPP', 2, false], ['MELEC G', 1, false]]);
  k.EUC_DEV597_reglerClasses({ masquees: ['MELEC G'] });
  d = k.EUC_DEV597_donnees_('');
  deq(d.lignes.map(l => l.classe), ['1CAPP', '1CAPP']);
  assert.strictEqual(d.classes.find(c => c.nom === 'MELEC G').masquee, true);
  assert.strictEqual(Object.values(d.compteurs).filter(Number.isFinite).reduce((a, b) => a + b, 0) - d.compteurs.sansReferent - (d.compteurs.aValider || 0) - (d.compteurs.vigilance || 0) - (d.compteurs.bilansAlerte || 0), 2);
  const prev = k.EUC_DEV597_prevenirReferents({});
  deq(prev.envois.map(e => e.apprentis.join(',')).sort(), ['DUPONT Léa', 'MARTIN Tom']); /* RIVA Noé (MELEC G masquée) n’est pas prévenu */
  assert.match(prev.envois.find(e => e.professeurId === 5).corps, /Votre espace professeur référent .*\n https?:|Votre espace professeur référent[^\n]*\nhttps:\/\/script\.google\.com\/macros\/s\/ID\/exec\?page=espace-referent&m=m5\./);
});

test('DEV600 : espace référent — lien signé, seulement ses apprentis (classes masquées exclues), bilan, livret et fiche lycée à valider', () => {
  const k = contexte(tables());
  k.EUC_DEV597_reglerClasses({ masquees: ['MELEC G'] });
  assert.throws(() => k.EUC_DEV600_espace({ m: 'm5.' + '0'.repeat(32) }), /invalide/);
  assert.throws(() => k.EUC_DEV600_espace({ m: k.EUC_DEV598_jetonProf_(5) }), /invalide/);
  const r = k.EUC_DEV600_espace({ m: k.EUC_DEV600_jeton_(5) });
  assert.strictEqual(r.professeur, 'Jean Prof');
  deq(r.lignes.map(l => l.nom), ['DUPONT Léa']);
  const l = r.lignes[0];
  assert.match(l.lienFiche, /page=bilan-visite-apprenti&t=p12\./);
  deq([l.livret.validees, l.livret.aValider, l.livret.brouillons], [1, 1, 1]);
  assert.match(l.livret.aValiderLycee[0].lien, /page=validation-livret&v=v2\./);
  k.EUC_DEV597_reglerClasses({ masquees: [] });
  deq(k.EUC_DEV600_espace({ m: k.EUC_DEV600_jeton_(5) }).lignes.map(l => l.nom).sort(), ['DUPONT Léa', 'RIVA Noé']);
});

test('DEV600 : lien perdu — envoyé seulement à une adresse connue et active, même réponse sinon, une demande par 10 minutes', () => {
  const k = contexte(tables());
  const r1 = k.EUC_DEV600_demanderLien({ email: 'inconnu@example.org' });
  assert.strictEqual(k.__mails.length, 0);
  const r2 = k.EUC_DEV600_demanderLien({ email: ' jean.prof@AC-NICE.fr ' });
  assert.strictEqual(r1.message, r2.message);
  assert.strictEqual(k.__mails.length, 1); assert.strictEqual(k.__mails[0].to, 'Jean.Prof@ac-nice.fr'); assert.match(k.__mails[0].body, /page=espace-referent&m=m5\./);
  k.EUC_DEV600_demanderLien({ email: 'jean.prof@ac-nice.fr' }); assert.strictEqual(k.__mails.length, 1);
  k.EUC_DEV600_demanderLien({ email: 'ana@ac-nice.fr' }); assert.strictEqual(k.__mails.length, 1);
  assert.throws(() => k.EUC_DEV600_demanderLien({ email: 'pas une adresse' }), /invalide/);
});

test('DEV600 : pages — route et page publique de l’espace, fil d’Ariane de l’échéancier, réglage des classes, bandeaux vert clair, répertoire pleine largeur', () => {
  const routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), gen = read('scripts/generate-acces-liste.js');
  assert.match(routes, /case 'espace-referent':\s*return EUC_DEV600_afficher\(e\);/);
  assert.ok(gen.includes("'Espace_Referent_DEV600'"));
  const esp = read('apps-script/Espace_Referent_DEV600.html');
  for (const t of ['EUC_DEV600_espace', 'EUC_DEV600_demanderLien', 'Recevoir mon lien', 'class="spin"', 'b.disabled=true', 'M=<?= jeton ?>']) assert.ok(esp.includes(t), t);
  const ech = read('apps-script/Echeancier_Apprentis_DEV597.html');
  assert.match(ech, /<nav class="ariane"[^>]*><a href="https:\/\/alternance\.loucodi\.fr\/" target="_top">Accueil PFMP<\/a> › <a href="<\?= adminBase \?>\?page=admin-pfmp" target="_top">Administration PFMP<\/a>/);
  for (const t of ['EUC_DEV597_reglerClasses', 'Classes affichées', 'class="cl"']) assert.ok(ech.includes(t), t);
  for (const f of fs.readdirSync(path.join(root, 'apps-script')).filter(f => f.endsWith('.html'))) {
    const s = read('apps-script/' + f);
    assert.doesNotMatch(s, /gradient\((?:90deg,#064e3b,#0b6b4f|135deg,#075f55,#0d8b78)\);color:#fff/, f);
  }
  assert.match(ech, /header\{background:linear-gradient\(135deg,#eef9f5,#d8f0e6\);color:#0b4f40/);
  const book = read('apps-script/Book_Entreprises_DEV538.html');
  assert.match(book, /#contactDirectory\{inset:0;width:100vw;height:100vh/); assert.match(book, /function directoryHideEmpty\(\)/); assert.match(book, /saveDirectoryContact\(button\)\);directoryHideEmpty\(\)\}/);
});

test('DEV600 : répertoire des entreprises — mémoire 6 h réutilisée, mise à jour directe après correction de nom ou de site, préchauffage', () => {
  const rel = read('apps-script/EUC_PFMP_DEV562_RelationsEntreprises.js'), store = {};
  const k = { String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console };
  vm.createContext(k); vm.runInContext(rel, k);
  let calculs = 0;
  k.EUC_DEV538_admin_ = () => true; k.EUC_DEV538_t_ = v => v == null ? '' : String(v).trim();
  k.EUC_DEV572_lire_ = c => store[c] ? JSON.parse(store[c]) : null; k.EUC_DEV572_ecrire_ = (c, v) => { store[c] = JSON.stringify(v); return true; };
  k.EUC_DEV563_contactDirectoryCalcul_ = () => { calculs++; return { ok: true, contacts: [{ identity: 'SIRET|1', role: 'TUTEUR', contactKey: 'c1', nom: 'Avant', site: '' }] }; };
  k.EUC_DEV563_contactDirectory(); const r2 = k.EUC_DEV563_contactDirectory();
  assert.strictEqual(calculs, 1); assert.strictEqual(r2.depuisMemoire, true);
  k.EUC_DEV600_annuaireMaj_(x => x.contactKey === 'c1', x => { x.nom = 'Après'; });
  assert.strictEqual(k.EUC_DEV563_contactDirectory().contacts[0].nom, 'Après'); assert.strictEqual(calculs, 1);
  assert.strictEqual(k.EUC_DEV600_prechaufferAnnuaire_(), false);
  assert.match(rel, /EUC_DEV600_annuaireMaj_\(function\(x\)\{return x\.identity===EUC_DEV538_t_\(q\.identity\)&&x\.role===role&&x\.contactKey===contactKey;\},function\(x\)\{x\.nom=corrected;/);
  assert.match(rel, /EUC_DEV600_annuaireMaj_\(function\(x\)\{return EUC_DEV562_companyKey_\(x\)===key;\},function\(x\)\{x\.site=site;\}\);return\{ok:true,site:site\}/);
  assert.match(read('apps-script/EUC_DEV578_HistoriquesPrets.js'), /EUC_DEV600_prechaufferAnnuaire_\(\)/);
});

console.log(`\n${n} tests DEV600 espace référent réussis.`);
