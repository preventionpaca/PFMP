/**
 * DEV578 — Listes des élèves par classe (administration PFMP) : feuille
 * d'émargement, avec téléphone et courriel des élèves en option.
 * Les classes et leurs élèves viennent du nouveau moteur (mêmes effectifs que
 * le suivi), les coordonnées du tableau des élèves (import Pronote).
 * La page reçoit toutes les classes de l'année en une fois : le choix d'une
 * classe, des colonnes, l'impression et le PDF se font sans appel serveur.
 */
function EUC_DEV578_listesEleves_(annee) {
  var m = EUC_SUIVI2_modele_(annee), fiches = {};
  EUC_DEV538_records_('EUC_ELEVES_PFMP', {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r), id = Number(r.id || f.id);
    if (!id) return;
    fiches[id] = {
      nom: String(f.Nom || '').trim(), prenom: String(f.Prenom_usage || f.Prenom || '').trim(),
      tel: String(f.Telephone_eleve || f.Telephone_portable || f.Telephone || '').trim(),
      mail: String(f.Email_eleve || f.Courriel_eleve || f.Email || '').trim()
    };
  });
  return {
    annee: m.annee,
    classes: (m.classes || []).map(function(c) {
      return {
        id: c.id, nom: c.nom, famille: c.famille, niveau: c.niveau, pp: c.pp || [],
        eleves: (c.eleves || []).map(function(e) {
          var id = Number(e.id || e[0]), x = fiches[id] || {};
          return [x.nom || String(e.nom || ''), x.prenom || String(e.prenom || ''), x.tel || '', x.mail || ''];
        }).sort(function(a, b) { return (a[0] + ' ' + a[1]).localeCompare(b[0] + ' ' + b[1], 'fr'); })
      };
    }).filter(function(c) { return c.eleves.length; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); })
      .concat(EUC_DEV578_listeProfesseurs_())
  };
}

/* Professeurs actifs : feuille d’émargement des réunions (même format que les classes). */
function EUC_DEV578_listeProfesseurs_() {
  var l = [];
  try {
    EUC_DEV538_records_('EUC_PROFESSEURS_PFMP', {}).forEach(function(r) {
      var f = EUC_DEV538_fields_(r);
      if (f.Actif === false) return;
      var nom = String(f.Nom || '').trim(), prenom = String(f.Prenom || '').trim();
      if (!nom && !prenom) return;
      l.push([nom, prenom, String(f.Telephone || f.Telephone_portable || '').trim(), String(f.Email || '').trim()]);
    });
  } catch (e) { return []; }
  l.sort(function(a, b) { return (a[0] + ' ' + a[1]).localeCompare(b[0] + ' ' + b[1], 'fr'); });
  return l.length ? [{ id: 'PROFS', nom: 'Tous les professeurs', famille: 'PROFS', niveau: '', pp: [], eleves: l }] : [];
}

function EUC_DEV578_afficherListesEleves(e) {
  EUC_SUIVI2_exigerAdmin_();
  var p = (e && e.parameter) || {}, t = HtmlService.createTemplateFromFile('Listes_Eleves_DEV578');
  var d;
  try { d = EUC_DEV578_listesEleves_(String(p.annee || '')); } catch (err) { d = { erreur: String(err && err.message || err), classes: [] }; }
  t.donnees = JSON.stringify(d).replace(/</g, '\\u003c');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Listes et émargement')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
