/**
 * EDT V2.1 - Extension zones de salles + remise à zéro
 * Tous les noms de fonctions sont préfixés EDT_.
 * À coller dans un fichier séparé : EDT_Install_Reset_V21.gs
 *
 * À modifier :
 * - EDT_V21_CONFIG.DOC_ID
 * - EDT_V21_CONFIG.GRIST_API_KEY
 */

var EDT_V21_CONFIG = {
  GRIST_HOST: "https://docs.getgrist.com",
  DOC_ID: "3pnVrygfNn7c",
  GRIST_API_KEY: PropertiesService.getScriptProperties().getProperty('EUC_ENT_GRIST_API_KEY') || ''
};

var EDT_V21_SCHEMA = {
  Zones_Salles: [
    EDT_col_("Nom", "Text"),
    EDT_col_("Salle", "Ref:Salles"),
    EDT_col_("Etab", "Text"),
    EDT_col_("Type_zone", "Choice"),
    EDT_col_("Capacite", "Int"),
    EDT_col_("Actif", "Bool"),
    EDT_col_("Commentaire", "Text")
  ],

  Creneaux_EDT: [
    EDT_col_("Zone", "Ref:Zones_Salles")
  ],

  Seances_Generees: [
    EDT_col_("Zone", "Ref:Zones_Salles")
  ]
};

function EDT_col_(id, type) {
  return { id: id, type: type };
}

/**
 * Lanceur principal V2.1.
 * Crée Zones_Salles si besoin et ajoute Zone aux créneaux/séances.
 */
function EDT_installerStructure_V21() {
  Object.keys(EDT_V21_SCHEMA).forEach(function(tableId) {
    if (!EDT_tableExiste_(tableId)) {
      EDT_applyActions_([
        ["AddTable", tableId, EDT_V21_SCHEMA[tableId]]
      ]);
    } else {
      EDT_ajouterColonnesManquantes_V21_(tableId);
    }
  });

  EDT_initialiserParametres_V21_();
  EDT_journaliser_("INSTALL_STRUCTURE_V21", "Toutes", "Extension zones de salles + reset EDT V2.1 installée.");
}

/**
 * Vide uniquement les données de travail.
 * NE TOUCHE PAS aux référentiels : profs, classes, groupes, salles, zones, matières, calendrier.
 */
function EDT_resetDonneesTravail() {
  var ok = Browser.msgBox(
    "Confirmation",
    "Cette action va vider les créneaux, séances et synthèses EDT. Les référentiels seront conservés. Continuer ?",
    Browser.Buttons.YES_NO
  );

  if (ok !== "yes") return;

  var tables = [
    "Creneaux_EDT",
    "Seances_Generees",
    "Synthese_Hebdo_Enseignants",
    "Synthese_Annuelle_Enseignants",
    "Synthese_Hebdo_Ressources",
    "Synthese_Annuelle_Ressources",
    "TRM_Synthese",
    "Repartition_PFMP",
    "Synthese_PFMP_Enseignants"
  ];

  EDT_viderTables_(tables);
  EDT_marquerModification_();
  EDT_journaliser_("RESET_DONNEES_TRAVAIL", "Tables de travail", "Remise à zéro des données de travail EDT.");
}

/**
 * Reset plus large : conserve le calendrier et les référentiels de base,
 * mais vide aussi versions/TRM/quotas PFMP/appartenances.
 */
function EDT_resetCompletEDT() {
  var ok = Browser.msgBox(
    "Confirmation forte",
    "Cette action vide aussi Versions EDT, TRM, quotas PFMP et appartenances groupes. Le calendrier, profs, classes, groupes, salles, zones et matières sont conservés. Continuer ?",
    Browser.Buttons.YES_NO
  );

  if (ok !== "yes") return;

  var tables = [
    "Creneaux_EDT",
    "Seances_Generees",
    "Synthese_Hebdo_Enseignants",
    "Synthese_Annuelle_Enseignants",
    "Synthese_Hebdo_Ressources",
    "Synthese_Annuelle_Ressources",
    "TRM_Lignes",
    "TRM_Repartition_Enseignants",
    "TRM_Synthese",
    "Versions_EDT",
    "Quotas_PFMP_Enseignants",
    "Repartition_PFMP",
    "Synthese_PFMP_Enseignants",
    "Appartenances_Groupes"
  ];

  EDT_viderTables_(tables);
  EDT_marquerModification_();
  EDT_journaliser_("RESET_COMPLET_EDT", "Tables EDT", "Remise à zéro complète des données EDT hors référentiels.");
}

function EDT_viderTables_(tables) {
  tables.forEach(function(tableId) {
    if (!EDT_tableExiste_(tableId)) return;
    var records = EDT_getRecords_(tableId);
    var ids = records.map(function(r) { return r.id; });
    if (ids.length) {
      for (var i = 0; i < ids.length; i += 200) {
        EDT_applyActions_([
          ["BulkRemoveRecord", tableId, ids.slice(i, i + 200)]
        ]);
      }
    }
  });
}

function EDT_ajouterColonnesManquantes_V21_(tableId) {
  var existingCols = EDT_getExistingColumns_(tableId);
  var actions = [];

  EDT_V21_SCHEMA[tableId].forEach(function(c) {
    if (existingCols.indexOf(c.id) === -1) {
      actions.push(["AddColumn", tableId, c.id, { type: c.type }]);
    }
  });

  if (actions.length) EDT_applyActions_(actions);
}

function EDT_initialiserParametres_V21_() {
  if (!EDT_tableExiste_("Parametres_EDT")) return;
  var records = EDT_getRecords_("Parametres_EDT");
  var keys = records.map(function(r) { return r.fields.Cle; });
  var actions = [];

  var params = [
    ["Zones_Facultatives", "oui", "La zone est facultative : si elle est vide, seul le contrôle de capacité salle s'applique."],
    ["Controle_Capacite_Salle", "oui", "Autorise plusieurs groupes dans une salle si la capacité n'est pas dépassée."],
    ["Controle_Capacite_Zone", "oui", "Contrôle la capacité ou l'exclusivité d'une zone si elle est renseignée."]
  ];

  params.forEach(function(p) {
    if (keys.indexOf(p[0]) === -1) {
      actions.push(["AddRecord", "Parametres_EDT", null, {
        Cle: p[0],
        Valeur: p[1],
        Commentaire: p[2]
      }]);
    }
  });

  if (actions.length) EDT_applyActions_(actions);
}

function EDT_marquerModification_() {
  if (!EDT_tableExiste_("Parametres_EDT")) return;
  var records = EDT_getRecords_("Parametres_EDT");
  var rec = records.find(function(r) { return r.fields.Cle === "LastUpdate"; });
  var value = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd'T'HH:mm:ss");

  if (rec) {
    EDT_applyActions_([
      ["UpdateRecord", "Parametres_EDT", rec.id, { Valeur: value }]
    ]);
  } else {
    EDT_applyActions_([
      ["AddRecord", "Parametres_EDT", null, {
        Cle: "LastUpdate",
        Valeur: value,
        Commentaire: "Horodatage de synchronisation widgets."
      }]
    ]);
  }
}

function EDT_journaliser_(action, tableCible, detail) {
  if (!EDT_tableExiste_("Journal_EDT")) return;
  EDT_applyActions_([
    ["AddRecord", "Journal_EDT", null, {
      Date_action: Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd HH:mm:ss"),
      Utilisateur: Session.getActiveUser().getEmail() || "inconnu",
      Action: action,
      Table_cible: tableCible,
      Detail: detail
    }]
  ]);
}

function EDT_tableExiste_(tableId) {
  return EDT_getExistingTables_().indexOf(tableId) !== -1;
}

function EDT_getExistingTables_() {
  var data = EDT_gristGet_("/api/docs/" + EDT_V21_CONFIG.DOC_ID + "/tables/_grist_Tables/records");
  return data.records.map(function(r) { return r.fields.tableId; }).filter(Boolean);
}

function EDT_getExistingColumns_(tableId) {
  var tables = EDT_gristGet_("/api/docs/" + EDT_V21_CONFIG.DOC_ID + "/tables/_grist_Tables/records");
  var table = tables.records.find(function(r) { return r.fields.tableId === tableId; });
  if (!table) return [];

  var cols = EDT_gristGet_("/api/docs/" + EDT_V21_CONFIG.DOC_ID + "/tables/_grist_Tables_column/records");
  return cols.records
    .filter(function(r) { return String(r.fields.parentId) === String(table.id); })
    .map(function(r) { return r.fields.colId; })
    .filter(Boolean);
}

function EDT_getRecords_(tableId) {
  var data = EDT_gristGet_("/api/docs/" + EDT_V21_CONFIG.DOC_ID + "/tables/" + tableId + "/records");
  return data.records || [];
}

function EDT_gristGet_(path) {
  var res = UrlFetchApp.fetch(EDT_V21_CONFIG.GRIST_HOST + path, {
    method: "get",
    headers: { Authorization: "Bearer " + EDT_V21_CONFIG.GRIST_API_KEY },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error("Grist GET " + res.getResponseCode() + "\\n" + res.getContentText());
  }

  return JSON.parse(res.getContentText());
}

function EDT_applyActions_(actions) {
  if (!actions || !actions.length) return null;

  var res = UrlFetchApp.fetch(
    EDT_V21_CONFIG.GRIST_HOST + "/api/docs/" + EDT_V21_CONFIG.DOC_ID + "/apply",
    {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + EDT_V21_CONFIG.GRIST_API_KEY },
      payload: JSON.stringify(actions),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error("Grist APPLY " + res.getResponseCode() + "\\n" + res.getContentText());
  }

  return JSON.parse(res.getContentText());
}
