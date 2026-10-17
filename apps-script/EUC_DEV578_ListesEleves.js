/**
 * DEV578 — Listes et feuilles d'émargement (administration PFMP).
 *
 * Trois vues, toutes calculées en une fois au chargement de la page :
 *  - classes : élèves par classe (scolaires, apprentis repérés « A », autres
 *    formations), effectifs du nouveau moteur, coordonnées de l'import ;
 *  - professeurs : cochés par discipline puis nominativement, avec leurs
 *    fonctions (PP de telle classe, et la colonne « Fonctions » de Grist si
 *    elle existe : coordonnateur…) ;
 *  - mineurs : âge, date de majorité et délai avant 18 ans, par classe.
 * Le choix, les colonnes, l'impression et le PDF se font sans appel serveur ;
 * seul le dictionnaire des intitulés de réunion est enregistré côté serveur.
 */
var EUC_DEV578_TITRES_CLE_ = 'EUC_DEV578_TITRES_REUNIONS';

function EUC_DEV578_listesEleves_(annee) {
  var m = EUC_SUIVI2_modele_(annee), fiches = {};
  EUC_DEV538_records_('EUC_ELEVES_PFMP', {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r), id = Number(r.id || f.id);
    if (!id) return;
    fiches[id] = {
      nom: String(f.Nom || '').trim(), prenom: String(f.Prenom_usage || f.Prenom || '').trim(),
      tel: String(f.Telephone_eleve || f.Telephone_portable || f.Telephone || '').trim(),
      mail: String(f.Email_eleve || f.Courriel_eleve || f.Email || '').trim(),
      naissance: typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(f.Date_naissance) : ''
    };
  });
  return {
    annee: m.annee,
    aujourdhui: m.aujourdhui || new Date().toISOString().slice(0, 10),
    classes: (m.classes || []).map(function(c) {
      return {
        id: c.id, nom: c.nom, famille: c.famille, niveau: c.niveau, pp: c.pp || [],
        /* [nom, prénom, téléphone, courriel, naissance AAAA-MM-JJ, apprenti 0/1] */
        eleves: (c.eleves || []).map(function(e) {
          var id = Number(e.id || e[0]), x = fiches[id] || {}, a = e.apprentissage && e.apprentissage.code === 'APPRENTI' ? 1 : 0;
          return [x.nom || String(e.nom || ''), x.prenom || String(e.prenom || ''), x.tel || '', x.mail || '', x.naissance || '', a];
        }).sort(function(a, b) { return (a[0] + ' ' + a[1]).localeCompare(b[0] + ' ' + b[1], 'fr'); })
      };
    }).filter(function(c) { return c.eleves.length; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }),
    professeurs: EUC_DEV578_professeurs_(m.classes || [])
  };
}

/* Professeurs actifs, avec discipline et fonctions (PP par classe, colonne « Fonctions »). */
function EUC_DEV578_professeurs_(classes) {
  var l = [], parId = {}, nomsClasses = {};
  (classes || []).forEach(function(c) { nomsClasses[String(c.id)] = c.nom; });
  try {
    EUC_DEV538_records_('EUC_PROFESSEURS_PFMP', {}).forEach(function(r) {
      var f = EUC_DEV538_fields_(r);
      if (f.Actif === false) return;
      var nom = String(f.Nom || '').trim(), prenom = String(f.Prenom || '').trim();
      if (!nom && !prenom) return;
      var fonctions = String(f.Fonctions || f.Fonction || '').split(/[;,\n]+/).map(function(s) { return s.trim(); }).filter(Boolean);
      var p = { id: Number(r.id || f.id), nom: nom, prenom: prenom, civ: String(f.Civilite || '').trim(),
        tel: String(f.Telephone || f.Telephone_portable || '').trim(), mail: String(f.Email || '').trim(),
        discipline: String(f.Discipline || f.Matiere_pref || '').trim() || 'Sans discipline', fonctions: fonctions };
      parId[p.id] = p; l.push(p);
    });
  } catch (e) { return []; }
  try {
    EUC_DEV538_records_('EUC_CLASSES_PROFESSEURS_PFMP', {}).forEach(function(r) {
      var f = EUC_DEV538_fields_(r);
      if (f.Actif === false || String(f.Role || '') !== 'PROFESSEUR_PRINCIPAL') return;
      var p = parId[Number(Array.isArray(f.Professeur) ? f.Professeur[1] : f.Professeur)], c = nomsClasses[String(Array.isArray(f.Classe) ? f.Classe[1] : f.Classe)];
      if (p && c && p.fonctions.indexOf('PP ' + c) < 0) p.fonctions.push('PP ' + c);
    });
  } catch (e2) {}
  return l.sort(function(a, b) { return (a.nom + ' ' + a.prenom).localeCompare(b.nom + ' ' + b.prenom, 'fr'); });
}

/* Dictionnaire des intitulés de réunion (partagé entre administrateurs). */
function EUC_DEV578_titres_() {
  try { var t = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV578_TITRES_CLE_) || '[]'); return Array.isArray(t) ? t : []; } catch (e) { return []; }
}
function EUC_DEV578_titresModifier(titre, retirer) {
  EUC_SUIVI2_exigerAdmin_();
  titre = String(titre || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!titre) throw new Error('Intitulé vide.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Réessayez dans un instant.');
  try {
    var t = EUC_DEV578_titres_().filter(function(x) { return x.toLowerCase() !== titre.toLowerCase(); });
    if (!retirer) t.push(titre);
    t.sort(function(a, b) { return a.localeCompare(b, 'fr'); });
    PropertiesService.getScriptProperties().setProperty(EUC_DEV578_TITRES_CLE_, JSON.stringify(t.slice(0, 200)));
    return t;
  } finally { lock.releaseLock(); }
}

function EUC_DEV578_afficherListesEleves(e) {
  EUC_SUIVI2_exigerAdmin_();
  var p = (e && e.parameter) || {}, t = HtmlService.createTemplateFromFile('Listes_Eleves_DEV578');
  var d;
  try { d = EUC_DEV578_listesEleves_(String(p.annee || '')); } catch (err) { d = { erreur: String(err && err.message || err), classes: [], professeurs: [] }; }
  d.titres = EUC_DEV578_titres_();
  d.vueImposee = ['classes', 'profs', 'mineurs'].indexOf(String(p.vue || '')) >= 0;
  d.vue = d.vueImposee ? String(p.vue) : 'classes';
  t.donnees = JSON.stringify(d).replace(/</g, '\\u003c');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Listes et émargement')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
