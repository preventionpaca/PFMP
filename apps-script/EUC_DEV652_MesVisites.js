/**
 * DEV652 — « Mes visites » : le professeur visiteur ajuste le lieu de visite après l'ordre de mission.
 *
 * L'ordre de mission (page 1, signée par le Proviseur) reste prévisionnel. Le professeur visiteur est le
 * seul à savoir, après son appel au tuteur, où il verra l'élève (chantier, atelier, autre garage).
 * Depuis son lien personnel (courriel de l'ordre de mission, page 2), il :
 *   - voit ses élèves de la classe et de la période, avec l'adresse de visite prévue ;
 *   - « Je vais le voir ailleurs » : saisit le lieu réel → Lieu_stage_* de la convention (le même champ que
 *     l'élève ou l'administration), avec la mention du professeur et de la date ; suivi, carte et
 *     ordres de mission l'utilisent aussitôt ;
 *   - réimprime sa page 2 (récapitulatif des visites) avec les adresses à jour.
 * Lien signé (HMAC, secret de DEV598), sans compte. Aucune autre donnée de la convention n'est modifiable.
 */
var EUC_DEV652_COLONNES_ = [['Lieu_stage_modifie_par', 'Lieu de stage — modifié par', 'Text'], ['Lieu_stage_modifie_le', 'Lieu de stage — modifié le', 'Text']];

function EUC_DEV652_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }

/* ---------- Lien signé : année, famille, classe, période, professeur ---------- */
function EUC_DEV652_jeton_(annee, famille, classeId, periodeId, prof) {
  var charge = Utilities.base64EncodeWebSafe(JSON.stringify([EUC_DEV652_t_(annee), EUC_DEV652_t_(famille), Number(classeId) || 0, Number(periodeId) || 0, EUC_DEV652_t_(prof)]), Utilities.Charset.UTF_8).replace(/=+$/, '');
  return 'v' + charge + '.' + EUC_DEV598_sig_('V|' + charge);
}
function EUC_DEV652_lireJeton_(t) {
  var m = /^v([A-Za-z0-9_-]+)\.([0-9a-f]{32})$/.exec(EUC_DEV652_t_(t)), x = null;
  if (m && EUC_DEV598_egal_(m[2], EUC_DEV598_sig_('V|' + m[1]))) {
    try { var b = m[1]; while (b.length % 4) b += '='; x = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString('UTF-8')); } catch (e) { x = null; }
  }
  if (!x || x.length !== 5 || !x[2] || !x[3] || !x[4]) throw new Error('Lien « Mes visites » invalide. Utilisez le lien du courriel de votre ordre de mission ou demandez-le au bureau des entreprises.');
  return { annee: x[0], famille: x[1], classeId: x[2], periodeId: x[3], prof: x[4] };
}
function EUC_DEV652_lien_(annee, famille, classeId, periodeId, prof) {
  var u = ''; try { u = String(ScriptApp.getService().getUrl() || ''); } catch (e) {}
  return u.replace(/[?#].*$/, '') + '?page=mes-visites-pfmp&t=' + EUC_DEV652_jeton_(annee, famille, classeId, periodeId, prof);
}

/* ---------- Conventions actives de la période (lecture directe, toujours à jour) ---------- */
function EUC_DEV652_actif_(r) {
  var statut = String(r.Statut_administratif || r.Statut || '').toUpperCase();
  return r.Revoked !== true && r.Supprimee_admin !== true && ['INTERROMPUE', 'ANNULEE_AVANT_DEMARRAGE', 'SUPPRIMEE_ADMIN'].indexOf(statut) < 0;
}
function EUC_DEV652_conventions_(annee, periodeId) {
  var q = '/tables/' + encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_) + '/records?filter=' + encodeURIComponent(JSON.stringify({ Periode: [Number(periodeId)], Annee_scolaire: [String(annee)] }));
  var parEleve = {};
  (EUC_ENT_grist('get', q).records || []).map(EUC_CONVENTION_rowV525_).filter(function(r) { return r && r.id && EUC_DEV652_actif_(r); }).forEach(function(r) {
    var id = Number(EUC_PFMP_ref_(r.Eleve)) || 0;
    if (id && (!parEleve[id] || r.id > parEleve[id].id)) parEleve[id] = r;
  });
  return parEleve;
}

/* Calcul pur : ligne de visite = ligne d'ordre de mission + lieu de stage relu dans la convention. */
function EUC_DEV652_ligne_(l, a) {
  l = l || {}; a = a || null;
  var lieu = a ? EUC_DEV649_lieuTexte_(a) : EUC_DEV652_t_(l.lieuStage), siege = EUC_DEV652_t_(l.siege);
  return { eleveId: Number(l.eleveId) || 0, eleve: l.eleve, entreprise: l.entreprise, transport: l.transport, contactEntreprise: l.contactEntreprise, contactTuteur: l.contactTuteur,
    siege: siege, lieuStage: lieu, adresse: lieu ? '⚠ LIEU DU STAGE : ' + lieu + (siege ? '\n(siège : ' + siege + ')' : '') : siege,
    lieu: a ? { adresse: EUC_DEV652_t_(a.Lieu_stage_adresse), codePostal: EUC_DEV652_t_(a.Lieu_stage_code_postal), commune: EUC_DEV652_t_(a.Lieu_stage_commune) } : { adresse: '', codePostal: '', commune: '' },
    modifiePar: a ? EUC_DEV652_t_(a.Lieu_stage_modifie_par) : '', modifieLe: a ? EUC_DEV652_t_(a.Lieu_stage_modifie_le) : '', convention: !!a };
}

function EUC_DEV652_groupe_(j) {
  var d = EUC_DEV374_missionDetail_(j.annee, j.famille, j.classeId, j.periodeId) || {}, tm = EUC_DEV368_mapTransport(), conv = EUC_DEV652_conventions_(j.annee, j.periodeId);
  var dp = d.periode || {}, dc = d.classe || {}, lignes = [];
  (d.lignes || []).forEach(function(x) {
    if (EUC_DEV652_t_(x.professeurVisiteur) !== j.prof || !EUC_DEV374_missionEligible_(x)) return;
    var mk = j.annee + '|' + j.classeId + '|' + j.periodeId + '|' + (Number(x.eleveId) || 0);
    lignes.push(EUC_DEV652_ligne_(EUC_DEV440_missionLine_(x, tm[mk] ? tm[mk].mode : ''), conv[Number(x.eleveId) || 0]));
  });
  return { professeur: j.prof, classe: EUC_DEV652_t_(dc.nom) || ('Classe ' + j.classeId), periode: EUC_DEV652_t_(dp.libelle || dp.nom), debut: EUC_DEV652_t_(dp.debutFr || dp.debut), fin: EUC_DEV652_t_(dp.finFr || dp.fin), lignes: lignes };
}

/* ---------- Page du professeur ---------- */
function EUC_DEV652_afficher(e) {
  var t = HtmlService.createTemplateFromFile('Mes_Visites_DEV652');
  t.jeton = EUC_DEV652_t_(e && e.parameter && e.parameter.t);
  return t.evaluate().setTitle('Mes visites — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV652_ouvrir(q) {
  var g = EUC_DEV652_groupe_(EUC_DEV652_lireJeton_(q && q.t));
  g.ok = true;
  return g;
}

/* Calcul pur : lieu saisi par le professeur (vide = retour à l'adresse de l'entreprise). */
function EUC_DEV652_lieuSaisi_(q) {
  q = q || {};
  var l = { Lieu_stage_adresse: EUC_DEV652_t_(q.adresse).slice(0, 300), Lieu_stage_code_postal: EUC_DEV652_t_(q.codePostal).replace(/[^0-9A-Za-z -]/g, '').slice(0, 10), Lieu_stage_commune: EUC_DEV652_t_(q.commune).slice(0, 150) };
  if (q.effacer === true) return { Lieu_stage_adresse: '', Lieu_stage_code_postal: '', Lieu_stage_commune: '' };
  if (!l.Lieu_stage_adresse || !l.Lieu_stage_commune) throw new Error('Indiquez l’adresse et la commune du lieu de visite.');
  if (l.Lieu_stage_code_postal && !/^\d{5}$/.test(l.Lieu_stage_code_postal)) throw new Error('Le code postal doit comporter 5 chiffres.');
  return l;
}
function EUC_DEV652_assurerColonnes_() {
  if (typeof EUC_DEV649_assurerColonnesAcces_ === 'function') EUC_DEV649_assurerColonnesAcces_();
  var cache = null; try { cache = CacheService.getScriptCache(); if (cache.get('EUC_DEV652_ACCES_OK') === 'OK') return; } catch (e) {}
  var t = encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_), have = {};
  (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).forEach(function(c) { have[c.id] = true; });
  var manque = EUC_DEV652_COLONNES_.filter(function(c) { return !have[c[0]]; }).map(function(c) { return { id: c[0], fields: { label: c[1], type: c[2] } }; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: manque });
  try { if (cache) cache.put('EUC_DEV652_ACCES_OK', 'OK', 21600); } catch (e2) {}
}
function EUC_DEV652_modifierLieu(q) {
  q = q || {};
  var j = EUC_DEV652_lireJeton_(q.t), eleveId = Number(q.eleveId) || 0;
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(20000)) throw new Error('Un autre enregistrement est en cours. Réessayez.');
  try {
    var g = EUC_DEV652_groupe_(j), l = g.lignes.filter(function(x) { return x.eleveId === eleveId; })[0];
    if (!l) throw new Error('Cet élève ne fait pas partie de vos visites pour cette période.');
    var a = EUC_DEV652_conventions_(j.annee, j.periodeId)[eleveId];
    if (!a) throw new Error('Aucune convention active pour cet élève : contactez le bureau des entreprises.');
    var champs = EUC_DEV652_lieuSaisi_(q), maintenant = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd HH:mm');
    champs.Lieu_stage_modifie_par = q.effacer === true ? '' : j.prof;
    champs.Lieu_stage_modifie_le = q.effacer === true ? '' : maintenant;
    var h = []; try { h = JSON.parse(a.Historique_admin_JSON || '[]') || []; } catch (e) { h = []; }
    h.push({ date: maintenant, auteur: 'Professeur visiteur : ' + j.prof, action: q.effacer === true ? 'LIEU_VISITE_RETOUR_SIEGE' : 'LIEU_VISITE_PROFESSEUR',
      avant: { Lieu_stage_adresse: a.Lieu_stage_adresse || '', Lieu_stage_code_postal: a.Lieu_stage_code_postal || '', Lieu_stage_commune: a.Lieu_stage_commune || '' },
      apres: { Lieu_stage_adresse: champs.Lieu_stage_adresse, Lieu_stage_code_postal: champs.Lieu_stage_code_postal, Lieu_stage_commune: champs.Lieu_stage_commune } });
    champs.Historique_admin_JSON = JSON.stringify(h);
    EUC_DEV652_assurerColonnes_();
    EUC_ENT_grist('patch', '/tables/' + encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_) + '/records', { records: [{ id: Number(a.id), fields: champs }] });
    try { if (typeof EUC_DEV425_removeDetailCache_ === 'function') EUC_DEV425_removeDetailCache_(j.annee, j.famille, j.classeId, j.periodeId); } catch (e2) {}
  } finally { verrou.releaseLock(); }
  return EUC_DEV652_ouvrir({ t: q.t });
}

/* Page 2 (récapitulatif des visites) avec les adresses à jour, en PDF. */
function EUC_DEV652_pdfPage2(q) {
  var j = EUC_DEV652_lireJeton_(q && q.t), g = EUC_DEV652_groupe_(j);
  if (!g.lignes.length) throw new Error('Aucune visite pour cette période.');
  g.lienVisites = EUC_DEV652_lien_(j.annee, j.famille, j.classeId, j.periodeId, j.prof);
  g.miseAJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'dd/MM/yyyy HH:mm');
  var nom = ('Recapitulatif_visites_' + j.prof + '_' + g.classe + '_' + g.periode).replace(/[^A-Za-z0-9À-ÿ_-]+/g, '_');
  var doc = DocumentApp.create('TEMP_' + nom), id = doc.getId();
  try {
    var body = doc.getBody();
    body.setPageWidth(841.89).setPageHeight(595.28).setMarginTop(22).setMarginBottom(22).setMarginLeft(24).setMarginRight(24);
    EUC_DEV438_appendVisitRecap_(body, g);
    try { var p0 = body.getChild(0); if (p0.getType() === DocumentApp.ElementType.PARAGRAPH && !p0.asParagraph().getText()) p0.removeFromParent(); } catch (e0) {}
    doc.saveAndClose();
    var pdf = DriveApp.getFileById(id).getAs(MimeType.PDF).setName(nom + '.pdf');
    return { ok: true, name: pdf.getName(), mime: 'application/pdf', base64: Utilities.base64Encode(pdf.getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e1) {} }
}

/* Lien « Mes visites » d'un groupe d'ordre de mission (page 2 et courriel). Vide en cas d'erreur : jamais bloquant. */
function EUC_DEV652_lienGroupe_(q, g) {
  try { return g && g.professeur ? EUC_DEV652_lien_(EUC_DEV368_year(q && q.annee), g.famille, g.classeId, g.periodeId, g.professeur) : ''; } catch (e) { return ''; }
}
