/**
 * DEV577 — Consultation des apprentis (apprentis.loucodi.fr) sur le modèle du
 * nouveau suivi : une seule requête, tout le bilan de l'année calculé une fois
 * et mis en cache par témoin de modification Grist (et par réglages de quotas,
 * classes actives et modes classe entière / mixité, rangés dans les propriétés
 * du script). La navigation se fait ensuite dans le navigateur. Lecture seule.
 *
 * Circuit d'un dossier (définitions validées avec le DDFPT) :
 *   distribué → rapporté signé (entreprise trouvée) → transmis au CFA →
 *   contrat validé → apprenti. « Potentiel » = distribué, pas encore rapporté ;
 *   « futur » = rapporté (ou transmis, ou contrat saisi) mais contrat pas encore
 *   commencé. Un apprenti n'est plus compté potentiel ni futur ; la date de
 *   distribution reste conservée dans sa fiche.
 */
var EUC_DEV577_VERSION_ = '1.0.0-dev.577a';
var EUC_DEV577_CATEGORIES_ = ['apprentis', 'futurs', 'potentiels', 'distribues', 'rapportes', 'transmisCfa', 'contratsValides', 'ruptures'];

function EUC_DEV577_t_(v) { return String(v == null ? '' : v).trim(); }

/* Étape d'un élève dans le circuit, à partir de sa dernière fiche d'apprentissage. */
function EUC_DEV577_etat_(row, printDate, now) {
  var f = EUC_DEV538_fields_(row), P = EUC_DEV538_pick_, D = EUC_DEV538_date_;
  var rupture = D(P(f, ['Date_rupture_contrat', 'Date_rupture'])), contrat = D(P(f, ['Date_contrat_officielle', 'Date_contrat']));
  var debut = D(P(f, ['Date_debut', 'Debut'])) || contrat, fin = D(P(f, ['Date_fin', 'Fin']));
  var rompu = !!rupture && rupture.getTime() <= now.getTime();
  var valide = !!contrat && !!debut && !!fin && !rompu;
  var enCours = !rompu && (EUC_DEV538_bool_(f.Actif) || valide) && !!debut && debut.getTime() <= now.getTime() && (!fin || fin.getTime() >= now.getTime());
  var distribution = D(P(f, ['Date_distribution_dossier'])) || printDate || null;
  var remise = D(P(f, ['Date_remise_dossier', 'Date_dossier']));
  var cfaDate = D(f.Date_transmission_CFA);
  var distribue = EUC_DEV538_bool_(f.Dossier_distribue) || !!distribution;
  var rapporte = EUC_DEV538_bool_(f.Dossier_remis) || !!remise;
  var cfa = EUC_DEV538_bool_(f.Dossier_transmis_CFA) || !!cfaDate;
  var futur = !rompu && !enCours && (rapporte || cfa || !!contrat || !!debut);
  var potentiel = !rompu && !enCours && !futur && distribue;
  var iso = EUC_DEV538_iso_;
  return {
    apprenti: enCours, futur: futur, potentiel: potentiel, distribue: distribue, rapporte: rapporte, cfa: cfa, valide: valide, rompu: rompu,
    dates: { distribution: iso(distribution), remise: iso(remise), cfa: iso(cfaDate), contrat: iso(contrat), debut: iso(debut), fin: iso(fin), rupture: iso(rupture) }
  };
}

/* Fiche entreprise / responsable / tuteur d'un dossier d'apprentissage. */
function EUC_DEV577_fiche_(row) {
  var f = EUC_DEV538_fields_(row), P = function(k) { return EUC_DEV577_t_(EUC_DEV538_pick_(f, k)); };
  return {
    entreprise: P(['Nom_entreprise', 'Raison_sociale', 'Entreprise']), enseigne: P(['Nom_commercial']),
    siret: P(['SIRET', 'Numero_SIRET']).replace(/\D/g, ''),
    adresse: [P(['Adresse_entreprise', 'Adresse', 'Adresse_postale']), [P(['Code_postal']), P(['Ville', 'Commune'])].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    responsable: { nom: [P(['Responsable_prenom']), P(['Responsable_nom', 'Responsable'])].filter(Boolean).join(' '), tel: P(['Responsable_telephone', 'Entreprise_telephone', 'Telephone_entreprise']), mail: P(['Responsable_courriel', 'Entreprise_courriel', 'Courriel_entreprise']) },
    tuteur: { nom: [P(['Tuteur_prenom']), P(['Tuteur_nom', 'Tuteur'])].filter(Boolean).join(' '), tel: P(['Tuteur_telephone', 'Telephone_tuteur']), mail: P(['Tuteur_courriel', 'Courriel_tuteur']) },
    nouveauContrat: EUC_DEV538_bool_(f.Nouveau_contrat)
  };
}

function EUC_DEV577_calcul_(annee) {
  var now = new Date(), classes = EUC_DEV541_apprentissageClasses_(annee), classById = {}, classByName = {};
  classes.forEach(function(c) { classById[c.id] = c; classByName[EUC_DEV538_norm_(c.classe)] = c; });
  var yearsById = EUC_DEV538_schoolYearMap_(), eleves = [];
  EUC_DEV538_records_('EUC_ELEVES_PFMP', {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r), id = EUC_DEV538_n_(r.id || f.id);
    if (!id || !EUC_DEV543_studentPresent_(f, now) || EUC_DEV538_studentYear_(f, yearsById) !== annee) return;
    var cid = EUC_DEV538_ref_(f.Classe), label = EUC_DEV577_t_(f.Code_classe_importe || f.Classe_nom || f.Classe_snapshot), cl = classById[cid] || classByName[EUC_DEV538_norm_(label)];
    if (!cl) return;
    eleves.push({ id: id, nom: [EUC_DEV577_t_(f.Nom), EUC_DEV577_t_(f.Prenom_usage || f.Prenom)].filter(Boolean).join(' '), classeId: cl.id });
  });
  var dernier = EUC_DEV538_latestByStudent_(EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP', {}), annee);
  var impressions = EUC_DEV538_distributionByStudent_(EUC_DEV538_optionalRecords_('EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS', {}), annee);
  var diplomes = EUC_DEV538_diplomas_(), quotas = EUC_DEV538_quotaConfig_()[annee] || {}, actives = EUC_DEV542_activeClassesConfig_(), modes = EUC_DEV545_classModesConfig_();
  var lignes = {}, cartes = {};
  classes.forEach(function(c) {
    var l = lignes[c.id] = { classeId: c.id, classe: c.classe, famille: c.famille, niveau: c.niveau, diplome: EUC_DEV564_diplomaForClass_(c, diplomes[c.id]),
      active: EUC_DEV542_classActive_(actives, annee, c.id), mode: EUC_DEV545_classMode_(modes, annee, c.id, c.classe, c.etablissement), organismes: typeof EUC_DEV579_profil_ === 'function' ? EUC_DEV579_profil_(EUC_DEV579_profilsConfig_(), annee, c.id, c.classe, c.etablissement, 'MIXITE').organismes : [], effectif: 0, quotaPourcent: EUC_DEV538_n_(quotas[c.id]), quota: 0, noms: {} };
    EUC_DEV577_CATEGORIES_.forEach(function(k) { l.noms[k] = []; });
  });
  eleves.sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).forEach(function(e) {
    var l = lignes[e.classeId]; if (!l) return;
    l.effectif++;
    var row = dernier[e.id]; if (!row && !impressions[e.id]) return;
    var s = EUC_DEV577_etat_(row, impressions[e.id], now);
    if (s.apprenti) l.noms.apprentis.push(e.nom);
    if (s.futur) l.noms.futurs.push(e.nom);
    if (s.potentiel) l.noms.potentiels.push(e.nom);
    if (s.distribue) l.noms.distribues.push(e.nom);
    if (s.rapporte) l.noms.rapportes.push(e.nom);
    if (s.cfa) l.noms.transmisCfa.push(e.nom);
    if (s.valide) l.noms.contratsValides.push(e.nom);
    if (s.rompu) l.noms.ruptures.push(e.nom);
    if (s.apprenti || s.futur || s.potentiel || s.rompu) {
      (cartes[e.classeId] = cartes[e.classeId] || []).push({ eleve: e.nom, statut: s.apprenti ? 'APPRENTI' : s.futur ? 'FUTUR' : s.potentiel ? 'POTENTIEL' : 'RUPTURE',
        dates: s.dates, etapes: { distribue: s.distribue, rapporte: s.rapporte, cfa: s.cfa, valide: s.valide }, fiche: row ? EUC_DEV577_fiche_(row) : null });
    }
  });
  var groupes = {}, totaux = { effectif: 0, quota: 0, classeEntiere: [], mixite: [] };
  EUC_DEV577_CATEGORIES_.forEach(function(k) { totaux[k] = []; });
  Object.keys(lignes).forEach(function(k) {
    var l = lignes[k]; l.quota = Math.round(l.effectif * l.quotaPourcent / 100);
    if (!l.active) return;
    (groupes[l.diplome] = groupes[l.diplome] || { diplome: l.diplome, famille: l.famille, lignes: [] }).lignes.push(l);
    totaux.effectif += l.effectif; totaux.quota += l.quota;
    EUC_DEV577_CATEGORIES_.forEach(function(c) { l.noms[c].forEach(function(n) { totaux[c].push({ nom: n, classe: l.classe }); }); });
    l.noms.apprentis.forEach(function(n) { totaux[l.mode === 'CLASSE_ENTIERE' ? 'classeEntiere' : 'mixite'].push({ nom: n, classe: l.classe }); });
  });
  var liste = Object.keys(groupes).map(function(k) {
    groupes[k].lignes.sort(function(a, b) { return String(a.niveau).localeCompare(String(b.niveau), 'fr') || a.classe.localeCompare(b.classe, 'fr'); });
    return groupes[k];
  }).sort(function(a, b) { return String(a.famille).localeCompare(String(b.famille)) || a.diplome.localeCompare(b.diplome, 'fr'); });
  return { version: EUC_DEV577_VERSION_, annee: annee, calculeLe: now.toISOString(), totaux: totaux, groupes: liste, cartes: cartes };
}

function EUC_DEV577_modele_(annee) {
  annee = EUC_DEV577_t_(annee) || EUC_DEV368_year('');
  var temoin = '';
  try { temoin = EUC_SUIVI2_temoin_(); } catch (e) { temoin = ''; }
  /* Les quotas, classes actives et modes sont dans les propriétés du script :
   * leur empreinte entre dans la clé, un changement de réglage recalcule. */
  var reglages = '';
  try { reglages = EUC_DEV441_digest_(JSON.stringify([EUC_DEV538_quotaConfig_()[annee] || {}, EUC_DEV542_activeClassesConfig_(), EUC_DEV545_classModesConfig_(), typeof EUC_DEV579_profilsConfig_ === 'function' ? EUC_DEV579_profilsConfig_() : {}])).slice(0, 12); } catch (e2) {}
  var jour = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Paris', 'yyyyMMdd');
  var cle = 'EUC_DEV577_' + annee.replace(/\D/g, '') + '_' + String(temoin).replace(/[^\w-]/g, '') + '_' + reglages.replace(/[^\w-]/g, '') + '_' + jour;
  var m = temoin && typeof EUC_DEV572_lire_ === 'function' ? EUC_DEV572_lire_(cle) : null;
  if (m && m.version === EUC_DEV577_VERSION_) return m;
  m = EUC_DEV577_calcul_(annee);
  m.temoin = String(temoin).split('-')[0];
  if (temoin && typeof EUC_DEV572_ecrire_ === 'function') EUC_DEV572_ecrire_(cle, m);
  return m;
}

function EUC_DEV577_pageApprentis_(e) {
  var p = (e && e.parameter) || {}, t = HtmlService.createTemplateFromFile('Suivi_Apprentis_DEV577'), vue;
  try { vue = EUC_DEV577_modele_(EUC_DEV577_t_(p.annee)); } catch (err) { vue = { erreur: String(err && err.message || err), groupes: [], cartes: {}, totaux: {} }; }
  var admin = false;
  try { var ctx = typeof EUC_PFMP_contexteAdmin_ === 'function' ? EUC_PFMP_contexteAdmin_() : null; admin = !!(ctx && ctx.autorise); } catch (e2) {}
  t.donnees = JSON.stringify(vue).replace(/</g, '\\u003c');
  t.config = JSON.stringify({ base: typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '', wrapper: EUC_DEV577_t_(p.wrapper) === '1', admin: admin }).replace(/</g, '\\u003c');
  return t.evaluate().setTitle('Suivi des apprentis').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Témoin pour l'alerte « données modifiées » de la page ouverte. */
function EUC_DEV577_temoinActuel() { return { temoin: String(EUC_SUIVI2_temoin_()).split('-')[0] }; }
