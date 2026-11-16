/* DEV678 — Accès professeur principal : envoi du tableau aux professeurs affectés et export PDF, toujours sous contrôle du code. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const ACCES = { id: 5, Annee_scolaire: '2026-2027', Classe_id: 1, Periode_id: 11, Professeur_nom: 'M. PP', Professeur_email: 'pp@ac-nice.fr', Actif: true };
function detail(affectes) {
  return { annee: '2026-2027', classe: { id: 1, nom: '1MELEC2' }, periode: { id: 11, libelle: 'PFMP n°1' }, professeursPrincipaux: [{ email: 'pp@ac-nice.fr' }],
    professeursDisponibles: [{ id: 21, email: 'tel@ac-nice.fr' }, { id: 22, email: 'visite@ac-nice.fr' }, { id: 23, email: 'autre@ac-nice.fr' }],
    lignes: [{ eleveId: 1, nom: 'A<b>', prenom: 'X', professeurTelephoneId: affectes ? 21 : 0, professeurVisiteurId: affectes ? 22 : 0, professeurTelephone: affectes ? 'Mme TEL' : '', professeurVisiteur: affectes ? 'M. VISITE' : '' }], historiqueIncidents: [] };
}
function ctx(opt) {
  opt = opt || {}; const mails = [], cache = {};
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __mails: mails,
    EUC_DEV448_t_: v => String(v == null ? '' : v).trim(), EUC_DEV448_n_: v => Number(v) || 0,
    EUC_DEV448_lookupPp_: c => { if (c !== 'BON-CODE') throw new Error('Code inconnu ou révoqué.'); return ACCES; },
    EUC_SUIVI_CLASSE_detailV162: () => detail(opt.affectes !== false),
    EUC_V157_assurerParametres_: () => true, EUC_V157_paramMap_: () => ({ SUIVI_PFMP_EMAIL_OBJET: { Valeur: 'Suivi PFMP — {{CLASSE}}' }, SUIVI_PFMP_EMAIL_MESSAGE: { Valeur: 'Bonjour,\\n\\nVoici le tableau.' } }),
    EUC_V158_ccMails_: () => ['ddfpt@lycee.test'], EUC_V161F3_historiqueHtml_: () => '',
    MailApp: { getRemainingDailyQuota: () => 50, sendEmail: m => mails.push(m) },
    CacheService: { getScriptCache: () => ({ get: c => cache[c] || null, put: (c, v) => { cache[c] = v; } }) } };
  vm.createContext(k);
  const v157 = read('apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs');
  ['EUC_V157_txt_', 'EUC_V157_rempl_', 'EUC_V157_profMails_', 'EUC_V157_htmlTable_'].forEach(f => { const m = v157.match(new RegExp('function ' + f + '\\([\\s\\S]*?\\n}\\n')); vm.runInContext(m[0], k); });
  const d448 = read('apps-script/EUC_PFMP_DEV448_AffectationsRapides.js').match(/function EUC_DEV448_assertPpScope_[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n}/)[0];
  vm.runInContext(d448, k); vm.runInContext(read('apps-script/EUC_DEV678_PpTableau.js'), k);
  return k;
}
const Q = { code: 'BON-CODE', annee: '2026-2027', classeId: 1, periodeId: 11 };
test('destinataires : professeurs du tableau (téléphone, visite) et professeur principal ; copies institutionnelles ; aucun autre professeur', () => {
  const r = J(ctx().EUC_DEV678_preparerEnvoiPp(Q));
  assert.deepEqual(r.to.sort(), ['pp@ac-nice.fr', 'tel@ac-nice.fr', 'visite@ac-nice.fr']); assert.deepEqual(r.cc, ['ddfpt@lycee.test']); assert.equal(r.objet, 'Suivi PFMP — 1MELEC2');
});
test('code inconnu, autre classe ou autre période : refus, aucun courriel', () => {
  const k = ctx();
  assert.throws(() => k.EUC_DEV678_envoyerTableauPp(Object.assign({}, Q, { code: 'FAUX' })), /Code inconnu/);
  assert.throws(() => k.EUC_DEV678_envoyerTableauPp(Object.assign({}, Q, { classeId: 2 })), /autre classe/);
  assert.throws(() => k.EUC_DEV678_preparerEnvoiPp(Object.assign({}, Q, { periodeId: 12 })), /autre période/);
  assert.equal(k.__mails.length, 0);
});
test('envoi : tableau en direct, échappé, réponse au professeur principal, mention de l’expéditeur ; second envoi immédiat bloqué', () => {
  const k = ctx(), r = J(k.EUC_DEV678_envoyerTableauPp(Q)), m = k.__mails[0];
  assert.equal(r.ok, true); assert.equal(k.__mails.length, 1);
  assert.equal(m.to, 'pp@ac-nice.fr,tel@ac-nice.fr,visite@ac-nice.fr'); assert.equal(m.cc, 'ddfpt@lycee.test'); assert.equal(m.replyTo, 'pp@ac-nice.fr');
  assert.match(m.htmlBody, /Bonjour,<br><br>Voici le tableau\./); assert.match(m.htmlBody, /Envoyé par M\. PP, professeur principal/);
  assert.match(m.htmlBody, /M\. VISITE/); assert.match(m.htmlBody, /A&lt;b&gt;/); assert.doesNotMatch(m.htmlBody, /A<b>/);
  assert.throws(() => k.EUC_DEV678_envoyerTableauPp(Q), /Patientez deux minutes/); assert.equal(k.__mails.length, 1);
});
test('sans professeur affecté, seul le professeur principal est destinataire ; liste vide : aucun envoi', () => {
  const k = ctx({ affectes: false }); const r = J(k.EUC_DEV678_preparerEnvoiPp(Q)); assert.deepEqual(r.to, ['pp@ac-nice.fr']);
  /* le professeur principal reste destinataire comme dans l'envoi administrateur ; le contrôle bloque seulement une liste vide */
  k.EUC_V157_profMails_ = () => []; assert.throws(() => k.EUC_DEV678_envoyerTableauPp(Q), /Aucun professeur destinataire/); assert.equal(k.__mails.length, 0);
});
test('page des professeurs (DEV576) : « Exporter PDF » et « Envoyer le tableau aux professeurs » dans l’accès professeur principal, une fois le code accepté', () => {
  const h = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(h, /<div class="pp-outils" id="ppPartage" hidden><button class="btn" type="button" id="ppPdf">Exporter PDF<\/button> <button class="btn" type="button" id="ppEnvoi">Envoyer le tableau aux professeurs<\/button><\/div>/);
  assert.match(h, /espace\.hidden=false;document\.getElementById\('ppPartage'\)\.hidden=!!CFG\.admin;/, 'visible seulement après déverrouillage, pour le professeur principal');
  assert.match(h, /document\.getElementById\('ppPdf'\)\.onclick=function\(\)\{exporterPdf\(this,c,p\);\};/);
  assert.match(h, /appelPP\(b,'Préparation…','EUC_DEV678_preparerEnvoiPp',q,[^]*?if\(!confirm\('Envoyer le tableau '[^]*?\)\)return;\s*appelPP\(b,'Envoi…','EUC_DEV678_envoyerTableauPp',q,/, 'destinataires confirmés avant l’envoi');
  assert.match(h, /function appelPP\(b,txt,fn,arg,ok,ko\)\{var fini=false,t=setTimeout\([^]*?330000\);occupe\(b,true,txt\);/, 'bouton occupé, indicateur, délai dépassé');
  assert.match(h, /if\(CFG\.admin\)document\.getElementById\('envoiTableau'\)\.onclick/, 'envoi administrateur inchangé');
});
test('affectation par le professeur principal : données de la page mises à jour, le PDF reprend les professeurs juste affectés', () => {
  const h = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(h, /Object\.keys\(sel\)\.forEach\(function\(id\)\{var l=p\.lignes\[id\]\|\|\(p\.lignes\[id\]=\['SANS',-1,'','',0\]\);l\[r\.type==='TELEPHONE'\?2:3\]=r\.professeur\.nom;\}\);/);
  assert.match(h, /c\.pp\.join\('\\n'\),l\[2\]\|\|'',l\[3\]\|\|''\]\);/, 'colonnes du PDF : suivi téléphonique l[2], visiteur l[3]');
});
console.log(n + ' tests DEV678 réussis.');
