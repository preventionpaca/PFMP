/** EDT V2.4.1 - Compléments installation compatibles avec ton socle Apps Script existant.
 * À coller dans un fichier séparé : EDT_Install_V24.gs
 * Pré-requis : fonctions existantes EDT_col_, EDT_installSchema_, EDT_applyActions_, EDT_getRecords_, EDT_chunk_, EDT_markUpdate_, EDT_journaliser_.
 */

var EDT_SCHEMA_V24_1_ADDONS = {
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
    EDT_col_('Capacite_utilisee', 'Int'),
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

var EDT_SCHEMA_V24_1_COLUMNS = {
  Creneaux_EDT: [
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes'),
    EDT_col_('Statut', 'Choice')
  ],
  Seances_Generees: [
    EDT_col_('Zone', 'Ref:Zones_Salles'),
    EDT_col_('Ligne_TRM', 'Ref:TRM_Lignes')
  ],
  Matieres: [EDT_col_('Code_import', 'Text')],
  Classes: [EDT_col_('Code_import', 'Text')],
  Enseignants: [EDT_col_('Code_import', 'Text')],
  Groupes: [EDT_col_('Code_import', 'Text')],
  Salles: [EDT_col_('Code_import', 'Text')],
  Annees_Scolaires: [EDT_col_('Libelle', 'Text'), EDT_col_('Code_import', 'Text')],
  Versions_EDT: [EDT_col_('Code_import', 'Text')]
};

function EDT_installerStructure_V241() {
  EDT_installSchema_(EDT_SCHEMA_V24_1_ADDONS);
  EDT_installSchema_(EDT_SCHEMA_V24_1_COLUMNS);
  EDT_initialiserVuesExemples_V24_();
  EDT_reconstruireLibelles_V24();
  if (typeof EDT_reparerAffichageReferences_TRM_V23 === 'function') EDT_reparerAffichageReferences_TRM_V23();
  EDT_markUpdate_();
  EDT_journaliser_('INSTALL_STRUCTURE_V24', 'Toutes', 'Installation compléments EDT V2.4 : indisponibilités, suppression logique, vues, zones, TRM.');
  Logger.log('✅ Compléments EDT V2.4.1 installés.');
}

function EDT_initialiserVuesExemples_V24_() {
  var vues = EDT_getRecords_('Vues_EDT');
  if (vues.length) return;
  EDT_applyActions_([
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle automobile',Libelle:'Pôle automobile',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}],
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle production',Libelle:'Pôle production',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}],
    ['AddRecord','Vues_EDT',null,{Nom:'Pôle conception',Libelle:'Pôle conception',Categorie:'Plateau technique',Actif:true,Commentaire:'Exemple à personnaliser'}]
  ]);
}

function EDT_reconstruireLibelles_V24() {
  EDT_v24FillIfEmpty_('Matieres', function(f){ return f.Nom || f.Libelle || f.Code || ''; });
  EDT_v24FillIfEmpty_('Classes', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v24FillIfEmpty_('Groupes', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v24FillIfEmpty_('Salles', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v24FillIfEmpty_('Zones_Salles', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v24FillIfEmpty_('Versions_EDT', function(f){ return f.Nom || f.Libelle || ''; });
  EDT_v24FillIfEmpty_('Annees_Scolaires', function(f){ return f.Libelle || f.Annee_scolaire || f.Nom || f.Code_import || ''; });
}

function EDT_v24FillIfEmpty_(tableId, getLabel) {
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
function EDT_archiverVersionEDT_V24(versionId) {
  if (!versionId) throw new Error('Indique un identifiant de version.');
  var creneaux = EDT_getRecords_('Creneaux_EDT').filter(function(r){ return EDT_ref_(r.fields.Version_EDT) === Number(versionId); });
  var actions = [];
  creneaux.forEach(function(r){
    if (String(r.fields.Statut || '').toUpperCase() !== 'SUPPRIME') {
      actions.push(['UpdateRecord','Creneaux_EDT',r.id,{Statut:'SUPPRIME',Commentaire:(r.fields.Commentaire||'')+' [archivé avec la version]'}]);
    }
  });
  EDT_chunk_(actions, 100).forEach(function(batch){ if(batch.length) EDT_applyActions_(batch); });
  EDT_applyActions_([['UpdateRecord','Versions_EDT',Number(versionId),{Statut:'ARCHIVEE',Active:false,Commentaire:'Archivée par EDT_archiverVersionEDT_V24'}]]);
  EDT_markUpdate_();
}
