/**
 * DEV705 — Lieu de stage distinct du siège sur toutes les cartes d'entreprises.
 *
 * Constat : plusieurs entreprises ont leur siège loin du lieu où l'élève travaille (TECHNIDRILL à Chassieu,
 * stage près de Nice). Les cartes n'affichaient que le siège.
 *
 * Règles :
 *  - source : Lieu_stage_adresse / Lieu_stage_code_postal / Lieu_stage_commune des conventions et des dépôts
 *    en ligne (EUC_DEV688_parcourir_) ; pour la carte du suivi, la fiche du modèle EUC_SUIVI2 (même règle) ;
 *  - un lieu qui recopie le siège ne compte pas (DEV662) ; un simple numéro ajouté à la voie du siège est le
 *    siège, plus précis (DEV666) : pas de second point ;
 *  - le lieu est géocodé comme le siège : même table (EUC_DEV441), même moteur (EUC_DEV583_geocoder_ : BAN pour
 *    la France, Nominatim pour Monaco). La ligne porte le nom de l'entreprise et l'adresse du lieu, sans SIRET,
 *    pour ne jamais remplacer la position du siège (recherchée d'abord par SIRET) ;
 *  - un lieu à moins de 50 m du siège n'est pas affiché (même endroit) ;
 *  - seules des adresses d'entreprises et des nombres d'élèves sont servis : aucun nom d'élève.
 *  - le géocodage (écriture dans la table de géocodage) n'est déclenché que pour les personnels, comme DEV583.
 */
var EUC_DEV705_VERSION_ = '1.0.0-dev.705';
var EUC_DEV705_DISTANCE_MIN_KM_ = 0.05;

function EUC_DEV705_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV705_nom_(v) {
  return EUC_DEV705_t_(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(SARL|SAS|SASU|SA|EURL|ETS|ETABLISSEMENTS?)\b/g, ' ').replace(/[^A-Z0-9]+/g, ' ').trim();
}
function EUC_DEV705_siret_(v) { var s = EUC_DEV705_t_(v).replace(/\D/g, ''); return s.length === 14 ? s : ''; }

/* Lieu de stage distinct du siège pour une convention ou un dépôt (calcul pur) ; vide si le stage a lieu au siège. */
function EUC_DEV705_lieuDistinct_(a) {
  a = a || {};
  var texte = EUC_DEV649_lieuTexte_(a);
  if (!texte) return '';
  /* DEV666 : même voie, même ville, numéro ajouté = siège numéroté, pas un autre lieu. */
  if (EUC_DEV705_t_(a.Entreprise_commune) && EUC_DEV659_comparerLieu_({ adresse: a.Lieu_stage_adresse, commune: a.Lieu_stage_commune },
    { adresse: [EUC_DEV705_t_(a.Entreprise_adresse), EUC_DEV705_t_(a.Entreprise_complement)].filter(Boolean).join(', '), commune: a.Entreprise_commune }) === 'PRECISION') return '';
  return texte;
}

/* Année scolaire d'une convention ou d'un dépôt : champ, sinon n° PFMP-AAAA-, sinon date de début. */
function EUC_DEV705_annee_(a, base) {
  var an = '';
  try { an = typeof EUC_PFMP_anneeDossierV148_ === 'function' ? EUC_DEV705_t_(EUC_PFMP_anneeDossierV148_(Object.assign({}, a, { Numero_enregistrement: a.Numero_enregistrement || (base && base.numero) || '' }))) : ''; } catch (e) { an = ''; }
  if (/^20\d{2}-20\d{2}$/.test(an)) return an;
  var d = EUC_DEV705_t_(base && (base.debut || base.periodeDebut)), m = d.match(/^(20\d{2})-(\d{2})/);
  if (!m) return '';
  var y = Number(m[1]) - (Number(m[2]) < 8 ? 1 : 0);
  return y + '-' + (y + 1);
}

/* Index de toutes les années (calcul pur à partir d'un parcours) : une ligne par entreprise, année et lieu. */
function EUC_DEV705_construireIndex_(parcourir) {
  var par = {}, out = [];
  parcourir(function(a, id, e, base) {
    base = base || {};
    if (e && (e.Donnee_test === true || /^RECETTE/i.test(EUC_DEV705_t_(e.Mode_donnee))) || /^TEST\b/i.test(EUC_DEV705_t_(base.classe))) return;
    var lieu = EUC_DEV705_lieuDistinct_(a);
    if (!lieu) return;
    var entreprise = EUC_DEV705_t_(a.Entreprise_raison_sociale || a.Entreprise_enseigne), siret = EUC_DEV705_siret_(a.Entreprise_siret || a.Entreprise_siret_snapshot);
    if (!entreprise && !siret) return;
    var annee = EUC_DEV705_annee_(a, base), k = [annee, siret || EUC_DEV705_nom_(entreprise), EUC_DEV705_nom_(lieu)].join('|'), x = par[k];
    if (!x) { x = par[k] = { a: annee, s: siret, n: EUC_DEV705_nom_(entreprise), l: lieu, k: 0, v: {} }; out.push(x); }
    var ev = String(base.eleveId || (id && id.id) || base.id || out.length);
    if (!x.v[ev]) { x.v[ev] = true; x.k++; }
  });
  return out.map(function(x) { return { a: x.a, s: x.s, n: x.n, l: x.l, k: x.k }; });
}

/* Index servi depuis le cache tant que Grist ne change pas (témoin du suivi). */
function EUC_DEV705_index_() {
  var temoin = '';
  try { temoin = typeof EUC_SUIVI2_temoin_ === 'function' ? EUC_DEV705_t_(EUC_SUIVI2_temoin_()) : ''; } catch (eT) { temoin = ''; }
  var cle = temoin ? 'EUC_DEV705_IX_' + EUC_DEV705_VERSION_.replace(/[^\w]/g, '') + '_' + temoin.replace(/[^\w-]/g, '') : '';
  var memo = cle && typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (Array.isArray(memo)) return memo;
  var ix = EUC_DEV705_construireIndex_(function(fn) { EUC_DEV688_parcourir_('', fn); });
  if (cle && typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, ix);
  return ix;
}

/* Lieux connus d'une entreprise (calcul pur) : par SIRET quand les deux en ont un, sinon par nom ; { texte: élèves }. */
function EUC_DEV705_lieuxDe_(index, annees, entreprise, siret) {
  var ok = {}; (annees || []).forEach(function(a) { if (a) ok[a] = true; });
  var tous = !Object.keys(ok).length, s = EUC_DEV705_siret_(siret), n = EUC_DEV705_nom_(entreprise), out = {};
  (index || []).forEach(function(x) {
    if (!tous && !ok[x.a]) return;
    if (!(s && x.s ? x.s === s : n && x.n === n)) return;
    out[x.l] = (out[x.l] || 0) + Number(x.k || 0);
  });
  return out;
}

function EUC_DEV705_km_(a, b, c, d) {
  var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
  return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
}

/* Position d'un lieu : identité nom + adresse du lieu, sinon empreinte de l'adresse ; jamais le SIRET (= siège). */
function EUC_DEV705_position_(ix, entreprise, lieu) {
  var l = [ix.identite[EUC_DEV443_geoIdentity_(entreprise, lieu, '')], ix.adresse[EUC_DEV445_geoAddressFingerprint_(lieu)]];
  for (var i = 0; i < l.length; i++) if (EUC_DEV583_valide_(l[i])) return l[i];
  return l.filter(Boolean)[0] || null;
}

/* Calcul pur : chaque point portant _lieux { texte: élèves } reçoit lieux [{ adresse, latitude, longitude, eleves }]. */
function EUC_DEV705_positionner_(points, ix) {
  var sans = [], total = 0;
  (points || []).forEach(function(p) {
    var src = p._lieux || {}, lieux = [];
    delete p._lieux;
    Object.keys(src).sort().forEach(function(texte) {
      var g = EUC_DEV705_position_(ix, p.entreprise, texte), n = Number(src[texte]) || 0;
      if (!EUC_DEV583_valide_(g)) { sans.push({ entreprise: p.entreprise, adresse: texte, siret: '', eleves: n, statut: g ? EUC_DEV705_t_(g.Statut) : 'A_GEOCODER' }); return; }
      var lat = Number(g.Latitude), lon = Number(g.Longitude);
      if (isFinite(Number(p.latitude)) && isFinite(Number(p.longitude)) && EUC_DEV705_km_(Number(p.latitude), Number(p.longitude), lat, lon) < EUC_DEV705_DISTANCE_MIN_KM_) return;
      if (lieux.some(function(x) { return Math.abs(x.latitude - lat) < 1e-6 && Math.abs(x.longitude - lon) < 1e-6; })) { lieux.filter(function(x) { return Math.abs(x.latitude - lat) < 1e-6 && Math.abs(x.longitude - lon) < 1e-6; })[0].eleves += n; return; }
      lieux.push({ adresse: texte, latitude: lat, longitude: lon, eleves: n, km: Math.round(EUC_DEV705_km_(Number(p.latitude), Number(p.longitude), lat, lon)) });
    });
    if (lieux.length) { p.lieux = lieux; total += lieux.length; }
  });
  return { lieux: total, sansPosition: sans };
}

/* Place les lieux des points (_lieux) ; géocode d'abord un lot de lieux sans position (personnels seulement). */
function EUC_DEV705_placer_(points, ix, geocoder) {
  var copie = (points || []).map(function(p) { return p._lieux ? JSON.parse(JSON.stringify(p._lieux)) : null; });
  ix = ix || EUC_DEV583_indexGeo_(EUC_DEV441_geoRows_());
  var r = EUC_DEV705_positionner_(points, ix), geocodes = 0;
  if (geocoder && r.sansPosition.some(function(x) { return x.statut === 'A_GEOCODER'; })) {
    try { geocodes = EUC_DEV583_geocoder_(r.sansPosition, ix); } catch (eG) { geocodes = 0; }
    if (geocodes) {
      (points || []).forEach(function(p, i) { delete p.lieux; if (copie[i]) p._lieux = copie[i]; });
      r = EUC_DEV705_positionner_(points, EUC_DEV583_indexGeo_(EUC_DEV441_geoRows_()));
    }
  }
  return { lieux: r.lieux, sansPosition: r.sansPosition, geocodes: geocodes };
}

/* Points d'une carte (book, ancienne carte) : rattache les lieux connus de chaque entreprise pour les années données. */
function EUC_DEV705_enrichir_(points, annees, geocoder) {
  points = points || [];
  var index = [];
  try { index = EUC_DEV705_index_(); } catch (eI) { return { lieux: 0, sansPosition: [], geocodes: 0, erreur: 'Lieux de stage indisponibles.' }; }
  points.forEach(function(p) {
    var l = EUC_DEV705_lieuxDe_(index, annees, p.entreprise, p.siret);
    if (Object.keys(l).length) p._lieux = l;
  });
  if (!points.some(function(p) { return p._lieux; })) return { lieux: 0, sansPosition: [], geocodes: 0 };
  return EUC_DEV705_placer_(points, null, geocoder);
}

/* Lieux d'une seule entreprise (bouton « Voir sur la carte » du book) ; aucune donnée nominative. */
function EUC_DEV705_lieuxEntreprise(q) {
  q = q || {};
  var mode = EUC_DEV705_t_(q.mode).toUpperCase(), staff = false;
  if (mode === 'ADMIN') { EUC_DEV538_admin_(); staff = true; }
  else { try { staff = EUC_DEV538_staffAllowed_(); } catch (eS) { staff = false; } }
  var entreprise = EUC_DEV705_t_(q.entreprise), annees;
  if (!entreprise) throw new Error('Entreprise non précisée.');
  if (staff) annees = EUC_DEV538_yearsForScope_({ annee: q.annee, fenetre: q.fenetre });
  else {
    /* Élèves et familles : seulement une entreprise du book public, sur ses 3 dernières années. */
    var cle = EUC_DEV538_norm_(entreprise);
    if (!EUC_DEV549_publicBookIndex_().some(function(c) { return EUC_DEV538_norm_(c.entreprise) === cle; })) throw new Error('Entreprise absente du book public.');
    annees = EUC_DEV538_yearsForScope_({ annee: 'ALL', fenetre: 3 });
  }
  var p = { entreprise: entreprise, siret: staff ? EUC_DEV705_t_(q.siret) : '', latitude: Number(q.latitude), longitude: Number(q.longitude) };
  var r = EUC_DEV705_enrichir_([p], annees, staff);
  return { ok: true, version: EUC_DEV705_VERSION_, lieux: p.lieux || [], lieuxSansPositionTotal: r.sansPosition.length, erreur: r.erreur || '' };
}
