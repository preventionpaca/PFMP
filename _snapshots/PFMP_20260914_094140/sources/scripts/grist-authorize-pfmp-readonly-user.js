'use strict';
const fs=require('fs');
const DOC_ID='j1jDArBkzi7P',TABLE='EUC_UTILISATEURS_PFMP',AUTH='AUTORISER_DDFPT_LECTURE_SEULE_COPIE';
const EMAIL=String(process.env.EUC_PFMP_AUTHORIZED_EMAIL||'').trim().toLowerCase();
const columns=[
  {id:'Email',fields:{label:'Adresse institutionnelle',type:'Text'}},
  {id:'Nom_affichage',fields:{label:'Nom affiché',type:'Text'}},
  {id:'Role',fields:{label:'Rôle',type:'Text'}},
  {id:'Actif',fields:{label:'Actif',type:'Bool'}},
  {id:'Acces_suivi_PFMP',fields:{label:'Accès au suivi PFMP',type:'Bool'}},
  {id:'Mode_acces',fields:{label:'Mode d’accès',type:'Text'}},
  {id:'Classes_autorisees',fields:{label:'Classes autorisées',type:'Text'}},
  {id:'Peut_voir_toutes_classes',fields:{label:'Voir toutes les classes',type:'Bool'}},
  {id:'Peut_modifier',fields:{label:'Peut modifier',type:'Bool'}},
  {id:'Peut_saisir',fields:{label:'Peut saisir',type:'Bool'}},
  {id:'Peut_annuler',fields:{label:'Peut annuler',type:'Bool'}},
  {id:'Peut_supprimer',fields:{label:'Peut supprimer',type:'Bool'}},
  {id:'Peut_purger_tests',fields:{label:'Peut purger les tests',type:'Bool'}},
  {id:'Courriel_autorise',fields:{label:'Envoi de courriel autorisé',type:'Bool'}},
  {id:'Utilisable_production',fields:{label:'Utilisable en production',type:'Bool'}}
];
function stop(message){throw new Error(message)}
if(process.env.EUC_PFMP_USER_AUTHORIZATION!==AUTH)stop('Autorisation explicite absente.');
if(!/^[^@\s]+@lycee-les-eucalyptus\.org$/.test(EMAIL))stop('Adresse institutionnelle autorisée absente ou invalide.');
const tokenFile=process.env.EUC_PFMP_GRIST_TOKEN_FILE;if(!tokenFile||!fs.existsSync(tokenFile))stop('Jeton temporaire absent.');
const realToken=fs.realpathSync(tokenFile),stat=fs.statSync(realToken);if(realToken!=='/tmp/euc_grist_recipe_token'||!stat.isFile()||(stat.mode&0o077)!==0)stop('Le jeton doit être le fichier privé autorisé.');
const token=fs.readFileSync(realToken,'utf8').trim();if(!token)stop('Jeton vide.');
const base=`https://docs.getgrist.com/api/docs/${DOC_ID}`;
async function api(method,route,body){const r=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),text=await r.text();if(!r.ok)stop(`Grist a refusé ${method} ${route} (${r.status}).`);return text?JSON.parse(text):{};}
(async()=>{
  const tables=(await api('GET','/tables')).tables||[],exists=tables.some(t=>t.id===TABLE);if(!exists)await api('POST','/tables',{tables:[{id:TABLE,columns}]});
  else {const actual=(await api('GET',`/tables/${TABLE}/columns`)).columns||[],byId=new Map(actual.map(c=>[c.id,c.fields.type])),missing=columns.filter(c=>!byId.has(c.id)),conflicts=columns.filter(c=>byId.has(c.id)&&byId.get(c.id)!==c.fields.type);if(conflicts.length)stop(`Conflits de types (${conflicts.length}).`);if(missing.length)await api('POST',`/tables/${TABLE}/columns`,{columns:missing});}
  const wanted={Email:EMAIL,Nom_affichage:'DDFPT — lecture seule',Role:'DDFPT',Actif:true,Acces_suivi_PFMP:true,Mode_acces:'LECTURE_SEULE',Classes_autorisees:'',Peut_voir_toutes_classes:true,Peut_modifier:false,Peut_saisir:false,Peut_annuler:false,Peut_supprimer:false,Peut_purger_tests:false,Courriel_autorise:false,Utilisable_production:false};
  let records=(await api('GET',`/tables/${TABLE}/records`)).records||[],matches=records.filter(r=>String(r.fields.Email||'').trim().toLowerCase()===EMAIL);if(matches.length>1)stop('Doublons préexistants détectés : aucune écriture.');
  let operation='unchanged';if(!matches.length){await api('POST',`/tables/${TABLE}/records`,{records:[{fields:wanted}]});operation='created';}else if(Object.keys(wanted).some(k=>(matches[0].fields[k]??null)!==(wanted[k]??null))){await api('PATCH',`/tables/${TABLE}/records`,{records:[{id:matches[0].id,fields:wanted}]});operation='updated';}
  records=(await api('GET',`/tables/${TABLE}/records`)).records||[];matches=records.filter(r=>String(r.fields.Email||'').trim().toLowerCase()===EMAIL);const f=matches[0]&&matches[0].fields,valid=matches.length===1&&f.Role==='DDFPT'&&f.Actif===true&&f.Acces_suivi_PFMP===true&&f.Mode_acces==='LECTURE_SEULE'&&f.Peut_modifier===false&&f.Peut_saisir===false&&f.Peut_annuler===false&&f.Peut_supprimer===false&&f.Peut_purger_tests===false&&f.Courriel_autorise===false&&f.Utilisable_production===false;if(!valid)stop('Contrôle final des autorisations échoué.');
  console.log(JSON.stringify({success:true,docId:DOC_ID,table:TABLE,tableCreated:!exists,operation,matchingUsers:1,emailNormalized:true,role:'DDFPT',active:true,mode:'LECTURE_SEULE',canModify:false,canDelete:false,emailSending:false,productionAccess:false},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{try{fs.unlinkSync(realToken);}catch(e){console.error('Suppression du jeton impossible.');process.exitCode=1;}});
