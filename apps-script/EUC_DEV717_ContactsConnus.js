/**
 * DEV717 — Formulaires élève (QR code et « Déclarer mon entreprise ») : responsables et tuteurs déjà connus pour un SIRET.
 *
 * Après la vérification du SIRET, l'élève coche le responsable et le tuteur s'ils sont dans la liste : nom, prénom,
 * fonction, téléphone et courriel sont pré-remplis (décision de l'utilisateur du 23/11/2026 : tout en clair). Le nom est
 * verrouillé ; le téléphone et le courriel restent en lecture seule jusqu'au clic sur « Modifier » (ils peuvent avoir
 * changé). Une personne absente de la liste se saisit en entier.
 *
 * Sources, pour ce seul SIRET : conventions (table des conventions) et dépôts en ligne vérifiés, regroupés par personne
 * comme « Fiabiliser les contacts » (DEV706) ; la référence validée par le bureau (EUC_CONTACTS_REFERENCE) passe avant.
 * Accès : jeton de reprise du QR code ou jeton signé de « Déclarer mon entreprise ». Lecture seule.
 */
var EUC_DEV717_MAX_ = 8;
function EUC_DEV717_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }

/* « Ayoub BOUNAB » → prénom « Ayoub », nom « BOUNAB » (mots en capitales = nom ; à défaut, dernier mot). Calcul pur. */
function EUC_DEV717_scinder_(nomComplet) {
  var m = EUC_DEV717_t_(nomComplet).replace(/^(m\.|mme|mlle|monsieur|madame|mr)\s+/i, '').split(' ').filter(Boolean);
  if (!m.length) return { prenom: '', nom: '' };
  var maj = function(x) { return x.length > 1 && x === x.toUpperCase() && /[A-Z]/.test(x.normalize('NFD').replace(/[̀-ͯ]/g, '')); };
  var noms = m.filter(maj);
  if (!noms.length || noms.length === m.length) return m.length === 1 ? { prenom: '', nom: m[0] } : { prenom: m.slice(0, -1).join(' '), nom: m[m.length - 1] };
  return { prenom: m.filter(function(x) { return !maj(x); }).join(' '), nom: noms.join(' ') };
}

/* Saisies d'un SIRET (calcul pur) : une par rôle et par convention ou dépôt ; rang = plus récent en dernier. */
function EUC_DEV717_saisies_(siret, conventions, depots) {
  var T = EUC_DEV717_t_, out = [];
  var ajouter = function(rang, role, x) {
    var prenom = T(x.prenom), nom = T(x.nom); if (!EUC_DEV706_cleNom_(prenom + ' ' + nom)) return;
    out.push({ rang: rang, role: role, civilite: T(x.civilite), prenom: prenom, nom: nom, fonction: T(x.fonction), tel: EUC_DEV706_tel_(x.tel), mail: EUC_DEV706_courriel_(x.mail) });
  };
  (conventions || []).forEach(function(a) {
    if (!a || a.Revoked === true || a.Supprimee_admin === true || /SUPPRIMEE|ANNULEE/i.test(T(a.Statut_administratif))) return;
    if (T(a.Entreprise_siret).replace(/\D/g, '') !== siret) return;
    var r = Number(a.id) || 0;
    ajouter(r, 'RESPONSABLE', { civilite: a.Responsable_civilite, prenom: a.Responsable_prenom, nom: a.Responsable_nom, fonction: a.Responsable_fonction, tel: a.Responsable_telephone, mail: a.Responsable_courriel });
    ajouter(r, 'TUTEUR', { civilite: a.Tuteur_civilite, prenom: a.Tuteur_prenom, nom: a.Tuteur_nom, fonction: a.Tuteur_fonction, tel: a.Tuteur_telephone, mail: a.Tuteur_courriel });
  });
  (depots || []).forEach(function(j) {
    if (!j || ['IGNOREE', 'REJETEE', 'REFUSEE', 'ESSAI'].indexOf(T(j.Decision).toUpperCase()) >= 0) return;
    if (T(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, '') !== siret || T(j.SIRET_statut).toUpperCase() !== 'VERIFIE') return;
    var c = typeof EUC_SUIVI2_contactsTampon_ === 'function' ? EUC_SUIVI2_contactsTampon_(j) : { responsable: {}, tuteur: {} }, r = 1e9 + (Number(j.id) || 0);
    ajouter(r, 'RESPONSABLE', c.responsable || {}); ajouter(r, 'TUTEUR', c.tuteur || {});
  });
  return out.sort(function(a, b) { return a.rang - b.rang; });
}

/* Personnes connues (calcul pur) : regroupement des variantes d'un même nom, référence du bureau en priorité. */
function EUC_DEV717_personnes_(saisies, references) {
  var groupes = [];
  (saisies || []).forEach(function(s) {
    var cle = EUC_DEV706_cleNom_(s.prenom + ' ' + s.nom);
    var g = groupes.filter(function(x) { return x.cles.some(function(c) { return c === cle || EUC_DEV706_proches_(c, cle); }); })[0];
    if (!g) { g = { cles: [], l: [] }; groupes.push(g); }
    if (g.cles.indexOf(cle) < 0) g.cles.push(cle);
    g.l.push(s);
  });
  var plusFrequent = function(l, f) { var n = {}, best = '', bn = 0; l.forEach(function(x) { var v = f(x); if (!v) return; n[v] = (n[v] || 0) + 1; if (n[v] >= bn) { bn = n[v]; best = v; } }); return best; };
  var plusRecent = function(l, f) { for (var i = l.length - 1; i >= 0; i--) { var v = f(l[i]); if (v) return v; } return ''; };
  return groupes.map(function(g) {
    var ident = plusFrequent(g.l, function(x) { return x.prenom + '|' + x.nom; }).split('|');
    var p = { prenom: ident[0] || '', nom: ident[1] || '', civilite: plusFrequent(g.l, function(x) { return /^(M\.|Mme)$/.test(x.civilite) ? x.civilite : ''; }),
      fonction: plusRecent(g.l, function(x) { return x.fonction; }),
      tel: plusRecent(g.l, function(x) { return EUC_DEV706_telValide_(x.tel) ? x.tel : ''; }),
      mail: plusRecent(g.l, function(x) { return EUC_DEV706_courrielValide_(x.mail) && !EUC_DEV706_courrielSuspect_(x.mail) ? x.mail : ''; }),
      roles: [], n: g.l.length, dernier: g.l[g.l.length - 1].rang, valide: false };
    g.l.forEach(function(x) { if (p.roles.indexOf(x.role) < 0) p.roles.push(x.role); });
    var ref = (references || []).filter(function(r) { return (r.cles && r.cles.noms || []).some(function(c) { return g.cles.indexOf(c) >= 0; }); })[0];
    if (ref) {
      var sc = EUC_DEV717_scinder_(ref.nom); if (sc.nom) { p.prenom = sc.prenom; p.nom = sc.nom; }
      var rt = EUC_DEV706_tel_(ref.telephone), rm = EUC_DEV706_courriel_(ref.courriel);
      if (rt && EUC_DEV706_telValide_(rt)) p.tel = rt; if (rm && EUC_DEV706_courrielValide_(rm)) p.mail = rm; p.valide = true;
    }
    return p;
  }).sort(function(a, b) { return (b.valide - a.valide) || (b.n - a.n) || (b.dernier - a.dernier); }).slice(0, EUC_DEV717_MAX_).map(function(p, i) {
    return { id: i + 1, civilite: p.civilite, prenom: p.prenom, nom: p.nom, fonction: p.fonction, telephone: p.tel ? EUC_DEV706_telAffiche_(p.tel) : '', courriel: p.mail,
      roles: p.roles.sort(), valide: p.valide };
  });
}

/* Appel des formulaires élève : { siret, reprise } (QR code) ou { siret, jeton } (« Déclarer mon entreprise »). */
function EUC_DEV717_contactsConnus(q) {
  q = q || {};
  if (EUC_DEV717_t_(q.reprise)) { var a = EUC_CONVENTION_lireRepriseV117_(EUC_DEV717_t_(q.reprise)); EUC_CONVENTION_exigerQRValideV511_(a); }
  else if (EUC_DEV717_t_(q.jeton)) EUC_DEV603_lireJeton_(EUC_DEV717_t_(q.jeton));
  else throw new Error('Accès refusé : ouvre le formulaire depuis ton lien ou ton QR code.');
  var siret = EUC_DEV717_t_(q.siret).replace(/\D/g, '');
  if (siret.length !== 14) return { siret: siret, personnes: [] };
  var refs = []; try { refs = (typeof EUC_DEV706_references_ === 'function' ? EUC_DEV706_references_() : []).filter(function(r) { return r.k === 'S' + siret || EUC_DEV717_t_(r.k).indexOf(siret) >= 0; }); } catch (eR) { refs = []; }
  var convs = [], depots = [];
  try { convs = EUC_CONVENTION_lireAccesFraisV108_() || []; } catch (eC) { convs = []; }
  try { depots = EUC_IMPORT_lireRecords_('EUC_MIGRATION_JOTFORM_PFMP') || []; } catch (eD) { depots = []; }
  return { siret: siret, personnes: EUC_DEV717_personnes_(EUC_DEV717_saisies_(siret, convs, depots), refs) };
}
