/** Eucalyptus PFMP — v1.0.0-dev.33 — référentiel natif Grist existant, lecture seule. */
function EUC_PFMP_refNatif_(v){return Array.isArray(v)?Number(v[0]||0):Number(v||0);}
function EUC_PFMP_txtNatif_(v){return String(v==null?'':v).trim();}
function EUC_PFMP_dateNatif_(v){if(!v)return '';if(typeof v==='number'&&isFinite(v))return new Date(v*1000).toISOString().slice(0,10);var s=String(v);var m=s.match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:s;}
function EUC_PFMP_chargerReferentielNatif(){
  EUC_ENT_controlerAccesUtilisateur_();
  EUC_ENT_controlerCibleRecette_();
  var annees=EUC_PFMP_lireTable_('Annees_Scolaires');
  var classes=EUC_PFMP_lireTable_('Classes');
  var periodes=EUC_PFMP_lireTable_('Planning_Periodes');
  var actifsAnnees=annees.filter(function(r){return r.fields.Active!==false;});
  var aById={};annees.forEach(function(r){aById[r.id]=r.fields||{};});
  var cById={};classes.forEach(function(r){cById[r.id]=r.fields||{};});
  function anneeCodeFromValue(v){var id=EUC_PFMP_refNatif_(v);if(id&&aById[id])return EUC_PFMP_txtNatif_(aById[id].Code||aById[id].Libelle);return EUC_PFMP_txtNatif_(v);}
  function classeIdFromPeriode(f){var id=EUC_PFMP_refNatif_(f.Classe);if(id&&cById[id])return id;var nom=EUC_PFMP_txtNatif_(f.Classe).toUpperCase();if(!nom)return 0;var trouve=classes.filter(function(r){var cf=r.fields||{};return [cf.Nom,cf.Libelle,cf.Code_import].some(function(x){return EUC_PFMP_txtNatif_(x).toUpperCase()===nom;});})[0];return trouve?trouve.id:0;}
  var periodsByClass={};
  periodes.forEach(function(r){var f=r.fields||{};if(f.Actif===false)return;var cid=classeIdFromPeriode(f);if(!cid)return;var code=anneeCodeFromValue(f.Annee_scolaire);var k=cid+'|'+code;if(!periodsByClass[k])periodsByClass[k]=[];periodsByClass[k].push({id:r.id,libelle:EUC_PFMP_txtNatif_(f.Type||f.Groupe||'PFMP'),debut:EUC_PFMP_dateNatif_(f.Date_debut),fin:EUC_PFMP_dateNatif_(f.Date_fin)});});
  Object.keys(periodsByClass).forEach(function(k){periodsByClass[k].sort(function(a,b){return String(a.debut).localeCompare(String(b.debut));});});
  var offres=[];
  classes.filter(function(r){return r.fields.Actif!==false;}).forEach(function(r){var f=r.fields||{};var nom=EUC_PFMP_txtNatif_(f.Nom||f.Libelle||f.Code_import);if(!nom)return;actifsAnnees.forEach(function(a){var af=a.fields||{},code=EUC_PFMP_txtNatif_(af.Code||af.Libelle),ps=periodsByClass[r.id+'|'+code]||[];if(!ps.length)return;offres.push({id:Number(String(a.id)+String(r.id).padStart(4,'0')),anneeId:a.id,classeId:r.id,classe:nom,diplomeId:null,diplome:EUC_PFMP_txtNatif_(f.Formation||f.Niveau||''),periodes:ps});});});
  return {version:'Eucalyptus PFMP — v1.0.0-dev.33',source:'NATIF',annees:actifsAnnees.map(function(r){return {id:r.id,code:EUC_PFMP_txtNatif_(r.fields.Code||r.fields.Libelle)};}),offres:offres};
}
