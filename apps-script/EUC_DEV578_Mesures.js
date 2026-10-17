/**
 * DEV578 — Mesure des temps de l'administration (lecture seule, administration PFMP).
 *
 * Chaque mesure est appelée séparément par la page « Vérifier les chiffres »
 * (une exécution par mesure : jamais de dépassement des 6 minutes). Elle
 * chronomètre une lecture de données réellement utilisée par une page, telle
 * qu'elle s'exécute avec la session de l'administrateur. « en cache » et
 * « calcul complet » montrent l'effet des caches par témoin Grist.
 */
var EUC_DEV578_MESURES_ = [
  ['temoin', 'Témoin de modification Grist', function(a) { return EUC_SUIVI2_temoin_(); }],
  ['suivi', 'Suivi des PFMP — modèle de l’année', function(a) { return EUC_SUIVI2_modele_(a); }],
  ['apprentisSuivi', 'Suivi des apprentis — modèle de l’année', function(a) { return EUC_DEV577_modele_(a); }],
  ['adminConv', 'Administration des conventions — liste (en cache)', function(a) { return EUC_DEV578_dossiersAdminEnCache_(a); }],
  ['adminConvBrut', 'Administration des conventions — liste (calcul complet)', function(a) { return EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148(a); }],
  ['apprentisTableau', 'Gestion des apprentis — tableau de bord (en cache)', function(a) { return EUC_DEV545_dashboardLive(a); }],
  ['apprentisTableauBrut', 'Gestion des apprentis — tableau de bord (calcul complet)', function(a) { return EUC_DEV578_dashboardLiveCalcul_(a); }],
  ['apprentisDetails', 'Gestion des apprentis — listes du tableau de bord (en cache)', function(a) { return EUC_DEV545_dashboardDetails(a); }],
  ['classes', 'Liste des classes de l’année', function(a) { return EUC_DEV190X_getClasses(a, false); }],
  ['catalogue', 'Catalogue niveaux / classes / périodes', function(a) { return EUC_DEV368_catalog(a); }],
  ['generateur', 'Génération des conventions — chargement', function(a) { return EUC_CONVENTION_chargerGenerateurAdmin(); }],
  ['ppAdmin', 'Accès professeurs principaux — catalogue', function(a) { return EUC_DEV441_catalogAdmin(a); }],
  ['accueilAdmin', 'Accueil de l’administration (page complète)', function(a) { var o = EUC_CENTRE_ADMIN_afficherApplication({ parameter: { page: 'admin-pfmp' } }); return o && o.getContent ? o.getContent() : ''; }],
  ['listesEleves', 'Listes des élèves par classe', function(a) { return EUC_DEV578_listesEleves_(a); }],
  ['ordres', 'Ordres de mission — modèles', function(a) { return EUC_DEV436_listMissionModels(); }],
  ['geocodage', 'Géocodage des entreprises — liste', function(a) { return EUC_DEV441_geoAdminData({ annee: a }); }],
  ['book', 'Book des entreprises — liste de l’année', function(a) { return EUC_DEV572_base_({ annee: a }); }],
  ['cartePfmp', 'Carte des lieux de stage — points', function(a) { return EUC_DEV538_mapData({ annee: a, mode: 'STAFF' }); }],
  ['carteApprentis', 'Carte des apprentis — points', function(a) { return EUC_DEV545_apprenticeMapData({ annee: a, mode: 'ADMIN' }); }],
  ['historiques', 'Fiches entreprise — historique préparé', function(a) { return EUC_DEV578_historiquesTous_(); }]
];

function EUC_DEV578_mesuresListe() {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV578_MESURES_.map(function(m) { return { id: m[0], libelle: m[1] }; });
}

function EUC_DEV578_mesurer(id, annee) {
  EUC_SUIVI2_exigerAdmin_();
  var m = EUC_DEV578_MESURES_.filter(function(x) { return x[0] === id; })[0];
  if (!m) throw new Error('Mesure inconnue.');
  annee = String(annee || '') || (typeof EUC_DEV368_year === 'function' ? EUC_DEV368_year('') : '');
  var t0 = Date.now(), res = null, erreur = '';
  try { res = m[2](annee); } catch (e) { erreur = String(e && e.message || e).slice(0, 200); }
  var ms = Date.now() - t0, taille = 0;
  try { taille = res == null ? 0 : JSON.stringify(res).length; } catch (e2) { taille = -1; }
  return { id: id, libelle: m[1], ms: ms, ok: !erreur, erreur: erreur, taille: taille };
}
