/**
 * DEV703 — Statistiques : distance domicile → lieu de stage, en voiture.
 *
 * Origine : adresse exacte de l'élève (import Pronote : Adresse_1 à 4, code postal, ville), à défaut celle de
 * son responsable en charge puis de son responsable légal. Destination : adresse du lieu de stage s'il est
 * distinct, sinon adresse de l'entreprise. Itinéraire Google en voiture (même service que « Mes visites »).
 *
 * Aucune adresse n'est enregistrée ni renvoyée à la page : seule une empreinte (SHA-256 tronquée) du couple
 * d'adresses est gardée avec les kilomètres et les minutes, dans un fichier Drive du compte de déploiement
 * par année scolaire. La page ne reçoit que les distances par convention. Une adresse modifiée change l'empreinte
 * et sa distance est recalculée. Calcul par lots courts (bouton « Calculer les distances »), jamais en tâche
 * planifiée. Aucune écriture Grist.
 */
var EUC_DEV703_BUDGET_MS_ = 50000;

function EUC_DEV703_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }

/* Adresse postale exacte (calcul pur) : voie obligatoire, avec code postal ou ville ; '' sinon. */
function EUC_DEV703_adresse_(voie, cp, ville) {
  var T = EUC_DEV703_t_, v = T(voie), c = (T(cp).match(/\d{5}/) || [''])[0], vi = T(ville);
  if (!v || !/[A-Za-zÀ-ÿ]{3,}/.test(v) || (!c && !vi)) return '';
  return [v, [c, vi].filter(Boolean).join(' ')].join(', ');
}
function EUC_DEV703_voie_(f) {
  return ['Adresse_1', 'Adresse_2', 'Adresse_3', 'Adresse_4'].map(function(k) { return EUC_DEV703_t_(f && f[k]); }).filter(Boolean).join(', ') || EUC_DEV703_t_(f && (f.Adresse || f.Adresse_postale));
}
/* Domicile de l'élève : sa fiche, sinon responsable en charge, sinon responsable légal (calcul pur). */
function EUC_DEV703_domicile_(e, resps) {
  var a = EUC_DEV703_adresse_(EUC_DEV703_voie_(e), e && e.Code_postal, e && e.Ville);
  if (a) return a;
  var l = (resps || []).slice().sort(function(x, y) { return Number(y.Responsable_en_charge === true) - Number(x.Responsable_en_charge === true) || Number(y.Responsable_legal === true) - Number(x.Responsable_legal === true); });
  for (var i = 0; i < l.length; i++) { a = EUC_DEV703_adresse_(EUC_DEV703_voie_(l[i]), l[i].Code_postal, l[i].Ville); if (a) return a; }
  return '';
}
/* Lieu de stage : adresse du lieu s'il est distinct, sinon de l'entreprise (convention puis fiche) (calcul pur). */
function EUC_DEV703_lieu_(a, fiche) {
  var T = EUC_DEV703_t_, f = fiche || {};
  var l = EUC_DEV703_adresse_(a.Lieu_stage_adresse, a.Lieu_stage_code_postal, a.Lieu_stage_commune);
  if (l) return l;
  var cp = T(a.Entreprise_code_postal || a.Entreprise_code_postal_snapshot || f.Code_postal), ville = T(a.Entreprise_commune || a.Entreprise_commune_snapshot || f.Commune || f.Ville);
  return EUC_DEV703_adresse_(T(a.Entreprise_adresse || a.Entreprise_adresse_snapshot) || T(f.Numero_voie || f.Adresse), cp, ville)
    || (T(f.Adresse_complete) && /\d{5}/.test(f.Adresse_complete) ? T(f.Adresse_complete) : '');
}
function EUC_DEV703_pays_(adresse) { return /\b980\d\d\b/.test(adresse) ? 'Monaco' : 'France'; }
function EUC_DEV703_empreinte_(o, d) {
  var n = function(s) { return EUC_DEV703_t_(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim(); };
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, n(o) + '|' + n(d), Utilities.Charset.UTF_8)).replace(/[^A-Za-z0-9]/g, '').slice(0, 14);
}

/* ---------- Stockage : « empreinte:km:min;… » par année, dans un fichier Drive du compte de déploiement
 * (les propriétés du script sont déjà pleines). Le fichier ne contient ni adresse ni nom. ---------- */
function EUC_DEV703_nomFichier_(annee) { return 'Eucalyptus PFMP - distances domicile-stage ' + String(annee || 'ALL').replace(/[^\d-]/g, '') + '.txt'; }
function EUC_DEV703_fichier_(annee, creer) {
  var nom = EUC_DEV703_nomFichier_(annee), cache = null, id = '';
  try { cache = CacheService.getScriptCache(); id = cache.get('EUC_DEV703_F_' + nom) || ''; } catch (eC) {}
  if (id) { try { var f0 = DriveApp.getFileById(id); if (!f0.isTrashed()) return f0; } catch (eF) {} }
  var it = DriveApp.getRootFolder().getFilesByName(nom), f = it.hasNext() ? it.next() : creer ? DriveApp.getRootFolder().createFile(nom, '', 'text/plain') : null;
  try { if (f && cache) cache.put('EUC_DEV703_F_' + nom, f.getId(), 21600); } catch (eP) {}
  return f;
}
function EUC_DEV703_lireStock_(annee) {
  var f = EUC_DEV703_fichier_(annee, false), m = {};
  (f ? f.getBlob().getDataAsString('UTF-8') : '').split(';').forEach(function(x) { var c = x.split(':'); if (c.length === 3 && c[0]) m[c[0]] = [Number(c[1]), Number(c[2])]; });
  return m;
}
function EUC_DEV703_ecrireStock_(annee, m) {
  EUC_DEV703_fichier_(annee, true).setContent(Object.keys(m).map(function(h) { return h + ':' + m[h][0] + ':' + m[h][1]; }).join(';'));
}

/* Couples d'adresses de l'année, par convention (jamais renvoyés à la page). */
function EUC_DEV703_paires_(annee) {
  var resps = {}, fiches = EUC_DEV689_fiches_(), out = [];
  try {
    (EUC_IMPORT_lireRecords_(typeof EUC_IMPORT_RESP_TABLE_ === 'string' ? EUC_IMPORT_RESP_TABLE_ : 'EUC_RESPONSABLES_ELEVES_PFMP') || []).forEach(function(r) {
      var id = Number(EUC_PFMP_ref_(r.Eleve)) || 0; if (id) (resps[id] = resps[id] || []).push(r);
    });
  } catch (eR) {}
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    /* Élève ou classe d'essai : exclus comme dans les statistiques (DEV701). */
    if (e && (e.Donnee_test === true || /^RECETTE/i.test(EUC_DEV703_t_(e.Mode_donnee))) || /^TEST\b/i.test(EUC_DEV703_t_(base.classe))) return;
    var o = EUC_DEV703_domicile_(e, resps[Number(base.eleveId)]), d = EUC_DEV703_lieu_(a, fiches[Number(EUC_PFMP_ref_(a.Entreprise)) || 0]);
    out.push({ id: String(base.id), o: o, d: d, h: o && d ? EUC_DEV703_empreinte_(o, d) : '' });
  });
  return out;
}
/* Vue envoyée à la page (calcul pur) : par convention [km, minutes], ou un code. */
function EUC_DEV703_vue_(paires, stock) {
  var par = {}, n = { calculees: 0, aCalculer: 0, sansDomicile: 0, sansLieu: 0, introuvables: 0 };
  paires.forEach(function(x) {
    var v = !x.o ? 'DOMICILE' : !x.d ? 'LIEU' : !stock[x.h] ? 'A_CALCULER' : stock[x.h][0] < 0 ? 'INTROUVABLE' : stock[x.h];
    par[x.id] = v;
    if (Array.isArray(v)) n.calculees++; else if (v === 'A_CALCULER') n.aCalculer++; else if (v === 'DOMICILE') n.sansDomicile++; else if (v === 'LIEU') n.sansLieu++; else n.introuvables++;
  });
  return { ok: true, parConvention: par, compte: n };
}
function EUC_DEV703_itineraire_(o, d) {
  var r = Maps.newDirectionFinder().setOrigin(o + ', ' + EUC_DEV703_pays_(o)).setDestination(d + ', ' + EUC_DEV703_pays_(d)).setMode(Maps.DirectionFinder.Mode.DRIVING).setLanguage('fr').getDirections();
  var leg = r && r.routes && r.routes[0] && r.routes[0].legs && r.routes[0].legs[0];
  if (!leg || !leg.distance || r.status && r.status !== 'OK') return [-1, -1];
  return [Math.round(Number(leg.distance.value) / 100) / 10, Math.round(Number(leg.duration && leg.duration.value || 0) / 60)];
}

/* Lecture seule des distances déjà calculées. */
function EUC_DEV703_distances(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = EUC_DEV703_t_(q.annee);
  var v = EUC_DEV703_vue_(EUC_DEV703_paires_(annee), EUC_DEV703_lireStock_(annee)); v.annee = annee; return v;
}
/* Calcul d'un lot de distances manquantes (≈ 50 s), puis vue à jour. La page relance tant qu'il en reste. */
function EUC_DEV703_calculer(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = EUC_DEV703_t_(q.annee), verrou = LockService.getScriptLock();
  if (!verrou.tryLock(15000)) throw new Error('Un calcul des distances est déjà en cours. Réessayez dans une minute.');
  try {
    var paires = EUC_DEV703_paires_(annee), stock = EUC_DEV703_lireStock_(annee), t0 = Date.now(), faits = 0, limite = '', vus = {};
    for (var i = 0; i < paires.length; i++) {
      var x = paires[i]; if (!x.h || stock[x.h] || vus[x.h]) continue;
      if (Date.now() - t0 > EUC_DEV703_BUDGET_MS_) break;
      vus[x.h] = true;
      try { stock[x.h] = EUC_DEV703_itineraire_(x.o, x.d); faits++; }
      catch (e) { if (/too many|trop|quota|limit/i.test(String(e && e.message || e))) { limite = 'Quota quotidien d’itinéraires Google atteint : reprenez demain.'; break; } stock[x.h] = [-1, -1]; }
    }
    /* Seules les empreintes de l'année sont gardées : une adresse corrigée ne laisse pas d'ancienne entrée. */
    var utiles = {}; paires.forEach(function(p) { if (p.h && stock[p.h]) utiles[p.h] = stock[p.h]; });
    EUC_DEV703_ecrireStock_(annee, utiles);
    var v = EUC_DEV703_vue_(paires, utiles); v.annee = annee; v.faits = faits; v.limite = limite; return v;
  } finally { verrou.releaseLock(); }
}
