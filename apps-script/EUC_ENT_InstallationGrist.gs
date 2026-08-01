/** Eucalyptus Entreprises SIRET — v1.0.0-dev.8 — schéma v1 validé le 31 juillet 2026. */
function EUC_ENT_planInstallationGrist() {
  return {version:EUC_ENT_VERSION,tables:EUC_ENT_schemaGrist(),lectureSeule:true};
}

/**
 * Installation relançable : crée uniquement les tables absentes, puis uniquement
 * les colonnes absentes. Ne renomme, ne supprime et ne modifie jamais l'existant.
 */
function EUC_ENT_installerOuMettreAJourGrist(autorisationExplicite) {
  if (autorisationExplicite !== 'AUTORISATION_CREATION_TABLES_V1') {
    throw new Error('Installation bloquée : autorisation explicite requise.');
  }
  var schema=EUC_ENT_schemaGrist(), existantes=EUC_ENT_grist('get','/tables').tables||[], ids={};
  existantes.forEach(function(t){ids[t.id]=true;}); var resultat={tablesCreees:[],colonnesCreees:[],inchangees:[]};
  schema.forEach(function(t){
    if(!ids[t.id]){
      EUC_ENT_grist('post','/tables',{tables:[t]}); resultat.tablesCreees.push(t.id); return;
    }
    var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t.id)+'/columns').columns||[], presentes={};
    cols.forEach(function(c){presentes[c.id]=true;}); var manquantes=t.columns.filter(function(c){return !presentes[c.id];});
    if(manquantes.length){EUC_ENT_grist('post','/tables/'+encodeURIComponent(t.id)+'/columns',{columns:manquantes}); resultat.colonnesCreees.push({table:t.id,colonnes:manquantes.map(function(c){return c.id;})});}
    else resultat.inchangees.push(t.id);
  }); return resultat;
}

function EUC_ENT_colonne(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_ENT_schemaGrist(){var c=EUC_ENT_colonne;return [
  {id:'EUC_ENTREPRISES',columns:[
    c('SIRET','SIRET'),c('SIREN','SIREN'),c('Raison_sociale','Raison sociale'),c('Enseigne','Enseigne'),
    c('Est_siege','Établissement siège','Bool'),c('Etat','État'),c('Forme_juridique','Forme juridique'),
    c('Code_APE','Code APE / NAF'),c('Libelle_activite','Libellé de l’activité'),c('Date_creation','Date de création','Date'),
    c('Complement_adresse','Complément d’adresse'),c('Numero_voie','Numéro et voie'),c('Code_postal','Code postal'),
    c('Commune','Commune'),c('Pays','Pays'),c('Adresse_complete','Adresse complète normalisée'),
    c('Telephone','Téléphone principal'),c('Telephone_2','Téléphone secondaire'),c('Courriel','Courriel général'),c('Site_web','Site Internet'),
    c('Accueil_eleves','Susceptible d’accueillir des élèves','Bool'),c('Statut_relation','Statut de la relation'),
    c('Commentaire_interne','Commentaire interne'),c('Premiere_relation','Date de première relation','Date'),
    c('Derniere_relation','Date de dernière relation','Date'),c('Origine_creation','Origine de la création'),
    c('Auteur_creation','Auteur de la création'),c('Date_creation_fiche','Date de création de la fiche','DateTime'),
    c('Date_modification_fiche','Date de modification de la fiche','DateTime')
  ]},
  {id:'EUC_CONTACTS_ENTREPRISES',columns:[
    c('Entreprise','Entreprise','Ref:EUC_ENTREPRISES'),c('Civilite','Civilité'),c('Prenom','Prénom'),c('Nom','Nom'),
    c('Fonction','Fonction'),c('Telephone_direct','Téléphone direct'),c('Courriel_direct','Courriel direct'),
    c('Type_contact','Type de contact'),c('Origine_donnee','Origine de la donnée'),c('Actif','Contact actif','Bool'),
    c('Commentaire','Commentaire'),c('Date_creation_fiche','Date de création de la fiche','DateTime'),
    c('Date_modification_fiche','Date de modification de la fiche','DateTime')
  ]}
];}
