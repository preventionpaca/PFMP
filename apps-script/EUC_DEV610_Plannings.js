/**
 * DEV610 — Générateur de plannings annuels (lot A : calendriers scolaires).
 *
 * Remplace l'outil Google Sheets « Planning PFMP et autres dates EK » (Code.js) :
 *   année scolaire → matrice semaines × lignes de planning (vacances, fériés)
 *   → périodes placées par des règles (durée + ancrage aux vacances ou à une autre période)
 *   → placements manuels par sélection de cellules → versions (historique)
 *   → aperçu puis publication dans Planning_Periodes, toujours avec Classes_concernees.
 *
 * Tables Grist créées au besoin (aucune suppression physique : les lignes retirées passent Actif = false) :
 *   EUC_PLAN_LIGNES          lignes du planning (table de vérité : calendrier, profil de règles, classe PFMP)
 *   EUC_PLAN_LIGNES_CLASSES  rattachement annuel des lignes aux classes Pronote
 *   EUC_PLAN_REGLES          durées et ancrages, par année scolaire et par profil
 *   EUC_PLAN_VERSIONS        versions d'un planning annuel (périodes en JSON : historique intégral)
 *   EUC_PLAN_JOURS_PARTICULIERS  jours travaillés en rattrapage, non travaillés, banalisés
 *   EUC_PLAN_HEURES          heures et formateurs saisis par demi-journée dans le calendrier d'une formation (lot B)
 *
 * Seules les périodes en entreprise des calendriers scolaires (PFMP, P.dif., stages BTS) sont publiées
 * dans Planning_Periodes ; une année dont les vacances sont prévisionnelles ne peut pas être publiée.
 */
var EUC_DEV610_T_ = { lignes: 'EUC_PLAN_LIGNES', rattachements: 'EUC_PLAN_LIGNES_CLASSES', regles: 'EUC_PLAN_REGLES', versions: 'EUC_PLAN_VERSIONS', jours: 'EUC_PLAN_JOURS_PARTICULIERS', heures: 'EUC_PLAN_HEURES', formations: 'EUC_PLAN_FORMATIONS', logos: 'EUC_PLAN_LOGOS', couleurs: 'EUC_PLAN_COULEURS', parametres: 'EUC_PLAN_PARAMETRES' };
var EUC_DEV610_COMMENTAIRE_ = 'Générateur de plannings';

/* ===================== Calcul pur (partagé avec la page, voir EUC_DEV610_codeClient_) ===================== */

function EUC_DEV610_n_(v) { return String(v == null ? '' : v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, ''); }
function EUC_DEV610_iso_(d) { return d.toISOString().slice(0, 10); }
function EUC_DEV610_plus_(iso, j) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + j); return EUC_DEV610_iso_(d); }
function EUC_DEV610_semaineIso_(iso) {
  var d = new Date(iso + 'T12:00:00Z'), j = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - j);
  var an = d.getUTCFullYear(), debut = new Date(Date.UTC(an, 0, 1, 12));
  return Math.floor((d - debut) / 86400000 / 7) + 1;
}
/* Nom canonique des vacances : TOUSSAINT, NOEL, HIVER, PRINTEMPS, ETE, ASCENSION.
 * Nom illisible : déduit des dates (1er novembre, 25 décembre, 14 juillet, février-mars, avril-mai). */
function EUC_DEV610_nomVacances_(nom, debut, fin) {
  var n = EUC_DEV610_n_(nom);
  if (/TOUSSAINT/.test(n)) return 'TOUSSAINT';
  if (/NOEL/.test(n)) return 'NOEL';
  if (/HIVER/.test(n)) return 'HIVER';
  if (/PRINTEMPS|PAQUES/.test(n)) return 'PRINTEMPS';
  if (/ETE|GRANDES/.test(n)) return 'ETE';
  if (/ASCENSION|PONT/.test(n)) return 'ASCENSION';
  if (debut && fin) {
    var contient = function(md) { var y = Number(debut.slice(0, 4)); return [y, y + 1].some(function(a) { var j = a + '-' + md; return j >= debut && j <= fin; }); };
    var duree = (Date.parse(fin + 'T12:00:00Z') - Date.parse(debut + 'T12:00:00Z')) / 86400000, m = Number(debut.slice(5, 7));
    if (contient('11-01')) return 'TOUSSAINT';
    if (contient('12-25')) return 'NOEL';
    if (contient('07-14') || duree > 30) return 'ETE';
    if (duree < 6) return 'ASCENSION';
    if (m === 2 || m === 3) return 'HIVER';
    if (m === 4 || m === 5) return 'PRINTEMPS';
  }
  return n;
}
/* Semaines (lundi → vendredi) de l'année scolaire, de la semaine de la rentrée à celle du 31 août. */
function EUC_DEV610_semaines_(debutAnnee, finAnnee) {
  var d = new Date(debutAnnee + 'T12:00:00Z'), j = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - (j - 1));
  var out = [], lundi = EUC_DEV610_iso_(d);
  while (lundi <= finAnnee) {
    var jeudi = EUC_DEV610_plus_(lundi, 3);
    out.push({ i: out.length, lundi: lundi, vendredi: EUC_DEV610_plus_(lundi, 4), numero: EUC_DEV610_semaineIso_(lundi), mois: Number(jeudi.slice(5, 7)), annee: Number(jeudi.slice(0, 4)), vacances: '', jours: [] });
    lundi = EUC_DEV610_plus_(lundi, 7);
  }
  return out;
}
/* Repère les semaines de vacances (au moins 3 jours ouvrés en vacances) ; le pont de l'Ascension n'en fait pas. */
function EUC_DEV610_marquerVacances_(semaines, vacances) {
  var index = {};
  (vacances || []).forEach(function(v) {
    if (!v.debut || !v.fin) return; var nom = EUC_DEV610_nomVacances_(v.nom, v.debut, v.fin);
    semaines.forEach(function(s) {
      var n = 0; for (var k = 0; k < 5; k++) { var j = EUC_DEV610_plus_(s.lundi, k); if (j >= v.debut && j <= v.fin) n++; }
      if (n >= 3) { s.vacances = nom; s.previsionnel = !!v.previsionnel; var x = index[nom] = index[nom] || { premier: s.i, dernier: s.i }; x.premier = Math.min(x.premier, s.i); x.dernier = Math.max(x.dernier, s.i); }
      else if (n > 0) s.jours.push({ nature: 'VACANCES', nom: nom, nb: n });
    });
  });
  return index;
}
/* Place les périodes AUTO d'un profil (calcul pur). Règle : { numero, type, duree, placement, ancrage, regleAncrage, position, ecart }. */
function EUC_DEV610_placer_(regles, semaines, indexVacances) {
  var parNumero = {}, faits = {}, out = [], alertes = [];
  (regles || []).forEach(function(r) { parNumero[Number(r.numero)] = r; });
  function placer(r, pile) {
    var num = Number(r.numero); if (faits[num] !== undefined) return faits[num];
    if (pile.indexOf(num) >= 0) { alertes.push('Période n°' + num + ' : ancrage circulaire.'); return (faits[num] = null); }
    var duree = Math.max(1, Math.round(Number(r.duree) || 0)), ecart = Math.max(0, Math.round(Number(r.ecart) || 0)), avant = r.position !== 'APRES', ref = null;
    if (r.ancrage === 'REGLE') {
      var cible = parNumero[Number(r.regleAncrage)];
      if (!cible) { alertes.push('Période n°' + num + ' : période d’ancrage n°' + r.regleAncrage + ' introuvable.'); return (faits[num] = null); }
      var p = placer(cible, pile.concat([num])); if (!p) return (faits[num] = null);
      ref = { premier: p.debutIdx, dernier: p.finIdx };
    } else {
      ref = indexVacances[r.ancrage];
      if (!ref) { alertes.push('Période n°' + num + ' : vacances « ' + r.ancrage + ' » absentes du calendrier de l’année.'); return (faits[num] = null); }
    }
    var debut = avant ? ref.premier - ecart - duree : ref.dernier + 1 + ecart, fin = debut + duree - 1;
    if (debut < 0 || fin >= semaines.length) { alertes.push('Période n°' + num + ' : sort de l’année scolaire.'); return (faits[num] = null); }
    var res = { numero: num, type: r.type, debutIdx: debut, finIdx: fin, debut: semaines[debut].lundi, fin: semaines[fin].vendredi, origine: 'REGLE' };
    for (var i = debut; i <= fin; i++) if (semaines[i].vacances) { alertes.push('Période n°' + num + ' : chevauche les vacances (' + semaines[i].vacances + ').'); break; }
    return (faits[num] = res);
  }
  (regles || []).filter(function(r) { return r.placement !== 'MANUEL' && r.actif !== false; }).forEach(function(r) { var p = placer(r, []); if (p) out.push(p); });
  out.sort(function(a, b) { return a.debutIdx - b.debutIdx; });
  for (var k = 1; k < out.length; k++) if (out[k].debutIdx <= out[k - 1].finIdx) alertes.push('Périodes n°' + out[k - 1].numero + ' et n°' + out[k].numero + ' se chevauchent.');
  return { periodes: out, alertes: alertes };
}
/* Génère les périodes AUTO de toutes les lignes (calcul pur).
 * Sont remplacées les périodes issues d'une règle ou reprises de Planning_Periodes dont le type relève d'une
 * règle AUTO de la ligne ; les placements manuels (grille, tableau) et les types sans règle AUTO sont conservés. */
function EUC_DEV610_generer_(lignes, regles, semaines, indexVacances, periodesActuelles) {
  var parProfil = {}, alertes = [], nouvelles = [], gardees = [], changements = [], parLigne = {};
  (regles || []).forEach(function(r) { if (r.actif === false) return; (parProfil[r.profil] = parProfil[r.profil] || []).push(r); });
  (periodesActuelles || []).forEach(function(p) { (parLigne[p.ligne] = parLigne[p.ligne] || []).push(p); });
  var codes = {};
  (lignes || []).forEach(function(l) {
    codes[l.code] = 1;
    var actuelles = parLigne[l.code] || [];
    if (l.calendrier !== 'SCOLAIRE' || l.actif === false) { gardees = gardees.concat(actuelles); return; }
    var rs = parProfil[l.profil] || [], auto = {};
    rs.forEach(function(r) { if (r.placement !== 'MANUEL') auto[EUC_DEV610_cleType_(r.type)] = 1; });
    var res = EUC_DEV610_placer_(rs, semaines, indexVacances), neuves = res.periodes.map(function(p) { return { ligne: l.code, type: p.type, debut: p.debut, fin: p.fin, origine: 'REGLE', regle: p.numero }; });
    res.alertes.forEach(function(a) { alertes.push(EUC_DEV610_nomLigne_(l) + ' — ' + a); });
    var remplacees = actuelles.filter(function(p) { return (p.origine === 'REGLE' || p.origine === 'REPRISE') && auto[EUC_DEV610_cleType_(p.type)]; });
    var conservees = actuelles.filter(function(p) { return remplacees.indexOf(p) < 0; });
    gardees = gardees.concat(conservees);
    /* Une période retouchée à la main l'emporte : la règle qui la chevaucherait n'est pas replacée. */
    neuves = neuves.filter(function(n) {
      var gene = conservees.filter(function(p) { return p.debut <= n.fin && p.fin >= n.debut; })[0];
      if (gene) alertes.push(EUC_DEV610_nomLigne_(l) + ' — période n°' + n.regle + ' non replacée : une période placée à la main (' + gene.type + ' du ' + gene.debut + ') occupe ces semaines.');
      return !gene;
    });
    Object.keys(auto).forEach(function(k) {
      var av = remplacees.filter(function(p) { return EUC_DEV610_cleType_(p.type) === k; }).sort(EUC_DEV610_ordrePeriodes_), ap = neuves.filter(function(p) { return EUC_DEV610_cleType_(p.type) === k; }).sort(EUC_DEV610_ordrePeriodes_);
      for (var i = 0; i < Math.max(av.length, ap.length); i++) {
        var a = av[i], b = ap[i];
        if (b && !a) changements.push({ nature: 'NOUVELLE', ligne: l.code, type: b.type, apres: b });
        else if (a && !b) changements.push({ nature: 'RETIREE', ligne: l.code, type: a.type, avant: a });
        else if (a.debut !== b.debut || a.fin !== b.fin) changements.push({ nature: 'DEPLACEE', ligne: l.code, type: b.type, avant: a, apres: b });
      }
    });
    nouvelles = nouvelles.concat(neuves);
    /* Règles à placer à la main : rappel tant qu'il manque des périodes de ce type. */
    var manuelles = {}; rs.forEach(function(r) { if (r.placement === 'MANUEL') { var k = EUC_DEV610_cleType_(r.type); manuelles[k] = manuelles[k] || { type: r.type, n: 0, durees: [] }; manuelles[k].n++; manuelles[k].durees.push(r.duree); } });
    Object.keys(manuelles).forEach(function(k) { var m = manuelles[k], places = actuelles.filter(function(p) { return EUC_DEV610_cleType_(p.type) === k; }).length; if (places < m.n) alertes.push(EUC_DEV610_nomLigne_(l) + ' — ' + (m.n - places) + ' période(s) « ' + m.type + ' » à placer à la main (' + m.durees.join(' et ') + ' semaines).'); });
  });
  Object.keys(parLigne).forEach(function(c) { if (!codes[c]) gardees = gardees.concat(parLigne[c]); });
  return { periodes: nouvelles.concat(gardees).sort(EUC_DEV610_ordrePeriodes_), changements: changements, alertes: alertes };
}
/* Nom complet d'une ligne pour les messages : « T BAC PRO — TMVA ». */
function EUC_DEV610_nomLigne_(l) { var lib = String(l.libelle || l.code || ''); return l.groupe && lib.indexOf(l.groupe) !== 0 ? l.groupe + ' — ' + lib : lib; }
function EUC_DEV610_ordrePeriodes_(a, b) { return String(a.ligne).localeCompare(String(b.ligne)) || String(a.debut).localeCompare(String(b.debut)); }
/* Une période de type formation est reconnue par le moteur du suivi (R1–R7) : PFMP…, P.dif., stage BTS. */
function EUC_DEV610_typeFormation_(type) {
  var t = EUC_DEV610_n_(type);
  return /^PFMP/.test(t) || /^PDIF/.test(t) || /^BTSSTAGE/.test(t) || /^STAGEBTS/.test(t);
}
function EUC_DEV610_cleType_(type) { var t = EUC_DEV610_n_(type); return t === 'BTSSTAGE' ? 'STAGEBTS' : t; }
/* Appel la première semaine de chaque période en entreprise (règle d'établissement, calcul pur). */
function EUC_DEV610_appels_(periodes, semaines) {
  var out = [];
  (periodes || []).forEach(function(p) {
    if (!EUC_DEV610_typeFormation_(p.type) || EUC_DEV610_n_(p.type) === 'PDIF') return;
    var s = semaines.filter(function(x) { return x.lundi <= p.debut && x.vendredi >= p.debut; })[0];
    if (s) out.push({ ligne: p.ligne, semaine: s.i, debut: s.lundi, fin: s.vendredi });
  });
  return out;
}
/* Période en entreprise : PFMP, P.dif., stage BTS, ou « ENT. » des mixités et des classes entières. */
function EUC_DEV610_estEntreprise_(type) { return EUC_DEV610_typeFormation_(type) || /^ENT/.test(EUC_DEV610_n_(type)); }
/* Recopie des dates d'une ligne vers d'autres (calcul pur) : dans chaque ligne cible, les périodes du même genre
 * (en entreprise seulement, ou toutes) sont remplacées par celles de la source, marquées placées à la main. */
function EUC_DEV610_recopier_(periodes, source, cibles, tout) {
  var garde = function(p) { return tout || EUC_DEV610_estEntreprise_(p.type); }, remplacees = 0, ajoutees = 0, parLigne = {};
  var modeles = (periodes || []).filter(function(p) { return p.ligne === source && garde(p); });
  var out = (periodes || []).filter(function(p) { if (cibles.indexOf(p.ligne) >= 0 && p.ligne !== source && garde(p)) { remplacees++; return false; } return true; });
  cibles.forEach(function(c) { if (c === source) return; parLigne[c] = modeles.length;
    modeles.forEach(function(m) { var x = { ligne: c, type: m.type, debut: m.debut, fin: m.fin, origine: 'TABLEAU', regle: null }; if (m.complement) x.complement = m.complement; out.push(x); ajoutees++; }); });
  return { periodes: out.sort(EUC_DEV610_ordrePeriodes_), modeles: modeles.length, remplacees: remplacees, ajoutees: ajoutees, parLigne: parLigne };
}
/* Regroupe les périodes accolées d'une ligne (calcul pur) : même type et même complément, séparées seulement par un
 * week-end ou un jour férié (ENT. saisies semaine par semaine → une seule période). feries : { 'AAAA-MM-JJ': nom }.
 * Rend aussi le nombre de périodes fusionnées. */
function EUC_DEV610_regrouper_(periodes, ligne, feries) {
  var autres = [], miennes = [];
  (periodes || []).forEach(function(p) { (p.ligne === ligne ? miennes : autres).push(p); });
  miennes.sort(function(a, b) { return String(a.debut).localeCompare(String(b.debut)); });
  var cle = function(p) { return EUC_DEV610_cleType_(p.type) + '|' + (p.complement || ''); }, out = [], fusions = 0;
  var accole = function(a, b) { var j = EUC_DEV610_plus_(a.fin, 1); while (j < b.debut) { var d = new Date(j + 'T12:00:00Z').getUTCDay(); if (d !== 0 && d !== 6 && !(feries || {})[j]) return false; j = EUC_DEV610_plus_(j, 1); } return b.debut <= EUC_DEV610_plus_(a.fin, 1) || j >= b.debut; };
  miennes.forEach(function(p) {
    var prec = out.filter(function(x) { return cle(x) === cle(p); }).pop();
    if (prec && p.debut <= EUC_DEV610_plus_(prec.fin, 5) && accole(prec, p)) { if (p.fin > prec.fin) prec.fin = p.fin; if (p.origine !== 'REPRISE' && p.origine !== 'REGLE') prec.origine = 'TABLEAU'; fusions++; return; }
    out.push(Object.assign({}, p));
  });
  return { periodes: autres.concat(out).sort(EUC_DEV610_ordrePeriodes_), fusions: fusions };
}
/* Formation complémentaire (ex. partenariat 5 Star du CAP peintre) : heures en plus de la formation, jamais publiées
 * ni comptées dans le quota ; le complément de libellé (« 5 Star ») distingue les totaux. */
var EUC_DEV610_TYPE_COMPLEMENTAIRE_ = 'Formation complémentaire';
function EUC_DEV610_estComplementaire_(type) { return /^FORMATIONCOMPLEMENTAIRE/.test(EUC_DEV610_n_(type)); }
function EUC_DEV610_libelleType_(p) { return String(p && p.type || '') + (p && p.complement ? ' – ' + p.complement : ''); }
/* Bilan des heures d'une formation (calcul pur, partagé avec la page).
 * jours : [{ date, nature: 'FORMATION' | 'COMPLEMENTAIRE', complement }] (jours de cours et de formation complémentaire) ;
 * reglages : { matin, apresMidi } heures par défaut ; saisies : { date: { hm, ha, fm, fa } } (heures vides = défaut).
 * Rend les jours avec leurs heures, le total de la formation, un total par formation complémentaire,
 * le récapitulatif par formateur (deux totaux séparés) et les heures sans formateur. */
function EUC_DEV610_bilanHeures_(jours, reglages, saisies) {
  var r2 = function(x) { return Math.round(x * 100) / 100; }, num = function(v, d) { return v === '' || v == null || !isFinite(Number(v)) ? d : Number(v); };
  var dm = num(reglages && reglages.matin, 4), da = num(reglages && reglages.apresMidi, 3), parF = {}, ordre = [];
  var out = { jours: [], formation: 0, complementaires: {}, formateurs: [], sansFormateur: { formation: 0, complementaires: {} } };
  var ajouter = function(cible, comp, h) { if (comp == null) cible.formation = r2(cible.formation + h); else cible.complementaires[comp] = r2((cible.complementaires[comp] || 0) + h); };
  (jours || []).forEach(function(j) {
    var s = (saisies || {})[j.date] || {}, comp = j.nature === 'COMPLEMENTAIRE' ? (j.complement || EUC_DEV610_TYPE_COMPLEMENTAIRE_) : null;
    var x = { date: j.date, nature: j.nature, complement: comp, hm: num(s.hm, dm), ha: num(s.ha, da), fm: String(s.fm || '').trim().toUpperCase(), fa: String(s.fa || '').trim().toUpperCase() };
    x.total = r2(x.hm + x.ha); out.jours.push(x); ajouter(out, comp, x.total);
    [[x.fm, x.hm], [x.fa, x.ha]].forEach(function(d) {
      if (!(d[1] > 0)) return;
      if (!d[0]) { ajouter(out.sansFormateur, comp, d[1]); return; }
      if (!parF[d[0]]) { parF[d[0]] = { initiales: d[0], formation: 0, complementaires: {}, total: 0 }; ordre.push(d[0]); }
      ajouter(parF[d[0]], comp, d[1]); parF[d[0]].total = r2(parF[d[0]].total + d[1]);
    });
  });
  out.formateurs = ordre.sort().map(function(k) { return parF[k]; });
  return out;
}
/* Proposition de rattachement : classes actives dont Classe_PFMP (ou le nom) vaut la classe PFMP de la ligne. */
function EUC_DEV610_proposerClasses_(ligne, classes) {
  var cible = EUC_DEV610_n_(ligne.classePfmp); if (!cible) return [];
  return (classes || []).filter(function(c) { return c.actif !== false && !/^TEST/.test(EUC_DEV610_n_(c.nom)) && EUC_DEV610_n_(c.classePfmp || c.nom) === cible; }).map(function(c) { return c.id; }).sort(function(a, b) { return a - b; });
}

/* ===================== Publication dans Planning_Periodes (calcul pur) ===================== */

/* Compare les périodes en entreprise d'une version aux lignes existantes de l'année.
 * Rapprochement par ligne (mêmes classes), type et rang. Les lignes hors du périmètre ne sont jamais touchées. */
/* Champs propres d'une période publiée (calcul pur) : tout vient de la ligne du planning et de la table Types_Planning,
 * jamais d'une saisie ; c'est ce qui remet au propre les lignes existantes de Planning_Periodes. */
function EUC_DEV610_champsPropres_(l, p, classes, typesParCle) {
  var t = (typesParCle || {})[EUC_DEV610_cleType_(p.type)] || {}, lib = String(l.libelle || '').split('—').pop().trim();
  var c = String(t.couleur || '').trim(); if (/^[0-9A-Fa-f]{6}$/.test(c)) c = '#' + c;
  return { type: String(t.type || p.type || '').trim(), debut: p.debut, fin: p.fin, classes: (classes || []).slice().sort(function(a, b) { return a - b; }),
    formation: String(l.formation || l.groupe || '').trim(), niveau: String(l.niveau || lib).trim(), classePfmp: String(l.classePfmp || '').trim(),
    ligneSheet: Number(l.ligneSheet) || 0, ligneId: Number(l.id) || 0, couleur: /^#[0-9A-Fa-f]{6}$/.test(c) ? c.toUpperCase() : '' };
}
var EUC_DEV610_LIBELLES_CHAMPS_ = { type: 'type', debut: 'début', fin: 'fin', classes: 'classes', formation: 'formation', niveau: 'niveau', classePfmp: 'classe PFMP', ligneSheet: 'ligne', ligneId: 'ligne du planning', couleur: 'couleur' };
/* Champs d'une ligne existante qui diffèrent des champs propres (valeurs brutes : un espace en trop compte). */
function EUC_DEV610_ecarts_(e, propre) {
  var b = e.brut || {}, out = [];
  var val = { type: b.type != null ? b.type : e.type, debut: e.debut, fin: e.fin, classes: (b.classes || e.classes || []).slice().sort(function(x, y) { return x - y; }), formation: b.formation != null ? b.formation : e.formation,
    niveau: b.niveau != null ? b.niveau : e.niveau, classePfmp: b.classePfmp != null ? b.classePfmp : e.classePfmp, ligneSheet: Number(b.ligneSheet) || 0, ligneId: Number(e.ligneId) || 0, couleur: String(b.couleur || '').trim().toUpperCase().replace(/^([0-9A-F]{6})$/, '#$1') };
  Object.keys(EUC_DEV610_LIBELLES_CHAMPS_).forEach(function(k) {
    if (k === 'ligneId' && !e.aLignePlanning) return;
    var a = k === 'classes' ? val[k].join() : String(val[k] == null ? '' : val[k]), n = k === 'classes' ? propre[k].join() : String(propre[k] == null ? '' : propre[k]);
    if (k === 'couleur' && !n) return;
    if (k === 'ligneSheet' && !propre[k]) return;
    if (a !== n) out.push(k);
  });
  return out;
}
/* Publication complète (calcul pur) : toutes les lignes actives, tous les types sauf les formations complémentaires.
 * Chaque ligne existante de l'année est rattachée à sa ligne du planning (comme la reprise), puis appariée par type :
 * mêmes dates d'abord, sinon la plus proche ; elle est remise au propre sur place (les conventions gardent leur
 * période). Les lignes en trop sont désactivées, jamais supprimées ; celles qu'on ne sait pas rattacher restent
 * telles quelles et sont listées. Une période en entreprise d'une ligne sans classe rattachée n'est pas publiée. */
function EUC_DEV610_diffPublication_(version, lignes, rattachements, existantes, annee, opts) {
  opts = opts || {};
  var lignesParCode = {}, parClasse = {}, res = { creer: [], modifier: [], desactiver: [], inchangees: 0, sansClasse: [], nonRattachees: [], laissees: [], tests: 0 };
  var classesParId = opts.classesParId || {}, typesParCle = opts.typesParCle || {}, dossiers = opts.dossiers || {};
  (lignes || []).forEach(function(l) { if (l.actif !== false) lignesParCode[l.code] = l; });
  /* Mixités : les apprentis sont suivis dans les classes scolaires ; leurs lignes ne portent jamais de classe. */
  var classesDe = function(code) { return lignesParCode[code] && lignesParCode[code].calendrier === 'MIXITE' ? [] : (rattachements[code] || []); };
  Object.keys(lignesParCode).forEach(function(code) { classesDe(code).forEach(function(id) { parClasse[id] = code; }); });
  var actives = Object.keys(lignesParCode).map(function(c) { return lignesParCode[c]; });
  var nom = function(code) { return EUC_DEV610_nomLigne_(lignesParCode[code]); };
  var sautes = {}, groupes = {}, grp = function(k) { return groupes[k] = groupes[k] || { existantes: [], nouvelles: [] }; };
  (existantes || []).forEach(function(r) {
    if (r.actif === false || r.annee !== annee || !r.type || !r.debut || !r.fin) return;
    if (r.classes && r.classes.length && r.classes.every(function(id) { var c = classesParId[id]; return c && /^TEST/.test(EUC_DEV610_n_(c.nom)); })) { res.tests++; return; }
    var x = EUC_DEV610_ligneDePeriode_(r, parClasse, classesParId, actives);
    if (!x.ligne || !lignesParCode[x.ligne]) { res.nonRattachees.push({ id: r.id, type: r.type, debut: r.debut, fin: r.fin, formation: r.formation, niveau: r.niveau, raison: x.raison || 'AUCUNE_LIGNE', dossiers: dossiers[r.id] || 0 }); return; }
    grp(x.ligne + '|' + EUC_DEV610_cleType_(r.type)).existantes.push(r);
  });
  ((version && version.periodes) || []).forEach(function(p) {
    var l = lignesParCode[p.ligne]; if (!l || !p.type || EUC_DEV610_estComplementaire_(p.type)) return;
    /* Période en entreprise sans classe : jamais publiée (le suivi ne saurait pas à qui elle s'applique). Pour une mixité,
     * c'est normal : la ligne scolaire de la section publie déjà la période. */
    if (EUC_DEV610_typeFormation_(p.type) && !classesDe(p.ligne).length) { if (l.calendrier !== 'MIXITE' && res.sansClasse.indexOf(nom(p.ligne)) < 0) res.sansClasse.push(nom(p.ligne)); sautes[p.ligne + '|' + EUC_DEV610_cleType_(p.type)] = 1; return; }
    grp(p.ligne + '|' + EUC_DEV610_cleType_(p.type)).nouvelles.push(p);
  });
  /* Colonnes absentes ou de type référence : jamais écrites, donc jamais comptées comme écarts. */
  var propres = function(l, p, classes) { var x = EUC_DEV610_champsPropres_(l, p, classes, typesParCle); if (opts.sansClassePfmp) x.classePfmp = ''; if (opts.sansLigneSheet) x.ligneSheet = 0; return x; };
  var tri = function(a, b) { return String(a.debut).localeCompare(String(b.debut)) || (a.id || 0) - (b.id || 0); };
  var jours = function(a, b) { return Math.abs(Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')); };
  Object.keys(groupes).sort().forEach(function(k) {
    var g = groupes[k], code = k.split('|')[0], l = lignesParCode[code], libelle = nom(code), classes = classesDe(code).slice(), paires = [];
    /* Ligne sans classe rattachée : ses périodes ne sont pas publiées et ses lignes existantes restent telles quelles. */
    if (sautes[k]) { g.existantes.forEach(function(e) { res.laissees.push({ id: e.id, ligne: code, libelle: libelle, type: e.type, debut: e.debut, fin: e.fin, dossiers: dossiers[e.id] || 0 }); }); return; }
    g.existantes.sort(tri); g.nouvelles.sort(tri);
    /* D'abord les périodes identiques (mêmes dates), puis les plus proches dans le temps. */
    g.nouvelles = g.nouvelles.filter(function(p) {
      var i = -1; g.existantes.some(function(e, j) { if (e.debut === p.debut && e.fin === p.fin) { i = j; return true; } return false; });
      if (i < 0) return true; paires.push([g.existantes.splice(i, 1)[0], p]); return false;
    });
    while (g.existantes.length && g.nouvelles.length) {
      var best = null; g.existantes.forEach(function(e, i) { g.nouvelles.forEach(function(p, j) { var d = jours(e.debut, p.debut); if (!best || d < best.d) best = { d: d, i: i, j: j }; }); });
      paires.push([g.existantes.splice(best.i, 1)[0], g.nouvelles.splice(best.j, 1)[0]]);
    }
    g.existantes.forEach(function(e) { paires.push([e, null]); }); g.nouvelles.forEach(function(p) { paires.push([null, p]); });
    paires.forEach(function(x) {
      var e = x[0], p = x[1];
      if (!e) { res.creer.push(Object.assign({ ligne: code, libelle: libelle }, propres(l, p, classes))); return; }
      if (!p) { res.desactiver.push({ id: e.id, ligne: code, libelle: libelle, type: e.type, debut: e.debut, fin: e.fin, dossiers: dossiers[e.id] || 0 }); return; }
      var propre = propres(l, p, classes), ecarts = EUC_DEV610_ecarts_(e, propre);
      if (!ecarts.length) { res.inchangees++; return; }
      res.modifier.push(Object.assign({ id: e.id, ligne: code, libelle: libelle, avant: { debut: e.debut, fin: e.fin, type: (e.brut && e.brut.type != null) ? e.brut.type : e.type, classes: e.classes || [] }, ecarts: ecarts, dossiers: dossiers[e.id] || 0 }, propre));
    });
  });
  return res;
}

/* Code des fonctions pures injecté dans la page (la matrice se calcule sans aller-retour serveur). */
function EUC_DEV610_codeClient_() {
  return [EUC_DEV610_n_, EUC_DEV610_iso_, EUC_DEV610_plus_, EUC_DEV610_semaineIso_, EUC_DEV610_nomVacances_, EUC_DEV610_semaines_, EUC_DEV610_marquerVacances_, EUC_DEV610_placer_, EUC_DEV610_generer_, EUC_DEV610_nomLigne_, EUC_DEV610_ordrePeriodes_, EUC_DEV610_typeFormation_, EUC_DEV610_cleType_, EUC_DEV610_appels_, EUC_DEV610_proposerClasses_, EUC_DEV610_estComplementaire_, EUC_DEV610_libelleType_, EUC_DEV610_bilanHeures_, EUC_DEV610_estEntreprise_, EUC_DEV610_recopier_, EUC_DEV610_libelleMixite_, EUC_DEV610_ligneDeLAnnee_, EUC_DEV610_couvertureMixites_, EUC_DEV610_nomMixite_, EUC_DEV610_regrouper_].map(String).join('\n')
    + '\nvar EUC_DEV610_TYPE_COMPLEMENTAIRE_ = ' + JSON.stringify(EUC_DEV610_TYPE_COMPLEMENTAIRE_) + ';';
}

/* ===================== Table de vérité initiale (observée dans le planning 2026-2027) ===================== */

/* Table de vérité initiale des lignes (version 2 du modèle), dans l'ordre d'affichage.
 * [code, libellé affiché (nom Pronote ou « Mixité … »), calendrier, groupe (bandeau), profil de règles, classe PFMP,
 *  ligne de l'ancienne feuille, ancienne Formation (col. A), ancien Niveau (col. B), établissement support, organismes]
 * Formation / Niveau anciens ne servent qu'à retrouver les périodes saisies avec l'ancien outil. */
var EUC_DEV610_MODELE_ = 2;
var EUC_DEV610_LIGNES_DEFAUT_ = [
  ['1CAP', '1CAP CAR', 'SCOLAIRE', 'CAP', '1CAP', '1CAP CAR', 8, 'CAP', '1 CA', 'LP', ''],
  ['TCAP', 'TCAP CAR', 'SCOLAIRE', 'CAP', 'TCAP', 'TCAP CAR', 9, 'CAP', 'T CA', 'LP', ''],
  ['2BP_CPA', '2CAR', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2CAR', 11, '2 BAC PRO', 'CPA', 'LP', ''],
  ['2BP_MVA', '2MVA', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MVA', 12, '2 BAC PRO', 'MVA', 'LP', ''],
  ['2BP_REMI', '2REMI', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2REMI', 13, '2 BAC PRO', 'REMI', 'LP', ''],
  ['2BP_MP3D', '2MP3D', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MP3D', 14, '2 BAC PRO', 'MP3D', 'LP', ''],
  ['2BP_MTNE', '2MTNE', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MTNE', 15, '2 BAC PRO', 'MTNE', 'LP', ''],
  ['1BP_CIEL', '1CIEL', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1CIEL', 16, '1 BAC PRO', 'CIEL', 'LP', ''],
  ['1BP_CPA', '1CAR', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1CAR', 17, '1 BAC PRO', 'CPA', 'LP', ''],
  ['1BP_MVA', '1MVA', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MVA', 18, '1 BAC PRO', 'MVA', 'LP', ''],
  ['1BP_MELEC', '1MELEC', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MELEC', 19, '1 BAC PRO', 'MELEC', 'LP', ''],
  ['1BP_MP3D', '1MP3D', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MP3D', 20, '1 BAC PRO', 'MP3', 'LP', ''],
  ['1BP_MT', '1MT', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MT', 21, '1 BAC PRO', 'MT', 'LP', ''],
  ['1BP_RMO', '1RMO', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1RMO', 22, '1 BAC PRO', 'RMO', 'LP', ''],
  ['1BP_RSP', '1RSP', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1RSP', 23, '1 BAC PRO', 'RSP', 'LP', ''],
  ['MIX_1BP', '1 BAC PRO Mixité', 'MIXITE', '1 BAC PRO', 'MIX_1BACPRO', '', 24, '1 BAC PRO', 'Mixité', 'LP', 'CFA RAN'],
  ['TBP_CIEL', 'TCIEL', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TCIEL', 25, 'T BAC PRO', 'CIEL', 'LP', ''],
  ['TBP_CPA', 'TCAR', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TCAR', 26, 'T BAC PRO', 'CPA', 'LP', ''],
  ['TBP_MELEC', 'TMELEC', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMELEC', 27, 'T BAC PRO', 'MELEC', 'LP', ''],
  ['TBP_MT', 'TMT', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMT', 28, 'T BAC PRO', 'MT', 'LP', ''],
  ['TBP_MP3D', 'TMP3D', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMP3D', 29, 'T BAC PRO', 'MP3D', 'LP', ''],
  ['TBP_MVA', 'TMVA', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMVA', 30, 'T BAC PRO', 'MVA', 'LP', ''],
  ['TBP_RMO', 'TRMO', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TRMO', 31, 'T BAC PRO', 'RMO', 'LP', ''],
  ['TBP_RSP', 'TRSP', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TRSP', 32, 'T BAC PRO', 'RSP', 'LP', ''],
  ['MIX_TBP', 'T BAC PRO Mixité', 'MIXITE', 'T BAC PRO', 'MIX_TBACPRO', '', 33, 'T BAC PRO', 'Mixité', 'LP', 'CFA RAN'],
  ['1BTS_CIEL', '1BTS CIEL', 'SCOLAIRE', '1 BTS', '1BTS_CIEL', '1BTS CIEL', 35, '1BTS', 'CIEL', 'LGT', ''],
  ['1BTS_ELEC', '1BTS ELEC', 'SCOLAIRE', '1 BTS', '1BTS_ELEC', '1BTS ELEC', 36, '1BTS', 'ELEC', 'LGT', ''],
  ['1BTS_CPI', '1BTS CPI', 'SCOLAIRE', '1 BTS', '1BTS_CPI', '1BTS CPI', 37, '1BTS', 'CPI', 'LGT', ''],
  ['1BTS_CPRP', '1BTS CPRP', 'SCOLAIRE', '1 BTS', '1BTS_CPRP', '1BTS CPRP', 38, '1BTS', 'CPRP', 'LGT', ''],
  ['MIX_1BTS_CPI', '1BTS CPI Mixité', 'MIXITE', '1 BTS', 'MIX_1BTS_CPI', '', 39, '1BTS CPI-CPRP', 'Mixité', 'LGT', 'CFAI'],
  ['MIX_1BTS_CPRP', '1BTS CPRP Mixité', 'MIXITE', '1 BTS', 'MIX_1BTS_CPRP', '', 39, '1BTS CPI-CPRP', 'Mixité', 'LGT', 'CFAI'],
  ['1BTS_MV', '1BTS MV', 'SCOLAIRE', '1 BTS', '1BTS_MV', '1BTS MV', 40, '1BTS', 'MV', 'LGT', ''],
  ['MIX_1BTS_MV', '1BTS MV Mixité', 'MIXITE', '1 BTS', 'MIX_1BTS_MV', '', 41, '1BTS MV', 'Mixité', 'LGT', 'CFA RAN'],
  ['MIX_2BTS_CPI', '2BTS CPI Mixité', 'MIXITE', '2 BTS', 'MIX_2BTS_CPI', '', 42, '2BTS CPI-CPRP', 'Mixité', 'LGT', 'CFAI'],
  ['MIX_2BTS_CPRP', '2BTS CPRP Mixité', 'MIXITE', '2 BTS', 'MIX_2BTS_CPRP', '', 42, '2BTS CPI-CPRP', 'Mixité', 'LGT', 'CFAI'],
  ['2BTS_MV', '2BTS MV', 'SCOLAIRE', '2 BTS', '2BTS_MV', '2BTS MV', 43, '2BTS', 'MV', 'LGT', ''],
  ['MIX_2BTS_MV', '2BTS MV Mixité', 'MIXITE', '2 BTS', 'MIX_2BTS_MV', '', 44, '2BTS MV', 'Mixité', 'LGT', 'CFA RAN'],
  ['TSEC', 'TSEC', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'TSEC', 'TSEC', 34, 'Ducretet', 'TSEC', 'LP', 'CFA RAN, Ducretet'],
  ['BACHELOR_IP', 'Bachelor IP', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'BACHELOR_IP', 'Bachelor IP', 45, 'BACHELOR', 'IP', 'LGT', 'CFAI'],
  ['CAP_PEINTRE', '1CAPP', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'CAP_PEINTRE', '1CAPP', 10, 'CAP Connexe', 'CP', 'LP', 'CFA RAN'],
  ['TPMMA', 'TPMMA', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'TPMMA', 'TPMMA', 0, 'GRETA', 'TPMMA', 'LP', 'GRETA'],
  ['CQPM_ASC', 'CQPM ASC', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'CQPM_ASC', 'CQPM ASC', 0, 'GRETA', 'CQPM ASC', 'LP', 'GRETA, CFAI'],
  ['TPEEB_19', 'TPEEB 19', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'TPEEB_19', 'TPEEB 19', 0, 'GRETA', 'TPEEB 19', 'LP', 'GRETA'],
  ['TPEEB_20', 'TPEEB 20', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'TPEEB_20', 'TPEEB 20', 0, 'GRETA', 'TPEEB 20', 'LP', 'GRETA'],
  ['1BTS_ELEC_ALT', '1BTS ELEC Alt', 'CLASSE_ENTIERE', 'Formation en alternance et continue', '1BTS_ELEC_ALT', '1BTS ELEC Alt', 0, 'BTS ELEC Alt', '1re année', 'LGT', 'CFAI'],
  ['2BTS_ELEC_ALT', '2BTS ELEC Alt', 'CLASSE_ENTIERE', 'Formation en alternance et continue', '2BTS_ELEC_ALT', '2BTS ELEC Alt', 0, 'BTS ELEC Alt', '2e année', 'LGT', 'CFAI'],
  ['1MELEC_G', '1MELEC G', 'CLASSE_ENTIERE', 'Formation en alternance et continue', '1MELEC_G', '1MELEC G', 0, 'GRETA', '1MELEC G', 'LP', 'GRETA'],
  ['TMELEC_G', 'TMELEC G', 'CLASSE_ENTIERE', 'Formation en alternance et continue', 'TMELEC_G', 'TMELEC G', 0, 'GRETA', 'TMELEC G', 'LP', 'GRETA']
];
/* Codes remplacés : la ligne TPEEB unique (→ TPEEB 19 et 20), les mixités CPI-CPRP réunies (→ CPI et CPRP séparées). */
var EUC_DEV610_LIGNES_RETIREES_ = ['TPEEB', 'MIX_1BTS_CPI_CPRP', 'MIX_2BTS_CPI_CPRP'];
/* Nom d'une ligne de mixité (calcul pur) : niveau et section, puis « Mixité » (« 1BTS CPI Mixité », « T BAC PRO Mixité »),
 * pour distinguer les mixités de 1re et de 2e année. */
function EUC_DEV610_libelleMixite_(code) {
  var c = String(code || '').replace(/^MIX_/, ''); c = c === '1BP' ? '1 BAC PRO' : c === 'TBP' ? 'T BAC PRO' : c.replace(/_/g, ' ');
  return (c ? c + ' ' : '') + 'Mixité';
}
/* Ligne présente l'année consultée (calcul pur) : entre sa première et sa dernière année, bornes comprises.
 * Sans bornes, la ligne vaut pour toutes les années. Une formation créée en 2026-2027 n'apparaît pas en 2025-2026. */
function EUC_DEV610_ligneDeLAnnee_(l, annee) {
  var a = String(annee || ''); if (!a) return true;
  return (!l.anneeDebut || a >= l.anneeDebut) && (!l.anneeFin || a <= l.anneeFin);
}
/* Filières couvertes par chaque mixité (calcul pur) : les lignes scolaires cochées sur la mixité ; une mixité sans
 * filière cochée couvre « le reste » des lignes scolaires de son groupe. Rend aussi les alertes (filière couverte
 * deux fois, deux mixités « le reste »). Une filière sans mixité est normale (pas d'apprentis). */
function EUC_DEV610_couvertureMixites_(lignes) {
  var out = {}, alertes = [], groupes = {};
  (lignes || []).forEach(function(l) { var g = groupes[l.groupe] = groupes[l.groupe] || { scolaires: [], mixites: [] };
    if (l.calendrier === 'SCOLAIRE') g.scolaires.push(l); else if (l.calendrier === 'MIXITE') g.mixites.push(l); });
  Object.keys(groupes).forEach(function(nom) {
    var g = groupes[nom], codes = g.scolaires.map(function(l) { return l.code; }), pris = {}, reste = [];
    g.mixites.forEach(function(m) {
      var s = (m.sections || []).filter(function(c) { return codes.indexOf(c) >= 0; });
      /* Sans filière cochée, section lue dans le code (MIX_1BTS_CPI → les lignes scolaires « CPI » du groupe). */
      var suf = /^MIX_/.test(m.code || '') ? EUC_DEV610_n_(String(m.code).replace(/^MIX_/, '').split('_').slice(1).join('')) : '';
      var parCode = !s.length && !!suf;
      if (parCode) s = g.scolaires.filter(function(l) { return EUC_DEV610_n_(l.classePfmp || l.code).indexOf(suf) >= 0; }).map(function(l) { return l.code; });
      if (!s.length && !suf) { reste.push(m); return; }
      out[m.code] = { sections: s, partielle: s.length < codes.length, reste: false, parCode: parCode };
      s.forEach(function(c) { if (pris[c]) alertes.push(nom + ' : la filière ' + c + ' est couverte par deux mixités.'); pris[c] = (pris[c] || 0) + 1; });
    });
    var libres = codes.filter(function(c) { return !pris[c]; });
    if (reste.length > 1) alertes.push(nom + ' : plusieurs mixités sans filière cochée ; cochez les filières de chacune.');
    reste.forEach(function(m) { out[m.code] = { sections: libres, partielle: libres.length < codes.length, reste: libres.length < codes.length }; });
  });
  return { parLigne: out, alertes: alertes };
}
/* Nom automatique d'une mixité (calcul pur) : « 1 BAC PRO Mixité » quand elle couvre tout le groupe,
 * « 1 BAC PRO Mixité MP3D MT » pour une partie, « 1 BAC PRO Mixité (autres filières) » pour le reste. */
function EUC_DEV610_nomMixite_(m, lignes, couverture) {
  var base = /^MIX_/.test(m.code || '') ? EUC_DEV610_libelleMixite_(m.code) : String(m.groupe || '').trim() + ' Mixité';
  var c = (couverture || {})[m.code]; if (!c || !c.partielle || c.parCode) return base;
  if (c.reste) return base + ' (autres filières)';
  var court = function(code) { var l = (lignes || []).filter(function(x) { return x.code === code; })[0] || {}; return String(l.classePfmp || l.libelle || code).replace(/^(1|T|2)(?=[A-Z])/, ''); };
  return base + ' ' + c.sections.map(court).join(' ');
}
/* Anciens noms par défaut des mixités (« Mixité », « Mixité CPI »…) : renommés une fois ; un nom saisi n'est jamais touché. */
var EUC_DEV610_ANCIENS_NOMS_MIXITE_ = ['Mixité', 'Mixité CPI', 'Mixité CPRP', 'Mixité MV'];
var EUC_DEV610_ORGANISMES_ = ['CFA RAN', 'CFAI', 'GRETA', 'Ducretet'];
/* [profil, numéro, type, durée (semaines), placement, ancrage, période d'ancrage, position, écart] */
var EUC_DEV610_REGLES_DEFAUT_ = [
  ['TBACPRO', 1, 'PFMP Tbac', 3, 'AUTO', 'TOUSSAINT', 0, 'AVANT', 0], ['TBACPRO', 2, 'PFMP Tbac', 3, 'AUTO', 'REGLE', 3, 'AVANT', 0], ['TBACPRO', 3, 'P.dif.', 2, 'AUTO', 'HIVER', 0, 'AVANT', 0],
  ['1BACPRO', 1, 'PFMP 1ère', 4, 'AUTO', 'NOEL', 0, 'AVANT', 0], ['1BACPRO', 2, 'PFMP 1ère', 4, 'AUTO', 'PRINTEMPS', 0, 'AVANT', 0],
  ['2NDE', 1, 'PFMP 2nde', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1CAP', 1, 'PFMP 1 CAP', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['TCAP', 1, 'PFMP T CAP', 3, 'MANUEL', '', 0, 'AVANT', 0], ['TCAP', 2, 'PFMP T CAP', 4, 'MANUEL', '', 0, 'AVANT', 0],
  ['1BTS_CIEL', 1, 'Stage BTS', 6, 'AUTO', 'ETE', 0, 'AVANT', 0], ['1BTS_ELEC', 1, 'Stage BTS', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1BTS_CPI', 1, 'Stage BTS', 8, 'AUTO', 'ETE', 0, 'AVANT', 0], ['1BTS_CPRP', 1, 'Stage BTS', 8, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1BTS_MV', 1, 'Stage BTS', 5, 'AUTO', 'ETE', 0, 'AVANT', 0], ['2BTS_MV', 1, 'Stage BTS', 5, 'AUTO', 'NOEL', 0, 'AVANT', 0]
];

/* ===================== Accès Grist ===================== */

function EUC_DEV610_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV610_lire_(table) { try { return EUC_ENT_grist('get', '/tables/' + table + '/records').records || []; } catch (e) { return []; } }
function EUC_DEV610_ref_(v) { return typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(v) : (Array.isArray(v) ? Number(v[1]) : Number(v) || 0); }
function EUC_DEV610_refs_(v) { if (typeof EUC_SUIVI2_refs_ === 'function') return EUC_SUIVI2_refs_(v); return Array.isArray(v) ? v.filter(function(x) { return typeof x === 'number'; }) : []; }
function EUC_DEV610_date_(v) { return typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(v) : EUC_DEV610_t_(v).slice(0, 10); }

/* Écriture de lignes Grist : Grist exige que toutes les lignes d'une même requête portent les mêmes colonnes.
 * Les lignes sont donc regroupées par jeu de colonnes, puis envoyées par paquets de 200. */
function EUC_DEV610_ecrire_(methode, table, records) {
  var groupes = {}, ordre = [];
  (records || []).forEach(function(r) { var k = Object.keys(r.fields || {}).sort().join('|'); if (!groupes[k]) { groupes[k] = []; ordre.push(k); } groupes[k].push(r); });
  var ids = [];
  ordre.forEach(function(k) { var g = groupes[k]; for (var i = 0; i < g.length; i += 200) { var res = EUC_ENT_grist(methode, '/tables/' + table + '/records', { records: g.slice(i, i + 200) }) || {}; (res.records || []).forEach(function(x) { ids.push(x.id); }); } });
  return ids;
}
/* Actions Grist groupées : en cas de refus, l'erreur nomme l'étape et reprend le message de Grist (jamais la clé). */
function EUC_DEV610_apply_(actions, etape) {
  var c = typeof EUC_ENT_lireConfiguration === 'function' ? EUC_ENT_lireConfiguration() : {};
  if (!c.EUC_ENT_GRIST_API_URL || !c.EUC_ENT_GRIST_DOC_ID || !c.EUC_ENT_GRIST_API_KEY) return EUC_ENT_grist('post', '/apply', actions);
  if (typeof EUC_ENT_controlerCibleRecette_ === 'function') EUC_ENT_controlerCibleRecette_();
  var r = UrlFetchApp.fetch(c.EUC_ENT_GRIST_API_URL.replace(/\/$/, '') + '/api/docs/' + encodeURIComponent(c.EUC_ENT_GRIST_DOC_ID) + '/apply', { method: 'post', muteHttpExceptions: true, contentType: 'application/json', payload: JSON.stringify(actions), headers: { Authorization: 'Bearer ' + c.EUC_ENT_GRIST_API_KEY, Accept: 'application/json' } });
  var code = r.getResponseCode();
  if (code < 200 || code >= 300) { var txt = String(r.getContentText() || '').replace(/\s+/g, ' ').slice(0, 300); throw new Error('Grist a refusé l’étape « ' + (etape || 'modification') + ' » (' + code + ') : ' + txt); }
  return JSON.parse(r.getContentText() || '{}');
}
/* Étape nommée : une erreur dit ce qui était en cours. */
function EUC_DEV610_etape_(nom, fn) { try { return fn(); } catch (e) { var m = String(e && e.message || e).replace(/^Error:\s*/, ''); throw new Error(/étape/.test(m) ? m : 'Échec de l’étape « ' + nom + ' » : ' + m); } }

var EUC_DEV610_AVERT_ = [];
function EUC_DEV610_tables_() {
  var cache = CacheService.getScriptCache(); if (cache.get('EUC_DEV610_TABLES11')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  var def = {};
  def[EUC_DEV610_T_.lignes] = EUC_DEV610_defLignes_();
  def[EUC_DEV610_T_.rattachements] = [col('Annee_scolaire', 'Année scolaire'), col('Ligne', 'Ligne (code)'), col('Classes', 'Classes', 'RefList:Classes'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.regles] = [col('Annee_scolaire', 'Année scolaire'), col('Profil', 'Profil'), col('Numero', 'Numéro', 'Int'), col('Type', 'Type'), col('Duree_semaines', 'Durée (semaines)', 'Numeric'), col('Placement', 'Placement'), col('Ancrage', 'Ancrage'), col('Regle_ancrage', 'Période d’ancrage', 'Int'), col('Position', 'Position'), col('Ecart_semaines', 'Écart (semaines)', 'Int'), col('Reference_texte', 'Texte de référence'), col('Actif', 'Actif', 'Bool')];
  def[EUC_DEV610_T_.versions] = [col('Annee_scolaire', 'Année scolaire'), col('Numero', 'Numéro', 'Int'), col('Statut', 'Statut'), col('Base_dates', 'Base des dates'), col('Commentaire', 'Commentaire'), col('Periodes_json', 'Périodes (JSON)'), col('Auteur', 'Auteur'), col('Date_creation', 'Date de création'), col('Date_publication', 'Date de publication')];
  def[EUC_DEV610_T_.jours] = [col('Annee_scolaire', 'Année scolaire'), col('Date', 'Date', 'Date'), col('Nature', 'Nature'), col('Libelle', 'Libellé'), col('Heures', 'Heures', 'Numeric'), col('Actif', 'Actif', 'Bool')];
  def[EUC_DEV610_T_.heures] = [col('Annee_scolaire', 'Année scolaire'), col('Ligne', 'Ligne (code)'), col('Date', 'Date', 'Date'), col('Heures_matin', 'Heures du matin', 'Numeric'), col('Heures_apres_midi', 'Heures de l’après-midi', 'Numeric'), col('Formateur_matin', 'Formateur du matin'), col('Formateur_apres_midi', 'Formateur de l’après-midi'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.formations] = [col('Annee_scolaire', 'Année scolaire'), col('Ligne', 'Ligne (code)'), col('Debut_formation', 'Début de la formation', 'Date'), col('Fin_formation', 'Fin de la formation', 'Date'), col('Titre', 'Titre du calendrier'), col('Sous_titre', 'Sous-titre du calendrier'), col('Intitule', 'Intitulé du diplôme affiché'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.couleurs] = [col('Type', 'Type de période'), col('Couleur', 'Couleur (#RRGGBB)'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.parametres] = [col('Cle', 'Clé'), col('Valeur', 'Valeur'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.logos] = [col('Organisme', 'Organisme'), col('Image', 'Image (redimensionnée, data URL)'), col('Date_modification', 'Date modification')];
  var manquantes = Object.keys(def).filter(function(t) { return ids.indexOf(t) < 0; });
  if (manquantes.length) EUC_DEV610_etape_('création des tables du générateur', function() { EUC_ENT_grist('post', '/tables', { tables: manquantes.map(function(t) { return { id: t, columns: def[t] }; }) }); });
  try { var cf = (EUC_ENT_grist('get', '/tables/' + EUC_DEV610_T_.formations + '/columns').columns || []).map(function(c) { return c.id; }); if (cf.length && cf.indexOf('Intitule') < 0) EUC_ENT_grist('post', '/tables/' + EUC_DEV610_T_.formations + '/columns', { columns: [col('Intitule', 'Intitulé du diplôme affiché')] }); } catch (e) { console.log('DEV610_INTITULE ' + e); }
  try { EUC_DEV610_etape_('mise à jour des lignes de planning', EUC_DEV610_migrerLignes_); }
  catch (e) { EUC_DEV610_AVERT_.push(String(e && e.message || e)); console.log('DEV610_MIGRATION ' + String(e && e.message || e)); return; }
  cache.put('EUC_DEV610_TABLES11', '1', 21600);
}

function EUC_DEV610_champsLigneDefaut_(l, i) {
  return { Code: l[0], Libelle: l[1], Calendrier: l[2], Groupe: l[3], Profil: l[4], Classe_PFMP: l[5], Ordre: (i + 1) * 10, Ligne_sheet: l[6] || null, Formation: l[7], Niveau: l[8], Etablissement: l[9] || '', Organismes: l[10] || '', Heures_jour: l[2] === 'SCOLAIRE' ? null : 7, Version_modele: EUC_DEV610_MODELE_, Actif: true };
}
/* Met la table des lignes au modèle courant : colonnes manquantes ; lignes jamais modifiées dans la page
 * (Version_modele inférieure) remplacées par la table de vérité ; codes remplacés désactivés ; lignes manquantes créées.
 * Les lignes enregistrées depuis « Organisation du tableau » (Version_modele à jour) ne sont jamais écrasées. */
/* Colonnes ajoutées au fil des versions à EUC_PLAN_LIGNES : créées si absentes (au chargement et avant chaque
 * enregistrement de l'organisation, pour qu'une écriture ne vise jamais une colonne inconnue de Grist). */
function EUC_DEV610_defLignes_() {
  var col = EUC_DEV441_col_;
  return [col('Code', 'Code'), col('Libelle', 'Libellé'), col('Calendrier', 'Calendrier'), col('Groupe', 'Groupe d’affichage'), col('Profil', 'Profil de règles'), col('Classe_PFMP', 'Classe PFMP'), col('Formation', 'Formation (colonne A)'), col('Niveau', 'Niveau (colonne B)'), col('Ordre', 'Ordre', 'Int'), col('Ligne_sheet', 'Ligne de l’ancienne feuille', 'Int'), col('Quota_heures', 'Quota d’heures', 'Numeric'), col('Heures_jour', 'Heures par jour', 'Numeric'), col('Jours_lycee', 'Jours au lycée'), col('Annee_debut', 'Première année'), col('Annee_fin', 'Dernière année'), col('Sections', 'Filières couvertes (mixité)'), col('Etablissement', 'Établissement support'), col('Organismes', 'Organismes de formation'), col('Version_modele', 'Version du modèle', 'Int'), col('Heures_matin', 'Heures du matin par défaut', 'Numeric'), col('Heures_apres_midi', 'Heures de l’après-midi par défaut', 'Numeric'), col('Formateurs', 'Saisie des formateurs', 'Bool'), col('Actif', 'Actif', 'Bool')];
}
function EUC_DEV610_colonnesLignes_() {
  var t = EUC_DEV610_T_.lignes;
  var cols = (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).map(function(c) { return c.id; });
  /* Toute la définition de la table, pas une liste à tenir à jour : aucune colonne ne peut manquer. */
  var ajout = EUC_DEV610_defLignes_().filter(function(c) { return cols.indexOf(c.id) < 0; });
  if (ajout.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: ajout });
}
function EUC_DEV610_migrerLignes_() {
  var t = EUC_DEV610_T_.lignes;
  EUC_DEV610_colonnesLignes_();
  var existantes = {}; EUC_DEV610_lire_(t).forEach(function(r) { existantes[EUC_DEV610_t_((r.fields || {}).Code)] = r; });
  var aJour = function(r) { return Number((r.fields || {}).Version_modele) >= EUC_DEV610_MODELE_; };
  var creer = [], modifier = [], connus = {};
  EUC_DEV610_LIGNES_DEFAUT_.forEach(function(l, i) {
    connus[l[0]] = 1; var r = existantes[l[0]], f = EUC_DEV610_champsLigneDefaut_(l, i);
    if (!r) creer.push({ fields: f });
    else if (!aJour(r)) { delete f.Code; delete f.Heures_jour; modifier.push({ id: r.id, fields: f }); }
  });
  Object.keys(existantes).forEach(function(c) { var r = existantes[c]; if (connus[c] || aJour(r)) return;
    modifier.push({ id: r.id, fields: { Actif: EUC_DEV610_LIGNES_RETIREES_.indexOf(c) >= 0 ? false : r.fields.Actif !== false, Version_modele: EUC_DEV610_MODELE_ } }); });
  /* Ancien nom du groupe des classes entières et de la formation continue : renommé une fois (nom exact seulement). */
  Object.keys(existantes).forEach(function(c) { var r = existantes[c], f = r.fields || {}; if (EUC_DEV610_t_(f.Groupe) !== 'Formation continue et alternance') return;
    var m = modifier.filter(function(x) { return x.id === r.id; })[0]; if (m) m.fields.Groupe = 'Formation en alternance et continue'; else modifier.push({ id: r.id, fields: { Groupe: 'Formation en alternance et continue' } }); });
  Object.keys(existantes).forEach(function(c) { var r = existantes[c], f = r.fields || {}, lib = EUC_DEV610_t_(f.Libelle);
    if (!/^MIX_/.test(c) || EUC_DEV610_ANCIENS_NOMS_MIXITE_.indexOf(lib) < 0) return;
    var m = modifier.filter(function(x) { return x.id === r.id; })[0]; if (m) { m.fields.Libelle = EUC_DEV610_libelleMixite_(c); return; }
    modifier.push({ id: r.id, fields: { Libelle: EUC_DEV610_libelleMixite_(c) } }); });
  if (creer.length) EUC_DEV610_ecrire_('post', t, creer);
  if (modifier.length) EUC_DEV610_ecrire_('patch', t, modifier);
  /* Étape facultative : un refus de Grist ne doit jamais bloquer la page (la valeur reste contrôlée à l'enregistrement). */
  try { var cal = EUC_DEV610_colonnesDetail_(t).Calendrier;
    if (cal && cal.type !== 'Choice') EUC_DEV610_apply_([['ModifyColumn', t, 'Calendrier', { type: 'Choice', widgetOptions: JSON.stringify({ choices: EUC_DEV610_CALENDRIERS_ }) }]], 'liste déroulante Calendrier');
  } catch (e) { console.log('DEV610_CALENDRIER_CHOICE ' + String(e && e.message || e)); }
}
var EUC_DEV610_CALENDRIERS_ = ['SCOLAIRE', 'MIXITE', 'CLASSE_ENTIERE'];
/* Code d'une nouvelle ligne (calcul pur) : majuscules, chiffres et _, unique. */
function EUC_DEV610_nouveauCode_(base, existants) {
  var c = EUC_DEV610_t_(base).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'LIGNE', k = c, i = 2;
  while (existants.indexOf(k) >= 0) k = c + '_' + (i++);
  return k;
}
/* Ligne proposée pour une classe Pronote sans ligne (calcul pur) : calendrier d'après l'établissement et la modalité,
 * groupe et position d'après les lignes dont la classe PFMP commence pareil (1…, T…, 2…, 1BTS…). */
function EUC_DEV610_ligneProposee_(classe, lignes) {
  var m = EUC_DEV610_n_(classe.modalite), e = EUC_DEV610_n_(classe.etab), cal = /GRETA|CFA/.test(e) || /CLASSEENTIERE|FORMATIONCONTINUE/.test(m) ? 'CLASSE_ENTIERE' : 'SCOLAIRE';
  var orgs = [classe.gestionnaire, classe.donneur, /GRETA/.test(e) ? 'GRETA' : ''].filter(function(x, i, a) { return x && a.indexOf(x) === i; });
  var cp = classe.classePfmp || classe.nom, n = EUC_DEV610_n_(cp), voisine = null, meilleur = 0;
  (lignes || []).forEach(function(l) { if (l.calendrier !== cal) return; var x = EUC_DEV610_n_(l.classePfmp), k = 0; while (k < x.length && k < n.length && x[k] === n[k]) k++; if (k > meilleur || (k === meilleur && voisine && l.ordre > voisine.ordre)) { meilleur = k; voisine = l; } });
  if (meilleur < 1) voisine = null;
  return { code: '', libelle: cp, calendrier: cal, groupe: voisine ? voisine.groupe : (cal === 'CLASSE_ENTIERE' ? 'Formation en alternance et continue' : 'À classer'),
    profil: voisine && cal === 'SCOLAIRE' ? voisine.profil : '', classePfmp: cp, formation: voisine ? voisine.formation : cp, niveau: cp, apres: voisine ? voisine.code : '', actif: true, classeId: classe.id,
    etablissement: /^(LP|LGT)$/.test(e) ? e : (voisine ? voisine.etablissement : ''), organismes: cal === 'SCOLAIRE' ? [] : orgs };
}

function EUC_DEV610_annees_() {
  return EUC_DEV610_lire_('Annees_Scolaires').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV610_t_(f.Code || f.Libelle), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), active: f.Active === true, previsionnelle: f.Previsionnelle === true, zone: EUC_DEV610_t_(f.Zone) }; })
    .filter(function(a) { return /^\d{4}-\d{4}$/.test(a.code); }).sort(function(a, b) { return a.code.localeCompare(b.code); });
}
function EUC_DEV610_codeAnnee_(v, annees) {
  var id = EUC_DEV610_ref_(v); if (id) { var a = annees.filter(function(x) { return x.id === id; })[0]; if (a) return a.code; }
  var m = EUC_DEV610_t_(v).match(/20\d{2}-20\d{2}/); return m ? m[0] : '';
}
/* Réglages d'heures proposés tant qu'ils ne sont pas enregistrés (calcul pur) : journées de 7 h (4 h + 3 h) pour toutes
 * les formations, mixités comprises, sauf le CAP peintre en journées de 8 h (4 h + 4 h, décision du 20/10/2026) ;
 * quota des classes entières (CAP 450 h, Bachelor 455 h, BAC PRO et BTS 675 h) ; formateurs saisis pour le CAP peintre. */
function EUC_DEV610_reglagesHeures_(l) {
  var txt = EUC_DEV610_n_([l.code, l.libelle, l.classePfmp].join(' ')), entiere = l.calendrier === 'CLASSE_ENTIERE';
  if (l.heuresMatin == null) l.heuresMatin = 4;
  if (l.heuresApresMidi == null) l.heuresApresMidi = l.code === 'CAP_PEINTRE' ? 4 : 3;
  if (l.quota == null) l.quota = !entiere ? null : /BACHELOR/.test(txt) ? 455 : /BTS|BAC|BP|MELEC/.test(txt) ? 675 : /CAP/.test(txt) ? 450 : null;
  if (l.formateurs == null) l.formateurs = l.code === 'CAP_PEINTRE';
  return l;
}
function EUC_DEV610_lignes_() {
  return EUC_DEV610_lire_(EUC_DEV610_T_.lignes).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV610_t_(f.Code), libelle: EUC_DEV610_t_(f.Libelle) || EUC_DEV610_t_(f.Code), calendrier: EUC_DEV610_t_(f.Calendrier) || 'SCOLAIRE', groupe: EUC_DEV610_t_(f.Groupe), profil: EUC_DEV610_t_(f.Profil) || EUC_DEV610_t_(f.Code), classePfmp: EUC_DEV610_t_(f.Classe_PFMP), formation: EUC_DEV610_t_(f.Formation), niveau: EUC_DEV610_t_(f.Niveau), etablissement: EUC_DEV610_t_(f.Etablissement), organismes: EUC_DEV610_t_(f.Organismes).split(/\s*,\s*/).filter(Boolean), ordre: Number(f.Ordre) || 0, ligneSheet: Number(f.Ligne_sheet) || 0, actif: f.Actif !== false, heuresMatin: f.Heures_matin == null ? null : Number(f.Heures_matin), heuresApresMidi: f.Heures_apres_midi == null ? null : Number(f.Heures_apres_midi), quota: f.Quota_heures == null ? null : Number(f.Quota_heures), formateurs: f.Formateurs == null ? null : f.Formateurs === true, anneeDebut: EUC_DEV610_t_(f.Annee_debut), anneeFin: EUC_DEV610_t_(f.Annee_fin), sections: EUC_DEV610_t_(f.Sections).split(/\s*,\s*/).filter(Boolean) }; })
    .map(EUC_DEV610_reglagesHeures_)
    .filter(function(l) { return l.code; }).sort(function(a, b) { return a.ordre - b.ordre || a.code.localeCompare(b.code); });
}
function EUC_DEV610_regles_(annee) {
  return EUC_DEV610_lire_(EUC_DEV610_T_.regles).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), annee: EUC_DEV610_t_(f.Annee_scolaire), profil: EUC_DEV610_t_(f.Profil), numero: Number(f.Numero) || 0, type: EUC_DEV610_t_(f.Type), duree: Number(f.Duree_semaines) || 0, placement: EUC_DEV610_t_(f.Placement) || 'AUTO', ancrage: EUC_DEV610_t_(f.Ancrage), regleAncrage: Number(f.Regle_ancrage) || 0, position: EUC_DEV610_t_(f.Position) || 'AVANT', ecart: Number(f.Ecart_semaines) || 0, reference: EUC_DEV610_t_(f.Reference_texte), actif: f.Actif !== false }; })
    .filter(function(r) { return r.actif && (!annee || r.annee === annee); });
}
function EUC_DEV610_reglesDefaut_(annee) {
  return EUC_DEV610_REGLES_DEFAUT_.map(function(r) { return { id: 0, annee: annee, profil: r[0], numero: r[1], type: r[2], duree: r[3], placement: r[4], ancrage: r[5], regleAncrage: r[6], position: r[7], ecart: r[8], reference: '', actif: true }; });
}
/* Vacances de l'année. Les vacances prévisionnelles comptent même décochées « Actif » (comme dans la table actuelle). */
function EUC_DEV610_vacances_(annee, annees) {
  annees = annees || EUC_DEV610_annees_();
  return EUC_DEV610_lire_('Vacances_Scolaires').map(function(r) { var f = r.fields || {}; return { annee: EUC_DEV610_codeAnnee_(f.Annee_scolaire, annees), nom: EUC_DEV610_t_(f.Nom_vacances), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), previsionnel: f.Previsionnel === true || /PREVISION/.test(EUC_DEV610_n_(f.Statut)), commentaire: EUC_DEV610_t_(f.Commentaire), actif: f.Actif !== false }; })
    .filter(function(v) { return (v.actif || v.previsionnel) && v.debut && v.fin && (!annee || v.annee === annee); });
}
function EUC_DEV610_classes_() {
  return EUC_DEV610_lire_('Classes').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: EUC_DEV610_t_(f.Nom || f.Libelle), classePfmp: EUC_DEV610_t_(f.Classe_PFMP), etab: EUC_DEV610_t_(f.Etab), modalite: EUC_DEV610_t_(f.Modalite_apprentissage), gestionnaire: EUC_DEV610_t_(f.Organisme_gestionnaire), donneur: EUC_DEV610_t_(f.Organisme_donneur_ordre), actif: f.Actif !== false }; })
    .filter(function(c) { return c.nom; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
}
function EUC_DEV610_rattachements_(annee) {
  var out = {}, ids = {};
  EUC_DEV610_lire_(EUC_DEV610_T_.rattachements).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV610_t_(f.Annee_scolaire) !== annee) return; var code = EUC_DEV610_t_(f.Ligne); if (!code || (ids[code] && ids[code] > r.id)) return; ids[code] = Number(r.id); out[code] = EUC_DEV610_refs_(f.Classes).map(Number).sort(function(a, b) { return a - b; }); });
  return { classes: out, ids: ids };
}
function EUC_DEV610_types_() {
  return EUC_DEV610_lire_('Types_Planning').map(function(r) { var f = r.fields || {}; return { type: EUC_DEV610_t_(f.Type), libelle: EUC_DEV610_t_(f.Libelle), couleur: EUC_DEV610_t_(f.Couleur) }; }).filter(function(t) { return t.type; });
}
function EUC_DEV610_versions_(annee) {
  return EUC_DEV610_lire_(EUC_DEV610_T_.versions).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), annee: EUC_DEV610_t_(f.Annee_scolaire), numero: Number(f.Numero) || 0, statut: EUC_DEV610_t_(f.Statut) || 'BROUILLON', base: EUC_DEV610_t_(f.Base_dates), commentaire: EUC_DEV610_t_(f.Commentaire), json: EUC_DEV610_t_(f.Periodes_json), auteur: EUC_DEV610_t_(f.Auteur), creation: EUC_DEV610_t_(f.Date_creation), publication: EUC_DEV610_t_(f.Date_publication) }; })
    .filter(function(v) { return v.annee === annee; }).sort(function(a, b) { return a.numero - b.numero; });
}
function EUC_DEV610_jours_(annee) {
  return EUC_DEV610_lire_(EUC_DEV610_T_.jours).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), annee: EUC_DEV610_t_(f.Annee_scolaire), date: EUC_DEV610_date_(f.Date), nature: EUC_DEV610_t_(f.Nature), libelle: EUC_DEV610_t_(f.Libelle), heures: f.Heures == null ? null : Number(f.Heures), actif: f.Actif !== false }; })
    .filter(function(j) { return j.actif && j.annee === annee && j.date; });
}
/* Périodes en place dans Planning_Periodes (lecture seule, forme simplifiée). */
function EUC_DEV610_existantes_(annees) {
  return EUC_DEV610_lire_('Planning_Periodes').map(function(r) { var f = r.fields || {}; var ids = EUC_DEV610_refs_(f.Classes_concernees).map(Number); if (!ids.length && EUC_DEV610_ref_(f.Classe)) ids = [EUC_DEV610_ref_(f.Classe)];
    return { id: Number(r.id), annee: EUC_DEV610_codeAnnee_(f.Annee_scolaire, annees), type: EUC_DEV610_t_(f.Type), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), classes: ids, actif: f.Actif !== false, formation: EUC_DEV610_t_(f.Formation), niveau: EUC_DEV610_t_(f.Niveau), classePfmp: typeof f.Classe_PFMP === 'string' ? EUC_DEV610_t_(f.Classe_PFMP) : '', ligneId: EUC_DEV610_ref_(f.Ligne_planning) || 0, aLignePlanning: 'Ligne_planning' in f,
      /* Valeurs brutes : la publication remet au propre ce qui a été saisi à la main (espaces, libellés, couleurs). */
      brut: { type: typeof f.Type === 'string' ? f.Type : null, formation: typeof f.Formation === 'string' ? f.Formation : '', niveau: typeof f.Niveau === 'string' ? f.Niveau : '', classePfmp: typeof f.Classe_PFMP === 'string' ? f.Classe_PFMP : '', ligneSheet: Number(f.Ligne_sheet) || 0, couleur: typeof f.Couleur === 'string' ? f.Couleur : '', classes: EUC_DEV610_refs_(f.Classes_concernees).map(Number) } }; });
}

/* ===================== Services de la page ===================== */

function EUC_DEV610_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Plannings_DEV610');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  var prm = (e && e.parameter) || {}, propre = function(v) { return EUC_DEV610_t_(v).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40); };
  t.annee = EUC_DEV610_t_(prm.annee).replace(/[^0-9-]/g, '').slice(0, 9);
  t.onglet = propre(prm.onglet); t.vue = propre(prm.vue); t.ligne = propre(prm.ligne);
  t.codeClient = EUC_DEV610_codeClient_();
  return t.evaluate().setTitle('Plannings annuels').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function EUC_DEV610_charger(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  EUC_DEV610_tables_();
  var annees = EUC_DEV610_annees_();
  if (!annees.length) throw new Error('Aucune année dans Annees_Scolaires.');
  var courante = typeof EUC_SUIVI2_anneeCourante_ === 'function' ? EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_()) : '';
  var code = EUC_DEV610_t_(q.annee), annee = annees.filter(function(a) { return a.code === code; })[0];
  if (!annee) { var suivante = annees.filter(function(a) { return a.code > courante; })[0]; annee = suivante || annees[annees.length - 1]; }
  var regles = EUC_DEV610_regles_(annee.code), origineRegles = 'ENREGISTREES';
  if (!regles.length) {
    var precedentes = EUC_DEV610_regles_('').filter(function(r) { return r.annee < annee.code; });
    var derniere = precedentes.map(function(r) { return r.annee; }).sort().pop();
    if (derniere) { regles = precedentes.filter(function(r) { return r.annee === derniere; }).map(function(r) { return Object.assign({}, r, { id: 0, annee: annee.code }); }); origineRegles = 'COPIE_' + derniere; }
    else { regles = EUC_DEV610_reglesDefaut_(annee.code); origineRegles = 'DEFAUT'; }
  }
  var lignes = EUC_DEV610_lignes_(), classes = EUC_DEV610_classes_(), ratt = EUC_DEV610_rattachements_(annee.code);
  var lignesAnnee = lignes.filter(function(l) { return l.actif && EUC_DEV610_ligneDeLAnnee_(l, annee.code); });
  var rattachements = {}, proposes = {};
  lignes.forEach(function(l) { var p = EUC_DEV610_proposerClasses_(l, classes); proposes[l.code] = p; rattachements[l.code] = ratt.classes[l.code] || p; });
  var versions = EUC_DEV610_versions_(annee.code).map(function(v) { var p = []; try { p = JSON.parse(v.json || '[]'); } catch (e) {} return { id: v.id, numero: v.numero, statut: v.statut, base: v.base, commentaire: v.commentaire, auteur: v.auteur, creation: v.creation, publication: v.publication, periodes: p }; });
  var existantes = EUC_DEV610_existantes_(annees).filter(function(p) { return p.annee === annee.code && p.actif && EUC_DEV610_typeFormation_(p.type); });
  var prises = {}; Object.keys(rattachements).forEach(function(c) { (rattachements[c] || []).forEach(function(id) { prises[id] = 1; }); });
  var parPfmp = {}; lignes.forEach(function(l) { if (l.classePfmp) parPfmp[EUC_DEV610_n_(l.classePfmp)] = 1; });
  var nouvelles = classes.filter(function(c) { return c.actif && !prises[c.id] && !/^TEST/.test(EUC_DEV610_n_(c.nom)) && !parPfmp[EUC_DEV610_n_(c.classePfmp || c.nom)]; })
    .map(function(c) { return { classe: { id: c.id, nom: c.nom, classePfmp: c.classePfmp, etab: c.etab, modalite: c.modalite }, proposition: EUC_DEV610_ligneProposee_(c, lignes) }; });
  return { annees: annees, annee: annee, courante: courante, vacances: EUC_DEV610_vacances_(annee.code, annees), jours: EUC_DEV610_jours_(annee.code), heures: EUC_DEV610_heures_(annee.code), formations: EUC_DEV610_formations_(annee.code), diplomes: EUC_DEV610_diplomes_(rattachements, lignesAnnee), organismesLignes: EUC_DEV610_organismesLignes_(lignesAnnee, rattachements, classes), modalitesLignes: EUC_DEV610_modalitesLignes_(lignes, rattachements, classes), suite: EUC_DEV610_suite_(annee, annees), logos: EUC_DEV610_logos_(), organismesLogos: EUC_DEV610_ORGANISMES_LOGOS_, toutesVacances: EUC_DEV610_toutesVacances_(annees), nomsVacances: EUC_DEV610_NOMS_VACANCES_, lignes: lignes, classes: classes, rattachements: rattachements, proposes: proposes, rattachementsEnregistres: Object.keys(ratt.classes), regles: regles, origineRegles: origineRegles, types: EUC_DEV610_types_(), versions: versions, publiees: existantes.length, nouvellesClasses: nouvelles, couleurs: EUC_DEV610_couleurs_(), parametres: (function() { var p = EUC_DEV610_parametres_(); delete p.ids; return p; })(), calendriers: EUC_DEV610_CALENDRIERS_, retirees: EUC_DEV610_LIGNES_RETIREES_, organismes: EUC_DEV610_ORGANISMES_, avertissements: EUC_DEV610_AVERT_.slice() };
}

/* Enregistre les règles d'une année : mise à jour, création, retrait (Actif = false). */
function EUC_DEV610_enregistrerRegles(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var annee = EUC_DEV610_t_(q.annee); if (!/^\d{4}-\d{4}$/.test(annee)) throw new Error('Année scolaire invalide.');
  var vues = {}, creer = [], modifier = [];
  (q.regles || []).forEach(function(r) {
    var profil = EUC_DEV610_t_(r.profil), numero = Math.round(Number(r.numero)), duree = Number(r.duree);
    if (!profil || !(numero > 0)) throw new Error('Chaque règle doit avoir un profil et un numéro.');
    if (vues[profil + '|' + numero]) throw new Error('Règle en double : ' + profil + ' n°' + numero + '.'); vues[profil + '|' + numero] = 1;
    if (!(duree > 0 && duree <= 20)) throw new Error(profil + ' n°' + numero + ' : durée entre 1 et 20 semaines.');
    var placement = r.placement === 'MANUEL' ? 'MANUEL' : 'AUTO', ancrage = EUC_DEV610_t_(r.ancrage).toUpperCase();
    if (placement === 'AUTO' && ['TOUSSAINT', 'NOEL', 'HIVER', 'PRINTEMPS', 'ETE', 'REGLE'].indexOf(ancrage) < 0) throw new Error(profil + ' n°' + numero + ' : choisissez les vacances (ou la période) d’ancrage.');
    if (ancrage === 'REGLE' && !(Number(r.regleAncrage) > 0)) throw new Error(profil + ' n°' + numero + ' : indiquez la période d’ancrage.');
    var champs = { Annee_scolaire: annee, Profil: profil, Numero: numero, Type: EUC_DEV610_t_(r.type), Duree_semaines: duree, Placement: placement, Ancrage: ancrage, Regle_ancrage: Number(r.regleAncrage) || 0, Position: r.position === 'APRES' ? 'APRES' : 'AVANT', Ecart_semaines: Math.max(0, Math.round(Number(r.ecart) || 0)), Reference_texte: EUC_DEV610_t_(r.reference).slice(0, 500), Actif: true };
    if (Number(r.id) > 0) modifier.push({ id: Number(r.id), fields: champs }); else creer.push({ fields: champs });
  });
  var gardes = modifier.map(function(m) { return m.id; });
  var retirer = EUC_DEV610_regles_(annee).filter(function(r) { return gardes.indexOf(r.id) < 0; }).map(function(r) { return { id: r.id, fields: { Actif: false } }; });
  if (modifier.length || retirer.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.regles, modifier.concat(retirer));
  if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.regles, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length, retirees: retirer.length };
}

/* Enregistre le rattachement annuel des lignes aux classes Pronote. */
function EUC_DEV610_enregistrerRattachements(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var annee = EUC_DEV610_t_(q.annee); if (!/^\d{4}-\d{4}$/.test(annee)) throw new Error('Année scolaire invalide.');
  var ratt = EUC_DEV610_rattachements_(annee), connues = {}, maintenant = new Date().toISOString(), creer = [], modifier = [];
  EUC_DEV610_classes_().forEach(function(c) { connues[c.id] = 1; });
  Object.keys(q.rattachements || {}).forEach(function(code) {
    var ids = (q.rattachements[code] || []).map(Number).filter(function(id) { return connues[id]; });
    var champs = { Annee_scolaire: annee, Ligne: code, Classes: ['L'].concat(ids), Date_modification: maintenant };
    if (ratt.ids[code]) modifier.push({ id: ratt.ids[code], fields: champs }); else creer.push({ fields: champs });
  });
  if (modifier.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.rattachements, modifier);
  if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.rattachements, creer);
  return { ok: true, lignes: modifier.length + creer.length };
}

/* Contrôle des périodes envoyées par la page (calcul pur). */
function EUC_DEV610_validerPeriodes_(periodes, lignes, annee) {
  var codes = {}; (lignes || []).forEach(function(l) { codes[l.code] = 1; });
  return (periodes || []).map(function(p) {
    var debut = EUC_DEV610_t_(p.debut), fin = EUC_DEV610_t_(p.fin), type = EUC_DEV610_t_(p.type), ligne = EUC_DEV610_t_(p.ligne);
    if (!codes[ligne]) throw new Error('Ligne de planning inconnue : ' + ligne + '.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) throw new Error(ligne + ' : dates de période invalides.');
    /* Une formation peut finir après l'été (Bachelor, TSEC, CAP peintre) : trois mois de dépassement admis. */
    if (annee && (debut < annee.debut || fin > EUC_DEV610_plus_(annee.fin, 92))) throw new Error(ligne + ' : la période du ' + debut + ' sort de l’année ' + annee.code + '.');
    if (!type) throw new Error(ligne + ' : type de période manquant.');
    var complement = EUC_DEV610_estComplementaire_(type) ? EUC_DEV610_t_(p.complement).slice(0, 40) : '';
    return { ligne: ligne, type: type, complement: complement || undefined, debut: debut, fin: fin, origine: ['REGLE', 'GRILLE', 'TABLEAU', 'REPRISE'].indexOf(p.origine) >= 0 ? p.origine : 'TABLEAU', regle: Number(p.regle) || null };
  }).sort(EUC_DEV610_ordrePeriodes_);
}

/* Enregistre une version : met à jour le brouillon indiqué, ou crée la version suivante. */
function EUC_DEV610_enregistrerVersion(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var code = EUC_DEV610_t_(q.annee), annee = EUC_DEV610_annees_().filter(function(a) { return a.code === code; })[0];
  if (!annee) throw new Error('Année scolaire inconnue.');
  var periodes = EUC_DEV610_validerPeriodes_(q.periodes, EUC_DEV610_lignes_(), annee);
  var versions = EUC_DEV610_versions_(code), cible = versions.filter(function(v) { return v.numero === Number(q.numero); })[0];
  var base = EUC_DEV610_vacances_(code, EUC_DEV610_annees_()).some(function(v) { return v.previsionnel; }) ? 'PREVISIONNELLES' : 'OFFICIELLES';
  var champs = { Annee_scolaire: code, Base_dates: base, Commentaire: EUC_DEV610_t_(q.commentaire).slice(0, 1000), Periodes_json: JSON.stringify(periodes), Auteur: EUC_DEV610_t_(ctx && ctx.email) };
  if (cible && cible.statut === 'BROUILLON') {
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.versions + '/records', { records: [{ id: cible.id, fields: champs }] });
    return { ok: true, numero: cible.numero, creee: false, periodes: periodes.length, base: base };
  }
  var numero = versions.reduce(function(m, v) { return Math.max(m, v.numero); }, 0) + 1;
  champs.Numero = numero; champs.Statut = 'BROUILLON'; champs.Date_creation = new Date().toISOString();
  EUC_ENT_grist('post', '/tables/' + EUC_DEV610_T_.versions + '/records', { records: [{ fields: champs }] });
  return { ok: true, numero: numero, creee: true, periodes: periodes.length, base: base };
}

/* Ligne de planning d'une période publiée (calcul pur) :
 *  1. par ses classes concernées rattachées à une ligne ;
 *  2. sinon par la classe PFMP de ces classes (même inactive ou non rattachée) ;
 *  3. sinon par le texte Classe_PFMP de la période ;
 *  4. sinon par Formation + Niveau (colonnes A et B de l'ancienne feuille), puis par le seul Niveau s'il est unique.
 * Rend aussi les classes à proposer au rattachement de la ligne. */
/* Lignes portant ces anciens libellés : plusieurs quand une ligne a été séparée (mixité CPI-CPRP → CPI et CPRP). */
function EUC_DEV610_lignesParLibelles_(p, lignes) {
  var f = EUC_DEV610_n_(p.formation), n = EUC_DEV610_n_(p.niveau); if (!n) return [];
  var exact = (lignes || []).filter(function(l) { return EUC_DEV610_n_(l.niveau) === n && EUC_DEV610_n_(l.formation) === f; });
  if (exact.length) return exact.map(function(l) { return l.code; });
  var parNiveau = (lignes || []).filter(function(l) { return EUC_DEV610_n_(l.niveau) === n; });
  return parNiveau.length === 1 ? [parNiveau[0].code] : [];
}
function EUC_DEV610_ligneParLibelles_(p, lignes) { return EUC_DEV610_lignesParLibelles_(p, lignes)[0] || ''; }
function EUC_DEV610_ligneDePeriode_(p, parClasse, classesParId, lignes) {
  /* 0. Ligne choisie dans Planning_Periodes (colonne Ligne_planning) : elle fait foi. */
  if (p.ligneId) { var choisie = (lignes || []).filter(function(l) { return l.id === p.ligneId; })[0]; if (choisie) return { ligne: choisie.code, ajouts: [], par: 'LIGNE_PLANNING' }; }
  var codes = {}; (p.classes || []).forEach(function(id) { if (parClasse[id]) codes[parClasse[id]] = 1; });
  var k = Object.keys(codes);
  if (k.length === 1) return { ligne: k[0], ajouts: [], par: 'CLASSES' };
  if (k.length > 1) return { ligne: '', raison: 'PLUSIEURS_LIGNES', lignes: k };
  var parPfmp = {}; (lignes || []).forEach(function(l) { if (l.classePfmp) parPfmp[EUC_DEV610_n_(l.classePfmp)] = l.code; });
  var trouvees = {}, ajouts = [];
  (p.classes || []).forEach(function(id) { var c = classesParId[id]; if (!c) return; var code = parPfmp[EUC_DEV610_n_(c.classePfmp)] || parPfmp[EUC_DEV610_n_(c.nom)]; if (code) { trouvees[code] = 1; ajouts.push(id); } });
  k = Object.keys(trouvees);
  if (k.length === 1) return { ligne: k[0], ajouts: ajouts, par: 'CLASSE_PFMP' };
  if (!k.length && p.classePfmp && parPfmp[EUC_DEV610_n_(p.classePfmp)]) return { ligne: parPfmp[EUC_DEV610_n_(p.classePfmp)], ajouts: [], par: 'TEXTE_CLASSE_PFMP' };
  var parLib = !k.length ? EUC_DEV610_lignesParLibelles_(p, lignes) : [];
  if (parLib.length) return { ligne: parLib[0], autres: parLib.slice(1), ajouts: [], par: 'LIBELLES' };
  return { ligne: '', raison: k.length > 1 ? 'PLUSIEURS_LIGNES' : ((p.classes || []).length ? 'AUCUNE_LIGNE' : 'SANS_CLASSE'), lignes: k };
}

/* Reprend dans une version les périodes en entreprise déjà présentes dans Planning_Periodes (lecture seule). */
function EUC_DEV610_reprendreExistant(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var code = EUC_DEV610_t_(q.annee), annees = EUC_DEV610_annees_(), lignes = EUC_DEV610_lignes_().filter(function(l) { return l.actif && EUC_DEV610_ligneDeLAnnee_(l, code); });
  var ratt = EUC_DEV610_rattachements_(code).classes, classes = EUC_DEV610_classes_(), parClasse = {}, classesParId = {}, tests = 0;
  classes.forEach(function(c) { classesParId[c.id] = c; });
  lignes.forEach(function(l) { if (l.calendrier === 'MIXITE') return; (ratt[l.code] || EUC_DEV610_proposerClasses_(l, classes)).forEach(function(id) { parClasse[id] = l.code; }); });
  var vues = {}, periodes = [], ignorees = [], suggestions = {}, bilan = [];
  var nomsClasses = function(p) { return (p.classes || []).map(function(id) { var c = classesParId[id]; return c ? c.nom + (c.actif ? '' : ' (inactive)') + (c.classePfmp && c.classePfmp !== c.nom ? ' / ' + c.classePfmp : '') : '#' + id; }); };
  /* Bilan : chaque ligne de Planning_Periodes de l'année, avec son résultat (placée, non placée, doublon, test, inactive, incomplète). */
  var noter = function(p, statut, x) { bilan.push(Object.assign({ id: p.id, type: p.type, debut: p.debut, fin: p.fin, formation: p.formation, niveau: p.niveau, classes: nomsClasses(p), statut: statut }, x || {})); };
  EUC_DEV610_existantes_(annees).forEach(function(p) {
    if (p.annee !== code) return;
    if (!p.actif) { noter(p, 'INACTIVE'); return; }
    if (!p.type || !p.debut || !p.fin) { noter(p, 'INCOMPLETE'); return; }
    /* Périodes des classes de test (TEST PFMP…) : jamais dans les plannings. */
    if (p.classes.length && p.classes.every(function(id) { var c = classesParId[id]; return c && /^TEST/.test(EUC_DEV610_n_(c.nom)); })) { tests++; noter(p, 'TEST'); return; }
    var r = EUC_DEV610_ligneDePeriode_(p, parClasse, classesParId, lignes);
    if (!r.ligne) { ignorees.push({ id: p.id, type: p.type, debut: p.debut, fin: p.fin, raison: r.raison, lignes: r.lignes || [], classes: nomsClasses(p), formation: p.formation, niveau: p.niveau }); noter(p, 'NON_PLACEE', { raison: r.raison, lignes: r.lignes || [] }); return; }
    r.ajouts.forEach(function(id) { var s = suggestions[r.ligne] = suggestions[r.ligne] || []; if (s.indexOf(id) < 0) s.push(id); });
    var placees = [];
    [r.ligne].concat(r.autres || []).forEach(function(code) {
      var cle = code + '|' + p.type + '|' + p.debut + '|' + p.fin; if (vues[cle]) return; vues[cle] = 1; placees.push(code);
      periodes.push({ ligne: code, type: p.type, debut: p.debut, fin: p.fin, origine: 'REPRISE', regle: null });
    });
    noter(p, placees.length ? 'PLACEE' : 'DOUBLON', { lignes: placees.length ? placees : [r.ligne].concat(r.autres || []), par: r.par });
  });
  return { ok: true, periodes: periodes.sort(EUC_DEV610_ordrePeriodes_), ignorees: ignorees.length, nonReprises: ignorees, suggestions: suggestions, tests: tests, bilan: bilan.sort(function(a, b) { return String(a.debut).localeCompare(String(b.debut)) || a.id - b.id; }) };
}

function EUC_DEV610_contextePublication_(q) {
  var code = EUC_DEV610_t_(q.annee), annees = EUC_DEV610_annees_(), annee = annees.filter(function(a) { return a.code === code; })[0];
  if (!annee) throw new Error('Année scolaire inconnue.');
  var version = EUC_DEV610_versions_(code).filter(function(v) { return v.numero === Number(q.numero); })[0];
  if (!version) throw new Error('Enregistrez d’abord la version à publier.');
  var periodes = []; try { periodes = JSON.parse(version.json || '[]'); } catch (e) { throw new Error('Version illisible.'); }
  var lignes = EUC_DEV610_lignes_(), classes = EUC_DEV610_classes_(), ratt = EUC_DEV610_rattachements_(code).classes, rattachements = {};
  lignes.forEach(function(l) { rattachements[l.code] = ratt[l.code] || EUC_DEV610_proposerClasses_(l, classes); });
  var previsionnel = EUC_DEV610_vacances_(code, annees).some(function(v) { return v.previsionnel; });
  var classesParId = {}, typesParCle = {}, dossiers = {};
  classes.forEach(function(c) { classesParId[c.id] = c; });
  EUC_DEV610_types_().forEach(function(t) { var k = EUC_DEV610_cleType_(t.type); if (!typesParCle[k]) typesParCle[k] = t; });
  /* Couleur choisie dans l'application : elle prime pour la colonne Couleur publiée. */
  var choisies = EUC_DEV610_couleurs_(); Object.keys(choisies).forEach(function(k) { if (!choisies[k].couleur) return; typesParCle[k] = Object.assign({}, typesParCle[k] || { type: choisies[k].type }, { couleur: choisies[k].couleur }); });
  /* Dossiers de convention et affectations qui pointent vers chaque période : signalés avant toute modification. */
  try { EUC_DEV610_lire_('EUC_ACCES_FORMULAIRES_PFMP').forEach(function(x) { var id = EUC_DEV610_ref_((x.fields || {}).Periode); if (id) dossiers[id] = (dossiers[id] || 0) + 1; }); } catch (e) {}
  try { EUC_DEV610_lire_('EUC_AFFECTATIONS_SUIVI_PFMP').forEach(function(x) { var id = Number((x.fields || {}).Periode_id) || 0; if (id) dossiers[id] = (dossiers[id] || 0) + 1; }); } catch (e) {}
  var cols = EUC_DEV604_colonnes_('Planning_Periodes');
  var diff = EUC_DEV610_diffPublication_({ periodes: periodes }, lignes.filter(function(l) { return EUC_DEV610_ligneDeLAnnee_(l, code); }), rattachements, EUC_DEV610_existantes_(annees), code, { classesParId: classesParId, typesParCle: typesParCle, dossiers: dossiers, sansClassePfmp: !cols.Classe_PFMP || /^Ref/.test(cols.Classe_PFMP), sansLigneSheet: !cols.Ligne_sheet });
  return { cols: cols, annee: annee, version: version, lignes: lignes, diff: diff, previsionnel: previsionnel, rattachementsEnregistres: Object.keys(ratt).length > 0 };
}

function EUC_DEV610_apercuPublication(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var c = EUC_DEV610_contextePublication_(q);
  return { ok: true, annee: c.annee.code, numero: c.version.numero, statut: c.version.statut, previsionnel: c.previsionnel, rattachementsEnregistres: c.rattachementsEnregistres, diff: c.diff };
}

/* Publication : écrit toutes les périodes de la version dans Planning_Periodes et remet au propre les lignes existantes (confirmation 'PUBLIER'). */
function EUC_DEV610_publier(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  if (q.confirmation !== 'PUBLIER') throw new Error('Confirmation de publication manquante.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre publication est en cours. Réessayez dans un instant.');
  try {
    var c = EUC_DEV610_contextePublication_(q), d = c.diff;
    if (c.previsionnel) throw new Error('Les vacances de ' + c.annee.code + ' sont encore prévisionnelles : ce planning reste un document « Prévisionnel » et n’est pas publié.');
    if (!c.rattachementsEnregistres) throw new Error('Enregistrez d’abord le rattachement des lignes aux classes (onglet « Lignes et classes »).');
    var cols = c.cols;
    var anneeVal = /^Ref/.test(cols.Annee_scolaire || '') ? c.annee.id : c.annee.code, commentaire = EUC_DEV610_COMMENTAIRE_ + ' — ' + c.annee.code + ' v' + c.version.numero;
    /* Champs propres calculés par le diff (ligne du planning + Types_Planning) : rien ne vient d'une saisie. */
    var champs = function(x) {
      return EUC_DEV604_champs_(cols, { Annee_scolaire: anneeVal, Type: x.type, Date_debut: x.debut, Date_fin: x.fin, Classes_concernees: x.classes, Classe_PFMP: /^Ref/.test(cols.Classe_PFMP || '') ? undefined : x.classePfmp, Formation: x.formation, Niveau: x.niveau, Couleur: x.couleur || undefined, Ligne_sheet: x.ligneSheet || undefined, Ligne_planning: x.ligneId || undefined, Commentaire: commentaire, Actif: true });
    };
    var creer = d.creer.map(function(x) { return { fields: champs(x) }; });
    var modifier = d.modifier.map(function(x) { var f = champs(x); delete f.Commentaire; return { id: x.id, fields: f }; }).concat(d.desactiver.map(function(x) { return { id: x.id, fields: { Actif: false } }; }));
    if (creer.length) EUC_DEV610_ecrire_('post', 'Planning_Periodes', creer);
    if (modifier.length) EUC_DEV610_ecrire_('patch', 'Planning_Periodes', modifier);
    var maintenant = new Date().toISOString(), statuts = EUC_DEV610_versions_(c.annee.code).filter(function(v) { return v.statut === 'PUBLIE' && v.numero !== c.version.numero; }).map(function(v) { return { id: v.id, fields: { Statut: 'REMPLACE' } }; });
    statuts.push({ id: c.version.id, fields: { Statut: 'PUBLIE', Date_publication: maintenant, Auteur: EUC_DEV610_t_(ctx && ctx.email) } });
    EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.versions, statuts);
    try { CacheService.getScriptCache().removeAll(['EUC_DEV586_CLASSES']); } catch (e) {}
    return { ok: true, annee: c.annee.code, numero: c.version.numero, creees: creer.length, modifiees: d.modifier.length, desactivees: d.desactiver.length, inchangees: d.inchangees };
  } finally { lock.releaseLock(); }
}

/* Jours particuliers : ajout ou retrait (Actif = false) d'un jour travaillé, non travaillé ou banalisé. */
function EUC_DEV610_enregistrerJour(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  if (Number(q.retirer) > 0) { EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.jours + '/records', { records: [{ id: Number(q.retirer), fields: { Actif: false } }] }); return { ok: true }; }
  var annee = EUC_DEV610_t_(q.annee), date = EUC_DEV610_t_(q.date), nature = EUC_DEV610_t_(q.nature);
  if (!/^\d{4}-\d{4}$/.test(annee) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date invalide.');
  if (['TRAVAILLE', 'NON_TRAVAILLE', 'BANALISE'].indexOf(nature) < 0) throw new Error('Nature du jour invalide.');
  var heures = q.heures === '' || q.heures == null ? null : Number(q.heures);
  if (heures != null && !(heures >= 0 && heures <= 12)) throw new Error('Heures entre 0 et 12.');
  EUC_ENT_grist('post', '/tables/' + EUC_DEV610_T_.jours + '/records', { records: [{ fields: { Annee_scolaire: annee, Date: Math.round(Date.parse(date + 'T00:00:00Z') / 1000), Nature: nature, Libelle: EUC_DEV610_t_(q.libelle).slice(0, 200), Heures: heures, Actif: true } }] });
  return { ok: true };
}

/* Heures et formateurs saisis dans le calendrier d'une formation, pour une année. */
function EUC_DEV610_heures_(annee) {
  var out = [], vus = {};
  EUC_DEV610_lire_(EUC_DEV610_T_.heures).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV610_t_(f.Annee_scolaire) !== annee) return;
    var x = { id: Number(r.id), ligne: EUC_DEV610_t_(f.Ligne), date: EUC_DEV610_date_(f.Date), hm: f.Heures_matin == null ? null : Number(f.Heures_matin), ha: f.Heures_apres_midi == null ? null : Number(f.Heures_apres_midi), fm: EUC_DEV610_t_(f.Formateur_matin), fa: EUC_DEV610_t_(f.Formateur_apres_midi) };
    if (!x.ligne || !x.date) return; var k = x.ligne + '|' + x.date; if (vus[k] && vus[k].id > x.id) return; if (vus[k]) out.splice(out.indexOf(vus[k]), 1); vus[k] = x; out.push(x); });
  return out;
}
/* Enregistre les réglages d'heures d'une ligne (heures par défaut, quota, saisie des formateurs) et les jours modifiés.
 * Une ligne par ligne de planning et par date ; un jour remis au défaut garde sa ligne, vidée (aucune suppression). */
function EUC_DEV610_enregistrerHeures(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var code = EUC_DEV610_t_(q.annee), annee = EUC_DEV610_annees_().filter(function(a) { return a.code === code; })[0];
  if (!annee) throw new Error('Année scolaire inconnue.');
  var l = EUC_DEV610_lignes_().filter(function(x) { return x.code === EUC_DEV610_t_(q.ligne); })[0];
  if (!l) throw new Error('Formation introuvable : ' + EUC_DEV610_t_(q.ligne) + '.');
  var heures = function(v, quoi, max) { if (v === '' || v == null) return null; var n = Number(String(v).replace(',', '.')); if (!(n >= 0 && n <= max)) throw new Error(quoi + ' : entre 0 et ' + max + ' h.'); return Math.round(n * 100) / 100; };
  var initiales = function(v) { var t = EUC_DEV610_t_(v).toUpperCase(); if (t.length > 12) throw new Error('Formateur « ' + t + ' » : 12 caractères au plus (initiales).'); return t; };
  var reg = q.reglages || null, maj = 0;
  if (reg) {
    var champs = { Heures_matin: heures(reg.matin, 'Heures du matin', 8), Heures_apres_midi: heures(reg.apresMidi, 'Heures de l’après-midi', 8), Quota_heures: heures(reg.quota, 'Quota annuel', 3000), Formateurs: reg.formateurs === true };
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.lignes + '/records', { records: [{ id: l.id, fields: champs }] }); maj++;
  }
  var existants = {}; EUC_DEV610_heures_(code).forEach(function(x) { if (x.ligne === l.code) existants[x.date] = x.id; });
  var maintenant = new Date().toISOString(), creer = [], modifier = [], vus = {};
  (q.jours || []).forEach(function(j) {
    var date = EUC_DEV610_t_(j.date); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < annee.debut || date > annee.fin) throw new Error('Date hors de l’année ' + code + ' : ' + date + '.');
    if (vus[date]) throw new Error('Jour en double : ' + date + '.'); vus[date] = 1;
    var f = { Annee_scolaire: code, Ligne: l.code, Date: Math.round(Date.parse(date + 'T00:00:00Z') / 1000), Heures_matin: heures(j.hm, date + ' matin', 8), Heures_apres_midi: heures(j.ha, date + ' après-midi', 8), Formateur_matin: initiales(j.fm), Formateur_apres_midi: initiales(j.fa), Date_modification: maintenant };
    if (existants[date]) modifier.push({ id: existants[date], fields: f }); else creer.push({ fields: f });
  });
  if (modifier.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.heures, modifier);
  if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.heures, creer);
  return { ok: true, reglages: maj, jours: modifier.length + creer.length, heures: EUC_DEV610_heures_(code).filter(function(x) { return x.ligne === l.code; }), ligne: EUC_DEV610_lignes_().filter(function(x) { return x.code === l.code; })[0] };
}

/* ===================== Calibrage de Planning_Periodes (accord de l'utilisateur du 20 octobre 2026) =====================
 * - colonne Ligne_planning (référence vers EUC_PLAN_LIGNES, affichée par son libellé) : la ligne se choisit dans une liste ;
 * - Formation, Niveau et Ligne_sheet recopiés automatiquement de la ligne choisie (formule déclenchée par Ligne_planning,
 *   les colonnes restent modifiables par l'ancien outil) ;
 * - Type en liste déroulante alimentée par Types_Planning, libellés existants uniformisés ;
 * - Ligne_planning renseignée une fois sur les périodes existantes, cas douteux listés et jamais écrits. */
var EUC_DEV610_TYPES_GARDES_ = ['Stage BTS'];
/* Libellé canonique d'un type (calcul pur) : celui de Types_Planning à la casse, aux espaces et aux accents près. */
function EUC_DEV610_typeCanonique_(type, types) {
  var t = EUC_DEV610_t_(type); if (!t) return t;
  if (EUC_DEV610_TYPES_GARDES_.indexOf(t) >= 0) return t;
  var n = EUC_DEV610_n_(t), trouve = (types || []).filter(function(x) { return EUC_DEV610_n_(x) === n; })[0];
  return trouve || t;
}
/* Plan du calibrage (calcul pur) : périodes à renseigner, types à uniformiser, cas douteux. */
function EUC_DEV610_planCalibrage_(periodes, lignes, parClasseParAnnee, classesParId, types, uniformiser) {
  var parId = {}, parCode = {}; lignes.forEach(function(l) { parId[l.id] = l; parCode[l.code] = l; });
  var maj = [], douteux = [], typesChanges = {}, deja = 0, copies = [];
  periodes.forEach(function(p) {
    var champs = {}, ligne = p.ligneId && parId[p.ligneId] ? parId[p.ligneId] : null;
    if (!ligne) {
      if (p.classes.length && p.classes.every(function(id) { var c = classesParId[id]; return c && /^TEST/.test(EUC_DEV610_n_(c.nom)); })) return;
      var r = EUC_DEV610_ligneDePeriode_(p, parClasseParAnnee[p.annee] || {}, classesParId, lignes);
      if (!r.ligne) { douteux.push({ id: p.id, annee: p.annee, type: p.type, debut: p.debut, fin: p.fin, formation: p.formation, niveau: p.niveau, ligneSheet: p.ligneSheet, raison: r.raison }); }
      else { ligne = parCode[r.ligne]; champs.Ligne_planning = ligne.id;
        (r.autres || []).forEach(function(c) { var o = parCode[c]; if (o) copies.push({ source: p.id, ligne: o, type: uniformiser ? EUC_DEV610_typeCanonique_(p.type, types) : p.type, debut: p.debut, fin: p.fin }); }); }
    } else deja++;
    if (ligne) {
      if (ligne.formation && p.formation !== ligne.formation) champs.Formation = ligne.formation;
      if (ligne.niveau && p.niveau !== ligne.niveau) champs.Niveau = ligne.niveau;
      if (ligne.ligneSheet && p.ligneSheet !== ligne.ligneSheet) champs.Ligne_sheet = ligne.ligneSheet;
    }
    if (uniformiser) { var c = EUC_DEV610_typeCanonique_(p.type, types); if (c !== p.type) { champs.Type = c; var k = p.type + ' → ' + c; typesChanges[k] = (typesChanges[k] || 0) + 1; } }
    if (Object.keys(champs).length) maj.push({ id: p.id, fields: champs, avant: { formation: p.formation, niveau: p.niveau, ligneSheet: p.ligneSheet, type: p.type }, ligne: ligne ? ligne.libelle : '' });
  });
  return { maj: maj, douteux: douteux, typesChanges: typesChanges, deja: deja, copies: copies };
}
function EUC_DEV610_colonnesDetail_(table) {
  var out = {}; (EUC_ENT_grist('get', '/tables/' + table + '/columns').columns || []).forEach(function(c) { out[c.id] = c.fields || {}; }); return out;
}
/* Identifiant interne d'une colonne (pour les formules déclenchées et l'affichage d'une référence). */
function EUC_DEV610_colRef_(table, col, cols) {
  if (cols && cols[col] && cols[col].colRef) return Number(cols[col].colRef);
  var q = "SELECT c.id AS id FROM _grist_Tables_column c JOIN _grist_Tables t ON t.id = c.parentId WHERE t.tableId = '" + table.replace(/'/g, '') + "' AND c.colId = '" + col.replace(/'/g, '') + "'";
  var r = EUC_ENT_grist('get', '/sql?q=' + encodeURIComponent(q)).records || [];
  return r.length ? Number((r[0].fields || r[0]).id) : 0;
}
function EUC_DEV610_contexteCalibrage_(uniformiser) {
  var annees = EUC_DEV610_annees_(), lignes = EUC_DEV610_lignes_().filter(function(l) { return l.actif; }), classes = EUC_DEV610_classes_(), classesParId = {}, parClasseParAnnee = {};
  classes.forEach(function(c) { classesParId[c.id] = c; });
  var cols = EUC_DEV610_colonnesDetail_('Planning_Periodes');
  var periodes = EUC_DEV610_lire_('Planning_Periodes').map(function(r) { var f = r.fields || {}, ids = EUC_DEV610_refs_(f.Classes_concernees).map(Number); if (!ids.length && EUC_DEV610_ref_(f.Classe)) ids = [EUC_DEV610_ref_(f.Classe)];
    return { id: Number(r.id), annee: EUC_DEV610_codeAnnee_(f.Annee_scolaire, annees), type: EUC_DEV610_t_(f.Type), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), classes: ids, formation: EUC_DEV610_t_(f.Formation), niveau: EUC_DEV610_t_(f.Niveau), ligneSheet: Number(f.Ligne_sheet) || 0, classePfmp: typeof f.Classe_PFMP === 'string' ? EUC_DEV610_t_(f.Classe_PFMP) : '', ligneId: EUC_DEV610_ref_(f.Ligne_planning) || 0, brut: f }; });
  periodes.forEach(function(p) { if (parClasseParAnnee[p.annee]) return; var ratt = EUC_DEV610_rattachements_(p.annee).classes, m = parClasseParAnnee[p.annee] = {};
    lignes.forEach(function(l) { (ratt[l.code] || EUC_DEV610_proposerClasses_(l, classes)).forEach(function(id) { m[id] = l.code; }); }); });
  var types = EUC_DEV610_types_().map(function(t) { return t.type; });
  var plan = EUC_DEV610_planCalibrage_(periodes, lignes, parClasseParAnnee, classesParId, types, uniformiser);
  var choix = {}; types.concat(EUC_DEV610_TYPES_GARDES_).forEach(function(t) { choix[t] = 1; });
  periodes.forEach(function(p) { var t = uniformiser ? EUC_DEV610_typeCanonique_(p.type, types) : p.type; if (t) choix[t] = 1; });
  var schema = [];
  if (!cols.Ligne_planning) schema.push('Créer la colonne « Ligne_planning » (liste des lignes de planning, affichée par leur libellé).');
  ['Formation', 'Niveau', 'Ligne_sheet'].forEach(function(c) { if (cols[c] && !EUC_DEV610_t_(cols[c].formula)) schema.push('Recopier automatiquement « ' + c + ' » depuis la ligne choisie.'); });
  if (cols.Type && !/^Ref/.test(cols.Type.type || '') && (cols.Type.type !== 'Choice' || Object.keys(choix).some(function(t) { var w = {}; try { w = JSON.parse(cols.Type.widgetOptions || '{}'); } catch (e) {} return (w.choices || []).indexOf(t) < 0; }))) schema.push('Transformer « Type » en liste déroulante (' + Object.keys(choix).length + ' types).');
  var parId = {}; periodes.forEach(function(p) { parId[p.id] = p; });
  return { cols: cols, plan: plan, schema: schema, choix: Object.keys(choix).sort(), periodes: periodes.length, parId: parId };
}
function EUC_DEV610_calibrer(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var uniformiser = q.uniformiserTypes !== false, c = EUC_DEV610_contexteCalibrage_(uniformiser), p = c.plan;
  var resume = { ok: true, apercu: q.confirmation !== 'CALIBRER', periodes: c.periodes, schema: c.schema, aRenseigner: p.maj.filter(function(m) { return m.fields.Ligne_planning; }).length, aCorriger: p.maj.length, deja: p.deja, douteux: p.douteux, typesChanges: p.typesChanges,
    exemples: p.maj.slice(0, 60).map(function(m) { return { id: m.id, ligne: m.ligne, avant: m.avant, apres: m.fields }; }),
    copies: p.copies.map(function(x) { return { source: x.source, ligne: x.ligne.libelle, groupe: x.ligne.groupe, type: x.type, debut: x.debut, fin: x.fin }; }) };
  if (resume.apercu) return resume;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Un autre calibrage est en cours.');
  try {
    var cols = c.cols;
    if (!cols.Ligne_planning) {
      EUC_DEV610_apply_([['AddColumn', 'Planning_Periodes', 'Ligne_planning', { type: 'Ref:' + EUC_DEV610_T_.lignes, isFormula: false, label: 'Ligne de planning' }]], 'création de la colonne Ligne_planning');
      cols = EUC_DEV610_colonnesDetail_('Planning_Periodes');
      var nouvelle = EUC_DEV610_colRef_('Planning_Periodes', 'Ligne_planning', cols);
      if (nouvelle) EUC_DEV610_apply_([['SetDisplayFormula', 'Planning_Periodes', null, nouvelle, '$Ligne_planning.Libelle']], 'affichage du libellé de la ligne');
    }
    var ref = EUC_DEV610_colRef_('Planning_Periodes', 'Ligne_planning', cols), actions = [];
    if (!ref) throw new Error('Colonne Ligne_planning introuvable après création : calibrage interrompu, rien d’autre n’a été modifié.');
    if (ref) [['Formation', 'Formation'], ['Niveau', 'Niveau'], ['Ligne_sheet', 'Ligne_sheet']].forEach(function(x) {
      if (cols[x[0]] && !EUC_DEV610_t_(cols[x[0]].formula)) actions.push(['ModifyColumn', 'Planning_Periodes', x[0], { formula: '$Ligne_planning.' + x[1] + ' if $Ligne_planning and $Ligne_planning.' + x[1] + ' else value', recalcWhen: 1, recalcDeps: ['L', ref] }]);
    });
    if (cols.Type && !/^Ref/.test(cols.Type.type || '')) actions.push(['ModifyColumn', 'Planning_Periodes', 'Type', { type: 'Choice', widgetOptions: JSON.stringify({ choices: c.choix }) }]);
    if (actions.length) EUC_DEV610_apply_(actions, 'formules et liste des types');
    EUC_DEV610_ecrire_('patch', 'Planning_Periodes', p.maj.map(function(m) { return { id: m.id, fields: m.fields }; }));
    /* Copies pour les lignes séparées (mixité CPI-CPRP → CPRP) : mêmes dates et type, ligne de planning propre. */
    var colsCopie = EUC_DEV610_colonnesDetail_('Planning_Periodes'), gardees = ['Annee_scolaire', 'Type', 'Date_debut', 'Date_fin', 'Couleur', 'Groupe', 'Duree_jour', 'Date_affichage_debut', 'Date_affichage_fin'];
    var copies = p.copies.map(function(x) { var b = (c.parId[x.source] || {}).brut || {}, f = {};
      gardees.forEach(function(k) { if (colsCopie[k] && !colsCopie[k].isFormula && b[k] != null && b[k] !== '') f[k] = b[k]; });
      f.Type = x.type; f.Ligne_planning = x.ligne.id; if (colsCopie.Formation) f.Formation = x.ligne.formation; if (colsCopie.Niveau) f.Niveau = x.ligne.niveau; if (colsCopie.Ligne_sheet && x.ligne.ligneSheet) f.Ligne_sheet = x.ligne.ligneSheet;
      if (colsCopie.Commentaire) f.Commentaire = 'Copie de la période #' + x.source + ' pour ' + x.ligne.libelle + ' (ligne séparée)'; if (colsCopie.Actif) f.Actif = true;
      return { fields: f }; });
    if (copies.length) EUC_DEV610_ecrire_('post', 'Planning_Periodes', copies);
    resume.copiees = copies.length;
    resume.apercu = false; resume.ecrites = p.maj.length; resume.actions = actions.length + (c.cols.Ligne_planning ? 0 : 1);
    return resume;
  } finally { lock.releaseLock(); }
}

/* Organisation du tableau : ordre, groupes, libellés, calendriers et nouvelles lignes, tels que placés dans la page.
 * Aucune suppression : une ligne retirée du tableau est désactivée (Actif décoché). */
function EUC_DEV610_enregistrerOrganisation(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  EUC_DEV610_etape_('colonnes des lignes de planning', EUC_DEV610_colonnesLignes_);
  var actuelles = EUC_DEV610_lignes_(), parId = {}, codes = actuelles.map(function(l) { return l.code; }), creer = [], modifier = [], vus = {};
  actuelles.forEach(function(l) { parId[l.id] = l; });
  (q.lignes || []).forEach(function(l, i) {
    var cal = EUC_DEV610_t_(l.calendrier), groupe = EUC_DEV610_t_(l.groupe), libelle = EUC_DEV610_t_(l.libelle);
    /* Ligne masquée à l'ancien calendrier (TPEEB, GRETA, FC_ALTERNANCE) : gardée telle quelle, jamais bloquante. */
    var ancien = l.actif === false && EUC_DEV610_CALENDRIERS_.indexOf(cal) < 0;
    if (!ancien && EUC_DEV610_CALENDRIERS_.indexOf(cal) < 0) throw new Error('Ligne « ' + (libelle || i + 1) + ' » : calendrier à choisir dans la liste.');
    if (!groupe && l.actif !== false) throw new Error('Ligne « ' + (libelle || i + 1) + ' » : indiquez son groupe (bandeau du tableau).');
    if (!libelle) throw new Error('Ligne n°' + (i + 1) + ' : libellé obligatoire.');
    var orgs = (Array.isArray(l.organismes) ? l.organismes : EUC_DEV610_t_(l.organismes).split(/\s*,\s*/)).map(EUC_DEV610_t_).filter(Boolean);
    var etab = EUC_DEV610_t_(l.etablissement); if (etab && ['LP', 'LGT'].indexOf(etab) < 0) throw new Error('Ligne « ' + libelle + ' » : établissement support LP ou LGT.');
    var ad = EUC_DEV610_t_(l.anneeDebut), af = EUC_DEV610_t_(l.anneeFin);
    if ((ad && !/^\d{4}-\d{4}$/.test(ad)) || (af && !/^\d{4}-\d{4}$/.test(af))) throw new Error('Ligne « ' + libelle + ' » : année au format 2026-2027.');
    if (ad && af && af < ad) throw new Error('Ligne « ' + libelle + ' » : la dernière année précède la première.');
    var sections = cal === 'MIXITE' ? (Array.isArray(l.sections) ? l.sections : EUC_DEV610_t_(l.sections).split(/\s*,\s*/)).map(EUC_DEV610_t_).filter(Boolean) : [];
    var champs = { Annee_debut: ad, Annee_fin: af, Sections: sections.join(', '), Libelle: libelle.slice(0, 120), Calendrier: cal, Groupe: groupe.slice(0, 80), Formation: (EUC_DEV610_t_(l.formation) || groupe).slice(0, 80), Niveau: (EUC_DEV610_t_(l.niveau) || libelle).slice(0, 80), Classe_PFMP: EUC_DEV610_t_(l.classePfmp).slice(0, 80), Profil: EUC_DEV610_t_(l.profil).slice(0, 40), Etablissement: etab, Organismes: orgs.join(', '), Ordre: (i + 1) * 10, Version_modele: EUC_DEV610_MODELE_, Actif: l.actif !== false };
    if (ancien) delete champs.Calendrier;
    if (Number(l.id) > 0 && parId[Number(l.id)]) { if (vus[l.id]) throw new Error('Ligne en double dans l’organisation.'); vus[l.id] = 1; modifier.push({ id: Number(l.id), fields: champs }); }
    else { var code = EUC_DEV610_nouveauCode_(l.classePfmp || libelle, codes); codes.push(code); champs.Code = code; if (!champs.Profil) champs.Profil = code; champs.Heures_jour = cal === 'SCOLAIRE' ? null : 7; creer.push({ fields: champs }); }
  });
  var retirees = actuelles.filter(function(l) { return !vus[l.id] && l.actif; }).map(function(l) { return { id: l.id, fields: { Actif: false, Version_modele: EUC_DEV610_MODELE_ } }; });
  EUC_DEV610_etape_('enregistrement des lignes de planning', function() {
    if (modifier.length || retirees.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.lignes, modifier.concat(retirees));
    if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.lignes, creer);
  });
  return { ok: true, modifiees: modifier.length, creees: creer.length, desactivees: retirees.length };
}

/* ===================== Formations de l'année : dates de début et de fin, titres du calendrier ===================== */
function EUC_DEV610_formations_(annee) {
  var out = {}, ids = {};
  EUC_DEV610_lire_(EUC_DEV610_T_.formations).forEach(function(r) { var f = r.fields || {}; if (EUC_DEV610_t_(f.Annee_scolaire) !== annee) return; var c = EUC_DEV610_t_(f.Ligne); if (!c || (ids[c] && ids[c] > r.id)) return; ids[c] = Number(r.id);
    out[c] = { id: Number(r.id), debut: EUC_DEV610_date_(f.Debut_formation), fin: EUC_DEV610_date_(f.Fin_formation), titre: EUC_DEV610_t_(f.Titre), sousTitre: EUC_DEV610_t_(f.Sous_titre), intitule: EUC_DEV610_t_(f.Intitule) }; });
  return out;
}
function EUC_DEV610_enregistrerFormation(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var code = EUC_DEV610_t_(q.annee), annee = EUC_DEV610_annees_().filter(function(a) { return a.code === code; })[0], ligne = EUC_DEV610_t_(q.ligne);
  if (!annee) throw new Error('Année scolaire inconnue.');
  if (!EUC_DEV610_lignes_().some(function(l) { return l.code === ligne; })) throw new Error('Formation inconnue.');
  var debut = EUC_DEV610_t_(q.debut), fin = EUC_DEV610_t_(q.fin), iso = /^\d{4}-\d{2}-\d{2}$/;
  if ((debut && !iso.test(debut)) || (fin && !iso.test(fin))) throw new Error('Dates de formation invalides.');
  if (debut && fin && fin < debut) throw new Error('La fin de la formation doit suivre son début.');
  var champs = { Annee_scolaire: code, Ligne: ligne, Debut_formation: debut ? Math.round(Date.parse(debut + 'T00:00:00Z') / 1000) : null, Fin_formation: fin ? Math.round(Date.parse(fin + 'T00:00:00Z') / 1000) : null, Titre: EUC_DEV610_t_(q.titre).slice(0, 150), Sous_titre: EUC_DEV610_t_(q.sousTitre).slice(0, 200), Intitule: EUC_DEV610_t_(q.intitule).slice(0, 200), Date_modification: new Date().toISOString() };
  var ex = EUC_DEV610_formations_(code)[ligne];
  if (ex) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.formations, [{ id: ex.id, fields: champs }]); else EUC_DEV610_ecrire_('post', EUC_DEV610_T_.formations, [{ fields: champs }]);
  return { ok: true, formation: { debut: debut, fin: fin, titre: champs.Titre, sousTitre: champs.Sous_titre, intitule: champs.Intitule } };
}

/* ===================== Années scolaires et vacances, saisies dans la page (Grist ne sert que de stockage) ===================== */
var EUC_DEV610_NOMS_VACANCES_ = ['Toussaint', 'Noël', 'Hiver', 'Printemps', "Pont de l'Ascension", 'Été'];
function EUC_DEV610_enregistrerAnnee(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var code = EUC_DEV610_t_(q.code), m = /^(\d{4})-(\d{4})$/.exec(code);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) throw new Error('Année scolaire au format 2027-2028.');
  var debut = EUC_DEV610_t_(q.debut) || m[1] + '-09-01', fin = EUC_DEV610_t_(q.fin) || m[2] + '-08-31';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin <= debut) throw new Error('Dates de l’année invalides.');
  var cols = EUC_DEV604_colonnes_('Annees_Scolaires'), ex = EUC_DEV610_annees_().filter(function(a) { return a.code === code; })[0];
  var champs = EUC_DEV604_champs_(cols, { Code: code, Libelle: code, Date_debut: debut, Date_fin: fin, Zone: EUC_DEV610_t_(q.zone) || 'B', Previsionnelle: q.previsionnelle === true, Commentaire: EUC_DEV610_t_(q.commentaire).slice(0, 200) });
  if (ex) EUC_DEV610_ecrire_('patch', 'Annees_Scolaires', [{ id: ex.id, fields: champs }]); else EUC_DEV610_ecrire_('post', 'Annees_Scolaires', [{ fields: EUC_DEV604_champs_(cols, Object.assign({ Active: false }, { Code: code, Libelle: code, Date_debut: debut, Date_fin: fin, Zone: EUC_DEV610_t_(q.zone) || 'B', Previsionnelle: q.previsionnelle === true, Commentaire: EUC_DEV610_t_(q.commentaire).slice(0, 200) })) }]);
  return { ok: true, code: code, creee: !ex };
}
/* Vacances d'une année : création, mise à jour, retrait (Actif décoché, jamais supprimées). */
function EUC_DEV610_enregistrerVacances(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var annees = EUC_DEV610_annees_(), code = EUC_DEV610_t_(q.annee), annee = annees.filter(function(a) { return a.code === code; })[0];
  if (!annee) throw new Error('Année scolaire inconnue : créez-la d’abord.');
  var cols = EUC_DEV604_colonnes_('Vacances_Scolaires'), anneeVal = /^Ref/.test(cols.Annee_scolaire || '') ? annee.id : code;
  var existantes = EUC_DEV610_lire_('Vacances_Scolaires').filter(function(r) { return EUC_DEV610_codeAnnee_((r.fields || {}).Annee_scolaire, annees) === code; });
  var parId = {}; existantes.forEach(function(r) { parId[r.id] = r; });
  var creer = [], modifier = [], vus = {}, iso = /^\d{4}-\d{2}-\d{2}$/;
  (q.vacances || []).forEach(function(v) {
    var nom = EUC_DEV610_t_(v.nom), debut = EUC_DEV610_t_(v.debut), fin = EUC_DEV610_t_(v.fin);
    if (!nom) throw new Error('Nom des vacances manquant.');
    if (!iso.test(debut) || !iso.test(fin) || fin < debut) throw new Error(nom + ' : dates invalides.');
    if (debut < EUC_DEV610_plus_(annee.debut, -7) || fin > EUC_DEV610_plus_(annee.fin, 7)) throw new Error(nom + ' : dates hors de l’année ' + code + '.');
    var prev = v.previsionnel === true, champs = EUC_DEV604_champs_(cols, { Annee_scolaire: anneeVal, Zone: EUC_DEV610_t_(v.zone) || annee.zone || 'B', Nom_vacances: nom, Date_debut: debut, Date_fin: fin, Previsionnel: prev, Statut: prev ? 'Prévisionnel' : 'Officiel', Commentaire: EUC_DEV610_t_(v.commentaire).slice(0, 200), Actif: true });
    /* Les dates sont stockées dans le format de la colonne (texte ISO ou date Grist). */
    if (cols.Date_debut === 'Text') { champs.Date_debut = debut; champs.Date_fin = fin; }
    if (Number(v.id) > 0 && parId[Number(v.id)]) { vus[v.id] = 1; modifier.push({ id: Number(v.id), fields: champs }); } else creer.push({ fields: champs });
  });
  existantes.forEach(function(r) { var f = r.fields || {}; if (!vus[r.id] && (f.Actif !== false || f.Previsionnel === true)) modifier.push({ id: r.id, fields: EUC_DEV604_champs_(cols, { Actif: false, Previsionnel: false, Statut: 'Retiré' }) }); });
  if (modifier.length) EUC_DEV610_ecrire_('patch', 'Vacances_Scolaires', modifier);
  if (creer.length) EUC_DEV610_ecrire_('post', 'Vacances_Scolaires', creer);
  /* L'année est prévisionnelle tant qu'une de ses vacances l'est. */
  var colsA = EUC_DEV604_colonnes_('Annees_Scolaires');
  if (colsA.Previsionnelle) EUC_DEV610_ecrire_('patch', 'Annees_Scolaires', [{ id: annee.id, fields: { Previsionnelle: (q.vacances || []).some(function(v) { return v.previsionnel === true; }) } }]);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}
/* Vacances de toutes les années (pour la page de saisie). */
function EUC_DEV610_toutesVacances_(annees) {
  return EUC_DEV610_lire_('Vacances_Scolaires').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), annee: EUC_DEV610_codeAnnee_(f.Annee_scolaire, annees), nom: EUC_DEV610_t_(f.Nom_vacances), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), previsionnel: f.Previsionnel === true || /PREVISION/.test(EUC_DEV610_n_(f.Statut)), commentaire: EUC_DEV610_t_(f.Commentaire), zone: EUC_DEV610_t_(f.Zone), actif: f.Actif !== false }; })
    .filter(function(v) { return v.actif || v.previsionnel; });
}

/* ===================== Intitulés des diplômes, périodes de l'année suivante, logos ===================== */
/* Intitulé du diplôme de chaque ligne, d'après ses classes (EUC_CLASSES_DIPLOMES_PFMP, « Diplômes par classe »). */
function EUC_DEV610_diplomes_(rattachements, lignes) {
  var parClasse = {};
  EUC_DEV610_lire_('EUC_CLASSES_DIPLOMES_PFMP').forEach(function(r) { var f = r.fields || {}; if (f.Actif === false) return; var cid = EUC_DEV610_ref_(f.Classe !== undefined ? f.Classe : f.Classe_id); var lib = EUC_DEV610_t_(f.Intitule_diplome || f.Intitule || f.Diplome || f.Diplome_imprime || f.Libelle); if (cid && lib && !parClasse[cid]) parClasse[cid] = lib; });
  var out = {}, ids = function(code) { var l = (lignes || []).filter(function(x) { return x.code === code; })[0]; var r = rattachements[code] || [];
    /* Mixité : le diplôme commun des classes de ses filières. */
    return !r.length && l && l.calendrier === 'MIXITE' ? EUC_DEV610_classesDesFilieres_(l, lignes, rattachements) : r; };
  var codes = Object.keys(rattachements || {}); (lignes || []).forEach(function(l) { if (codes.indexOf(l.code) < 0) codes.push(l.code); });
  codes.forEach(function(code) { var libs = {}; ids(code).forEach(function(id) { if (parClasse[id]) libs[parClasse[id]] = 1; }); var k = Object.keys(libs); if (k.length === 1) out[code] = k[0]; });
  return out;
}
/* Périodes de l'année suivante pour les formations qui finissent après l'été : dernière version de l'année suivante,
 * sinon le calendrier publié ; seulement les trois premiers mois. */
function EUC_DEV610_suite_(annee, annees) {
  var suivante = annees.filter(function(a) { return a.code > annee.code; })[0]; if (!suivante) return [];
  var limite = EUC_DEV610_plus_(annee.fin, 92), garder = function(p) { return p.debut <= limite; };
  var v = EUC_DEV610_versions_(suivante.code).pop();
  if (v) { try { return JSON.parse(v.json || '[]').filter(garder); } catch (e) { return []; } }
  var lignes = EUC_DEV610_lignes_().filter(function(l) { return l.actif; }), classes = EUC_DEV610_classes_(), cpi = {}, parClasse = {}, ratt = EUC_DEV610_rattachements_(suivante.code).classes;
  classes.forEach(function(c) { cpi[c.id] = c; }); lignes.forEach(function(l) { (ratt[l.code] || EUC_DEV610_proposerClasses_(l, classes)).forEach(function(id) { parClasse[id] = l.code; }); });
  var out = [];
  EUC_DEV610_existantes_(annees).forEach(function(p) { if (p.annee !== suivante.code || !p.actif || !p.debut || !garder(p)) return; var r = EUC_DEV610_ligneDePeriode_(p, parClasse, cpi, lignes); if (!r.ligne) return;
    [r.ligne].concat(r.autres || []).forEach(function(c) { out.push({ ligne: c, type: p.type, debut: p.debut, fin: p.fin, origine: 'REPRISE', regle: null }); }); });
  return out;
}
var EUC_DEV610_ORGANISMES_LOGOS_ = ['Lycée Les Eucalyptus', 'CFA RAN', 'CFAI', 'GRETA', 'Ducretet'];
function EUC_DEV610_logos_() {
  var out = {}, def = typeof EUC_DEV610_LOGOS_DEFAUT_ !== 'undefined' ? EUC_DEV610_LOGOS_DEFAUT_ : {};
  Object.keys(def).forEach(function(o) { out[o] = { id: 0, image: def[o], defaut: true }; });
  EUC_DEV610_lire_(EUC_DEV610_T_.logos).forEach(function(r) { var f = r.fields || {}, o = EUC_DEV610_t_(f.Organisme); if (o && /^data:image\//.test(EUC_DEV610_t_(f.Image))) out[o] = { id: Number(r.id), image: EUC_DEV610_t_(f.Image) }; });
  return out;
}
/* Logo d'un organisme : image déjà redimensionnée par la page (PNG ou JPEG en data URL, 400 Ko au plus). Vide = retrait. */
function EUC_DEV610_enregistrerLogo(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var o = EUC_DEV610_t_(q.organisme), img = EUC_DEV610_t_(q.image);
  if (EUC_DEV610_ORGANISMES_LOGOS_.indexOf(o) < 0) throw new Error('Organisme inconnu.');
  if (img && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(img)) throw new Error('Image PNG ou JPEG attendue.');
  if (img.length > 400000) throw new Error('Image trop lourde, même réduite (400 Ko au plus).');
  var ex = EUC_DEV610_logos_()[o], champs = { Organisme: o, Image: img, Date_modification: new Date().toISOString() };
  if (ex && ex.id) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.logos, [{ id: ex.id, fields: champs }]);
  else { var tous = EUC_DEV610_lire_(EUC_DEV610_T_.logos).filter(function(r) { return EUC_DEV610_t_((r.fields || {}).Organisme) === o; })[0]; if (tous) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.logos, [{ id: tous.id, fields: champs }]); else EUC_DEV610_ecrire_('post', EUC_DEV610_T_.logos, [{ fields: champs }]); }
  return { ok: true, organisme: o, image: img };
}

/* ===================== Couleurs des types de période et paramètres de mise en page ===================== */
/* Couleurs choisies dans l'application, par type (clé EUC_DEV610_cleType_) ; elles priment sur Types_Planning. */
function EUC_DEV610_couleurs_() {
  var out = {};
  EUC_DEV610_lire_(EUC_DEV610_T_.couleurs).forEach(function(r) { var f = r.fields || {}, t = EUC_DEV610_t_(f.Type), c = EUC_DEV610_t_(f.Couleur).toUpperCase(); if (!t) return; out[EUC_DEV610_cleType_(t)] = { id: Number(r.id), type: t, couleur: /^#[0-9A-F]{6}$/.test(c) ? c : '' }; });
  return out;
}
function EUC_DEV610_enregistrerCouleurs(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var ex = EUC_DEV610_couleurs_(), creer = [], modifier = [], vus = {};
  (q.couleurs || []).forEach(function(x) {
    var t = EUC_DEV610_t_(x.type).slice(0, 60), c = EUC_DEV610_t_(x.couleur).toUpperCase(); if (!t) return;
    if (c && !/^#[0-9A-F]{6}$/.test(c)) throw new Error('Couleur de « ' + t + ' » : code hexadécimal #RRGGBB attendu.');
    var k = EUC_DEV610_cleType_(t); if (vus[k]) return; vus[k] = 1;
    var f = { Type: t, Couleur: c, Date_modification: new Date().toISOString() };
    if (ex[k] && ex[k].id) { if (ex[k].couleur !== c) modifier.push({ id: ex[k].id, fields: f }); } else if (c) creer.push({ fields: f });
  });
  if (modifier.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.couleurs, modifier);
  if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.couleurs, creer);
  return { ok: true, creees: creer.length, modifiees: modifier.length };
}
var EUC_DEV610_PARAMETRES_ = ['PIED_LIBELLE', 'PIED_TELEPHONE'];
function EUC_DEV610_parametres_() {
  var out = { PIED_LIBELLE: 'Bureau formation entreprise (BFE)', PIED_TELEPHONE: '' }, ids = {};
  EUC_DEV610_lire_(EUC_DEV610_T_.parametres).forEach(function(r) { var f = r.fields || {}, k = EUC_DEV610_t_(f.Cle); if (EUC_DEV610_PARAMETRES_.indexOf(k) < 0) return; out[k] = EUC_DEV610_t_(f.Valeur); ids[k] = Number(r.id); });
  out.ids = ids; return out;
}
function EUC_DEV610_enregistrerParametres(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var ex = EUC_DEV610_parametres_(), creer = [], modifier = [];
  EUC_DEV610_PARAMETRES_.forEach(function(k) {
    if (!(k in (q.parametres || {}))) return;
    var v = EUC_DEV610_t_(q.parametres[k]).slice(0, 120);
    if (k === 'PIED_TELEPHONE' && v && !/^[0-9+ .()\-]{6,25}$/.test(v)) throw new Error('Téléphone : chiffres, espaces, points ou + seulement.');
    var f = { Cle: k, Valeur: v, Date_modification: new Date().toISOString() };
    if (ex.ids[k]) modifier.push({ id: ex.ids[k], fields: f }); else creer.push({ fields: f });
  });
  if (modifier.length) EUC_DEV610_ecrire_('patch', EUC_DEV610_T_.parametres, modifier);
  if (creer.length) EUC_DEV610_ecrire_('post', EUC_DEV610_T_.parametres, creer);
  var p = EUC_DEV610_parametres_(); delete p.ids; return { ok: true, parametres: p };
}

/* Organismes d'une ligne pour les logos, d'après la table Classes (Organisme_gestionnaire = porteur, puis
 * Organisme_donneur_ordre) des classes rattachées (calcul pur). Mixité sans classe propre : les classes « Mixité » du
 * même groupe (pour une mixité nommée « Mixité CPI », celles dont la classe PFMP contient CPI). */
/* Classes des filières d'une mixité (calcul pur) : filières cochées ou « le reste » du groupe ; sans réglage,
 * section lue dans le code (MIX_1BTS_CPI → CPI ; MIX_1BP → toutes les filières du groupe). */
function EUC_DEV610_classesDesFilieres_(l, lignes, rattachements) {
  var ids = [], cov = EUC_DEV610_couvertureMixites_(lignes).parLigne[l.code] || { sections: [] };
  (lignes || []).forEach(function(x) { if (x.groupe !== l.groupe || x.calendrier !== 'SCOLAIRE' || cov.sections.indexOf(x.code) < 0) return;
    (rattachements[x.code] || []).forEach(function(id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
  return ids;
}
function EUC_DEV610_organismesLigne_(l, lignes, rattachements, classesParId) {
  var ids = (rattachements[l.code] || []).slice();
  if (!ids.length && l.calendrier === 'MIXITE') EUC_DEV610_classesDesFilieres_(l, lignes, rattachements).forEach(function(id) { var c = classesParId[id]; if (c && /MIXITE/.test(EUC_DEV610_n_(c.modalite))) ids.push(id); });
  var out = [], ajouter = function(v) { var t = EUC_DEV610_t_(v); if (!t) return; var k = EUC_DEV610_ORGANISMES_LOGOS_.filter(function(o) { return EUC_DEV610_n_(o) === EUC_DEV610_n_(t); })[0] || t; if (out.indexOf(k) < 0) out.push(k); };
  ids.forEach(function(id) { var c = classesParId[id]; if (c) ajouter(c.gestionnaire); });
  ids.forEach(function(id) { var c = classesParId[id]; if (c) ajouter(c.donneur); });
  /* Organismes cochés sur la ligne et absents de la table (Ducretet pour le TSEC) : ajoutés à la suite. */
  if (out.length) (l.organismes || []).forEach(ajouter);
  return out;
}
/* Modalité d'une ligne, comme dans le suivi des apprentis (calcul pur) : « Formation continue » si une de ses classes
 * l'est dans la table Classes (colonne modalité), sinon d'après le profil par défaut du suivi (TPMMA : GRETA). */
function EUC_DEV610_modaliteLigne_(l, rattachements, classesParId) {
  var vues = (rattachements[l.code] || []).map(function(id) { return classesParId[id]; }).filter(Boolean);
  var fc = function(m) { return /^FORMATIONCONTINUE|^FC$/.test(EUC_DEV610_n_(m)); };
  if (vues.some(function(c) { return fc(c.modalite); })) return 'FORMATION_CONTINUE';
  if (vues.some(function(c) { return EUC_DEV610_t_(c.modalite); })) return '';
  var p = typeof EUC_DEV579_profilDefaut_ === 'function' ? EUC_DEV579_profilDefaut_(l.classePfmp || l.libelle, l.etablissement) : null;
  return p && p.mode === 'FORMATION_CONTINUE' ? 'FORMATION_CONTINUE' : '';
}
function EUC_DEV610_modalitesLignes_(lignes, rattachements, classes) {
  var cpi = {}, out = {}; (classes || []).forEach(function(c) { cpi[c.id] = c; });
  (lignes || []).forEach(function(l) { if (EUC_DEV610_modaliteLigne_(l, rattachements, cpi)) out[l.code] = 'FORMATION_CONTINUE'; });
  return out;
}
function EUC_DEV610_organismesLignes_(lignes, rattachements, classes) {
  var cpi = {}, out = {}; (classes || []).forEach(function(c) { cpi[c.id] = c; });
  (lignes || []).forEach(function(l) { var o = EUC_DEV610_organismesLigne_(l, lignes, rattachements, cpi); if (o.length) out[l.code] = o; });
  return out;
}
