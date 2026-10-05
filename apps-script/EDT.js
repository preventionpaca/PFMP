/**
 * EDT V1 Option B - WebApp consultation iframe
 * A deployer comme application web Apps Script.
 * Acces conseille : utilisateurs de votre domaine / selon votre contexte.
 */

// CONFIG est defini dans Install_EDT.gs.

function doGet(e) {
  // DEV455 : route de détail ciblée, sans lecture de toute la table snapshot.
  var __d455=typeof EUC_DEV455_routeDetail_==='function'?EUC_DEV455_routeDetail_(e):null;
  if(__d455)return __d455;
  // EUC_DEV453_PUBLIC_NAV_BEGIN
  var __p453=String(e&&e.parameter&&e.parameter.page||'');
  if(__p453==='suivi-conventions-public-famille'){
    return EUC_DEV453_publicFamily(e);
  }
  if(__p453==='suivi-pfmp-classe-public'){
    return EUC_DEV453_publicDetail(e);
  }
  // EUC_DEV453_PUBLIC_NAV_END

  // EUC_DEV441_PP_GEO_ROUTES_BEGIN
  var __p441=String(e&&e.parameter&&e.parameter.page||'');
  if(__p441==='acces-pp-admin') return EUC_DEV441_afficherPpAdmin(e);
  if(__p441==='acces-pp-pfmp') return EUC_DEV441_afficherPp(e);
  if(__p441==='geocodage-pfmp-admin') return EUC_DEV441_afficherGeoAdmin(e);
  if(__p441==='cartographie-pfmp') return EUC_DEV441_afficherCarte(e);
  // EUC_DEV441_PP_GEO_ROUTES_END

  // EUC_DEV415_PRIORITY_BEGIN
  var __p415=String(
    e&&e.parameter&&e.parameter.page||''
  );
  if(__p415==='suivi-pfmp-classe-public'){
    return EUC_DEV415_publicDetail(e);
  }
  // EUC_DEV415_PRIORITY_END

  // EUC_DEV401_DETAIL_ROUTE
  var __dev401Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__dev401Page==='suivi-pfmp-classe') return EUC_DEV401_adminDetail(e);

  // EUC_DEV397_PREWARM_ROUTE
  var __dev397Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__dev397Page==='perf-prewarm-pfmp') return EUC_DEV397_afficherPrewarm(e);


  // EUC_DEV394_RUNTIME_ROUTE
  var __dev394Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__dev394Page==='perf-runtime-pfmp') return EUC_DEV394_afficher(e);


  // EUC_DEV368_ADMIN_TOOLS_BEGIN
  var __p368=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__p368==='sans-convention-pfmp') return EUC_DEV368_afficherSans(e);
  if(__p368==='ordres-mission-pfmp') return EUC_DEV368_afficherMissions(e);
  // EUC_DEV368_ADMIN_TOOLS_END

  // EUC_DEV356_DETAIL_PRIORITY_BEGIN
  var __d354=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d354==='suivi-pfmp-classe') return EUC_DEV356_adminDetail(e);
  if(__d354==='suivi-pfmp-classe-public') return EUC_DEV356_publicDetail(e);
  // EUC_DEV356_DETAIL_PRIORITY_END

  // EUC_DEV353_PUBLIC_PRIORITY_BEGIN
  var __p353=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__p353==='apprentissage-public-pfmp') return EUC_DEV353_publicApprentis(e);
  if(__p353==='suivi-conventions-public') return EUC_DEV353_publicSummary(e);
  if(__p353==='suivi-conventions-public-famille') return EUC_DEV353_publicFamily(e);
  if(__p353==='suivi-pfmp-classe-public') return EUC_DEV353_publicDetail(e);
  // EUC_DEV353_PUBLIC_PRIORITY_END

  // EUC_DEV352_PUBLIC_PRIORITY_BEGIN
  var __p352=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__p352==='suivi-conventions-public') return EUC_DEV352_publicSummary(e);
  if(__p352==='suivi-conventions-public-famille') return EUC_DEV352_publicFamily(e);
  if(__p352==='suivi-pfmp-classe-public') return EUC_DEV352_publicDetail(e);
  if(__p352==='apprentissage-public-pfmp') return EUC_DEV352_publicApprentis(e);
  // EUC_DEV352_PUBLIC_PRIORITY_END

  // EUC_DEV351_PRIORITY_BEGIN
  var __d349Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d349Page==='suivi-conventions-public') return EUC_DEV348_publicSummary(e);
  if(__d349Page==='suivi-conventions-public-famille') return EUC_DEV348_publicFamily(e);
  if(__d349Page==='suivi-pfmp-classe-public') return EUC_DEV348_publicDetail(e);
  if(__d349Page==='apprentissage-public-pfmp') return EUC_DEV348_publicApprentis(e);
  // EUC_DEV351_PRIORITY_END

  // EUC_DEV348_PRIORITY_BEGIN
  var __d348Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d348Page==='suivi-conventions') return EUC_DEV348_adminSummary(e);
  if(__d348Page==='suivi-conventions-public') return EUC_DEV348_publicSummary(e);
  if(__d348Page==='apprentissage-public-pfmp') return EUC_DEV348_publicApprentis(e);
  if(__d348Page==='suivi-conventions-public-famille') return EUC_DEV348_publicFamily(e);
  if(__d348Page==='suivi-pfmp-classe-public') return EUC_DEV348_publicDetail(e);
  // EUC_DEV348_PRIORITY_END

  // EUC_DEV347_PRIORITY_BEGIN
  var __d342Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d342Page==='suivi-conventions') return EUC_DEV347_adminSummary(e);
  if(__d342Page==='suivi-pfmp-classe') return EUC_DEV347_adminDetail(e);
  if(__d342Page==='suivi-conventions-public') return EUC_DEV347_publicSummary(e);
  if(__d342Page==='suivi-conventions-public-famille') return EUC_DEV347_publicFamily(e);
  if(__d342Page==='suivi-pfmp-classe-public') return EUC_DEV347_publicDetail(e);
  // EUC_DEV347_PRIORITY_END

  // EUC_DEV340_PRIORITY_BEGIN
  var __d340Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d340Page==='suivi-conventions-famille') return EUC_DEV340_afficherFamille(e);
  if(__d340Page==='suivi-pfmp-classe') return EUC_DEV340_afficherAdminClasse(e);
  // EUC_DEV340_PRIORITY_END

  // EUC_DEV338_ADMIN_PRIORITY_BEGIN
  var __d338Page=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d338Page==='admin-pfmp') return EUC_CENTRE_ADMIN_afficherApplication(e);
  if(__d338Page==='apprentissage-pfmp') return EUC_DEV338_afficherApprentis(e);
  if(__d338Page==='parcours-differencie-pfmp') return EUC_DEV338_afficherPdif(e);
  if(__d338Page==='suivi-conventions'||__d338Page==='suivi-pfmp-classes') return EUC_DEV338_afficherAccueil(e);
  if(__d338Page==='suivi-conventions-famille') return EUC_DEV339_afficherFamille(e);
  if(__d338Page==='suivi-pfmp-classe') return EUC_DEV190I_afficherAdminClasse(e);
  if(__d338Page==='snapshot-pfmp-admin') return EUC_DEV338_afficherSnapshot(e);
  // EUC_DEV338_ADMIN_PRIORITY_END

  // DEV285B_PRIORITY_PDIF
  var __d285bPage=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d285bPage==='parcours-differencie-pfmp') return EUC_DEV190X_afficherPdif(e);

  // DEV283A_PDIF_DIAG_ROUTE
  var __d283aPage=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d283aPage==='diag-pdif-tcar') return EUC_DEV283A_page(e);

  // DEV277A_DIAG_ROUTE
  var __d277aPage=(e&&e.parameter&&e.parameter.page)?String(e.parameter.page):'';
  if(__d277aPage==='diag-apprentissage-kirof') return EUC_DEV277A_page(e);

  // EUC_DEV226_AUDIT_ROUTE
  if (e && e.parameter && e.parameter.page === 'audit-apprentis-current') return EUC_DEV226_afficherAudit(e);

  // EUC_DEV209_AUDIT_ROUTE
  if (e && e.parameter && e.parameter.page === 'audit-apprentissage-chargement') return EUC_DEV209_afficherAudit(e);

  // EUC_DEV190X_PRIORITY_MODULES
  var __xPage = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';
  if (__xPage === 'audit-dev235-1mp3d') return EUC_DEV235_AUDIT_afficher(e);
  if (__xPage === 'apprentissage-public-pfmp') return EUC_DEV252_afficherApprentisPublic(e);
  if (__xPage === 'audit-bts-strict-readonly') return EUC_AUDIT_BTS_afficher(e);
  if (__xPage === 'audit-global-classes-2026-2027') return EUC_AUDIT_GLOBAL_afficher(e);
  if (__xPage === 'apprentissage-pfmp') return EUC_DEV190X_afficherApprentis(e);
  if (__xPage === 'parcours-differencie-pfmp') return EUC_DEV190X_afficherPdif(e);

  // EUC_DEV190W4_DIRECT_AUDIT
  if (
    e && e.parameter &&
    e.parameter.page === 'audit-apprentis-pdif-direct'
  ) {
    return EUC_DEV190W_afficherAudit(e);
  }


  // EUC_DEV190W1_AUDIT_ROUTE
  if (
    e &&
    e.parameter &&
    e.parameter.page === 'audit-apprentis-pdif'
  ) {
    return EUC_DEV190W_afficherAudit(e);
  }


  // EUC_DEV190W_AUDIT_ROUTE
  if (e && e.parameter && e.parameter.page === 'audit-apprentis-pdif') return EUC_DEV190W_afficherAudit(e);

  // EUC_DEV190U_PRIORITY_MODULES
  var __uPage = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';
  if (__uPage === 'parcours-differencie-pfmp') return EUC_DEV190U_afficherPdif(e);

  // EUC_DEV190O_PRIORITY_ROUTE
  var __o = EUC_DEV190O_route_(e);
  if (__o) return __o;

  // EUC_DEV190N_HARD_ROUTES
  var __nPage = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';
  if (__nPage === 'snapshot-pfmp-admin') {
    return HtmlService.createTemplateFromFile('Snapshot_PFMP_Admin_V190').evaluate().setTitle('Maintenance Snapshot PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (__nPage === 'suivi-conventions' || __nPage === 'suivi-pfmp-classes') {
    var __nCtx = EUC_PFMP_contexteAnneeLectureV155_();
    var __nYear = (e && e.parameter && e.parameter.annee) ? String(e.parameter.annee) : __nCtx.active;
    var __nT = HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_LazyV190K4');
    __nT.paramsJson = JSON.stringify({annee:__nYear});
    return __nT.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (__nPage === 'suivi-conventions-famille') {
    var __nCtxF = EUC_PFMP_contexteAnneeLectureV155_();
    var __nYearF = (e && e.parameter && e.parameter.annee) ? String(e.parameter.annee) : __nCtxF.active;
    var __nFam = (e && e.parameter && e.parameter.famille) ? String(e.parameter.famille) : 'BACPRO';
    var __nFast = EUC_DEV319_liveFamilyIndex({annee:__nYearF,famille:__nFam});
    var __nData = (__nFast && __nFast.ready && __nFast.payload) ? __nFast.payload : {ok:true,ready:false,annee:__nYearF,famille:__nFam,classes:[]};
    __nData.ready = !!(__nFast && __nFast.ready && __nFast.payload);
    var __nTF = HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
    __nTF.paramsJson = JSON.stringify({annee:__nYearF,famille:__nFam});
    __nTF.dataJson = JSON.stringify(__nData);
    return __nTF.evaluate().setTitle('Suivi des conventions - '+(__nFam==='BACPRO'?'BAC PRO':__nFam)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // EUC_DEV190M_HARD_ROUTES
  var __mPage = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';

  if (__mPage === 'snapshot-pfmp-admin') {
    return HtmlService
      .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
      .evaluate()
      .setTitle('Maintenance Snapshot PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (__mPage === 'suivi-conventions' || __mPage === 'suivi-pfmp-classes') {
    var __mCtx = EUC_PFMP_contexteAnneeLectureV155_();
    var __mAnnee = (e && e.parameter && e.parameter.annee) ? String(e.parameter.annee) : __mCtx.active;
    var __mT = HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_LazyV190K4');
    __mT.paramsJson = JSON.stringify({annee: __mAnnee});
    return __mT.evaluate()
      .setTitle('Suivi des conventions PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (__mPage === 'suivi-conventions-famille') {
    var __mCtxF = EUC_PFMP_contexteAnneeLectureV155_();
    var __mAnneeF = (e && e.parameter && e.parameter.annee) ? String(e.parameter.annee) : __mCtxF.active;
    var __mFamille = (e && e.parameter && e.parameter.famille) ? String(e.parameter.famille) : 'BACPRO';
    var __mFast = EUC_DEV319_liveFamilyIndex({annee:__mAnneeF, famille:__mFamille});
    var __mData = (__mFast && __mFast.ready && __mFast.payload) ? __mFast.payload : {ok:true,ready:false,annee:__mAnneeF,famille:__mFamille,classes:[]};
    __mData.ready = !!(__mFast && __mFast.ready && __mFast.payload);
    var __mTF = HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
    __mTF.paramsJson = JSON.stringify({annee:__mAnneeF,famille:__mFamille});
    __mTF.dataJson = JSON.stringify(__mData);
    return __mTF.evaluate()
      .setTitle('Suivi des conventions — ' + (__mFamille === 'BACPRO' ? 'BAC PRO' : __mFamille))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (__mPage === 'suivi-pfmp-classe') {
    return EUC_DEV319_afficherAdminClasseLive(e);
  }


  // EUC_DEV190L_PRIORITY_ROUTE
  var __l = EUC_DEV190L_route_(e);
  if (__l) return __l;

  // EUC_DEV190K4_PRIORITY_ROUTE
  var __k4 = EUC_DEV190K4_route_(e);
  if (__k4) return __k4;

  // EUC_DEV190K3_PRIORITY_ROUTE
  var __k3 = EUC_DEV190K3_route_(e);
  if (__k3) return __k3;

  // EUC_DEV190K2_HARD_ROUTE
  var __k2 = EUC_DEV190K2_route_(e);
  if (__k2) return __k2;

  // EUC_DEV190K_PRIORITY_ROUTER
  var __dev190kRoute = EUC_DEV190K_routePrioritaire_(e);
  if (__dev190kRoute) return __dev190kRoute;

  // EUC_DEV190J1_ROUTE_MAINTENANCE
  if (
    e &&
    e.parameter &&
    e.parameter.page === 'snapshot-pfmp-admin'
  ) {
    return HtmlService
      .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
      .evaluate()
      .setTitle('Maintenance Snapshot PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (
    e &&
    e.parameter &&
    e.parameter.page === 'suivi-pfmp-classes'
  ) {
    var target190J1 = ScriptApp.getService().getUrl() + '?page=suivi-conventions';
    return HtmlService.createHtmlOutput(
      '<script>location.replace(' + JSON.stringify(target190J1) + ');<\\/script>'
    );
  }


  // EUC_DEV190I_PRIORITY_ROUTES
  if (e && e.parameter && e.parameter.page === 'suivi-pfmp-classe-public') {
    return EUC_DEV190I_afficherPublicClasse(e);
  }
  if (e && e.parameter && e.parameter.page === 'suivi-pfmp-classe') {
    return EUC_DEV319_afficherAdminClasseLive(e);
  }


  // EUC_DEV190H2_ROUTE_AUDIT_MATRICE
  if (
    e &&
    e.parameter &&
    e.parameter.page === 'audit-matrice-pfmp'
  ) {
    return EUC_DEV190H2_afficherAuditMatrice(e);
  }


  var page = String(e && e.parameter && e.parameter.page || '').toLowerCase();

  if (page === 'suivi-pfmp-classe-public') return HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicV190C').evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  if (page === 'snapshot-pfmp-admin') return HtmlService.createTemplateFromFile('Snapshot_PFMP_Admin_V190').evaluate().setTitle('Snapshot PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  if (page === 'suivi-conventions-public') return EUC_DEV189_afficherHome(e);

  if (page === 'suivi-conventions-public-famille') return EUC_DEV189_afficherFamille(e);

  if (page === 'suivi-pfmp-classe') return EUC_DEV319_afficherAdminClasseLive(e);

  if (page === 'audit-performance-pfmp') return EUC_DEV186_afficherAudit(e);

  if (page === 'audit-classe-pfmp') return EUC_DEV186_afficherAudit(e);

  if (page === 'parcours-differencie-pfmp') return EUC_DEV174_afficherPdif(e);


  if (page === 'suivi-conventions-famille') return EUC_SUIVI_PUBLIC_afficherFamilleV51(e);

  if (page === 'suivi-conventions') return EUC_SUIVI_PUBLIC_afficherFamillesV51(e);

  if (page === 'suivi-stages') return EUC_SUIVI_PUBLIC_afficherFamillesV51(e);

  if (page === 'suivi-conventions-classes') return EUC_SUIVI_PUBLIC_afficherClassesV2(e);

  if (page === 'entreprises') return EUC_ENT_afficherApplication(e);
  if (page === 'pfmp') return EUC_PFMP_afficherApplication(e);
  if (page === 'pfmp-diagnostic') return EUC_PFMP_afficherDiagnosticReferentiel(e);
  if (page === 'suivi-pfmp') return EUC_SUIVI_afficherApplication(e);
  /* DEV268_DIAGNOSTIC_GRIST_ROUTE */
  if (page === 'dev268-diag-grist') return EUC_DEV268_afficherDiagnostic(e);
  /* DEV269_CREATE_USERS_ROUTE */
  if (page === 'dev269-create-users') return EUC_DEV269_afficherInstallation(e);
  if (page === 'admin-pfmp') return EUC_CENTRE_ADMIN_afficherApplication(e);
  if (page === 'import-pronote-pfmp') return EUC_IMPORT_afficherApplication(e);
  if (page === 'import-prof-classes-pfmp') return EUC_PC_afficherSynchronisation(e);
  if (page === 'diplomes-classes-pfmp') return EUC_PC_afficherDiplomes(e);
  if (page === 'parametres-convention-pfmp') return EUC_PARAM_CONV_afficher(e);
  if (page === 'admin-conventions-pfmp') return EUC_P7_adminConventions(e);

    if (page === 'suivi-pfmp-ent') return EUC_P7_suiviEnt(e);
  if (page === 'suivi-pfmp-ent-classe') return EUC_P7_suiviEntClasse(e);

if (page === 'suivi-pfmp-classes') return EUC_SUIVI_PUBLIC_afficherFamillesV51(e);

  if (page === 'migration-jotform-pfmp') return EUC_P7_migration(e);
  if (page === 'destinataires-envois-pfmp') return EUC_P7_destinataires(e);
  if (page === 'parametres-envois-pfmp') return EUC_P7_parametresEnvois(e);

  if (page === 'gestion-pfmp') return EUC_ADMIN_afficherApplication(e);
  if (page === 'conventions-pfmp') return EUC_P7_generateur(e);
  if (page === 'convention-pfmp-print') return EUC_P7_print(e);
  if (page === 'conventions-pfmp-batch-print') return EUC_P7_batchPrint(e);
  return EDT_afficherWebAppExistante_(e);
}

function EDT_afficherWebAppExistante_(e) {
  // EUC_DEV190W3_BEFORE_REAL_WEBAPP_FALLBACK
  var __w3Event = (typeof arguments !== 'undefined' && arguments.length) ? arguments[0] : null;
  var __w3Page = (typeof page !== 'undefined' && page != null) ? String(page) : ((__w3Event && __w3Event.parameter && __w3Event.parameter.page) ? String(__w3Event.parameter.page) : '');
  if (__w3Page === 'audit-apprentis-pdif') {
    return EUC_DEV190W_afficherAudit(__w3Event || {});
  }

  const tpl = HtmlService.createTemplateFromFile('WebApp_EDT');
  tpl.params = JSON.stringify({
    mode: (e && e.parameter && e.parameter.mode) || 'lecture',
    vue: (e && e.parameter && e.parameter.vue) || 'prof',
    semaine: (e && e.parameter && e.parameter.semaine) || '',
    ressource: (e && e.parameter && e.parameter.ressource) || ''
  });
  return tpl.evaluate()
    .setTitle('Consultation EDT')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function webappGetInitialData() {
  return {
    enseignants: stripFields_(getRecords_('Enseignants')),
    salles: stripFields_(getRecords_('Salles')),
    groupes: stripFields_(getRecords_('Groupes')),
    creneaux: stripFields_(getRecords_('Creneaux_EDT')),
    seances: safeStrip_('Seances_Generees'),
    synthHebdo: safeStrip_('Synthese_Hebdo_Enseignants'),
    synthAnnuelle: safeStrip_('Synthese_Annuelle_Enseignants'),
    params: paramsAsObject_()
  };
}

function webappGetLastUpdate() { return paramsAsObject_().LastUpdate || ''; }
function paramsAsObject_() { const rows = getRecords_('Parametres_EDT'); const out = {}; rows.forEach(r => out[r.fields.Cle] = r.fields.Valeur); return out; }
function stripFields_(records) { return records.map(r => Object.assign({ id: r.id }, r.fields)); }
function safeStrip_(tableId) { try { return stripFields_(getRecords_(tableId)); } catch (e) { return []; } }
