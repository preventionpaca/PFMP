/**
 * DEV663 — Copie des dépôts pour l'équipe (bureau des entreprises, administration, professeur principal).
 *
 * À chaque dépôt (page du QR code ou formulaire en ligne), l'élève et ses parents reçoivent leur accusé,
 * et l'équipe reçoit un courriel séparé : même récapitulatif, rédigé pour elle, avec en pièce jointe le
 * tableau à jour de la classe pour la période concernée (PDF construit depuis le modèle du suivi).
 * Le tableau de la classe n'est jamais envoyé à l'élève ni à ses parents.
 */
function EUC_DEV663_t_(v) { return String(v == null ? '' : v).trim(); }
function EUC_DEV663_dfr_(v) { var m = EUC_DEV663_t_(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : EUC_DEV663_t_(v); }
var EUC_DEV663_LIB_ = { AVEC: 'Convention enregistrée', SANS: 'Sans convention', ANNULEE: 'Annulée', INTERROMPUE: 'Interrompue', APPRENTI: 'Apprenti',
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

/* Données du tableau d'une classe et d'une période (calcul pur), mêmes colonnes que l'export PDF du suivi.
 * depot = { numero, aTraiter, entreprise, adresse, lieu, contact:{nom,tel,mail}, tuteur:{…} } : l'élève du dépôt
 * figure toujours dans le tableau, même si sa demande n'est pas encore validée. null si classe ou période introuvable. */
var EUC_DEV663_ENTETES_ = ['Élève', 'Convention / statut', 'Entreprise', 'Adresse entreprise', 'Coordonnées entreprise', 'Coordonnées tuteur', 'Professeur principal', 'Suivi téléphonique', 'Professeur visiteur'];
var EUC_DEV663_LARGEURS_ = [86, 100, 95, 112, 112, 112, 68, 50, 50];
function EUC_DEV663_donnees_(vue, classeId, periodeId, eleveId, depot, maintenant) {
  var T = EUC_DEV663_t_, D = EUC_DEV663_dfr_;
  var c = ((vue && vue.classes) || []).filter(function(x) { return Number(x.id) === Number(classeId); })[0];
  var p = c && (c.periodes || []).filter(function(x) { return Number(x.id) === Number(periodeId); })[0];
  if (!c || !p) return null;
  depot = depot || {};
  var fiches = vue.fiches || [], pp = (c.pp || []).join(', '), compte = { effectif: 0, entreprise: 0, avec: 0, sans: 0, editees: 0, aEditer: 0 };
  var coord = function(x) { x = x || {}; return [T(x.nom), T(x.tel), T(x.mail)].filter(Boolean).join('\n'); };
  var lignes = (c.eleves || []).map(function(e) {
    var l = (p.lignes || {})[e[0]] || ['SANS', -1, '', '', 0, '', 0], f = l[1] >= 0 ? fiches[l[1]] || {} : {}, st = l[0], moi = !!eleveId && Number(e[0]) === Number(eleveId);
    compte.effectif++;
    if (st === 'AVEC' || st === 'CONTRAT' || st === 'PDIF_ENTREPRISE' || st === 'APPRENTI') compte.entreprise++;
    if (st === 'AVEC') compte.avec++; if (st === 'SANS' || st === 'SANS_CONTRAT') compte.sans++;
    if (/^\d{4}-/.test(T(l[5]))) compte.editees++; else if (l[5] === '-') compte.aEditer++;
    var statut = [EUC_DEV663_LIB_[st] || st, f.enregistreLe ? 'Enregistrée le ' + D(f.enregistreLe) : '', T(f.numero),
      /^\d{4}-/.test(T(l[5])) ? 'Éditée le ' + D(l[5]) : l[5] === '-' ? 'Non éditée' : ''].filter(Boolean);
    var ent = T(f.entreprise), adr = [T(f.adresse), T(f.lieu) ? 'LIEU DU STAGE : ' + T(f.lieu) : ''].filter(Boolean).join('\n'), ce = coord(f.contact), ct = coord(f.tuteur && f.tuteur.nom ? f.tuteur : null);
    if (moi && T(depot.numero)) {
      if (!ent) {
        statut = [depot.aTraiter ? 'Demande reçue — à valider au bureau G205' : 'Dépôt reçu — à valider', T(depot.numero)];
        ent = T(depot.entreprise); adr = [T(depot.adresse), T(depot.lieu) ? 'LIEU DU STAGE : ' + T(depot.lieu) : ''].filter(Boolean).join('\n');
        ce = coord(depot.contact); ct = coord(depot.tuteur);
      } else if (statut.indexOf(T(depot.numero)) < 0) statut.push('Dépôt ' + T(depot.numero));
    }
    return { moi: moi, sans: !ent && (st === 'SANS' || st === 'SANS_CONTRAT'), cellules: [T(e[1]) + (moi ? '\n◀ dépôt reçu' : ''), statut.join('\n'), ent, adr, ce, ct, pp, T(l[2]), T(l[3])] };
  });
  var titre = T(c.nom) + ' — ' + T(p.libelle), quand = T(maintenant);
  return {
    titre: titre,
    sousTitre: 'Du ' + D(p.debut) + ' au ' + D(p.fin) + ' · ' + T(vue.annee) + (pp ? ' · Professeur principal : ' + pp : '') + (quand ? ' · Tableau au ' + quand : ''),
    resume: 'Effectif : ' + compte.effectif + ' · En entreprise : ' + compte.entreprise + ' / ' + compte.effectif + ' · Avec convention : ' + compte.avec + ' · Sans convention : ' + compte.sans
      + ' · Conventions éditées : ' + compte.editees + ' / ' + (compte.editees + compte.aEditer),
    pied: titre + (quand ? ' · tableau au ' + quand : '') + (T(depot.numero) ? ' · joint au dépôt ' + T(depot.numero) : ''),
    entetes: EUC_DEV663_ENTETES_.slice(), largeurs: EUC_DEV663_LARGEURS_.slice(), lignes: lignes,
    nom: (titre + (quand ? ' — ' + quand.slice(0, 10).replace(/\//g, '-') : '')).replace(/[\\/:*?"<>|]+/g, '-')
  };
}

/* PDF A4 paysage : document Google temporaire (mis à la corbeille après export, comme les autres PDF de l'application). */
function EUC_DEV663_pdfDoc_(d) {
  var doc = DocumentApp.create(d.nom), b = doc.getBody(), vert = '#0b6b4f';
  b.setPageWidth(841.89).setPageHeight(595.28).setMarginTop(28).setMarginBottom(28).setMarginLeft(28).setMarginRight(28);
  var style = function(par, taille, gras, couleur) { par.setSpacingBefore(0).setSpacingAfter(3).setLineSpacing(1); par.editAsText().setFontFamily('Arial').setFontSize(taille).setBold(gras).setForegroundColor(couleur); return par; };
  /* Paragraph.setText ne renvoie rien (API Google Docs) : le paragraphe est repris avant d'être mis en forme. */
  var premier = b.getParagraphs()[0]; premier.setText(d.titre); style(premier, 16, false, vert);
  style(b.appendParagraph(d.sousTitre), 9, false, '#16302a');
  style(b.appendParagraph(d.resume), 9, false, '#16302a');
  var t = b.appendTable([d.entetes].concat(d.lignes.map(function(l) { return l.cellules; })));
  t.setBorderColor('#cfd8dc').setBorderWidth(0.5);
  d.largeurs.forEach(function(w, i) { t.setColumnWidth(i, w); });
  for (var r = 0; r < t.getNumRows(); r++) {
    var row = t.getRow(r), ligne = r ? d.lignes[r - 1] : null;
    for (var k = 0; k < row.getNumCells(); k++) {
      var cell = row.getCell(k);
      cell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(3).setPaddingRight(3).setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
      for (var i = 0; i < cell.getNumChildren(); i++) { var ch = cell.getChild(i); if (ch.getType() === DocumentApp.ElementType.PARAGRAPH) ch.asParagraph().setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1); }
      var tx = cell.editAsText(); if (!tx.getText()) continue;
      tx.setFontFamily('Arial').setFontSize(r ? 7.5 : 8).setBold(!r || k === 0).setForegroundColor(!r ? '#ffffff' : k === 1 && ligne && ligne.sans ? '#b42318' : k === 1 ? vert : '#16302a');
    }
    var fond = !r ? vert : ligne.moi ? '#fff3b0' : '';
    if (fond) for (var k2 = 0; k2 < row.getNumCells(); k2++) row.getCell(k2).setBackgroundColor(fond);
  }
  style(doc.addFooter().appendParagraph(d.pied), 7.5, false, '#5b6b66');
  doc.saveAndClose();
  var f = DriveApp.getFileById(doc.getId()), blob = f.getAs(MimeType.PDF).setName(d.nom + '.pdf');
  try { f.setTrashed(true); } catch (e) {}
  return blob;
}

/* PDF du tableau à jour (modèle du suivi recalculé si Grist a changé, donc dépôt compris). */
function EUC_DEV663_pdf_(classeId, periodeId, eleveId, depot) {
  var vue = EUC_SUIVI2_vueEnseignants_(EUC_SUIVI2_modele_(''));
  var quand = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var d = EUC_DEV663_donnees_(vue, classeId, periodeId, eleveId, depot, quand);
  if (!d) return null;
  var c = (vue.classes || []).filter(function(x) { return Number(x.id) === Number(classeId); })[0], p = c.periodes.filter(function(x) { return Number(x.id) === Number(periodeId); })[0];
  return { blob: EUC_DEV663_pdfDoc_(d), classe: c.nom, periode: p.libelle };
}

/* Dépôt tel que l'élève l'a déclaré (calcul pur), pour le faire figurer dans le tableau avant validation. */
function EUC_DEV663_depot_(info, numero) {
  info = info || {}; var ent = info.entreprise || {}, P = EUC_DEV649_personne_, T = EUC_DEV663_t_;
  var resp = P(info.responsable), tut = info.tuteurEstResponsable ? resp : P(info.tuteur);
  return { numero: T(numero), aTraiter: !!(info.g205 && info.g205.requis), entreprise: [T(ent.nom), T(ent.enseigne) && T(ent.enseigne) !== T(ent.nom) ? '(' + T(ent.enseigne) + ')' : ''].filter(Boolean).join(' '),
    adresse: T(ent.adresse), lieu: info.lieuPrecision ? '' : T(info.lieu),
    contact: { nom: resp.nom, tel: resp.tel || T(ent.telephone), mail: resp.mail || T(ent.courriel) }, tuteur: tut };
}

/* Courriel de l'équipe : récapitulatif rédigé pour elle + tableau joint. Le dépôt n'échoue jamais à cause du tableau. */
function EUC_DEV663_recapEquipe_(info, classeId, periodeId, eleveId, numero) {
  var joint = null, cause = '';
  try { joint = EUC_DEV663_pdf_(classeId, periodeId, eleveId, EUC_DEV663_depot_(info, numero)); if (!joint) cause = 'classe ' + classeId + ' ou période ' + periodeId + ' absente du suivi'; }
  catch (e) { cause = EUC_DEV663_t_(e && e.message || e); console.log('DEV663 tableau : ' + cause); }
  var x = EUC_DEV663_infoEquipe_(info, joint);
  /* DEV670 : la cause est donnée à l'équipe (jamais à l'élève) pour pouvoir corriger. */
  if (!joint) x.intro += '\n(Tableau de la classe indisponible pour ce dépôt : le consulter dans le suivi des PFMP. Cause : ' + (cause || 'inconnue') + '.)';
  var r = EUC_DEV649_recap_(x);
  return { texte: r.texte, html: r.html, pj: joint ? [joint.blob] : [] };
}

/* DEV670 — Tableau d'une classe à la demande (administration) : même PDF que celui joint aux dépôts.
 * ?page=tableau-classe-pfmp&classe=<id ou nom>&periode=<id, rang ou début du libellé>. Affiche la cause en cas d'échec. */
function EUC_DEV670_trouver_(vue, classe, periode) {
  var T = EUC_DEV663_t_, n = function(v) { return T(v).toUpperCase().replace(/\s+/g, ''); };
  var c = (vue.classes || []).filter(function(x) { return String(x.id) === T(classe) || n(x.nom) === n(classe); })[0];
  if (!c) return { erreur: 'Classe introuvable dans le suivi : ' + T(classe) };
  var ps = c.periodes || [], p = ps.filter(function(x) { return String(x.id) === T(periode); })[0]
    || (/^\d{1,2}$/.test(T(periode)) ? ps[Number(periode) - 1] : null)
    || ps.filter(function(x) { return T(periode) && n(x.libelle).indexOf(n(periode)) === 0; })[0] || (!T(periode) ? ps[0] : null);
  if (!p) return { erreur: 'Période introuvable pour ' + c.nom + ' : ' + T(periode) + ' (périodes : ' + ps.map(function(x) { return x.id + ' = ' + x.libelle; }).join(', ') + ')' };
  return { classe: c, periode: p };
}
function EUC_DEV670_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var q = (e && e.parameter) || {}, h = function(v) { return EUC_DEV663_t_(v).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var corps;
  try {
    var vue = EUC_SUIVI2_vueEnseignants_(EUC_SUIVI2_modele_('')), t = EUC_DEV670_trouver_(vue, q.classe, q.periode);
    if (t.erreur) throw new Error(t.erreur);
    var r = EUC_DEV663_pdf_(t.classe.id, t.periode.id, 0, null);
    if (!r) throw new Error('Données du tableau introuvables.');
    corps = '<p>Tableau de <b>' + h(r.classe) + '</b> — ' + h(r.periode) + '</p><p><a class="b" download="' + h(r.blob.getName()) + '" href="data:application/pdf;base64,' + Utilities.base64Encode(r.blob.getBytes()) + '">Télécharger le PDF</a></p>';
  } catch (x) { corps = '<p class="err"><b>Tableau impossible :</b> ' + h(x && x.message || x) + '</p>'; }
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><style>body{font:15px Arial,sans-serif;margin:24px;color:#16302a}.b{background:#0b6b4f;color:#fff;padding:9px 14px;border-radius:7px;text-decoration:none;font-weight:700}.err{color:#9a3412}</style><h1>Tableau de la classe</h1>' + corps)
    .setTitle('Tableau de la classe — PFMP');
}
