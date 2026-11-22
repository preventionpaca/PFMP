/**
 * DEV698 — Statistiques PFMP (vignette « Statistiques » de l'accueil d'administration). Lecture seule.
 *
 * Une ligne par convention de l'année (conventions de l'administration, dépôts en ligne, conventions interrompues
 * ou annulées comprises), sans nom d'élève : identifiant d'élève, classe, diplôme, période, entreprise (même règle
 * que « Élèves par entreprise » : SIRET, NIS de Monaco à la lettre près, sinon nom + commune), dates et déroulement.
 * Les apprentis de l'année (contrat en cours) sont ajoutés avec leur entreprise. Les regroupements, filtres et
 * comparaisons entre années se font dans la page.
 */
var EUC_DEV698_VERSION_ = '1.0.0-dev.715';

function EUC_DEV698_t_(v) { return v == null ? '' : String(v).trim(); }

/* Date en 'AAAA-MM-JJ' (calcul pur) : secondes Grist, millisecondes, ISO, ou JJ/MM/AAAA. */
function EUC_DEV698_date_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) { var n = Number(v); var d = new Date(n < 1e11 ? n * 1000 : n); return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }
  var s = EUC_DEV698_t_(v), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
/* Écart en jours b - a (calcul pur), 0 si une date manque. */
function EUC_DEV698_jours_(a, b) {
  if (!a || !b) return 0;
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
}
/* DEV700 : nom d'un organisme de formation (calcul pur). */
function EUC_DEV698_organisme_(nom) {
  var n = ' ' + EUC_DEV698_t_(nom).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ') + ' ';
  return /\s(AFPI|CFAI|CFA|GRETA|UIMM|POLE FORMATION)\s/.test(n);
}
/* Cause d'une interruption d'après le motif saisi (calcul pur). */
function EUC_DEV698_cause_(motif) {
  var m = EUC_DEV698_t_(motif).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!m) return 'NON_PRECISE';
  if (/ferm|liquidation|faillite|cessation|redressement|demenag|plus d.activit|manque d.activit|plus de travail|chomage|entreprise .*(arret|stop)/.test(m)) return 'ENTREPRISE';
  if (/sante|malad|accident|medic|hospital|bless|enceinte|grossesse/.test(m)) return 'SANTE';
  if (/renvo|exclu|vire|comportement|absen|abandon|retard|faute|disciplin|attitude|insolen|vol\b|conflit|ne vient plus|n.est plus venu|mis fin|congedi/.test(m)) return 'ELEVE';
  return 'AUTRE';
}
function EUC_DEV698_sequence_(a) {
  var s = EUC_DEV698_t_(a.Type_sequence).toUpperCase();
  return s === 'RATTRAPAGE' ? 'RATTRAPAGE' : /REMPLACEMENT/.test(s) || EUC_DEV698_t_(a.Scenario_dates).toUpperCase() === 'REMPLACEMENT_APRES_RUPTURE' ? 'REMPLACEMENT' : 'INITIALE';
}
function EUC_DEV698_statut_(a) {
  var s = EUC_DEV698_t_(a.Statut_administratif).toUpperCase();
  return s === 'INTERROMPUE' ? 'INTERROMPUE' : s === 'ANNULEE' ? 'ANNULEE' : 'EN_COURS';
}

/* Classes de l'année : famille (CAP, BACPRO, BTS…), diplôme et dates officielles des périodes. */
function EUC_DEV698_classes_(annee) {
  var parId = {}, parNom = {}, periodes = {}, diplomes = {};
  try { diplomes = typeof EUC_DEV538_diplomas_ === 'function' ? EUC_DEV538_diplomas_() : {}; } catch (eD) { diplomes = {}; }
  var cat = { classes: [] };
  try { cat = EUC_DEV368_catalog(annee) || cat; } catch (eC) {}
  (cat.classes || []).forEach(function(c) {
    var cid = Number(c.classeId) || 0, dip = '';
    try { dip = typeof EUC_DEV564_diplomaForClass_ === 'function' ? EUC_DEV564_diplomaForClass_({ id: cid, classe: c.classe, famille: c.famille }, diplomes[cid]) : ''; } catch (eDip) { dip = ''; }
    var x = { cid: cid, classe: EUC_DEV698_t_(c.classe), famille: EUC_DEV698_t_(c.famille).toUpperCase(), diplome: EUC_DEV698_t_(dip) || EUC_DEV698_t_(c.famille),
      periodes: (c.periodes || []).map(function(p) { return { id: Number(p.id) || 0, libelle: EUC_DEV698_t_(p.libelle), debut: EUC_DEV698_date_(p.debut), fin: EUC_DEV698_date_(p.fin) }; }) };
    parId[cid] = x; parNom[x.classe.toUpperCase()] = x;
    (c.periodes || []).forEach(function(p) { periodes[Number(p.id) || 0] = { debut: EUC_DEV698_date_(p.debut), fin: EUC_DEV698_date_(p.fin), libelle: EUC_DEV698_t_(p.libelle) }; });
  });
  return { parId: parId, parNom: parNom, periodes: periodes };
}

/* Ligne de statistiques d'une convention (calcul pur). */
function EUC_DEV698_ligne_(a, base, ident, cl, periodes) {
  var T = EUC_DEV698_t_, x = cl || {}, p = base.periodeId ? { debut: base.periodeDebut, fin: base.periodeFin, libelle: base.periode } : periodes[Number(EUC_PFMP_ref_(a.Periode)) || 0] || {};
  /* DEV715 : un dépôt en ligne n'a pas de champ Date_debut : dates du dépôt relues par le parcours (base), sinon celles de la période. */
  var debut = EUC_DEV698_date_(a.Date_debut) || EUC_DEV698_date_(base.debut), fin = EUC_DEV698_date_(a.Date_fin) || EUC_DEV698_date_(base.fin);
  var offDebut = EUC_DEV698_date_(a.Date_officielle_debut) || p.debut || '', offFin = EUC_DEV698_date_(a.Date_officielle_fin) || p.fin || '';
  if (!debut) debut = EUC_DEV698_date_(offDebut); if (!fin) fin = EUC_DEV698_date_(offFin);
  var statut = base.source === 'SOUMISSION' ? 'EN_COURS' : EUC_DEV698_statut_(a), seq = base.source === 'SOUMISSION' ? 'INITIALE' : EUC_DEV698_sequence_(a);
  var finReelle = EUC_DEV698_date_(a.Date_fin_reelle);
  return {
    id: String(base.id), src: base.source === 'SOUMISSION' ? 'S' : 'C', e: Number(base.eleveId) || 0, eleve: T(base.eleve), numero: T(base.numero),
    classe: T(base.classe) || x.classe || '', famille: x.famille || '', diplome: x.diplome || '', niveau: T(base.niveauLibelle), periode: T(base.periode) || p.libelle || '',
    k: ident ? ident.entreprise : '', nom: T(base.entreprise) || (ident && ident.enseigne) || '', identifiant: ident ? ident.identifiant : '', commune: ident ? T(ident.commune) : '', cp: ident ? T(ident.cp) : '', nn: EUC_DEV688_norm_(T(base.entreprise) || (ident && ident.enseigne) || ''),
    statut: statut, sequence: seq, debut: debut, fin: fin, finReelle: finReelle, debutOfficiel: offDebut, finOfficiel: offFin,
    decalage: base.source === 'SOUMISSION' ? 0 : Math.max(0, EUC_DEV698_jours_(offDebut, debut)),
    prolongation: base.source === 'SOUMISSION' ? 0 : Math.max(0, EUC_DEV698_jours_(offFin, fin)),
    cause: statut === 'INTERROMPUE' ? EUC_DEV698_cause_(a.Motif_interruption) : '', motif: statut === 'INTERROMPUE' ? T(a.Motif_interruption).slice(0, 300) : statut === 'ANNULEE' ? T(a.Motif_annulation).slice(0, 300) : ''
  };
}

/* DEV710 : professeurs affectés (suivi téléphonique, visite) par élève et période, dernière affectation active. Lecture seule. */
function EUC_DEV698_affectations_(annee) {
  var T = EUC_DEV698_t_, out = {}, rangs = {};
  try {
    (EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP') || []).forEach(function(r) {
      if (r.Actif === false || (annee && T(r.Annee_scolaire) !== annee)) return;
      var ty = T(r.Type_suivi).toUpperCase(), type = ty.indexOf('TELEPHONE') >= 0 ? 'pt' : ty.indexOf('VISITE') >= 0 ? 'pv' : '';
      var e = Number(EUC_PFMP_ref_(r.Eleve)) || 0, p = Number(EUC_PFMP_ref_(r.Periode)) || 0, nom = T(r.Nom_professeur_snapshot);
      if (!type || !e || !p) return;
      var k = e + '|' + p + '|' + type;
      if (rangs[k] && rangs[k] > (Number(r.id) || 0)) return;
      rangs[k] = Number(r.id) || 0; out[k] = nom;
    });
  } catch (eA) {}
  return out;
}

/* Calcul d'une année : conventions (y compris interrompues et annulées) et apprentis. */
function EUC_DEV698_calcul_(annee) {
  var T = EUC_DEV698_t_, cls = EUC_DEV698_classes_(annee), fiches = EUC_DEV689_fiches_(), lignes = [], vus = {};
  /* DEV700 : classe de la convention, sinon classe de l'élève (dépôts), sinon par le nom. */
  var classeDe = function(base, a) { return cls.parId[Number(EUC_PFMP_ref_(a.Classe_convention)) || 0] || cls.parId[Number(base.classeId) || 0] || cls.parNom[T(base.classe).toUpperCase().replace(/\s+/g, ' ')] || null; };
  /* DEV701 : élève ou classe d'essai (« TEST PFMP », Donnee_test) : jamais dans les statistiques. */
  var essai = function(e, classe) { return (e && (e.Donnee_test === true || /^RECETTE/i.test(T(e.Mode_donnee)))) || /^TEST\b/i.test(T(classe)); };
  var aff = EUC_DEV698_affectations_(annee), profs = function(l, base, a) { var e = Number(base.eleveId) || 0, ps = [Number(base.periodeId) || 0, Number(EUC_PFMP_ref_(a.Periode)) || 0]; ['pt', 'pv'].forEach(function(t) { for (var i = 0; i < ps.length; i++) if (ps[i] && aff[e + '|' + ps[i] + '|' + t]) { l[t] = aff[e + '|' + ps[i] + '|' + t]; return; } l[t] = ''; }); return l; };
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    vus[String(base.id)] = true;
    if (essai(e, base.classe)) return;
    lignes.push(profs(EUC_DEV698_ligne_(a, base, EUC_DEV689_ident_(a, fiches), classeDe(base, a), cls.periodes), base, a));
  });
  /* Conventions interrompues ou annulées (révoquées, donc absentes du parcours ordinaire). */
  var byEleve = {};
  try { (EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP') || []).forEach(function(e) { byEleve[Number(e.id)] = e; }); } catch (eE) {}
  (EUC_CONVENTION_lireAccesFraisV108_() || []).forEach(function(a) {
    var st = EUC_DEV698_statut_(a);
    if (st === 'EN_COURS' || vus[String(Number(a.id))]) return;
    if (!EUC_ADMIN_WORKFLOW_estDossierVisibleV522_(a)) return;
    if (annee && EUC_PFMP_anneeDossierV148_(a) !== annee) return;
    if (a.Supprimee_admin === true || T(a.Statut_administratif).toUpperCase() === 'SUPPRIMEE_ADMIN') return;
    if (essai(byEleve[Number(EUC_PFMP_ref_(a.Eleve))], a.Classe_convention_nom)) return;
    var id = EUC_ADMIN_WORKFLOW_identiteEleveV521_(a, byEleve), x = cls.parId[Number(EUC_PFMP_ref_(a.Classe_convention)) || 0] || cls.parId[Number(EUC_PFMP_ref_((byEleve[Number(id.id)] || {}).Classe)) || 0] || {};
    var base = { id: Number(a.id), source: 'CONVENTION', eleveId: Number(id.id) || 0, eleve: id.jeune || [id.prenom, id.nom].filter(Boolean).join(' '), numero: EUC_ADMIN_WORKFLOW_numeroV144_(a), classeId: Number(EUC_PFMP_ref_((byEleve[Number(id.id)] || {}).Classe)) || 0, classe: T(a.Classe_convention_nom) || T((byEleve[Number(id.id)] || {}).Code_classe_importe), niveauLibelle: '', periode: T(a.Periode_libelle), entreprise: T(a.Entreprise_raison_sociale) };
    try { var nv = EUC_DEV371_levelOf_(x.classe || base.classe, x.famille); base.niveauLibelle = EUC_DEV371_levelLabel_(nv) || nv; } catch (eN) {}
    /* DEV699 : même rattachement à la période officielle que les autres conventions. */
    var d1 = EUC_DEV698_date_(a.Date_debut), d2 = EUC_DEV698_date_(a.Date_fin_reelle || a.Date_fin);
    if (typeof EUC_DEV688_periodeOfficielle_ === 'function') EUC_DEV688_dates_(base, EUC_DEV688_periodeOfficielle_((x.cid ? x : classeDe(base, a) || {}).periodes, EUC_PFMP_ref_(a.Periode), d1, d2, a.Periode_libelle), d1, d2, a.Periode_libelle);
    lignes.push(profs(EUC_DEV698_ligne_(a, base, EUC_DEV689_ident_(a, fiches), x.cid ? x : classeDe(base, a), cls.periodes), base, a));
  });
  var apprentis = [];
  try {
    var m = EUC_DEV577_modele_(annee), parClasse = {}, etabs = {};
    /* DEV700 : établissement de rattachement (LP, LGT) de chaque classe d'apprentis. */
    try { (typeof EUC_DEV579_classesCompletes_ === 'function' ? EUC_DEV579_classesCompletes_(annee) : []).forEach(function(c) { etabs[String(c.id)] = typeof EUC_DEV544_establishment_ === 'function' ? EUC_DEV544_establishment_(c) : T(c.etablissement); }); } catch (eEt) {}
    /* DEV704 : niveau des apprentis (même libellé que les stagiaires : Première, Terminale, 2e année…). */
    var niveauDe = function(classe, famille) { try { var nv = EUC_DEV371_levelOf_(classe, famille); return T(EUC_DEV371_levelLabel_(nv) || nv); } catch (eNv) { return ''; } };
    (m.groupes || []).forEach(function(g) { (g.lignes || []).forEach(function(l) { parClasse[l.classeId] = l; }); });
    Object.keys(m.cartes || {}).forEach(function(cid) {
      var l = parClasse[cid] || {}, x = cls.parId[Number(cid)] || {};
      (m.cartes[cid] || []).forEach(function(c) {
        if (c.statut !== 'APPRENTI' || !c.fiche) return;
        var siret = T(c.fiche.siret).replace(/\D/g, ''), nom = T(c.fiche.entreprise) || T(c.fiche.enseigne), mcp = T(c.fiche.adresse).match(/\b(\d{5})\s+([^,]+)$/) || [], commune = mcp[2] || '';
        /* DEV699 : apprenti sans entreprise connue : compté comme apprenti, jamais comme une entreprise sans nom. */
        /* DEV700 : organisme de formation inscrit comme employeur (AFPI pour les CQPM, CFA, GRETA…) : pas une entreprise. */
        var organisme = EUC_DEV698_organisme_(nom), connue = !organisme && (siret.length === 14 || !!EUC_DEV688_norm_(nom));
        apprentis.push({ k: !connue ? '' : siret.length === 14 ? 'S' + siret : 'N' + EUC_DEV688_norm_(nom) + '|' + EUC_DEV688_norm_(commune), nn: EUC_DEV688_norm_(nom), nom: nom, commune: T(commune), cp: mcp[1] || '', identifiant: siret.length === 14 ? 'SIRET ' + siret : '',
          classe: T(l.classe) || x.classe || '', famille: T(l.famille).toUpperCase() || x.famille || '', diplome: T(l.diplome) || x.diplome || '',
          niveau: niveauDe(T(l.classe) || x.classe || '', T(l.famille).toUpperCase() || x.famille || ''),
          eleve: T(c.eleve), organisme: organisme ? nom : '', debut: T(c.dates && c.dates.debut), fin: T(c.dates && (c.dates.rupture || c.dates.fin)),
          etablissement: etabs[String(cid)] || '', mode: T(l.mode), gestionnaire: T(l.gestionnaire), donneur: T(l.donneur) });
      });
    });
  } catch (eApp) { apprentis = []; }
  /* DEV701 : classe d'essai reconnue aussi par le nom de classe final (catalogue), pas seulement le nom saisi. */
  var pasEssai = function(l) { return !/^TEST\b/i.test(T(l.classe)); };
  /* DEV702 : 1TSMV / 2TSMV comptées avec 1BTS MV / 2BTS MV. */
  lignes.concat(apprentis).forEach(function(l) { l.classe = EUC_DEV688_classe_(l.classe); });
  return { version: EUC_DEV698_VERSION_, annee: annee, calculeLe: new Date().toISOString(), conventions: lignes.filter(pasEssai), apprentis: apprentis.filter(pasEssai) };
}

function EUC_DEV698_annee(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = EUC_DEV698_t_(q.annee);
  if (!/^20\d{2}-20\d{2}$/.test(annee)) throw new Error('Année scolaire invalide.');
  var temoin = '';
  try { temoin = String(EUC_SUIVI2_temoin_()).replace(/[^\w-]/g, ''); } catch (e) { temoin = ''; }
  var cle = 'EUC_DEV698_' + annee.replace(/\D/g, '') + '_' + temoin;
  var m = temoin && typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (m && m.version === EUC_DEV698_VERSION_) return m;
  m = EUC_DEV698_calcul_(annee);
  if (temoin && typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, m);
  return m;
}

function EUC_DEV698_annees() {
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var b = {};
  try { b = EUC_DEV368_boot() || {}; } catch (e) { b = {}; }
  var l = (b.years || []).map(EUC_DEV698_t_).filter(function(y, i, a) { return /^20\d{2}-20\d{2}$/.test(y) && a.indexOf(y) === i; });
  var active = EUC_DEV698_t_(b.current) || l.slice().sort()[0] || '';
  /* Années à comparer : l'année en cours et les cinq précédentes (jamais les années futures, sans convention). */
  if (/^20\d{2}-20\d{2}$/.test(active)) for (var i = 1; i <= 5; i++) { var d = Number(active.slice(0, 4)) - i, y = d + '-' + (d + 1); if (l.indexOf(y) < 0) l.push(y); }
  l = l.filter(function(y) { return !active || y <= active; }).sort().reverse();
  return { annees: l, active: active };
}

function EUC_DEV698_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Statistiques_PFMP_DEV698');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Statistiques PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
