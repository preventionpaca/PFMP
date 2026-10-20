'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const ident = read('apps-script/EUC_DEV602_Identites.js'), partiel = read('apps-script/Identites_Contacts_DEV602.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
function ctx(extra) { const k = Object.assign({ String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console }, extra || {}); vm.createContext(k); vm.runInContext(ident, k); return k; }

test('DEV602 : noms refusés — initiale, chiffres, « chef », civilité dans le nom, prénom = nom, nom qui reprend le prénom ; noms composés acceptés', () => {
  const k = ctx(), v = (p, nm) => { try { k.EUC_DEV602_verifierPersonne_('Tuteur', 'M.', p, nm); return ''; } catch (e) { return e.message; } };
  assert.strictEqual(v('Jean-Pierre', 'Le Gall'), '');
  assert.strictEqual(v('Anne-Sophie', "D'Arcy"), '');
  assert.strictEqual(v('Éloïse', 'Moreira de Oliveira'), '');
  assert.match(v('P', 'Martin'), /Prénom « P » est trop court/);
  assert.match(v('Paul', ''), /Nom manquant/);
  assert.match(v('Paul', 'Chef'), /n’est pas un vrai nom/);
  assert.match(v('Patron', 'Martin'), /n’est pas un vrai prénom/);
  assert.match(v('Paul', 'Martin2'), /caractères non autorisés/);
  assert.match(v('Paul', 'M. Martin'), /civilité dans la liste/);
  assert.match(v('Rais', 'Rais'), /identiques/);
  assert.match(v('Paul', 'Paul Martin'), /reprend le prénom/);
  assert.match(v('?', 'X'), /^Tuteur : /);
  assert.deepStrictEqual(J(k.EUC_DEV602_verifierPersonne_('Tuteur', 'madame', ' Léa ', 'Durand')), { civilite: 'Mme', prenom: 'Léa', nom: 'Durand' });
  assert.strictEqual(k.EUC_DEV602_civilite_('Monsieur'), 'M.'); assert.strictEqual(k.EUC_DEV602_civilite_('Mlle'), 'Mme'); assert.strictEqual(k.EUC_DEV602_civilite_('Dr'), '');
});

test('DEV602 : répertoire — nom incomplet détecté (« Rais », « Mansour », « Chef ») mais pas « Paul Brunetti »', () => {
  const k = ctx();
  for (const x of ['Rais', 'Mansour', 'M. Otto', 'Chef Atelier', '']) assert.strictEqual(k.EUC_DEV602_nomIncomplet_(x), true, x);
  for (const x of ['Paul Brunetti', 'Moreira de Oliveira Morgan', 'M. Otto-Bruc Nicolas']) assert.strictEqual(k.EUC_DEV602_nomIncomplet_(x), false, x);
});

test('DEV602 : import JotForm — nouvelles colonnes (civilité, prénom, nom, fonction, téléphone, courriel) lues sans écraser une valeur existante', () => {
  const k = ctx({ EUC_DEV528_pick_: (o, names) => { const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ''); const by = {}; Object.keys(o || {}).forEach(x => { by[norm(x)] = x; }); for (const nm of names) { const key = by[norm(nm)]; if (key && String(o[key]).trim()) return String(o[key]).trim(); } return ''; }, EUC_DEV528_personName_: v => String(v || '').trim() });
  const raw = { 'Civilité du tuteur': 'Madame', 'Prénom du tuteur': 'Léa', 'Nom du tuteur': 'DURAND', 'Fonction du tuteur': 'Cheffe d’atelier', 'Téléphone du tuteur': '0611223344', 'E-mail du tuteur': 'lea@garage.fr', 'Civilite du responsable': 'M.', 'Prenom du responsable': 'Paul' };
  const j = J(k.EUC_DEV602_jotform_({}, raw));
  assert.deepStrictEqual(j, { Responsable_civilite: 'M.', Responsable_prenom: 'Paul', Tuteur_civilite: 'Mme', Tuteur_prenom: 'Léa', Tuteur_nom: 'DURAND', Tuteur_fonction: 'Cheffe d’atelier', Tuteur_telephone: '0611223344', Tuteur_courriel: 'lea@garage.fr' });
  const dev528 = read('apps-script/EUC_PFMP_DEV528_JotFormContacts.js');
  assert.match(dev528, /EUC_DEV602_jotform_\(row,EUC_DEV528_raw_\(row\)\)/); assert.match(dev528, /if\(!extra\[k\]&&out\[k\]\)delete extra\[k\]/);
});

test('DEV602 : répertoire enrichi — identité confirmée par le tuteur fusionnée ou ajoutée, contacts archivés listés à part', () => {
  const k = ctx();
  const out = [
    { identity: 'S|1', siret: '1', entreprise: 'GRASSE ECHAPPEMENT', adresse: 'Nice', role: 'TUTEUR', contactKey: 'k1', nom: 'Rais', telephones: ['0493'], courriels: [] },
    { identity: 'S|2', siret: '2', entreprise: 'Carrosserie Martin', adresse: 'Nice', role: 'RESPONSABLE', contactKey: 'k2', nom: 'Paul Martin', telephones: [], courriels: [] }
  ];
  const confirmes = [{ entreprise: 'Grasse Échappement', prenom: 'Karim', nom: 'RAIS', fonction: 'Chef d’atelier', telephone: '0611', courriel: 'k@ge.fr', le: '2026-10-19' },
    { entreprise: 'CARROSSERIE MARTIN', prenom: 'Luc', nom: 'Durand', fonction: 'Peintre', telephone: '', courriel: 'luc@cm.fr', le: '2026-10-18' },
    { entreprise: 'Inconnue SARL', prenom: 'Zoé', nom: 'Petit', le: '2026-10-17' }];
  const archives = [{ fields: { Actif: true, Archive: true, Cle_entreprise: 'S|2', Entreprise: 'Carrosserie Martin', Role_contact: 'TUTEUR', Cle_contact_source: 'k9', Nom_source: 'Ancien Tuteur', Archive_le: '2026-10-01T10:00:00Z' } }, { fields: { Actif: true, Cle_entreprise: 'S|2', Nom_corrige: 'Pas archivé' } }];
  const r = J(k.EUC_DEV602_enrichirAnnuaire_(out, archives, confirmes));
  const rais = r.find(x => x.contactKey === 'k1');
  assert.strictEqual(rais.confirme, '2026-10-19'); assert.strictEqual(rais.nomConfirme, 'Karim RAIS'); assert.strictEqual(rais.incomplet, false); assert.deepStrictEqual(rais.telephones, ['0493', '0611']);
  const luc = r.find(x => x.nom === 'Luc Durand');
  assert.strictEqual(luc.confirmeSeul, true); assert.strictEqual(luc.role, 'TUTEUR'); assert.strictEqual(luc.contactKey, ''); assert.strictEqual(luc.identity, 'S|2');
  assert.ok(!r.some(x => /Petit/.test(x.nom)));
  const arch = r.find(x => x.archive); assert.strictEqual(arch.nom, 'Ancien Tuteur'); assert.strictEqual(arch.archiveLe, '2026-10-01'); assert.strictEqual(r.filter(x => x.archive).length, 1);
  assert.strictEqual(r.find(x => x.contactKey === 'k2').incomplet, false);
});

test('DEV602 : archiver puis réactiver un contact — ligne de correction marquée, rien supprimé, mémoire du répertoire mise à jour', () => {
  const rows = [], memo = [];
  const k = ctx({
    EUC_DEV538_admin_: () => ({ email: 'admin@example.org' }), EUC_DEV562_companyKey_: q => q.identity, EUC_DEV562_ensureContactTable_: () => {}, EUC_DEV562_CONTACT_TABLE_: 'T',
    EUC_DEV562_contactRows_: () => rows, EUC_DEV538_fields_: r => r.fields, EUC_DEV538_t_: v => v == null ? '' : String(v).trim(), EUC_DEV562_matchCompany_: (r, q) => r.fields.Cle_entreprise === q.identity,
    EUC_DEV600_annuaireMaj_: (test, maj) => memo.filter(test).forEach(maj),
    EUC_ENT_grist: (m, p, body) => { body.records.forEach(r => { if (m === 'post') rows.push({ id: rows.length + 1, fields: r.fields }); else Object.assign(rows.find(x => x.id === r.id).fields, r.fields); }); return {}; }
  });
  memo.push({ identity: 'S|1', role: 'TUTEUR', contactKey: 'k1' });
  const q = { identity: 'S|1', siret: '1', entreprise: 'GE', role: 'tuteur', contactKey: 'k1', nomSource: 'Rais' };
  const a = k.EUC_DEV602_archiverContact(q);
  assert.strictEqual(a.archive, true); assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].fields.Archive, true); assert.strictEqual(rows[0].fields.Archive_par, 'admin@example.org'); assert.strictEqual(rows[0].fields.Actif, true);
  assert.strictEqual(memo[0].archive, true);
  k.EUC_DEV602_archiverContact(Object.assign({}, q, { archive: false }));
  assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].fields.Archive, false); assert.strictEqual(rows[0].fields.Archive_le, ''); assert.strictEqual(memo[0].archive, false);
  assert.throws(() => k.EUC_DEV602_archiverContact({ identity: 'S|1', role: 'AUTRE', contactKey: 'k1' }), /incomplet/);
});

test('DEV602 : branchements — QR (contrôle, civilité, colonnes), pages QR, books sans contacts archivés, répertoire (badges, archivage, filtre)', () => {
  const qr = read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs');
  assert.match(qr, /EUC_DEV602_verifierPersonne_\('Responsable de l’entreprise',d\.responsableCivilite,respPrenom,respNom\)/);
  assert.match(qr, /EUC_DEV602_verifierPersonne_\('Tuteur',d\.tuteurCivilite,tPrenom,tNom\)/);
  assert.match(qr, /Responsable_civilite:respCivilite/); assert.match(qr, /Tuteur_civilite:tCivilite/);
  assert.match(qr, /EUC_DEV602_assurerCivilites_\(fields\);\n/);
  for (const f of ['PFMP_Acces_QR_V116.html', 'PFMP_Continuation_QR_V117.html']) assert.match(read('apps-script/' + f), /<\?!= HtmlService\.createHtmlOutputFromFile\('Identites_Contacts_DEV602'\)\.getContent\(\) \?>\n<\/body>/, f);
  const liste = s => JSON.parse(/INTERDITS(?:_)? ?= ?(\[[^\]]+\])/.exec(s)[1].replace(/'/g, '"'));
  assert.deepStrictEqual(liste(partiel), liste(ident));
  for (const t of ["sel.name=prefixe+'Civilite'", 'ev.stopImmediatePropagation()', "},true);", 'Demandez au besoin au tuteur']) assert.ok(partiel.includes(t), t);
  const rel = read('apps-script/EUC_PFMP_DEV562_RelationsEntreprises.js');
  assert.match(rel, /return merged\.filter\(function\(c\)\{return !c\.archive;\}\);/);
  assert.match(rel, /\['Archive','Ne fait plus partie de l’entreprise','Bool'\]/);
  assert.match(rel, /out=EUC_DEV602_enrichirAnnuaire_\(out,EUC_DEV562_contactRows_\(\)\);/);
  const book = read('apps-script/Book_Entreprises_DEV538.html');
  for (const t of ['contactDirectoryArchives', 'EUC_DEV602_archiverContact', 'function directoryBadges', 'Nom incomplet', 'Confirmé par le tuteur', '(arch||!x.archive)', 'A quitté l’entreprise']) assert.ok(book.includes(t), t);
});

test('DEV608 : accents des prénoms — dictionnaire Pronote + liste française, correction seulement sans ambiguïté, prénoms composés', () => {
  const k = ctx();
  const d = k.EUC_DEV608_construire_(['Léa', 'Joao', 'João', 'Jose', 'Rene', 'Gökhan', 'Mehmet', 'Inès', 'Ayşe']);
  const A = v => k.EUC_DEV608_accentuer_(v, d);
  assert.strictEqual(A('Stephane'), 'Stéphane'); assert.strictEqual(A('Herve'), 'Hervé'); assert.strictEqual(A('Emile'), 'Émile'); assert.strictEqual(A('Eric'), 'Éric');
  assert.strictEqual(A('Jean-Rene'), 'Jean-Rene'); /* « Rene » existe aussi sans accent dans la base : on ne touche pas */
  assert.strictEqual(A('Jean-Herve'), 'Jean-Hervé'); assert.strictEqual(A('Marie Helene'), 'Marie Hélène');
  assert.strictEqual(A('Jose'), 'Jose'); assert.strictEqual(A('Joao'), 'Joao');
  assert.strictEqual(A('Gokhan'), 'Gökhan'); assert.strictEqual(A('Ayse'), 'Ayşe'); assert.strictEqual(A('Ines'), 'Inès');
  assert.strictEqual(A('Mehmet'), 'Mehmet'); assert.strictEqual(A('Kevin'), 'Kevin'); assert.strictEqual(A('Stéphane'), 'Stéphane');
  assert.strictEqual(A('HERVE'), 'HERVÉ');
  for (const x of ['Emma', 'Eva', 'Elisa', 'Andrea', 'Melissa', 'Matheo', 'Maeva']) assert.strictEqual(A(x), x, x);
  assert.ok(!('mehmet' in J(d)));
  assert.match(read('apps-script/EUC_DEV603_Declaration.js'), /prenom: EUC_DEV608_prenom_\(EUC_DEV603_prenom_\(id\.prenom\)\)/);
  const qr = read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs'); assert.match(qr, /respPrenom=EUC_DEV608_prenom_\(respPrenom\)/); assert.match(qr, /tPrenom=EUC_DEV608_prenom_\(tPrenom\)/);
});

console.log(`\n${n} tests DEV602 identités des contacts réussis.`);
