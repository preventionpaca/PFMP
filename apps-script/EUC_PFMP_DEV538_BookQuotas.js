/**
 * DEV538 — quotas apprentissage, relances et book entreprises.
 *
 * Les quotas sont une configuration applicative légère conservée dans les
 * propriétés Apps Script. Les données élèves, contrats et accueils restent
 * dans leurs tables métier existantes : aucune duplication n'est créée.
 */
var EUC_DEV538_VERSION_='1.0.0-dev.540';
var EUC_DEV538_QUOTAS_PROP_='EUC_DEV538_QUOTAS_APPRENTISSAGE_V1';
var EUC_DEV538_RELANCE_DAYS_=14;
var EUC_DEV540_PHOTO_TABLE_='EUC_ENTREPRISES_PHOTOS_PFMP';
var EUC_DEV540_PHOTO_FOLDER_PROP_='EUC_DEV540_PHOTO_FOLDER_ID';

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
/* Le SIRET est l'identité stable d'un établissement français. L'adresse
 * normalisée reste le repli pour les anciennes conventions qui n'en ont pas. */
function EUC_DEV540_normalizeAddress_(adresse){return typeof EUC_DEV443_normalizeAddress_==='function'?EUC_DEV443_normalizeAddress_(adresse):EUC_DEV538_t_(adresse);}
function EUC_DEV538_companyIdentity_(entreprise,adresse,siret){return EUC_DEV443_geoIdentity_(entreprise,EUC_DEV540_normalizeAddress_(adresse),siret||'');}
function EUC_DEV540_companyLooseKey_(entreprise,adresse){
  var a=EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(adresse)),cp=(a.match(/\b\d{5}\b/)||[''])[0],before=cp?a.slice(0,a.indexOf(cp)):a,number=(before.match(/\b\d+[A-Z]?\b/)||[''])[0],words=before.split(' ').filter(function(w){return w.length>2&&['RUE','ROUTE','AVENUE','BOULEVARD','CHEMIN','IMPASSE','PLACE','RESIDENCE','BATIMENT'].indexOf(w)<0&&!/^\d/.test(w);});
  return[EUC_DEV538_norm_(entreprise),cp,number,words.slice(-3).join(' ')].join('|');
}
function EUC_DEV540_contactName_(value){return EUC_DEV538_t_(value).split(/\s*[·|]\s*/)[0];}

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
  q=q||{};var companies={},bySiret={},byAddress={},byLoose={},diplomas=EUC_DEV538_diplomas_(),needleCompany=EUC_DEV538_norm_(q.entreprise),needleStudent=EUC_DEV538_norm_(q.eleve),needleTeacher=EUC_DEV538_norm_(q.professeur),needleDiploma=EUC_DEV538_norm_(q.diplome),needleLevel=EUC_DEV538_norm_(q.niveau),needleClass=EUC_DEV538_norm_(q.classe),needlePeriod=EUC_DEV538_norm_(q.periode);
  function merge(target,source){if(!source||target===source)return target;(source.historique||[]).forEach(function(h){target.historique.push(h);});Object.keys(source._seen||{}).forEach(function(k){target._seen[k]=true;});Object.keys(source._students||{}).forEach(function(k){target._students[k]=true;});if(!target.siret&&source.siret)target.siret=source.siret;if((source.adresse||'').length>(target.adresse||'').length)target.adresse=source.adresse;Object.keys(companies).forEach(function(k){if(companies[k]===source)delete companies[k];});Object.keys(byAddress).forEach(function(k){if(byAddress[k]===source)byAddress[k]=target;});Object.keys(byLoose).forEach(function(k){if(byLoose[k]===source)byLoose[k]=target;});return target;}
  function company(entreprise,adresse,siret){var sir=EUC_DEV538_t_(siret).replace(/\D/g,''),skey=sir.length===14?'SIRET|'+sir:'',akey=EUC_DEV538_companyIdentity_(entreprise,adresse,''),lkey=EUC_DEV540_companyLooseKey_(entreprise,adresse),candidate=byAddress[akey]||byLoose[lkey],c=skey&&bySiret[skey]||((!skey||!candidate||!candidate.siret||candidate.siret===sir)?candidate:null);if(!c)c={identity:skey||akey,siret:sir,entreprise:entreprise,adresse:adresse,pays:EUC_DEV441_geoClassify_(adresse).pays,historique:[],_seen:{},_students:{}};if(skey){if(bySiret[skey]&&bySiret[skey]!==c)c=merge(bySiret[skey],c);if(byAddress[akey]&&byAddress[akey]!==c&&(!byAddress[akey].siret||byAddress[akey].siret===sir))c=merge(c,byAddress[akey]);if(byLoose[lkey]&&byLoose[lkey]!==c&&(!byLoose[lkey].siret||byLoose[lkey].siret===sir))c=merge(c,byLoose[lkey]);c.identity=skey;c.siret=sir;bySiret[skey]=c;companies[skey]=c;}else companies[c.identity]=c;byAddress[akey]=c;if(lkey)byLoose[lkey]=c;return c;}
  EUC_DEV538_yearsForScope_(q).forEach(function(year){var scoped={annee:year,famille:EUC_DEV538_t_(q.famille),classeId:EUC_DEV538_n_(q.classeId),periodeId:EUC_DEV538_n_(q.periodeId)},details=EUC_DEV445_geoSnapshotDetails_(scoped).concat(EUC_DEV513_geoAccessDetails_(scoped));
    details.forEach(function(d){var cid=EUC_DEV538_n_(d&&d.classe&&(d.classe.id||d.classe.classeId)),classe=EUC_DEV538_t_(d&&d.classe&&(d.classe.nom||d.classe.libelle)),famille=EUC_DEV538_t_(d&&d.famille),periode=EUC_DEV538_t_(d&&d.periode&&(d.periode.libelle||d.periode.nom)),niveau=EUC_DEV538_level_({classe:classe,famille:famille}),diplome=diplomas[cid]||EUC_DEV538_fallbackDiploma_({classe:classe,famille:famille});if(needleDiploma&&EUC_DEV538_norm_(diplome).indexOf(needleDiploma)<0||needleLevel&&EUC_DEV538_norm_(niveau).indexOf(needleLevel)<0||needleClass&&EUC_DEV538_norm_(classe).indexOf(needleClass)<0||needlePeriod&&EUC_DEV538_norm_(periode).indexOf(needlePeriod)<0)return;
      (d.lignes||[]).forEach(function(x){var entreprise=EUC_DEV538_t_(x.entreprise),adresse=EUC_DEV443_normalizeAddress_(x.adresseEntreprise),siret=EUC_DEV538_t_(x.siretEntreprise||x.siret).replace(/\D/g,''),eleve=[EUC_DEV538_t_(x.nom),EUC_DEV538_t_(x.prenom)].filter(Boolean).join(' '),prof=EUC_DEV538_t_(x.professeurVisiteur);if(!entreprise||!adresse||needleCompany&&EUC_DEV538_norm_(entreprise+' '+adresse).indexOf(needleCompany)<0||needleStudent&&EUC_DEV538_norm_(eleve).indexOf(needleStudent)<0||needleTeacher&&EUC_DEV538_norm_(prof).indexOf(needleTeacher)<0)return;
        var c=company(entreprise,adresse,siret),studentKey=EUC_DEV537_studentKey_(x)||EUC_DEV538_norm_(eleve);if(!studentKey)return;var key=[year,cid,EUC_DEV538_n_(d&&d.periode&&d.periode.id),studentKey].join('|');if(c._seen[key])return;c._seen[key]=true;c._students[studentKey]=true;c.historique.push({annee:year,famille:famille,eleve:eleve,classe:classe,niveau:niveau,diplome:diplome,periode:periode,professeurVisiteur:prof,responsable:EUC_DEV540_contactName_(x.responsableEntreprise||x.contactEntreprise),telephoneResponsable:EUC_DEV538_t_(x.telephoneEntreprise),courrielResponsable:EUC_DEV538_t_(x.courrielEntreprise),tuteur:EUC_DEV540_contactName_(x.tuteurEntreprise),telephoneTuteur:EUC_DEV538_t_(x.telephoneTuteur),courrielTuteur:EUC_DEV538_t_(x.courrielTuteur)});
      });
    });
  });
  var geoBy={};EUC_DEV537_mergeAnnualCandidates_(EUC_DEV538_yearsForScope_(q)).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,x.siret),addressKey=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,''),current=geoBy[identity]||geoBy[addressKey];if(!current||(current.latitude==null||current.longitude==null)&&x.latitude!=null&&x.longitude!=null)current=x;geoBy[identity]=current;geoBy[addressKey]=current;});
  var unique=[];Object.keys(companies).forEach(function(k){if(unique.indexOf(companies[k])<0)unique.push(companies[k]);});return unique.map(function(c){var g=geoBy[c.identity]||geoBy[EUC_DEV538_companyIdentity_(c.entreprise,c.adresse,'')]||{},named=Object.keys(c._students).length;c.elevesAccueillis=Math.max(named,EUC_DEV538_n_(g.elevesAccueillis));if(!c.siret&&g.siret)c.siret=EUC_DEV538_t_(g.siret);c.latitude=g.latitude==null?null:Number(g.latitude);c.longitude=g.longitude==null?null:Number(g.longitude);c.historique.sort(function(a,b){return b.annee.localeCompare(a.annee,'fr')||a.eleve.localeCompare(b.eleve,'fr');});delete c._seen;delete c._students;return c;}).sort(function(a,b){return b.elevesAccueillis-a.elevesAccueillis||a.entreprise.localeCompare(b.entreprise,'fr');});
}
function EUC_DEV540_facets_(list){var keys=['famille','diplome','niveau','classe','periode','eleve','professeurVisiteur'],sets={},out={};keys.forEach(function(k){sets[k]={};});var companies={};(list||[]).forEach(function(c){companies[c.entreprise]=true;(c.historique||[]).forEach(function(h){keys.forEach(function(k){var v=EUC_DEV538_t_(h[k]);if(v)sets[k][v]=true;});});});keys.forEach(function(k){out[k]=Object.keys(sets[k]).sort(function(a,b){return a.localeCompare(b,'fr');});});out.entreprise=Object.keys(companies).sort(function(a,b){return a.localeCompare(b,'fr');});return out;}
function EUC_DEV538_bookData(q){EUC_DEV538_admin_();var list=EUC_DEV538_history_(q);return{ok:true,version:EUC_DEV538_VERSION_,total:list.length,facets:EUC_DEV540_facets_(list),entreprises:list};}
function EUC_DEV538_staffBookData(q){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var list=EUC_DEV538_history_(q);return{ok:true,version:EUC_DEV538_VERSION_,total:list.length,facets:EUC_DEV540_facets_(list),entreprises:list};}
function EUC_DEV538_mapBase_(items,q){
  var by={},byAddress={};EUC_DEV517_geoFilter_(items||[],q||{}).filter(function(x){return isFinite(x.latitude)&&isFinite(x.longitude)&&x.latitude!==null&&x.longitude!==null&&(x.statut==='GEOCODE_AUTOMATIQUE'||x.statut==='VALIDE_MANUELLEMENT');}).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,x.siret),addressKey=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,''),addressCandidate=byAddress[addressKey],p=by[identity]||(!x.siret||!addressCandidate||!addressCandidate.siret||addressCandidate.siret===x.siret?addressCandidate:null);if(!p){p={identity:identity,key:EUC_DEV441_digest_(identity).slice(0,32),siret:x.siret||'',entreprise:x.entreprise,adresse:EUC_DEV540_normalizeAddress_(x.adresse),pays:x.pays,latitude:x.latitude,longitude:x.longitude,classe:x.classe||'',elevesAccueillis:0,_students:{},_classes:{}};}if(x.siret){p.identity=identity;p.key=EUC_DEV441_digest_(identity).slice(0,32);p.siret=x.siret;}by[p.identity]=p;if(!byAddress[addressKey]||!byAddress[addressKey].siret||byAddress[addressKey].siret===p.siret)byAddress[addressKey]=p;if(x.classe)EUC_DEV538_t_(x.classe).split(' / ').forEach(function(c){if(c)p._classes[c]=true;});(x.accueils||[]).forEach(function(a){if(a.eleveKey&&EUC_DEV537_scopeMatches_(a.scope||{},q||{}))p._students[a.eleveKey]=true;});p.elevesAccueillis=Math.max(p.elevesAccueillis,EUC_DEV538_n_(x.elevesAccueillis));});
  var unique=[];Object.keys(by).forEach(function(k){if(unique.indexOf(by[k])<0)unique.push(by[k]);});var points=unique.map(function(p){var count=Object.keys(p._students).length;p.elevesAccueillis=Math.max(p.elevesAccueillis,count);var classes=Object.keys(p._classes);if(classes.length)p.classe=classes.join(' / ');delete p._students;delete p._classes;delete p.identity;return p;});return{ok:true,total:points.length,points:points};
}
function EUC_DEV538_mapData(q){
  q=q||{};var parent=EUC_DEV538_t_(q.mode).toUpperCase()==='PARENTS',years=parent?EUC_DEV538_yearsForScope_({annee:'ALL',fenetre:3}):[],scope=parent?{annee:'ALL',famille:q.famille,classeId:q.classeId,periodeId:q.periodeId}:q,items=parent?EUC_DEV537_mergeAnnualCandidates_(years):EUC_DEV441_geoCandidates_(q),base=EUC_DEV538_mapBase_(items,scope),allowed=!parent&&EUC_DEV538_staffAllowed_();
  (base.points||[]).forEach(function(p){delete p.siret;p.nominatif=allowed;});base.nominatif=allowed;return base;
}
function EUC_DEV538_companyHistory(q){
  if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');q=q||{};var key=EUC_DEV538_t_(q.key),company=EUC_DEV538_norm_(q.entreprise),address=EUC_DEV538_norm_(EUC_DEV443_normalizeAddress_(q.adresse)),copy={annee:q.annee,fenetre:q.fenetre,famille:q.famille,classeId:q.classeId,periodeId:q.periodeId,entreprise:q.entreprise},list=EUC_DEV538_history_(copy),match=list.filter(function(c){return EUC_DEV441_digest_(c.identity).slice(0,32)===key;})[0];if(!match)match=list.filter(function(c){return EUC_DEV538_norm_(c.entreprise)===company&&EUC_DEV538_norm_(c.adresse)===address;})[0];if(!match&&list.length===1)match=list[0];return{ok:true,historique:match?match.historique:[]};
}

function EUC_DEV540_photoRows_(){return EUC_DEV538_optionalRecords_(EUC_DEV540_PHOTO_TABLE_,{});}
function EUC_DEV540_photoMatch_(row,q){var f=EUC_DEV538_fields_(row),sir=EUC_DEV538_t_(q&&q.siret).replace(/\D/g,''),rowSir=EUC_DEV538_t_(f.SIRET).replace(/\D/g,''),identity=EUC_DEV538_t_(q&&q.identity),company=EUC_DEV538_norm_(q&&q.entreprise),address=EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(q&&q.adresse)),sameLocation=!!company&&!!address&&EUC_DEV538_norm_(f.Entreprise)===company&&EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(f.Adresse))===address;return f.Actif!==false&&((sir&&rowSir===sir)||(identity&&EUC_DEV538_t_(f.Cle_entreprise)===identity)||sameLocation);}
function EUC_DEV540_companyPhoto(q){
  if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var rows=EUC_DEV540_photoRows_().filter(function(r){return EUC_DEV540_photoMatch_(r,q);}).sort(function(a,b){return EUC_DEV538_n_(b.id)-EUC_DEV538_n_(a.id);}),f=rows.length?EUC_DEV538_fields_(rows[0]):null;if(!f||!f.Drive_file_id)return{ok:true,photo:null};
  try{var file=DriveApp.getFileById(EUC_DEV538_t_(f.Drive_file_id)),blob=file.getBlob(),mime=EUC_DEV538_t_(blob.getContentType()||f.Mime_type);return{ok:true,photo:{name:EUC_DEV538_t_(f.Nom_fichier||file.getName()),mime:mime,data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes()),updatedAt:EUC_DEV538_t_(f.Updated_at)}};}catch(e){return{ok:true,photo:null,avertissement:'La photo référencée dans Drive n’est plus accessible.'};}
}
function EUC_DEV540_ensurePhotoTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(t){return t.id===EUC_DEV540_PHOTO_TABLE_;}),defs=[['Cle_entreprise','Clé entreprise','Text'],['SIRET','SIRET','Text'],['Entreprise','Entreprise','Text'],['Adresse','Adresse','Text'],['Drive_file_id','Identifiant Drive','Text'],['Mime_type','Type MIME','Text'],['Nom_fichier','Nom du fichier','Text'],['Provenance','Provenance','Text'],['Droit_diffusion','Droit de diffusion confirmé','Bool'],['Actif','Actif','Bool'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par','Text']];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV540_PHOTO_TABLE_,columns:defs.map(function(d){return{id:d[0],fields:{label:d[1],type:d[2]}};})}]});return;}
  var current=EUC_ENT_grist('get','/tables/'+EUC_DEV540_PHOTO_TABLE_+'/columns').columns||[],have={};current.forEach(function(c){have[c.id]=true;});var missing=defs.filter(function(d){return!have[d[0]];}).map(function(d){return{id:d[0],fields:{label:d[1],type:d[2]}};});if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_DEV540_PHOTO_TABLE_+'/columns',{columns:missing});
}
function EUC_DEV540_photoFolder_(){
  var props=PropertiesService.getScriptProperties(),id=props.getProperty(EUC_DEV540_PHOTO_FOLDER_PROP_)||'';if(id){try{return DriveApp.getFolderById(id);}catch(e){}}
  var root=DriveApp.getRootFolder(),found=root.getFoldersByName('Eucalyptus PFMP - Photos entreprises'),folder=found.hasNext()?found.next():root.createFolder('Eucalyptus PFMP - Photos entreprises');props.setProperty(EUC_DEV540_PHOTO_FOLDER_PROP_,folder.getId());return folder;
}
function EUC_DEV540_saveCompanyPhoto(q){
  var ctx=EUC_DEV538_admin_();q=q||{};if(q.droitDiffusion!==true)throw new Error('Confirmez le droit de diffusion et l’absence de personne ou plaque lisible.');var mime=EUC_DEV538_t_(q.mime).toLowerCase();if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0)throw new Error('Format de photo non accepté. Utilisez JPEG, PNG ou WebP.');var b64=EUC_DEV538_t_(q.base64).replace(/^data:[^;]+;base64,/,''),bytes=Utilities.base64Decode(b64);if(!bytes.length||bytes.length>3145728)throw new Error('La photo doit peser moins de 3 Mo après réduction.');var identity=EUC_DEV538_t_(q.identity),entreprise=EUC_DEV538_t_(q.entreprise),adresse=EUC_DEV443_normalizeAddress_(q.adresse),siret=EUC_DEV538_t_(q.siret).replace(/\D/g,'');if(!identity||!entreprise)throw new Error('Entreprise invalide.');
  EUC_DEV540_ensurePhotoTable_();var ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg',safe=(entreprise+'-'+(siret||EUC_DEV441_digest_(identity).slice(0,10))).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,120),file=EUC_DEV540_photoFolder_().createFile(Utilities.newBlob(bytes,mime,safe+ext));file.setDescription('Photo de devanture PFMP — diffusion confirmée par '+EUC_DEV538_t_(ctx.email));var existing=EUC_DEV540_photoRows_().filter(function(r){return EUC_DEV540_photoMatch_(r,{identity:identity,siret:siret,entreprise:entreprise,adresse:adresse});})[0],fields={Cle_entreprise:identity,SIRET:siret,Entreprise:entreprise,Adresse:adresse,Drive_file_id:file.getId(),Mime_type:mime,Nom_fichier:file.getName(),Provenance:'TELEVERSEMENT_ADMIN',Droit_diffusion:true,Actif:true,Updated_at:new Date().toISOString(),Updated_by:EUC_DEV538_t_(ctx.email)},record={fields:fields},method='post';if(existing){record.id=existing.id;method='patch';}EUC_ENT_grist(method,'/tables/'+EUC_DEV540_PHOTO_TABLE_+'/records',{records:[record]});return{ok:true,name:file.getName(),mime:mime};
}

function EUC_DEV538_render_(file,title,boot){var t=HtmlService.createTemplateFromFile(file);t.bootJson=JSON.stringify(boot||EUC_DEV368_boot());return t.evaluate().setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV538_afficherQuotas(e){EUC_DEV538_admin_();return EUC_DEV538_render_('Apprentissage_Quotas_DEV538','Quotas et relances apprentissage');}
function EUC_DEV538_afficherBookAdmin(e){EUC_DEV538_admin_();var b=EUC_DEV368_boot();b.mode='ADMIN';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV538_afficherBookStaff(e){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var b=EUC_DEV368_boot();b.mode='STAFF';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV538_afficherCarteParents(e){var b=EUC_DEV368_boot();b.current='ALL';b.mode='PARENTS';b.params={annee:'ALL',famille:EUC_DEV538_t_(e&&e.parameter&&e.parameter.famille),mode:'PARENTS',fenetre:3};return EUC_DEV538_render_('Cartographie_PFMP_DEV441','Cartographie des entreprises — familles',b);}
