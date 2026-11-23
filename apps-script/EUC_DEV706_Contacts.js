/**
 * DEV706 — Fiabiliser les contacts entreprises (page `contacts-entreprises-pfmp`).
 *
 * Toutes les saisies de responsables et de tuteurs (conventions et dépôts en ligne, toutes années) sont
 * regroupées par entreprise, puis par personne : même nom à l'orthographe près (accents, ordre prénom / nom,
 * faute d'une ou deux lettres, nom seul). Pour chaque personne : variantes de nom, téléphones, courriels,
 * lieux de stage (à défaut le siège), années et conventions. Les incohérences et risques d'erreur de saisie
 * sont signalés avec un niveau (élevé, moyen, faible).
 *
 * Correction : l'administration choisit le nom, le téléphone et le courriel de référence d'une personne.
 * Ils sont enregistrés dans la base des contacts (table EUC_CONTACTS_REFERENCE, créée au premier
 * enregistrement). Les conventions ne sont JAMAIS réécrites (décision du DDFPT, 22/11/2026).
 */
var EUC_DEV706_TABLE_ = 'EUC_CONTACTS_REFERENCE';
var EUC_DEV706_VERSION_ = '1.0.0-dev.706b';
var EUC_DEV706_CIVILITES_ = ['m', 'mr', 'mme', 'mlle', 'monsieur', 'madame', 'mademoiselle', 'dr', 'docteur', 'me'];
var EUC_DEV706_DOMAINES_SUSPECTS_ = ['gmial.com', 'gmal.com', 'gmai.com', 'gamil.com', 'gmail.co', 'gmail.cm', 'gmail.fr', 'gmaill.com', 'hotmial.com', 'hotmal.com', 'hotmail.co', 'hotmai.fr', 'hotmial.fr',
  'yahoo.f', 'yaho.fr', 'yahou.fr', 'outlok.fr', 'outlok.com', 'outloo.com', 'wanadoo.com', 'orange.f', 'free.f', 'sfr.f', 'laposte.fr', 'icloud.fr'];

/* Faute de frappe fréquente sur le domaine → domaine probable (proposition, jamais appliquée sans validation). */
var EUC_DEV706_CORRECTIONS_ = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.fr': 'hotmail.fr', 'hotmial.fr': 'hotmail.fr', 'outlok.fr': 'outlook.fr', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'yaho.fr': 'yahoo.fr', 'yahou.fr': 'yahoo.fr', 'yahoo.f': 'yahoo.fr', 'orange.f': 'orange.fr', 'free.f': 'free.fr', 'sfr.f': 'sfr.fr', 'wanadoo.com': 'wanadoo.fr' };
function EUC_DEV706_proposition_(c) { var p = c.split('@'), d = EUC_DEV706_CORRECTIONS_[p[1] || '']; return d ? p[0] + '@' + d : ''; }
function EUC_DEV706_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV706_sansAccent_(v) { return EUC_DEV706_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/* Clé d'un nom (calcul pur) : sans accents, sans civilité, mots triés (prénom / nom inversés = même clé). */
function EUC_DEV706_cleNom_(v) {
  return EUC_DEV706_sansAccent_(v).replace(/[^a-z]+/g, ' ').trim().split(' ').filter(function(m) { return m && EUC_DEV706_CIVILITES_.indexOf(m) < 0; }).sort().join(' ');
}
/* Téléphone (calcul pur) : chiffres, +33 → 0, +377 conservé ; validité France (10 chiffres) ou Monaco. */
function EUC_DEV706_tel_(v) {
  var d = EUC_DEV706_t_(v).replace(/\D/g, '');
  if (/^0033/.test(d)) d = '0' + d.slice(4); else if (/^33\d{9}$/.test(d)) d = '0' + d.slice(2);
  if (/^00377/.test(d)) d = d.slice(2);
  return d;
}
function EUC_DEV706_telValide_(d) { return /^0[1-9]\d{8}$/.test(d) || /^377\d{8,9}$/.test(d) || /^9\d{7}$/.test(d) || /^6\d{8}$/.test(d); }
function EUC_DEV706_telAffiche_(d) {
  if (/^0\d{9}$/.test(d)) return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  if (/^377\d+$/.test(d)) return '+377 ' + d.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return d;
}
function EUC_DEV706_courriel_(v) { return EUC_DEV706_t_(v).toLowerCase().replace(/\s+/g, ''); }
function EUC_DEV706_courrielValide_(c) { return /^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(c) && !/\.\./.test(c); }
function EUC_DEV706_courrielSuspect_(c) {
  var dom = c.split('@')[1] || '';
  return EUC_DEV706_DOMAINES_SUSPECTS_.indexOf(dom) >= 0 || /\.(con|cm|fe|frr|ffr)$/.test(dom) || /\.fr\.fr$|\.com\.com$/.test(dom);
}
/* Distance d'édition (calcul pur). */
function EUC_DEV706_distance_(a, b) {
  if (a === b) return 0; var m = a.length, n = b.length; if (!m || !n) return m || n;
  var p = [], i, j; for (j = 0; j <= n; j++) p[j] = j;
  for (i = 1; i <= m; i++) { var q = [i]; for (j = 1; j <= n; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; }
  return p[n];
}
/* Deux clés de nom désignent probablement la même personne : faute de frappe ou nom seul (calcul pur). */
function EUC_DEV706_proches_(a, b) {
  if (!a || !b || a === b) return a === b && !!a;
  var ta = a.split(' '), tb = b.split(' ');
  if (ta.length === 1 || tb.length === 1) { var seul = ta.length === 1 ? ta[0] : tb[0], autre = ta.length === 1 ? tb : ta; return seul.length >= 3 && autre.indexOf(seul) >= 0; }
  var lim = Math.max(a.length, b.length) >= 10 ? 2 : 1;
  return EUC_DEV706_distance_(a, b) <= lim;
}

/* Saisies (calcul pur) : une ligne par personne citée dans une convention ou un dépôt. */
function EUC_DEV706_saisie_(role, prenom, nom, tel, courriel, ctx) {
  var complet = [EUC_DEV706_t_(prenom), EUC_DEV706_t_(nom)].filter(Boolean).join(' ').replace(/^(m|mr|mme|mlle|monsieur|madame|mademoiselle)\.?\s+/i, '');
  var t = EUC_DEV706_tel_(tel), c = EUC_DEV706_courriel_(courriel);
  if (!complet && !t && !c) return null;
  return { role: role, nom: complet, cle: EUC_DEV706_cleNom_(complet), telBrut: EUC_DEV706_t_(tel), tel: t, courriel: c, k: ctx.k, entreprise: ctx.entreprise, identifiant: ctx.identifiant,
    siege: ctx.siege, lieu: ctx.lieu, annee: ctx.annee, numero: ctx.numero, eleve: ctx.eleve };
}

/* Regroupement par entreprise puis par personne, alertes et références (calcul pur). */
function EUC_DEV706_regrouper_(saisies, references) {
  var parEnt = {}, out = [];
  saisies.forEach(function(s) { (parEnt[s.k] = parEnt[s.k] || []).push(s); });
  Object.keys(parEnt).forEach(function(k) {
    var l = parEnt[k], cles = [], parent = {};
    l.forEach(function(s) { if (s.cle && cles.indexOf(s.cle) < 0) cles.push(s.cle); });
    var trouver = function(x) { while (parent[x] && parent[x] !== x) x = parent[x]; return x; };
    cles.forEach(function(c) { parent[c] = c; });
    for (var i = 0; i < cles.length; i++) for (var j = i + 1; j < cles.length; j++) if (EUC_DEV706_proches_(cles[i], cles[j])) parent[trouver(cles[j])] = trouver(cles[i]);
    var groupes = {};
    l.forEach(function(s) {
      var g = s.cle ? trouver(s.cle) : '';
      if (!g) { /* Nom absent : rattaché à la personne qui a ce téléphone ou ce courriel, s'il n'y en a qu'une. */
        var c = {}; l.forEach(function(o) { if (o.cle && ((s.tel && o.tel === s.tel) || (s.courriel && o.courriel === s.courriel))) c[trouver(o.cle)] = true; });
        var ks = Object.keys(c); g = ks.length === 1 ? ks[0] : '#sans-nom';
      }
      (groupes[g] = groupes[g] || []).push(s);
    });
    Object.keys(groupes).forEach(function(g) { out.push(EUC_DEV706_personne_(k, g, groupes[g])); });
  });
  /* Même téléphone ou même courriel pour deux personnes différentes d'une même entreprise. */
  var parTel = {}, parMail = {};
  out.forEach(function(p) {
    p.tels.forEach(function(t) { if (t.ok) (parTel[p.k + '|' + t.cle] = parTel[p.k + '|' + t.cle] || []).push(p); });
    p.courriels.forEach(function(c) { (parMail[p.k + '|' + c.v] = parMail[p.k + '|' + c.v] || []).push(p); });
  });
  var autres = function(l, p) { return l.filter(function(x) { return x !== p; }).map(function(x) { return x.nom; }).join(', '); };
  Object.keys(parTel).forEach(function(c) { var l = parTel[c]; if (l.length > 1) l.forEach(function(p) { p.alertes.push({ n: 1, t: 'Même téléphone que ' + autres(l, p) + ' (standard de l’entreprise ou erreur de saisie).' }); }); });
  Object.keys(parMail).forEach(function(c) { var l = parMail[c]; if (l.length > 1) l.forEach(function(p) { p.alertes.push({ n: 2, t: 'Même courriel que ' + autres(l, p) + '.' }); }); });
  /* Référence enregistrée : retenue, alertes levées sauf saisie nouvelle depuis la validation. */
  (references || []).forEach(function(r) {
    out.filter(function(p) { return p.k === r.k && p.cles.noms.some(function(c) { return r.cles.noms.indexOf(c) >= 0; }); }).forEach(function(p) {
      p.reference = { id: r.id, nom: r.nom, telephone: r.telephone, courriel: r.courriel, le: r.le, par: r.par };
      var nouvelles = p.cles.noms.filter(function(c) { return r.cles.noms.indexOf(c) < 0; }).length + p.cles.tels.filter(function(c) { return r.cles.tels.indexOf(c) < 0; }).length + p.cles.courriels.filter(function(c) { return r.cles.courriels.indexOf(c) < 0; }).length;
      p.alertes = nouvelles ? [{ n: 2, t: 'Nouvelle saisie différente depuis la validation du ' + r.le + ' : à revoir.' }] : [];
    });
  });
  out.forEach(function(p) { p.risque = p.alertes.reduce(function(m, a) { return Math.max(m, a.n); }, 0); });
  return out.sort(function(a, b) { return a.entreprise.localeCompare(b.entreprise, 'fr') || a.nom.localeCompare(b.nom, 'fr'); });
}
function EUC_DEV706_compter_(l, cle, val) {
  var o = {}; l.forEach(function(s) { var c = cle(s); if (!c) return; var x = o[c] = o[c] || { cle: c, v: val(s), n: 0 }; x.n++; });
  return Object.keys(o).map(function(c) { return o[c]; }).sort(function(a, b) { return b.n - a.n || String(a.v).localeCompare(String(b.v), 'fr'); });
}
function EUC_DEV706_personne_(k, g, l) {
  var s0 = l[0], al = [];
  /* Nom proposé : le plus fréquent, puis le plus complet (prénom + nom), puis accentué. */
  var noms = EUC_DEV706_compter_(l, function(s) { return s.nom ? EUC_DEV706_sansAccent_(s.nom) : ''; }, function(s) { return s.nom; }).sort(function(a, b) {
    return b.n - a.n || EUC_DEV706_cleNom_(b.v).split(' ').length - EUC_DEV706_cleNom_(a.v).split(' ').length || Number(/[À-ÿ]/.test(b.v)) - Number(/[À-ÿ]/.test(a.v)) || b.v.length - a.v.length; });
  var tels = EUC_DEV706_compter_(l, function(s) { return s.tel; }, function(s) { return EUC_DEV706_telAffiche_(s.tel); }).map(function(t) { t.ok = EUC_DEV706_telValide_(t.cle); return t; });
  var mails = EUC_DEV706_compter_(l, function(s) { return s.courriel; }, function(s) { return s.courriel; }).map(function(c) { c.ok = EUC_DEV706_courrielValide_(c.v); c.suspect = c.ok && EUC_DEV706_courrielSuspect_(c.v); c.proposition = c.suspect ? EUC_DEV706_proposition_(c.v) : ''; return c; });
  var clesNoms = []; l.forEach(function(s) { if (s.cle && clesNoms.indexOf(s.cle) < 0) clesNoms.push(s.cle); });
  if (g === '#sans-nom') al.push({ n: 3, t: 'Nom absent : téléphone ou courriel saisi sans nom de personne.' });
  else if (clesNoms.length > 1) {
    var court = clesNoms.some(function(c) { return c.split(' ').length === 1; });
    al.push({ n: court ? 2 : 3, t: (court ? 'Nom incomplet ou orthographe différente : ' : 'Orthographes différentes : ') + noms.map(function(x) { return x.v + ' (' + x.n + ')'; }).join(', ') + '.' });
  }
  var nomsGeneriques = typeof EUC_DEV688_MOTS_ !== 'undefined' ? EUC_DEV688_MOTS_ : [];
  if (clesNoms.some(function(c) { return nomsGeneriques.indexOf(c.toUpperCase()) >= 0; })) al.push({ n: 3, t: 'Nom générique (patron, responsable, monsieur…) : pas un nom de personne.' });
  tels.filter(function(t) { return !t.ok; }).forEach(function(t) { al.push({ n: 3, t: 'Téléphone invalide : ' + t.v + ' (10 chiffres en France, +377 à Monaco).' }); });
  if (tels.filter(function(t) { return t.ok; }).length > 1) al.push({ n: 2, t: tels.length + ' téléphones différents : ' + tels.map(function(t) { return t.v + ' (' + t.n + ')'; }).join(', ') + ' — fixe et portable, ou erreur ?' });
  mails.filter(function(c) { return !c.ok; }).forEach(function(c) { al.push({ n: 3, t: 'Courriel mal formé : ' + c.v + '.' }); });
  mails.filter(function(c) { return c.suspect; }).forEach(function(c) { al.push({ n: 3, t: 'Domaine de courriel suspect (faute de frappe probable) : ' + c.v + (c.proposition ? ' — vouliez-vous dire ' + c.proposition + ' ?' : '.') }); });
  if (mails.filter(function(c) { return c.ok; }).length > 1) al.push({ n: 2, t: mails.length + ' courriels différents : ' + mails.map(function(c) { return c.v + ' (' + c.n + ')'; }).join(', ') + '.' });
  if (!tels.length || !mails.length) al.push({ n: 1, t: 'Coordonnées incomplètes : ' + [!tels.length ? 'aucun téléphone' : '', !mails.length ? 'aucun courriel' : ''].filter(Boolean).join(', ') + '.' });
  var u = function(f) { var o = []; l.forEach(function(s) { var v = f(s); if (v && o.indexOf(v) < 0) o.push(v); }); return o; };
  return { id: k + '|' + g, k: k, entreprise: s0.entreprise, identifiant: s0.identifiant, siege: s0.siege, lieux: u(function(s) { return s.lieu || 'SIEGE'; }),
    roles: u(function(s) { return s.role; }).sort(), nom: g === '#sans-nom' ? '(nom absent)' : (noms[0] ? noms[0].v : ''), noms: noms, tels: tels, courriels: mails,
    annees: u(function(s) { return s.annee; }).sort().reverse(), saisies: l.map(function(s) { return { role: s.role, nom: s.nom, tel: s.telBrut, courriel: s.courriel, annee: s.annee, numero: s.numero, eleve: s.eleve, lieu: s.lieu }; }),
    cles: { noms: clesNoms, tels: tels.map(function(t) { return t.cle; }), courriels: mails.map(function(c) { return c.v; }) }, alertes: al, reference: null };
}

/* ---------- Lectures ---------- */
function EUC_DEV706_references_(lignes) {
  var l = lignes || [];
  if (!lignes) { try { l = EUC_IMPORT_lireRecords_(EUC_DEV706_TABLE_) || []; } catch (e) { l = []; } }
  var s = function(v) { return EUC_DEV706_t_(v).split('|').filter(Boolean); };
  return l.filter(function(r) { return r.Actif !== false; }).map(function(r) {
    return { id: Number(r.id), k: EUC_DEV706_t_(r.Cle_entreprise), nom: EUC_DEV706_t_(r.Nom_reference), telephone: EUC_DEV706_t_(r.Telephone_reference), courriel: EUC_DEV706_t_(r.Courriel_reference),
      cles: { noms: s(r.Cles_noms), tels: s(r.Cles_telephones), courriels: s(r.Cles_courriels) }, le: EUC_DEV706_t_(r.Valide_le).slice(0, 10), par: EUC_DEV706_t_(r.Valide_par) };
  });
}
function EUC_DEV706_saisies_() {
  var fiches = EUC_DEV689_fiches_(), out = [], T = EUC_DEV706_t_;
  EUC_DEV688_parcourir_('', function(a, id, e, base) {
    if (e && (e.Donnee_test === true || /^RECETTE/i.test(T(e.Mode_donnee))) || /^TEST\b/i.test(T(base.classe))) return;
    var x = EUC_DEV689_ident_(a, fiches); if (!x) return;
    var voie = T(a.Entreprise_adresse || a.Entreprise_adresse_snapshot), cp = T(a.Entreprise_code_postal || a.Entreprise_code_postal_snapshot), ville = [cp, T(a.Entreprise_commune || a.Entreprise_commune_snapshot)].filter(Boolean).join(' ');
    var siege = cp && voie.indexOf(cp) >= 0 ? voie : [voie, ville].filter(Boolean).join(', ');
    var lieu = typeof EUC_DEV649_lieuTexte_ === 'function' ? T(EUC_DEV649_lieuTexte_(a)) : (T(a.Lieu_stage_adresse) ? [T(a.Lieu_stage_adresse), [T(a.Lieu_stage_code_postal), T(a.Lieu_stage_commune)].filter(Boolean).join(' ')].join(', ') : '');
    var mA = T(base.numero).match(/PFMP-(20\d{2})-/), annee = base.source === 'SOUMISSION' ? (mA ? mA[1] + '-' + (Number(mA[1]) + 1) : '') : T(EUC_PFMP_anneeDossierV148_(a));
    var ctx = { k: x.entreprise, entreprise: T(a.Entreprise_raison_sociale) || x.enseigne || '', identifiant: x.identifiant, siege: siege, lieu: lieu, annee: annee, numero: T(base.numero), eleve: T(base.eleve) };
    [EUC_DEV706_saisie_('RESPONSABLE', a.Responsable_prenom, a.Responsable_nom, a.Responsable_telephone, a.Responsable_courriel, ctx),
     EUC_DEV706_saisie_('TUTEUR', a.Tuteur_prenom, a.Tuteur_nom, a.Tuteur_telephone, a.Tuteur_courriel, ctx)].forEach(function(s) { if (s) out.push(s); });
  });
  return out;
}
function EUC_DEV706_calcul_() {
  var l = EUC_DEV706_regrouper_(EUC_DEV706_saisies_(), EUC_DEV706_references_());
  return { ok: true, version: EUC_DEV706_VERSION_, calculeLe: new Date().toISOString(), personnes: l };
}
/* Liste (admin), mise en cache tant que Grist ne change pas. */
function EUC_DEV706_liste(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var temoin = ''; try { temoin = String(EUC_SUIVI2_temoin_()).replace(/[^\w-]/g, ''); } catch (e) { temoin = ''; }
  var cle = 'EUC_DEV706_' + temoin, m = temoin && !q.forcer ? EUC_DEV572_lire_(cle) : null;
  if (m && m.version === EUC_DEV706_VERSION_) return m;
  m = EUC_DEV706_calcul_();
  if (temoin) EUC_DEV572_ecrire_(cle, m);
  return m;
}

/* ---------- Référence d'une personne : base des contacts uniquement (jamais les conventions) ---------- */
function EUC_DEV706_table_() {
  EUC_DEV562_ensureTable_(EUC_DEV706_TABLE_, [['Cle_entreprise', 'Clé entreprise'], ['Entreprise', 'Entreprise'], ['Identifiant', 'SIRET / NIS'], ['Roles', 'Rôles'], ['Nom_reference', 'Nom de référence'],
    ['Telephone_reference', 'Téléphone de référence'], ['Courriel_reference', 'Courriel de référence'], ['Cles_noms', 'Variantes de nom regroupées'], ['Cles_telephones', 'Téléphones regroupés'], ['Cles_courriels', 'Courriels regroupés'],
    ['Motif', 'Motif'], ['Valide_par', 'Validé par'], ['Valide_le', 'Validé le', 'DateTime'], ['Actif', 'Actif', 'Bool']]);
}
/* Contrôle de la saisie (calcul pur). */
function EUC_DEV706_preparer_(q) {
  q = q || {};
  var T = EUC_DEV706_t_, nom = T(q.nom).slice(0, 120), tel = EUC_DEV706_tel_(q.telephone), mail = EUC_DEV706_courriel_(q.courriel), k = T(q.k);
  if (!k) throw new Error('Entreprise inconnue.');
  if (!nom || !EUC_DEV706_cleNom_(nom)) throw new Error('Indiquez le nom de référence (prénom et nom).');
  if (tel && !EUC_DEV706_telValide_(tel)) throw new Error('Téléphone de référence invalide : 10 chiffres en France, +377 à Monaco.');
  if (mail && !EUC_DEV706_courrielValide_(mail)) throw new Error('Courriel de référence mal formé.');
  var cles = q.cles || {}, liste = function(v) { return (Array.isArray(v) ? v : []).map(T).filter(Boolean).slice(0, 40); };
  var noms = liste(cles.noms); if (noms.indexOf(EUC_DEV706_cleNom_(nom)) < 0) noms.push(EUC_DEV706_cleNom_(nom));
  return { k: k, champs: { Cle_entreprise: k, Entreprise: T(q.entreprise).slice(0, 250), Identifiant: T(q.identifiant).slice(0, 40), Roles: liste(q.roles).join(', '),
    Nom_reference: nom, Telephone_reference: tel ? EUC_DEV706_telAffiche_(tel) : '', Courriel_reference: mail, Cles_noms: noms.join('|'), Cles_telephones: liste(cles.tels).join('|'),
    Cles_courriels: liste(cles.courriels).join('|'), Motif: T(q.motif).slice(0, 300), Actif: true } };
}
function EUC_DEV706_enregistrer(q) {
  var ctx = EUC_ADMIN_WORKFLOW_ctxV144_() || {}; q = q || {};
  var p = EUC_DEV706_preparer_(q), verrou = LockService.getScriptLock();
  if (!verrou.tryLock(20000)) throw new Error('Un autre enregistrement est en cours. Réessayez.');
  try {
    EUC_DEV706_table_();
    p.champs.Valide_par = EUC_DEV706_t_(ctx.email || (typeof Session !== 'undefined' ? Session.getActiveUser().getEmail() : ''));
    p.champs.Valide_le = new Date().toISOString();
    var id = Number(q.referenceId) || 0, t = '/tables/' + EUC_DEV706_TABLE_ + '/records';
    if (id) EUC_ENT_grist('patch', t, { records: [{ id: id, fields: p.champs }] });
    else EUC_ENT_grist('post', t, { records: [{ fields: p.champs }] });
  } finally { verrou.releaseLock(); }
  return EUC_DEV706_liste({ forcer: true });
}
/* Retirer une référence : rien n'est supprimé, la ligne est désactivée. */
function EUC_DEV706_retirer(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var id = Number(q.referenceId) || 0; if (!id) throw new Error('Référence inconnue.');
  EUC_ENT_grist('patch', '/tables/' + EUC_DEV706_TABLE_ + '/records', { records: [{ id: id, fields: { Actif: false, Valide_le: new Date().toISOString() } }] });
  return EUC_DEV706_liste({ forcer: true });
}
function EUC_DEV706_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Contacts_Entreprises_DEV706');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Fiabiliser les contacts entreprises').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
