/**
 * DEV653 — « Mes visites », lot 2 : visites effectuées et kilomètres de la tournée.
 *
 * Pour chaque élève, le professeur visiteur coche « J'y suis allé » : date, lieu de départ, heures, moyen
 * de transport. Le lieu de départ suit la règle de la page 2 : D (domicile), EK (lycée) ou le numéro de
 * la visite faite juste avant (tournée). Les kilomètres du trajet départ → lieu de visite sont calculés
 * par l'itinéraire Google (voiture) et restent modifiables (autre itinéraire) ; l'écart est signalé.
 * L'adresse du domicile n'est jamais enregistrée : elle reste sur l'appareil du professeur et n'est
 * envoyée que pour le calcul. La page 2 sort pré-remplie (procédure interne).
 * Table Grist créée au besoin : EUC_VISITES_PFMP (une ligne par élève visité et par période).
 */
var EUC_DEV653_TABLE_ = 'EUC_VISITES_PFMP';
var EUC_DEV653_TRANSPORTS_ = ['Véhicule personnel', 'Bus', 'Tramway', 'Train', 'À pied', 'Visioconférence'];
var EUC_DEV653_SANS_KM_ = ['Visioconférence', 'À pied', 'Bus', 'Tramway', 'Train'];

function EUC_DEV653_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }

function EUC_DEV653_table_() {
  var c = null; try { c = CacheService.getScriptCache(); if (c.get('EUC_DEV653_TABLE_OK') === 'OK') return; } catch (e) {}
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; });
  var col = function(id, label, type) { return { id: id, fields: { label: label, type: type || 'Text' } }; };
  if (ids.indexOf(EUC_DEV653_TABLE_) < 0) EUC_ENT_grist('post', '/tables', { tables: [{ id: EUC_DEV653_TABLE_, columns: [
    col('Annee_scolaire', 'Année scolaire'), col('Classe_id', 'Classe (id)', 'Int'), col('Periode_id', 'Période (id)', 'Int'), col('Eleve_id', 'Élève (id)', 'Int'),
    col('Professeur', 'Professeur visiteur'), col('Date_visite', 'Date de la visite'), col('Depart', 'Lieu de départ (D, EK ou n°)'), col('Heure_arrivee', 'Heure d’arrivée'),
    col('Heure_depart', 'Heure de départ'), col('Transport', 'Moyen de transport'), col('Adresse_visite', 'Adresse de la visite'), col('Km_calcules', 'Km calculés', 'Numeric'),
    col('Km_retenus', 'Km déclarés', 'Numeric'), col('Km_motif', 'Motif de l’écart de km'), col('Modifie_le', 'Modifié le')] }] });
  try { if (c) c.put('EUC_DEV653_TABLE_OK', 'OK', 21600); } catch (e2) {}
}
function EUC_DEV653_lire_(j) {
  EUC_DEV653_table_();
  var q = '/tables/' + EUC_DEV653_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ Annee_scolaire: [String(j.annee)], Classe_id: [Number(j.classeId)], Periode_id: [Number(j.periodeId)] }));
  var m = {};
  (EUC_ENT_grist('get', q).records || []).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV653_t_(f.Professeur) === j.prof) m[Number(f.Eleve_id) || 0] = Object.assign({ id: r.id }, f); });
  return m;
}
/* Calcul pur : vue d'une visite enregistrée. */
function EUC_DEV653_vue_(f) {
  if (!f || !EUC_DEV653_t_(f.Date_visite)) return null;
  var calc = f.Km_calcules === '' || f.Km_calcules == null ? null : Number(f.Km_calcules), ret = f.Km_retenus === '' || f.Km_retenus == null ? null : Number(f.Km_retenus);
  return { date: EUC_DEV653_t_(f.Date_visite), depart: EUC_DEV653_t_(f.Depart), heureArrivee: EUC_DEV653_t_(f.Heure_arrivee), heureDepart: EUC_DEV653_t_(f.Heure_depart),
    transport: EUC_DEV653_t_(f.Transport), kmCalcules: calc, km: ret, motif: EUC_DEV653_t_(f.Km_motif), ecart: calc != null && ret != null && Math.abs(ret - calc) >= 1 };
}
/* Adresse de visite d'une ligne : lieu de stage s'il existe, sinon siège. */
function EUC_DEV653_adresse_(l) { return EUC_DEV653_t_(l && (l.lieuStage || l.siege)); }

/* ---------- Distance (itinéraire voiture, mise en cache) ---------- */
function EUC_DEV653_distanceKm_(origine, destination) {
  origine = EUC_DEV653_t_(origine); destination = EUC_DEV653_t_(destination);
  if (!origine || !destination) return null;
  var cle = 'EUC_DEV653_KM_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, origine.toLowerCase() + '|' + destination.toLowerCase(), Utilities.Charset.UTF_8)).slice(0, 40), cache = CacheService.getScriptCache();
  var c = cache.get(cle); if (c) return Number(c);
  var r = Maps.newDirectionFinder().setOrigin(origine + ', France').setDestination(destination + ', France').setMode(Maps.DirectionFinder.Mode.DRIVING).setLanguage('fr').getDirections();
  var leg = r && r.routes && r.routes[0] && r.routes[0].legs && r.routes[0].legs[0];
  if (!leg || !leg.distance) return null;
  var km = Math.round(Number(leg.distance.value) / 1000);
  try { cache.put(cle, String(km), 21600); } catch (e) {}
  return km;
}

/* Calcul pur : contrôle de la saisie ; renvoie origine du trajet et champs à écrire (sans les km). */
function EUC_DEV653_preparer_(q, g, eleveId, adresseLycee) {
  q = q || {};
  var lignes = g.lignes || [], idx = -1;
  lignes.forEach(function(l, i) { if (l.eleveId === eleveId) idx = i; });
  if (idx < 0) throw new Error('Cet élève ne fait pas partie de vos visites pour cette période.');
  var date = EUC_DEV653_t_(q.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Indiquez la date de la visite.');
  var heure = function(v, nom) { v = EUC_DEV653_t_(v); if (v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error('Heure ' + nom + ' invalide.'); return v; };
  var transport = EUC_DEV653_t_(q.transport) || 'Véhicule personnel';
  if (EUC_DEV653_TRANSPORTS_.indexOf(transport) < 0) throw new Error('Moyen de transport inconnu.');
  var depart = EUC_DEV653_t_(q.depart).toUpperCase(), origine = '';
  if (transport === 'Visioconférence') depart = '';
  else if (depart === 'D') origine = EUC_DEV653_t_(q.domicile);
  else if (depart === 'EK') origine = EUC_DEV653_t_(adresseLycee);
  else if (/^\d+$/.test(depart)) {
    var n = Number(depart);
    if (n < 1 || n > lignes.length) throw new Error('Lieu de départ : numéro de visite inconnu.');
    if (n === idx + 1) throw new Error('Lieu de départ : choisissez une autre visite que celle-ci.');
    origine = EUC_DEV653_adresse_(lignes[n - 1]);
  } else throw new Error('Indiquez le lieu de départ : domicile, lycée ou visite précédente.');
  var saisi = EUC_DEV653_t_(q.km).replace(',', '.');
  if (saisi && !(/^\d{1,4}(\.\d)?$/.test(saisi))) throw new Error('Nombre de kilomètres invalide.');
  return { origine: origine, destination: EUC_DEV653_adresse_(lignes[idx]), kmSaisis: saisi === '' ? null : Number(saisi), sansKm: EUC_DEV653_SANS_KM_.indexOf(transport) >= 0,
    champs: { Date_visite: date, Depart: depart, Heure_arrivee: heure(q.heureArrivee, 'd’arrivée'), Heure_depart: heure(q.heureDepart, 'de départ'), Transport: transport,
      Adresse_visite: EUC_DEV653_adresse_(lignes[idx]), Km_motif: EUC_DEV653_t_(q.motif).slice(0, 300) } };
}

function EUC_DEV653_adresseLycee_() {
  try { return EUC_PARAM_CONV_lire_().ADRESSE || '7 avenue des Eucalyptus, 06200 Nice'; } catch (e) { return '7 avenue des Eucalyptus, 06200 Nice'; }
}

function EUC_DEV653_enregistrerVisite(q) {
  q = q || {};
  var j = EUC_DEV652_lireJeton_(q.t), eleveId = Number(q.eleveId) || 0, g = EUC_DEV652_groupe_(j);
  var p = EUC_DEV653_preparer_(q, g, eleveId, EUC_DEV653_adresseLycee_());
  var kmCalc = null;
  if (p.sansKm) kmCalc = 0;
  else { try { kmCalc = EUC_DEV653_distanceKm_(p.origine, p.destination); } catch (e) { kmCalc = null; } }
  var km = p.kmSaisis != null ? p.kmSaisis : kmCalc;
  if (km == null) throw new Error(EUC_DEV653_t_(q.depart).toUpperCase() === 'D' && !EUC_DEV653_t_(q.domicile) ? 'Indiquez votre adresse de départ, ou saisissez les kilomètres vous-même.' : 'Itinéraire introuvable : saisissez les kilomètres vous-même.');
  var champs = p.champs;
  champs.Km_calcules = kmCalc; champs.Km_retenus = km;
  champs.Modifie_le = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd HH:mm');
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(20000)) throw new Error('Un autre enregistrement est en cours. Réessayez.');
  try {
    var exist = EUC_DEV653_lire_(j)[eleveId], t = '/tables/' + EUC_DEV653_TABLE_ + '/records';
    if (exist) EUC_ENT_grist('patch', t, { records: [{ id: exist.id, fields: champs }] });
    else EUC_ENT_grist('post', t, { records: [{ fields: Object.assign({ Annee_scolaire: String(j.annee), Classe_id: Number(j.classeId), Periode_id: Number(j.periodeId), Eleve_id: eleveId, Professeur: j.prof }, champs) }] });
  } finally { verrou.releaseLock(); }
  return EUC_DEV652_ouvrir({ t: q.t });
}
function EUC_DEV653_retirerVisite(q) {
  q = q || {};
  var j = EUC_DEV652_lireJeton_(q.t), exist = EUC_DEV653_lire_(j)[Number(q.eleveId) || 0];
  /* Pas de suppression : la ligne est vidée (trace conservée par Modifie_le). */
  if (exist) EUC_ENT_grist('patch', '/tables/' + EUC_DEV653_TABLE_ + '/records', { records: [{ id: exist.id, fields: { Date_visite: '', Depart: '', Heure_arrivee: '', Heure_depart: '', Transport: '', Km_calcules: null, Km_retenus: null, Km_motif: '',
    Modifie_le: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd HH:mm') } }] });
  return EUC_DEV652_ouvrir({ t: q.t });
}

/* Calcul pur : cellules de la page 2 pour une visite (date, départ, arrivée, km, départ, transport). */
function EUC_DEV653_cellules_(v) {
  if (!v) return null;
  var km = v.transport === 'Visioconférence' ? 'visio' : (v.km == null ? '' : String(v.km) + (v.ecart ? '\n(calc. ' + v.kmCalcules + ')' : ''));
  return { date: v.date ? v.date.split('-').reverse().join('/') : '', depart: v.depart, arrivee: v.heureArrivee, km: km, departHeure: v.heureDepart, transport: v.transport };
}
function EUC_DEV653_totalKm_(lignes) {
  return (lignes || []).reduce(function(s, l) { var v = l.visite; return s + (v && v.transport !== 'Visioconférence' && v.km != null ? Number(v.km) : 0); }, 0);
}
