/**
 * DEV663 — Copie des dépôts pour l'équipe (bureau des entreprises, administration, professeur principal).
 *
 * À chaque dépôt (page du QR code ou formulaire en ligne), l'élève et ses parents reçoivent leur accusé,
 * et l'équipe reçoit un courriel séparé : même récapitulatif, rédigé pour elle, avec en pièce jointe le
 * tableau à jour de la classe pour la période concernée (PDF construit depuis le modèle du suivi).
 * Le tableau de la classe n'est jamais envoyé à l'élève ni à ses parents.
 */
function EUC_DEV663_t_(v) { return String(v == null ? '' : v).trim(); }
function EUC_DEV663_h_(v) { return EUC_DEV663_t_(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function EUC_DEV663_dfr_(v) { var m = EUC_DEV663_t_(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : EUC_DEV663_t_(v); }
var EUC_DEV663_LIB_ = { AVEC: 'Convention', SANS: 'Sans convention', ANNULEE: 'Annulée', INTERROMPUE: 'Interrompue', APPRENTI: 'Apprenti',
  PDIF_ENTREPRISE: 'En entreprise', PDIF_LYCEE: 'Au lycée', PDIF_A_DEFINIR: 'À définir', CONTRAT: 'Contrat', SANS_CONTRAT: 'Sans contrat', RUPTURE: 'Contrat rompu' };

/* Récapitulatif destiné à l'équipe (calcul pur) : précise que l'élève a reçu son propre courriel. */
function EUC_DEV663_infoEquipe_(info, joint) {
  var x = JSON.parse(JSON.stringify(info || {}));
  x.equipe = true;
  x.intro = 'Copie pour l’équipe (bureau des entreprises, professeur principal). L’élève' + (x.parents ? ' et ses parents ont' : ' a') + ' reçu son propre accusé de dépôt.'
    + (joint ? '\nEn pièce jointe : le tableau à jour de la classe ' + EUC_DEV663_t_(joint.classe) + ' pour la période ' + EUC_DEV663_t_(joint.periode) + '.' : '')
    + (EUC_DEV663_t_(info && info.intro) ? '\n\n' + EUC_DEV663_t_(info.intro) : '');
  return x;
}

/* Tableau HTML d'une classe et d'une période à partir de la vue du suivi (calcul pur). null si introuvable. */
function EUC_DEV663_tableau_(vue, classeId, periodeId, eleveId, numero, maintenant) {
  var H = EUC_DEV663_h_, T = EUC_DEV663_t_;
  var c = ((vue && vue.classes) || []).filter(function(x) { return Number(x.id) === Number(classeId); })[0];
  var p = c && (c.periodes || []).filter(function(x) { return Number(x.id) === Number(periodeId); })[0];
  if (!c || !p) return null;
  var fiches = vue.fiches || [], n = p.n || {}, avec = 0, effectif = 0;
  var rows = (c.eleves || []).map(function(e) {
    var l = (p.lignes || {})[e[0]] || ['SANS', -1, '', '', 0, '', 0], f = l[1] >= 0 ? fiches[l[1]] || {} : {}, st = l[0], moi = Number(e[0]) === Number(eleveId);
    effectif++; if (st === 'AVEC' || st === 'CONTRAT' || st === 'PDIF_ENTREPRISE') avec++;
    var statut = (EUC_DEV663_LIB_[st] || st) + (moi && T(numero) ? '<br><b>Dépôt ' + H(numero) + '</b>' : '');
    if (/^\d{4}-/.test(T(l[5]))) statut += '<br>Éditée ' + H(EUC_DEV663_dfr_(l[5])); else if (l[5] === '-') statut += '<br>Non éditée';
    var adr = H(f.adresse) + (T(f.lieu) ? '<br><b style="color:#92400e">Lieu du stage : ' + H(f.lieu) + '</b>' : '');
    var pers = function(x) { x = x || {}; return [H(x.nom), H(x.tel), H(x.mail)].filter(Boolean).join('<br>'); };
    var suivi = [T(l[3]) ? 'Visite : ' + H(l[3]) : '', T(l[2]) ? 'Téléphone : ' + H(l[2]) : ''].filter(Boolean).join('<br>');
    var fond = moi ? 'background:#fff3b0;' : st === 'SANS' || st === 'SANS_CONTRAT' ? 'background:#fdecec;' : '';
    return '<tr style="' + fond + '"><td><b>' + H(e[1]) + '</b>' + (moi ? '<br>◀ dépôt reçu' : '') + '</td><td>' + statut + '</td><td>' + H(f.entreprise) + '</td><td>' + adr + '</td><td>' + pers(f.tuteur && f.tuteur.nom ? f.tuteur : f.contact) + '</td><td>' + (suivi || '—') + '</td></tr>';
  });
  var titre = 'Classe ' + T(c.nom) + ' — ' + T(p.libelle);
  var quand = maintenant || '';
  var td = 'border:1px solid #9fb3ab;padding:2px 4px;vertical-align:top;';
  var html = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:8pt;color:#16302a}h1{font-size:13pt;margin:0 0 2px}p{margin:0 0 6px}'
    + 'table{border-collapse:collapse;width:100%;table-layout:fixed}th{' + td + 'background:#e6f2ee;text-align:left}td{' + td + 'word-wrap:break-word}</style></head><body>'
    + '<h1>' + H(titre) + '</h1><p>Du ' + H(EUC_DEV663_dfr_(p.debut)) + ' au ' + H(EUC_DEV663_dfr_(p.fin)) + ' · ' + H(vue.annee) + (quand ? ' · tableau au ' + H(quand) : '')
    + ' · ' + avec + ' / ' + effectif + ' en entreprise' + ((c.pp || []).length ? ' · Professeur principal : ' + H(c.pp.join(', ')) : '') + '</p>'
    + '<table><thead><tr><th style="width:15%">Élève</th><th style="width:12%">Statut</th><th style="width:17%">Entreprise</th><th style="width:22%">Adresse</th><th style="width:20%">Tuteur</th><th style="width:14%">Suivi</th></tr></thead><tbody>'
    + rows.join('') + '</tbody></table></body></html>';
  return { html: html, nom: (titre + (quand ? ' — ' + quand.slice(0, 10).replace(/\//g, '-') : '')).replace(/[\\/:*?"<>|]+/g, '-') };
}

/* PDF du tableau à jour (modèle du suivi recalculé si Grist a changé, donc dépôt compris). */
function EUC_DEV663_pdf_(classeId, periodeId, eleveId, numero) {
  var vue = EUC_SUIVI2_vueEnseignants_(EUC_SUIVI2_modele_(''));
  var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var t = EUC_DEV663_tableau_(vue, classeId, periodeId, eleveId, numero, quand);
  if (!t) return null;
  var c = (vue.classes || []).filter(function(x) { return Number(x.id) === Number(classeId); })[0], p = c.periodes.filter(function(x) { return Number(x.id) === Number(periodeId); })[0];
  return { blob: Utilities.newBlob(t.html, 'text/html', t.nom + '.html').getAs('application/pdf').setName(t.nom + '.pdf'), classe: c.nom, periode: p.libelle };
}

/* Courriel de l'équipe : récapitulatif rédigé pour elle + tableau joint. Le dépôt n'échoue jamais à cause du tableau. */
function EUC_DEV663_recapEquipe_(info, classeId, periodeId, eleveId, numero) {
  var joint = null;
  try { joint = EUC_DEV663_pdf_(classeId, periodeId, eleveId, numero); } catch (e) { console.log('DEV663 tableau : ' + (e && e.message || e)); }
  var x = EUC_DEV663_infoEquipe_(info, joint);
  if (!joint) x.intro += '\n(Tableau de la classe indisponible pour ce dépôt : le consulter dans le suivi des PFMP.)';
  var r = EUC_DEV649_recap_(x);
  return { texte: r.texte, html: r.html, pj: joint ? [joint.blob] : [] };
}
