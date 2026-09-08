/** Eucalyptus PFMP — v1.0.0-dev.58 — schéma préparatoire, aucune écriture automatique. */
var EUC_CORRESPONDANCE_CLASSES_TABLE_='EUC_CORRESPONDANCE_CLASSES_PRONOTE';
function EUC_CORRESPONDANCE_schemaPropose(){
  return {
    table:EUC_CORRESPONDANCE_CLASSES_TABLE_,
    mode:'PROPOSITION_SANS_ECRITURE',
    colonnes:[
      {id:'Annee_scolaire',type:'Text',obligatoire:true},
      {id:'Nom_classe_Pronote',type:'Text',obligatoire:true},
      {id:'Classe_Grist',type:'Ref:Classes',obligatoire:true},
      {id:'Classe_Grist_nom',type:'Text',obligatoire:false},
      {id:'Actif',type:'Bool',obligatoire:true,defaut:true},
      {id:'Date_creation',type:'DateTime',obligatoire:false},
      {id:'Date_modification',type:'DateTime',obligatoire:false},
      {id:'Auteur',type:'Text',obligatoire:false},
      {id:'Commentaire',type:'Text',obligatoire:false}
    ],
    cleUnique:['Annee_scolaire','Nom_classe_Pronote'],
    regle:'Une classe Pronote active ne peut pointer que vers une seule ligne de Classes pour une année donnée.'
  };
}
function EUC_CORRESPONDANCE_controlerMappingsProvisoires(mappings){
  EUC_IMPORT_exigerAdminTexte_();mappings=mappings||{};var classes=EUC_IMPORT_chargerClassesCamin_(),ids={};classes.filter(function(c){return c.actif;}).forEach(function(c){ids[String(c.id)]=true;ids[String(c.nom).toUpperCase()]=true;});var erreurs=[];
  Object.keys(mappings).forEach(function(k){var v=String(mappings[k]||'').trim();if(!k.trim())erreurs.push('Nom Pronote vide');else if(!v||(!ids[v]&&!ids[v.toUpperCase()]))erreurs.push(k+' → classe Grist inconnue');});
  return {valide:erreurs.length===0,erreurs:erreurs,nombre:Object.keys(mappings).length,ecriture:false};
}
