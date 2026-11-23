/**
 * DEV719 — Simulation des formulaires élève (administration) : voir, comme un élève, ce que proposent le formulaire du
 * QR code et « Déclarer mon entreprise » pour un SIRET pris au hasard dans la base (responsables et tuteurs déjà
 * connus, DEV717), sans rien enregistrer.
 *
 * Les vraies pages sont affichées telles quelles, avec un élève fictif. Dans la page, google.script.run est remplacé
 * (Simulation_Formulaires_DEV719.html) :
 *   - recherches en lecture seule (SIRET, annuaire, Monaco) : transmises au serveur ;
 *   - personnes connues : EUC_DEV719_contactsConnus (réservé à l'administration, sans jeton d'élève) ;
 *   - identification, captcha, dépôt, enregistrement : réponses simulées dans le navigateur, jamais envoyées ;
 *   - tout autre appel : refusé.
 * Double sécurité : le jeton de reprise et le jeton de déclaration simulés ne sont pas signés, le serveur les refuserait.
 */
var EUC_DEV719_ROUTE_ = 'simulation-formulaires-eleve';
var EUC_DEV719_LECTURE_ = ['EUC_ENT_rechercherSiret', 'EUC_ENT_traiterReponseApiNavigateur', 'EUC_DEV603_traiterApi',
  'EUC_V161_verifierSiretFrance', 'EUC_V161_traiterSiretFranceNavigateur', 'EUC_V161_rechercherEntrepriseMonaco',
  'EUC_DEV646_rechercherMonacoParNom', 'EUC_DEV667_rechercherRci', 'EUC_DEV667_ficheRci'];

function EUC_DEV719_t_(v) { return v == null ? '' : String(v).trim(); }

/* SIRET au hasard parmi les conventions de la base ayant au moins deux personnes connues (calcul pur, tirage injecté). */
function EUC_DEV719_choisirSiret_(conventions, depots, references, hasard, exclure) {
  var T = EUC_DEV719_t_, vus = {}, candidats = [];
  (conventions || []).forEach(function(a) {
    if (!a || a.Revoked === true || a.Supprimee_admin === true) return;
    var s = T(a.Entreprise_siret).replace(/\D/g, '');
    if (s.length !== 14 || vus[s] || s === exclure || !(T(a.Responsable_nom) || T(a.Tuteur_nom))) return;
    vus[s] = 1; candidats.push({ siret: s, entreprise: T(a.Entreprise_raison_sociale) || T(a.Entreprise_enseigne) });
  });
  var tirage = typeof hasard === 'function' ? hasard : Math.random, garde = null;
  for (var essai = 0; essai < 40 && candidats.length; essai++) {
    var i = Math.floor(tirage() * candidats.length), c = candidats.splice(i, 1)[0];
    var r = EUC_DEV717_calculer_(c.siret, { conventions: conventions, depots: depots, references: references });
    var x = { siret: c.siret, entreprise: c.entreprise, personnes: r.personnes.length };
    if (x.personnes >= 2) return x;
    if (!garde && x.personnes) garde = x;
  }
  return garde || { siret: '', entreprise: '', personnes: 0 };
}

/* Personnes connues pour la simulation : administration seulement, lecture seule. */
function EUC_DEV719_contactsConnus(q) {
  EUC_SUIVI2_exigerAdmin_();
  return EUC_DEV717_calculer_((q || {}).siret);
}

/* Préchauffage de l'index pour la simulation : administration seulement. */
function EUC_DEV719_prechauffer() {
  EUC_SUIVI2_exigerAdmin_();
  var t0 = Date.now(), idx = EUC_DEV717_indexCache_();
  return { ok: true, siret: Object.keys(idx.s || {}).length, ms: Date.now() - t0 };
}

function EUC_DEV719_lienSimulation_(base, formulaire, siret) {
  return base + '?page=' + EUC_DEV719_ROUTE_ + '&formulaire=' + encodeURIComponent(formulaire) + (siret ? '&siret=' + encodeURIComponent(siret) : '');
}

/* Configuration injectée dans la page (calcul pur). */
function EUC_DEV719_config_(formulaire, choix, base) {
  return { formulaire: formulaire, siret: choix.siret, entreprise: choix.entreprise, personnes: choix.personnes, lecture: EUC_DEV719_LECTURE_,
    liens: { qr: EUC_DEV719_lienSimulation_(base, 'qr', choix.siret), declaration: EUC_DEV719_lienSimulation_(base, 'declaration', choix.siret),
      hasard: EUC_DEV719_lienSimulation_(base, formulaire, ''), admin: base + '?page=admin-pfmp' } };
}

function EUC_DEV719_injection_(config) {
  var src = HtmlService.createHtmlOutputFromFile('Simulation_Formulaires_DEV719').getContent();
  return '<script>window.EUC_DEV719_CONFIG=' + JSON.stringify(config).replace(/</g, '\\u003c') + ';</script>' + src;
}

function EUC_DEV719_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var p = (e && e.parameter) || {}, formulaire = p.formulaire === 'declaration' ? 'declaration' : 'qr';
  var siret = EUC_DEV719_t_(p.siret).replace(/\D/g, ''), choix;
  var d = EUC_DEV717_lireSources_(), convs = d.conventions || [], depots = d.depots || [], refs = d.references || [];
  if (siret.length === 14) {
    var conv = convs.filter(function(a) { return EUC_DEV719_t_(a.Entreprise_siret).replace(/\D/g, '') === siret; })[0] || {};
    choix = { siret: siret, entreprise: EUC_DEV719_t_(conv.Entreprise_raison_sociale), personnes: EUC_DEV717_calculer_(siret, { conventions: convs, depots: depots, references: refs }).personnes.length };
  } else choix = EUC_DEV719_choisirSiret_(convs, depots, refs);
  /* Sources déjà lues : l'index des personnes connues est mis en cache au passage (réponses immédiates ensuite). */
  try { if (!EUC_DEV717_cacheLire_()) EUC_DEV717_cacheEcrire_({ le: new Date().toISOString(), s: EUC_DEV717_index_(convs, depots, refs) }); } catch (eI) {}
  var base = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  var t = HtmlService.createTemplateFromFile(formulaire === 'qr' ? 'PFMP_Acces_QR_V116' : 'Declaration_Entreprise_DEV603');
  t.simulation719 = EUC_DEV719_injection_(EUC_DEV719_config_(formulaire, choix, base));
  if (formulaire === 'qr') { t.conventionRecordId = 'SIMULATION'; t.conventionToken = ''; t.conventionCode = ''; t.conventionAccessKey = ''; t.conventionAccessId = ''; t.conventionEleveId = ''; t.conventionSignature = ''; t.secoursUrl = ''; }
  return t.evaluate().setTitle('SIMULATION — ' + (formulaire === 'qr' ? 'formulaire du QR code' : 'Déclarer mon entreprise'))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
