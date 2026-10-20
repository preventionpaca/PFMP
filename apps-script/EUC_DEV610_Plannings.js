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
 *
 * Seules les périodes en entreprise des calendriers scolaires (PFMP, P.dif., stages BTS) sont publiées
 * dans Planning_Periodes ; une année dont les vacances sont prévisionnelles ne peut pas être publiée.
 */
var EUC_DEV610_T_ = { lignes: 'EUC_PLAN_LIGNES', rattachements: 'EUC_PLAN_LIGNES_CLASSES', regles: 'EUC_PLAN_REGLES', versions: 'EUC_PLAN_VERSIONS', jours: 'EUC_PLAN_JOURS_PARTICULIERS' };
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
    res.alertes.forEach(function(a) { alertes.push(l.libelle + ' — ' + a); });
    var remplacees = actuelles.filter(function(p) { return (p.origine === 'REGLE' || p.origine === 'REPRISE') && auto[EUC_DEV610_cleType_(p.type)]; });
    var conservees = actuelles.filter(function(p) { return remplacees.indexOf(p) < 0; });
    gardees = gardees.concat(conservees);
    /* Une période retouchée à la main l'emporte : la règle qui la chevaucherait n'est pas replacée. */
    neuves = neuves.filter(function(n) {
      var gene = conservees.filter(function(p) { return p.debut <= n.fin && p.fin >= n.debut; })[0];
      if (gene) alertes.push(l.libelle + ' — période n°' + n.regle + ' non replacée : une période placée à la main (' + gene.type + ' du ' + gene.debut + ') occupe ces semaines.');
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
    Object.keys(manuelles).forEach(function(k) { var m = manuelles[k], places = actuelles.filter(function(p) { return EUC_DEV610_cleType_(p.type) === k; }).length; if (places < m.n) alertes.push(l.libelle + ' — ' + (m.n - places) + ' période(s) « ' + m.type + ' » à placer à la main (' + m.durees.join(' et ') + ' semaines).'); });
  });
  Object.keys(parLigne).forEach(function(c) { if (!codes[c]) gardees = gardees.concat(parLigne[c]); });
  return { periodes: nouvelles.concat(gardees).sort(EUC_DEV610_ordrePeriodes_), changements: changements, alertes: alertes };
}
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
/* Proposition de rattachement : classes actives dont Classe_PFMP (ou le nom) vaut la classe PFMP de la ligne. */
function EUC_DEV610_proposerClasses_(ligne, classes) {
  var cible = EUC_DEV610_n_(ligne.classePfmp); if (!cible) return [];
  return (classes || []).filter(function(c) { return c.actif !== false && !/^TEST/.test(EUC_DEV610_n_(c.nom)) && EUC_DEV610_n_(c.classePfmp || c.nom) === cible; }).map(function(c) { return c.id; }).sort(function(a, b) { return a - b; });
}

/* ===================== Publication dans Planning_Periodes (calcul pur) ===================== */

/* Compare les périodes en entreprise d'une version aux lignes existantes de l'année.
 * Rapprochement par ligne (mêmes classes), type et rang. Les lignes hors du périmètre ne sont jamais touchées. */
function EUC_DEV610_diffPublication_(version, lignes, rattachements, existantes, annee) {
  var lignesParCode = {}, perimetre = {}, res = { creer: [], modifier: [], desactiver: [], inchangees: 0, sansClasse: [] };
  (lignes || []).forEach(function(l) { if (l.calendrier === 'SCOLAIRE' && l.actif !== false) lignesParCode[l.code] = l; });
  Object.keys(lignesParCode).forEach(function(code) { (rattachements[code] || []).forEach(function(id) { perimetre[id] = code; }); });
  var ligneDe = function(ids) { var codes = {}; ids.forEach(function(id) { if (perimetre[id]) codes[perimetre[id]] = 1; }); var k = Object.keys(codes); return k.length === 1 ? k[0] : (k.length ? '*' : ''); };
  var groupes = {};
  (existantes || []).forEach(function(r) {
    if (r.actif === false || r.annee !== annee || !EUC_DEV610_typeFormation_(r.type)) return;
    var code = ligneDe(r.classes || []); if (!code || code === '*') return;
    var k = code + '|' + EUC_DEV610_cleType_(r.type); (groupes[k] = groupes[k] || { existantes: [], nouvelles: [] }).existantes.push(r);
  });
  ((version && version.periodes) || []).forEach(function(p) {
    var l = lignesParCode[p.ligne]; if (!l || !EUC_DEV610_typeFormation_(p.type)) return;
    if (!(rattachements[p.ligne] || []).length) { if (res.sansClasse.indexOf(l.libelle) < 0) res.sansClasse.push(l.libelle); return; }
    var k = p.ligne + '|' + EUC_DEV610_cleType_(p.type); (groupes[k] = groupes[k] || { existantes: [], nouvelles: [] }).nouvelles.push(p);
  });
  var tri = function(a, b) { return String(a.debut).localeCompare(String(b.debut)) || (a.id || 0) - (b.id || 0); };
  Object.keys(groupes).sort().forEach(function(k) {
    var g = groupes[k], code = k.split('|')[0], l = lignesParCode[code]; g.existantes.sort(tri); g.nouvelles.sort(tri);
    /* D'abord les périodes identiques (mêmes dates), puis le reste dans l'ordre chronologique. */
    g.nouvelles = g.nouvelles.filter(function(p) {
      var i = -1; g.existantes.some(function(e, j) { if (e.debut === p.debut && e.fin === p.fin) { i = j; return true; } return false; });
      if (i < 0) return true;
      var e = g.existantes.splice(i, 1)[0];
      if (EUC_DEV610_n_(e.type) !== EUC_DEV610_n_(p.type) || (e.classes || []).slice().sort().join() !== rattachements[code].slice().sort().join()) res.modifier.push({ id: e.id, ligne: code, libelle: l.libelle, type: p.type, avant: { debut: e.debut, fin: e.fin, type: e.type }, debut: p.debut, fin: p.fin, classes: rattachements[code].slice() });
      else res.inchangees++;
      return false;
    });
    /* Puis les plus proches dans le temps : la période existante est modifiée sur place (les conventions
     * qui la référencent gardent leur période). */
    var paires = [], jours = function(a, b) { return Math.abs(Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')); };
    while (g.existantes.length && g.nouvelles.length) {
      var best = null; g.existantes.forEach(function(e, i) { g.nouvelles.forEach(function(p, j) { var d = jours(e.debut, p.debut); if (!best || d < best.d) best = { d: d, i: i, j: j }; }); });
      paires.push([g.existantes.splice(best.i, 1)[0], g.nouvelles.splice(best.j, 1)[0]]);
    }
    g.existantes.forEach(function(e) { paires.push([e, null]); }); g.nouvelles.forEach(function(p) { paires.push([null, p]); });
    for (var i = 0; i < paires.length; i++) {
      var e = paires[i][0], p = paires[i][1];
      if (p && !e) res.creer.push({ ligne: code, libelle: l.libelle, type: p.type, debut: p.debut, fin: p.fin, classes: rattachements[code].slice() });
      else if (e && !p) res.desactiver.push({ id: e.id, ligne: code, libelle: l.libelle, type: e.type, debut: e.debut, fin: e.fin });
      else res.modifier.push({ id: e.id, ligne: code, libelle: l.libelle, type: p.type, avant: { debut: e.debut, fin: e.fin, type: e.type }, debut: p.debut, fin: p.fin, classes: rattachements[code].slice() });
    }
  });
  return res;
}

/* Code des fonctions pures injecté dans la page (la matrice se calcule sans aller-retour serveur). */
function EUC_DEV610_codeClient_() {
  return [EUC_DEV610_n_, EUC_DEV610_iso_, EUC_DEV610_plus_, EUC_DEV610_semaineIso_, EUC_DEV610_nomVacances_, EUC_DEV610_semaines_, EUC_DEV610_marquerVacances_, EUC_DEV610_placer_, EUC_DEV610_generer_, EUC_DEV610_ordrePeriodes_, EUC_DEV610_typeFormation_, EUC_DEV610_cleType_, EUC_DEV610_appels_, EUC_DEV610_proposerClasses_].map(String).join('\n');
}

/* ===================== Table de vérité initiale (observée dans le planning 2026-2027) ===================== */

/* Table de vérité initiale des lignes, dans l'ordre d'affichage.
 * [code, libellé, calendrier, groupe, profil, classe PFMP, ligne de l'ancienne feuille, Formation (colonne A), Niveau (colonne B)]
 * Calendriers : SCOLAIRE, MIXITE, CLASSE_ENTIERE (CFA / CFAI), GRETA. */
var EUC_DEV610_LIGNES_DEFAUT_ = [
  ['1CAP', 'CAP — 1re année (CAR)', 'SCOLAIRE', 'CAP', '1CAP', '1CAP CAR', 8, 'CAP', '1 CA'],
  ['TCAP', 'CAP — 2e année (CAR)', 'SCOLAIRE', 'CAP', 'TCAP', 'TCAP CAR', 9, 'CAP', 'T CA'],
  ['2BP_CPA', '2 BAC PRO — CPA', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2CAR', 11, '2 BAC PRO', 'CPA'],
  ['2BP_MVA', '2 BAC PRO — MVA', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MVA', 12, '2 BAC PRO', 'MVA'],
  ['2BP_REMI', '2 BAC PRO — REMI', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2REMI', 13, '2 BAC PRO', 'REMI'],
  ['2BP_MP3D', '2 BAC PRO — MP3D', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MP3D', 14, '2 BAC PRO', 'MP3D'],
  ['2BP_MTNE', '2 BAC PRO — MTNE', 'SCOLAIRE', '2 BAC PRO', '2NDE', '2MTNE', 15, '2 BAC PRO', 'MTNE'],
  ['1BP_CIEL', '1 BAC PRO — CIEL', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1CIEL', 16, '1 BAC PRO', 'CIEL'],
  ['1BP_CPA', '1 BAC PRO — CPA', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1CAR', 17, '1 BAC PRO', 'CPA'],
  ['1BP_MVA', '1 BAC PRO — MVA', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MVA', 18, '1 BAC PRO', 'MVA'],
  ['1BP_MELEC', '1 BAC PRO — MELEC', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MELEC', 19, '1 BAC PRO', 'MELEC'],
  ['1BP_MP3D', '1 BAC PRO — MP3D', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MP3D', 20, '1 BAC PRO', 'MP3'],
  ['1BP_MT', '1 BAC PRO — MT', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1MT', 21, '1 BAC PRO', 'MT'],
  ['1BP_RMO', '1 BAC PRO — RMO', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1RMO', 22, '1 BAC PRO', 'RMO'],
  ['1BP_RSP', '1 BAC PRO — RSP', 'SCOLAIRE', '1 BAC PRO', '1BACPRO', '1RSP', 23, '1 BAC PRO', 'RSP'],
  ['MIX_1BP', '1 BAC PRO — Mixité', 'MIXITE', '1 BAC PRO', 'MIX_1BACPRO', '', 24, '1 BAC PRO', 'Mixité'],
  ['TBP_CIEL', 'T BAC PRO — CIEL', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TCIEL', 25, 'T BAC PRO', 'CIEL'],
  ['TBP_CPA', 'T BAC PRO — CPA', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TCAR', 26, 'T BAC PRO', 'CPA'],
  ['TBP_MELEC', 'T BAC PRO — MELEC', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMELEC', 27, 'T BAC PRO', 'MELEC'],
  ['TBP_MT', 'T BAC PRO — MT', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMT', 28, 'T BAC PRO', 'MT'],
  ['TBP_MP3D', 'T BAC PRO — MP3D', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMP3D', 29, 'T BAC PRO', 'MP3D'],
  ['TBP_MVA', 'T BAC PRO — MVA', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TMVA', 30, 'T BAC PRO', 'MVA'],
  ['TBP_RMO', 'T BAC PRO — RMO', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TRMO', 31, 'T BAC PRO', 'RMO'],
  ['TBP_RSP', 'T BAC PRO — RSP', 'SCOLAIRE', 'T BAC PRO', 'TBACPRO', 'TRSP', 32, 'T BAC PRO', 'RSP'],
  ['MIX_TBP', 'T BAC PRO — Mixité', 'MIXITE', 'T BAC PRO', 'MIX_TBACPRO', '', 33, 'T BAC PRO', 'Mixité'],
  ['1BTS_CIEL', '1 BTS — CIEL', 'SCOLAIRE', '1 BTS', '1BTS_CIEL', '1BTS CIEL', 35, '1BTS', 'CIEL'],
  ['1BTS_ELEC', '1 BTS — ELEC', 'SCOLAIRE', '1 BTS', '1BTS_ELEC', '1BTS ELEC', 36, '1BTS', 'ELEC'],
  ['1BTS_CPI', '1 BTS — CPI', 'SCOLAIRE', '1 BTS', '1BTS_CPI', '1BTS CPI', 37, '1BTS', 'CPI'],
  ['1BTS_CPRP', '1 BTS — CPRP', 'SCOLAIRE', '1 BTS', '1BTS_CPRP', '1BTS CPRP', 38, '1BTS', 'CPRP'],
  ['MIX_1BTS_CPI_CPRP', '1 BTS CPI-CPRP — Mixité', 'MIXITE', '1 BTS', 'MIX_1BTS_CPI_CPRP', '', 39, '1BTS CPI-CPRP', 'Mixité'],
  ['1BTS_MV', '1 BTS — MV', 'SCOLAIRE', '1 BTS', '1BTS_MV', '1BTS MV', 40, '1BTS', 'MV'],
  ['MIX_1BTS_MV', '1 BTS MV — Mixité', 'MIXITE', '1 BTS', 'MIX_1BTS_MV', '', 41, '1BTS MV', 'Mixité'],
  ['MIX_2BTS_CPI_CPRP', '2 BTS CPI-CPRP — Mixité', 'MIXITE', '2 BTS', 'MIX_2BTS_CPI_CPRP', '', 42, '2BTS CPI-CPRP', 'Mixité'],
  ['2BTS_MV', '2 BTS — MV', 'SCOLAIRE', '2 BTS', '2BTS_MV', '2BTS MV', 43, '2BTS', 'MV'],
  ['MIX_2BTS_MV', '2 BTS MV — Mixité', 'MIXITE', '2 BTS', 'MIX_2BTS_MV', '', 44, '2BTS MV', 'Mixité'],
  ['CAP_PEINTRE', 'CAP peintre (CP)', 'CLASSE_ENTIERE', 'Classes entières — CFA / CFAI', 'CAP_PEINTRE', '1CAPP', 10, 'CAP Connexe', 'CP'],
  ['TSEC', 'Titre pro TSEC (Ducretet)', 'CLASSE_ENTIERE', 'Classes entières — CFA / CFAI', 'TSEC', 'TSEC', 34, 'Ducretet', 'TSEC'],
  ['1BTS_ELEC_ALT', 'BTS ELEC alternance — 1re année', 'CLASSE_ENTIERE', 'Classes entières — CFA / CFAI', '1BTS_ELEC_ALT', '1BTS ELEC Alt', 0, 'BTS ELEC Alt', '1re année'],
  ['2BTS_ELEC_ALT', 'BTS ELEC alternance — 2e année', 'CLASSE_ENTIERE', 'Classes entières — CFA / CFAI', '2BTS_ELEC_ALT', '2BTS ELEC Alt', 0, 'BTS ELEC Alt', '2e année'],
  ['BACHELOR_IP', 'Bachelor IP', 'CLASSE_ENTIERE', 'Classes entières — CFA / CFAI', 'BACHELOR_IP', 'Bachelor IP', 45, 'BACHELOR', 'IP'],
  ['TPMMA', 'TPMMA (GRETA)', 'GRETA', 'GRETA', 'TPMMA', 'TPMMA', 0, 'GRETA', 'TPMMA'],
  ['CQPM_ASC', 'CQPM ASC (GRETA)', 'GRETA', 'GRETA', 'CQPM_ASC', 'CQPM ASC', 0, 'GRETA', 'CQPM ASC'],
  ['TPEEB_19', 'TPEEB 19 (GRETA)', 'GRETA', 'GRETA', 'TPEEB_19', 'TPEEB 19', 0, 'GRETA', 'TPEEB 19'],
  ['TPEEB_20', 'TPEEB 20 (GRETA)', 'GRETA', 'GRETA', 'TPEEB_20', 'TPEEB 20', 0, 'GRETA', 'TPEEB 20'],
  ['1MELEC_G', '1MELEC G (GRETA)', 'GRETA', 'GRETA', '1MELEC_G', '1MELEC G', 0, 'GRETA', '1MELEC G'],
  ['TMELEC_G', 'TMELEC G (GRETA)', 'GRETA', 'GRETA', 'TMELEC_G', 'TMELEC G', 0, 'GRETA', 'TMELEC G']
];
/* Codes de la première version de la table, remplacés depuis. */
var EUC_DEV610_LIGNES_RETIREES_ = ['TPEEB'];
/* [profil, numéro, type, durée (semaines), placement, ancrage, période d'ancrage, position, écart] */
var EUC_DEV610_REGLES_DEFAUT_ = [
  ['TBACPRO', 1, 'PFMP Tbac', 3, 'AUTO', 'TOUSSAINT', 0, 'AVANT', 0], ['TBACPRO', 2, 'PFMP Tbac', 3, 'AUTO', 'REGLE', 3, 'AVANT', 0], ['TBACPRO', 3, 'P.dif.', 2, 'AUTO', 'HIVER', 0, 'AVANT', 0],
  ['1BACPRO', 1, 'PFMP 1ère', 4, 'AUTO', 'NOEL', 0, 'AVANT', 0], ['1BACPRO', 2, 'PFMP 1ère', 4, 'AUTO', 'PRINTEMPS', 0, 'AVANT', 0],
  ['2NDE', 1, 'PFMP 2nde', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1CAP', 1, 'PFMP 1 CAP', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['TCAP', 1, 'PFMP T CAP', 3, 'MANUEL', '', 0, 'AVANT', 0], ['TCAP', 2, 'PFMP T CAP', 4, 'MANUEL', '', 0, 'AVANT', 0],
  ['1BTS_CIEL', 1, 'Stage BTS', 6, 'AUTO', 'ETE', 0, 'AVANT', 0], ['1BTS_ELEC', 1, 'Stage BTS', 6, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1BTS_CPI', 1, 'Stage BTS', 8, 'AUTO', 'ETE', 0, 'AVANT', 0], ['1BTS_CPRP', 1, 'Stage BTS', 8, 'AUTO', 'ETE', 0, 'AVANT', 0],
  ['1BTS_MV', 1, 'Stage BTS', 4, 'AUTO', 'ETE', 0, 'AVANT', 0], ['2BTS_MV', 1, 'Stage BTS', 5, 'AUTO', 'NOEL', 0, 'AVANT', 0]
];

/* ===================== Accès Grist ===================== */

function EUC_DEV610_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_DEV610_lire_(table) { try { return EUC_ENT_grist('get', '/tables/' + table + '/records').records || []; } catch (e) { return []; } }
function EUC_DEV610_ref_(v) { return typeof EUC_SUIVI2_ref_ === 'function' ? EUC_SUIVI2_ref_(v) : (Array.isArray(v) ? Number(v[1]) : Number(v) || 0); }
function EUC_DEV610_refs_(v) { if (typeof EUC_SUIVI2_refs_ === 'function') return EUC_SUIVI2_refs_(v); return Array.isArray(v) ? v.filter(function(x) { return typeof x === 'number'; }) : []; }
function EUC_DEV610_date_(v) { return typeof EUC_SUIVI2_date_ === 'function' ? EUC_SUIVI2_date_(v) : EUC_DEV610_t_(v).slice(0, 10); }

function EUC_DEV610_tables_() {
  var cache = CacheService.getScriptCache(); if (cache.get('EUC_DEV610_TABLES2')) return;
  var ids = (EUC_ENT_grist('get', '/tables').tables || []).map(function(t) { return t.id; }), col = EUC_DEV441_col_;
  var def = {};
  def[EUC_DEV610_T_.lignes] = [col('Code', 'Code'), col('Libelle', 'Libellé'), col('Calendrier', 'Calendrier'), col('Groupe', 'Groupe d’affichage'), col('Profil', 'Profil de règles'), col('Classe_PFMP', 'Classe PFMP'), col('Formation', 'Formation (colonne A)'), col('Niveau', 'Niveau (colonne B)'), col('Ordre', 'Ordre', 'Int'), col('Ligne_sheet', 'Ligne de l’ancienne feuille', 'Int'), col('Quota_heures', 'Quota d’heures', 'Numeric'), col('Heures_jour', 'Heures par jour', 'Numeric'), col('Jours_lycee', 'Jours au lycée'), col('Actif', 'Actif', 'Bool')];
  def[EUC_DEV610_T_.rattachements] = [col('Annee_scolaire', 'Année scolaire'), col('Ligne', 'Ligne (code)'), col('Classes', 'Classes', 'RefList:Classes'), col('Date_modification', 'Date modification')];
  def[EUC_DEV610_T_.regles] = [col('Annee_scolaire', 'Année scolaire'), col('Profil', 'Profil'), col('Numero', 'Numéro', 'Int'), col('Type', 'Type'), col('Duree_semaines', 'Durée (semaines)', 'Numeric'), col('Placement', 'Placement'), col('Ancrage', 'Ancrage'), col('Regle_ancrage', 'Période d’ancrage', 'Int'), col('Position', 'Position'), col('Ecart_semaines', 'Écart (semaines)', 'Int'), col('Reference_texte', 'Texte de référence'), col('Actif', 'Actif', 'Bool')];
  def[EUC_DEV610_T_.versions] = [col('Annee_scolaire', 'Année scolaire'), col('Numero', 'Numéro', 'Int'), col('Statut', 'Statut'), col('Base_dates', 'Base des dates'), col('Commentaire', 'Commentaire'), col('Periodes_json', 'Périodes (JSON)'), col('Auteur', 'Auteur'), col('Date_creation', 'Date de création'), col('Date_publication', 'Date de publication')];
  def[EUC_DEV610_T_.jours] = [col('Annee_scolaire', 'Année scolaire'), col('Date', 'Date', 'Date'), col('Nature', 'Nature'), col('Libelle', 'Libellé'), col('Heures', 'Heures', 'Numeric'), col('Actif', 'Actif', 'Bool')];
  var manquantes = Object.keys(def).filter(function(t) { return ids.indexOf(t) < 0; });
  if (manquantes.length) EUC_ENT_grist('post', '/tables', { tables: manquantes.map(function(t) { return { id: t, columns: def[t] }; }) });
  EUC_DEV610_migrerLignes_();
  cache.put('EUC_DEV610_TABLES2', '1', 21600);
}

function EUC_DEV610_champsLigneDefaut_(l, i) {
  return { Code: l[0], Libelle: l[1], Calendrier: l[2], Groupe: l[3], Profil: l[4], Classe_PFMP: l[5], Ordre: (i + 1) * 10, Ligne_sheet: l[6] || null, Formation: l[7], Niveau: l[8], Heures_jour: l[2] === 'SCOLAIRE' ? null : 7, Actif: true };
}
/* Complète la table des lignes : colonnes Formation / Niveau, lignes manquantes, lignes de la première version
 * mises à jour une seule fois (tant que leur Formation est vide), anciens codes désactivés. */
function EUC_DEV610_migrerLignes_() {
  var t = EUC_DEV610_T_.lignes, col = EUC_DEV441_col_;
  var cols = (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).map(function(c) { return c.id; });
  var ajout = [col('Formation', 'Formation (colonne A)'), col('Niveau', 'Niveau (colonne B)')].filter(function(c) { return cols.indexOf(c.id) < 0; });
  if (ajout.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: ajout });
  var existantes = {}; EUC_DEV610_lire_(t).forEach(function(r) { existantes[EUC_DEV610_t_((r.fields || {}).Code)] = r; });
  var creer = [], modifier = [];
  EUC_DEV610_LIGNES_DEFAUT_.forEach(function(l, i) {
    var r = existantes[l[0]], f = EUC_DEV610_champsLigneDefaut_(l, i);
    if (!r) creer.push({ fields: f });
    else if (!EUC_DEV610_t_((r.fields || {}).Formation)) { delete f.Code; delete f.Profil; delete f.Heures_jour; delete f.Actif; if (EUC_DEV610_t_(r.fields.Classe_PFMP)) delete f.Classe_PFMP; modifier.push({ id: r.id, fields: f }); }
  });
  EUC_DEV610_LIGNES_RETIREES_.forEach(function(c) { var r = existantes[c]; if (r && r.fields.Actif !== false) modifier.push({ id: r.id, fields: { Actif: false } }); });
  if (creer.length) EUC_ENT_grist('post', '/tables/' + t + '/records', { records: creer });
  if (modifier.length) EUC_ENT_grist('patch', '/tables/' + t + '/records', { records: modifier });
}

function EUC_DEV610_annees_() {
  return EUC_DEV610_lire_('Annees_Scolaires').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV610_t_(f.Code || f.Libelle), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), active: f.Active === true, previsionnelle: f.Previsionnelle === true, zone: EUC_DEV610_t_(f.Zone) }; })
    .filter(function(a) { return /^\d{4}-\d{4}$/.test(a.code); }).sort(function(a, b) { return a.code.localeCompare(b.code); });
}
function EUC_DEV610_codeAnnee_(v, annees) {
  var id = EUC_DEV610_ref_(v); if (id) { var a = annees.filter(function(x) { return x.id === id; })[0]; if (a) return a.code; }
  var m = EUC_DEV610_t_(v).match(/20\d{2}-20\d{2}/); return m ? m[0] : '';
}
function EUC_DEV610_lignes_() {
  return EUC_DEV610_lire_(EUC_DEV610_T_.lignes).map(function(r) { var f = r.fields || {}; return { id: Number(r.id), code: EUC_DEV610_t_(f.Code), libelle: EUC_DEV610_t_(f.Libelle) || EUC_DEV610_t_(f.Code), calendrier: EUC_DEV610_t_(f.Calendrier) || 'SCOLAIRE', groupe: EUC_DEV610_t_(f.Groupe), profil: EUC_DEV610_t_(f.Profil) || EUC_DEV610_t_(f.Code), classePfmp: EUC_DEV610_t_(f.Classe_PFMP), formation: EUC_DEV610_t_(f.Formation), niveau: EUC_DEV610_t_(f.Niveau), ordre: Number(f.Ordre) || 0, ligneSheet: Number(f.Ligne_sheet) || 0, actif: f.Actif !== false }; })
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
  return EUC_DEV610_lire_('Classes').map(function(r) { var f = r.fields || {}; return { id: Number(r.id), nom: EUC_DEV610_t_(f.Nom || f.Libelle), classePfmp: EUC_DEV610_t_(f.Classe_PFMP), etab: EUC_DEV610_t_(f.Etab), actif: f.Actif !== false }; })
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
    return { id: Number(r.id), annee: EUC_DEV610_codeAnnee_(f.Annee_scolaire, annees), type: EUC_DEV610_t_(f.Type), debut: EUC_DEV610_date_(f.Date_debut), fin: EUC_DEV610_date_(f.Date_fin), classes: ids, actif: f.Actif !== false, formation: EUC_DEV610_t_(f.Formation), niveau: EUC_DEV610_t_(f.Niveau), classePfmp: typeof f.Classe_PFMP === 'string' ? EUC_DEV610_t_(f.Classe_PFMP) : '' }; });
}

/* ===================== Services de la page ===================== */

function EUC_DEV610_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Plannings_DEV610');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.annee = EUC_DEV610_t_(e && e.parameter && e.parameter.annee);
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
  var rattachements = {}, proposes = {};
  lignes.forEach(function(l) { var p = EUC_DEV610_proposerClasses_(l, classes); proposes[l.code] = p; rattachements[l.code] = ratt.classes[l.code] || p; });
  var versions = EUC_DEV610_versions_(annee.code).map(function(v) { var p = []; try { p = JSON.parse(v.json || '[]'); } catch (e) {} return { id: v.id, numero: v.numero, statut: v.statut, base: v.base, commentaire: v.commentaire, auteur: v.auteur, creation: v.creation, publication: v.publication, periodes: p }; });
  var existantes = EUC_DEV610_existantes_(annees).filter(function(p) { return p.annee === annee.code && p.actif && EUC_DEV610_typeFormation_(p.type); });
  return { annees: annees, annee: annee, courante: courante, vacances: EUC_DEV610_vacances_(annee.code, annees), jours: EUC_DEV610_jours_(annee.code), lignes: lignes, classes: classes, rattachements: rattachements, proposes: proposes, rattachementsEnregistres: Object.keys(ratt.classes), regles: regles, origineRegles: origineRegles, types: EUC_DEV610_types_(), versions: versions, publiees: existantes.length };
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
  if (modifier.length || retirer.length) EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.regles + '/records', { records: modifier.concat(retirer) });
  if (creer.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV610_T_.regles + '/records', { records: creer });
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
  if (modifier.length) EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.rattachements + '/records', { records: modifier });
  if (creer.length) EUC_ENT_grist('post', '/tables/' + EUC_DEV610_T_.rattachements + '/records', { records: creer });
  return { ok: true, lignes: modifier.length + creer.length };
}

/* Contrôle des périodes envoyées par la page (calcul pur). */
function EUC_DEV610_validerPeriodes_(periodes, lignes, annee) {
  var codes = {}; (lignes || []).forEach(function(l) { codes[l.code] = 1; });
  return (periodes || []).map(function(p) {
    var debut = EUC_DEV610_t_(p.debut), fin = EUC_DEV610_t_(p.fin), type = EUC_DEV610_t_(p.type), ligne = EUC_DEV610_t_(p.ligne);
    if (!codes[ligne]) throw new Error('Ligne de planning inconnue : ' + ligne + '.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) throw new Error(ligne + ' : dates de période invalides.');
    if (annee && (debut < annee.debut || fin > annee.fin)) throw new Error(ligne + ' : la période du ' + debut + ' sort de l’année ' + annee.code + '.');
    if (!type) throw new Error(ligne + ' : type de période manquant.');
    return { ligne: ligne, type: type, debut: debut, fin: fin, origine: ['REGLE', 'GRILLE', 'TABLEAU', 'REPRISE'].indexOf(p.origine) >= 0 ? p.origine : 'TABLEAU', regle: Number(p.regle) || null };
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
function EUC_DEV610_ligneParLibelles_(p, lignes) {
  var f = EUC_DEV610_n_(p.formation), n = EUC_DEV610_n_(p.niveau); if (!n) return '';
  var exact = (lignes || []).filter(function(l) { return EUC_DEV610_n_(l.niveau) === n && EUC_DEV610_n_(l.formation) === f; });
  if (exact.length === 1) return exact[0].code;
  var parNiveau = (lignes || []).filter(function(l) { return EUC_DEV610_n_(l.niveau) === n; });
  return parNiveau.length === 1 ? parNiveau[0].code : '';
}
function EUC_DEV610_ligneDePeriode_(p, parClasse, classesParId, lignes) {
  var codes = {}; (p.classes || []).forEach(function(id) { if (parClasse[id]) codes[parClasse[id]] = 1; });
  var k = Object.keys(codes);
  if (k.length === 1) return { ligne: k[0], ajouts: [] };
  if (k.length > 1) return { ligne: '', raison: 'PLUSIEURS_LIGNES', lignes: k };
  var parPfmp = {}; (lignes || []).forEach(function(l) { if (l.classePfmp) parPfmp[EUC_DEV610_n_(l.classePfmp)] = l.code; });
  var trouvees = {}, ajouts = [];
  (p.classes || []).forEach(function(id) { var c = classesParId[id]; if (!c) return; var code = parPfmp[EUC_DEV610_n_(c.classePfmp)] || parPfmp[EUC_DEV610_n_(c.nom)]; if (code) { trouvees[code] = 1; ajouts.push(id); } });
  k = Object.keys(trouvees);
  if (k.length === 1) return { ligne: k[0], ajouts: ajouts };
  if (!k.length && p.classePfmp && parPfmp[EUC_DEV610_n_(p.classePfmp)]) return { ligne: parPfmp[EUC_DEV610_n_(p.classePfmp)], ajouts: [] };
  var parLib = !k.length ? EUC_DEV610_ligneParLibelles_(p, lignes) : '';
  if (parLib) return { ligne: parLib, ajouts: [] };
  return { ligne: '', raison: k.length > 1 ? 'PLUSIEURS_LIGNES' : ((p.classes || []).length ? 'AUCUNE_LIGNE' : 'SANS_CLASSE'), lignes: k };
}

/* Reprend dans une version les périodes en entreprise déjà présentes dans Planning_Periodes (lecture seule). */
function EUC_DEV610_reprendreExistant(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var code = EUC_DEV610_t_(q.annee), annees = EUC_DEV610_annees_(), lignes = EUC_DEV610_lignes_().filter(function(l) { return l.actif; });
  var ratt = EUC_DEV610_rattachements_(code).classes, classes = EUC_DEV610_classes_(), parClasse = {}, classesParId = {}, tests = 0;
  classes.forEach(function(c) { classesParId[c.id] = c; });
  lignes.forEach(function(l) { (ratt[l.code] || EUC_DEV610_proposerClasses_(l, classes)).forEach(function(id) { parClasse[id] = l.code; }); });
  var vues = {}, periodes = [], ignorees = [], suggestions = {};
  EUC_DEV610_existantes_(annees).forEach(function(p) {
    if (p.annee !== code || !p.actif || !p.type || !p.debut || !p.fin) return;
    /* Périodes des classes de test (TEST PFMP…) : jamais dans les plannings. */
    if (p.classes.length && p.classes.every(function(id) { var c = classesParId[id]; return c && /^TEST/.test(EUC_DEV610_n_(c.nom)); })) { tests++; return; }
    var r = EUC_DEV610_ligneDePeriode_(p, parClasse, classesParId, lignes);
    if (!r.ligne) { ignorees.push({ id: p.id, type: p.type, debut: p.debut, fin: p.fin, raison: r.raison, lignes: r.lignes || [], classes: (p.classes || []).map(function(id) { var c = classesParId[id]; return c ? c.nom + (c.actif ? '' : ' (inactive)') + (c.classePfmp && c.classePfmp !== c.nom ? ' / ' + c.classePfmp : '') : '#' + id; }), formation: p.formation, niveau: p.niveau }); return; }
    r.ajouts.forEach(function(id) { var s = suggestions[r.ligne] = suggestions[r.ligne] || []; if (s.indexOf(id) < 0) s.push(id); });
    var cle = r.ligne + '|' + p.type + '|' + p.debut + '|' + p.fin; if (vues[cle]) return; vues[cle] = 1;
    periodes.push({ ligne: r.ligne, type: p.type, debut: p.debut, fin: p.fin, origine: 'REPRISE', regle: null });
  });
  return { ok: true, periodes: periodes.sort(EUC_DEV610_ordrePeriodes_), ignorees: ignorees.length, nonReprises: ignorees, suggestions: suggestions, tests: tests };
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
  var diff = EUC_DEV610_diffPublication_({ periodes: periodes }, lignes, rattachements, EUC_DEV610_existantes_(annees), code);
  return { annee: annee, version: version, lignes: lignes, diff: diff, previsionnel: previsionnel, rattachementsEnregistres: Object.keys(ratt).length > 0 };
}

function EUC_DEV610_apercuPublication(q) {
  EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  var c = EUC_DEV610_contextePublication_(q);
  return { ok: true, annee: c.annee.code, numero: c.version.numero, statut: c.version.statut, previsionnel: c.previsionnel, rattachementsEnregistres: c.rattachementsEnregistres, diff: c.diff };
}

/* Publication : écrit les périodes en entreprise de la version dans Planning_Periodes (confirmation 'PUBLIER'). */
function EUC_DEV610_publier(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {}; EUC_DEV610_tables_();
  if (q.confirmation !== 'PUBLIER') throw new Error('Confirmation de publication manquante.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error('Une autre publication est en cours. Réessayez dans un instant.');
  try {
    var c = EUC_DEV610_contextePublication_(q), d = c.diff;
    if (c.previsionnel) throw new Error('Les vacances de ' + c.annee.code + ' sont encore prévisionnelles : ce planning reste un document « Prévisionnel » et n’est pas publié.');
    if (!c.rattachementsEnregistres) throw new Error('Enregistrez d’abord le rattachement des lignes aux classes (onglet « Lignes et classes »).');
    var cols = EUC_DEV604_colonnes_('Planning_Periodes'), lignes = {}, types = {};
    c.lignes.forEach(function(l) { lignes[l.code] = l; });
    EUC_DEV610_types_().forEach(function(t) { types[EUC_DEV610_n_(t.type)] = t.couleur; });
    var anneeVal = /^Ref/.test(cols.Annee_scolaire || '') ? c.annee.id : c.annee.code, commentaire = EUC_DEV610_COMMENTAIRE_ + ' — ' + c.annee.code + ' v' + c.version.numero;
    var champs = function(x) {
      var l = lignes[x.ligne], niveau = l.libelle.split('—').pop().trim();
      return EUC_DEV604_champs_(cols, { Annee_scolaire: anneeVal, Type: x.type, Date_debut: x.debut, Date_fin: x.fin, Classes_concernees: x.classes, Classe_PFMP: /^Ref/.test(cols.Classe_PFMP || '') ? undefined : l.classePfmp, Formation: l.groupe, Niveau: niveau, Couleur: types[EUC_DEV610_n_(x.type)] || undefined, Ligne_sheet: l.ligneSheet || undefined, Commentaire: commentaire, Actif: true });
    };
    var creer = d.creer.map(function(x) { return { fields: champs(x) }; });
    var modifier = d.modifier.map(function(x) { var f = champs(x); delete f.Commentaire; return { id: x.id, fields: f }; }).concat(d.desactiver.map(function(x) { return { id: x.id, fields: { Actif: false } }; }));
    if (creer.length) EUC_ENT_grist('post', '/tables/Planning_Periodes/records', { records: creer });
    if (modifier.length) EUC_ENT_grist('patch', '/tables/Planning_Periodes/records', { records: modifier });
    var maintenant = new Date().toISOString(), statuts = EUC_DEV610_versions_(c.annee.code).filter(function(v) { return v.statut === 'PUBLIE' && v.numero !== c.version.numero; }).map(function(v) { return { id: v.id, fields: { Statut: 'REMPLACE' } }; });
    statuts.push({ id: c.version.id, fields: { Statut: 'PUBLIE', Date_publication: maintenant, Auteur: EUC_DEV610_t_(ctx && ctx.email) } });
    EUC_ENT_grist('patch', '/tables/' + EUC_DEV610_T_.versions + '/records', { records: statuts });
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
