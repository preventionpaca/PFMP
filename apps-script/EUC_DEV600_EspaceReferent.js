/**
 * DEV600 — Espace du professeur référent.
 *
 * Un lien personnel par professeur (signé, sans date d'expiration) regroupe tous ses apprentis de
 * l'année : échéance du contact d'entrée, tuteur, bilan de visite, fiches du livret à valider.
 * Lien perdu : le professeur saisit son adresse ; le lien n'est envoyé qu'à une adresse figurant
 * dans EUC_PROFESSEURS_PFMP (réponse identique dans tous les cas).
 * Les classes masquées dans l'échéancier sont aussi masquées ici.
 */
function EUC_DEV600_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV600_jeton_(profId) { return 'm' + Number(profId) + '.' + EUC_DEV598_sig_('M|' + Number(profId)); }
function EUC_DEV600_lireJeton_(t) {
  var m = /^m(\d+)\.([0-9a-f]{32})$/.exec(EUC_DEV600_t_(t));
  if (!m || !EUC_DEV598_egal_(m[2], EUC_DEV598_sig_('M|' + Number(m[1])))) throw new Error('Lien de l’espace référent invalide. Demandez un nouveau lien ci-dessous.');
  return Number(m[1]);
}
function EUC_DEV600_lien_(profId) { return EUC_DEV598_base_() + '?page=espace-referent&m=' + EUC_DEV600_jeton_(profId); }
function EUC_DEV600_prof_(profId) {
  var p = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').filter(function(x) { return Number(x.id) === Number(profId); })[0];
  if (!p) throw new Error('Professeur introuvable.');
  var f = p.fields || {}; return { id: Number(p.id), nom: [EUC_DEV600_t_(f.Civilite), EUC_DEV600_t_(f.Prenom), EUC_DEV600_t_(f.Nom)].filter(Boolean).join(' '), email: EUC_DEV600_t_(f.Email) };
}

/* Lignes de l'espace (calcul pur) : apprentis du professeur, livret résumé. */
function EUC_DEV600_lignes_(d, profId, fiches, lienValidation) {
  var parEleve = {};
  (fiches || []).forEach(function(r) { var f = r.fields || {}, k = Number(f.Eleve); var x = parEleve[k] = parEleve[k] || { validees: 0, aValider: 0, brouillons: 0, aValiderLycee: [] };
    var st = EUC_DEV600_t_(f.Statut) || 'BROUILLON';
    if (st === 'VALIDE') x.validees++; else if (st === 'A_VALIDER') { x.aValider++; if (EUC_DEV600_t_(f.Lieu) === 'LYCEE') x.aValiderLycee.push({ du: EUC_DEV600_t_(f.Du), au: EUC_DEV600_t_(f.Au), lien: lienValidation(r.id) }); } else x.brouillons++; });
  return d.lignes.filter(function(l) { return l.referent && Number(l.referent.professeurId) === Number(profId); }).map(function(l) {
    return { nom: l.nom, classe: l.classe, entreprise: l.entreprise, tuteur: l.tuteur, debut: l.debut, echeance: l.echeance, jours: l.jours, statut: l.statut, contact: l.contact,
      bilan: (l.bilans || [])[0] || null, lienFiche: l.lienFiche || '', livret: parEleve[l.eleveId] || { validees: 0, aValider: 0, brouillons: 0, aValiderLycee: [] } };
  });
}

function EUC_DEV600_espace(q) {
  var profId = EUC_DEV600_lireJeton_(q && q.m), prof = EUC_DEV600_prof_(profId);
  var d = EUC_DEV597_donnees_('');
  var fiches = typeof EUC_DEV599_FICHES_ !== 'undefined' ? EUC_DEV597_lire_(EUC_DEV599_FICHES_) : [];
  var lignes = EUC_DEV600_lignes_(d, profId, fiches, EUC_DEV599_lienValidation_);
  return { ok: true, professeur: prof.nom, annee: d.annee, aujourdhui: d.aujourdhui, seuils: d.seuils, lignes: lignes, compteurs: EUC_DEV597_compter_(lignes.map(function(l) { return { statut: l.statut, referent: true }; })) };
}

/* Lien perdu : renvoyé seulement à une adresse connue ; la réponse ne dit pas si l'adresse existe. */
function EUC_DEV600_demanderLien(q) {
  var email = EUC_DEV600_t_(q && q.email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) throw new Error('Adresse courriel invalide.');
  var cache = CacheService.getScriptCache(), cle = 'EUC_DEV600_DEMANDE_' + EUC_DEV598_sig_(email).slice(0, 16);
  var reponse = { ok: true, message: 'Si cette adresse est celle d’un professeur du lycée, le lien vient d’y être envoyé.' };
  if (cache.get(cle)) return reponse;
  cache.put(cle, '1', 600);
  var p = EUC_DEV597_lire_('EUC_PROFESSEURS_PFMP').filter(function(x) { var f = x.fields || {}; return f.Actif !== false && EUC_DEV600_t_(f.Email).toLowerCase() === email; })[0];
  if (!p) return reponse;
  var prof = EUC_DEV600_prof_(p.id);
  MailApp.sendEmail({ to: prof.email, name: 'Lycée Les Eucalyptus — Apprentis', subject: 'Votre espace professeur référent',
    body: ['Bonjour ' + prof.nom + ',', '', 'Voici le lien de votre espace professeur référent (tous vos apprentis, bilans de visite et livrets) :', '', EUC_DEV600_lien_(prof.id), '',
      'Ajoutez-le à vos favoris. Ne le transférez pas : il donne accès aux informations de vos apprentis.', '', 'Le bureau des entreprises — Lycée Les Eucalyptus'].join('\n') });
  return reponse;
}

function EUC_DEV600_afficher(e) {
  var t = HtmlService.createTemplateFromFile('Espace_Referent_DEV600');
  t.jeton = EUC_DEV600_t_(e && e.parameter && e.parameter.m);
  return t.evaluate().setTitle('Espace professeur référent — apprentis').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
