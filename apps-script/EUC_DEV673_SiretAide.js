/**
 * DEV673 — SIRET vérifié à nouveau quand l'élève envoie une demande d'aide.
 *
 * Constat (PFMP-2026-S0023, GARAGE DE LA COLLE) : le SIRET était bon, mais la vérification avait échoué chez
 * l'élève. L'annuaire officiel (Recherche d'entreprises) refuse les serveurs Google (HTTP 502) : il est lu par le
 * navigateur de l'élève, et une erreur du service (429, 5xx, délai) s'affichait « Aucune entreprise trouvée ».
 * À l'envoi de la demande d'aide, le SIRET est donc vérifié à nouveau : fiche complète de la base, sinon réponse
 * de l'annuaire lue par le navigateur. Reconnu et en activité → même résultat qu'un dépôt vérifié (convention
 * enregistrée, pas de passage au bureau). Non diffusible ou fermé → le bureau garde la main.
 */
function EUC_DEV673_verifierSiret_(siret, reponseApi) {
  var s = String(siret == null ? '' : siret).replace(/\D/g, '');
  if (s.length !== 14) return null;
  try {
    var r = EUC_ENT_rechercherSiret(s), e = r && r.entreprise, source = 'base des entreprises';
    if (!e && reponseApi) { e = (EUC_ENT_traiterReponseApiNavigateur(reponseApi, s) || {}).entreprise; source = 'annuaire officiel'; }
    return EUC_DEV673_retenir_(e, s, source);
  } catch (err) { console.log('DEV673 SIRET non vérifié : ' + (err && err.message || err)); return null; }
}
/* Entreprise retenue (calcul pur) : seulement si le SIRET correspond, en activité, nom et adresse connus. */
function EUC_DEV673_retenir_(e, s, source) {
  var T = function(v) { return String(v == null ? '' : v).trim(); };
  if (!e || e.nonDiffusible === true || e.etat === 'Fermé') return null;
  if (T(e.siret).replace(/\D/g, '') && T(e.siret).replace(/\D/g, '') !== s) return null;
  var adresse = T(e.adresseComplete || e.numeroVoie || e.adresse);
  if (!T(e.raisonSociale) || !adresse || !T(e.commune)) return null;
  return { siret: s, nom: T(e.raisonSociale), enseigne: T(e.enseigne), adresse: adresse, complement: T(e.complementAdresse || e.complement), cp: T(e.codePostal), ville: T(e.commune), source: source };
}
/* Ligne d'attente marquée comme un dépôt vérifié (mêmes colonnes que la déclaration complète). */
function EUC_DEV673_appliquer_(ligne, ok) {
  ligne.SIRET_brut = ok.siret; ligne.SIRET_normalise = ok.siret; ligne.SIRET_statut = 'VERIFIE';
  ligne.SIRET_source = 'Recherche d’entreprises (demande d’aide, ' + ok.source + ')';
  ligne.Raison_sociale_officielle = ok.nom; ligne.Nom_commercial = ok.enseigne || ok.nom;
  ligne.Adresse_officielle = ok.adresse; ligne.Complement_adresse_officielle = ok.complement; ligne.CP_officiel = ok.cp; ligne.Ville_officielle = ok.ville; ligne.Pays_officiel = 'FR';
  return ligne;
}
