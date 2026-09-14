/** Eucalyptus PFMP — v1.0.0-dev.161-fix7 */
function EUC_V1617_txt_(v){return String(v==null?'':v).trim();}
function EUC_V1617_norm_(v){return EUC_V1617_txt_(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}

function EUC_V1617_afficherEntClasses(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var requested=EUC_V1617_txt_(e&&e.parameter&&e.parameter.annee);
  if(requested && ctx.annees && ctx.annees.some(function(a){return a.code===requested;}))ctx.active=requested;
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),entMode:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(EUC_SUIVI_CLASSES_accueilV154(ctx.active));
  return tpl.evaluate().setTitle('Suivi PFMP par classe').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_V1617_afficherEntClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V1617_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail;
  if(typeof EUC_SUIVI_CLASSE_detailV162==='function')detail=EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId);
  else if(typeof EUC_SUIVI_CLASSE_detailV161==='function')detail=EUC_SUIVI_CLASSE_detailV161(annee,classeId,periodeId);
  else detail=EUC_SUIVI_CLASSE_detailV155(annee,classeId,periodeId);
  detail.peutModifier=false;
  detail.professeursDisponibles=[];
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),entMode:true});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_V1617_tableEntreprises_(){var c=EUC_ENT_lireConfiguration();return c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES';}
function EUC_V1617_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_V1617_assurerColonnesMonaco_(){
  var table=EUC_V1617_tableEntreprises_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[],have={};
  cols.forEach(function(c){have[c.id]=true;});
  var wanted=[
    EUC_V1617_col_('NIS','NIS Monaco'),
    EUC_V1617_col_('RCI','RCI Monaco'),
    EUC_V1617_col_('Statut_validation','Statut validation'),
    EUC_V1617_col_('Source_creation','Source création')
  ];
  var missing=wanted.filter(function(c){return !have[c.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  return table;
}

function EUC_V1617_rechercherNis(nis){
  nis=EUC_V1617_txt_(nis);
  if(!nis)return {found:false};
  var table=EUC_V1617_assurerColonnesMonaco_();
  var rows=EUC_IMPORT_lireRecords_(table);
  var hit=rows.filter(function(r){return EUC_V1617_norm_(r.Pays)==='monaco' && EUC_V1617_norm_(r.NIS)===EUC_V1617_norm_(nis);})[0];
  if(!hit)return {found:false,nis:nis};
  return {found:true,source:'grist_monaco',entreprise:{nis:EUC_V1617_txt_(hit.NIS),rci:EUC_V1617_txt_(hit.RCI),raisonSociale:EUC_V1617_txt_(hit.Raison_sociale),enseigne:EUC_V1617_txt_(hit.Enseigne),numeroVoie:EUC_V1617_txt_(hit.Adresse),complementAdresse:EUC_V1617_txt_(hit.Complement_adresse),codePostal:EUC_V1617_txt_(hit.Code_postal),commune:EUC_V1617_txt_(hit.Commune)||'Monaco',pays:'Monaco'}};
}

function EUC_V1617_enregistrerEntrepriseMonaco(payload){
  payload=payload||{};
  var nis=EUC_V1617_txt_(payload.nis);
  if(!nis)throw new Error('NIS Monaco absent.');
  var table=EUC_V1617_assurerColonnesMonaco_();
  var rows=EUC_IMPORT_lireRecords_(table);
  var existing=rows.filter(function(r){return EUC_V1617_norm_(r.Pays)==='monaco' && EUC_V1617_norm_(r.NIS)===EUC_V1617_norm_(nis);})[0];
  var fields={NIS:nis,RCI:EUC_V1617_txt_(payload.rci),Raison_sociale:EUC_V1617_txt_(payload.raisonSociale),Enseigne:EUC_V1617_txt_(payload.enseigne),Adresse:EUC_V1617_txt_(payload.adresse),Complement_adresse:EUC_V1617_txt_(payload.complement),Code_postal:EUC_V1617_txt_(payload.codePostal),Commune:EUC_V1617_txt_(payload.commune)||'Monaco',Pays:'Monaco',Statut_validation:existing?(EUC_V1617_txt_(existing.Statut_validation)||'VALIDE'):'A_VALIDER',Source_creation:existing?(EUC_V1617_txt_(existing.Source_creation)||'QR_PFMP'):'QR_PFMP'};
  if(existing){EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{records:[{id:existing.id,fields:fields}]});return {ok:true,created:false,id:existing.id};}
  return {ok:true,created:true,result:EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/records',{records:[{fields:fields}]})};
}
