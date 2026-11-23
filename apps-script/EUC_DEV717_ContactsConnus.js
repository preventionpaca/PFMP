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

/* DEV719 : identité remise en ordre (calcul pur). Nom complet saisi dans « nom » (« BATAILLE Delphine », prénom vide) :
 * scindé ; prénom et nom inversés quand le courriel l'indique (robin.feligioni@… pour prénom « Feligioni », nom « Robin »). */
function EUC_DEV717_identite_(prenom, nom, courriel) {
  var T = EUC_DEV717_t_, p = T(prenom), n = T(nom);
  if (!p && n.indexOf(' ') > 0) { var sc = EUC_DEV717_scinder_(n); if (sc.prenom && sc.nom) { p = sc.prenom; n = sc.nom; } }
  var simple = function(v) { return T(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); };
  var morceaux = T(courriel).toLowerCase().split('@')[0].split(/[._-]+/).map(simple).filter(Boolean);
  if (p && n && morceaux.length >= 2 && morceaux[0] === simple(n) && morceaux[1] === simple(p) && simple(n) !== simple(p)) { var x = p; p = n; n = x; }
  return { prenom: p, nom: n };
}

/* Saisies d'un SIRET (calcul pur) : une par rôle et par convention ou dépôt ; rang = plus récent en dernier. */
function EUC_DEV717_saisies_(siret, conventions, depots) {
  var T = EUC_DEV717_t_, out = [];
  var ajouter = function(rang, role, x) {
    var prenom = T(x.prenom), nom = T(x.nom), mail = EUC_DEV706_courriel_(x.mail); if (!EUC_DEV706_cleNom_(prenom + ' ' + nom)) return;
    var id = EUC_DEV717_identite_(prenom, nom, mail);
    out.push({ rang: rang, role: role, civilite: T(x.civilite), prenom: id.prenom, nom: id.nom, fonction: T(x.fonction), tel: EUC_DEV706_tel_(x.tel), mail: mail });
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

/* Accès des formulaires élève : jeton de reprise du QR code ou jeton signé de « Déclarer mon entreprise ». */
function EUC_DEV717_exigerAcces_(q) {
  q = q || {};
  if (EUC_DEV717_t_(q.reprise)) { var a = EUC_CONVENTION_lireRepriseV117_(EUC_DEV717_t_(q.reprise)); EUC_CONVENTION_exigerQRValideV511_(a); return true; }
  if (EUC_DEV717_t_(q.jeton)) { EUC_DEV603_lireJeton_(EUC_DEV717_t_(q.jeton)); return true; }
  throw new Error('Accès refusé : ouvre le formulaire depuis ton lien ou ton QR code.');
}

/* Appel des formulaires élève : { siret, reprise } (QR code) ou { siret, jeton } (« Déclarer mon entreprise »). */
function EUC_DEV717_contactsConnus(q) {
  EUC_DEV717_exigerAcces_(q);
  return EUC_DEV717_calculer_((q || {}).siret);
}

/* DEV719 : préchauffage dès l'identification de l'élève (l'index est prêt quand il saisit son SIRET). */
function EUC_DEV717_prechauffer(q) {
  EUC_DEV717_exigerAcces_(q);
  var t0 = Date.now(), idx = EUC_DEV717_indexCache_();
  return { ok: true, siret: Object.keys(idx.s || {}).length, ms: Date.now() - t0 };
}

/* ---------- DEV719 : index de toutes les entreprises, calculé une fois et mis en cache ----------
 * Avant : chaque SIRET relisait en entier, l'une après l'autre, la table des conventions, celle des dépôts en ligne et
 * les références du bureau (jusqu'à 20 s). Désormais : lecture parallèle des trois tables, index SIRET → personnes
 * calculé en une passe, gardé 20 minutes dans le cache du script ; une demande ne lit plus que le cache. */
var EUC_DEV717_CLE_INDEX_ = 'EUC_DEV717_IDX_V1', EUC_DEV717_TTL_ = 1200;

function EUC_DEV717_siretsTexte_(v) { return (EUC_DEV717_t_(v).replace(/[\s.]/g, '').match(/\d{14}/g) || []); }

/* Index (calcul pur) : { siret: [personnes] } pour chaque SIRET ayant au moins une personne connue. */
function EUC_DEV717_index_(conventions, depots, references) {
  var T = EUC_DEV717_t_, conv = {}, dep = {}, refs = {};
  var mettre = function(o, k, x) { if (k.length === 14) (o[k] = o[k] || []).push(x); };
  (conventions || []).forEach(function(a) { if (a) mettre(conv, T(a.Entreprise_siret).replace(/\D/g, ''), a); });
  (depots || []).forEach(function(j) { if (j) mettre(dep, T(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, ''), j); });
  (references || []).forEach(function(r) { EUC_DEV717_siretsTexte_(r && r.k).forEach(function(k) { mettre(refs, k, r); }); });
  var out = {};
  Object.keys(conv).concat(Object.keys(dep)).forEach(function(siret) {
    if (out[siret]) return;
    var l = EUC_DEV717_personnes_(EUC_DEV717_saisies_(siret, conv[siret] || [], dep[siret] || []), refs[siret] || []);
    if (l.length) out[siret] = l;
  });
  return out;
}

/* Lecture des trois sources en parallèle (repli : lectures successives). */
function EUC_DEV717_lireSources_() {
  var tables = [typeof EUC_CONVENTION_ACCES_TABLE_ === 'string' ? EUC_CONVENTION_ACCES_TABLE_ : 'EUC_ACCES_FORMULAIRES_PFMP', 'EUC_MIGRATION_JOTFORM_PFMP', typeof EUC_DEV706_TABLE_ === 'string' ? EUC_DEV706_TABLE_ : 'EUC_CONTACTS_REFERENCE'];
  var lignes = null;
  try {
    var g = EUC_SUIVI2_grist_();
    var reps = UrlFetchApp.fetchAll(tables.map(function(t) { return { url: g.base + '/tables/' + encodeURIComponent(t) + '/records', headers: g.entetes, muteHttpExceptions: true }; }));
    lignes = reps.map(function(rep, i) {
      if (rep.getResponseCode() === 404 && i === 2) return [];
      if (rep.getResponseCode() !== 200) throw new Error('Grist ' + rep.getResponseCode());
      return (JSON.parse(rep.getContentText()).records || []).map(function(r) { return Object.assign({ id: r.id }, r.fields || {}); });
    });
  } catch (e) { lignes = null; }
  if (!lignes) {
    lignes = [[], [], []];
    try { lignes[0] = EUC_CONVENTION_lireAccesFraisV108_() || []; } catch (eC) {}
    try { lignes[1] = EUC_IMPORT_lireRecords_('EUC_MIGRATION_JOTFORM_PFMP') || []; } catch (eD) {}
    try { lignes[2] = EUC_IMPORT_lireRecords_(EUC_DEV706_TABLE_) || []; } catch (eR) {}
  }
  var refs = []; try { refs = typeof EUC_DEV706_references_ === 'function' ? EUC_DEV706_references_(lignes[2]) : []; } catch (eF) { refs = []; }
  return { conventions: lignes[0], depots: lignes[1], references: refs };
}

function EUC_DEV717_cacheLire_() {
  try {
    var c = CacheService.getScriptCache(), n = Number(c.get(EUC_DEV717_CLE_INDEX_ + '_N')) || 0; if (n < 1 || n > 100) return null;
    var cles = []; for (var i = 0; i < n; i++) cles.push(EUC_DEV717_CLE_INDEX_ + '_' + i);
    var tout = c.getAll(cles) || {}, parts = [];
    for (var j = 0; j < n; j++) { if (tout[cles[j]] == null) return null; parts.push(tout[cles[j]]); }
    return JSON.parse(parts.join(''));
  } catch (e) { return null; }
}
function EUC_DEV717_cacheEcrire_(v) {
  try {
    var brut = JSON.stringify(v), t = 45000, n = Math.ceil(brut.length / t) || 1; if (n > 100) return false; /* 45 000 caractères : sous 100 Ko même accentués. */
    var o = {}; for (var i = 0; i < n; i++) o[EUC_DEV717_CLE_INDEX_ + '_' + i] = brut.slice(i * t, (i + 1) * t);
    o[EUC_DEV717_CLE_INDEX_ + '_N'] = String(n);
    CacheService.getScriptCache().putAll(o, EUC_DEV717_TTL_); return true;
  } catch (e) { return false; }
}

/* Index en cache (20 min) ; reconstruit si absent. */
function EUC_DEV717_indexCache_() {
  var idx = EUC_DEV717_cacheLire_();
  if (idx && idx.s) return idx;
  var d = EUC_DEV717_lireSources_();
  idx = { le: new Date().toISOString(), s: EUC_DEV717_index_(d.conventions, d.depots, d.references) };
  EUC_DEV717_cacheEcrire_(idx);
  return idx;
}

/* Lecture seule, sans contrôle d'accès : appelée seulement après le contrôle de l'appelant (élève ou simulation DEV719).
 * Avec des données fournies (tests, tirage de la simulation) : calcul direct ; sinon : index en cache. */
function EUC_DEV717_calculer_(valeur, donnees) {
  var siret = EUC_DEV717_t_(valeur).replace(/\D/g, '');
  if (siret.length !== 14) return { siret: siret, personnes: [] };
  if (donnees) {
    var refs = (donnees.references || []).filter(function(r) { return EUC_DEV717_siretsTexte_(r && r.k).indexOf(siret) >= 0; });
    return { siret: siret, personnes: EUC_DEV717_personnes_(EUC_DEV717_saisies_(siret, donnees.conventions || [], donnees.depots || []), refs) };
  }
  var idx = EUC_DEV717_indexCache_();
  return { siret: siret, personnes: (idx.s && idx.s[siret]) || [], le: idx.le };
}
