/** EDT V2.5 - Compléments installation compatibles avec ton socle Apps Script existant.
 * À coller dans un fichier séparé : EDT_Install_V24.gs
 * Pré-requis : fonctions existantes EDT_col_, EDT_installSchema_, EDT_applyActions_, EDT_getRecords_, EDT_chunk_, EDT_markUpdate_, EDT_journaliser_.
 */

var EDT_SCHEMA_V25_ADDONS = {
  Vues_EDT: [
    EDT_col_('Nom', 'Text'),
    EDT_col_('Libelle', 'Text'),
    EDT_col_('Categorie', 'Text'),
    EDT_col_('Actif', 'Bool'),
    EDT_col_('Commentaire', 'Text')
  ],
  Vues_EDT_Lignes: [
    EDT_col_('Vue_EDT', 'Ref:Vues_EDT'),
    EDT_col_('Ordre', 'Int'),
    EDT_col_('Type_vue', 'Choice'),
    EDT_col_('Ressource_id', 'Int'),
    EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes'),
    EDT_col_('Salle', 'Ref:Salles'),
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Commentaire', 'Text')
  ],
  Zones_Salles: [
    EDT_col_('Nom', 'Text'),
    EDT_col_('Libelle', 'Text'),
    EDT_col_('Salle', 'Ref:Salles'),
    EDT_col_('Etab', 'Text'),
    EDT_col_('Type_zone', 'Choice'),
    EDT_col_('Capacite', 'Int'),
    EDT_col_('Actif', 'Bool'),
    EDT_col_('Commentaire', 'Text')
  ],
  Creneaux_Lieux: [
    EDT_col_('Creneau', 'Ref:Creneaux_EDT'),
    EDT_col_('Salle', 'Ref:Salles'),
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Capacite_utilisee', 'Numeric'),
    EDT_col_('Actif', 'Bool'),
    EDT_col_('Commentaire', 'Text')
  ],
  Indisponibilites_EDT: [
    EDT_col_('Annee_scolaire', 'Ref:Annees_Scolaires'),
    EDT_col_('Version_EDT', 'Ref:Versions_EDT'),
    EDT_col_('Type_ressource', 'Choice'),
    EDT_col_('Ressource_id', 'Int'),
    EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes'),
    EDT_col_('Salle', 'Ref:Salles'),
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Jour_numero', 'Int'),
    EDT_col_('Jour_nom', 'Text'),
    EDT_col_('Heure_debut', 'Text'),
    EDT_col_('Heure_fin', 'Text'),
    EDT_col_('Type_contrainte', 'Choice'),
    EDT_col_('Priorite', 'Choice'),
    EDT_col_('Couleur', 'Text'),
    EDT_col_('Actif', 'Bool'),
    EDT_col_('Commentaire', 'Text')
  ]
};

var EDT_SCHEMA_V25_COLUMNS = {
  Creneaux_EDT: [
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'),
    EDT_col_('Zones_multiples', 'Text'),
    EDT_col_('Salles_multiples', 'Text'),
    EDT_col_('Statut', 'Choice')
  ],
  Seances_Generees: [
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'),
    EDT_col_('Zones_multiples', 'Text')
  ],
  Matieres: [EDT_col_('Code_import', 'Text')],
  Classes: [EDT_col_('Code_import', 'Text')],
  Enseignants: [EDT_col_('Code_import', 'Text')],
  Groupes: [EDT_col_('Code_import', 'Text')],
  Salles: [EDT_col_('Code_import', 'Text')],
  Annees_Scolaires: [EDT_col_('Libelle', 'Text'), EDT_col_('Code_import', 'Text')],
  Versions_EDT: [EDT_col_('Code_import', 'Text')]
};

function EDT_installerStructure_V25() {
  EDT_installSchema_(EDT_SCHEMA_V25_ADDONS);
  EDT_installSchema_(EDT_SCHEMA_V25_COLUMNS);
  EDT_initialiserVuesExemples_V25_();
  EDT_initialiserParametres_V25_();
  EDT_normaliserIndisponibilites_V25();
  EDT_reconstruireLibelles_V25();
  if (typeof EDT_reparerAffichageReferences_TRM_V23 === 'function') EDT_reparerAffichageReferences_TRM_V23();
  EDT_markUpdate_();
  EDT_journaliser_('INSTALL_STRUCTURE_V25', 'Toutes', 'Installation compléments EDT V2.5 : zones filtrées, lieux multiples, indisponibilités, suppression logique, vues, zones, TRM.');
  Logger.log('✅ Compléments EDT V2.5 installés.');
}

function EDT_initialiserVuesExemples_V25_() {
  var vues = EDT_getRecords_('Vues_EDT');
  if (vues.length) return;
  EDT_applyActions_([
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle automobile',Libelle:'Pôle automobile',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}],
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle production',Libelle:'Pôle production',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}],
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle conception',Libelle:'Pôle conception',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}]
  ]);
}

function EDT_reconstruireLibelles_V25() {
  EDT_v25FillIfEmpty_('Matieres', function(f){ return f.Nom || f.Libelle || f.Code || ''; });
  EDT_v25FillIfEmpty_('Classes', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v25FillIfEmpty_('Groupes', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v25FillIfEmpty_('Salles', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v25FillIfEmpty_('Zones_Salles', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v25FillIfEmpty_('Versions_EDT', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v25FillIfEmpty_('Annees_Scolaires', function(f){ return f.Libelle || f.Annee_scolaire || f.Nom || f.Code_import || ''; });
}

function EDT_v25FillIfEmpty_(tableId, getLabel) {
  try {
    var recs = EDT_getRecords_(tableId);
    var actions = [];
    recs.forEach(function(r){
      var f = r.fields || {};
      var label = getLabel(f);
      var patch = {};
      if (!f.Libelle && label) patch.Libelle = label;
      if (!f.Code_import && label) patch.Code_import = String(label).toUpperCase()
        .replace(/[ÉÈÊË]/g,'E').replace(/[ÀÂÄ]/g,'A').replace(/[ÔÖ]/g,'O').replace(/[ÛÜ]/g,'U').replace(/[Ç]/g,'C')
        .replace(/[^A-Z0-9_.-]+/g,'_');
      if (Object.keys(patch).length) actions.push(['UpdateRecord', tableId, r.id, patch]);
    });
    EDT_chunk_(actions, 100).forEach(function(batch){ if(batch.length) EDT_applyActions_(batch); });
  } catch(e) {
    Logger.log('⚠ Libellés non reconstruits pour '+tableId+' : '+e.message);
  }
}

/** Archive logiquement les créneaux d'une version, puis archive la version. */
function EDT_archiverVersionEDT_V25(versionId) {
  if (!versionId) throw new Error('Indique un identifiant de version.');
  var creneaux = EDT_getRecords_('Creneaux_EDT').filter(function(r){ return EDT_ref_(r.fields.Version_EDT) === Number(versionId); });
  var actions = [];
  creneaux.forEach(function(r){
    if (String(r.fields.Statut || '').toUpperCase() !== 'SUPPRIME') {
      actions.push(['UpdateRecord','Creneaux_EDT',r.id,{Statut:'SUPPRIME',Commentaire:(r.fields.Commentaire||'')+' [archivé avec la version]'}]);
    }
  });
  EDT_chunk_(actions, 100).forEach(function(batch){ if(batch.length) EDT_applyActions_(batch); });
  EDT_applyActions_([['UpdateRecord','Versions_EDT',Number(versionId),{Statut:'ARCHIVEE',Active:false,Commentaire:'Archivée par EDT_archiverVersionEDT_V25'}]]);
  EDT_markUpdate_();
}


/** Paramètres de confort V2.5 : si les clés existent, elles restent inchangées. */
function EDT_initialiserParametres_V25_() {
  var recs = EDT_getRecords_('Parametres_EDT');
  var keys = recs.map(function(r){ return r.fields.Cle; });
  var defaults = [
    ['Heure_Debut_Journee','08:00','Début d’affichage par défaut du widget EDT.'],
    ['Heure_Fin_Journee','18:00','Fin d’affichage par défaut du widget EDT.'],
    ['Pas_Horaire_Minutes','30','Pas horaire en minutes.']
  ];
  var actions=[];
  defaults.forEach(function(p){ if(keys.indexOf(p[0])===-1) actions.push(['AddRecord','Parametres_EDT',null,{Cle:p[0],Valeur:p[1],Commentaire:p[2]}]); });
  if(actions.length) EDT_applyActions_(actions);
}

/** Répare les anciennes indisponibilités qui n’ont qu’un Ressource_id numérique en alimentant les refs lisibles. */
function EDT_normaliserIndisponibilites_V25() {
  var recs = EDT_getRecords_('Indisponibilites_EDT');
  var actions=[];
  recs.forEach(function(r){
    var f=r.fields||{}, id=Number(f.Ressource_id||0), t=String(f.Type_ressource||'').toLowerCase();
    if(!id) return;
    var patch={};
    if(t==='prof' && !f.Enseignant) patch.Enseignant=id;
    if(t==='classe' && !f.Classe) patch.Classe=id;
    if(t==='groupe' && !f.Groupe) patch.Groupe=id;
    if(t==='salle' && !f.Salle) patch.Salle=id;
    if(t==='zone' && !f.Zone) patch.Zone=id;
    if(Object.keys(patch).length) actions.push(['UpdateRecord','Indisponibilites_EDT',r.id,patch]);
  });
  EDT_chunk_(actions,100).forEach(function(batch){ if(batch.length) EDT_applyActions_(batch); });
}
var EDT_SCHEMA_AFFICHAGE_REFS_ADDON = {
  Creneaux_EDT: [
    EDT_col_('Classe', 'Ref:Classes')
  ],
  Creneaux_Lieux: [
    EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes')
  ],
  Seances_Generees: [
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes')
  ]
};

function EDT_installerColonnesAffichageRefs() {
  EDT_installSchema_(EDT_SCHEMA_AFFICHAGE_REFS_ADDON);
  EDT_markUpdate_();
  EDT_journaliser_(
    'INSTALL_COLONNES_AFFICHAGE_REFS',
    'EDT',
    'Ajout Classe dans Creneaux_EDT, Enseignant/Classe/Groupe dans Creneaux_Lieux, Classe/Groupe dans Seances_Generees.'
  );
}
var EDT_SCHEMA_COLONNES_CLASSE_AFFICHAGE = {
  Creneaux_EDT: [
    EDT_col_('Classe', 'Ref:Classes')
  ],

  Creneaux_Lieux: [
    EDT_col_('Enseignant', 'Ref:Enseignants'),
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes')
  ],

  Seances_Generees: [
    EDT_col_('Classe', 'Ref:Classes'),
    EDT_col_('Groupe', 'Ref:Groupes')
  ],

  Services_Enseignants: [
    EDT_col_('Classe', 'Ref:Classes')
  ],

  Synthese_Hebdo_Enseignants: [
    EDT_col_('Classe', 'Ref:Classes')
  ],

  Synthese_Annuelle_Enseignants: [
    EDT_col_('Classe', 'Ref:Classes')
  ]
};

function EDT_installerColonnesClasseEtAffichage() {
  EDT_installSchema_(EDT_SCHEMA_COLONNES_CLASSE_AFFICHAGE);
  EDT_markUpdate_();
  EDT_journaliser_(
    'INSTALL_COLONNES_CLASSE_AFFICHAGE',
    'EDT',
    'Ajout des colonnes Classe / Enseignant / Groupe dans les tables EDT.'
  );
}
function EDT_addColumnForce_(tableId, colId, type) {
  var existing = EDT_getExistingColumns_(tableId);
  if (existing.indexOf(colId) !== -1) {
    Logger.log('Déjà existante : ' + tableId + '.' + colId);
    return;
  }

  try {
    EDT_applyActions_([
      ['AddVisibleColumn', tableId, colId, { type: type }]
    ]);
    Logger.log('Ajoutée : ' + tableId + '.' + colId);
  } catch (e1) {
    Logger.log('AddVisibleColumn échoué, tentative AddColumn : ' + e1.message);
    EDT_applyActions_([
      ['AddColumn', tableId, colId, { type: type }]
    ]);
    Logger.log('Ajoutée via AddColumn : ' + tableId + '.' + colId);
  }
}

function EDT_forcerColonnesClasseEDT() {
  EDT_addColumnForce_('Creneaux_EDT', 'Classe', 'Ref:Classes');

  EDT_addColumnForce_('Creneaux_Lieux', 'Enseignant', 'Ref:Enseignants');
  EDT_addColumnForce_('Creneaux_Lieux', 'Classe', 'Ref:Classes');
  EDT_addColumnForce_('Creneaux_Lieux', 'Groupe', 'Ref:Groupes');

  EDT_addColumnForce_('Seances_Generees', 'Classe', 'Ref:Classes');
  EDT_addColumnForce_('Seances_Generees', 'Groupe', 'Ref:Groupes');

  EDT_addColumnForce_('Services_Enseignants', 'Classe', 'Ref:Classes');
  EDT_addColumnForce_('Synthese_Hebdo_Enseignants', 'Classe', 'Ref:Classes');
  EDT_addColumnForce_('Synthese_Annuelle_Enseignants', 'Classe', 'Ref:Classes');

  EDT_addColumnForce_('TRM_Lignes', 'Groupe', 'Ref:Groupes');

  EDT_markUpdate_();
  EDT_journaliser_(
    'FORCE_COLONNES_CLASSE_EDT',
    'EDT',
    'Création forcée des colonnes Classe/Groupe/Enseignant dans les tables EDT.'
  );

  Logger.log('✅ Colonnes Classe / Groupe / Enseignant forcées.');
}
