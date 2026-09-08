/** Eucalyptus PFMP — v1.0.0-dev.66 — copier-coller Pronote + correspondances + multi-source LP/LGT + professeur principal + dates Grist normalisées. */
function EUC_IMPORT_exigerAdminTexte_(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0) throw new Error('Accès non autorisé.');
  return ctx;
}
function EUC_IMPORT_lireRecordsBruts_(table){try{return (EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records').records||[]);}catch(e){return [];}}
function EUC_IMPORT_lireRecords_(table){return EUC_IMPORT_lireRecordsBruts_(table).map(function(r){return Object.assign({id:r.id},r.fields||{});});}
function EUC_IMPORT_chargerClassesCamin_(){return EUC_IMPORT_lireRecordsBruts_('Classes').map(function(r){var f=r.fields||{};return {id:r.id,nom:String(f.Nom||f.Libelle||'').trim(),libelle:String(f.Libelle||f.Nom||'').trim(),formation:String(f.Formation||'').trim(),niveau:String(f.Niveau||'').trim(),etab:String(f.Etab||'').trim(),actif:f.Actif!==false};}).filter(function(r){return r.id&&r.nom;});}
function EUC_IMPORT_normaliserSourcePronote_(v){
  var s=String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_').replace(/[^A-Z0-9_-]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
  if(!s||s==='AUTO'||s==='AUTOMATIQUE')return 'AUTO';
  if(s==='LGT'||s.indexOf('GENERAL')>=0||s.indexOf('TECHNOLOG')>=0)return 'LGT';
  if(s==='LP'||s.indexOf('PROFESSION')>=0||s==='PRONOTE_LYCEE'||s==='PRONOTE_LP')return 'LP';
  return s;
}
function EUC_IMPORT_sourceDepuisEtab_(v){var s=String(v||'').toUpperCase();if(/(^|\W)LGT(\W|$)|GENERAL|TECHNOLOG/.test(s))return 'LGT';if(/(^|\W)LP(\W|$)|PROFESSION/.test(s))return 'LP';return '';}
function EUC_IMPORT_detecterSource_(parsed,annee,classes){
  var noms={};(parsed.rows||[]).forEach(function(r){var n=String(r.classe||'').trim().toUpperCase();if(n)noms[n]=true;});
  var scores={LP:0,LGT:0},parNom={};(classes||[]).forEach(function(c){parNom[String(c.nom||'').toUpperCase()]=c;parNom[String(c.libelle||'').toUpperCase()]=c;});
  Object.keys(noms).forEach(function(n){var c=parNom[n],src=c?EUC_IMPORT_sourceDepuisEtab_(c.etab):'';if(src)scores[src]++;});
  var corr=EUC_IMPORT_lireRecords_('EUC_CORRESPONDANCE_CLASSES_PRONOTE').filter(function(r){return r.Actif!==false&&(!r.Annee_scolaire||String(r.Annee_scolaire)===String(annee));});
  corr.forEach(function(r){var n=String(r.Nom_classe_Pronote||'').trim().toUpperCase();if(!noms[n])return;var src=EUC_IMPORT_normaliserSourcePronote_(r.Source_Pronote||'');if(src==='LP'||src==='LGT')scores[src]++;});
  var resolved='';if(scores.LP>0&&scores.LGT===0)resolved='LP';else if(scores.LGT>0&&scores.LP===0)resolved='LGT';else if(scores.LP>scores.LGT*2&&scores.LP>=3)resolved='LP';else if(scores.LGT>scores.LP*2&&scores.LGT>=3)resolved='LGT';
  return {source:resolved,scores:scores,fiable:!!resolved};
}
function EUC_IMPORT_chargerCorrespondances_(annee,sourcePronote){
  var source=EUC_IMPORT_normaliserSourcePronote_(sourcePronote);
  return EUC_IMPORT_lireRecords_('EUC_CORRESPONDANCE_CLASSES_PRONOTE').filter(function(r){var rs=EUC_IMPORT_normaliserSourcePronote_(r.Source_Pronote||'');return r.Actif!==false&&(!r.Annee_scolaire||String(r.Annee_scolaire)===String(annee))&&(!rs||rs===source);}).map(function(r){return {pronote:String(r.Nom_classe_Pronote||'').trim(),classeId:r.Classe_Grist||'',classeNom:String(r.Classe_Grist_nom||r.Classe_Grist_libelle||'').trim(),exclue:r.Exclure_import===true};});
}
function EUC_IMPORT_indexerCorrespondances_(classes,mappingsPersistes,mappingsTemporaires){var byId={},byNom={},map={};(classes||[]).forEach(function(c){byId[String(c.id)]=c;byNom[String(c.nom).toUpperCase()]=c;byNom[String(c.libelle).toUpperCase()]=c;});function add(pronote,idOrNom){var key=String(pronote||'').trim().toUpperCase();if(!key)return;var c=byId[String(idOrNom)]||byNom[String(idOrNom||'').trim().toUpperCase()];if(c&&c.actif)map[key]=c;}(mappingsPersistes||[]).forEach(function(m){if(!m.exclue)add(m.pronote,m.classeId||m.classeNom);});Object.keys(mappingsTemporaires||{}).forEach(function(k){add(k,mappingsTemporaires[k]);});(classes||[]).forEach(function(c){if(c.actif){var k=String(c.nom).toUpperCase();if(!map[k])map[k]=c;var l=String(c.libelle).toUpperCase();if(!map[l])map[l]=c;}});return map;}
function EUC_IMPORT_indexExclusions_(mappingsPersistes,exclusionsTemporaires){var out={};(mappingsPersistes||[]).forEach(function(m){if(m.exclue&&m.pronote)out[String(m.pronote).trim().toUpperCase()]=true;});(exclusionsTemporaires||[]).forEach(function(n){if(n)out[String(n).trim().toUpperCase()]=true;});return out;}
function EUC_IMPORT_preparerClasses_(parsed,classes,mappingsPersistes,mappingsTemporaires,exclusionsTemporaires){
  var index=EUC_IMPORT_indexerCorrespondances_(classes,mappingsPersistes,mappingsTemporaires),exclusions=EUC_IMPORT_indexExclusions_(mappingsPersistes,exclusionsTemporaires),stats={},inconnues={},exclues={},rows=[];
  parsed.rows.forEach(function(r){var original=String(r.classe||'').trim();r.classePronote=original;if(!original){rows.push(r);return;}stats[original]=(stats[original]||0)+1;if(exclusions[original.toUpperCase()]){exclues[original]=(exclues[original]||0)+1;r._exclueImport=true;return;}var c=index[original.toUpperCase()];if(c){r.classe=c.nom;r.classeGristId=c.id;}else{inconnues[original]=(inconnues[original]||0)+1;r.classe='__NON_CORRESPONDUE__'+original;}rows.push(r);});parsed.rows=rows;
  return {classesPronote:Object.keys(stats).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(n){var c=index[n.toUpperCase()],x=!!exclusions[n.toUpperCase()];return {pronote:n,effectif:stats[n],correspondue:!!c,classeGristId:c?c.id:'',classeGristNom:c?c.nom:'',exclue:x};}),inconnues:Object.keys(inconnues).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(n){return {pronote:n,effectif:inconnues[n]};}),exclues:Object.keys(exclues).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(n){return {pronote:n,effectif:exclues[n]};}),effectifExclu:Object.keys(exclues).reduce(function(s,n){return s+exclues[n];},0)};
}
function EUC_IMPORT_extraireProfesseursPrincipaux_(texte,parsed){
  var lines=String(texte||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(function(x){return x.trim();});if(lines.length<2)return;
  var sep=EUC_IMPORT_detecterSeparateur_(lines[0]),headers=EUC_IMPORT_lireCSV_(lines[0],sep).map(EUC_IMPORT_normaliserEntete_),idx=[];
  headers.forEach(function(h,i){if(h==='PP'||h.indexOf('PROFESSEUR PRINCIPAL')>=0||h.indexOf('PROF PRINCIPAL')>=0||h.indexOf('PROFESSEURS PRINCIPAUX')>=0)idx.push(i);});
  if(!idx.length)return;
  var byLine={};(parsed.rows||[]).forEach(function(r){byLine[String(r.ligne)]=r;});
  for(var n=1;n<lines.length;n++){var r=byLine[String(n+1)];if(!r)continue;var c=EUC_IMPORT_lireCSV_(lines[n],sep),vals=[];idx.forEach(function(i){var v=String(c[i]||'').trim();if(v&&vals.indexOf(v)<0)vals.push(v);});r.professeurPrincipal=vals.join(' / ');}
}
function EUC_IMPORT_dateExistanteISO_(v){
  if(v===null||v===undefined||v==='')return '';
  if(typeof v==='number'&&isFinite(v))return new Date(v*1000).toISOString().slice(0,10);
  var s=String(v).trim();
  if(/^\d{10}(?:\.\d+)?$/.test(s)){var n=Number(s);if(isFinite(n))return new Date(n*1000).toISOString().slice(0,10);}
  if(/^\d{13}$/.test(s)){var ms=Number(s);if(isFinite(ms))return new Date(ms).toISOString().slice(0,10);}
  return EUC_SUIVI_dateISO_(s);
}
function EUC_IMPORT_normaliserDatesExistantes_(rows){return (rows||[]).map(function(e){var x=Object.assign({},e);x.Date_naissance=EUC_IMPORT_dateExistanteISO_(e.Date_naissance);x.Date_entree=EUC_IMPORT_dateExistanteISO_(e.Date_entree);x.Date_sortie=EUC_IMPORT_dateExistanteISO_(e.Date_sortie);return x;});}
function EUC_IMPORT_chargerDonneesPreviewTexte_(annee,sourcePronote){
  var existing=[],imports=[],source=EUC_IMPORT_normaliserSourcePronote_(sourcePronote);
  try{existing=EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_("SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?",[annee]));existing=EUC_IMPORT_normaliserDatesExistantes_(existing);}catch(e){}
  if(source&&source!=='AUTO'){existing=existing.filter(function(e){var es=EUC_IMPORT_normaliserSourcePronote_(e.Source_Pronote||e.Source_import||'');return !es||es===source;});}
  try{imports=EUC_IMPORT_lireRecords_('EUC_IMPORTS_PRONOTE_PFMP').filter(function(i){var is=EUC_IMPORT_normaliserSourcePronote_(i.Source_Pronote||'');return !is||is===source;});}catch(e){}
  return {existing:existing,imports:imports,classes:EUC_IMPORT_chargerClassesCamin_(),correspondances:EUC_IMPORT_chargerCorrespondances_(annee,source)};
}
function EUC_IMPORT_enrichirModificationsIdentite_(preview,parsed,source){
  var parLigne={};(parsed.rows||[]).forEach(function(r){parLigne[String(r.ligne)]={nom:r.nom||'',prenom:r.prenom||'',professeurPrincipal:r.professeurPrincipal||'',sourcePronote:source||'',classePronote:r.classePronote||''};});
  preview.modifications=(preview.modifications||[]).map(function(m){var i=parLigne[String(m.ligne)]||{};return Object.assign({},m,i);});
  return preview;
}
function EUC_IMPORT_previsualiserTexte(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var texte=String(payload.texte||''),sourceDemandee=EUC_IMPORT_normaliserSourcePronote_(payload.sourcePronote||'AUTO');if(!texte.trim()) throw new Error('Aucune donnée Pronote collée.');
  var parsed=EUC_IMPORT_analyserTexte_(texte,{annee:payload.annee});EUC_IMPORT_extraireProfesseursPrincipaux_(texte,parsed);parsed.encoding='COPIER_COLLER';
  var classes=EUC_IMPORT_chargerClassesCamin_(),detection=EUC_IMPORT_detecterSource_(parsed,parsed.annee,classes),source=sourceDemandee==='AUTO'?detection.source:sourceDemandee;
  if(!source)throw new Error('Source Pronote indéterminée automatiquement. Choisissez LP ou LGT puis relancez l’analyse.');
  parsed.sourcePronote=source;parsed.empreinte=EUC_IMPORT_empreinte_(Utilities.newBlob(source+'\n'+texte,'text/plain').getBytes());
  var d=EUC_IMPORT_chargerDonneesPreviewTexte_(parsed.annee,source);d.classes=classes;var corr=EUC_IMPORT_preparerClasses_(parsed,d.classes,d.correspondances,payload.correspondances||{},payload.classesExclues||[]),offers=d.classes.filter(function(c){return c.actif;}).map(function(c){return {Code_classe:c.nom,Actif:true,Afficher_formulaire_PFMP:true};}),preview=EUC_IMPORT_previsualiser_(parsed,d.existing,offers,d.imports);
  EUC_IMPORT_enrichirModificationsIdentite_(preview,parsed,source);
  preview.sourcePronote=source;preview.sourceDemandee=sourceDemandee;preview.sourceDetection=detection;preview.classesCamin=d.classes.filter(function(c){return c.actif;});preview.classesPronote=corr.classesPronote;preview.classesInconnues=corr.inconnues;preview.classesExclues=corr.exclues;preview.tableCorrespondancePresente=d.correspondances.length>0;preview.correspondancesTemporaires=true;preview.compteurs.classesCaminDisponibles=preview.classesCamin.length;preview.compteurs.classesInconnues=corr.inconnues.length;preview.compteurs.classesEcartees=corr.exclues.length;preview.compteurs.elevesEcartes=corr.effectifExclu;preview.pretAValider=preview.pretAValider&&corr.inconnues.length===0;return preview;
}
function EUC_IMPORT_confirmerSimulationTexte(payload){var lock=LockService.getScriptLock();if(!lock.tryLock(1000)) throw new Error('Un autre import est déjà en cours.');try{EUC_IMPORT_exigerAdminTexte_();if(!payload||payload.confirmation!=='CONFIRMER_IMPORT') throw new Error('Validation humaine explicite obligatoire.');var mode=PropertiesService.getScriptProperties().getProperty('EUC_PFMP_PRONOTE_IMPORT_MODE')||'DRY_RUN';if(mode!=='DRY_RUN') throw new Error('Import réel non autorisé dans cette version.');var preview=EUC_IMPORT_previsualiserTexte(payload);if(!preview.pretAValider) throw new Error(preview.dejaImporte?'Fichier identique déjà importé.':'Prévisualisation bloquée par des anomalies ou classes non correspondantes.');return {statut:'SIMULATION',mode:'DRY_RUN',ecriture:false,sourcePronote:preview.sourcePronote,empreinte:preview.empreinte,compteurs:preview.compteurs};}finally{lock.releaseLock();}}