/**
 * DEV576 — Page des enseignants (pfmp.loucodi.fr) sur le nouveau moteur.
 *
 * Une seule requête : la page reçoit toute l'année (familles, classes,
 * périodes, élèves, entreprises, suivis) déjà calculée par EUC_SUIVI2_modele_,
 * mise en cache par témoin de modification Grist. La navigation entre
 * familles, classes et périodes se fait ensuite dans le navigateur.
 * Lecture seule ; route protégée par le verrou des liens enseignants.
 */
var EUC_SUIVI2_PAGE_ENSEIGNANTS_ = 'suivi-pfmp-enseignants';
/* Paramètres d'adresse : jamais « c » ni « sid », réservés par Google pour les Web Apps. */

/* Vue compacte destinée au navigateur : ni motifs ni garde-fou (réservés à
 * l'administration), seulement ce que le tableau affiche. */
function EUC_SUIVI2_vueEnseignants_(m) {
  var fiches = [], index = {};
  function fiche(f) {
    if (!f) return -1;
    var k = JSON.stringify(f);
    if (!(k in index)) { index[k] = fiches.length; fiches.push(f); }
    return index[k];
  }
  /* DEV581 — les classes entières d'apprentis forment leur propre famille, rangée par
   * organismes (gestionnaire / donneur d'ordre), avec la formation continue ; elles sont toutes
   * affichées, même sans période ni apprenti (ex. TSEC terminé : 0). La famille d'origine sert
   * à la carte et aux affectations. */
  var classes = (m.classes || []).filter(function(c) { return c.periodes.length || c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE'; }).map(function(c) {
    var fc = c.modeApprentissage === 'FORMATION_CONTINUE', ce = fc || c.modeApprentissage === 'CLASSE_ENTIERE', org = [c.gestionnaire, c.donneur && c.donneur !== c.gestionnaire ? c.donneur : ''].filter(Boolean).join(' + ');
    if (fc) org = 'Formation continue' + (c.gestionnaire ? ' — ' + c.gestionnaire : '');
    return {
      id: c.id, nom: c.nom, famille: ce ? 'APPRENTIS' : c.famille, familleBase: c.famille, ce: ce, fc: fc, effectif: c.eleves.length, niveau: ce ? (org || 'Organisme à renseigner') : c.niveau, pp: c.pp || [], apprentisAffiches: !!c.apprentisAffiches,
      eleves: c.eleves.map(function(e) { return [e.id, e.libelle]; }),
      periodes: c.periodes.map(function(p) {
        var r = p.resume || {}, lignes = {};
        c.eleves.forEach(function(e) {
          var su = (r.suivis || {})[e.id] || {}, mx = (r.mixtes || {})[e.id];
          lignes[e.id] = [(r.statuts || {})[e.id] || 'SANS', fiche((r.fiches || {})[e.id]), su.tel || '', su.visite || '', mx ? [mx.debut || '', mx.fin || ''] : 0];
        });
        return {
          id: p.id, libelle: p.libelle, debut: p.debut, fin: p.fin, pdif: !!p.pdif,
          n: p.pdif
            ? { effectif: r.effectif, entreprise: r.entreprise.length, lycee: r.lycee.length, aDefinir: r.aDefinir.length, apprentis: r.apprentis.length }
            : { effectif: r.effectif, scolaires: r.scolaires, avec: r.avec.length, sans: r.sans.length, apprentis: r.apprentis.length, annulees: r.annulees.length },
          lignes: lignes
        };
      })
    };
  });
  return { annee: m.annee, calculeLe: m.calculeLe, temoin: String(m.temoin || '').split('-')[0], classes: classes, fiches: fiches };
}

function EUC_SUIVI2_pageEnseignants_(e) {
  var p = (e && e.parameter) || {};
  var t = HtmlService.createTemplateFromFile('Suivi_Enseignants_DEV576');
  var vue;
  try { vue = EUC_SUIVI2_vueEnseignants_(EUC_SUIVI2_modele_(EUC_SUIVI2_t_(p.annee))); }
  catch (err) { vue = { erreur: String(err && err.message || err), classes: [], fiches: [] }; }
  /* JSON inséré dans un <script> : « < » échappé pour ne jamais fermer la balise. */
  t.donnees = JSON.stringify(vue).replace(/</g, '\\u003c').replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');
  var base = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  /* DEV578 : mode administration (affectations directes, envoi du tableau) seulement pour un compte administrateur. */
  var admin = false;
  /* Détecté automatiquement pour un compte Google administrateur (les liens Atrium des enseignants n'ont pas de compte Google : aucune vérification coûteuse). */
  var courriel = '';
  try { courriel = String(Session.getActiveUser().getEmail() || ''); } catch (eMail) { courriel = ''; }
  if (courriel || EUC_SUIVI2_t_(p.admin) === '1') { try { admin = !!(typeof EUC_V156_contexteAdmin_ === 'function' && EUC_V156_contexteAdmin_()); } catch (eAdm) { admin = false; } }
  t.config = JSON.stringify({ base: base, wrapper: EUC_SUIVI2_t_(p.wrapper) === '1', admin: admin, depart: { c: Number(p.cl) || 0, p: Number(p.pe) || 0 } }).replace(/</g, '\\u003c');
  return t.evaluate().setTitle('Suivi des PFMP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Numéro de la dernière modification Grist : la page ouverte le compare au sien
 * pour proposer l'actualisation dès qu'une donnée a changé (aucune donnée
 * nominative n'est renvoyée). */
function EUC_SUIVI2_temoinActuel() {
  return { temoin: String(EUC_SUIVI2_temoin_()).split('-')[0] };
}
