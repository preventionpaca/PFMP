/* DEV663 — dépôts : accusé de l'élève et de ses parents séparé du courriel de l'équipe, qui reçoit le tableau à jour de la classe. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

const VUE = {
  annee: '2026-2027',
  fiches: [
    { entreprise: 'NICE FESTIVITES', adresse: '33 RUE BARBERIS, 06300 NICE', lieu: '', tuteur: { nom: 'Milia CACIT', tel: '06 00 00 00 01', mail: 't@ex.test' }, contact: { nom: 'C. P.' }, numero: 'PFMP-2026-S0014' },
    { entreprise: 'EDEIS', adresse: '18 RUE X, 44300 NANTES', lieu: '29 Avenue Y, 06200 Nice', tuteur: { nom: '' }, contact: { nom: 'Fany L', tel: '06 00 00 00 02' }, numero: 'PFMP-2026-S0012' }
  ],
  classes: [{ id: 7, nom: '1TEST', pp: ['M. PROF'], eleves: [[1, 'ALPHA Jules'], [2, 'BETA Milo'], [3, 'GAMMA Joan']],
    periodes: [{ id: 40, libelle: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18', n: {}, lignes: { 1: ['AVEC', 0, '', 'M. VISITEUR', 0, '2026-11-10', 0], 2: ['AVEC', 1, 'Mme TEL', '', 0, '-', 0], 3: ['SANS', -1, '', '', 0, '', 0] } }] }]
};

const ctx = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
vm.createContext(ctx);
vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), ctx);
vm.runInContext(read('apps-script/EUC_DEV663_TableauDepot.js'), ctx);

test('tableau de la classe : colonnes de l’export du suivi, une ligne par élève, dépôt présent même avant validation', () => {
  const d = ctx.EUC_DEV663_donnees_(VUE, 7, 40, 3, { numero: 'PFMP-2026-S0018', aTraiter: true, entreprise: 'TITAN ENGINEERING MONACO', adresse: '2 RUE DU GABIAN, Monaco', contact: { nom: 'RENAULT GUILLAUME', tel: '+377 99 92 60 50', mail: 'c@ex.test' }, tuteur: { nom: 'RENAULT GUILLAUME' } }, '11/11/2026 18:20');
  assert.deepEqual(JSON.parse(JSON.stringify(d.entetes)), ['Élève', 'Convention / statut', 'Entreprise', 'Adresse entreprise', 'Coordonnées entreprise', 'Coordonnées tuteur', 'Professeur principal', 'Suivi téléphonique', 'Professeur visiteur']);
  assert.equal(d.largeurs.reduce((x, y) => x + y, 0) <= 786, true, 'largeur utile A4 paysage');
  assert.equal(d.titre, '1TEST — PFMP n°1'); assert.match(d.sousTitre, /Du 23\/11\/2026 au 18\/12\/2026 · 2026-2027 · Professeur principal : M\. PROF · Tableau au 11\/11\/2026 18:20/);
  assert.equal(d.resume, 'Effectif : 3 · En entreprise : 2 / 3 · Avec convention : 2 · Sans convention : 1 · Conventions éditées : 1 / 2');
  assert.equal(d.lignes.length, 3); d.lignes.forEach(l => assert.equal(l.cellules.length, 9));
  const [a, b, c] = d.lignes.map(l => l.cellules);
  assert.deepEqual(a.slice(0, 3), ['ALPHA Jules', 'Convention enregistrée\nPFMP-2026-S0014\nÉditée le 10/11/2026', 'NICE FESTIVITES']);
  assert.equal(a[5], 'Milia CACIT\n06 00 00 00 01\nt@ex.test'); assert.equal(a[6], 'M. PROF'); assert.equal(a[8], 'M. VISITEUR');
  assert.equal(b[3], '18 RUE X, 44300 NANTES\nLIEU DU STAGE : 29 Avenue Y, 06200 Nice'); assert.equal(b[4], 'Fany L\n06 00 00 00 02'); assert.equal(b[5], ''); assert.equal(b[7], 'Mme TEL'); assert.match(b[1], /Non éditée/);
  assert.equal(c[0], 'GAMMA Joan\n◀ dépôt reçu'); assert.equal(c[1], 'Demande reçue — à valider au bureau G205\nPFMP-2026-S0018'); assert.equal(c[2], 'TITAN ENGINEERING MONACO');
  assert.equal(c[4], 'RENAULT GUILLAUME\n+377 99 92 60 50\nc@ex.test'); assert.equal(d.lignes[2].moi, true); assert.equal(d.lignes[2].sans, false);
  assert.match(ctx.EUC_DEV663_donnees_(VUE, 7, 40, 1, { numero: 'X9' }, '').lignes[0].cellules[1], /\nDépôt X9$/, 'dossier déjà enregistré : numéro du dépôt ajouté');
  assert.equal(ctx.EUC_DEV663_donnees_(VUE, 7, 40, 0, null, '').lignes[2].sans, true);
  assert.equal(d.nom, '1TEST — PFMP n°1 — 11-11-2026');
  assert.equal(ctx.EUC_DEV663_donnees_(VUE, 7, 99, 3, null, ''), null); assert.equal(ctx.EUC_DEV663_donnees_(VUE, 8, 40, 3, null, ''), null);
  const dep = ctx.EUC_DEV663_depot_({ entreprise: { nom: 'TITAN', adresse: '2 rue', telephone: '+377', courriel: 'c@t' }, responsable: { nom: 'RENAULT' }, tuteurEstResponsable: true, g205: { requis: true }, lieu: '1 chantier, Nice' }, 'S18');
  assert.deepEqual(JSON.parse(JSON.stringify(dep)), { numero: 'S18', aTraiter: true, entreprise: 'TITAN', adresse: '2 rue', lieu: '1 chantier, Nice', contact: { nom: 'RENAULT', tel: '+377', mail: 'c@t' }, tuteur: { nom: 'RENAULT', fonction: '', tel: '', mail: '' } });
});

/* Document Google simulé : enregistre la mise en page appliquée. */
function docSimule(journal) {
  const texte = () => { const o = { t: '' }; ['setFontFamily', 'setFontSize', 'setBold', 'setForegroundColor'].forEach(m => o[m] = v => { (journal.texte = journal.texte || []).push([m, v]); return o; }); o.getText = () => o.t; return o; };
  const par = (t) => { const p = { t }; ['setSpacingBefore', 'setSpacingAfter', 'setLineSpacing'].forEach(m => p[m] = () => p); p.setText = x => { p.t = x; return p; }; p.editAsText = () => { const x = texte(); x.t = p.t; return x; }; p.getType = () => 'PARAGRAPH'; p.asParagraph = () => p; return p; };
  const corps = { paras: [par('')], tables: [] };
  ['setPageWidth', 'setPageHeight', 'setMarginTop', 'setMarginBottom', 'setMarginLeft', 'setMarginRight'].forEach(m => corps[m] = v => { journal[m] = v; return corps; });
  corps.getParagraphs = () => corps.paras; corps.appendParagraph = t => { const p = par(t); corps.paras.push(p); return p; };
  corps.appendTable = rows => {
    const cell = t => { const c = { t, fond: '' }; ['setPaddingTop', 'setPaddingBottom', 'setPaddingLeft', 'setPaddingRight', 'setVerticalAlignment'].forEach(m => c[m] = () => c); c.getNumChildren = () => 1; c.getChild = () => par(t); c.editAsText = () => { const x = texte(); x.t = t; return x; }; c.setBackgroundColor = v => { c.fond = v; return c; }; return c; };
    const tab = { rows: rows.map(r => r.map(cell)), largeurs: [] };
    tab.setBorderColor = () => tab; tab.setBorderWidth = () => tab; tab.setColumnWidth = (i, w) => { tab.largeurs[i] = w; return tab; };
    tab.getNumRows = () => tab.rows.length; tab.getRow = i => ({ getNumCells: () => tab.rows[i].length, getCell: k => tab.rows[i][k] });
    journal.table = tab; return tab;
  };
  return {
    DocumentApp: { VerticalAlignment: { TOP: 'TOP' }, ElementType: { PARAGRAPH: 'PARAGRAPH' },
      create: nom => { journal.nom = nom; return { getBody: () => corps, getId: () => 'doc1', addFooter: () => ({ appendParagraph: t => { journal.pied = t; return par(t); } }), saveAndClose: () => { journal.ferme = true; } }; } },
    DriveApp: { getFileById: () => ({ getAs: m => ({ mime: m, setName(x) { this.nom = x; return this; } }), setTrashed: v => { journal.corbeille = v; } }) },
    MimeType: { PDF: 'application/pdf' }
  };
}

test('courriel de l’équipe : rédigé pour elle, tableau joint ; sans tableau, le dépôt n’échoue pas', () => {
  const info = { numero: 'N1', intro: 'Demande reçue.', g205: { requis: true, motif: 'entreprise non vérifiée' }, entreprise: { nom: 'X' } };
  const e = ctx.EUC_DEV663_infoEquipe_(info, { classe: '1TEST', periode: 'PFMP n°1' });
  assert.match(e.intro, /^Copie pour l’équipe[^]*L’élève a reçu son propre accusé[^]*tableau à jour de la classe 1TEST pour la période PFMP n°1[^]*Demande reçue\./);
  assert.match(ctx.EUC_DEV663_infoEquipe_(Object.assign({ parents: true }, info), null).intro, /L’élève et ses parents ont reçu/);
  const r = ctx.EUC_DEV649_recap_(e);
  assert.match(r.html, /À FAIRE PAR L’ÉLÈVE : passer au bureau G205/); assert.match(ctx.EUC_DEV649_recap_(info).html, /À FAIRE : passer au bureau G205/, 'accusé de l’élève inchangé');
  assert.equal(info.equipe, undefined, 'récapitulatif de l’élève non modifié');
  const s = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, EUC_SUIVI2_modele_: () => { throw new Error('Grist indisponible'); } };
  vm.createContext(s); vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), s); vm.runInContext(read('apps-script/EUC_DEV663_TableauDepot.js'), s);
  const q = s.EUC_DEV663_recapEquipe_(info, 7, 40, 3, 'N1');
  assert.equal(q.pj.length, 0); assert.match(q.texte, /Tableau de la classe indisponible/); assert.match(q.texte, /indisponible pour ce dépôt : le consulter dans le suivi des PFMP\. Cause : [^)]+\.\)/, 'DEV670 : cause donnée à l’équipe');
  const journal = {}, sim = docSimule(journal);
  const ok = Object.assign({ console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, EUC_SUIVI2_modele_: () => ({}), EUC_SUIVI2_vueEnseignants_: () => VUE,
    Utilities: { formatDate: () => '11/11/2026 18:20' } }, sim);
  vm.createContext(ok); vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), ok); vm.runInContext(read('apps-script/EUC_DEV663_TableauDepot.js'), ok);
  const w = ok.EUC_DEV663_recapEquipe_(info, 7, 40, 3, 'N1');
  assert.equal(w.pj.length, 1); assert.equal(w.pj[0].mime, 'application/pdf'); assert.equal(w.pj[0].nom, '1TEST — PFMP n°1 — 11-11-2026.pdf');
  assert.ok(journal.setPageWidth > journal.setPageHeight, 'A4 paysage'); assert.equal(journal.ferme, true); assert.equal(journal.corbeille, true, 'document temporaire à la corbeille');
  const tab = journal.table; assert.equal(tab.rows.length, 4); assert.equal(tab.rows[0].length, 9); assert.deepEqual(tab.largeurs, [86, 100, 95, 112, 112, 112, 68, 50, 50]);
  assert.equal(tab.rows[0][0].fond, '#0b6b4f', 'en-tête vert'); assert.equal(tab.rows[3][0].fond, '#fff3b0', 'élève du dépôt surligné'); assert.equal(tab.rows[1][0].fond, '');
  assert.match(journal.pied, /joint au dépôt N1/);
  assert.match(w.html, /tableau à jour de la classe 1TEST pour la période PFMP n°1/);
});

test('page du QR code : deux envois, élève + parents sans tableau, équipe avec le tableau', () => {
  const s = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp,
    EUC_PFMP_ref_: v => v, EUC_DEV649_copieDepots_: () => ['bfe@ex.test'],
    EUC_DEV663_recapEquipe_: (info, c, p, e, num) => ({ texte: 'EQ', html: '<p>EQ</p>', pj: [{ pdf: [c, p, e, num].join('|') }], info }) };
  vm.createContext(s); vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), s);
  vm.runInContext(read('apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs'), s);
  const nDoss = { dossier: { acces: { Classe_convention: 7, Periode: 40, Eleve: 3 }, numero: 'PFMP-2026-000321', classe: '1TEST', eleve: { prenom: 'Joan', nom: 'GAMMA' }, pp: [], ppNoms: [], fiche: {} },
    params: { NOTIF_CORPS: 'Bonjour', NOTIF_SIGNATURE: 'BFE' }, famille: ['eleve@ex.test', 'parent@ex.test'], equipe: ['pp@ex.test', 'bfe@ex.test'], subject: 'Ta convention', body: 'B', htmlBody: '<p>B</p>' };
  const env = s.EUC_NOTIF_envoisSeparesV663_(nDoss);
  assert.equal(env.length, 2);
  assert.equal(env[0].to, 'eleve@ex.test'); assert.equal(env[0].cc, 'parent@ex.test'); assert.equal(env[0].attachments, undefined, 'jamais de tableau pour la famille'); assert.equal(env[0].replyTo, 'pp@ex.test,bfe@ex.test');
  assert.equal(env[1].to, 'pp@ex.test,bfe@ex.test'); assert.equal(env[1].cc, undefined); assert.deepEqual(env[1].attachments, [{ pdf: '7|40|3|PFMP-2026-000321' }]);
  assert.equal(env[1].subject, '[Dépôt] PFMP-2026-000321 — Joan GAMMA (1TEST)'); assert.equal(env[1].body, 'EQ');
  assert.ok(!env[0].to.includes('pp@') && !(env[0].cc || '').includes('bfe@'), 'l’équipe n’est pas dans l’envoi de la famille');
  assert.equal(s.EUC_NOTIF_envoisSeparesV663_(Object.assign({}, nDoss, { famille: [] })).length, 1, 'sans adresse de famille : seulement l’équipe');
  assert.equal(s.EUC_NOTIF_envoisSeparesV663_(Object.assign({}, nDoss, { equipe: [] })).length, 1, 'sans équipe : seulement la famille');
  const src = read('apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs');
  assert.match(src, /var envois=EUC_NOTIF_envoisSeparesV663_\(n\);\s*envois\.forEach\(function\(m\)\{MailApp\.sendEmail\(m\);\}\);/);
  assert.match(src, /equipe=EUC_NOTIF_uniqueV143_\(d\.pp\.concat\(bfe\?\[bfe\]:\[\]\)\.concat\([^]*\.filter\(function\(x\)\{return famille\.indexOf\(x\)<0;\}\)/);
});

test('formulaire en ligne : tableau joint à la copie de l’équipe seulement, calculé seulement s’il y a une copie', () => {
  const d = read('apps-script/EUC_DEV649_LieuStageRecap.js');
  assert.match(d, /var equipe = copie\.length && typeof EUC_DEV663_recapEquipe_ === 'function' \? EUC_DEV663_recapEquipe_\(info, classeId, detail\.periode && detail\.periode\.id, eleve\.id, numero\)/);
  assert.match(d, /if \(copie\.length\) MailApp\.sendEmail\(\{ to: copie\.join\(','\), [^}]*body: equipe\.texte, htmlBody: equipe\.html, attachments: equipe\.pj\.length \? equipe\.pj : undefined \}\)/);
  assert.match(d, /if \(email\) MailApp\.sendEmail\(\{ to: email, replyTo: copie\.join\(','\) \|\| undefined, [^}]*body: r\.texte, htmlBody: r\.html \}\)/, 'accusé de l’élève sans pièce jointe');
});
test('DEV670 : tableau à la demande : classe par nom ou id, période par id, rang ou libellé ; causes explicites', () => {
  const s = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp }; vm.createContext(s); vm.runInContext(read('apps-script/EUC_DEV663_TableauDepot.js'), s);
  const vue = { classes: [{ id: 41, nom: '2BTS MV', periodes: [{ id: 900, libelle: 'Stage n°1' }, { id: 901, libelle: 'Stage n°2' }] }] };
  assert.equal(s.EUC_DEV670_trouver_(vue, '2bts mv', '').periode.id, 900);
  assert.equal(s.EUC_DEV670_trouver_(vue, '41', '2').periode.id, 901); assert.equal(s.EUC_DEV670_trouver_(vue, '41', '900').periode.id, 900);
  assert.equal(s.EUC_DEV670_trouver_(vue, '2BTS MV', 'stage n°2').periode.id, 901);
  assert.match(s.EUC_DEV670_trouver_(vue, '1MELEC', '').erreur, /Classe introuvable/); assert.match(s.EUC_DEV670_trouver_(vue, '41', '7').erreur, /900 = Stage n°1/);
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'tableau-classe-pfmp':\n      return EUC_DEV670_afficher\(e\);/);
});
console.log(n + ' tests DEV663 réussis.');
