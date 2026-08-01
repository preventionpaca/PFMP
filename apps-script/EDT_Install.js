/** EDT V2.0 - Installation / mise à jour structure. Fonctions préfixées EDT_. */

var EDT_SCHEMA_V20 = {
  Parametres_EDT: [
    EDT_col_('Cle', 'Text'), EDT_col_('Valeur', 'Text'), EDT_col_('Commentaire', 'Text')
  ],
  Roles_EDT: [
    EDT_col_('Email', 'Text'), EDT_col_('Role', 'Choice'), EDT_col_('Vue_par_defaut', 'Choice'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Versions_EDT: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Nom', 'Text'), EDT_col_('Statut', 'Choice'),
    EDT_col_('Date_creation', 'DateTime'), EDT_col_('Active', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Enseignants: [
    EDT_col_('Nom', 'Text'), EDT_col_('Prenom', 'Text'), EDT_col_('Nom_complet', 'Text'), EDT_col_('Initiales', 'Text'),
    EDT_col_('Discipline', 'Text'), EDT_col_('Categorie_PFMP', 'Choice'), EDT_col_('Service_hebdo_reference', 'Numeric'),
    EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Classes: [
    EDT_col_('Nom', 'Text'), EDT_col_('Libelle', 'Text'), EDT_col_('Formation', 'Text'), EDT_col_('Niveau', 'Text'),
    EDT_col_('Effectif', 'Int'), EDT_col_('Couleur', 'Text'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Groupes: [
    EDT_col_('Nom', 'Text'), EDT_col_('Libelle', 'Text'), EDT_col_('Etab', 'Text'), EDT_col_('Classes_source', 'Text'),
    EDT_col_('Classe_principale', 'Ref:Classes'), EDT_col_('Type_groupe', 'Choice'), EDT_col_('Effectif_theorique', 'Int'),
    EDT_col_('Couleur', 'Text'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Groupes_Classes: [
    EDT_col_('Groupe', 'Ref:Groupes'), EDT_col_('Classe', 'Ref:Classes'), EDT_col_('Commentaire', 'Text')
  ],
  Salles: [
    EDT_col_('Nom', 'Text'), EDT_col_('Libelle', 'Text'), EDT_col_('Type_salle', 'Choice'), EDT_col_('Capacite', 'Int'),
    EDT_col_('Zone', 'Text'), EDT_col_('Couleur', 'Text'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Matieres: [
    EDT_col_('Nom', 'Text'), EDT_col_('Libelle', 'Text'), EDT_col_('Code', 'Text'), EDT_col_('Couleur', 'Text'),
    EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Eleves: [
    EDT_col_('Nom', 'Text'), EDT_col_('Prenom', 'Text'), EDT_col_('Nom_complet', 'Text'), EDT_col_('Classe_administrative', 'Text'),
    EDT_col_('Statut', 'Choice'), EDT_col_('Apprenti', 'Bool'), EDT_col_('Prof_referent', 'Ref:Enseignants'),
    EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Appartenances_Groupes: [
    EDT_col_('Eleve', 'Ref:Eleves'), EDT_col_('Groupe', 'Ref:Groupes'), EDT_col_('Date_debut', 'Date'), EDT_col_('Date_fin', 'Date'), EDT_col_('Commentaire', 'Text')
  ],
  Services_Enseignants: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Service_hebdo_reference', 'Numeric'), EDT_col_('Semaines_reference', 'Numeric'), EDT_col_('Service_annuel_reference', 'Numeric'),
    EDT_col_('Heures_annuelles_placees', 'Numeric'), EDT_col_('Moyenne_hebdo_placee', 'Numeric'), EDT_col_('Ecart_hebdo', 'Numeric'),
    EDT_col_('Heures_sup_hebdo', 'Numeric'), EDT_col_('Commentaire', 'Text')
  ],
  TRM_Lignes: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Matiere', 'Ref:Matieres'), EDT_col_('Type_enseignement', 'Choice'), EDT_col_('Heures_hebdo_dues', 'Numeric'),
    EDT_col_('Nombre_groupes_attendus', 'Numeric'), EDT_col_('Heures_hebdo_totales_attendues', 'Numeric'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  TRM_Repartition_Enseignants: [
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'), EDT_col_('Enseignant', 'Ref:Enseignants'), EDT_col_('Groupe', 'Ref:Groupes'),
    EDT_col_('Heures_hebdo_attribuees', 'Numeric'), EDT_col_('Zone', 'Text'), EDT_col_('Commentaire', 'Text')
  ],
  TRM_Synthese: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'),
    EDT_col_('Heures_hebdo_dues', 'Numeric'), EDT_col_('Heures_hebdo_attribuees', 'Numeric'), EDT_col_('Heures_hebdo_posees_EDT', 'Numeric'),
    EDT_col_('Ecart_a_poser', 'Numeric'), EDT_col_('Statut', 'Choice'), EDT_col_('Commentaire', 'Text')
  ],
  Creneaux_EDT: [
    EDT_col_('Code_creneau', 'Text'), EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'),
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'), EDT_col_('Type_creneau', 'Choice'), EDT_col_('Type_placement', 'Choice'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'), EDT_col_('Groupe', 'Ref:Groupes'), EDT_col_('Salle', 'Ref:Salles'), EDT_col_('Matiere', 'Ref:Matieres'),
    EDT_col_('Discipline', 'Text'), EDT_col_('Jour_numero', 'Int'), EDT_col_('Jour_nom', 'Text'), EDT_col_('Heure_debut', 'Text'), EDT_col_('Heure_fin', 'Text'),
    EDT_col_('Date_debut', 'Date'), EDT_col_('Date_fin', 'Date'), EDT_col_('Frequence', 'Choice'), EDT_col_('Semaines_personnalisees', 'Text'),
    EDT_col_('Couleur', 'Text'), EDT_col_('Compte_service', 'Bool'), EDT_col_('Statut', 'Choice'), EDT_col_('Commentaire', 'Text')
  ],
  Seances_Generees: [
    EDT_col_('Creneau', 'Ref:Creneaux_EDT'), EDT_col_('Code_creneau', 'Text'), EDT_col_('Date', 'Date'), EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'),
    EDT_col_('Semaine_ISO', 'Int'), EDT_col_('Jour_numero', 'Int'), EDT_col_('Jour_nom', 'Text'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'), EDT_col_('Groupe', 'Ref:Groupes'), EDT_col_('Salle', 'Ref:Salles'), EDT_col_('Matiere', 'Ref:Matieres'),
    EDT_col_('Type_creneau', 'Text'), EDT_col_('Heure_debut', 'Text'), EDT_col_('Heure_fin', 'Text'), EDT_col_('Duree', 'Numeric'),
    EDT_col_('Compte_service', 'Bool'), EDT_col_('Statut', 'Choice'), EDT_col_('Commentaire', 'Text')
  ],
  Synthese_Hebdo_Enseignants: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Semaine_ISO', 'Int'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Heures_service', 'Numeric'), EDT_col_('Service_hebdo_reference', 'Numeric'), EDT_col_('Ecart', 'Numeric'), EDT_col_('Heures_sup', 'Numeric')
  ],
  Synthese_Annuelle_Enseignants: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Heures_annuelles_placees', 'Numeric'), EDT_col_('Moyenne_hebdo_placee', 'Numeric'), EDT_col_('Service_hebdo_reference', 'Numeric'),
    EDT_col_('Ecart_hebdo', 'Numeric'), EDT_col_('Heures_sup_hebdo', 'Numeric')
  ],
  Synthese_Hebdo_Ressources: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Type_ressource', 'Text'), EDT_col_('Ressource_id', 'Int'),
    EDT_col_('Semaine_ISO', 'Int'), EDT_col_('Heures', 'Numeric'), EDT_col_('Detail_matieres', 'Text')
  ],
  Synthese_Annuelle_Ressources: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Version_EDT', 'Ref:Versions_EDT'), EDT_col_('Type_ressource', 'Text'), EDT_col_('Ressource_id', 'Int'),
    EDT_col_('Heures_annuelles', 'Numeric'), EDT_col_('Moyenne_hebdo', 'Numeric'), EDT_col_('Detail_matieres', 'Text')
  ],
  Quotas_PFMP_Enseignants: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Classe', 'Ref:Classes'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Categorie_suivi', 'Choice'), EDT_col_('Heures_hebdo_reference', 'Numeric'), EDT_col_('Actif', 'Bool'), EDT_col_('Commentaire', 'Text')
  ],
  Repartition_PFMP: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'), EDT_col_('Periode_PFMP', 'Text'), EDT_col_('Classe', 'Ref:Classes'), EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Categorie_suivi', 'Choice'), EDT_col_('Heures_reference', 'Numeric'), EDT_col_('Ratio', 'Numeric'), EDT_col_('Nombre_eleves_a_suivre', 'Numeric'), EDT_col_('Commentaire', 'Text')
  ],
  Remplacements: [
    EDT_col_('Creneau', 'Ref:Creneaux_EDT'), EDT_col_('Enseignant_absent', 'Ref:Enseignants'), EDT_col_('Enseignant_remplacant', 'Ref:Enseignants'),
    EDT_col_('Date_debut', 'Date'), EDT_col_('Date_fin', 'Date'), EDT_col_('Commentaire', 'Text')
  ],
  Journal_EDT: [
    EDT_col_('Date_action', 'DateTime'), EDT_col_('Utilisateur', 'Text'), EDT_col_('Action', 'Text'), EDT_col_('Table_cible', 'Text'), EDT_col_('Detail', 'Text')
  ],
  EDT_Historique_Actions: [
    EDT_col_('Date_action', 'DateTime'), EDT_col_('Utilisateur', 'Text'), EDT_col_('Action', 'Text'), EDT_col_('Creneau', 'Ref:Creneaux_EDT'),
    EDT_col_('Avant_JSON', 'Text'), EDT_col_('Apres_JSON', 'Text'), EDT_col_('Commentaire', 'Text')
  ]
};

function EDT_col_(id, type) { return { id: id, type: type }; }

function EDT_installerStructure_V20() {
  EDT_installSchema_(EDT_SCHEMA_V20);
  EDT_initialiserParametres_V20_();
  EDT_initialiserVersionDefaut_V20_();
  EDT_reconstruireLibelles_();
  EDT_normaliserCreneauxEDT();
  EDT_journaliser_('INSTALL_STRUCTURE_V20', 'Toutes', 'Installation / mise à jour structure EDT V2.0.');
  Logger.log('✅ Structure EDT V2.0 installée / mise à jour.');
}

function EDT_installSchema_(schema) {
  var tables = EDT_getExistingTables_();
  Object.keys(schema).forEach(function(tableId) {
    if (tables.indexOf(tableId) === -1) EDT_applyActions_([['AddTable', tableId, schema[tableId]]]);
  });
  Object.keys(schema).forEach(function(tableId) {
    var existingCols = EDT_getExistingColumns_(tableId);
    var actions = [];
    schema[tableId].forEach(function(c) {
      if (existingCols.indexOf(c.id) === -1) actions.push(['AddColumn', tableId, c.id, { type: c.type }]);
    });
    if (actions.length) EDT_applyActions_(actions);
  });
}

function EDT_initialiserParametres_V20_() {
  var records = EDT_getRecords_('Parametres_EDT');
  var keys = records.map(function(r) { return r.fields.Cle; });
  var actions = [];
  EDT_DEFAULT_PARAMS.forEach(function(p) {
    if (keys.indexOf(p[0]) === -1) actions.push(['AddRecord', 'Parametres_EDT', null, { Cle: p[0], Valeur: p[1], Commentaire: p[2] }]);
  });
  if (actions.length) EDT_applyActions_(actions);
}

function EDT_initialiserVersionDefaut_V20_() {
  var versions = EDT_getRecords_('Versions_EDT');
  if (versions.length) return;
  EDT_applyActions_([['AddRecord', 'Versions_EDT', null, {
    Nom: 'Version active', Statut: 'ACTIVE', Date_creation: new Date().toISOString(), Active: true,
    Commentaire: 'Version créée automatiquement par EDT V2.0.'
  }]]);
}
