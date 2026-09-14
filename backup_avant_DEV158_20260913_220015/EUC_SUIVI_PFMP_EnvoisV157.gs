/** Eucalyptus PFMP — v1.0.0-dev.157 */
var EUC_V157_PARAMS_TABLE_='EUC_PARAMETRES_CONVENTION_PFMP';

var EUC_V157_DESTINATAIRES_=[
  {key:'SUIVI_PFMP_CC_PROVISEUR',label:'Proviseur'},
  {key:'SUIVI_PFMP_CC_PROVISEUR_ADJOINT_LGT',label:'Proviseur adjoint — lycée général et technologique'},
  {key:'SUIVI_PFMP_CC_PROVISEUR_LP',label:'Proviseur / responsable — lycée professionnel'},
  {key:'SUIVI_PFMP_CC_RESTAURATION',label:'Responsable du service de restauration'},
  {key:'SUIVI_PFMP_CC_SECRETAIRE_GENERAL',label:'Secrétaire général'},
  {key:'SUIVI_PFMP_CC_BUREAU_ENTREPRISES',label:'Responsable du bureau des entreprises'},
  {key:'SUIVI_PFMP_CC_CPE_LP',label:'CPE vie scolaire — lycée professionnel'},
  {key:'SUIVI_PFMP_CC_CPE_LGT_1',label:'CPE vie scolaire — lycée général et technologique 1'},
  {key:'SUIVI_PFMP_CC_CPE_LGT_2',label:'CPE vie scolaire — lycée général et technologique 2'},
  {key:'SUIVI_PFMP_CC_DDFPT_NUMERIQUE',label:'DDFPT — filières du numérique'},
  {key:'SUIVI_PFMP_CC_DDFPT_MECANIQUE',label:'DDFPT — filières mécaniques'},
  {key:'SUIVI_PFMP_CC_ASSISTANTE_DDFPT',label:'Assistante DDFPT'}
];

function EUC_V157_txt_(v){return String(v==null?'':v).trim();}
function EUC_V157_bool_(v){var s=EUC_V157_txt_(v).toLowerCase();return ['1','true','oui','yes','on'].indexOf(s)>=0;}

function EUC_V157_paramRows_(){return EUC_IMPORT_lireRecords_(EUC_V157_PARAMS_TABLE_);}
function EUC_V157_paramMap_(){
  var map={};
  EUC_V157_paramRows_().forEach(function(r){map[EUC_V157_txt_(r.Cle)]=r;});
  return map;
}

function EUC_V157_assurerParametres_(){
  var map=EUC_V157_paramMap_();
  var ordre=700;
  var required=[
    {k:'SUIVI_PFMP_EMAIL_OBJET',v:'Suivi PFMP — {{CLASSE}} — {{PERIODE}}',d:'Objet du mail des tableaux de suivi PFMP'},
    {k:'SUIVI_PFMP_EMAIL_MESSAGE',v:'Bonjour,\\n\\nVous trouverez ci-dessous le tableau de suivi PFMP de la classe {{CLASSE}} pour la période {{PERIODE}}.\\n\\nCordialement,',d:'Message d’accompagnement du tableau de suivi PFMP'}
  ];

  EUC_V157_DESTINATAIRES_.forEach(function(x){
    required.push({k:x.key+'_EMAIL',v:'',d:'Adresse email — '+x.label});
    required.push({k:x.key+'_ACTIF',v:'NON',d:'Inclure en copie — '+x.label});
  });

  required.forEach(function(x){
    if(map[x.k])return;
    ordre++;
    EUC_ENT_grist('post','/tables/'+EUC_V157_PARAMS_TABLE_+'/records',{
      records:[{fields:{Cle:x.k,Valeur:x.v,Description:x.d,Ordre:ordre,Actif:true}}]
    });
  });
  return true;
}

function INSTALLER_DEV157_ENVOIS(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V157_assurerParametres_();
  return {ok:true};
}

function EUC_V157_lireParametres(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V157_assurerParametres_();
  var map=EUC_V157_paramMap_();

  return {
    objet:EUC_V157_txt_(map.SUIVI_PFMP_EMAIL_OBJET&&map.SUIVI_PFMP_EMAIL_OBJET.Valeur),
    message:EUC_V157_txt_(map.SUIVI_PFMP_EMAIL_MESSAGE&&map.SUIVI_PFMP_EMAIL_MESSAGE.Valeur),
    destinataires:EUC_V157_DESTINATAIRES_.map(function(x){
      return {
        key:x.key,label:x.label,
        email:EUC_V157_txt_(map[x.key+'_EMAIL']&&map[x.key+'_EMAIL'].Valeur),
        actif:EUC_V157_bool_(map[x.key+'_ACTIF']&&map[x.key+'_ACTIF'].Valeur)
      };
    })
  };
}

function EUC_V157_sauverParametres(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  payload=payload||{};
  EUC_V157_assurerParametres_();
  var map=EUC_V157_paramMap_();

  function save(cle,valeur){
    var row=map[cle];
    if(!row)throw new Error('Paramètre introuvable : '+cle);
    EUC_ENT_grist('patch','/tables/'+EUC_V157_PARAMS_TABLE_+'/records',{
      records:[{id:row.id,fields:{Valeur:String(valeur==null?'':valeur)}}]
    });
  }

  save('SUIVI_PFMP_EMAIL_OBJET',payload.objet||'');
  save('SUIVI_PFMP_EMAIL_MESSAGE',payload.message||'');

  (payload.destinataires||[]).forEach(function(x){
    if(!x.key)return;
    save(x.key+'_EMAIL',x.email||'');
    save(x.key+'_ACTIF',x.actif?'OUI':'NON');
  });

  return EUC_V157_lireParametres();
}

function EUC_V157_rempl_(txt,detail){
  var out=String(txt||'');
  var repl={
    '{{CLASSE}}':detail.classe&&detail.classe.nom||'',
    '{{PERIODE}}':detail.periode&&detail.periode.libelle||'',
    '{{ANNEE}}':detail.annee||''
  };
  Object.keys(repl).forEach(function(k){out=out.split(k).join(repl[k]);});
  return out;
}

function EUC_V157_profMails_(detail){
  var set={};
  function add(email){
    email=EUC_V157_txt_(email).toLowerCase();
    if(email&&email.indexOf('@')>0)set[email]=true;
  }

  (detail.professeursPrincipaux||[]).forEach(function(p){add(p.email);});

  var byId={};
  (detail.professeursDisponibles||[]).forEach(function(p){byId[Number(p.id)]=p;});

  (detail.lignes||[]).forEach(function(x){
    var p1=byId[Number(x.professeurTelephoneId)];
    var p2=byId[Number(x.professeurVisiteurId)];
    if(p1)add(p1.email);
    if(p2)add(p2.email);
  });

  return Object.keys(set);
}

function EUC_V157_ccMails_(){
  EUC_V157_assurerParametres_();
  var map=EUC_V157_paramMap_();
  var set={};

  EUC_V157_DESTINATAIRES_.forEach(function(x){
    var actif=EUC_V157_bool_(map[x.key+'_ACTIF']&&map[x.key+'_ACTIF'].Valeur);
    var email=EUC_V157_txt_(map[x.key+'_EMAIL']&&map[x.key+'_EMAIL'].Valeur).toLowerCase();
    if(actif&&email&&email.indexOf('@')>0)set[email]=true;
  });

  return Object.keys(set);
}

function EUC_V157_htmlTable_(detail){
  function e(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var rows=(detail.lignes||[]).map(function(x){
    return '<tr>'+
      '<td>'+e((x.nom||'')+' '+(x.prenom||''))+'</td>'+
      '<td>'+e(x.statut||'')+'</td>'+
      '<td>'+e(x.entreprise||'')+'</td>'+
      '<td>'+e(x.contactEntreprise||'')+'</td>'+
      '<td>'+e(x.professeurPrincipal||'')+'</td>'+
      '<td>'+e(x.professeurTelephone||'')+'</td>'+
      '<td>'+e(x.professeurVisiteur||'')+'</td>'+
    '</tr>';
  }).join('');

  return '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">'+
    '<thead><tr style="background:#eef5fb">'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Élève</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Statut</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Entreprise</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Contact entreprise</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Professeur principal</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Suivi téléphonique</th>'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Professeur visiteur</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table>';
}

function EUC_V157_preparerEnvoi(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var detail=EUC_SUIVI_CLASSE_detailV156(payload.annee,payload.classeId,payload.periodeId);
  EUC_V157_assurerParametres_();
  var map=EUC_V157_paramMap_();

  return {
    to:EUC_V157_profMails_(detail),
    cc:EUC_V157_ccMails_(),
    objet:EUC_V157_rempl_(map.SUIVI_PFMP_EMAIL_OBJET&&map.SUIVI_PFMP_EMAIL_OBJET.Valeur,detail),
    message:EUC_V157_rempl_(map.SUIVI_PFMP_EMAIL_MESSAGE&&map.SUIVI_PFMP_EMAIL_MESSAGE.Valeur,detail),
    classe:detail.classe&&detail.classe.nom||'',
    periode:detail.periode&&detail.periode.libelle||''
  };
}

function EUC_V157_envoyerTableau(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var detail=EUC_SUIVI_CLASSE_detailV156(payload.annee,payload.classeId,payload.periodeId);
  var prep=EUC_V157_preparerEnvoi(payload);

  if(!prep.to.length)throw new Error('Aucun professeur destinataire avec une adresse email valide.');

  var safeMsg=EUC_V157_txt_(prep.message)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');

  MailApp.sendEmail({
    to:prep.to.join(','),
    cc:prep.cc.join(','),
    subject:prep.objet,
    htmlBody:'<div style="font-family:Arial,sans-serif">'+safeMsg+'</div><br>'+EUC_V157_htmlTable_(detail),
    name:'PFMP — Lycée Les Eucalyptus'
  });

  return {ok:true,to:prep.to,cc:prep.cc,objet:prep.objet};
}

function EUC_V157_afficherParametres(e){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  var tpl=HtmlService.createTemplateFromFile('Parametres_Envois_PFMP_V157');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.paramsJson=JSON.stringify(EUC_V157_lireParametres());
  return tpl.evaluate().setTitle('Paramètres des envois PFMP');
}
