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

test('tableau de la classe : élèves, statuts, entreprise, lieu de stage, tuteur, suivi, dépôt mis en évidence', () => {
  const t = ctx.EUC_DEV663_tableau_(VUE, 7, 40, 3, 'PFMP-2026-S0017', '11/11/2026 18:20');
  assert.ok(t && /Classe 1TEST — PFMP n°1/.test(t.html));
  assert.match(t.html, /Du 23\/11\/2026 au 18\/12\/2026/); assert.match(t.html, /tableau au 11\/11\/2026 18:20/); assert.match(t.html, /2 \/ 3 en entreprise/); assert.match(t.html, /Professeur principal : M\. PROF/);
  assert.match(t.html, /NICE FESTIVITES/); assert.match(t.html, /Éditée 10\/11\/2026/); assert.match(t.html, /Non éditée/);
  assert.match(t.html, /Lieu du stage : 29 Avenue Y/); assert.ok(!/Lieu du stage : 33/.test(t.html), 'lieu vide non affiché');
  assert.match(t.html, /Milia CACIT/); assert.match(t.html, /Fany L/, 'sans tuteur : contact de l’entreprise');
  assert.match(t.html, /Visite : M\. VISITEUR/); assert.match(t.html, /Téléphone : Mme TEL/);
  assert.match(t.html, /background:#fff3b0;"><td><b>GAMMA Joan<\/b><br>◀ dépôt reçu/); assert.match(t.html, /Dépôt PFMP-2026-S0017/);
  assert.equal(t.nom, 'Classe 1TEST — PFMP n°1 — 11-11-2026');
  assert.equal(ctx.EUC_DEV663_tableau_(VUE, 7, 99, 3, '', ''), null); assert.equal(ctx.EUC_DEV663_tableau_(VUE, 8, 40, 3, '', ''), null);
  const x = ctx.EUC_DEV663_tableau_({ annee: '', fiches: [], classes: [{ id: 1, nom: '<b>', eleves: [[1, '<script>']], periodes: [{ id: 2, libelle: 'P', lignes: {} }] }] }, 1, 2, 0, '', '');
  assert.ok(!/<script>/.test(x.html) && /&lt;script&gt;/.test(x.html), 'noms échappés');
});

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
  assert.equal(q.pj.length, 0); assert.match(q.texte, /Tableau de la classe indisponible/);
  const ok = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, EUC_SUIVI2_modele_: () => ({}), EUC_SUIVI2_vueEnseignants_: () => VUE,
    Utilities: { formatDate: () => '11/11/2026 18:20', newBlob: (h, t, nom) => ({ getAs: m => ({ mime: m, html: h, setName(x) { this.nom = x; return this; } }) }) } };
  vm.createContext(ok); vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), ok); vm.runInContext(read('apps-script/EUC_DEV663_TableauDepot.js'), ok);
  const w = ok.EUC_DEV663_recapEquipe_(info, 7, 40, 3, 'N1');
  assert.equal(w.pj.length, 1); assert.equal(w.pj[0].mime, 'application/pdf'); assert.equal(w.pj[0].nom, 'Classe 1TEST — PFMP n°1 — 11-11-2026.pdf');
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
console.log(n + ' tests DEV663 réussis.');
