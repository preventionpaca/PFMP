/**
 * DEV566 — import Yparéo des apprentis et futurs apprentis.
 *
 * Le fichier est analysé dans le navigateur puis envoyé sous forme de lignes.
 * Le serveur ne rapproche que des classes exactes et ne déduit jamais une
 * classe C depuis une classe G. L'écriture est verrouillée en DRY_RUN tant que
 * la propriété EUC_DEV566_YPAREO_IMPORT_MODE ne vaut pas exactement LIVE.
 */
var EUC_DEV566_YPAREO_MODE_KEY_='EUC_DEV566_YPAREO_IMPORT_MODE';
var EUC_DEV566_YPAREO_MAPPINGS_KEY_='EUC_DEV566_YPAREO_MAPPINGS';
var EUC_DEV566_YPAREO_REQUEST_PREFIX_='EUC_DEV566_YPAREO_REQUEST_';
var EUC_DEV566_YPAREO_ALLOWED_=['TPMMA','TPEEB','TSEC','CQPM'];

function EUC_DEV566_t_(value){return String(value==null?'':value).trim();}
function EUC_DEV566_n_(value){var n=Number(value);return isFinite(n)?n:0;}
function EUC_DEV566_norm_(value){return EUC_DEV566_t_(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();}
function EUC_DEV566_key_(value){return EUC_DEV566_norm_(value).replace(/\s+/g,'');}
function EUC_DEV566_pick_(row,names){row=row||{};var byKey={};Object.keys(row).forEach(function(key){byKey[EUC_DEV566_key_(key)]=row[key];});for(var i=0;i<names.length;i++){var value=byKey[EUC_DEV566_key_(names[i])];if(value!==undefined&&EUC_DEV566_t_(value)!=='')return value;}return'';}
function EUC_DEV566_date_(value){
  var text=EUC_DEV566_t_(value),m;if(!text)return'';
  if((m=text.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[1]+'-'+m[2]+'-'+m[3];
  if((m=text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)))return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return'';
}
function EUC_DEV566_defaultMappings_(){return[
  {source:'TPMMA',classe:'TPMMA'},
  {source:'TPEEB',classe:'TPEEB'},
  {source:'TSEC',classe:'TSEC'},
  {source:'CQPM',classe:'CQPM ASC'}
];}
/* Groupe de mixité : les apprentis sont déjà élèves d'une classe du lycée (Pronote). On les rattache
 * à leur fiche existante (INE, ou nom + prénom + naissance) sans jamais créer d'élève ni changer de classe. */
var EUC_DEV566_RATTACHER_='__RATTACHER__';
function EUC_DEV566_validateMappings_(value){
  var out=[],seen={};(Array.isArray(value)?value:[]).forEach(function(item){var source=EUC_DEV566_norm_(item&&item.source),classe=EUC_DEV566_t_(item&&item.classe);if(!source||!classe||seen[source])return;seen[source]=true;out.push({source:source,classe:classe});});
  if(!out.length)throw new Error('La table de correspondance Yparéo est vide.');return out;
}
function EUC_DEV566_mappings_(){var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV566_YPAREO_MAPPINGS_KEY_)||'';}catch(e){}if(raw)try{return EUC_DEV566_validateMappings_(JSON.parse(raw));}catch(e2){}return EUC_DEV566_defaultMappings_();}
function EUC_DEV566_mode_(){try{return PropertiesService.getScriptProperties().getProperty(EUC_DEV566_YPAREO_MODE_KEY_)==='LIVE'?'LIVE':'DRY_RUN';}catch(e){return'DRY_RUN';}}
function EUC_DEV566_classes_(){
  var rows=[];try{rows=EUC_IMPORT_chargerClassesCamin_()||[];}catch(e){rows=[];}
  /* DEV578 : un même nom peut exister deux fois (ex. « 1MELEC G » du LP et « 1MELEC G » du GRETA, formation
   * continue). Plutôt que d'en choisir une d'office, les homonymes sont distingués par leur établissement :
   * « 1MELEC G (GRETA) » / « 1MELEC G (LP) » — et par leur numéro si l'établissement ne suffit pas.
   * Les classes au nom unique gardent leur libellé : les correspondances déjà enregistrées restent valables. */
  var liste=rows.map(function(row){return{id:EUC_DEV564_classId_(row),classe:EUC_DEV564_classLabel_(row),etab:String(row.etab||'').trim(),actif:row.actif!==false};}).filter(function(row){return row.id&&row.classe&&row.actif;}),compte={},compteEtab={};
  liste.forEach(function(r){var k=EUC_DEV566_key_(r.classe);compte[k]=(compte[k]||0)+1;var ke=k+'|'+r.etab.toUpperCase();compteEtab[ke]=(compteEtab[ke]||0)+1;});
  liste.forEach(function(r){var k=EUC_DEV566_key_(r.classe);if(compte[k]<2)return;r.classe=r.classe+(r.etab&&compteEtab[k+'|'+r.etab.toUpperCase()]<2?' ('+r.etab+')':' (n° '+r.id+')');});
  return liste.map(function(r){return{id:r.id,classe:r.classe,actif:true};}).sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});
}
/* Bascule DRY_RUN / LIVE depuis la page (administration seulement). */
function EUC_DEV566_setMode(q){EUC_DEV368_admin();PropertiesService.getScriptProperties().setProperty(EUC_DEV566_YPAREO_MODE_KEY_,q&&q.live===true?'LIVE':'DRY_RUN');return EUC_DEV566_importConfig();}
function EUC_DEV566_importConfig(){EUC_DEV368_admin();return{ok:true,mode:EUC_DEV566_mode_(),mappings:EUC_DEV566_mappings_(),classes:EUC_DEV566_classes_(),niveau:'AUTRES_FORMATIONS',formats:['csv','xls','xlsx']};}
function EUC_DEV566_saveMappings(q){EUC_DEV368_admin();var mappings=EUC_DEV566_validateMappings_(q&&q.mappings);var classes={},unknown=[];EUC_DEV566_classes_().forEach(function(row){classes[EUC_DEV566_key_(row.classe)]=true;});mappings.forEach(function(row){if(row.classe!==EUC_DEV566_RATTACHER_&&!classes[EUC_DEV566_key_(row.classe)])unknown.push(row.classe);});if(unknown.length)throw new Error('Classe(s) cible(s) introuvable(s) : '+unknown.join(', ')+'.');PropertiesService.getScriptProperties().setProperty(EUC_DEV566_YPAREO_MAPPINGS_KEY_,JSON.stringify(mappings));return EUC_DEV566_importConfig();}

function EUC_DEV566_groupCode_(group,mappings){var key=EUC_DEV566_norm_(group),matches=[];(mappings||[]).forEach(function(row){if(key.indexOf(EUC_DEV566_norm_(row.source))>=0)matches.push(row);});return matches.length===1?matches[0]:null;}
function EUC_DEV566_line_(row,index,mappings,classByName){
  var group=EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_GROUPE_APPRENANT','NOM_GROUPE','GROUPE','CLASSE'])),mapping=EUC_DEV566_groupCode_(group,mappings),status=EUC_DEV566_norm_(EUC_DEV566_pick_(row,['STATUT_APPRENANT','STATUT','SITUATION'])),nom=EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_APPRENANT','NOM'])),prenom=EUC_DEV566_t_(EUC_DEV566_pick_(row,['PRENOM_APPRENANT','PRENOM'])),ine=EUC_DEV566_t_(EUC_DEV566_pick_(row,['INE_APPRENANT','NUMERO_NATIONAL','INE'])),birth=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_NAISSANCE_APPRENANT','DATE_NAISSANCE'])),siret=EUC_DEV566_t_(EUC_DEV566_pick_(row,['SIRET_ENTREPRISE','SIRET'])).replace(/\D/g,''),classe=mapping&&classByName[EUC_DEV566_key_(mapping.classe)],issues=[];
  if(!nom||!prenom)issues.push('Nom ou prénom manquant');if(!mapping)issues.push('Groupe Yparéo sans correspondance unique');var rattacher=!!mapping&&mapping.classe===EUC_DEV566_RATTACHER_;if(mapping&&!classe&&!rattacher)issues.push('Classe cible absente du référentiel');
  var future=/SANS ENTREPRISE|FUTUR/.test(status),apprentice=/APPRENTI/.test(status)&&!future;
  /* Export « Groupe → Export » : la SITUATION est libre (« CFAI BTS 2A », « STAGIAIRE FP… »,
   * « SALARIE »…). Avec un SIRET, l'apprenant a son entreprise ; sans SIRET, il est importé
   * sans entreprise (futur apprenti) : un import suivant ajoutera l'entreprise dès qu'elle
   * figure dans Yparéo. */
  if(!future&&!apprentice){if(siret.length===14)apprentice=true;else future=true;}
  else if(apprentice&&siret.length!==14){apprentice=false;future=true;}
  var debut=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_DEB_CONTRAT','DATE_DEBUT_CONTRAT','DEBUT_CONTRAT','DATE_DEBUT'])),fin=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_FIN_CONTRAT','FIN_CONTRAT','DATE_FIN']));if(apprentice&&(!debut||!fin))issues.push('Dates de contrat incomplètes');
  var exportGroupe=Object.keys(row||{}).some(function(k){return /_ENT$/i.test(k);});
  /* Export de groupe : colonnes entreprise suffixées _ENT ; CP et VILLE seuls sont ceux de l'apprenant. */
  var adresse=[['ADR1_ENTREPRISE','ADR1_ENT'],['ADR2_ENTREPRISE','ADR2_ENT'],['ADR3_ENTREPRISE','ADR3_ENT'],['ADR4_ENTREPRISE','ADR4_ENT']].map(function(names){return EUC_DEV566_t_(EUC_DEV566_pick_(row,names));}).filter(Boolean).join(' '),ma=[EUC_DEV566_t_(EUC_DEV566_pick_(row,['PRENOM_MA'])),EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_MA']))].filter(Boolean).join(' '),resp=[EUC_DEV566_t_(EUC_DEV566_pick_(row,['PRENOM_RESP_ENT'])),EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_RES_ENT','NOM_RESP_ENT']))].filter(Boolean).join(' ');
  return{index:index,group:group,rattacher:rattacher,source:mapping&&mapping.source||'',classeId:classe&&classe.id||0,classe:rattacher?'':(classe&&classe.classe||mapping&&mapping.classe||''),nom:nom,prenom:prenom,ine:ine,dateNaissance:birth,statusSource:status,kind:future?'FUTUR_APPRENTI':(apprentice?'APPRENTI':'INCONNU'),issues:issues,siret:siret,debut:debut,fin:fin,nomEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_ENTREPRISE','RAISON_SOCIALE_ENTREPRISE'])),nomCommercial:EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_COMMERCIAL_ENTREPRISE','ENSEIGNE_ENTREPRISE'])),adresse:adresse||EUC_DEV566_t_(EUC_DEV566_pick_(row,['ADRESSE_ENTREPRISE','ADRESSE'])),cp:EUC_DEV566_t_(EUC_DEV566_pick_(row,exportGroupe?['CP_ENTREPRISE','CP_ENT']:['CP_ENTREPRISE','CODE_POSTAL_ENTREPRISE','CODE_POSTAL'])),ville:EUC_DEV566_t_(EUC_DEV566_pick_(row,exportGroupe?['VILLE_ENTREPRISE','VILLE_ENT']:['VILLE_ENTREPRISE','VILLE'])),telEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['PORTABLE_ENTREPRISE','TEL_ENTREPRISE','TELEPHONE_ENTREPRISE','TEL1_ENT','TEL2_ENT'])),mailEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['EMAIL_ENTREPRISE','MAIL_ENTREPRISE','EMAIL_ENT'])),responsableEntreprise:resp||ma||EUC_DEV566_t_(EUC_DEV566_pick_(row,['MAITRE_APPRENTISSAGE','RESPONSABLE_ENTREPRISE'])),tuteur:ma||EUC_DEV566_t_(EUC_DEV566_pick_(row,['MAITRE_APPRENTISSAGE','TUTEUR'])),telTuteur:EUC_DEV566_t_(EUC_DEV566_pick_(row,['PORTABLE_MA','TEL_MAITRE_APPRENTISSAGE','TELEPHONE_TUTEUR','TEL1_MA','TEL2_MA'])),mailTuteur:EUC_DEV566_t_(EUC_DEV566_pick_(row,['EMAIL_MA','MAIL_MAITRE_APPRENTISSAGE','EMAIL_TUTEUR']))};
}
/* Date de naissance lue dans Grist : colonne Date (secondes depuis 1970) ou texte. L'import écrit
 * une vraie date ; la relire en texte seul empêchait de retrouver les élèves déjà importés (doublons). */
function EUC_DEV566_naissance_(v){
  if(v===null||v===undefined||v==='')return '';
  if(typeof v==='number'&&isFinite(v))return new Date((v<1e11?v*1000:v)).toISOString().slice(0,10);
  try{if(typeof EUC_SUIVI2_date_==='function'){var z=EUC_SUIVI2_date_(v);if(z)return z;}}catch(e){}
  return EUC_DEV566_date_(v);
}
function EUC_DEV566_existingStudents_(anneeId){var out={ine:{},identity:{},nomPrenom:{}};try{(EUC_IMPORT_lireRecordsBruts_('EUC_ELEVES_PFMP')||[]).forEach(function(record){var f=record.fields||record;if(Number(f.Annee_scolaire)!==Number(anneeId)||f.Actif===false)return;var ine=EUC_DEV566_key_(f.Numero_national),birth=EUC_DEV566_naissance_(f.Date_naissance);var identity=EUC_DEV566_key_(f.Nom)+'|'+EUC_DEV566_key_(f.Prenom_usage||f.Prenom)+'|'+birth;if(ine)out.ine[ine]=(out.ine[ine]||[]).concat([record]);out.identity[identity]=(out.identity[identity]||[]).concat([record]);var np=EUC_DEV566_key_(f.Nom)+'|'+EUC_DEV566_key_(f.Prenom_usage||f.Prenom);out.nomPrenom[np]=(out.nomPrenom[np]||[]).concat([record]);});}catch(e2){}return out;}
function EUC_DEV566_analyze_(q){
  q=q||{};var year=EUC_DEV368_year(q.annee),rows=Array.isArray(q.rows)?q.rows:[];if(!rows.length)throw new Error('Le fichier Yparéo ne contient aucune ligne.');if(rows.length>1000)throw new Error('Un import est limité à 1 000 lignes.');var mappings=EUC_DEV566_validateMappings_(q.mappings||EUC_DEV566_mappings_()),classByName={};EUC_DEV566_classes_().forEach(function(row){classByName[EUC_DEV566_key_(row.classe)]=row;});var yearRow=EUC_IMPORT_lireAnnee_(year),existing=EUC_DEV566_existingStudents_(yearRow.id),lines=rows.map(function(row,index){var line=EUC_DEV566_line_(row,index+1,mappings,classByName);if(!line.source&&!mappings.some(function(m){return EUC_DEV566_norm_(line.group).indexOf(EUC_DEV566_norm_(m.source))>=0;})){line.issues=[];line.action='IGNORER';line.ignore=true;line.ready=false;return line;}var matches=line.ine?existing.ine[EUC_DEV566_key_(line.ine)]||[]:existing.identity[EUC_DEV566_key_(line.nom)+'|'+EUC_DEV566_key_(line.prenom)+'|'+line.dateNaissance]||[];if(line.rattacher)return EUC_DEV566_rattachement_(line,matches,existing);if(matches.length>1)line.issues.push('Élève existant ambigu');if(matches.length===1){line.eleveId=EUC_DEV566_n_(matches[0].id);line.action='METTRE_A_JOUR';}else line.action='CREER';line.ready=!line.issues.length;return line;});return{ok:true,mode:EUC_DEV566_mode_(),annee:year,niveau:'AUTRES_FORMATIONS',lines:lines,total:lines.length,ready:lines.filter(function(line){return line.ready}).length,blocked:lines.filter(function(line){return!line.ready&&!line.ignore}).length,ignored:lines.filter(function(line){return line.ignore}).length,scope:'YPAREO_APPRENTISSAGE'};
}
/* Ligne d'un groupe de mixité : seulement les apprentis sous contrat (SIRET), seulement un élève existant
 * trouvé sans ambiguïté ; sinon la ligne est ignorée avec son motif (jamais bloquante, jamais créée). */
function EUC_DEV566_rattachement_(line,matches,existing){
  if(!matches.length)matches=existing.identity[EUC_DEV566_key_(line.nom)+'|'+EUC_DEV566_key_(line.prenom)+'|'+line.dateNaissance]||(existing.nomPrenom||{})[EUC_DEV566_key_(line.nom)+'|'+EUC_DEV566_key_(line.prenom)]||[];
  var motif='';if(line.kind!=='APPRENTI')motif='Mixité : pas encore d’entreprise dans Yparéo';else if(!matches.length)motif='Mixité : élève introuvable dans les classes du lycée';else if(matches.length>1)motif='Mixité : plusieurs fiches pour cet élève (voir « Élèves en double »)';
  if(motif||line.issues.length){line.motif=motif||line.issues.join(', ');line.issues=[];line.action='IGNORER';line.ignore=true;line.ready=false;return line;}
  var f=matches[0].fields||matches[0];line.eleveId=EUC_DEV566_n_(matches[0].id);line.classeId=EUC_DEV566_n_(Array.isArray(f.Classe)?f.Classe[1]:f.Classe);line.classe=EUC_DEV566_t_(f.Code_classe_importe);line.action='RATTACHER';line.ready=true;return line;
}
function EUC_DEV566_analyze(q){EUC_DEV368_admin();return EUC_DEV566_analyze_(q);}
function EUC_DEV566_createStudent_(line,yearRow,lot){var now=EUC_IMPORT_nowGrist_(),birth=EUC_IMPORT_dateGrist_(line.dateNaissance),key='YPAREO|'+(line.ine||[EUC_DEV566_key_(line.nom),EUC_DEV566_key_(line.prenom),line.dateNaissance].join('|')),fields={Identifiant_import:key,Numero_national:line.ine||'',Nom:line.nom,Prenom:line.prenom,Prenom_usage:line.prenom,Date_naissance:birth,Classe:line.classeId,Code_classe_importe:line.classe,Annee_scolaire:yearRow.id,Source_Pronote:'YPAREO',Source_import:'YPAREO',Cle_rapprochement:key,Cle_inscription_annuelle:yearRow.id+'|'+key,Statut_rapprochement:'RAPPROCHE',Statut_scolarite:'ACTIF',Date_derniere_presence_import:now,Present_dernier_import:true,Actif:true,Date_creation:now,Date_modification:now,Identifiant_lot_import:lot,Numero_version:1};var result=EUC_ENT_grist('post','/tables/EUC_ELEVES_PFMP/records',{records:[{fields:fields}]});return EUC_DEV566_n_(result&&result.records&&result.records[0]&&result.records[0].id);}
function EUC_DEV566_updateStudentClass_(eleveId,line,lot){
  EUC_ENT_grist('patch','/tables/EUC_ELEVES_PFMP/records',{records:[{id:EUC_DEV566_n_(eleveId),fields:{Classe:line.classeId,Code_classe_importe:line.classe,Source_import:'YPAREO',Date_derniere_presence_import:EUC_IMPORT_nowGrist_(),Present_dernier_import:true,Actif:true,Date_modification:EUC_IMPORT_nowGrist_(),Identifiant_lot_import:lot}}]});
}
/* Fiche d'apprentissage à compléter pour une ligne Yparéo, sans jamais créer de doublon :
 * - même SIRET déjà présent : on met à jour ce contrat ;
 * - apprenti dont la fiche est encore « sans entreprise » : on la complète ;
 * - ligne sans entreprise alors qu'un contrat existe : on ne touche à rien (pas d'effacement) ;
 * - sinon : nouvelle fiche. */
function EUC_DEV566_choixFiche_(line,fiches){
  var t=function(v){return String(v==null?'':v).replace(/\D/g,'');},avec=fiches.filter(function(f){return t(f.siret).length===14&&!f.rupture;}),sans=fiches.filter(function(f){return t(f.siret).length!==14&&!f.rupture;});
  if(line.kind==='APPRENTI'){var meme=fiches.filter(function(f){return t(f.siret)===t(line.siret);})[0];if(meme)return{rowId:meme.id};if(sans[0])return{rowId:sans[0].id};return{nouveau:true};}
  if(avec.length)return{ignorer:true};if(sans[0])return{rowId:sans[0].id};return{nouveau:!fiches.length};
}
function EUC_DEV566_fichesParEleve_(){
  var cols=EUC_DEV449_cols_(),cE=EUC_DEV449_col_(cols,['Eleve','Élève','Eleve_id']),cS=EUC_DEV449_col_(cols,['SIRET']),cR=EUC_DEV449_col_(cols,['Date_rupture_contrat','Date_rupture']),par={};
  (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(EUC_DEV449_TABLE_)+'/records',null).records||[]).forEach(function(r){var f=r.fields||{};if(f.Actif===false)return;var e=EUC_DEV449_ref_(f[cE]);if(!e)return;(par[e]=par[e]||[]).push({id:Number(r.id),siret:cS?f[cS]:'',rupture:cR?f[cR]:''});});
  Object.keys(par).forEach(function(k){par[k].sort(function(a,b){return b.id-a.id;});});return par;
}
function EUC_DEV566_import(q){
  q=q||{};EUC_DEV368_admin();if(EUC_DEV566_mode_()!=='LIVE')throw new Error('Import Yparéo désactivé : prévisualisation uniquement (DRY_RUN).');if(q.confirmed!==true)throw new Error('La confirmation explicite de l’import est obligatoire.');var requestId=EUC_DEV566_key_(q.requestId);if(requestId.length<12)throw new Error('Identifiant de requête invalide.');var cache=CacheService.getScriptCache(),cacheKey=EUC_DEV566_YPAREO_REQUEST_PREFIX_+requestId;if(cache.get(cacheKey))return{ok:true,duplicate:true};var analysis=EUC_DEV566_analyze_(q);if(analysis.blocked)throw new Error(analysis.blocked+' ligne(s) doivent être corrigées avant import.');var yearRow=EUC_IMPORT_lireAnnee_(analysis.annee),fiches=EUC_DEV566_fichesParEleve_(),ignores=0,created=0,updated=0,rattaches=0,lot='YPAREO-'+new Date().toISOString();analysis.lines.forEach(function(line){if(line.ignore)return;var eleveId=line.eleveId;if(line.rattacher){if(!eleveId)return;rattaches++;}else if(!eleveId){eleveId=EUC_DEV566_createStudent_(line,yearRow,lot);created++;}else{EUC_DEV566_updateStudentClass_(eleveId,line,lot);updated++;}if(!eleveId)throw new Error('Création de l’élève impossible.');var choix=EUC_DEV566_choixFiche_(line,fiches[eleveId]||[]);if(choix.ignorer){ignores++;return;}var enreg=EUC_DEV449_saveApprenti({eleveId:eleveId,classeId:line.classeId,annee:analysis.annee,rowId:choix.rowId||0,nouveauContrat:!!choix.nouveau,futurApprenti:line.kind==='FUTUR_APPRENTI',dateContrat:line.debut,debut:line.debut,fin:line.fin,siret:line.siret,nomEntreprise:line.nomEntreprise,nomCommercial:line.nomCommercial,adresse:line.adresse,cp:line.cp,ville:line.ville,telEntreprise:line.telEntreprise,mailEntreprise:line.mailEntreprise,responsableEntreprise:line.responsableEntreprise,tuteur:line.tuteur,telTuteur:line.telTuteur,mailTuteur:line.mailTuteur});if(choix.nouveau&&enreg&&enreg.rowId)(fiches[eleveId]=fiches[eleveId]||[]).unshift({id:Number(enreg.rowId),siret:line.siret,rupture:''});});cache.put(cacheKey,'1',21600);return{ok:true,created:created,updated:updated,rattaches:rattaches,ignores:ignores,total:analysis.lines.length};
}
function EUC_DEV566_afficherImportYpareo(e){EUC_DEV368_admin();var t=HtmlService.createTemplateFromFile('Import_Ypareo_DEV566'),p=e&&e.parameter||{},b=EUC_DEV526_bootMissions_(p);b.params={annee:EUC_DEV368_t(p.annee)};t.bootJson=JSON.stringify(b);return t.evaluate().setTitle('Import apprentis Yparéo').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}

/* DEV566 — Doublons des premiers imports : une même clé d'inscription (Cle_inscription_annuelle)
 * portée par plusieurs fiches élève actives créées par Yparéo. La plus ancienne est gardée ; les
 * autres, et leurs fiches d'apprentissage, sont désactivées (Actif = faux), jamais supprimées.
 * classesRetirees : codes de classe importés par erreur (fiches Yparéo de l'année désactivées). */
function EUC_DEV566_nettoyage_(annee,classesRetirees){
  var yearRow=EUC_IMPORT_lireAnnee_(EUC_DEV368_year(annee)),retirer={},parCle={},eleves=[],apprentis=[];
  (classesRetirees||[]).forEach(function(c){if(EUC_DEV566_t_(c))retirer[EUC_DEV566_key_(c)]=true;});
  (EUC_IMPORT_lireRecordsBruts_('EUC_ELEVES_PFMP')||[]).forEach(function(r){var f=r.fields||r;if(f.Actif===false||Number(f.Annee_scolaire)!==Number(yearRow.id)||String(f.Source_import||'')!=='YPAREO')return;var x={id:Number(r.id),nom:EUC_DEV566_t_(f.Nom)+' '+EUC_DEV566_t_(f.Prenom),classe:EUC_DEV566_t_(f.Code_classe_importe)};if(retirer[EUC_DEV566_key_(x.classe)]){x.motif='classe retirée';eleves.push(x);return;}var cle=EUC_DEV566_t_(f.Cle_inscription_annuelle)||(EUC_DEV566_key_(f.Nom)+'|'+EUC_DEV566_key_(f.Prenom)+'|'+EUC_DEV566_naissance_(f.Date_naissance));(parCle[cle]=parCle[cle]||[]).push(x);});
  Object.keys(parCle).forEach(function(k){var l=parCle[k].sort(function(a,b){return a.id-b.id;});l.slice(1).forEach(function(x){x.motif='doublon de la fiche '+l[0].id;eleves.push(x);});});
  var ids={};eleves.forEach(function(x){ids[x.id]=true;});
  var cols=EUC_DEV449_cols_(),cE=EUC_DEV449_col_(cols,['Eleve','Élève','Eleve_id']);
  (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(EUC_DEV449_TABLE_)+'/records',null).records||[]).forEach(function(r){var f=r.fields||{};if(f.Actif!==false&&ids[EUC_DEV449_ref_(f[cE])])apprentis.push(Number(r.id));});
  return{annee:yearRow,eleves:eleves,apprentis:apprentis};
}
function EUC_DEV566_nettoyerDoublons(q){
  EUC_DEV368_admin();q=q||{};var n=EUC_DEV566_nettoyage_(q.annee,q.classesRetirees);
  var resume={ok:true,eleves:n.eleves.length,apprentis:n.apprentis.length,doublons:n.eleves.filter(function(x){return/^doublon/.test(x.motif);}).length,classesRetirees:n.eleves.filter(function(x){return x.motif==='classe retirée';}).length,exemples:n.eleves.slice(0,12).map(function(x){return x.nom+' ('+x.classe+') — '+x.motif;})};
  if(q.confirmation!=='DESACTIVER')return Object.assign(resume,{apercu:true});
  var lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw new Error('Une autre opération est en cours. Réessayez dans un instant.');
  try{
    for(var i=0;i<n.eleves.length;i+=100)EUC_ENT_grist('patch','/tables/EUC_ELEVES_PFMP/records',{records:n.eleves.slice(i,i+100).map(function(x){return{id:x.id,fields:{Actif:false}};})});
    for(var j=0;j<n.apprentis.length;j+=100)EUC_DEV190_api_('patch','/tables/'+encodeURIComponent(EUC_DEV449_TABLE_)+'/records',{records:n.apprentis.slice(j,j+100).map(function(id){return{id:id,fields:{Actif:false}};})});
  }finally{lock.releaseLock();}
  try{if(typeof EUC_DEV462_invalidateApprenticeViews_==='function')EUC_DEV462_invalidateApprenticeViews_({});}catch(e){}
  return Object.assign(resume,{apercu:false});
}
