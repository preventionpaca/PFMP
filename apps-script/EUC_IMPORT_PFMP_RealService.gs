/** Eucalyptus PFMP — v1.0.0-dev.77 — import réel Pronote vers EUC_ELEVES_PFMP + responsables. */
var EUC_IMPORT_ELEVES_TABLE_='EUC_ELEVES_PFMP';
function EUC_IMPORT_colonne_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_IMPORT_assurerTableEleves_(){
  var t=EUC_IMPORT_ELEVES_TABLE_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;}),c=EUC_IMPORT_colonne_;
  var cols=[
    c('Identifiant_Pronote','Identifiant Pronote'),c('Numero_Pronote','Numéro Pronote'),c('Numero_national','Numéro national'),c('Identifiant_import','Identifiant import'),
    c('Nom','Nom'),c('Prenom','Prénom'),c('Prenom_usage','Prénom d’usage'),c('Date_naissance','Date de naissance','Date'),
    c('Classe','Classe','Ref:Classes'),c('Code_classe_importe','Code classe importé'),c('Annee_scolaire','Année scolaire','Ref:Annees_Scolaires'),
    c('Professeur_principal','Professeur principal'),c('Source_Pronote','Source Pronote'),c('Source_import','Source de l’import'),
    c('Cle_rapprochement','Clé de rapprochement'),c('Cle_inscription_annuelle','Clé inscription annuelle'),c('Statut_rapprochement','Statut du rapprochement'),
    c('Statut_scolarite','Statut de scolarité'),c('Date_entree','Date d’entrée','Date'),c('Date_sortie','Date de sortie','Date'),
    c('Sortie_confirmee','Sortie confirmée','Bool'),c('Date_derniere_presence_import','Dernière présence dans un import','DateTime'),c('Present_dernier_import','Présent dans le dernier import','Bool'),
    c('Actif','Actif','Bool'),c('Date_creation','Date de création','DateTime'),c('Date_modification','Date de modification','DateTime'),
    c('Identifiant_lot_import','Identifiant du lot d’import'),c('Empreinte_import','Empreinte de l’import'),c('Numero_version','Numéro de version','Int')
  ];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});return {tableCreee:true,colonnesCreees:cols.map(function(x){return x.id;})};}
  var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});
  return {tableCreee:false,colonnesCreees:missing.map(function(x){return x.id;})};
}
function EUC_IMPORT_dateGrist_(iso){if(!iso)return null;var d=new Date(String(iso)+'T00:00:00Z');return isNaN(d.getTime())?null:Math.floor(d.getTime()/1000);}
function EUC_IMPORT_nowGrist_(){return Math.floor(Date.now()/1000);}
function EUC_IMPORT_normaliserCle_(v){return String(v||'').trim().toUpperCase();}
function EUC_IMPORT_cleStableLigne_(r){
  if(r.numeroNational)return 'NN|'+r.numeroNational;
  if(r.ident)return 'I|'+r.ident;
  if(r.numero)return 'N|'+r.numero;
  return 'ID|'+[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');
}
function EUC_IMPORT_lireAnnee_(code){var rows=EUC_IMPORT_lireRecordsBruts_('Annees_Scolaires').filter(function(r){return String((r.fields||{}).Code||'')===String(code);});if(rows.length!==1)throw new Error('Année scolaire '+code+' introuvable ou ambiguë dans Grist.');return rows[0];}
function EUC_IMPORT_indexExistantsReels_(rows,anneeId,source){
  var stable={},identite={};
  (rows||[]).forEach(function(r){var f=r.fields||r;if(Number(f.Annee_scolaire)!==Number(anneeId))return;var src=EUC_IMPORT_normaliserSourcePronote_(f.Source_Pronote||f.Source_import||'');if(src&&src!==source)return;
    function add(k){if(!k)return;(stable[k]=stable[k]||[]).push(r);}add(f.Numero_national?'NN|'+f.Numero_national:'');add(f.Identifiant_Pronote?'I|'+f.Identifiant_Pronote:'');add(f.Numero_Pronote?'N|'+f.Numero_Pronote:'');
    var ik=[EUC_SUIVI_normaliserIdentite_(f.Nom),EUC_SUIVI_normaliserIdentite_(f.Prenom_usage||f.Prenom),EUC_SUIVI_dateISO_(f.Date_naissance)].join('|');(identite[ik]=identite[ik]||[]).push(r);
  });return {stable:stable,identite:identite};
}
function EUC_IMPORT_importerReelTexte(payload){return EUC_IMPORT_importerReelCompletV77(payload);}
