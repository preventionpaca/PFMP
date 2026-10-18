/**
 * DEV575 — Nouveau moteur du suivi des PFMP (cahier des règles R1–R44).
 *
 * Un seul calcul par année scolaire, depuis les tables sources de Grist, sans
 * aucun instantané intermédiaire. Le résultat est gardé en cache jusqu'à la
 * prochaine modification du document : le témoin est le numéro de la dernière
 * action Grist (/states), qui change à chaque saisie, quelle qu'en soit
 * l'origine (Grist, QR, calendrier, import).
 *
 *  - EUC_SUIVI2_calculer_(sources, annee, aujourdhui) : calcul pur, testable ;
 *  - EUC_SUIVI2_lireSources_() : lecture parallèle des tables (UrlFetchApp.fetchAll) ;
 *  - EUC_SUIVI2_modele_(annee) : cache par témoin, puis calcul si nécessaire.
 */
var EUC_SUIVI2_VERSION_ = '1.0.0-dev.594';
var EUC_SUIVI2_TABLES_ = {
  periodes: 'Planning_Periodes',
  classes: 'Classes',
  annees: 'Annees_Scolaires',
  eleves: 'EUC_ELEVES_PFMP',
  dossiers: 'EUC_ACCES_FORMULAIRES_PFMP',
  apprentissage: 'EUC_APPRENTISSAGE_PFMP',
  pdif: 'EUC_PARCOURS_DIFFERENCIE_PFMP',
  diplomes: 'EUC_CLASSES_DIPLOMES_PFMP',
  entreprises: 'EUC_ENTREPRISES',
  types: 'Types_Planning',
  jotform: 'EUC_MIGRATION_JOTFORM_PFMP',
  affectations: 'EUC_AFFECTATIONS_SUIVI_PFMP',
  professeurs: 'EUC_PROFESSEURS_PFMP',
  classesProfs: 'EUC_CLASSES_PROFESSEURS_PFMP'
};
/* Tables facultatives : leur absence ne bloque pas le calcul des chiffres. */
var EUC_SUIVI2_FACULTATIVES_ = { pdif: 1, jotform: 1, types: 1, affectations: 1, professeurs: 1, classesProfs: 1 };
var EUC_SUIVI2_MODE_LYCEE_ = 'PARCOURS_DIFF_LYCEE';
var EUC_SUIVI2_MODE_ENTREPRISE_ = 'POURSUITE_PFMP2_ENTREPRISE';

/* ---------- Petits outils ---------- */

function EUC_SUIVI2_t_(v) { return v == null ? '' : String(v).trim(); }
function EUC_SUIVI2_norm_(v) { return EUC_SUIVI2_t_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' '); }
function EUC_SUIVI2_ref_(v) {
  if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { var n = Number(v[i]); if (isFinite(n) && n > 0) return n; } return 0; }
  if (v && typeof v === 'object') { var o = Number(v.id || v.rowId || 0); return isFinite(o) && o > 0 ? o : 0; }
  var x = Number(v || 0); return isFinite(x) && x > 0 ? x : 0;
}
function EUC_SUIVI2_refs_(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) { var a = v.slice(); if (a.length && String(a[0]).toUpperCase() === 'L') a = a.slice(1); return a.map(Number).filter(function(x) { return x > 0; }); }
  if (typeof v === 'number') return v > 0 ? [v] : [];
  var s = String(v).trim(); try { var j = JSON.parse(s); if (Array.isArray(j)) return EUC_SUIVI2_refs_(j); } catch (e) {}
  return s.split(/[;,| ]+/).map(Number).filter(function(x) { return x > 0; });
}
/* Dates Grist : secondes Unix, millisecondes, ISO ou JJ/MM/AAAA -> AAAA-MM-JJ. */
function EUC_SUIVI2_date_(v) {
  if (v == null || v === '' || v === false) return '';
  if (typeof v === 'number') { var ms = v < 1e11 ? v * 1000 : v; var d = new Date(ms); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
  if (typeof v === 'object') {
    var oy = Number(v.year || v.annee), om = Number(v.month || v.mois), od = Number(v.day || v.jour);
    return oy && om && od ? oy + '-' + ('0' + om).slice(-2) + '-' + ('0' + od).slice(-2) : '';
  }
  var s = String(v).trim(), m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  /* JotForm : « Sept. 28, 2026 », « June 5, 2008 » ou « 28 sept. 2026 ». */
  var mois = EUC_SUIVI2_mois_(s.replace(/[\d.,]/g, ' '));
  m = s.match(/^[^\d]*(\d{1,2})\D+(\d{4})/);
  if (mois && m) return m[2] + '-' + ('0' + mois).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function EUC_SUIVI2_mois_(texte) {
  var t = String(texte || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/)[0] || '';
  var l = [['jan'], ['feb', 'fev'], ['mar'], ['apr', 'avr'], ['may', 'mai'], ['jun', 'juin'], ['jul', 'juil'], ['aug', 'aou'], ['sep'], ['oct'], ['nov'], ['dec']];
  for (var i = 0; i < 12; i++) if (l[i].some(function(x) { return t.indexOf(x) === 0; })) return i + 1;
  return 0;
}
function EUC_SUIVI2_bool_(v) { return v === true || /^(true|oui|1|x|vrai)$/i.test(EUC_SUIVI2_t_(v)); }
function EUC_SUIVI2_champs_(r) { return (r && r.fields) ? Object.assign({ id: r.id }, r.fields) : (r || {}); }

/* Année « AAAA-AAAA » d'une valeur (référence, texte, date). */
function EUC_SUIVI2_annee_(v, annees) {
  var s = EUC_SUIVI2_t_(v); if (!s) return '';
  if (annees[s]) return annees[s];
  var m = s.match(/20\d{2}\s*[-\/]\s*20\d{2}/); if (m) return m[0].replace(/\s/g, '').replace('/', '-');
  var y = s.match(/20\d{2}/); if (y) { var n = Number(y[0]); return n + '-' + (n + 1); }
  return s;
}
function EUC_SUIVI2_anneeCourante_(aujourdhui) {
  var y = Number(aujourdhui.slice(0, 4)), mo = Number(aujourdhui.slice(5, 7)), d = mo >= 8 ? y : y - 1;
  return d + '-' + (d + 1);
}

/* ---------- Règles ---------- */

/* R9 / R10 : famille et niveau depuis la classe (et ses diplômes). */
function EUC_SUIVI2_famille_(classe, diplome) {
  var nom = EUC_SUIVI2_norm_(classe.Nom || classe.Libelle || classe.Code_import);
  var texte = EUC_SUIVI2_norm_([classe.Nom, classe.Libelle, classe.Formation, classe.Niveau, classe.Filiere, classe.Filiere_Pronote, classe.Niveau_Pronote, diplome && diplome.famille, diplome && diplome.diplome].join(' '));
  if (/^(TPMMA|TPEEB|TSEC|CQPM|BACHELOR)/.test(nom) || /\b(TPMMA|TPEEB|TSEC|CQPM|BACHELOR)\b/.test(texte)) return 'AUTRES';
  if (/\bBTS\b/.test(texte) || /^[12]\s*(BTS|TS)/.test(nom)) return 'BTS';
  if (/\bCAP\b/.test(texte) || /^[12T]\s*CAP/.test(nom)) return 'CAP';
  return 'BACPRO';
}
function EUC_SUIVI2_niveau_(nom, famille) {
  var n = EUC_SUIVI2_norm_(nom);
  if (famille === 'BACPRO') { if (/^T/.test(n)) return 'Terminale'; if (/^1/.test(n)) return 'Première'; if (/^2/.test(n)) return 'Seconde'; return 'Autres'; }
  if (famille === 'BTS') return /^2/.test(n) ? '2e année' : '1re année';
  if (famille === 'CAP') return (/^T/.test(n) || /^2/.test(n)) ? 'TCAP' : '1CAP';
  return 'Autres';
}
/* DEV594 : établissement abrégé, quelle que soit la saisie (copier-coller Pronote compris) :
 * « LP LYCEE DES METIERS LES EUCALYPTUS » → LP, « LGT … » → LGT ; CFA, CFAI, CFA RAN, GRETA inchangés. */
function EUC_SUIVI2_etab_(v) {
  var n = ' ' + EUC_SUIVI2_norm_(v).replace(/[^A-Z0-9]+/g, ' ') + ' ';
  if (/ GRETA /.test(n)) return 'GRETA';
  if (/ CFAI /.test(n)) return 'CFAI';
  if (/ CFA RAN /.test(n)) return 'CFA RAN';
  if (/ CFA /.test(n)) return 'CFA';
  if (/ (LGT|GENERAL|TECHNOLOGIQUE) /.test(n)) return 'LGT';
  if (/ (LP|PROFESSIONNEL|METIERS) /.test(n)) return 'LP';
  return n.trim();
}
/* R23 : apprentis affichés seulement en Première/Terminale BAC PRO et en BTS. */
function EUC_SUIVI2_apprentisAffiches_(famille, niveau) {
  return famille === 'BTS' || (famille === 'BACPRO' && (niveau === 'Terminale' || niveau === 'Première'));
}
/* Types du calendrier qui sont de vraies périodes en entreprise (table
 * Types_Planning) : PFMP 2nde, 1ère, Tbac, 1 CAP, T CAP, P.dif. et BTS_STAGE.
 * VFMP (validation), examens, mini-stage, mixité, conseils… sont ignorés. */
/* DEV580 : périodes de suivi des classes entières d'apprentis (calendrier du CFA / GRETA) :
 * « APPEL TEL » → appel téléphonique, « VISITE » → visite en entreprise. */
function EUC_SUIVI2_typeSuivi_(code) {
  var t = EUC_SUIVI2_norm_(code);
  if (/^APPEL|TELEPHON|^TEL\b/.test(t)) return 'APPEL';
  if (/^VISITE/.test(t)) return 'VISITE';
  return '';
}
/* Calendrier d'apprentis sans « Classes concernées » : rattaché par Formation + Niveau. */
function EUC_SUIVI2_classesCalendrier_(p, classes) {
  var f = EUC_SUIVI2_norm_(p.Formation), n = EUC_SUIVI2_norm_(p.Niveau), cible = '';
  if (f === 'CAP' && n === 'CP') cible = '1CAPP';
  else if (f === 'BACHELOR' && n === 'IP') cible = 'BACHELOR IP';
  else if (f === 'DUCRETET' && n === 'TSEC') cible = 'TSEC';
  var cles = [cible, (f + ' ' + n).trim(), n].filter(Boolean);
  return Object.keys(classes).filter(function(k) { var c = classes[k]; return c.modeApprentissage === 'CLASSE_ENTIERE' && cles.indexOf(EUC_SUIVI2_norm_(c.nom)) >= 0; }).map(Number);
}
function EUC_SUIVI2_typeFormation_(code) {
  var t = EUC_SUIVI2_norm_(code);
  if (!t) return true;
  return /^PFMP\b/.test(t) || /^P[\.\s-]*DIF/.test(t) || /^BTS[_\s-]*STAGE/.test(t) || /^STAGE BTS/.test(t);
}
/* R7 : période P.dif reconnue par son texte. */
function EUC_SUIVI2_estPdif_(p) {
  var t = EUC_SUIVI2_norm_([p.Type, p.Libelle, p.Libelle_periode, p.Nom, p.Groupe, p.Niveau].join(' '));
  return /P[\.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}
/* Statut d'un dossier de convention (mêmes codes que le suivi actuel). */
function EUC_SUIVI2_statut_(a) {
  if (!a) return 'SANS_CONVENTION';
  var s = EUC_SUIVI2_t_(a.Statut_administratif || a.Statut).toUpperCase();
  if (a.Supprimee_admin === true || s === 'SUPPRIMEE_ADMIN') return 'SUPPRIMEE';
  if (s.indexOf('ANNULEE') >= 0) return 'ANNULEE';
  if (s.indexOf('INTERROMP') >= 0) return 'INTERROMPUE';
  if (s === 'A_COMPLETER_ENTREPRISE') return 'A_COMPLETER_ENTREPRISE';
  if (s === 'PFMP_AUTORISEE') return 'AUTORISEE';
  return 'ENREGISTREE';
}
/* R14 / Q14 : entreprise validée par son SIRET (14 chiffres) ou son NIS, recopié
 * dans la convention ou porté par la fiche entreprise référencée. */
function EUC_SUIVI2_identifiantEntreprise_(a, entreprises) {
  var siret = EUC_SUIVI2_t_(a.Entreprise_siret || a.Entreprise_siret_snapshot || a.SIRET).replace(/\D/g, '');
  if (siret.length === 14) return 'SIRET';
  if (EUC_SUIVI2_t_(a.Entreprise_nis || a.Entreprise_nis_snapshot || a.NIS)) return 'NIS';
  var f = (entreprises || {})[EUC_SUIVI2_ref_(a.Entreprise)];
  if (f) {
    if (EUC_SUIVI2_t_(f.SIRET || f.Siret).replace(/\D/g, '').length === 14) return 'SIRET_FICHE';
    if (EUC_SUIVI2_t_(f.NIS || f.Nis || f.Entreprise_nis)) return 'NIS_FICHE';
    /* Monaco : la fiche entreprise référencée suffit (pas de SIRET français obligatoire). */
    if (EUC_SUIVI2_monaco_(f) || EUC_SUIVI2_monaco_(a)) return 'FICHE_MONACO';
  }
  /* Monaco : pas de SIRET français ; une raison sociale saisie à Monaco suffit
   * pour compter le stage, le NIS manquant est signalé dans le garde-fou. */
  if (EUC_SUIVI2_monaco_(a) && EUC_SUIVI2_t_(a.Entreprise_raison_sociale || a.Entreprise_enseigne)) return 'MONACO_SANS_NIS';
  return '';
}
/* Entreprise située à Monaco (pays, commune ou code postal 980xx). */
function EUC_SUIVI2_monaco_(x) {
  if (!x) return false;
  var t = EUC_SUIVI2_norm_([x.Entreprise_pays, x.Entreprise_commune, x.Pays, x.Commune, x.Ville].join(' '));
  var cp = EUC_SUIVI2_t_(x.Entreprise_code_postal || x.Code_postal);
  return /MONACO/.test(t) || /^980\d\d$/.test(cp);
}
function EUC_SUIVI2_entrepriseValidee_(a, entreprises) { return !!EUC_SUIVI2_identifiantEntreprise_(a, entreprises); }
/* DEV576 — fiche d'un élève pour une période (tableau des enseignants). */
function EUC_SUIVI2_premier_() { for (var i = 0; i < arguments.length; i++) { var v = EUC_SUIVI2_t_(arguments[i]); if (v) return v; } return ''; }
function EUC_SUIVI2_ficheDossier_(a, entreprises) {
  if (!a) return null;
  var P = EUC_SUIVI2_premier_, sr = EUC_SUIVI2_t_(a.Entreprise_siret || a.Entreprise_siret_snapshot).replace(/\D/g, '');
  var f = (entreprises || {})[EUC_SUIVI2_ref_(a.Entreprise)] || (sr.length === 14 && (entreprises || {})['S' + sr]) || {};
  var officiel = EUC_SUIVI2_nomEntreprise_(f), saisi = P(a.Entreprise_raison_sociale, a.Entreprise_enseigne);
  var resp = P([P(a.Responsable_prenom), P(a.Responsable_nom, a.Responsable, a.Nom_responsable_entreprise)].filter(Boolean).join(' '));
  var tut = [P(a.Tuteur_prenom), P(a.Tuteur_nom)].filter(Boolean).join(' ');
  return {
    entreprise: officiel || saisi, nomSaisi: officiel && saisi && EUC_SUIVI2_norm_(officiel) !== EUC_SUIVI2_norm_(saisi) ? saisi : '',
    adresse: [P(a.Entreprise_adresse, f.Adresse), [P(a.Entreprise_code_postal, f.Code_postal), P(a.Entreprise_commune, f.Commune, f.Ville)].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    contact: { nom: resp || tut, tel: P(a.Responsable_telephone, a.Entreprise_telephone, a.Entreprise_telephone_snapshot, f.Telephone, a.Tuteur_telephone), mail: P(a.Responsable_courriel, a.Entreprise_courriel, a.Entreprise_courriel_snapshot, f.Courriel, a.Tuteur_courriel) },
    tuteur: { nom: tut, tel: P(a.Tuteur_telephone), mail: P(a.Tuteur_courriel) },
    numero: P(a.Numero_enregistrement, a.Reference_convention), siret: sr.length === 14 ? sr : EUC_SUIVI2_t_(f.SIRET || f.Siret).replace(/\D/g, ''),
    debut: EUC_SUIVI2_date_(a.Date_debut), fin: EUC_SUIVI2_date_(a.Date_fin_reelle || a.Date_fin),
    enregistreLe: EUC_SUIVI2_date_(a.Date_enregistrement || a.Date_saisie_entreprise || a.Date_creation)
  };
}
function EUC_SUIVI2_nomEntreprise_(f) { return EUC_SUIVI2_premier_(f && f.Raison_sociale, f && f.Raison_sociale_officielle, f && f.Nom, f && f.Nom_entreprise, f && f.Entreprise); }
/* Fiche d'un apprenti : fiche d'apprentissage (Yparéo / gestion des apprentis), complétée par la fiche entreprise du SIRET. */
function EUC_SUIVI2_ficheApprenti_(ap, entreprises) {
  var r = ap.brut || {}, P = EUC_SUIVI2_premier_, sr = P(r.SIRET, r.Entreprise_siret, r.SIRET_entreprise).replace(/\D/g, '');
  var f = (sr.length === 14 && (entreprises || {})['S' + sr]) || (entreprises || {})[EUC_SUIVI2_ref_(r.Entreprise_ref || r.Fiche_entreprise)] || {};
  var resp = [P(r.Responsable_prenom), P(r.Responsable_nom, r.Responsable)].filter(Boolean).join(' ');
  var tut = [P(r.Tuteur_prenom), P(r.Tuteur_nom, r.Tuteur)].filter(Boolean).join(' ');
  return {
    entreprise: EUC_SUIVI2_nomEntreprise_(f) || P(r.Nom_entreprise, r.Nom_commercial, ap.entreprise),
    adresse: [P(r.Adresse_entreprise, r.Adresse, f.Adresse), [P(r.Code_postal, r.CP, f.Code_postal), P(r.Ville, r.Commune, f.Ville, f.Commune)].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    contact: { nom: resp || tut, tel: P(r.Responsable_telephone, r.Entreprise_telephone, f.Telephone, r.Tuteur_telephone), mail: P(r.Responsable_courriel, r.Entreprise_courriel, f.Courriel, r.Tuteur_courriel) },
    tuteur: { nom: tut, tel: P(r.Tuteur_telephone), mail: P(r.Tuteur_courriel) },
    numero: '', siret: sr.length === 14 ? sr : '', contratDebut: ap.debut || '', contratFin: ap.fin || ''
  };
}
/* R18 : dossier enregistré (ou « à compléter » entièrement saisi) avec entreprise validée. */
function EUC_SUIVI2_vautConvention_(a, entreprises) {
  var s = EUC_SUIVI2_statut_(a);
  if (s === 'A_COMPLETER_ENTREPRISE') return EUC_SUIVI2_saisieEntrepriseComplete_(a, entreprises);
  /* PFMP autorisée = dossier validé à la main par le bureau (Administration des conventions). */
  return (s === 'ENREGISTREE' || s === 'AUTORISEE') && EUC_SUIVI2_entrepriseValidee_(a, entreprises);
}
/* Période ordinaire de la classe qui chevauche le plus les dates données. */
function EUC_SUIVI2_meilleurePeriode_(periodes, d1, d2) {
  var best = null, bestJours = 0;
  (periodes || []).forEach(function(p) {
    if (p.pdif) return;
    var a = d1 > p.debut ? d1 : p.debut, b = d2 < p.fin ? d2 : p.fin;
    if (a > b) return;
    var j = (Date.parse(b) - Date.parse(a)) / 864e5 + 1;
    if (j > bestJours) { best = p; bestJours = j; }
  });
  return best;
}
/* Dossier « à compléter » dont l'entreprise a tout saisi (même règle que DEV533). */
function EUC_SUIVI2_saisieEntrepriseComplete_(a, entreprises) {
  if (!EUC_SUIVI2_entrepriseValidee_(a, entreprises)) return false;
  return [a.Entreprise_raison_sociale, a.Entreprise_adresse, a.Entreprise_code_postal, a.Entreprise_commune,
    a.Responsable_nom, a.Responsable_prenom, a.Responsable_telephone, a.Responsable_courriel,
    a.Tuteur_nom, a.Tuteur_prenom, a.Tuteur_telephone, a.Tuteur_courriel].every(function(v) { return !!EUC_SUIVI2_t_(v); });
}
/* Ligne du calendrier qui ressemble à une PFMP ou un stage (périodes orphelines). */
function EUC_SUIVI2_ressemblePfmp_(p) {
  return /PFMP|STAGE|P[\.\s-]*DIF|PARCOURS|ENTREPRISE/.test(EUC_SUIVI2_norm_([p.Type, p.Libelle, p.Libelle_periode, p.Nom, p.Groupe].join(' ')));
}
/* R16 / R17 : apprenti = contrat commencé, non échu, sans rupture. */
function EUC_SUIVI2_episode_(r) {
  var contrat = EUC_SUIVI2_date_(r.Date_contrat_officielle || r.Date_contrat);
  var debut = EUC_SUIVI2_date_(r.Date_debut || r.Debut) || contrat;
  var fin = EUC_SUIVI2_date_(r.Date_fin || r.Fin);
  var rupture = EUC_SUIVI2_date_(r.Date_rupture_contrat || r.Date_rupture);
  return {
    id: Number(r.id) || 0, eleveId: EUC_SUIVI2_ref_(r.Eleve), annee: EUC_SUIVI2_t_(r.Annee_scolaire),
    contrat: contrat, debut: debut, fin: fin, rupture: rupture,
    cfa: EUC_SUIVI2_bool_(r.Dossier_transmis_CFA) || !!EUC_SUIVI2_date_(r.Date_transmission_CFA),
    entreprise: EUC_SUIVI2_t_(r.Entreprise || r.Entreprise_raison_sociale || r.Nom_entreprise),
    brut: r
  };
}
function EUC_SUIVI2_statutApprenti_(eps, aujourdhui) {
  var futur = false, apprenti = null;
  (eps || []).forEach(function(ep) {
    if (ep.rupture && ep.rupture <= aujourdhui) return;
    var complet = !!(ep.contrat && ep.debut && ep.fin);
    if (complet && ep.debut <= aujourdhui && ep.fin >= aujourdhui) { if (!apprenti || ep.id > apprenti.id) apprenti = ep; return; }
    if (ep.cfa || (complet && ep.debut > aujourdhui)) futur = true;
  });
  if (apprenti) return { code: 'APPRENTI', entreprise: apprenti.entreprise, debut: apprenti.debut, fin: apprenti.fin };
  return { code: futur ? 'FUTUR_APPRENTI' : 'SCOLAIRE' };
}
/* R16 bis : statut d'apprenti PAR PÉRIODE, selon les dates du contrat.
 * APPRENTI : le contrat couvre toute la période ; MIXTE : le contrat commence
 * (ou se termine) pendant la période — l'élève est scolaire, sous convention,
 * une partie du temps et apprenti l'autre partie ; sinon SCOLAIRE.
 * Une rupture termine le contrat la veille ; une fin antérieure au début est
 * traitée comme une fin ouverte (même règle que la gestion des apprentis). */
function EUC_SUIVI2_veille_(iso) {
  var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
}
function EUC_SUIVI2_apprentiPeriode_(eps, p) {
  var plein = null, partiel = null;
  (eps || []).forEach(function(ep) {
    var debut = ep.debut || ep.contrat; if (!debut) return;
    var fin = ep.fin && ep.fin >= debut ? ep.fin : '9999-12-31';
    if (ep.rupture) { var v = EUC_SUIVI2_veille_(ep.rupture); if (v < fin) fin = v; }
    if (fin < debut) return;
    var x = { code: '', entreprise: ep.entreprise, debut: debut, fin: fin === '9999-12-31' ? '' : fin, id: ep.id, brut: ep.brut };
    if (debut <= p.debut && fin >= p.fin) { if (!plein || ep.id > plein.id) plein = x; }
    else if (debut <= p.fin && fin >= p.debut) { if (!partiel || ep.id > partiel.id) partiel = x; }
  });
  if (plein) { plein.code = 'APPRENTI'; return plein; }
  if (partiel) { partiel.code = 'MIXTE'; return partiel; }
  return { code: 'SCOLAIRE' };
}

/* ---------- Calcul pur ---------- */

function EUC_SUIVI2_calculer_(src, annee, aujourdhui) {
  var annees = {};
  (src.annees || []).map(EUC_SUIVI2_champs_).forEach(function(a) { annees[String(a.id)] = EUC_SUIVI2_t_(a.Code || a.Libelle); });
  annee = EUC_SUIVI2_t_(annee) || EUC_SUIVI2_anneeCourante_(aujourdhui);

  var diplomes = {};
  (src.diplomes || []).map(EUC_SUIVI2_champs_).forEach(function(d) {
    var cid = EUC_SUIVI2_ref_(d.Classe); if (cid) diplomes[cid] = { famille: EUC_SUIVI2_t_(d.Famille || d.Filiere), diplome: EUC_SUIVI2_t_(d.Diplome || d.Libelle_diplome || d.Intitule) };
  });

  /* Classes */
  var classes = {};
  (src.classes || []).map(EUC_SUIVI2_champs_).forEach(function(c) {
    if (c.Actif === false) return;
    var nom = EUC_SUIVI2_t_(c.Nom || c.Libelle || c.Code_import) || ('Classe ' + c.id);
    var famille = EUC_SUIVI2_famille_(c, diplomes[c.id]);
    var niveau = EUC_SUIVI2_niveau_(nom, famille);
    var profil = typeof EUC_DEV579_profil_ === 'function' ? EUC_DEV579_profil_(EUC_DEV579_profilsConfig_(), annee, c.id, nom, c.Etab, 'MIXITE') : null, modeApp = profil ? profil.mode : '';
    classes[c.id] = { id: Number(c.id), nom: nom, famille: famille, niveau: niveau, diplome: (diplomes[c.id] || {}).diplome || '', etab: EUC_SUIVI2_etab_(c.Etab || c.Etablissement_Pronote), modeApprentissage: modeApp, gestionnaire: profil ? profil.gestionnaire : '', donneur: profil ? profil.donneur : '',
      apprentisAffiches: modeApp === 'CLASSE_ENTIERE' || EUC_SUIVI2_apprentisAffiches_(famille, niveau), periodes: [], eleves: [] };
  });

  /* R1–R3 : périodes de l'année, rattachées par Classes_concernees. */
  var types = {};
  (src.types || []).map(EUC_SUIVI2_champs_).forEach(function(t) { types[String(t.id)] = EUC_SUIVI2_t_(t.Type || t.Libelle); });
  var sansClasse = [];
  (src.periodes || []).map(EUC_SUIVI2_champs_).forEach(function(p) {
    if (p.Actif === false) return;
    /* Le type peut être une référence vers Types_Planning ou un texte. */
    var typeCode = (typeof p.Type === 'number' || /^\d+$/.test(EUC_SUIVI2_t_(p.Type))) ? (types[String(EUC_SUIVI2_ref_(p.Type))] || '') : EUC_SUIVI2_t_(p.Type);
    var suivi = EUC_SUIVI2_typeSuivi_(typeCode);
    if (!EUC_SUIVI2_typeFormation_(typeCode) && !suivi) return;
    p.Type = typeCode;
    var debut = EUC_SUIVI2_date_(p.Date_debut), fin = EUC_SUIVI2_date_(p.Date_fin);
    if (!debut || !fin) return;
    var an = EUC_SUIVI2_annee_(p.Annee_scolaire, annees);
    if (an && an !== annee) return;
    var ids = EUC_SUIVI2_refs_(p.Classes_concernees);
    if (!ids.length) { var seul = EUC_SUIVI2_ref_(p.Classe); if (seul) ids = [seul]; }
    if (!ids.length && suivi) ids = EUC_SUIVI2_classesCalendrier_(p, classes);
    if (!ids.length) { if (EUC_SUIVI2_ressemblePfmp_(p)) sansClasse.push(Number(p.id)); return; }
    ids.forEach(function(cid) {
      if (!classes[cid]) return;
      /* Appels et visites : seulement pour les classes entières d'apprentis. */
      if (suivi && classes[cid].modeApprentissage !== 'CLASSE_ENTIERE' && classes[cid].modeApprentissage !== 'FORMATION_CONTINUE') return;
      classes[cid].periodes.push({ suivi: suivi, id: Number(p.id), libelleSource: EUC_SUIVI2_t_(p.Libelle_periode || p.Libelle || p.Nom), type: EUC_SUIVI2_t_(p.Type), groupe: EUC_SUIVI2_t_(p.Groupe), debut: debut, fin: fin, pdif: EUC_SUIVI2_estPdif_(p) });
    });
  });
  /* R6 : numérotation par rang des périodes ordinaires ; R26 : P.dif en Terminale BAC PRO seulement. */
  Object.keys(classes).forEach(function(k) {
    var c = classes[k], rang = 0, mot = c.famille === 'BTS' ? 'Stage' : 'PFMP';
    c.periodes.sort(function(a, b) { return a.debut.localeCompare(b.debut) || a.id - b.id; });
    c.periodes = c.periodes.filter(function(p) { return !p.pdif || (c.famille === 'BACPRO' && c.niveau === 'Terminale'); });
    var visites = 0, appels = 0, nbAppels = c.periodes.filter(function(p) { return p.suivi === 'APPEL'; }).length;
    c.periodes.forEach(function(p) {
      if (p.suivi === 'APPEL') { appels++; p.libelle = 'Appel téléphonique' + (nbAppels > 1 ? ' n°' + appels : ''); }
      else if (p.suivi === 'VISITE') { visites++; p.libelle = 'Visite n°' + visites; }
      else if (p.pdif) { p.libelle = 'P.dif.'; } else { rang++; p.rang = rang; p.libelle = mot + ' n°' + rang; }
    });
  });

  /* R13 : élèves inscrits cette année, actifs, non sortis. */
  var eleves = {};
  (src.eleves || []).map(EUC_SUIVI2_champs_).forEach(function(e) {
    if (e.Actif === false || e.Present_dernier_import === false) return;
    if (EUC_SUIVI2_norm_(e.Statut_scolarite) === 'SORTI') return;
    var an = EUC_SUIVI2_annee_(e.Annee_scolaire, annees);
    if (an ? an !== annee : annee !== EUC_SUIVI2_anneeCourante_(aujourdhui)) return;
    var cid = EUC_SUIVI2_ref_(e.Classe); if (!classes[cid]) return;
    var x = { id: Number(e.id), nom: EUC_SUIVI2_t_(e.Nom), prenom: EUC_SUIVI2_t_(e.Prenom_usage || e.Prenom), classeId: cid };
    x.libelle = [x.nom, x.prenom].filter(Boolean).join(' ');
    eleves[x.id] = x; classes[cid].eleves.push(x);
  });

  /* Apprentissage */
  var episodes = {};
  (src.apprentissage || []).map(EUC_SUIVI2_champs_).forEach(function(r) {
    if (r.Actif === false) return;
    var ep = EUC_SUIVI2_episode_(r); if (!ep.eleveId) return;
    var an = EUC_SUIVI2_annee_(ep.annee, annees); if (an && an !== annee) return;
    (episodes[ep.eleveId] = episodes[ep.eleveId] || []).push(ep);
  });

  /* P.dif : dernier choix de chaque élève pour l'année. */
  var modes = {};
  (src.pdif || []).map(EUC_SUIVI2_champs_).forEach(function(r) {
    if (EUC_SUIVI2_annee_(r.Annee_scolaire, annees) !== annee) return;
    var eid = EUC_SUIVI2_ref_(r.Eleve); if (!eid) return;
    if (modes[eid] && Number(modes[eid].id) > Number(r.id)) return;
    var mode = EUC_SUIVI2_t_(r.Mode_fin_terminale);
    if (!mode && EUC_SUIVI2_bool_(r.Parcours_differencie)) mode = EUC_SUIVI2_MODE_LYCEE_;
    modes[eid] = { id: r.id, mode: mode };
  });

  /* Fiches entreprises (identifiant SIRET / NIS). */
  var entreprises = {};
  (src.entreprises || []).map(EUC_SUIVI2_champs_).forEach(function(f) {
    entreprises[f.id] = f;
    /* Index par SIRET : un même SIRET = une même entreprise, quel que soit le nom saisi. */
    var sr = EUC_SUIVI2_t_(f.SIRET || f.Siret).replace(/\D/g, '');
    if (sr.length === 14 && !entreprises['S' + sr]) entreprises['S' + sr] = f;
  });

  /* Transition JotForm → QR : une saisie JotForm compte quand le bureau l'a
   * validée (Decision = VALIDEE) ou importée, avec un SIRET de 14 chiffres.
   * Elle est rattachée à une période par l'élève et le chevauchement des dates. */
  var jotform = {}, jotformNonValide = {};
  var gardeFou = { dossiersOrphelins: [], dossiersRattaches: [], jotformSansEleve: [], jotformSansPeriode: [], conflits: [], monacoSansNis: [] };
  /* Réponse brute JotForm : premier champ dont le libellé correspond. */
  function brut(j, libelles) {
    var raw = j.Raw_JSON || j.Raw_json || j.Donnees_brutes; if (!raw) return '';
    try { raw = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return ''; }
    var cles = Object.keys(raw || {});
    for (var i = 0; i < libelles.length; i++) {
      var cible = EUC_SUIVI2_norm_(libelles[i]);
      for (var k = 0; k < cles.length; k++) {
        var v = raw[cles[k]], nom = EUC_SUIVI2_norm_(v && typeof v === 'object' && v.text ? v.text : cles[k]);
        if (nom === cible || nom.indexOf(cible) === 0) return v && typeof v === 'object' && 'answer' in v ? v.answer : v;
      }
    }
    return '';
  }
  (src.jotform || []).map(EUC_SUIVI2_champs_).forEach(function(j) {
    var eid = EUC_SUIVI2_ref_(j.Eleve_match_id || j.Eleve || j.Eleve_id);
    if (!eid || !eleves[eid]) {
      /* Garde-fou : saisie non ignorée dont l'élève n'est pas reconnu dans l'effectif de l'année. */
      if (EUC_SUIVI2_t_(j.Decision).toUpperCase() !== 'IGNOREE' && [annee, ''].indexOf(EUC_SUIVI2_annee_(j.Annee_scolaire, annees)) >= 0) {
        gardeFou.jotformSansEleve.push({ ligne: Number(j.id), eleveId: eid || 0, nom: EUC_SUIVI2_t_(j.Eleve_nom || j.Nom_eleve || j.Nom || brut(j, ['Nom'])) + ' ' + EUC_SUIVI2_t_(j.Eleve_prenom || j.Prenom_eleve || j.Prenom || brut(j, ['Prénom', 'Prenom'])),
          classe: EUC_SUIVI2_t_(j.Classe_brut || j.Classe || brut(j, ['Classe'])), decision: EUC_SUIVI2_t_(j.Decision), siretStatut: EUC_SUIVI2_t_(j.SIRET_statut) });
      }
      return;
    }
    var debut = EUC_SUIVI2_date_(j.Date_debut_brut || j.Date_debut) || EUC_SUIVI2_date_(brut(j, ['Date de début', 'Date debut']));
    var fin = EUC_SUIVI2_date_(j.Date_fin_brut || j.Date_fin) || EUC_SUIVI2_date_(brut(j, ['Date de fin', 'Date fin']));
    var siret = EUC_SUIVI2_t_(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, '');
    var importee = j.Importer === true || Number(j.Importer) === 1 || /^(OUI|YES|TRUE|VRAI)$/i.test(EUC_SUIVI2_t_(j.Importer));
    /* Validée = SIRET vérifié par le bureau (page de migration), décision
     * VALIDEE ou ligne déjà importée ; une ligne ignorée ne compte jamais. */
    var decision = EUC_SUIVI2_t_(j.Decision).toUpperCase(), siretStatut = EUC_SUIVI2_t_(j.SIRET_statut).toUpperCase();
    /* Monaco : NIS saisi par le bureau (outil « Monaco / NIS ») = identifiant validé. */
    var nis = EUC_SUIVI2_t_(j.NIS_normalise || j.NIS);
    var monacoNis = !!nis && (siretStatut === 'NIS_MONACO' || EUC_SUIVI2_t_(j.NIS_statut).toUpperCase().indexOf('VALIDE') === 0);
    var valide = decision !== 'IGNOREE' && (decision === 'VALIDEE' || siretStatut === 'VERIFIE' || monacoNis || importee);
    /* Date mal saisie (ex. 1926) : hors de l'année scolaire, on se fie au numéro de période. */
    var an0 = Number(annee.slice(0, 4)), datesFausses = false;
    [debut, fin].forEach(function(d) { if (d && (Number(d.slice(0, 4)) < an0 - 1 || Number(d.slice(0, 4)) > an0 + 2)) datesFausses = true; });
    if (datesFausses) { debut = ''; fin = ''; }
    var ligne = { id: Number(j.id), debut: debut, fin: fin, datesFausses: datesFausses, numero: Number(j.Periode_numero || brut(j, ['Période n°', 'Periode n°'])) || 0, siret: siret.length === 14, siretNum: siret, decision: (EUC_SUIVI2_t_(j.Decision) || (importee ? 'IMPORTEE' : '')) + (siretStatut ? ' / SIRET ' + siretStatut : '') };
    if (monacoNis) ligne.siret = true;
    ligne.fiche = { entreprise: EUC_SUIVI2_premier_(j.Raison_sociale_officielle, j.Nom_commercial, j.Entreprise_saisie),
      adresse: EUC_SUIVI2_premier_([EUC_SUIVI2_t_(j.Adresse_officielle), [EUC_SUIVI2_t_(j.CP_officiel), EUC_SUIVI2_t_(j.Ville_officielle)].filter(Boolean).join(' ')].filter(Boolean).join(', '), j.Adresse_entreprise),
      contact: { nom: '', tel: '', mail: '' }, tuteur: { nom: EUC_SUIVI2_t_(j.Tuteur_nom), tel: EUC_SUIVI2_t_(j.Tuteur_telephone), mail: EUC_SUIVI2_t_(j.Tuteur_courriel) }, numero: '' };
    ((valide && ligne.siret) ? (jotform[eid] = jotform[eid] || []) : (jotformNonValide[eid] = jotformNonValide[eid] || [])).push(ligne);
  });
  function jotformSur(liste, p) {
    /* Chevauchement des dates ; à défaut de dates lisibles, le numéro de période saisi. */
    return (liste || []).filter(function(l) { return l.debut && l.fin ? (l.debut <= p.fin && l.fin >= p.debut) : (!p.pdif && l.numero && l.numero === p.rang); })[0] || null;
  }

  /* Dossiers de convention par élève et période. Un dossier posé sur une
   * ligne du calendrier qui n'est pas une période de la classe de l'élève
   * (doublon, ancienne ligne, autre classe) est rattaché à la période de la
   * classe qui chevauche ses dates ; sinon il est signalé dans le garde-fou. */
  var calendrier = {};
  (src.periodes || []).map(EUC_SUIVI2_champs_).forEach(function(p) {
    calendrier[p.id] = { debut: EUC_SUIVI2_date_(p.Date_debut), fin: EUC_SUIVI2_date_(p.Date_fin), libelle: EUC_SUIVI2_t_(p.Libelle_periode || p.Libelle || p.Nom) };
  });
  var dossiers = {};
  (src.dossiers || []).map(EUC_SUIVI2_champs_).forEach(function(a) {
    var eid = EUC_SUIVI2_ref_(a.Eleve), pid = EUC_SUIVI2_ref_(a.Periode);
    if (!eid || !eleves[eid]) return;
    var c = classes[eleves[eid].classeId], cible = pid;
    if (!c.periodes.some(function(p) { return p.id === pid; })) {
      if (EUC_SUIVI2_statut_(a) === 'SUPPRIMEE') return;
      var cal = calendrier[pid] || {}, d1 = EUC_SUIVI2_date_(a.Date_debut) || cal.debut, d2 = EUC_SUIVI2_date_(a.Date_fin_reelle || a.Date_fin) || cal.fin;
      var p2 = d1 && d2 ? EUC_SUIVI2_meilleurePeriode_(c.periodes, d1, d2) : null;
      var info = { eleveId: eid, eleve: eleves[eid].libelle, classe: c.nom, dossier: Number(a.id), periodeDossier: pid, periodeDossierLibelle: cal.libelle || '', debut: d1 || '', fin: d2 || '', statut: EUC_SUIVI2_t_(a.Statut_administratif || a.Statut) };
      /* Un QR généré sans aucune saisie (brouillon) n'est pas une donnée à signaler. */
      var saisi = !!(EUC_SUIVI2_t_(a.Entreprise_raison_sociale || a.Entreprise_enseigne) || EUC_SUIVI2_t_(a.Entreprise_siret || a.Entreprise_nis) || EUC_SUIVI2_ref_(a.Entreprise));
      if (!p2) { if (saisi) gardeFou.dossiersOrphelins.push(info); return; }
      cible = p2.id; info.periode = p2.libelle || ''; info.periodeId = p2.id; if (saisi) gardeFou.dossiersRattaches.push(info);
    }
    (dossiers[eid + '|' + cible] = dossiers[eid + '|' + cible] || []).push(a);
  });

  /* R16–R20 : situation de chaque élève sur chaque période. */
  Object.keys(classes).forEach(function(k) {
    var c = classes[k];
    c.eleves.sort(function(a, b) { return a.libelle.localeCompare(b.libelle, 'fr'); });
    c.eleves.forEach(function(e) { e.apprentissage = EUC_SUIVI2_statutApprenti_(episodes[e.id], aujourdhui); });
    c.periodes.forEach(function(p) {
      var r = { effectif: c.eleves.length, apprentis: [], avec: [], sans: [], annulees: [], lycee: [], entreprise: [], aDefinir: [], mixtes: {}, fiches: {}, statuts: {} };
      c.eleves.forEach(function(e) {
        var ap = EUC_SUIVI2_apprentiPeriode_(episodes[e.id], p), apprenti = ap.code === 'APPRENTI';
        /* DEV581 — classe entière d'apprentis : on suit des contrats, pas des conventions.
         * Contrat = fiche d'apprentissage couvrant la période AVEC une entreprise ; une fiche
         * Yparéo sans entreprise (futur apprenti) compte « sans contrat » ; une rupture
         * avant la fin de la période sans nouveau contrat compte « contrat rompu ». */
        if ((c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE') && !p.pdif) {
          if ((episodes[e.id] || []).length) r.apprentis.push(e.id);
          var fa = ap.code === 'APPRENTI' || ap.code === 'MIXTE' ? EUC_SUIVI2_ficheApprenti_(ap, entreprises) : null;
          if (fa && fa.entreprise) { r.avec.push(e.id); r.statuts[e.id] = 'CONTRAT'; r.fiches[e.id] = fa; return; }
          var rompu = (episodes[e.id] || []).some(function(ep) { return ep.rupture && ep.rupture <= p.fin; });
          r.sans.push(e.id); if (rompu) r.annulees.push(e.id);
          r.statuts[e.id] = rompu ? 'RUPTURE' : 'SANS_CONTRAT';
          return;
        }
        if (apprenti) { r.statuts[e.id] = 'APPRENTI'; r.fiches[e.id] = EUC_SUIVI2_ficheApprenti_(ap, entreprises); }
        if (ap.code === 'MIXTE') r.mixtes[e.id] = { debut: ap.debut, fin: ap.fin, entreprise: ap.entreprise || '' };
        if (p.pdif) {
          /* Un apprenti est d'office en entreprise pendant le P.dif. */
          if (apprenti) { r.entreprise.push(e.id); r.apprentis.push(e.id); return; }
          var m = (modes[e.id] || {}).mode;
          (m === EUC_SUIVI2_MODE_ENTREPRISE_ ? r.entreprise : m === EUC_SUIVI2_MODE_LYCEE_ ? r.lycee : r.aDefinir).push(e.id);
          r.statuts[e.id] = m === EUC_SUIVI2_MODE_ENTREPRISE_ ? 'PDIF_ENTREPRISE' : m === EUC_SUIVI2_MODE_LYCEE_ ? 'PDIF_LYCEE' : 'PDIF_A_DEFINIR';
          var dp = (dossiers[e.id + '|' + p.id] || []).slice().sort(function(a, b) { return Number(b.id) - Number(a.id); });
          var fp = EUC_SUIVI2_ficheDossier_(dp.filter(function(x) { return EUC_SUIVI2_vautConvention_(x, entreprises); })[0] || dp[0], entreprises);
          if (fp && fp.entreprise) r.fiches[e.id] = fp;
          return;
        }
        if (apprenti) { r.apprentis.push(e.id); return; }
        var liste = (dossiers[e.id + '|' + p.id] || []).slice().sort(function(a, b) { return Number(b.id) - Number(a.id); });
        /* Dossier retenu : un dossier actif qui vaut convention (le plus récent),
         * sinon le dossier actif le plus récent, sinon le plus récent. */
        var actifs = liste.filter(function(x) { var code = EUC_SUIVI2_statut_(x); return code !== 'ANNULEE' && code !== 'INTERROMPUE' && code !== 'SUPPRIMEE' && x.Revoked !== true; });
        var valant = actifs.filter(function(x) { return EUC_SUIVI2_vautConvention_(x, entreprises); });
        var actif = valant[0] || actifs[0] || null;
        var d = actif || liste[0] || null, statut = EUC_SUIVI2_statut_(d);
        if (statut === 'A_COMPLETER_ENTREPRISE' && actif && EUC_SUIVI2_saisieEntrepriseComplete_(actif, entreprises)) statut = 'ENREGISTREE';
        var avec = !!(valant[0]);
        var fiche = EUC_SUIVI2_ficheDossier_(valant[0] || actif || liste[0], entreprises);
        if (fiche && (fiche.entreprise || valant[0])) r.fiches[e.id] = fiche;
        r.statuts[e.id] = avec ? 'AVEC' : (statut === 'ANNULEE' || statut === 'INTERROMPUE' ? statut : 'SANS');
        r.sources = r.sources || {};
        if (avec) {
          r.avec.push(e.id); r.sources[e.id] = 'QR';
          if (EUC_SUIVI2_identifiantEntreprise_(valant[0], entreprises) === 'MONACO_SANS_NIS') gardeFou.monacoSansNis.push({ eleveId: e.id, eleve: e.libelle, classe: c.nom, periode: p.libelle, dossier: Number(valant[0].id), entreprise: EUC_SUIVI2_t_(valant[0].Entreprise_raison_sociale || valant[0].Entreprise_enseigne) });
          /* Garde-fou : le dossier du bureau prime ; une saisie JotForm qui le contredit est signalée. */
          var sDossier = EUC_SUIVI2_t_(valant[0].Entreprise_siret || valant[0].Entreprise_siret_snapshot).replace(/\D/g, '');
          (jotform[e.id] || []).forEach(function(l) {
            if (sDossier && l.siretNum && l.siretNum !== sDossier && jotformSur([l], p)) gardeFou.conflits.push({ eleveId: e.id, eleve: e.libelle, classe: c.nom, periode: p.libelle, ligne: l.id, siretJotform: l.siretNum, siretDossier: sDossier, entrepriseDossier: EUC_SUIVI2_t_(valant[0].Entreprise_raison_sociale || valant[0].Entreprise_enseigne) });
          });
          return;
        }
        var jf = (!d || !(statut === 'ANNULEE' || statut === 'INTERROMPUE')) ? jotformSur(jotform[e.id], p) : null;
        if (jf) { r.avec.push(e.id); r.sources[e.id] = 'JOTFORM'; r.statuts[e.id] = 'AVEC'; if (!r.fiches[e.id] || !r.fiches[e.id].entreprise) r.fiches[e.id] = jf.fiche; return; }
        r.sans.push(e.id);
        if (statut === 'ANNULEE' || statut === 'INTERROMPUE') r.annulees.push(e.id);
        /* Motif, pour l'écran de contrôle et l'affichage « sans convention ». */
        var autres = [];
        Object.keys(dossiers).forEach(function(k2) { if (k2.indexOf(e.id + '|') === 0 && k2 !== e.id + '|' + p.id) autres.push(Number(k2.split('|')[1])); });
        r.motifs = r.motifs || {};
        r.motifs[e.id] = { dossiers: liste.length, statut: d ? EUC_SUIVI2_t_(d.Statut_administratif || d.Statut) || statut : 'AUCUN_DOSSIER',
          identifiant: d ? EUC_SUIVI2_identifiantEntreprise_(d, entreprises) : '', ficheEntreprise: d ? EUC_SUIVI2_ref_(d.Entreprise) : 0, autresPeriodes: autres,
          jotformNonValide: !!jotformSur(jotformNonValide[e.id], p),
          entrepriseSaisie: d ? EUC_SUIVI2_t_(d.Entreprise_raison_sociale || d.Entreprise_raison_sociale_snapshot) : '',
          jotformToutes: (jotform[e.id] || []).concat(jotformNonValide[e.id] || []).map(function(l) { return (l.decision || 'sans décision') + ' ' + (l.debut || '?') + '→' + (l.fin || '?') + (l.siret ? ' SIRET ok' : ' SIRET absent') + (l.datesFausses ? ' (dates hors année, rattachée par n° de période)' : ''); }) };
      });
      r.scolaires = (c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE') ? r.effectif : r.effectif - r.apprentis.length;
      p.resume = r;
    });
  });

  /* DEV576 — professeurs principaux et suivi (téléphone / visite) par élève et période. */
  var profs = {};
  (src.professeurs || []).map(EUC_SUIVI2_champs_).forEach(function(x) { profs[x.id] = [x.Civilite, x.Prenom, x.Nom].map(EUC_SUIVI2_t_).filter(Boolean).join(' '); });
  (src.classesProfs || []).map(EUC_SUIVI2_champs_).forEach(function(l) {
    var c = classes[EUC_SUIVI2_ref_(l.Classe)], nom = profs[EUC_SUIVI2_ref_(l.Professeur)];
    if (!c || !nom || l.Actif === false || EUC_SUIVI2_t_(l.Role) !== 'PROFESSEUR_PRINCIPAL') return;
    c.pp = c.pp || []; if (c.pp.indexOf(nom) < 0) c.pp.push(nom);
  });
  var suivis = {};
  (src.affectations || []).map(EUC_SUIVI2_champs_).forEach(function(a) {
    if (a.Actif === false) return;
    var an = EUC_SUIVI2_annee_(a.Annee_scolaire, annees); if (an && an !== annee) return;
    var type = EUC_SUIVI2_norm_(a.Type_suivi), k = EUC_SUIVI2_ref_(a.Classe) + '|' + EUC_SUIVI2_ref_(a.Periode) + '|' + EUC_SUIVI2_ref_(a.Eleve);
    var champ = type.indexOf('TELEPHONE') >= 0 ? 'tel' : type.indexOf('VISITE') >= 0 ? 'visite' : ''; if (!champ) return;
    var nom = EUC_SUIVI2_t_(a.Nom_professeur_snapshot) || profs[EUC_SUIVI2_ref_(a.Professeur)] || '';
    var x = suivis[k] = suivis[k] || {};
    if (nom && (!x[champ + 'Id'] || Number(a.id) > x[champ + 'Id'])) { x[champ] = nom; x[champ + 'Id'] = Number(a.id); }
  });
  Object.keys(classes).forEach(function(k) {
    var c = classes[k];
    c.periodes.forEach(function(p) {
      if (!p.resume) return; p.resume.suivis = {};
      c.eleves.forEach(function(e) { var x = suivis[c.id + '|' + p.id + '|' + e.id]; if (x) p.resume.suivis[e.id] = { tel: x.tel || '', visite: x.visite || '' }; });
    });
  });

  /* Garde-fou : saisie JotForm valide qui ne tombe sur aucune période de la classe. */
  Object.keys(jotform).forEach(function(eid) {
    var e = eleves[eid], c = classes[e.classeId];
    jotform[eid].forEach(function(l) {
      if (c.periodes.some(function(p) { return !p.pdif && jotformSur([l], p); })) return;
      gardeFou.jotformSansPeriode.push({ ligne: l.id, eleveId: Number(eid), eleve: e.libelle, classe: c.nom, debut: l.debut || '', fin: l.fin || '', numero: l.numero || 0, decision: l.decision });
    });
  });

  var liste = Object.keys(classes).map(function(k) { return classes[k]; }).filter(function(c) { return c.periodes.length || c.eleves.length || c.modeApprentissage === 'CLASSE_ENTIERE' || c.modeApprentissage === 'FORMATION_CONTINUE'; });
  liste.sort(function(a, b) { return a.famille.localeCompare(b.famille) || a.nom.localeCompare(b.nom, 'fr'); });
  return { version: EUC_SUIVI2_VERSION_, annee: annee, calculeLe: new Date().toISOString(), aujourdhui: aujourdhui, classes: liste, periodesSansClasse: sansClasse, gardeFou: gardeFou };
}

/* ---------- Lecture Grist et cache ---------- */

function EUC_SUIVI2_grist_() {
  var c = EUC_ENT_lireConfiguration();
  return { base: String(c.EUC_ENT_GRIST_API_URL || '').replace(/\/$/, '') + '/api/docs/' + encodeURIComponent(c.EUC_ENT_GRIST_DOC_ID),
    entetes: { Authorization: 'Bearer ' + c.EUC_ENT_GRIST_API_KEY, Accept: 'application/json' } };
}

/* Numéro de la dernière action du document : change à chaque modification. */
function EUC_SUIVI2_temoin_() {
  var g = EUC_SUIVI2_grist_(), rep = UrlFetchApp.fetch(g.base + '/states', { headers: g.entetes, muteHttpExceptions: true });
  if (rep.getResponseCode() !== 200) throw new Error('Grist indisponible (témoin ' + rep.getResponseCode() + ').');
  var s = JSON.parse(rep.getContentText()).states || [];
  return s.length ? String(s[0].n) + '-' + String(s[0].h || '').slice(0, 8) : '0';
}

function EUC_SUIVI2_lireSources_() {
  var g = EUC_SUIVI2_grist_(), cles = Object.keys(EUC_SUIVI2_TABLES_);
  var reps = UrlFetchApp.fetchAll(cles.map(function(k) {
    return { url: g.base + '/tables/' + EUC_SUIVI2_TABLES_[k] + '/records', headers: g.entetes, muteHttpExceptions: true };
  }));
  var src = {};
  reps.forEach(function(rep, i) {
    var code = rep.getResponseCode();
    if (code === 404 && EUC_SUIVI2_FACULTATIVES_[cles[i]]) { src[cles[i]] = []; return; }
    if (code !== 200) throw new Error('Lecture Grist impossible : ' + EUC_SUIVI2_TABLES_[cles[i]] + ' (' + code + ').');
    src[cles[i]] = JSON.parse(rep.getContentText()).records || [];
  });
  return src;
}

function EUC_SUIVI2_aujourdhui_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyy-MM-dd');
}

/* Modèle de l'année, exact à la dernière modification du document. */
function EUC_SUIVI2_modele_(annee) {
  var aujourdhui = EUC_SUIVI2_aujourdhui_();
  annee = EUC_SUIVI2_t_(annee) || EUC_SUIVI2_anneeCourante_(aujourdhui);
  var temoin = EUC_SUIVI2_temoin_();
  var cle = 'EUC_SUIVI2_' + annee.replace(/\D/g, '') + '_' + temoin.replace(/[^\w-]/g, '') + '_' + aujourdhui.replace(/-/g, '');
  var m = typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (m && m.version === EUC_SUIVI2_VERSION_) { m.depuisCache = true; return m; }
  var t = Date.now();
  m = EUC_SUIVI2_calculer_(EUC_SUIVI2_lireSources_(), annee, aujourdhui);
  m.temoin = temoin; m.calculMs = Date.now() - t;
  if (typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, m);
  return m;
}
