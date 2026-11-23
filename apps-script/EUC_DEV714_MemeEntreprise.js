/**
 * DEV714 — Élèves en stage dans une même entreprise : ceux de la classe et ceux d'autres classes présents aux mêmes dates.
 *
 * Un seul calcul pour le suivi d'une classe (encadré sous le tableau), son export PDF et le tableau PDF joint au
 * courriel d'un dépôt (DEV663). La page reçoit le texte de cette fonction (pageEnseignants_) : elle doit rester
 * autonome (aucune autre fonction appelée). Calcul pur sur la vue du suivi (EUC_SUIVI2_vueEnseignants_), sans écriture.
 *
 * Entreprise : nom sans casse, accents ni forme juridique, et code postal du lieu du stage (à défaut de l'entreprise).
 * Même période : dates officielles des périodes (DEV716), jamais celles de la convention : un élève en retard ou en
 * prolongation reste dans sa période. Deux classes sont ensemble si leurs périodes officielles se recouvrent.
 * Seules les conventions enregistrées comptent (stage, ou P.dif. en entreprise) ; les classes entières d'apprentis non.
 */
function EUC_DEV714_memeEntreprise_(D, classeId, periodeId) {
  var t = function(v) { return v == null ? '' : String(v).trim(); };
  var cle = function(v) { return t(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\b(sas|sasu|sarl|eurl|sa|snc|sci|selarl|ste|societe|ets|etablissements?|groupe)\b/g, ' ').replace(/\s+/g, ' ').trim(); };
  var cp = function(v) { var m = t(v).match(/\b(\d{5})\b/); return m ? m[1] : ''; };
  var classes = (D && D.classes) || [], fiches = (D && D.fiches) || [];
  var c = classes.filter(function(x) { return Number(x.id) === Number(classeId); })[0];
  var p = c && (c.periodes || []).filter(function(x) { return Number(x.id) === Number(periodeId); })[0];
  if (!c || !p || c.ce) return [];
  var stages = function(cl, per, fn) {
    (cl.eleves || []).forEach(function(e) {
      var l = (per.lignes || {})[e[0]], f = l && l[1] >= 0 ? fiches[l[1]] : null;
      if (!l || !f || (l[0] !== 'AVEC' && l[0] !== 'PDIF_ENTREPRISE')) return;
      var k = cle(f.entreprise); if (!k) return;
      fn(k + '|' + cp(f.lieu || f.adresse), { id: e[0], nom: t(e[1]), classe: t(cl.nom), tel: t(l[2]), visite: t(l[3]), debut: t(per.debut).slice(0, 10), fin: t(per.fin).slice(0, 10) }, f);
    });
  };
  var groupes = {}, ordre = [];
  stages(c, p, function(k, x, f) {
    var g = groupes[k] || (groupes[k] = { entreprise: t(f.entreprise), adresse: t(f.lieu || f.adresse), eleves: [], autres: [], debut: x.debut, fin: x.fin, vus: {} });
    if (ordre.indexOf(k) < 0) ordre.push(k);
    if (g.vus[c.id + '|' + x.id]) return; g.vus[c.id + '|' + x.id] = true;
    g.eleves.push(x); if (x.debut && (!g.debut || x.debut < g.debut)) g.debut = x.debut; if (x.fin && x.fin > g.fin) g.fin = x.fin;
  });
  if (!ordre.length) return [];
  classes.forEach(function(oc) {
    if (Number(oc.id) === Number(c.id) || oc.ce) return;
    (oc.periodes || []).forEach(function(op) {
      stages(oc, op, function(k, x) {
        var g = groupes[k]; if (!g || g.vus[oc.id + '|' + x.id]) return;
        if (g.debut && g.fin && x.debut && x.fin && (x.debut > g.fin || x.fin < g.debut)) return;
        g.vus[oc.id + '|' + x.id] = true; g.autres.push(x);
      });
    });
  });
  var compte = function(l, champ) { var o = {}; l.forEach(function(x) { o[x[champ]] = (o[x[champ]] || 0) + 1; }); return o; };
  var tri = function(a, b) { return a.classe.localeCompare(b.classe, 'fr', { numeric: true }) || a.nom.localeCompare(b.nom, 'fr'); };
  /* À vérifier : plusieurs professeurs différents (un élève sans professeur n'en est pas un) ; élèves sans professeur, nommés. */
  var etat = function(l, champ, lib, sansLib) {
    var profs = {}, sans = [];
    l.slice().sort(tri).forEach(function(x) { if (x[champ]) profs[x[champ]] = true; else sans.push(x.nom + (x.classe !== t(c.nom) ? ' (' + x.classe + ')' : '')); });
    return (Object.keys(profs).length > 1 ? [lib + ' : plusieurs professeurs'] : []).concat(sans.length ? [sansLib + ' : ' + sans.join(', ')] : []);
  };
  return ordre.map(function(k) { return groupes[k]; }).filter(function(g) { return g.eleves.length + g.autres.length > 1; }).map(function(g) {
    var tous = g.eleves.concat(g.autres), tel = compte(tous, 'tel'), visite = compte(tous, 'visite');
    var autresClasses = []; g.autres.forEach(function(x) { if (autresClasses.indexOf(x.classe) < 0) autresClasses.push(x.classe); });
    return { entreprise: g.entreprise, adresse: g.adresse,
      eleves: g.eleves.slice().sort(tri).map(function(x) { return x.nom; }),
      autres: g.autres.slice().sort(tri).map(function(x) { return { nom: x.nom, classe: x.classe }; }),
      autresClasses: autresClasses.sort(function(a, b) { return a.localeCompare(b, 'fr', { numeric: true }); }),
      tel: tel, visite: visite, aVerifier: etat(tous, 'tel', 'Téléphone', 'Téléphone non affecté').concat(etat(tous, 'visite', 'Visite', 'Visite non affectée')) };
  }).sort(function(a, b) { return (b.eleves.length + b.autres.length) - (a.eleves.length + a.autres.length) || a.entreprise.localeCompare(b.entreprise, 'fr'); });
}

/* Texte des professeurs affectés (calcul pur) : « Nom » s'il est seul, sinon « Nom (n) » par ligne ; « Non affecté » pour un vide, en dernier. */
function EUC_DEV714_profsTexte_(o) {
  var k = Object.keys(o || {}).sort(function(a, b) { return (!a) - (!b) || o[b] - o[a] || a.localeCompare(b, 'fr'); });
  return k.length === 1 ? (k[0] || 'Non affecté') : k.map(function(x) { return (x || 'Non affecté') + ' (' + o[x] + ')'; }).join('\n');
}
/* Lignes du tableau (PDF et courriel) : Entreprise | Élèves de la classe | Autres classes | Téléphone | Visite | À vérifier. */
var EUC_DEV714_ENTETES_ = ['Entreprise', 'Élèves de la classe', 'Élèves d’autres classes (mêmes dates)', 'Suivi téléphonique', 'Professeur visiteur', 'À vérifier'];
function EUC_DEV714_lignes_(groupes) {
  return (groupes || []).map(function(g) {
    return [g.entreprise + (g.adresse ? '\n' + g.adresse : ''), g.eleves.length ? g.eleves.length + ' élève' + (g.eleves.length > 1 ? 's' : '') + ' :\n' + g.eleves.join('\n') : '—',
      g.autres.length ? g.autres.map(function(x) { return x.nom + ' (' + x.classe + ')'; }).join('\n') : '—',
      EUC_DEV714_profsTexte_(g.tel), EUC_DEV714_profsTexte_(g.visite), g.aVerifier.join('\n') || 'Un seul professeur'];
  });
}
/* Source injectée dans la page du suivi (« </ » neutralisé dans un <script>). */
function EUC_DEV714_source_() {
  return [EUC_DEV714_memeEntreprise_, EUC_DEV714_profsTexte_, EUC_DEV714_lignes_].map(String).join('\n')
    .concat('\nvar EUC_DEV714_ENTETES_ = ' + JSON.stringify(EUC_DEV714_ENTETES_) + ';').replace(/<\//g, '<\\/');
}
