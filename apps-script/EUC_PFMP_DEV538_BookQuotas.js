/**
 * DEV538 — quotas apprentissage, relances et book entreprises.
 *
 * Les quotas sont une configuration applicative légère conservée dans les
 * propriétés Apps Script. Les données élèves, contrats et accueils restent
 * dans leurs tables métier existantes : aucune duplication n'est créée.
 */
var EUC_DEV538_VERSION_='1.0.0-dev.539';
var EUC_DEV538_QUOTAS_PROP_='EUC_DEV538_QUOTAS_APPRENTISSAGE_V1';
var EUC_DEV538_RELANCE_DAYS_=14;

function EUC_DEV538_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV538_n_(v){var n=Number(v);return isFinite(n)?n:0;}
function EUC_DEV538_ref_(v){if(Array.isArray(v))return EUC_DEV538_n_(v.length>1?v[1]:v[0]);return EUC_DEV538_n_(v);}
function EUC_DEV538_bool_(v){if(v===true||v===false)return v;var s=EUC_DEV538_t_(v).toLowerCase();return s==='true'||s==='1'||s==='oui'||s==='yes'||s==='x';}
function EUC_DEV538_fields_(r){return r&&r.fields||r||{};}
function EUC_DEV538_pick_(f,names){for(var i=0;i<names.length;i++){var v=f&&f[names[i]];if(v!==null&&v!==undefined&&EUC_DEV538_t_(v)!=='')return v;}return'';}
function EUC_DEV538_date_(v){
  if(v===null||v===undefined||v==='')return null;var d;
  if(v instanceof Date)d=v;else if(typeof v==='number')d=new Date(Math.abs(v)<100000000000?v*1000:v);else if(/^\d+(?:\.\d+)?$/.test(EUC_DEV538_t_(v))){var n=Number(v);d=new Date(Math.abs(n)<100000000000?n*1000:n);}else d=new Date(v);
  return d&&!isNaN(d.getTime())?d:null;
}
function EUC_DEV538_iso_(v){var d=EUC_DEV538_date_(v);if(!d)return'';return Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');}
function EUC_DEV538_records_(table,filter){
  if(typeof EUC_DEV190G_fastRecords_==='function')return EUC_DEV190G_fastRecords_(table,filter||{})||[];
  return EUC_IMPORT_lireRecords_(table)||[];
}
function EUC_DEV538_optionalRecords_(table,filter){try{return EUC_DEV538_records_(table,filter);}catch(e){if(/(?:Table not found|404|introuvable|absente)/i.test(String(e&&e.message||e)))return[];throw e;}}
function EUC_DEV538_admin_(){return EUC_DEV368_admin();}
function EUC_DEV538_activeEmail_(){try{return EUC_DEV538_t_(Session.getActiveUser().getEmail()).toLowerCase();}catch(e){return'';}}
function EUC_DEV538_staffAllowed_(){
  try{if(EUC_DEV538_admin_())return true;}catch(e){}
  return /@lycee-les-eucalyptus\.org$/i.test(EUC_DEV538_activeEmail_());
}
function EUC_DEV538_norm_(v){return EUC_DEV538_t_(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();}
/* Un même établissement peut provenir d'un snapshot sans SIRET puis d'une
 * convention enrichie avec SIRET. Pour le book et la carte, son identité
 * fonctionnelle reste donc le couple normalisé entreprise/adresse. */
function EUC_DEV538_companyIdentity_(entreprise,adresse){return EUC_DEV443_geoIdentity_(entreprise,adresse,'');}

function EUC_DEV538_quotaConfig_(){
  var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV538_QUOTAS_PROP_)||'';}catch(e){}
  try{var parsed=JSON.parse(raw||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch(e2){return{};}
}
function EUC_DEV538_schoolYearMap_(){
  var byId={};EUC_DEV538_optionalRecords_('Annees_Scolaires',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id),code=EUC_DEV538_t_(f.Code||f.Annee||f.Libelle);if(id&&code)byId[id]=code;});return byId;
}
function EUC_DEV538_studentYear_(f,yearsById){
  var direct=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Annee_scolaire_code','Annee_code','Annee_scolaire_libelle']));if(/^20\d{2}-20\d{2}$/.test(direct))return direct;
  var raw=f&&f.Annee_scolaire;if(/^20\d{2}-20\d{2}$/.test(EUC_DEV538_t_(raw)))return EUC_DEV538_t_(raw);return EUC_DEV538_t_((yearsById||{})[EUC_DEV538_ref_(raw)]);
}
function EUC_DEV538_diplomas_(){
  var out={};EUC_DEV538_optionalRecords_('EUC_CLASSES_DIPLOMES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r);if(f.Actif===false)return;var cid=EUC_DEV538_ref_(EUC_DEV538_pick_(f,['Classe','Classe_id'])),label=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Intitule_diplome','Intitule','Diplome','Diplome_imprime','Libelle']));if(cid&&label)out[cid]=label;});return out;
}
function EUC_DEV538_fallbackDiploma_(c){
  var name=EUC_DEV538_t_(c&&c.classe||c&&c.nom),fam=EUC_DEV538_t_(c&&c.famille).toUpperCase(),code=name.toUpperCase().replace(/^(?:T|1|2)/,'').replace(/[0-9]+$/,'');
  var labels={CAR:'BAC PRO Carrossier Peintre Automobile',CIEL:'BAC PRO Cybersécurité, Informatique et Électronique',MELEC:"BAC PRO Métiers de l'Électricité et de ses Environnements Connectés",MP3D:'BAC PRO Modélisation et Prototypage 3D',MP3:'BAC PRO Modélisation et Prototypage 3D',MT:'BAC PRO Microtechniques',MVA:'BAC PRO Maintenance des Véhicules',RMO:'BAC PRO TRPM option Réalisation et Maintenance des Outillages',RSP:'BAC PRO TRPM option Réalisation et Suivi de Production'};
  if(labels[code])return labels[code];if(fam==='BTS')return'BTS — '+name.replace(/^[12]/,'');if(fam==='CAP')return'CAP — '+name.replace(/^(?:T|1|2)/,'');return'BAC PRO — '+code;
}
function EUC_DEV538_level_(c){
  if(c&&c.niveau)return EUC_DEV538_t_(c.niveau);var name=EUC_DEV538_t_(c&&c.classe||c&&c.nom).toUpperCase(),fam=EUC_DEV538_t_(c&&c.famille).toUpperCase();
  if(fam==='BTS')return/^2/.test(name)?'2e année':'1re année';if(fam==='CAP')return/^(?:T|2)/.test(name)?'Terminale':'Première';if(/^T/.test(name))return'Terminale';if(/^1/.test(name))return'Première';if(/^2/.test(name))return'Seconde';return'Autre';
}
function EUC_DEV538_latestByStudent_(rows,year){
  var latest={};(rows||[]).forEach(function(r){var f=EUC_DEV538_fields_(r),rowYear=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Annee_scolaire','Année_scolaire','Annee']));if(rowYear&&rowYear!==year)return;var eid=EUC_DEV538_ref_(EUC_DEV538_pick_(f,['Eleve','Élève','Eleve_id']));if(!eid)return;if(!latest[eid]||EUC_DEV538_n_(r.id)>EUC_DEV538_n_(latest[eid].id))latest[eid]=r;});return latest;
}
function EUC_DEV538_distributionByStudent_(rows,year){
  var latest={};(rows||[]).forEach(function(r){var f=EUC_DEV538_fields_(r),rowYear=EUC_DEV538_t_(f.Annee_scolaire);if(rowYear&&rowYear!==year||EUC_DEV538_t_(f.Statut).toUpperCase()==='ANNULE')return;var eid=EUC_DEV538_ref_(f.Eleve),d=EUC_DEV538_date_(f.Date_edition);if(!eid||!d)return;if(!latest[eid]||d.getTime()>latest[eid].getTime())latest[eid]=d;});return latest;
}
function EUC_DEV538_apprenticeState_(row,printDate,now){
  var f=EUC_DEV538_fields_(row),rupture=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_rupture_contrat','Date_rupture'])),contract=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_contrat_officielle','Date_contrat'])),start=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_debut','Debut']))||contract,end=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_fin','Fin']));
  var broken=!!rupture&&rupture.getTime()<=now.getTime(),complete=!!contract&&!!start&&!!end&&!broken,future=complete&&start.getTime()>now.getTime(),current=!broken&&!future&&(EUC_DEV538_bool_(f.Actif)||complete)&&(!end||end.getTime()>=now.getTime());
  var distribution=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_distribution_dossier']))||printDate||null,distributed=EUC_DEV538_bool_(f.Dossier_distribue)||!!distribution,returned=EUC_DEV538_bool_(f.Dossier_remis)||!!EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_remise_dossier','Date_dossier'])),cfa=EUC_DEV538_bool_(f.Dossier_transmis_CFA)||!!EUC_DEV538_date_(f.Date_transmission_CFA),days=distribution?Math.max(0,Math.floor((now.getTime()-distribution.getTime())/86400000)):0;
  return{current:current,future:future,distributed:distributed,returned:returned,cfa:cfa,reminder:distributed&&!returned&&days>=EUC_DEV538_RELANCE_DAYS_,days:days,distribution:EUC_DEV538_iso_(distribution)};
}
function EUC_DEV538_apprentissageDashboard(annee){
  EUC_DEV538_admin_();annee=EUC_DEV538_t_(annee)||EUC_DEV368_year('');var catalog=EUC_DEV368_catalog(annee),classes=(catalog.classes||[]).map(function(c){return{id:EUC_DEV538_n_(c.classeId||c.id),classe:EUC_DEV538_t_(c.classe||c.nom),famille:EUC_DEV538_t_(c.famille),niveau:EUC_DEV538_level_(c)};}).filter(function(c){return c.id&&c.classe;}),classById={},classByName={};classes.forEach(function(c){classById[c.id]=c;classByName[EUC_DEV538_norm_(c.classe)]=c;});
  var yearsById=EUC_DEV538_schoolYearMap_(),students=[],studentById={};EUC_DEV538_records_('EUC_ELEVES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id);if(!id||f.Actif===false||f.Present_dernier_import===false||EUC_DEV538_studentYear_(f,yearsById)!==annee)return;var cid=EUC_DEV538_ref_(f.Classe),label=EUC_DEV538_t_(f.Code_classe_importe||f.Classe_nom||f.Classe_snapshot),cl=classById[cid]||classByName[EUC_DEV538_norm_(label)];if(!cl)return;var s={id:id,nom:[EUC_DEV538_t_(f.Nom),EUC_DEV538_t_(f.Prenom_usage||f.Prenom)].filter(Boolean).join(' '),classeId:cl.id,classe:cl.classe};students.push(s);studentById[id]=s;});
  var latest=EUC_DEV538_latestByStudent_(EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP',{}),annee),prints=EUC_DEV538_distributionByStudent_(EUC_DEV538_optionalRecords_('EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS',{}),annee),now=new Date(),diplomas=EUC_DEV538_diplomas_(),config=EUC_DEV538_quotaConfig_(),yearConfig=config[annee]||{},rowByClass={};
  classes.forEach(function(c){rowByClass[c.id]={classeId:c.id,classe:c.classe,famille:c.famille,niveau:c.niveau,diplome:diplomas[c.id]||EUC_DEV538_fallbackDiploma_(c),effectif:0,quotaPercent:EUC_DEV538_n_(yearConfig[c.id]),quota:0,apprentis:0,futurs:0,distribues:0,retournes:0,transmisCfa:0,relances:[],dossiers:[]};});
  students.forEach(function(s){var out=rowByClass[s.classeId];if(!out)return;out.effectif++;var state=EUC_DEV538_apprenticeState_(latest[s.id],prints[s.id],now);if(state.current)out.apprentis++;if(state.future)out.futurs++;if(state.distributed&&!state.returned)out.distribues++;if(state.returned&&!state.cfa)out.retournes++;if(state.cfa)out.transmisCfa++;if(state.distributed||state.returned||state.cfa)out.dossiers.push({eleveId:s.id,eleve:s.nom,classe:s.classe,dateDistribution:state.distribution,jours:state.days,statut:state.cfa?'Transmis au CFA':state.returned?'Dossier retourné':'Dossier distribué',aRelancer:state.reminder});if(state.reminder)out.relances.push({eleveId:s.id,eleve:s.nom,classe:s.classe,dateDistribution:state.distribution,jours:state.days});});
  var groups={},totals={effectif:0,quota:0,apprentis:0,futurs:0,distribues:0,retournes:0,transmisCfa:0,relances:0};Object.keys(rowByClass).forEach(function(k){var r=rowByClass[k];r.quota=Math.round(r.effectif*r.quotaPercent/100);var key=r.diplome;if(!groups[key])groups[key]={diplome:key,famille:r.famille,lignes:[]};groups[key].lignes.push(r);Object.keys(totals).forEach(function(x){if(x==='relances')totals[x]+=r.relances.length;else totals[x]+=EUC_DEV538_n_(r[x]);});});
  var groupList=Object.keys(groups).map(function(k){groups[k].lignes.sort(function(a,b){return a.niveau.localeCompare(b.niveau,'fr')||a.classe.localeCompare(b.classe,'fr');});return groups[k];}).sort(function(a,b){return a.diplome.localeCompare(b.diplome,'fr');});
  var dossiers=[],relances=[];groupList.forEach(function(g){g.lignes.forEach(function(r){dossiers=dossiers.concat(r.dossiers||[]);relances=relances.concat(r.relances||[]);});});dossiers.sort(function(a,b){return(a.classe||'').localeCompare(b.classe||'','fr')||(a.eleve||'').localeCompare(b.eleve||'','fr');});relances.sort(function(a,b){return b.jours-a.jours||(a.eleve||'').localeCompare(b.eleve||'','fr');});
  return{ok:true,version:EUC_DEV538_VERSION_,annee:annee,groups:groupList,totals:totals,dossiers:dossiers,relances:relances,relanceApresJours:EUC_DEV538_RELANCE_DAYS_};
}
function EUC_DEV538_saveQuotas(q){
  EUC_DEV538_admin_();q=q||{};var year=EUC_DEV538_t_(q.annee),rows=Array.isArray(q.lignes)?q.lignes:[];if(!/^20\d{2}-20\d{2}$/.test(year))throw new Error('Année scolaire invalide.');var all=EUC_DEV538_quotaConfig_(),saved={};rows.forEach(function(r){var id=EUC_DEV538_n_(r.classeId),pct=Number(r.quotaPercent);if(!id||!isFinite(pct)||pct<0||pct>100)throw new Error('Pourcentage invalide pour une classe.');saved[id]=Math.round(pct*100)/100;});all[year]=saved;PropertiesService.getScriptProperties().setProperty(EUC_DEV538_QUOTAS_PROP_,JSON.stringify(all));return{ok:true,annee:year,lignes:Object.keys(saved).length};
}

function EUC_DEV538_yearsForScope_(q){
  q=q||{};var available=EUC_DEV537_geoYears_().slice().sort().reverse(),year=EUC_DEV538_t_(q.annee);if(year&&year.toUpperCase()!=='ALL')return[year];var windowSize=EUC_DEV538_n_(q.fenetre);return windowSize>0?available.slice(0,windowSize):available;
}
function EUC_DEV538_history_(q){
  q=q||{};var companies={},diplomas=EUC_DEV538_diplomas_(),needleCompany=EUC_DEV538_norm_(q.entreprise),needleStudent=EUC_DEV538_norm_(q.eleve),needleTeacher=EUC_DEV538_norm_(q.professeur),needleDiploma=EUC_DEV538_norm_(q.diplome),needleLevel=EUC_DEV538_norm_(q.niveau),needleClass=EUC_DEV538_norm_(q.classe),needlePeriod=EUC_DEV538_norm_(q.periode);
  EUC_DEV538_yearsForScope_(q).forEach(function(year){var scoped={annee:year,famille:EUC_DEV538_t_(q.famille),classeId:EUC_DEV538_n_(q.classeId),periodeId:EUC_DEV538_n_(q.periodeId)},details=EUC_DEV445_geoSnapshotDetails_(scoped).concat(EUC_DEV513_geoAccessDetails_(scoped));
    details.forEach(function(d){var cid=EUC_DEV538_n_(d&&d.classe&&(d.classe.id||d.classe.classeId)),classe=EUC_DEV538_t_(d&&d.classe&&(d.classe.nom||d.classe.libelle)),famille=EUC_DEV538_t_(d&&d.famille),periode=EUC_DEV538_t_(d&&d.periode&&(d.periode.libelle||d.periode.nom)),niveau=EUC_DEV538_level_({classe:classe,famille:famille}),diplome=diplomas[cid]||EUC_DEV538_fallbackDiploma_({classe:classe,famille:famille});if(needleDiploma&&EUC_DEV538_norm_(diplome).indexOf(needleDiploma)<0||needleLevel&&EUC_DEV538_norm_(niveau).indexOf(needleLevel)<0||needleClass&&EUC_DEV538_norm_(classe).indexOf(needleClass)<0||needlePeriod&&EUC_DEV538_norm_(periode).indexOf(needlePeriod)<0)return;
      (d.lignes||[]).forEach(function(x){var entreprise=EUC_DEV538_t_(x.entreprise),adresse=EUC_DEV443_normalizeAddress_(x.adresseEntreprise),siret=EUC_DEV538_t_(x.siretEntreprise||x.siret).replace(/\D/g,''),eleve=[EUC_DEV538_t_(x.nom),EUC_DEV538_t_(x.prenom)].filter(Boolean).join(' '),prof=EUC_DEV538_t_(x.professeurVisiteur);if(!entreprise||!adresse||needleCompany&&EUC_DEV538_norm_(entreprise+' '+adresse).indexOf(needleCompany)<0||needleStudent&&EUC_DEV538_norm_(eleve).indexOf(needleStudent)<0||needleTeacher&&EUC_DEV538_norm_(prof).indexOf(needleTeacher)<0)return;
        var identity=EUC_DEV538_companyIdentity_(entreprise,adresse),c=companies[identity];if(!c)c=companies[identity]={identity:identity,siret:siret,entreprise:entreprise,adresse:adresse,pays:EUC_DEV441_geoClassify_(adresse).pays,historique:[],_seen:{},_students:{}};else if(!c.siret&&siret)c.siret=siret;var studentKey=EUC_DEV537_studentKey_(x)||EUC_DEV538_norm_(eleve);if(!studentKey)return;var key=[year,cid,EUC_DEV538_n_(d&&d.periode&&d.periode.id),studentKey].join('|');if(c._seen[key])return;c._seen[key]=true;c._students[studentKey]=true;c.historique.push({annee:year,eleve:eleve,classe:classe,niveau:niveau,diplome:diplome,periode:periode,professeurVisiteur:prof});
      });
    });
  });
  var geoBy={};EUC_DEV537_mergeAnnualCandidates_(EUC_DEV538_yearsForScope_(q)).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse),current=geoBy[identity];if(!current||(current.latitude==null||current.longitude==null)&&x.latitude!=null&&x.longitude!=null)geoBy[identity]=x;});
  return Object.keys(companies).map(function(k){var c=companies[k],g=geoBy[k]||{},named=Object.keys(c._students).length;c.elevesAccueillis=Math.max(named,EUC_DEV538_n_(g.elevesAccueillis));if(!c.siret&&g.siret)c.siret=EUC_DEV538_t_(g.siret);c.latitude=g.latitude==null?null:Number(g.latitude);c.longitude=g.longitude==null?null:Number(g.longitude);c.historique.sort(function(a,b){return b.annee.localeCompare(a.annee,'fr')||a.eleve.localeCompare(b.eleve,'fr');});delete c._seen;delete c._students;return c;}).sort(function(a,b){return b.elevesAccueillis-a.elevesAccueillis||a.entreprise.localeCompare(b.entreprise,'fr');});
}
function EUC_DEV538_bookData(q){EUC_DEV538_admin_();var list=EUC_DEV538_history_(q);return{ok:true,version:EUC_DEV538_VERSION_,total:list.length,entreprises:list};}
function EUC_DEV538_staffBookData(q){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var list=EUC_DEV538_history_(q);return{ok:true,version:EUC_DEV538_VERSION_,total:list.length,entreprises:list};}
function EUC_DEV538_mapBase_(items,q){
  var by={};EUC_DEV517_geoFilter_(items||[],q||{}).filter(function(x){return isFinite(x.latitude)&&isFinite(x.longitude)&&x.latitude!==null&&x.longitude!==null&&(x.statut==='GEOCODE_AUTOMATIQUE'||x.statut==='VALIDE_MANUELLEMENT');}).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse),p=by[identity];if(!p){p=by[identity]={key:EUC_DEV441_digest_(identity).slice(0,32),siret:x.siret||'',entreprise:x.entreprise,adresse:x.adresse,pays:x.pays,latitude:x.latitude,longitude:x.longitude,classe:x.classe||'',elevesAccueillis:0,_students:{},_classes:{}};}else if(!p.siret&&x.siret)p.siret=x.siret;if(x.classe)EUC_DEV538_t_(x.classe).split(' / ').forEach(function(c){if(c)p._classes[c]=true;});(x.accueils||[]).forEach(function(a){if(a.eleveKey&&EUC_DEV537_scopeMatches_(a.scope||{},q||{}))p._students[a.eleveKey]=true;});p.elevesAccueillis=Math.max(p.elevesAccueillis,EUC_DEV538_n_(x.elevesAccueillis));});
  var points=Object.keys(by).map(function(k){var p=by[k],count=Object.keys(p._students).length;p.elevesAccueillis=Math.max(p.elevesAccueillis,count);var classes=Object.keys(p._classes);if(classes.length)p.classe=classes.join(' / ');delete p._students;delete p._classes;return p;});return{ok:true,total:points.length,points:points};
}
function EUC_DEV538_mapData(q){
  q=q||{};var parent=EUC_DEV538_t_(q.mode).toUpperCase()==='PARENTS',years=parent?EUC_DEV538_yearsForScope_({annee:'ALL',fenetre:3}):[],scope=parent?{annee:'ALL',famille:q.famille,classeId:q.classeId,periodeId:q.periodeId}:q,items=parent?EUC_DEV537_mergeAnnualCandidates_(years):EUC_DEV441_geoCandidates_(q),base=EUC_DEV538_mapBase_(items,scope),allowed=!parent&&EUC_DEV538_staffAllowed_();
  (base.points||[]).forEach(function(p){delete p.siret;p.nominatif=allowed;});base.nominatif=allowed;return base;
}
function EUC_DEV538_companyHistory(q){
  if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');q=q||{};var key=EUC_DEV538_t_(q.key),company=EUC_DEV538_norm_(q.entreprise),address=EUC_DEV538_norm_(EUC_DEV443_normalizeAddress_(q.adresse)),copy={annee:q.annee,fenetre:q.fenetre,famille:q.famille,classeId:q.classeId,periodeId:q.periodeId,entreprise:q.entreprise},list=EUC_DEV538_history_(copy),match=list.filter(function(c){return EUC_DEV441_digest_(c.identity).slice(0,32)===key;})[0];if(!match)match=list.filter(function(c){return EUC_DEV538_norm_(c.entreprise)===company&&EUC_DEV538_norm_(c.adresse)===address;})[0];if(!match&&list.length===1)match=list[0];return{ok:true,historique:match?match.historique:[]};
}

function EUC_DEV538_render_(file,title,boot){var t=HtmlService.createTemplateFromFile(file);t.bootJson=JSON.stringify(boot||EUC_DEV368_boot());return t.evaluate().setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV538_afficherQuotas(e){EUC_DEV538_admin_();return EUC_DEV538_render_('Apprentissage_Quotas_DEV538','Quotas et relances apprentissage');}
function EUC_DEV538_afficherBookAdmin(e){EUC_DEV538_admin_();var b=EUC_DEV368_boot();b.mode='ADMIN';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV538_afficherBookStaff(e){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var b=EUC_DEV368_boot();b.mode='STAFF';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV538_afficherCarteParents(e){var b=EUC_DEV368_boot();b.current='ALL';b.mode='PARENTS';b.params={annee:'ALL',famille:EUC_DEV538_t_(e&&e.parameter&&e.parameter.famille),mode:'PARENTS',fenetre:3};return EUC_DEV538_render_('Cartographie_PFMP_DEV441','Cartographie des entreprises — familles',b);}
