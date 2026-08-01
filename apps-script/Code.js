/************************************************************
 * VERSION EDT V2.10.9 — STRUCTURE SERVICES / BUDGETS / PFMP / COENSEIGNEMENT / DIAGNOSTIC
 * Fonction à lancer une fois : EDT_STRUCTURE_SERVICES_V2105()
 ************************************************************/



/***** CONFIG À RENSEIGNER *****/
const GRIST = {
  API_KEY: PropertiesService.getScriptProperties().getProperty('EUC_ENT_GRIST_API_KEY') || '',
  DOC_ID: "3pnVrygfNn7c",
  BASE_URL: "https://docs.getgrist.com/api"
};

const ALT_LOGOS_DRIVE = {
  REPUBLIQUE_FILE_ID: "15LaJRves-1aE4ph2BKO4icNVjgidkOfm",
  CFA_GIP_FILE_ID: "19ZDQOGsZTVKybLCCog6HOnxmhOGlEizb",  
  FORPRO_FILE_ID: "152PSUC2Qc-BjLALm526k_gCitC2joMbd"
};


/***** MODELE ALT *****
 * Si le modèle change, remplacez l'identifiant ci-dessous par le gid du nouvel onglet modèle.
 * Le gid est le nombre après #gid= dans l'URL de l'onglet modèle.
 */
const ALT_TEMPLATE_SHEET_ID = 1906697198;
const ALT_TEMPLATE_SHEET_NAME = "MODELE_ALT";


const GRIST_LOGO = {
  API_KEY: GRIST.API_KEY,
  DOC_ID: "8RgMjRoXns1m",
  BASE_URL: "https://docs.getgrist.com/api",
  TABLE: "Etiquettes",
  COLONNE: "LOGO_B64"
};


function gristLogo_(method, path, payload) {
  const options = {
    method: method,
    headers: {
      Authorization: "Bearer " + GRIST_LOGO.API_KEY,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  if (payload) options.payload = JSON.stringify(payload);

  const url = `${GRIST_LOGO.BASE_URL}/docs/${GRIST_LOGO.DOC_ID}${path}`;
  const res = UrlFetchApp.fetch(url, options);

  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error("Erreur Grist logo : " + res.getContentText());
  }

  return JSON.parse(res.getContentText());
}

function recupererLogoLyceeB64_() {
  const data = gristLogo_("GET", `/tables/${GRIST_LOGO.TABLE}/records`);
  const records = data.records || [];
  if (!records.length) return "";

  return records[0].fields[GRIST_LOGO.COLONNE] || "";
}

function ajouterLogoLyceeCAL_(sh) {
  const b64Full = recupererLogoLyceeB64_();
  if (!b64Full) return;

  const mime = b64Full.includes("image/png") ? "image/png" : "image/jpeg";
  const ext = mime === "image/png" ? "png" : "jpg";
  const b64 = b64Full.replace(/^data:image\/\w+;base64,/, "");

  const blob = Utilities.newBlob(
    Utilities.base64Decode(b64),
    mime,
    "logo_lycee." + ext
  );

  breakApartSafe_(sh.getRange("A1:B2"));
  sh.getRange("A1:B2").merge();

  const img = sh.insertImage(blob, 1, 1);
  img.setAnchorCell(sh.getRange("A1"));
  img.setWidth(190);
  img.setHeight(82);

  sh.setColumnWidth(1, 165);
  sh.setColumnWidth(2, 90);
  sh.setRowHeight(1, 44);
  sh.setRowHeight(2, 44);
  sh.setRowHeight(3, 22);
  sh.setRowHeight(4, 22);
}

/************************************************************
 * PLANNING SCOLAIRE MULTI-ANNÉES
 * GRIST + GOOGLE SHEETS + HTML
 * Version complète : 3 feuilles PDF + actualisation périodes + vue HTML zoom
 ************************************************************/

/**************** MENU ****************/


/* Fonction onOpen retirée : version fusionnée en fin de fichier. */



/**************** SUIVI D'EXÉCUTION ****************/

function logProgress_(message, titre) {
  const msg = Utilities.formatDate(new Date(), "Europe/Paris", "HH:mm:ss") + " — " + String(message || "");
  try {
    SpreadsheetApp.getActive().toast(msg, titre || "Planning scolaire", 10);
  } catch (e) {}
  Logger.log((titre || "Planning scolaire") + " | " + msg);
}


function withProgress_(label, fn) {
  logProgress_("Début : " + label);
  const t0 = new Date().getTime();
  try {
    const res = fn();
    logProgress_("Terminé : " + label + " (" + Math.round((new Date().getTime() - t0) / 1000) + " s)");
    return res;
  } catch (e) {
    logProgress_("ERREUR : " + label + " → " + e.message);
    throw e;
  }
}



/**************** PROGRESSION ET MOIS DYNAMIQUES ****************/

function ouvrirFeuilleEtProgress_(sh, message, etape, index, total) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (sh) ss.setActiveSheet(sh);
    const pct = total ? Math.round((index / total) * 100) : "";
    const prefix = total ? ("[" + index + "/" + total + " - " + pct + "%] ") : "";
    logProgress_(prefix + (etape ? etape + " — " : "") + message);
  } catch (e) {
    Logger.log("ouvrirFeuilleEtProgress_ : " + e);
  }
}


function construireMoisAffichageALT_(start, end) {
  const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const out = [];
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  const limite = new Date(end.getFullYear(), end.getMonth(), 1);

  while (d <= limite) {
    out.push({
      name: moisNoms[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth()
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }

  return out;
}

function plageAnneePourLigneALT_(sh, row, mois, blockWidth, lastCol) {
  if (!mois.length) return;

  let startIndex = 0;
  while (startIndex < mois.length) {
    const annee = mois[startIndex].year;
    let endIndex = startIndex;
    while (endIndex + 1 < mois.length && mois[endIndex + 1].year === annee) endIndex++;

    const startCol = 1 + startIndex * blockWidth;
    const width = (endIndex - startIndex + 1) * blockWidth;
    setMergedValue_(sh, row, startCol, 1, width, String(annee))
      .setBackground("#9E9E9E")
      .setFontWeight("bold")
      .setFontSize(10)
      .setHorizontalAlignment("center");

    startIndex = endIndex + 1;
  }
}



function getTypesPlanningDepuisGrist_() {
  try {
    const data = grist_("GET", "/tables/Types_Planning/records");
    return (data.records || [])
      .map(r => r.fields || {})
      .filter(r => String(r.Type || r.Libelle || "").trim());
  } catch (e) {
    Logger.log("Types_Planning non lu : " + e);
    return [];
  }
}

function typesVariablesPlanning_(formationPeriodes) {
  const fixedNorm = [
    "JOURS FERIES",
    "JOUR FERIE",
    "FERIE",
    "VACANCES",
    "VACANCES SCOLAIRES",
    "COURS",
    "COURS UFA",
    "PERIODE D'EXAMENS",
    "PERIODE D EXAMENS",
    "EXAMENS",
    "EXAMEN"
  ];

  const typeMap = {};
  getTypesPlanningDepuisGrist_().forEach(t => {
    const raw = String(t.Type || t.Libelle || "").trim();
    const label = String(t.Libelle || t.Type || "").trim();
    if (!raw && !label) return;
    const normRaw = normaliserCleALT_(raw || label);
    typeMap[normRaw] = {
      label: label || raw,
      color: normalizeHexColor_(t.Couleur) || ""
    };
  });

  const items = [];

  (formationPeriodes || []).forEach(p => {
    const type = String(p.Type || "").trim();
    if (!type) return;

    const norm = normaliserCleALT_(type);
    if (fixedNorm.includes(norm)) return;

    const fromTypes = typeMap[norm] || {};
    const label = fromTypes.label || type;
    const color = normalizeHexColor_(p.Couleur) || fromTypes.color || "#00B0F0";
    const key = norm + "|" + color;

    if (!items.some(x => x.key === key)) {
      items.push({ key, label, type, color });
    }
  });

  return items;
}


function estTypeEntreprisePFMP_(type) {
  const t = String(type || "").toUpperCase();
  return t.includes("PFMP") || t.includes("ENT") || t.includes("ENTREPRISE") || t.includes("STAGE");
}


function grist_(method, path, payload) {
  const options = {
    method: method,
    headers: {
      Authorization: "Bearer " + GRIST.API_KEY,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  if (payload) options.payload = JSON.stringify(payload);

  const url = `${GRIST.BASE_URL}/docs/${GRIST.DOC_ID}${path}`;
  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error(`Erreur Grist ${code} : ${res.getContentText()}`);
  }

  return res.getContentText() ? JSON.parse(res.getContentText()) : {};
}

/**************** STRUCTURE GRIST ****************/

function creerStructureGrist() {
  const existingTables = grist_("GET", "/tables").tables.map(t => t.id);

  const tables = [
    {
      id: "Annees_Scolaires",
      columns: [
        { id: "Code", type: "Text" },
        { id: "Date_debut", type: "Date" },
        { id: "Date_fin", type: "Date" },
        { id: "Zone", type: "Text" },
        { id: "Active", type: "Bool" },
        { id: "Commentaire", type: "Text" }
      ]
    },
    {
      id: "Types_Planning",
      columns: [
        { id: "Type", type: "Text" },
        { id: "Libelle", type: "Text" },
        { id: "Couleur", type: "Text" },
        { id: "Priorite", type: "Int" },
        { id: "Compte_heures", type: "Bool" },
        { id: "Compte_jours", type: "Bool" }
      ]
    },
    {
      id: "Vacances_Scolaires",
      columns: [
        { id: "Annee_scolaire", type: "Text" },
        { id: "Zone", type: "Text" },
        { id: "Nom_vacances", type: "Text" },
        { id: "Date_debut", type: "Date" },
        { id: "Date_fin", type: "Date" },
        { id: "Statut", type: "Text" },
        { id: "Commentaire", type: "Text" },
        { id: "Actif", type: "Bool" }
      ]
    },
    {
      id: "Calendrier_Scolaire",
      columns: [
        { id: "Date", type: "Date" },
        { id: "Annee_scolaire", type: "Text" },
        { id: "Zone", type: "Text" },
        { id: "Semaine_ISO", type: "Int" },
        { id: "Jour_nom", type: "Text" },
        { id: "Jour_numero", type: "Int" },
        { id: "Mois_nom", type: "Text" },
        { id: "Mois_numero", type: "Int" },
        { id: "Est_weekend", type: "Bool" },
        { id: "Est_ferie", type: "Bool" },
        { id: "Nom_ferie", type: "Text" },
        { id: "Est_vacances", type: "Bool" },
        { id: "Nom_vacances", type: "Text" },
        { id: "Statut_vacances", type: "Text" },
        { id: "Duree_jour_defaut", type: "Numeric" }
      ]
    },
    {
      id: "Planning_Periodes",
      columns: [
        { id: "Annee_scolaire", type: "Text" },
        { id: "Formation", type: "Text" },
        { id: "Niveau", type: "Text" },
        { id: "Groupe", type: "Text" },
        { id: "Date_debut", type: "Date" },
        { id: "Date_fin", type: "Date" },
        { id: "Type", type: "Text" },
        { id: "Couleur", type: "Text" },
        { id: "Ligne_sheet", type: "Int" },
        { id: "Duree_jour", type: "Numeric" },
        { id: "Commentaire", type: "Text" },
        { id: "Actif", type: "Bool" }
      ]
    }
  ];

  const tablesToCreate = tables.filter(t => !existingTables.includes(t.id));

  if (tablesToCreate.length > 0) {
    grist_("POST", "/tables", { tables: tablesToCreate });
  }

  insererTypesPlanning_();
  SpreadsheetApp.getActiveSpreadsheet().toast("Structure Grist OK", "Planning scolaire", 5);
}

/**************** TYPES ****************/

function insererTypesPlanning_() {
  const existing = grist_("GET", "/tables/Types_Planning/records")
    .records
    .map(r => r.fields.Type);

  const records = [
    ["COURS", "Cours", "#FFFFFF", 1, true, true],
    ["PFMP", "PFMP / stage", "#00C853", 5, false, true],
    ["MIXITE", "Mixité apprentissage", "#7E57C2", 6, false, true],
    ["EXAMEN", "Examens", "#FF9100", 7, false, true],
    ["VACANCES", "Vacances scolaires", "#424242", 10, false, false],
    ["FERIE", "Jour férié", "#FF1744", 11, false, false],
    ["PROJET", "Projet spécifique", "#C00000", 8, true, true],
    ["BTS_STAGE", "Stage BTS", "#FF00CC", 5, false, true],
    ["MINI_STAGE", "Mini-stage", "#00B0F0", 4, false, true],
    ["BANALISATION", "Journée banalisée", "#FFD966", 9, false, true],
    ["ENTREPRISE", "Immersion entreprise", "#92D050", 5, false, true],
    ["ORAL", "Oral / soutenance", "#F4B183", 7, false, true],
    ["CONSEIL", "Conseil / réunion", "#BFBFBF", 3, false, true],
    ["PORTES_OUVERTES", "Portes ouvertes", "#7030A0", 6, false, true],
    ["PARCOURSUP", "Parcoursup", "#9DC3E6", 4, false, true],
    ["RATTRAPAGE", "Rattrapage", "#D9EAD3", 4, true, true],
    ["AUTRE", "Autre", "#D9D9D9", 1, false, true]
  ];

  const toInsert = records
    .filter(r => !existing.includes(r[0]))
    .map(r => ({
      fields: {
        Type: r[0],
        Libelle: r[1],
        Couleur: r[2],
        Priorite: r[3],
        Compte_heures: r[4],
        Compte_jours: r[5]
      }
    }));

  if (toInsert.length > 0) {
    grist_("POST", "/tables/Types_Planning/records", { records: toInsert });
  }
}

/**************** ANNEES / VACANCES / CALENDRIER GRIST ****************/

function ajouterAnneesExemples() {
  const existing = grist_("GET", "/tables/Annees_Scolaires/records").records.map(r => r.fields.Code);
  const records = [
    { Code: "2026-2027", Date_debut: "2026-09-01", Date_fin: "2027-08-31", Zone: "B", Active: true, Commentaire: "Année active" },
    { Code: "2027-2028", Date_debut: "2027-09-01", Date_fin: "2028-08-31", Zone: "B", Active: false, Commentaire: "Prévisionnelle" }
  ];
  const toInsert = records.filter(r => !existing.includes(r.Code)).map(r => ({ fields: r }));
  if (toInsert.length > 0) grist_("POST", "/tables/Annees_Scolaires/records", { records: toInsert });
  SpreadsheetApp.getActiveSpreadsheet().toast("Années OK", "Planning scolaire", 5);
}

function getAnneeActive_() {
  const data = grist_("GET", "/tables/Annees_Scolaires/records");
  const actives = data.records.map(r => r.fields).filter(r => isTruthy_(r.Active));
  if (actives.length === 0) throw new Error("Aucune année scolaire active.");
  if (actives.length > 1) throw new Error("Plusieurs années actives.");
  const a = actives[0];
  return { CODE: String(a.Code || "").trim(), START: a.Date_debut, END: a.Date_fin, ZONE: String(a.Zone || "B").trim() };
}

function ajouterVacancesPrevisionnelles() {
  const ANNEE = getAnneeActive_();
  const y1 = Number(ANNEE.CODE.split("-")[0]);
  const y2 = Number(ANNEE.CODE.split("-")[1]);
  const existing = grist_("GET", "/tables/Vacances_Scolaires/records").records.map(r => r.fields).filter(r => String(r.Annee_scolaire || "").trim() === ANNEE.CODE).map(r => r.Nom_vacances);
  const records = [
    ["Toussaint", `${y1}-10-17`, `${y1}-11-01`],
    ["Noël", `${y1}-12-19`, `${y2}-01-03`],
    ["Hiver", `${y2}-02-19`, `${y2}-03-05`],
    ["Printemps", `${y2}-04-15`, `${y2}-04-30`],
    ["Pont de l'Ascension", `${y2}-05-06`, `${y2}-05-07`],
    ["Été", `${y2}-07-03`, `${y2}-08-31`]
  ];
  const toInsert = records.filter(r => !existing.includes(r[0])).map(r => ({ fields: { Annee_scolaire: ANNEE.CODE, Zone: ANNEE.ZONE, Nom_vacances: r[0], Date_debut: r[1], Date_fin: r[2], Statut: "PREVISIONNEL", Commentaire: "Dates ajustables", Actif: true } }));
  if (toInsert.length > 0) grist_("POST", "/tables/Vacances_Scolaires/records", { records: toInsert });
  SpreadsheetApp.getActiveSpreadsheet().toast("Vacances OK", "Planning scolaire", 5);
}

function getVacancesDepuisGrist_(ANNEE) {
  const data = grist_("GET", "/tables/Vacances_Scolaires/records");
  return data.records.map(r => r.fields).filter(r => String(r.Annee_scolaire || "").trim() === ANNEE.CODE && String(r.Zone || "").trim() === ANNEE.ZONE && isTruthy_(r.Actif));
}

function genererCalendrierGrist() {
   const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ANNEE = getAnneeActive_();
  const start = parseDateGrist_(ANNEE.START);
  const end = parseDateGrist_(ANNEE.END);
  const feries = getFeriesFrance_(start.getFullYear(), end.getFullYear());
  const vacances = getVacancesDepuisGrist_(ANNEE);
  const existing = grist_("GET", "/tables/Calendrier_Scolaire/records").records.map(r => r.fields.Date + "_" + r.fields.Annee_scolaire);
  const records = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toIso_(d);
    const cle = iso + "_" + ANNEE.CODE;
    if (existing.includes(cle)) continue;
    const ferie = feries[iso] || "";
    const vac = getVacancesPourDate_(d, vacances);
    records.push({ fields: { Date: iso, Annee_scolaire: ANNEE.CODE, Zone: ANNEE.ZONE, Semaine_ISO: getWeekISO_(d), Jour_nom: getJourNom_(d), Jour_numero: d.getDate(), Mois_nom: getMoisNom_(d), Mois_numero: d.getMonth() + 1, Est_weekend: d.getDay() === 0 || d.getDay() === 6, Est_ferie: !!ferie, Nom_ferie: ferie, Est_vacances: !!vac, Nom_vacances: vac ? vac.Nom_vacances : "", Statut_vacances: vac ? vac.Statut : "", Duree_jour_defaut: (d.getDay() === 0 || d.getDay() === 6 || ferie || vac) ? 0 : 7 } });
  }
  if (records.length > 0) grist_("POST", "/tables/Calendrier_Scolaire/records", { records: records });
  SpreadsheetApp.getActiveSpreadsheet().toast("Calendrier Grist OK", "Planning scolaire", 5);
}

/**************** GENERATION DES FEUILLES ****************/

function genererFeuilleCalendrier() {
  const ANNEE = getAnneeActive_();
  const y1 = Number(ANNEE.CODE.split("-")[0]);
  const y2 = Number(ANNEE.CODE.split("-")[1]);

  // Page 1 PDF : vue annuelle hebdomadaire, très lisible.
  genererFeuillePlanningHebdo_(ANNEE, {
    suffix: "_hebdo",
    titre: "PLANNING PFMP - STAGES - MIXITÉ - VUE HEBDOMADAIRE",
    start: ANNEE.START,
    end: ANNEE.END
  });

  // Pages 2 et 3 PDF : vues Gantt journalières conservées.
  genererFeuillePlanning_(ANNEE, { suffix: "_P1_Sept_Noel", titre: "PLANNING PFMP - PÉRIODE 1 : RENTRÉE À NOËL", start: ANNEE.START, end: `${y1}-12-31` });
  genererFeuillePlanning_(ANNEE, { suffix: "_P2_Jan_Aout", titre: "PLANNING PFMP - PÉRIODE 2 : JANVIER À AOÛT", start: `${y2}-01-01`, end: ANNEE.END });

  // On conserve aussi le compact historique, mais il ne sera plus la première page de l'export A3.
  genererFeuillePlanning_(ANNEE, { suffix: "_compact", titre: "PLANNING PFMP - STAGES - MIXITÉ", start: ANNEE.START, end: ANNEE.END });

  SpreadsheetApp.getActiveSpreadsheet().toast("Planning hebdomadaire + 2 périodes + compact générés.", "Planning scolaire", 5);
}


function genererFeuillePlanning_(ANNEE, options) {
  return withProgress_("Gantt " + (options.suffix || ""), () => {
    const sheetName = getSheetName_(ANNEE) + options.suffix;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(sheetName);
    if (!sh) sh = ss.insertSheet(sheetName);

    ouvrirFeuilleEtProgress_(sh, sheetName, "Préparation feuille", 0, 0);
    logProgress_("Nettoyage feuille : " + sheetName);
    resetSheetComplet_(sh);

    const vacances = getVacancesDepuisGrist_(ANNEE);
    const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
    const plageAffichage = getPlageAffichagePlanning_(options.start, options.end, periodes);
    const start = plageAffichage.start;
    const end = plageAffichage.end;

    const feries = getFeriesFrance_(start.getFullYear(), end.getFullYear());
    const segments = construireSegmentsMixtes_(start, end, vacances);

    const nbCols = segments.length;
    const startCol = 3;
    const firstPlanningRow = 9;
    const lignes = creerLignesPlanning_(periodes, firstPlanningRow);
    const nbLignesPlanning = Object.keys(lignes).length;

    const lastUsefulRow = Math.max(
      8,
      getMaxRowPlanning_(lignes, firstPlanningRow + Math.max(nbLignesPlanning, 1) - 1)
    );
    const gridHeight = lastUsefulRow - 2;
    const lastCol = startCol + nbCols - 1;
    const totalCol = lastCol + 1;

    if (nbCols <= 0) throw new Error("Aucune colonne générée pour " + sheetName);

    ensureSheetSize_(sh, Math.max(lastUsefulRow, 35), totalCol);

    // Nettoyage dur de la zone utile et de la zone tampon : évite les fantômes d'anciennes générations.
    sh.getRange(1, 1, Math.min(sh.getMaxRows(), 120), Math.min(sh.getMaxColumns(), Math.max(totalCol + 10, 80)))
      .clearContent()
      .clearFormat()
      .clearDataValidations()
      .clearNote();

    const rowSemaines = [], rowMois = [], rowJours = [], rowDates = [], rowInfos = [];
    const backgrounds = [], fontColors = [];
    for (let r = 0; r < gridHeight; r++) { backgrounds.push([]); fontColors.push([]); }

    segments.forEach(seg => {
      const d = seg.start;
      const iso = toIso_(d);
      const ferie = feries[iso] || "";

      rowSemaines.push(getWeekISO_(d));
      rowMois.push(getMoisNom_(d));

      if (seg.type === "VACANCES_HEBDO") {
        rowJours.push("Vac.");
        rowDates.push(seg.label || "");
        rowInfos.push(vacancesInitiale_(seg.nom));
      } else {
        rowJours.push(getJourNomCourt_(d));
        rowDates.push(d.getDate());
        rowInfos.push(ferie || "");
      }

      let bg = "#FFFFFF", color = "#000000";
      if (seg.type === "VACANCES_HEBDO") { bg = "#1F1F1F"; color = "#FFFFFF"; }
      if (ferie && seg.type !== "VACANCES_HEBDO") { bg = "#FF1744"; color = "#FFFFFF"; }

      for (let r = 0; r < gridHeight; r++) {
        backgrounds[r].push(bg);
        fontColors[r].push(color);
      }
    });

    sh.getRange(3, startCol, gridHeight, nbCols).setBackgrounds(backgrounds);
    sh.getRange(3, startCol, gridHeight, nbCols).setFontColors(fontColors);

    const generated = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");
    sh.getRange(1, 3, 1, totalCol - 2).merge()
      .setValue(options.titre + "   ·   généré le " + generated)
      .setHorizontalAlignment("right")
      .setFontWeight("bold")
      .setFontSize(9)
      .setBackground("#0000FF")
      .setFontColor("#FFFFFF");

    sh.getRange(2, 3, 1, totalCol - 2).merge()
      .setValue("Année scolaire " + ANNEE.CODE + " - Zone " + ANNEE.ZONE)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true)
      .setFontWeight("bold")
      .setFontSize(8);

    sh.getRange(3, 2).setValue("Semaine");
    sh.getRange(4, 2).setValue("Mois");
    sh.getRange(5, 2).setValue("Jour");
    sh.getRange(6, 2).setValue("Date");
    sh.getRange(7, 2).setValue("Info");

    sh.getRange(3, startCol, 1, nbCols).setValues([rowSemaines]);
    sh.getRange(4, startCol, 1, nbCols).setValues([rowMois]);
    sh.getRange(5, startCol, 1, nbCols).setValues([rowJours]);
    sh.getRange(6, startCol, 1, nbCols).setValues([rowDates]);
    sh.getRange(7, startCol, 1, nbCols).setValues([rowInfos]);

    sh.getRange(3, startCol, 2, nbCols).setBackground("#FFFFFF").setFontColor("#000000").setFontWeight("bold");
    sh.getRange(3, 2, 5, 1).setHorizontalAlignment("right").setFontWeight("bold").setFontSize(8);

    Object.keys(lignes).forEach(key => {
      const info = lignes[key];
      sh.getRange(info.row, 1)
        .setValue(info.formation)
        .setBackground(info.couleur)
        .setFontColor(getTextColorForBackground_(info.couleur))
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(true);

      sh.getRange(info.row, 2)
        .setValue(info.niveau)
        .setBackground(info.couleur)
        .setFontColor(getTextColorForBackground_(info.couleur))
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(true);
    });

    if (nbLignesPlanning > 0) fusionnerCellulesIdentiquesColonne_(sh, firstPlanningRow, lastUsefulRow, 1);

    appliquerStyleFamillesCAL_(sh, lignes, totalCol);

    logProgress_("Application périodes : " + sheetName);
    appliquerPeriodesPlanningSurSegments_(sh, periodes, segments, lignes, startCol);

    fusionnerIdentiquesSurLigne_(sh, 3, startCol, lastCol);
    fusionnerIdentiquesSurLigne_(sh, 4, startCol, lastCol);
    fusionnerValeurSurLigne_(sh, 5, startCol, lastCol, "Vac.");
    fusionnerIdentiquesSurLigne_(sh, 7, startCol, lastCol);

    sh.setFrozenRows(7);
    sh.setFrozenColumns(2);

    const columnWidth = options.suffix === "_compact" ? 14 : 22;
    const fontSize = options.suffix === "_compact" ? 10 : 12;
    sh.setColumnWidths(startCol, nbCols, columnWidth);
    sh.setColumnWidths(1, 2, 95);
    sh.setRowHeight(1, 22);
    sh.setRowHeight(2, 20);
    sh.setRowHeight(3, 20);
    sh.setRowHeight(4, 22);
    sh.setRowHeight(5, 20);
    sh.setRowHeight(6, 20);
    sh.setRowHeight(7, 20);
    sh.showRows(6);

    sh.getRange(1, 1, lastUsefulRow, totalCol)
      .setFontFamily("Arial")
      .setFontSize(fontSize)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

    sh.getRange(3, startCol, 5, nbCols)
      .setFontSize(fontSize)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false);

    // Compact : ligne Date un peu plus petite pour éviter l'écrasement.
    if (options.suffix === "_compact") {
      sh.getRange(6, startCol, 1, nbCols).setFontSize(8);
    }

    sh.getRange(1, 1, 2, totalCol).setFontWeight("bold");

    if (nbLignesPlanning > 0) {
      sh.getRange(firstPlanningRow, 1, lastUsefulRow - firstPlanningRow + 1, totalCol)
        .setBorder(true, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID)
        .setVerticalAlignment("middle")
        .setFontSize(fontSize);
      sh.setRowHeights(firstPlanningRow, lastUsefulRow - firstPlanningRow + 1, 18);
    }

    appliquerTraitsFinDeSemaine_(sh, segments, startCol, gridHeight);
    ajouterColonneTotal_(sh, firstPlanningRow, lastUsefulRow - firstPlanningRow + 1, startCol, lastCol, totalCol, lastUsefulRow);

    // Nettoyage des lignes sous la dernière formation visible.
    const maxRowsAfter = sh.getMaxRows();
    if (maxRowsAfter > lastUsefulRow) {
      sh.getRange(lastUsefulRow + 1, 1, maxRowsAfter - lastUsefulRow, totalCol)
        .clearContent()
        .clearFormat()
        .clearNote();
    }

    SpreadsheetApp.flush();
    ajusterDimensionsFeuille_(sh, lastUsefulRow, totalCol);
    mettreAJourSommairePlanning();
  });
}



/* Fonction genererFeuillePlanningHebdo_ retirée : version fusionnée en fin de fichier. */


function construireSegmentsHebdomadaires_(start, end) {
  const segments = [];
  let d = normalize_(start);

  while (d <= end) {
    const segStart = new Date(d);
    const segEnd = new Date(d);

    // Fin de semaine scolaire = vendredi, ou fin de période si plus tôt.
    const day = segEnd.getDay() || 7;
    segEnd.setDate(segEnd.getDate() + (5 - day));
    if (segEnd < segStart) segEnd.setTime(segStart.getTime());
    if (segEnd > end) segEnd.setTime(end.getTime());

    segments.push({
      type: "SEMAINE",
      start: new Date(segStart),
      end: new Date(segEnd)
    });

    // Lundi suivant
    d = new Date(segEnd);
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== 1 && d <= end) d.setDate(d.getDate() + 1);
  }

  return segments;
}
function semaineEstNoireVacances_(seg, vacances) {
  return semaineContientVacances_(seg, vacances);
}

function semaineContientVacances_(seg, vacances) {
  let nbOuvres = 0;
  let nbVacances = 0;

  for (let d = new Date(seg.start); d <= seg.end; d.setDate(d.getDate() + 1)) {
    const js = d.getDay();
    if (js === 0 || js === 6) continue;

    nbOuvres++;
    if (getVacancesPourDate_(d, vacances)) nbVacances++;
  }

  return nbOuvres > 0 && nbOuvres === nbVacances;
}


function semaineContientFerie_(seg, feries) {
  for (let d = new Date(seg.start); d <= seg.end; d.setDate(d.getDate() + 1)) {
    if (feries[toIso_(d)]) return true;
  }
  return false;
}





function breakApartSafe_(range) {
  try {
    range.breakApart();
    return;
  } catch (e) {
    try {
      const r1 = range.getRow();
      const c1 = range.getColumn();
      const r2 = r1 + range.getNumRows() - 1;
      const c2 = c1 + range.getNumColumns() - 1;

      const merged = range.getMergedRanges();
      merged.forEach(mr => {
        const mr1 = mr.getRow();
        const mc1 = mr.getColumn();
        const mr2 = mr1 + mr.getNumRows() - 1;
        const mc2 = mc1 + mr.getNumColumns() - 1;

        // On défusionne les plages qui croisent la zone demandée.
        const intersects = !(mr2 < r1 || mr1 > r2 || mc2 < c1 || mc1 > c2);
        if (intersects) {
          try { mr.breakApart(); } catch (err) {}
        }
      });
    } catch (err) {
      Logger.log("breakApartSafe_ ignoré : " + err);
    }
  }
}


function clearRangeSafe_(range) {
  breakApartSafe_(range);
  range.clearContent();
}

/**************** PLAGES D'AFFICHAGE OPTIONNELLES ****************/


function getPlageAffichagePourInfo_(ANNEE, info, fallbackStart, fallbackEnd) {
  const periodes = info && info.periodes ? info.periodes : [];
  return getPlageAffichagePlanning_(fallbackStart || ANNEE.START, fallbackEnd || ANNEE.END, periodes);
}

function getPlageAffichagePlanning_(defaultStart, defaultEnd, periodes) {
  let start = parseDateGrist_(defaultStart);
  let end = parseDateGrist_(defaultEnd);

  (periodes || []).forEach(p => {
    const ds = parseDateGrist_(p.Date_affichage_debut || p.Affichage_debut || p.Debut_affichage);
    const df = parseDateGrist_(p.Date_affichage_fin || p.Affichage_fin || p.Fin_affichage);

    if (ds && ds.getTime() < start.getTime()) start = ds;
    if (df && df.getTime() > end.getTime()) end = df;
  });

  return { start: start, end: end };
}

function getMaxRowPlanning_(lignes, fallbackLastRow) {
  let maxRow = fallbackLastRow || 0;
  Object.keys(lignes || {}).forEach(k => {
    const r = Number(lignes[k].row || 0);
    if (r > maxRow) maxRow = r;
  });
  return maxRow;
}

function nettoyerFondLignesEnteteHebdo_(sh, startCol, lastCol) {
  // La ligne Mois doit rester blanche même si certaines semaines du mois sont en vacances.
  sh.getRange(5, startCol, 1, lastCol - startCol + 1)
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setFontWeight("bold");
}

function ajouterSyntheseProfsCAP_(sh, mois, blockWidth, firstDayRow, lastDayRow, startRow) {
  const startCol = 50; // AX
  const titreRow = 2;
  const headerRow = 3;
  const firstDataRow = 4;
  const maxRows = 24;
  const width = mois.length + 2;
  const totalCol = startCol + width - 1;

  ensureSheetSize_(sh, Math.max(75, firstDataRow + maxRows + 2), Math.max(totalCol + 2, sh.getLastColumn()));

  try { sh.showColumns(startCol, Math.min(width + 2, sh.getMaxColumns() - startCol + 1)); } catch(e) {}

  const zone = sh.getRange(titreRow, startCol, maxRows + 3, width);
  breakApartSafe_(zone);
  zone.clearContent().clearFormat().clearNote();

  const profs = [];
  const data = {};

  mois.forEach((m, idx) => {
    const monthStartCol = 1 + idx * blockWidth;
    const hCol = monthStartCol + 2; // H
    const pCol = monthStartCol + 3; // P

    for (let r = firstDayRow; r <= lastDayRow; r++) {
      const prof = String(sh.getRange(r, pCol).getValue() || "").trim();
      const h = Number(sh.getRange(r, hCol).getValue()) || 0;
      if (!prof || !h) continue;

      if (!data[prof]) {
        data[prof] = Array(mois.length).fill(0);
        profs.push(prof);
      }
      data[prof][idx] += h;
    }
  });

  profs.sort();

  sh.getRange(titreRow, startCol, 1, width)
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(9)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sh.getRange(titreRow, startCol).setValue("Synthèse professeurs");

  const headers = ["Professeur"].concat(mois.map(m => m.name)).concat(["Total annuel"]);
  sh.getRange(headerRow, startCol, 1, width)
    .setValues([headers])
    .setBackground("#D9EAF7")
    .setFontWeight("bold")
    .setFontSize(8)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    const prof = profs[i] || "";
    if (!prof) {
      rows.push([""].concat(Array(mois.length).fill("")).concat([""]));
      continue;
    }
    const vals = data[prof] || Array(mois.length).fill(0);
    const total = vals.reduce((a, b) => a + b, 0);
    rows.push([prof].concat(vals.map(v => v || "")).concat([total || ""]));
  }

  if (!profs.length) {
    rows[0][0] = "Aucune initiale P + heure H trouvée";
  }

  sh.getRange(firstDataRow, startCol, maxRows, width)
    .setValues(rows)
    .setFontSize(8)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sh.getRange(firstDataRow, startCol, maxRows, 1)
    .setBackground("#FFF9C4")
    .setFontWeight("bold");

  sh.getRange(firstDataRow, totalCol, maxRows, 1)
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  // Ligne de contrôle : somme des totaux annuels professeurs.
  const controleRow = firstDataRow + maxRows;
  const totalSynthese = profs.reduce((acc, prof) => {
    const vals = data[prof] || [];
    return acc + vals.reduce((a, b) => a + b, 0);
  }, 0);

  sh.getRange(controleRow, startCol, 1, width)
    .clearContent()
    .setBackground("#FFF2CC")
    .setFontColor("#000000")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.getRange(controleRow, startCol).setValue("Total synthèse profs");
  sh.getRange(controleRow, totalCol)
    .setValue(totalSynthese)
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  sh.getRange(titreRow, startCol, maxRows + 3, width)
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID)
    .setFontFamily("Arial");

  sh.setRowHeight(titreRow, 28);
  sh.setRowHeight(headerRow, 30);
  sh.setRowHeights(firstDataRow, maxRows + 1, 22);

  sh.setColumnWidth(startCol, 110);
  for (let c = startCol + 1; c <= totalCol; c++) sh.setColumnWidth(c, 58);
}



/* Fonction abregerTypeHebdo_ retirée : version fusionnée en fin de fichier. */



/* Fonction dessinerBlocHebdo_ retirée : version fusionnée en fin de fichier. */


/**************** ACTUALISATION / PDF / HTML ****************/



function trouverOngletsALTSelectionnesSommaire_(ss) {
  const sommaire = ss.getSheetByName("SOMMAIRE_PLANNING");
  if (!sommaire) return [];

  const lastRow = sommaire.getLastRow();
  if (lastRow < 4) return [];

  const values = sommaire.getRange(4, 1, lastRow - 3, 8).getValues();

  return values
    .map((r, i) => ({
      row: i + 4,
      onglet: String(r[0] || "").trim(),
      checked: r[3] === true
    }))
    .filter(x =>
      x.checked &&
      x.onglet &&
      x.onglet.startsWith("ALT_") &&
      !x.onglet.startsWith("ALT_DETAIL_")
    )
    .map(x => {
      const sh = ss.getSheetByName(x.onglet);
      return sh ? { sheet: sh, row: x.row, name: x.onglet } : null;
    })
    .filter(Boolean);
}

function trouverCiblesActualisationALT_(ss) {
  // Priorité 1 : cases cochées dans le sommaire.
  const cochees = trouverOngletsALTSelectionnesSommaire_(ss);
  if (cochees.length) return cochees;

  // Priorité 2 : si aucun ALT coché, on travaille uniquement sur l'onglet actif.
  const active = ss.getActiveSheet();
  if (
    active &&
    active.getName().startsWith("ALT_") &&
    !active.getName().startsWith("ALT_DETAIL_")
  ) {
    return [{ sheet: active, row: null, name: active.getName() }];
  }

  return [];
}


function actualiserPlanningPeriodesSeulement() {
  /*
   * Relit Planning_Periodes dans Grist et remet à jour uniquement les ALT ciblés,
   * sans effacer les saisies manuelles H/P.
   *
   * Ciblage :
   * - si un ou plusieurs ALT sont cochés dans le sommaire colonne D : seulement ceux-là ;
   * - sinon : uniquement l'onglet ALT actif ;
   * - jamais tous les ALT par défaut.
   */
  const ANNEE = getAnneeActive_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cibles = trouverCiblesActualisationALT_(ss);

  if (!cibles.length) {
    ss.toast("Aucun ALT coché dans le sommaire et aucun onglet ALT actif.", "Actualisation périodes", 8);
    return;
  }

  // Lecture Grist une seule fois : beaucoup plus rapide.
  const vacances = getVacancesDepuisGrist_(ANNEE);
  const toutesPeriodes = getPlanningPeriodesDepuisGrist_(ANNEE);

  let ok = 0;
  const erreurs = [];

  cibles.forEach((item, idx) => {
    const sh = item.sheet;
    try {
      ss.setActiveSheet(sh);
      ss.toast(
        "Actualisation périodes : " + sh.getName() + " (" + (idx + 1) + "/" + cibles.length + ")",
        "Planning scolaire",
        8
      );

      appliquerPeriodesALTDepuisGristSansEffacerSaisies_(sh, ANNEE, vacances, toutesPeriodes);
      ok++;

      const sommaire = ss.getSheetByName("SOMMAIRE_PLANNING");
      if (sommaire && item.row) {
        sommaire.getRange(item.row, 4).setValue(false);
        sommaire.getRange(item.row, 8).setValue("Périodes actualisées");
      }
    } catch (err) {
      erreurs.push(sh.getName() + " : " + err.message);
      const sommaire = ss.getSheetByName("SOMMAIRE_PLANNING");
      if (sommaire && item.row) {
        sommaire.getRange(item.row, 8).setValue("ERREUR actualisation : " + err.message);
      }
    }
  });

  if (erreurs.length) {
    throw new Error(ok + " ALT actualisé(s), " + erreurs.length + " erreur(s) :\n" + erreurs.join("\n"));
  }

  ss.toast(ok + " ALT actualisé(s) sans effacer les saisies.", "Planning scolaire", 8);
}


function exporterPDF_A3() {
  const ANNEE = getAnneeActive_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetsToExport = [
    getSheetName_(ANNEE) + "_hebdo",
    getSheetName_(ANNEE) + "_P1_Sept_Noel",
    getSheetName_(ANNEE) + "_P2_Jan_Aout"
  ];

  sheetsToExport.forEach(name => {
    if (!ss.getSheetByName(name)) {
      throw new Error("Feuille manquante : " + name + ". Lancez d'abord la génération des feuilles Google Sheets.");
    }
  });

  const allSheets = ss.getSheets();
  const hiddenStates = allSheets.map(sh => ({ sheet: sh, hidden: sh.isSheetHidden() }));

  allSheets.forEach(sh => {
    if (sheetsToExport.includes(sh.getName())) sh.showSheet();
    else sh.hideSheet();
  });

  SpreadsheetApp.flush();

  const url =
    "https://docs.google.com/spreadsheets/d/" + ss.getId() +
    "/export?format=pdf" +
    "&size=A3" +
    "&portrait=false" +
    "&fitw=true" +
    "&sheetnames=false" +
    "&printtitle=false" +
    "&pagenumbers=true" +
    "&gridlines=false" +
    "&fzr=false" +
    "&scale=4" +
    "&top_margin=0.15" +
    "&bottom_margin=0.15" +
    "&left_margin=0.15" +
    "&right_margin=0.15";

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  hiddenStates.forEach(s => {
    if (s.hidden) s.sheet.hideSheet();
    else s.sheet.showSheet();
  });

  SpreadsheetApp.flush();

  if (response.getResponseCode() !== 200) {
    throw new Error("Erreur PDF : " + response.getContentText());
  }

  const file = DriveApp.createFile(
    response.getBlob().setName("Planning_" + ANNEE.CODE + "_A3_hebdo_P1_P2.pdf")
  );

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<p><a href="' + file.getUrl() + '" target="_blank">Ouvrir le PDF A3</a></p>').setWidth(420).setHeight(120),
    "Export PDF A3"
  );
}


function creerVueHTMLPlanning() {
  const ANNEE = getAnneeActive_();
  const html = genererHTMLPlanning_(ANNEE);

  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService
      .createHtmlOutput(html)
      .setWidth(3000)
      .setHeight(2000),
    "Planning HTML avec zoom"
  );
}


function genererHTMLPlanning_(ANNEE) {
  const start = parseDateGrist_(ANNEE.START);
  const end = parseDateGrist_(ANNEE.END);
  const vacances = getVacancesDepuisGrist_(ANNEE);
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const segments = construireSegmentsMixtes_(start, end, vacances);
  const feries = getFeriesFrance_(start.getFullYear(), end.getFullYear());

  const groupesALT = creerGroupesPlanningIdentiquesALT_(periodes);
  const lignesBrutes = creerLignesPlanning_(periodes, 0);
  const lignesIndividuelles = Object.keys(lignesBrutes).map(k => lignesBrutes[k]);

  const headerCells = segments.map(seg => {
    const d = seg.start;
    const iso = toIso_(d);
    const ferie = feries[iso] || "";

    const bg = seg.type === "VACANCES_HEBDO"
      ? "#1F1F1F"
      : (ferie ? "#FF1744" : "#FFFFFF");

    const color = getTextColorForBackground_(bg);
    const jour = seg.type === "VACANCES_HEBDO" ? "Vac." : getJourNomCourt_(d);
    const date = seg.type === "VACANCES_HEBDO" ? (seg.label || "") : d.getDate();

    return (
      '<th style="background:' + bg + ';color:' + color + ';" data-tip="' +
      escapeHtml_(getMoisNom_(d) + " - Semaine " + getWeekISO_(d) + " - " + jour + " " + date) +
      '">' +
      '<div class="week">' + getWeekISO_(d) + '</div>' +
      '<div>' + jour + '</div>' +
      '<div>' + date + '</div>' +
      '</th>'
    );
  }).join("");

  const rows = lignesList.map(info => {
    let cells = "";
    let i = 0;

    while (i < segments.length) {
      const seg = segments[i];
      const periode = trouverPeriodePourSegment_(periodes, info, seg);

      if (!periode) {
        const bg = getBackgroundSegmentHTML_(seg, feries);
        const color = getTextColorForBackground_(bg);

        cells +=
          '<td class="empty" style="background:' + bg + ';color:' + color + ';"></td>';

        i++;
        continue;
      }

      let colspan = 1;

      while (
        i + colspan < segments.length &&
        trouverPeriodePourSegment_(periodes, info, segments[i + colspan]) === periode
      ) {
        colspan++;
      }

      const bg = periode.Couleur || "#00C853";
      const color = getTextColorForBackground_(bg);

      const tip =
        (periode.Type || "") + " | " +
        (periode.Formation || "") + " | " +
        (periode.Niveau || "") + " | " +
        formatDateFr_(parseDateGrist_(periode.Date_debut)) + " → " +
        formatDateFr_(parseDateGrist_(periode.Date_fin)) +
        (periode.Commentaire ? " | " + periode.Commentaire : "");

      cells +=
        '<td class="periode" colspan="' + colspan + '" ' +
        'style="background:' + bg + ';color:' + color + ';" ' +
        'data-tip="' + escapeHtml_(tip) + '">' +
        escapeHtml_(periode.Type || "") +
        '</td>';

      i += colspan;
    }

    const bg = info.couleur || "#FFFFFF";
    const color = getTextColorForBackground_(bg);

    return (
      '<tr>' +
      '<th class="sticky left1" style="background:' + bg + ';color:' + color + ';">' +
      escapeHtml_(info.formation || "") +
      '</th>' +
      '<th class="sticky left2" style="background:' + bg + ';color:' + color + ';">' +
      escapeHtml_(info.niveau || "") +
      '</th>' +
      cells +
      '</tr>'
    );
  }).join("");

  
  return (
    '<!doctype html>' +
    '<html lang="fr">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<title>Planning ' + escapeHtml_(ANNEE.CODE) + '</title>' +
    '<style>' +

    'html,body{width:100vw;height:100vh;font-family:Arial,sans-serif;margin:0;background:#f4f5f7;color:#111;overflow:hidden;font-size:12px;}' +
    '.toolbar{position:sticky;top:0;z-index:30;background:#1b396a;color:#fff;padding:10px 14px;display:flex;gap:16px;align-items:center;}' +
   '.toolbar h1{font-size:20px;margin:0;font-weight:bold;}' +
    '.toolbar button{border:0;border-radius:8px;padding:6px 10px;font-weight:bold;cursor:pointer;}' +
    '.wrap{position:relative;height:calc(100vh - 52px);padding:12px;overflow:auto;cursor:crosshair;}' +
    'table{border-collapse:collapse;background:white;transform-origin:top left;}' +
  
    'th,td{border:1px solid #999;min-width:24px;height:28px;text-align:center;font-size:12px;padding:2px;white-space:nowrap;font-weight:bold;}' +
    'thead th{position:sticky;top:0;z-index:20;background:#fff;}' +
    '.sticky{position:sticky;z-index:25;font-weight:bold;}' +
    '.left1{left:0;min-width:110px;}' +
    '.left2{left:115px;min-width:90px;}' +
   '.week{font-weight:bold;font-size:12px;}' +
    '.periode{font-weight:bold;cursor:zoom-in;border-left:2px solid rgba(0,0,0,.35);border-right:2px solid rgba(0,0,0,.35);}' +
    '.empty:hover,.periode:hover,th:hover{outline:3px solid #ffbf00;}' +
    '#loupe{position:fixed;display:none;z-index:1000;pointer-events:none;background:#fff;border:3px solid #1b396a;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:12px;max-width:460px;font-size:18px;font-weight:bold;}' +
    '#selectionBox{position:absolute;display:none;z-index:900;border:2px dashed #ffbf00;background:rgba(255,191,0,.18);pointer-events:none;}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="toolbar">' +
    '<h1>Planning ' + escapeHtml_(ANNEE.CODE) + '</h1>' +
    '<button onclick="zoom(1.1)">Zoom +</button>' +
    '<button onclick="zoom(0.9)">Zoom -</button>' +
    '<button onclick="zoomReset()">100%</button>' +
    '</div>' +
    '<div class="wrap">' +
    '<div id="selectionBox"></div>' +
    '<table id="planning">' +
    '<thead>' +
    '<tr>' +
    '<th class="sticky left1">Formation</th>' +
    '<th class="sticky left2">Niveau</th>' +
    headerCells +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    rows +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '<div id="loupe"></div>' +
    '<script>' +
    'let z=1;' +
    'const table=document.getElementById("planning");' +
    'const wrap=document.querySelector(".wrap");' +
    'const box=document.getElementById("selectionBox");' +
    'function zoom(f){z*=f;table.style.transform="scale("+z+")";}' +
    'function zoomReset(){z=1;table.style.transform="scale(1)";wrap.scrollLeft=0;wrap.scrollTop=0;}' +
    'const loupe=document.getElementById("loupe");' +
    'let selecting=false,startX=0,startY=0;' +
    'document.addEventListener("mousemove",e=>{' +
    'if(selecting){' +
    'const x=e.clientX-wrap.getBoundingClientRect().left+wrap.scrollLeft;' +
    'const y=e.clientY-wrap.getBoundingClientRect().top+wrap.scrollTop;' +
    'const left=Math.min(startX,x),top=Math.min(startY,y);' +
    'const width=Math.abs(x-startX),height=Math.abs(y-startY);' +
    'box.style.display="block";box.style.left=left+"px";box.style.top=top+"px";box.style.width=width+"px";box.style.height=height+"px";return;' +
    '}' +
    'const el=e.target.closest("[data-tip]");' +
    'if(!el){loupe.style.display="none";return;}' +
    'loupe.textContent=el.dataset.tip;' +
    'loupe.style.display="block";' +
    'loupe.style.left=(e.clientX+18)+"px";' +
    'loupe.style.top=(e.clientY+18)+"px";' +
    '});' +
    'wrap.addEventListener("mousedown",e=>{' +
    'if(e.button!==0)return;' +
    'selecting=true;' +
    'const r=wrap.getBoundingClientRect();' +
    'startX=e.clientX-r.left+wrap.scrollLeft;' +
    'startY=e.clientY-r.top+wrap.scrollTop;' +
    'box.style.display="block";box.style.left=startX+"px";box.style.top=startY+"px";box.style.width="0px";box.style.height="0px";' +
    '});' +
    'document.addEventListener("mouseup",e=>{' +
    'if(!selecting)return;' +
    'selecting=false;' +
    'const r=wrap.getBoundingClientRect();' +
    'const endX=e.clientX-r.left+wrap.scrollLeft;' +
    'const endY=e.clientY-r.top+wrap.scrollTop;' +
    'const left=Math.min(startX,endX);' +
    'const top=Math.min(startY,endY);' +
    'const width=Math.abs(endX-startX);' +
    'const height=Math.abs(endY-startY);' +
    'box.style.display="none";' +
    'if(width<20||height<20)return;' +
    'const targetZoom=Math.min((wrap.clientWidth-40)/width,(wrap.clientHeight-40)/height);' +
    'z=Math.max(0.5,Math.min(8,z*targetZoom));' +
    'table.style.transform="scale("+z+")";' +
    'wrap.scrollLeft=Math.max(0,left*z-40);' +
    'wrap.scrollTop=Math.max(0,top*z-40);' +
    '});' +
    'wrap.addEventListener("dblclick",()=>zoomReset());' +
    '</script>' +
    '</body>' +
    '</html>'
  );

}






/**************** FONCTIONS PLANNING ****************/


/* Fonction getPlanningPeriodesDepuisGrist_ retirée : version fusionnée en fin de fichier. */


/* Fonction creerLignesPlanning_ retirée : version fusionnée en fin de fichier. */




/* Fonction appliquerPeriodesPlanningSurSegments_ retirée : version fusionnée en fin de fichier. */



/* Fonction dessinerBlocJournalierCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction ecrireLibelleAuMilieuBlocCAL_ retirée : version fusionnée en fin de fichier. */


function construireSegmentsMixtes_(start, end, vacances) { const segments = []; let d = new Date(start); while (d <= end) { const vac = getVacancesPourDate_(d, vacances); if (vac) { const rawStart = parseDateGrist_(vac.Date_debut), rawEnd = parseDateGrist_(vac.Date_fin), nom = vac.Nom_vacances || "", isPetitesVacances = nom === "Toussaint" || nom === "Noël" || nom === "Hiver" || nom === "Printemps"; if (isPetitesVacances) { const displayStart = getNextMonday_(rawStart), displayEnd = getPreviousFriday_(rawEnd); if (d < displayStart) { const jour = d.getDay(); if (jour >= 1 && jour <= 5) segments.push({ type: "JOUR", nom: "", start: new Date(d), end: new Date(d), label: "" }); d.setDate(d.getDate() + 1); continue; } if (d > displayEnd) { d.setDate(d.getDate() + 1); continue; } const blocs = creerBlocsVacancesParSemaineISO_(d, displayEnd, 2); blocs.forEach((bloc, index) => segments.push({ type: "VACANCES_HEBDO", nom: nom, start: new Date(bloc.start), end: new Date(bloc.end), label: "S" + (index + 1) })); d = new Date(blocs[blocs.length - 1].end); d.setDate(d.getDate() + 1); continue; } const realStart = d > rawStart ? new Date(d) : new Date(rawStart), realEnd = rawEnd < end ? new Date(rawEnd) : new Date(end); segments.push({ type: "VACANCES_HEBDO", nom: nom, start: new Date(realStart), end: new Date(realEnd), label: "Vac." }); d = new Date(realEnd); d.setDate(d.getDate() + 1); continue; } const jour = d.getDay(); if (jour >= 1 && jour <= 5) segments.push({ type: "JOUR", nom: "", start: new Date(d), end: new Date(d), label: "" }); d.setDate(d.getDate() + 1); } return segments; }
function getNextMonday_(date) { const d = new Date(date); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return normalize_(d); }
function getPreviousFriday_(date) { const d = new Date(date); while (d.getDay() !== 5) d.setDate(d.getDate() - 1); return normalize_(d); }
function creerBlocsVacancesParSemaineISO_(start, end, maxBlocs) { const blocs = []; let d = new Date(start); while (d <= end && blocs.length < maxBlocs) { const semaine = getWeekISO_(d), anneeIso = getISOWeekYear_(d), blocStart = new Date(d); let blocEnd = new Date(d); while (blocEnd <= end) { const next = new Date(blocEnd); next.setDate(next.getDate() + 1); if (next > end) break; if (getWeekISO_(next) !== semaine || getISOWeekYear_(next) !== anneeIso) break; blocEnd = next; } blocs.push({ start: new Date(blocStart), end: new Date(blocEnd) }); d = new Date(blocEnd); d.setDate(d.getDate() + 1); } return blocs; }
function getISOWeekYear_(date) { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); return d.getUTCFullYear(); }
function appliquerTraitsFinDeSemaine_(sh, segments, startCol, maxRows) { segments.forEach((seg, index) => { const d = seg.end || seg.start; if (d.getDay() === 5) sh.getRange(3, startCol + index, maxRows, 1).setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK); }); }
function ajouterColonneTotal_(sh, firstPlanningRow, nbLignesPlanning, startCol, lastCol, totalCol, maxRows) { sh.getRange(1, totalCol, maxRows, 1).setBackground("#F6A000").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID); sh.getRange(7, totalCol).setValue("Total"); for (let r = firstPlanningRow; r < firstPlanningRow + nbLignesPlanning; r++) sh.getRange(r, totalCol).setFormulaR1C1("=SUM(RC" + startCol + ":RC" + lastCol + ")"); sh.setColumnWidth(totalCol, 45); }
function fusionnerIdentiquesSurLigne_(sh, row, startCol, lastCol) { let currentValue = sh.getRange(row, startCol).getValue(), mergeStart = startCol; for (let col = startCol + 1; col <= lastCol + 1; col++) { const value = col <= lastCol ? sh.getRange(row, col).getValue() : "__END__"; if (value !== currentValue) { const width = col - mergeStart; if (currentValue !== "" && width > 1) { const range = sh.getRange(row, mergeStart, 1, width); breakApartSafe_(range); range.merge(); range.setHorizontalAlignment("center"); } currentValue = value; mergeStart = col; } } }
function fusionnerValeurSurLigne_(sh, row, startCol, lastCol, valeurCible) { let mergeStart = null; for (let col = startCol; col <= lastCol + 1; col++) { const value = col <= lastCol ? sh.getRange(row, col).getValue() : "__END__"; if (value === valeurCible) { if (mergeStart === null) mergeStart = col; } else { if (mergeStart !== null) { const width = col - mergeStart; if (width > 1) { const range = sh.getRange(row, mergeStart, 1, width); breakApartSafe_(range); range.merge(); range.setHorizontalAlignment("center"); } mergeStart = null; } } } }
function fusionnerCellulesIdentiquesColonne_(sh, firstRow, lastRow, col) { if (lastRow < firstRow) return; let currentValue = sh.getRange(firstRow, col).getValue(), mergeStart = firstRow; for (let row = firstRow + 1; row <= lastRow + 1; row++) { const value = row <= lastRow ? sh.getRange(row, col).getValue() : "__END__"; if (value !== currentValue) { const height = row - mergeStart; if (currentValue !== "" && height > 1) { const range = sh.getRange(mergeStart, col, height, 1); breakApartSafe_(range); range.merge(); range.setVerticalAlignment("middle").setHorizontalAlignment("center"); } currentValue = value; mergeStart = row; } } }


function ensureSheetSize_(sh, rows, cols) {
  rows = Math.max(1, Number(rows || 1));
  cols = Math.max(1, Number(cols || 1));

  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();

  if (maxRows < rows) sh.insertRowsAfter(maxRows, rows - maxRows);
  if (maxCols < cols) sh.insertColumnsAfter(maxCols, cols - maxCols);
}

/**************** DATES / OUTILS ****************/
function getSheetName_(ANNEE) { return "CAL_" + String(ANNEE.CODE).replace("-", "_"); }
function vacancesInitiale_(nom) { const map = { "Toussaint": "T", "Noël": "N", "Hiver": "H", "Printemps": "P", "Été": "E", "Pont de l'Ascension": "A" }; return map[nom] || nom || ""; }
function isTruthy_(value) { return value === true || value === "true" || value === "True" || value === 1 || value === "1" || value === "TRUE"; }
function parseDateGrist_(value) {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return normalize_(value);
  }

  // Grist peut renvoyer une date sous forme numérique selon le type de colonne.
  if (typeof value === "number") {
    if (value > 100000000000) return normalize_(new Date(value));
    if (value > 1000000000) return normalize_(new Date(value * 1000));
    if (value > 10000 && value < 100000) {
      const d = new Date(Date.UTC(1970, 0, 1));
      d.setUTCDate(d.getUTCDate() + Math.floor(value));
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  const s = String(value).trim();
  if (!s) return null;

  // yyyy-mm-dd ou yyyy/mm/dd, avec éventuel suffixe horaire
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(s)) {
    const p = s.substring(0, 10).split(/[-\/]/);
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  // dd-mm-yyyy, dd/mm/yyyy, ou mélange type 18-12/2026
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(s)) {
    const p = s.split(/[-\/]/);
    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return normalize_(d);
}

function getFeriesFrance_(annee1, annee2) { const result = {}; for (let y = annee1; y <= annee2; y++) { const paques = getPaques_(y); [[`${y}-01-01`, "A"], [addDaysIso_(paques, 1), "P"], [`${y}-05-01`, "T"], [`${y}-05-08`, "V"], [addDaysIso_(paques, 39), "A"], [addDaysIso_(paques, 50), "MP"], [`${y}-07-14`, "N"], [`${y}-08-15`, "AS"], [`${y}-11-01`, "TO"], [`${y}-11-11`, "AR"], [`${y}-12-25`, "N"]].forEach(([date, abbr]) => { result[date] = abbr; }); } return result; }
function getPaques_(year) { const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; return new Date(year, month - 1, day); }
function addDaysIso_(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return toIso_(d); }
function getVacancesPourDate_(date, vacances) { const t = normalize_(date).getTime(); for (const v of vacances) { const d1 = parseDateGrist_(v.Date_debut), d2 = parseDateGrist_(v.Date_fin); if (!d1 || !d2) continue; if (t >= d1.getTime() && t <= d2.getTime()) return v; } return null; }
function toIso_(d) { return Utilities.formatDate(d, "Europe/Paris", "yyyy-MM-dd"); }
function normalize_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function getWeekISO_(date) { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }
function getJourNom_(d) { return ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][d.getDay()]; }
function getJourNomCourt_(d) { return ["D", "L", "M", "M", "J", "V", "S"][d.getDay()]; }
function getMoisNom_(d) { return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][d.getMonth()]; }
function getTextColorForBackground_(hex) { const color = normalizeHexColor_(hex); if (!color) return "#000000"; const r = parseInt(color.substring(1, 3), 16), g = parseInt(color.substring(3, 5), 16), b = parseInt(color.substring(5, 7), 16), luminance = (0.299 * r + 0.587 * g + 0.114 * b); return luminance > 150 ? "#000000" : "#FFFFFF"; }
function normalizeHexColor_(value) { if (!value) return null; let s = String(value).trim(); if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase(); if (/^[0-9A-Fa-f]{6}$/.test(s)) return ("#" + s).toUpperCase(); if (/^#[0-9A-Fa-f]{3}$/.test(s)) return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase(); return null; }
function formatDateFr_(date) { if (!date) return ""; return Utilities.formatDate(date, "Europe/Paris", "dd/MM/yyyy"); }
function escapeHtml_(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function trouverPeriodePourSegment_(periodes, info, seg) {
  return periodes.find(p => {
    const key =
      String(p.Niveau || "").trim().toUpperCase() + "|" +
      String(p.Formation || "").trim().toUpperCase();

    const infoKey =
      String(info.niveau || "").trim().toUpperCase() + "|" +
      String(info.formation || "").trim().toUpperCase();

    if (key !== infoKey) return false;

    const debut = parseDateGrist_(p.Date_debut);
    const fin = parseDateGrist_(p.Date_fin);

    if (!debut || !fin) return false;

    return normalize_(seg.start).getTime() <= fin.getTime() &&
           normalize_(seg.end).getTime() >= debut.getTime();
  });
}
function getBackgroundSegmentHTML_(seg, feries) {
  const iso = toIso_(seg.start);
  const ferie = feries[iso] || "";

  if (seg.type === "VACANCES_HEBDO") return "#1F1F1F";
  if (ferie) return "#FF1744";

  return "#FFFFFF";
}

/**************** CALENDRIERS PAR FORMATION - MODELE ALTERNANCE ****************/

function genererCalendriersFormationDepuisGantt() {
  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const vacances = getVacancesDepuisGrist_(ANNEE);

  if (!periodes.length) {
    throw new Error("Aucune période active trouvée dans Planning_Periodes pour " + ANNEE.CODE);
  }

  // Nouvelle logique : on regroupe les classes qui ont exactement le même planning.
  const groupes = creerGroupesPlanningIdentiquesALT_(periodes);

  groupes.forEach(info => {
    creerCalendrierFormation_(ANNEE, info, periodes, vacances);
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    groupes.length + " calendrier(s) formation généré(s), avec regroupement des classes identiques.",
    "Planning scolaire",
    6
  );
}




function getZoneTitreLogoALT_(info) {
  if (formationAvecColonneP_(info)) {
    return {
      titleCol: 8, titleWidth: 35,   // H1:AP1
      logoCol: 43, logoWidth: 10     // AQ1:AZ1
    };
  }

  return {
    titleCol: 10, titleWidth: 22,    // J1:AE1
    logoCol: 32, logoWidth: 8        // AF1:AM1
  };
}


function creerCalendrierFormation_(ANNEE, info, periodes, vacances) {
  logProgress_("Création ALT : " + info.formation + " / " + info.niveau);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = sanitizeSheetName_("ALT_" + ANNEE.CODE + "_" + info.formation + "_" + info.niveau);

  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  resetSheetComplet_(sh);
  ouvrirFeuilleEtProgress_(sh, sheetName, "Création ALT", 0, 0);

  const formationPeriodes = (info.periodes || periodes.filter(p => memeFormationNiveauALT_(p, info)))
    .sort((a, b) => {
      const da = parseDateGrist_(a.Date_debut);
      const db = parseDateGrist_(b.Date_debut);
      return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    });

  const plageALT = getPlageAffichagePourInfo_(ANNEE, { periodes: formationPeriodes }, ANNEE.START, ANNEE.END);
  const mois = construireMoisAffichageALT_(plageALT.start, plageALT.end);
  const feries = getFeriesFrance_(plageALT.start.getFullYear(), plageALT.end.getFullYear());

  const avecColonneP = formationAvecColonneP_(info);
  const zoneTitreLogo = getZoneTitreLogoALT_(info);
  const blockWidth = avecColonneP ? 4 : 3; // Date / Jour / H ou Date / Jour / H / P
  const firstDayRow = 8;
  const lastDayRow = 38;
  const monthNameTotalRow = 39;
  const monthTotalRow = 40;
  const noticeRow = 41;
  const legendRow = 42;
  const footerRow = 44;

  const lastCol = mois.length * blockWidth;
  const usedLastRow = avecColonneP ? 75 : 45;
  const usedLastCol = lastCol;

  ensureSheetSize_(sh, usedLastRow, usedLastCol);

  const generated = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");

  /******** EN-TÊTE MODÈLE — LIGNE 1 STABILISÉE ********/
  // NETTOYAGE DUR LIGNE 1 : supprime les anciennes fusions/contenus résiduels
  // qui provoquaient le titre vertical à gauche.
  sh.getRange(1, 1, 1, lastCol)
    
    .clearContent()
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(false);


  // Ligne 1 : trois zones propres, sans chevauchement :
  // A:E = logo République ; F:AE = titre central ; AF:AM = logo CFA/GIP.
  setMergedValue_(sh, 1, 1, 1, 5, "")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  setMergedValue_(sh, 1, zoneTitreLogo.titleCol, 1, zoneTitreLogo.titleWidth, "CFA RÉGIONAL DE L'ACADÉMIE DE NICE\nUFA : Lycée Les Eucalyptus")
    .setFontWeight("bold")
    .setFontSize(18)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  setMergedValue_(sh, 1, zoneTitreLogo.logoCol, 1, Math.max(1, lastCol - zoneTitreLogo.logoCol + 1), "")
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  setMergedValue_(sh, 2, 1, 1, lastCol, "CALENDRIER PRÉVISIONNEL  " + ANNEE.CODE + "   généré le " + generated)
    .setBackground("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  setMergedValue_(sh, 3, 2, 1, 4, "Formation :")
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setBackground("#FFFFFF");
  setMergedValue_(sh, 4, 2, 1, 4, "Classe :")
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setBackground("#FFFFFF");
  setMergedValue_(sh, 3, 6, 1, 12, info.formation || "")
    .setFontWeight("bold")
    .setHorizontalAlignment("left")
    .setBackground("#FFF9C4");
  setMergedValue_(sh, 4, 6, 1, 12, info.niveau || "")
    .setFontWeight("bold")
    .setHorizontalAlignment("left")
    .setBackground("#FFF9C4");

  // Le modèle ne contient rien en A3:A4 : on force ces cellules à rester vides et blanches.
  sh.getRange(3, 1, 2, 1)
    .clearContent()
    .setBackground("#FFFFFF")
    .setBorder(false, false, false, false, false, false);

  const debutFinFormation = getDebutFinFormation_(formationPeriodes);

  const debutColLabel = Math.max(18, lastCol - 15);
  const debutColValue = Math.max(24, lastCol - 9);
  const debutWidth = Math.max(1, Math.min(10, lastCol - debutColValue + 1));

  setMergedValue_(sh, 3, debutColLabel, 1, 6, "Début des cours :")
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setBackground("#FFFFFF");
  setMergedValue_(sh, 4, debutColLabel, 1, 6, "Fin des Cours :")
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setBackground("#FFFFFF");
  setMergedValue_(sh, 3, debutColValue, 1, debutWidth, debutFinFormation.debut ? formatDateFr_(debutFinFormation.debut) : "")
    .setBackground("#FFF9C4")
    .setFontWeight("bold")
    .setHorizontalAlignment("left")
    .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  setMergedValue_(sh, 4, debutColValue, 1, debutWidth, debutFinFormation.fin ? formatDateFr_(debutFinFormation.fin) : "")
    .setBackground("#FFF9C4")
    .setFontWeight("bold")
    .setHorizontalAlignment("left")
    .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  plageAnneePourLigneALT_(sh, 5, mois, blockWidth, lastCol);

  const monthlyTotalCells = [];

  ouvrirFeuilleEtProgress_(sh, sheetName, "Écriture calendrier ALT", 0, 0);

  /******** CORPS DU CALENDRIER ********/
  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;
    const hCol = c + 2;
    const pCol = avecColonneP ? c + 3 : null;

    setMergedValue_(sh, 6, c, 1, blockWidth, m.name)
      .setBackground("#777777")
      .setFontColor("#FFFFFF")
      .setFontSize(10)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sh.getRange(7, c).setValue("1").setBackground("#444444").setFontColor("#FFFFFF").setHorizontalAlignment("center");
    sh.getRange(7, c + 1).setValue(getJourNomCourt_(new Date(m.year, m.month, 1))).setBackground("#444444").setFontColor("#FFFFFF").setHorizontalAlignment("center");

    if (avecColonneP) {
      setMergedValue_(sh, 7, hCol, 1, 2, "H / P")
        .setBackground("#E86F00")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");
    } else {
      sh.getRange(7, hCol)
        .setValue("H")
        .setBackground("#E86F00")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");
    }

    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();

    for (let day = 1; day <= 31; day++) {
      const r = firstDayRow + day - 1;
      const d = new Date(m.year, m.month, day);
      const fullRange = sh.getRange(r, c, 1, blockWidth);

      if (day > daysInMonth) {
        fullRange.clearContent().setBackground("#FFFFFF").setFontColor("#000000").clearNote();
        continue;
      }

      sh.getRange(r, c).setValue(day);
      sh.getRange(r, c + 1).setValue(getJourNomCourt_(d));
      sh.getRange(r, hCol).setValue("").setNumberFormat("0.##");
      if (pCol) sh.getRange(r, pCol).setValue("").setNumberFormat("@");

      const style = calculerStyleJourALT_(formationPeriodes, vacances, feries, d, "", avecColonneP);

      sh.getRange(r, c)
        .setBackground(style.bg[0])
        .setFontColor(style.font[0])
        .clearNote();

      sh.getRange(r, c + 1)
        .setBackground(style.bg[1])
        .setFontColor(style.font[1])
        .clearNote();

      sh.getRange(r, hCol, 1, avecColonneP ? 2 : 1)
        .setBackground(style.bg[2])
        .setFontColor(style.font[2])
        .clearNote();
    }

    const hColLetter = colToLetter_(hCol);

    setMergedValue_(sh, monthNameTotalRow, c, 1, blockWidth, m.name)
      .setBackground("#666666")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center");

    setMergedValue_(sh, monthTotalRow, c, 1, blockWidth, "")
      .setFormula("=SUM(" + hColLetter + firstDayRow + ":" + hColLetter + lastDayRow + ")")
      .setBackground("#E86F00")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    monthlyTotalCells.push(colToLetter_(c) + monthTotalRow);
  });

  setMergedValue_(sh, noticeRow, 1, 1, lastCol, "Ce calendrier de formation est donné à titre indicatif, il pourrait évoluer pour des raisons pédagogiques et/ou au moment des examens")
    .setBackground("#000000")
    .setFontColor("#FFFFFF")
    .setFontSize(8)
    .setHorizontalAlignment("center");

  /******** LÉGENDE DYNAMIQUE ET TOTAL — SANS CHEVAUCHEMENT ********/
  ouvrirFeuilleEtProgress_(sh, sheetName, "Légende et total ALT", 0, 0);
  dessinerLegendeEtTotalALT_(sh, legendRow, lastCol, ANNEE, formationPeriodes, monthlyTotalCells);
  appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth);


   dessinerLegendeEtTotalALT_
  setMergedValue_(sh, footerRow, 1, 1, Math.min(7, lastCol), "")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  setMergedValue_(sh, footerRow, Math.max(1, lastCol - 10), 1, Math.min(11, lastCol), "Annexe32a-calendrier d'alternance " + ANNEE.CODE)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("right");

  /******** MISE EN FORME ********/
  sh.getRange(1, 1, usedLastRow, lastCol)
    .setFontFamily("Arial")
    .setFontSize(9)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID);

  // Le format global remet tout en taille 9.
  // IMPORTANT : on ne réapplique PAS encore les fusions du titre ici,
  // car Google Sheets refuse ensuite certains setColumnWidth() sur des colonnes
  // traversées par des cellules fusionnées.
  // Les titres/logos sont donc réappliqués APRES le réglage des largeurs.
  reappliquerFondsJaunesInfosALT_(sh, debutColLabel, debutColValue, debutWidth);


  sh.getRange(firstDayRow, 1, 31, lastCol)
    .setHorizontalAlignment("center")
    .setWrap(false);

  sh.setFrozenRows(7);

  for (let col = 1; col <= lastCol; col++) {
    const mod = (col - 1) % blockWidth;
    if (mod === 0) sh.setColumnWidth(col, 28);
    if (mod === 1) sh.setColumnWidth(col, 24);
    if (mod === 2) sh.setColumnWidth(col, 38);
    if (avecColonneP && mod === 3) sh.setColumnWidth(col, 38);
  }

  // Maintenant seulement, on remet les fusions du titre et les logos.
  reappliquerMiseEnFormeTitreALT_(sh, info);

  sh.setRowHeight(1, 64);
  sh.setRowHeight(2, 24);
  sh.setRowHeight(3, 20);
  sh.setRowHeight(4, 20);
  sh.setRowHeight(5, 20);
  sh.setRowHeight(6, 20);
  sh.setRowHeight(7, 20);
  sh.setRowHeights(firstDayRow, 31, 20);
  sh.setRowHeight(noticeRow, 18);
  sh.setRowHeight(legendRow, 24);
  sh.setRowHeight(footerRow, 42);

  appliquerReglesConditionnellesALT_(sh, firstDayRow, lastDayRow, mois, blockWidth, avecColonneP);
  copierImagesModeleALT_(sh, info);
  supprimerQuadrillageZonesModeleALT_(sh, lastCol);
  finaliserPresentationALT_(sh, lastCol, avecColonneP);

  if (avecColonneP) {
    // Synthèse définitivement à droite en AX2.
    ajouterSyntheseProfsCAP_(sh, mois, blockWidth, firstDayRow, lastDayRow, 2);

    // Largeurs calendrier réappliquées après la synthèse.
    for (let idx = 0; idx < mois.length; idx++) {
      const c = 1 + idx * blockWidth;
      sh.setColumnWidth(c, 28);       // Date
      sh.setColumnWidth(c + 1, 28);   // Jour
      sh.setColumnWidth(c + 2, 38);   // H
      sh.setColumnWidth(c + 3, 38);   // P
    }
  }

  // On ajuste avec la largeur réelle utile : calendrier + synthèse éventuelle.
  const finalLastCol = avecColonneP ? Math.max(lastCol, 50 + mois.length + 1) : lastCol;

ameliorerLisibiliteEnteteALT_(sh, mois, blockWidth);

  SpreadsheetApp.flush();
  ajusterDimensionsFeuille_(sh, avecColonneP ? 75 : usedLastRow, finalLastCol);
  mettreAJourSommairePlanning();
}




function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  // Événements ponctuels prioritaires en affichage D/J
  if (t.includes("EXAMEN")) return 300;
  if (t.includes("VISITE")) return 290;
  if (t.includes("ABDE")) return 280;
  if (t.includes("CONSEIL")) return 270;

  // Périodes de fond
  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("BTS") && t.includes("STAGE")) return 105;
  if (t.includes("MINI") && t.includes("STAGE")) return 104;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;
  if (t.includes("STAGE")) return 95;

  return 10;
}

function getDebutFinFormation_(formationPeriodes) {
  const dates = [];
  formationPeriodes.forEach(p => {
    const d1 = parseDateGrist_(p.Date_debut);
    const d2 = parseDateGrist_(p.Date_fin);
    if (d1) dates.push(d1);
    if (d2) dates.push(d2);
  });
  if (!dates.length) return { debut: null, fin: null };
  dates.sort((a, b) => a.getTime() - b.getTime());
  return { debut: dates[0], fin: dates[dates.length - 1] };
}

function sanitizeSheetName_(name) {
  let s = String(name || "Feuille").replace(/[\\\/\?\*\[\]\:]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) s = "Feuille";
  return s.substring(0, 99);
}

function colToLetter_(col) {
  let temp = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    n = Math.floor((n - rem - 1) / 26);
  }
  return temp;
}



/**************** CALENDRIERS DETAILLES DEMI-HEURE ****************/

function genererCalendriersDemiHeureDepuisGantt() {
  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const vacances = getVacancesDepuisGrist_(ANNEE);

  if (!periodes.length) {
    throw new Error("Aucune période active trouvée dans Planning_Periodes pour " + ANNEE.CODE);
  }

  const lignes = creerLignesPlanning_(periodes, 0);
  const lignesList = Object.keys(lignes).map(k => lignes[k]);

  lignesList.forEach(info => {
    creerCalendrierFormationDemiHeure_(ANNEE, info, periodes, vacances);
  });

  mettreAJourSommairePlanning();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    lignesList.length + " calendrier(s) détaillé(s) demi-heure généré(s).",
    "Planning scolaire",
    6
  );
}

function creerCalendrierFormationDemiHeure_(ANNEE, info, periodes, vacances) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Préfixe ALT_DETAIL : même famille que ALT, mais modèle détaillé demi-heure.
  const sheetName = sanitizeSheetName_("ALT_DETAIL_" + ANNEE.CODE + "_" + info.formation + "_" + info.niveau);

  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  resetSheetComplet_(sh);

  const y1 = Number(ANNEE.CODE.split("-")[0]);
  const y2 = Number(ANNEE.CODE.split("-")[1]);
  const feries = getFeriesFrance_(y1, y2);

  const formationPeriodes = periodes.filter(p => memeFormationNiveauALT_(p, info));

  const mois = getMoisAnneeScolaire_(ANNEE);

  // Même disposition que le calendrier ALT : mois en colonnes, jours en lignes.
  // Nouveauté : chaque journée est sur 2 lignes (matin / après-midi).
  // Chaque demi-journée possède 9 cases. Chaque case remplie = 0,5 h.
  // 6 cases remplies = 3 h ; 7 = 3 h 30 ; 9 = 4 h 30.
  const slotsPerDemiJour = 9;
  const blockWidth = 2 + 1 + slotsPerDemiJour + 1; // Date / J / M-A / 9 cases / H
  const firstDayRow = 10;
  const rowsPerDay = 2;
  const lastDayRow = firstDayRow + 31 * rowsPerDay - 1;
  const totalRow = lastDayRow + 1;
  const legendRow = totalRow + 3;
  const profSynthStartRow = legendRow + 5;
  const startCol = 1;
  const lastCol = mois.length * blockWidth;
  const usedLastCol = lastCol;

  ensureSheetSize_(sh, profSynthStartRow + 20, usedLastCol);

  const generated = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");
  sh.getRange(1, 1, 1, usedLastCol).merge()
    .setValue("CALENDRIER DÉTAILLÉ DEMI-HEURE " + ANNEE.CODE + " — " + (info.formation || "") + " / " + (info.niveau || "") + "   ·   généré le " + generated)
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(13)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.getRange(3, 1, 1, Math.min(8, usedLastCol)).merge()
    .setValue("Formation : " + (info.formation || ""))
    .setFontWeight("bold")
    .setFontSize(11);

  sh.getRange(4, 1, 1, Math.min(8, usedLastCol)).merge()
    .setValue("Niveau / Classe : " + (info.niveau || ""))
    .setFontWeight("bold")
    .setFontSize(11);

  const debutFin = getDebutFinFormation_(formationPeriodes);
  if (usedLastCol >= 18) {
    sh.getRange(3, 10, 1, 8).merge().setValue("Début des cours : " + (debutFin.debut ? formatDateFr_(debutFin.debut) : ""));
    sh.getRange(4, 10, 1, 8).merge().setValue("Fin des cours : " + (debutFin.fin ? formatDateFr_(debutFin.fin) : ""));
    sh.getRange(3, 10, 2, 8).setFontWeight("bold").setFontSize(11);
  }

  mois.forEach((m, idx) => {
    const c = startCol + idx * blockWidth;

    sh.getRange(7, c, 1, blockWidth).merge()
      .setValue(m.name + " " + m.year)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontWeight("bold")
      .setFontSize(10)
      .setBackground("#666666")
      .setFontColor("#FFFFFF");

    const header = ["Date", "J", "½J"];
    for (let i = 1; i <= slotsPerDemiJour; i++) header.push(String(i));
    header.push("H");

    sh.getRange(8, c, 1, blockWidth).setValues([header])
      .setBackground("#E8EEF7")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    sh.getRange(9, c, 1, 3).setValues([["", "", ""]]);
    sh.getRange(9, c + 3, 1, slotsPerDemiJour).merge()
      .setValue("Matin / après-midi : saisir les initiales prof — 1 case = 0h30")
      .setHorizontalAlignment("center")
      .setFontSize(7)
      .setFontColor("#666666");
    sh.getRange(9, c + blockWidth - 1).setValue("jour").setHorizontalAlignment("center").setFontWeight("bold");

    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();

    for (let day = 1; day <= 31; day++) {
      const rMatin = firstDayRow + (day - 1) * rowsPerDay;
      const rAprem = rMatin + 1;
      const dayRange = sh.getRange(rMatin, c, rowsPerDay, blockWidth);

      if (day > daysInMonth) {
        dayRange.setBackground("#F2F2F2");
        continue;
      }

      const d = new Date(m.year, m.month, day);
      const iso = toIso_(d);
      const vac = getVacancesPourDate_(d, vacances);
      const ferie = feries[iso] || "";
      const periode = trouverPeriodePourDateFormation_(formationPeriodes, d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      // Date et jour affichés une seule fois sur les deux lignes.
      sh.getRange(rMatin, c, rowsPerDay, 1).merge().setValue(day);
      sh.getRange(rMatin, c + 1, rowsPerDay, 1).merge().setValue(getJourNomCourt_(d));
      sh.getRange(rMatin, c + 2).setValue("Matin");
      sh.getRange(rAprem, c + 2).setValue("Après-midi");

      let bg = "#FFFFFF";
      let font = "#000000";
      let note = "";

      if (isWeekend) bg = "#D9D9D9";
      if (vac) { bg = "#222222"; font = "#FFFFFF"; note = vac.Nom_vacances || "Vacances scolaires"; }
      if (ferie) { bg = "#FF1744"; font = "#FFFFFF"; note = "Jour férié : " + ferie; }
      if (periode) {
        bg = periode.Couleur || "#00C853";
        font = getTextColorForBackground_(bg);
        note = (periode.Type || "Période") + " | " +
          formatDateFr_(parseDateGrist_(periode.Date_debut)) + " → " +
          formatDateFr_(parseDateGrist_(periode.Date_fin)) +
          (periode.Commentaire ? " | " + periode.Commentaire : "");
      }

      dayRange.setBackground(bg).setFontColor(font);
      if (note) dayRange.setNote(note);

      // Les 18 cases de la journée restent saisissables : 9 matin + 9 après-midi.
      const firstSlotCol = c + 3;
      const lastSlotCol = c + 3 + slotsPerDemiJour - 1;
      const totalCol = c + blockWidth - 1;

      const firstSlotLetter = colToLetter_(firstSlotCol);
      const lastSlotLetter = colToLetter_(lastSlotCol);

      // Total journalier : nombre de cases remplies matin+après-midi / 2.
      // Pas de décimale 0.5 pour éviter les erreurs de locale : /2 est universel.
      sh.getRange(rMatin, totalCol, rowsPerDay, 1).merge()
        .setFormula("=COUNTA(" + firstSlotLetter + rMatin + ":" + lastSlotLetter + rAprem + ")/2")
        .setHorizontalAlignment("center")
        .setFontWeight("bold");

      // Les cases profs sont au format texte.
      sh.getRange(rMatin, firstSlotCol, rowsPerDay, slotsPerDemiJour).setNumberFormat("@");
    }

    sh.getRange(totalRow, c, 1, 3).merge().setValue("Total heures");
    const totalLetter = colToLetter_(c + blockWidth - 1);
    sh.getRange(totalRow, c + blockWidth - 1)
      .setFormula("=SUM(" + totalLetter + firstDayRow + ":" + totalLetter + lastDayRow + ")");
    sh.getRange(totalRow, c, 1, blockWidth)
      .setFontWeight("bold")
      .setBackground("#F6A000")
      .setHorizontalAlignment("center");
  });

  // Total annuel sous le tableau.
  // Total annuel sous le tableau.
const totalRefs = mois.map((m, idx) =>
  colToLetter_(startCol + idx * blockWidth + blockWidth - 1) + totalRow
).join("+");

sh.getRange(legendRow - 1, Math.max(1, usedLastCol - 8), 1, 6)
  .merge()
  .setValue("Total annuel")
  .setFontWeight("bold")
  .setFontColor("#666666");

  // Zone réservée à la synthèse profs. Elle est remplie par le menu 15.
  initialiserBlocSyntheseProfs_(sh, ANNEE, mois, profSynthStartRow, startCol, blockWidth);

  sh.getRange(1, 1, profSynthStartRow + 12, usedLastCol)
    .setFontFamily("Arial")
    .setFontSize(8)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID);

  sh.getRange(firstDayRow, 1, lastDayRow - firstDayRow + 1, usedLastCol).setHorizontalAlignment("center");
  sh.setFrozenRows(9);
  sh.setFrozenColumns(0);

  for (let idx = 0; idx < mois.length; idx++) {
    const c = startCol + idx * blockWidth;
    sh.setColumnWidth(c, 30);       // Date
    sh.setColumnWidth(c + 1, 24);   // Jour
    sh.setColumnWidth(c + 2, 58);   // Matin / Après-midi
    for (let j = 0; j < slotsPerDemiJour; j++) sh.setColumnWidth(c + 3 + j, 22);
    sh.setColumnWidth(c + blockWidth - 1, 42); // H jour
  }

  sh.setRowHeights(firstDayRow, lastDayRow - firstDayRow + 1, 17);
  sh.getRange(firstDayRow, 1, lastDayRow - firstDayRow + 1, usedLastCol).setWrap(false);

  SpreadsheetApp.flush();
  ajusterDimensionsFeuille_(sh, profSynthStartRow + 12, usedLastCol);
}

function getMoisAnneeScolaire_(ANNEE) {
  const y1 = Number(ANNEE.CODE.split("-")[0]);
  const y2 = Number(ANNEE.CODE.split("-")[1]);
  return [
    { name: "Août", year: y1, month: 7 },
    { name: "Septembre", year: y1, month: 8 },
    { name: "Octobre", year: y1, month: 9 },
    { name: "Novembre", year: y1, month: 10 },
    { name: "Décembre", year: y1, month: 11 },
    { name: "Janvier", year: y2, month: 0 },
    { name: "Février", year: y2, month: 1 },
    { name: "Mars", year: y2, month: 2 },
    { name: "Avril", year: y2, month: 3 },
    { name: "Mai", year: y2, month: 4 },
    { name: "Juin", year: y2, month: 5 },
    { name: "Juillet", year: y2, month: 6 },
    { name: "Août", year: y2, month: 7 }
  ];
}

function initialiserBlocSyntheseProfs_(sh, ANNEE, mois, startRow, startCol, blockWidth) {
  const lastCol = mois.length + 2;
  sh.getRange(startRow, 1, 1, lastCol).merge()
    .setValue("Synthèse professeurs — à recalculer avec le menu 15")
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  const header = ["Prof"];
  mois.forEach(m => header.push(m.name.substring(0, 3) + "."));
  header.push("Total annuel");
  sh.getRange(startRow + 1, 1, 1, header.length).setValues([header])
    .setBackground("#D9EAF7")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
}

function recalculerSynthesesProfsALTDetail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ANNEE = getAnneeActive_();
  const sheets = ss.getSheets().filter(sh => sh.getName().startsWith("ALT_DETAIL_"));

  sheets.forEach(sh => recalculerSyntheseProfSheet_(sh, ANNEE));

  SpreadsheetApp.getActiveSpreadsheet().toast(
    sheets.length + " synthèse(s) professeurs recalculée(s).",
    "Planning scolaire",
    6
  );
}

function recalculerSyntheseProfSheet_(sh, ANNEE) {
  const mois = getMoisAnneeScolaire_(ANNEE);
  const slotsPerDemiJour = 9;
  const blockWidth = 2 + 1 + slotsPerDemiJour + 1;
  const firstDayRow = 10;
  const rowsPerDay = 2;
  const lastDayRow = firstDayRow + 31 * rowsPerDay - 1;
  const totalRow = lastDayRow + 1;
  const legendRow = totalRow + 3;
  const profSynthStartRow = legendRow + 5;

  const profs = {};

  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;
    const firstSlotCol = c + 3;
    const values = sh.getRange(firstDayRow, firstSlotCol, lastDayRow - firstDayRow + 1, slotsPerDemiJour).getValues();

    values.forEach(row => {
      row.forEach(cell => {
        const raw = String(cell || "").trim();
        if (!raw) return;
        // Accepte une ou plusieurs initiales séparées par espace, virgule, +, / ou ;.
        raw.split(/[\s,;+\/]+/).map(x => x.trim()).filter(Boolean).forEach(initiale => {
          const key = initiale.toUpperCase();
          if (!profs[key]) profs[key] = Array(mois.length).fill(0);
          profs[key][idx] += 0.5;
        });
      });
    });
  });

  // Nettoyage ancien bloc de synthèse.
  const maxRows = Math.max(20, sh.getMaxRows() - profSynthStartRow + 1);
  const width = mois.length + 2;
  sh.getRange(profSynthStartRow, 1, Math.min(maxRows, 200), width).clearContent().clearFormat();
  initialiserBlocSyntheseProfs_(sh, ANNEE, mois, profSynthStartRow, 1, blockWidth);

  const keys = Object.keys(profs).sort();
  if (!keys.length) {
    sh.getRange(profSynthStartRow + 2, 1, 1, width).merge()
      .setValue("Aucune initiale professeur saisie pour l’instant.")
      .setFontColor("#666666");
    return;
  }

  const rows = keys.map(k => {
    const monthVals = profs[k];
    const total = monthVals.reduce((a, b) => a + b, 0);
    return [k].concat(monthVals).concat([total]);
  });

  sh.getRange(profSynthStartRow + 2, 1, rows.length, width).setValues(rows)
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID)
    .setHorizontalAlignment("center")
    .setNumberFormat("0.##");

  sh.getRange(profSynthStartRow + 2, 1, rows.length, 1).setFontWeight("bold");
  sh.getRange(profSynthStartRow + 2, width, rows.length, 1).setBackground("#F6A000").setFontWeight("bold");
}

function pad2_(n) {
  return (n < 10 ? "0" : "") + n;
}

/**************** SOMMAIRE / NETTOYAGE FEUILLES ****************/

function resetSheetComplet_(sh) {
  // Nettoyage complet, y compris anciennes lignes/colonnes masquées et anciennes fusions.
  try {
    sh.showRows(1, sh.getMaxRows());
  } catch (e) {}
  try {
    sh.showColumns(1, sh.getMaxColumns());
  } catch (e) {}

  const fullRange = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  try {
    fullRange.getMergedRanges().forEach(r => {
      try { r.breakApart(); } catch (err) {}
    });
  } catch (e) {}

  sh.clear({ contentsOnly: false });

  // Zone de travail large pour éviter les restes au-delà d'août/septembre.
  ensureSheetSize_(sh, 120, 260);

  try {
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns())
      .clearContent()
      .clearFormat()
      .clearDataValidations()
      .clearNote();
  } catch (e) {
    Logger.log("resetSheetComplet_ clear large ignoré : " + e);
  }
}


function ajusterDimensionsFeuille_(sh, lastUsefulRow, lastUsefulCol) {
  /*
   * Version sécurisée :
   * - ne supprime plus les lignes/colonnes pendant les générations longues ;
   * - évite d'effacer les zones ajoutées ensuite, comme la synthèse profs ;
   * - limite les popups Google Sheets liés aux redimensionnements trop brutaux.
   */
  lastUsefulRow = Math.max(1, Number(lastUsefulRow || 1));
  lastUsefulCol = Math.max(1, Number(lastUsefulCol || 1));

  ensureSheetSize_(sh, lastUsefulRow, lastUsefulCol);

  try {
    const maxRows = sh.getMaxRows();
    if (maxRows > lastUsefulRow + 100) {
      sh.hideRows(lastUsefulRow + 1, maxRows - lastUsefulRow);
    }
  } catch (e) {
    Logger.log("ajusterDimensionsFeuille_ lignes ignoré : " + e);
  }

  try {
    const maxCols = sh.getMaxColumns();
    if (maxCols > lastUsefulCol + 20) {
      sh.hideColumns(lastUsefulCol + 1, maxCols - lastUsefulCol);
    }
  } catch (e) {
    Logger.log("ajusterDimensionsFeuille_ colonnes ignoré : " + e);
  }
}



/* Fonction mettreAJourSommairePlanning retirée : version fusionnée en fin de fichier. */


function typePlanningDepuisNom_(n) {
  if (n.startsWith("ALT_DETAIL_")) return "Calendrier détaillé demi-heure";
  if (n.startsWith("ALT30_")) return "Calendrier demi-heure";
  if (n.startsWith("ALT_")) return "Calendrier formation regroupé";
  if (n.indexOf("_hebdo") !== -1) return "Planning Gantt hebdomadaire";
  return "Planning Gantt";
}

function supprimerOngletsCochesSommaire() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("SOMMAIRE_PLANNING");
  if (!sh) throw new Error("Sommaire introuvable.");

  const lastRow = sh.getLastRow();
  if (lastRow < 5) return;

  const values = sh.getRange(5, 1, lastRow - 4, 7).getValues();
  const toDelete = values.filter(r => r[4] === true).map(r => String(r[6] || r[0] || "").trim()).filter(Boolean);

  toDelete.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });

  mettreAJourSommairePlanning();
}

function supprimerOngletActif() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const active = ss.getActiveSheet();
  if (!active || active.getName() === "SOMMAIRE_PLANNING") return;
  if (ss.getSheets().length <= 1) return;
  ss.deleteSheet(active);
  mettreAJourSommairePlanning();
}


/* Fonction genererCalendriersCochesSommaire retirée : version fusionnée en fin de fichier. */




/* Fonction trouverInfoDepuisNomOngletSommaire_ retirée : version fusionnée en fin de fichier. */



function trouverInfoDepuisNomOngletALT_(nomOnglet, lignesList, prefixe) {
  const suffix = nomOnglet.replace(prefixe, "");
  // suffix attendu : 2026_2027_FORMATION_NIVEAU
  return lignesList.find(info => {
    const expected = sanitizeSheetName_(prefixe + getAnneeActive_().CODE + "_" + info.formation + "_" + info.niveau);
    return expected === nomOnglet;
  }) || null;
}


function formationAvecColonneP_(info) {
  const formation = String(info.formation || "").toUpperCase();
  const niveau = String(info.niveau || "").toUpperCase();
  const groupe = String(info.groupe || "").toUpperCase();

  // Uniquement CAP / CPA conserve H + P.
  return (
    (formation.includes("CAP") && niveau.includes("CPA")) ||
    (formation.includes("CAP") && groupe.includes("CPA")) ||
    formation.includes("CAP CPA")
  );
}

function legendePeriodeEntreprisePFMP_(formationPeriodes) {
  const p = formationPeriodes.find(x => {
    const t = String(x.Type || "").toUpperCase();
    return t.includes("ENTREPRISE") || t.includes("PFMP") || t.includes("STAGE");
  });

  if (!p) {
    return { libelle: "PFMP / entreprise", couleur: "#00B0F0" };
  }

  const type = String(p.Type || "").trim();
  const libelle = type ? type : "PFMP / entreprise";
  const couleur = p.Couleur || "#00B0F0";
  return { libelle: libelle, couleur: couleur };
}

function appliquerReglesConditionnellesALT_(sh, firstDayRow, lastDayRow, mois, blockWidth, avecColonneP) {
  /*
   * Version sécurisée : la génération ne doit jamais planter à cause des règles conditionnelles.
   * Google Sheets déclenche parfois l'erreur « sélectionner toutes les cellules d'une plage fusionnée »
   * quand setConditionalFormatRules() intervient après des fusions de titre/logo/légende.
   * On tente l'application ; si Google refuse, on journalise et on continue.
   */
  const orange = "#E86F00";
  const rules = [];

  try {
    mois.forEach((m, idx) => {
      const c = 1 + idx * blockWidth;
      const hCol = c + 2;
      const pCol = avecColonneP ? c + 3 : null;
      const hLetter = colToLetter_(hCol);
      const nbRows = lastDayRow - firstDayRow + 1;

      const hRange = sh.getRange(firstDayRow, hCol, nbRows, 1);
      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied('=ISNUMBER(' + hLetter + firstDayRow + ')')
          .setBackground(orange)
          .setFontColor("#FFFFFF")
          .setRanges([hRange])
          .build()
      );

      if (pCol) {
        const pRange = sh.getRange(firstDayRow, pCol, nbRows, 1);
        rules.push(
          SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied('=ISNUMBER($' + hLetter + firstDayRow + ')')
            .setBackground(orange)
            .setFontColor("#FFFFFF")
            .setRanges([pRange])
            .build()
        );
      }
    });

    sh.setConditionalFormatRules(rules);

  } catch (err) {
    Logger.log("appliquerReglesConditionnellesALT_ ignoré sur " + sh.getName() + " : " + err.message);
    try {
      SpreadsheetApp.getActive().toast(
        "Règles conditionnelles ignorées sur " + sh.getName() + " ; génération poursuivie.",
        "Planning scolaire",
        8
      );
    } catch (e) {}
  }
}


function getSheetById_(ss, sheetId) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === Number(sheetId)) return sheets[i];
  }
  return null;
}

function copierImagesModeleALT_(targetSheet, info) {
  /*
   * Logos depuis Drive.
   * Les zones de cellules restent vides ; seules les images sont posées.
   */
  try {
    try {
      targetSheet.getImages().forEach(img => img.remove());
    } catch (e) {}

    if (typeof ALT_LOGOS_DRIVE === "undefined") return;

    const zone = info ? getZoneTitreLogoALT_(info) : { logoCol: 32, logoWidth: 8 };

    if (ALT_LOGOS_DRIVE.REPUBLIQUE_FILE_ID) {
      insererLogoDepuisDrive_(targetSheet, ALT_LOGOS_DRIVE.REPUBLIQUE_FILE_ID, 1, 1, 2, 2, 125, 54);
    }

    if (ALT_LOGOS_DRIVE.CFA_GIP_FILE_ID) {
      insererLogoDepuisDrive_(targetSheet, ALT_LOGOS_DRIVE.CFA_GIP_FILE_ID, zone.logoCol, 1, 6, 6, 160, 40);
    }

    if (ALT_LOGOS_DRIVE.FORPRO_FILE_ID) {
      insererLogoDepuisDrive_(targetSheet, ALT_LOGOS_DRIVE.FORPRO_FILE_ID, 2, 44, 8, 2, 170, 34);
    }
  } catch (err) {
    Logger.log("copierImagesModeleALT_ ignoré : " + err);
  }
}




function recalculerTotauxDebutFinEtSyntheseALT_(sh) {
  /*
   * Recalcule les totaux mensuels, le total annuel et les dates début/fin
   * à partir des heures réellement saisies dans les colonnes H.
   * Année lue depuis la ligne 5 pour éviter la confusion septembre N / septembre N+1.
   */
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;

  const avecColonneP = estCalendrierAvecColonnePDepuisFeuille_(sh);
  const blockWidth = avecColonneP ? 4 : 3;
  const firstDayRow = 8;
  const lastDayRow = 38;
  const mois = detecterMoisALTDepuisFeuille_(sh, blockWidth);
  if (!mois.length) return;

  const ANNEE = getAnneeActive_();
  const dates = [];
  let totalAnnuel = 0;

  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;
    const hCol = c + 2;
    const monthName = String(sh.getRange(6, c).getDisplayValue() || m.name);
    const monthIndex = moisNomVersIndex_(monthName);
    const year = Number(trouverAnneeALTDepuisColonne_(sh, c)) || getAnneeMoisALT_(ANNEE, monthIndex);

    const hVals = sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getValues();
    const dVals = sh.getRange(firstDayRow, c, lastDayRow - firstDayRow + 1, 1).getValues();

    let totalMois = 0;

    for (let i = 0; i < hVals.length; i++) {
      const h = Number(hVals[i][0]);
      if (!h || isNaN(h)) continue;

      totalMois += h;

      const jour = Number(dVals[i][0]);
      if (jour) dates.push(new Date(year, monthIndex, jour));
    }

    totalAnnuel += totalMois;

    const totalMonthRange = sh.getRange(40, c, 1, blockWidth);
    try { breakApartSafe_(totalMonthRange); } catch(e) {}
    try { totalMonthRange.merge(); } catch(e) {}
    totalMonthRange
      .setValue(totalMois)
      .setBackground("#E86F00")
      .setFontColor("#000000")
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
  });

  if (dates.length) {
    dates.sort((a, b) => a.getTime() - b.getTime());

    const lastCol = mois.length * blockWidth;
    const debutColValue = Math.max(1, lastCol - 9);
    const width = Math.min(10, lastCol - debutColValue + 1);

    const startCell = sh.getRange(3, debutColValue, 1, width);
    const endCell = sh.getRange(4, debutColValue, 1, width);

    try { breakApartSafe_(startCell); } catch(e) {}
    try { breakApartSafe_(endCell); } catch(e) {}

    try { startCell.merge(); } catch(e) {}
    try { endCell.merge(); } catch(e) {}

    startCell.setValue(formatDateFr_(dates[0]))
      .setBackground("#FFF9C4")
      .setFontWeight("bold")
      .setHorizontalAlignment("left");

    endCell.setValue(formatDateFr_(dates[dates.length - 1]))
      .setBackground("#FFF9C4")
      .setFontWeight("bold")
      .setHorizontalAlignment("left");
  }

  const lastCol = mois.length * blockWidth;
  const totalWidth = 5;
  const totalStartCol = Math.max(1, lastCol - totalWidth + 1);
  const totalRange = sh.getRange(42, totalStartCol, 1, totalWidth);

  try { breakApartSafe_(totalRange); } catch(e) {}
  try { totalRange.merge(); } catch(e) {}
  totalRange
    .setValue(totalAnnuel)
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  if (avecColonneP) {
    ajouterSyntheseProfsCAP_(sh, mois, blockWidth, firstDayRow, lastDayRow, 2);
  }
}


function recalculerDebutFinCoursALT_(sh) {
  recalculerTotauxDebutFinEtSyntheseALT_(sh);
}


function trouverAnneeALTDepuisColonne_(sh, col) {
  for (let c = col; c >= 1; c--) {
    const val = sh.getRange(5, c).getDisplayValue();
    if (/^\d{4}$/.test(val)) return val;
  }

  for (let c = col; c <= sh.getLastColumn(); c++) {
    const val = sh.getRange(5, c).getDisplayValue();
    if (/^\d{4}$/.test(val)) return val;
  }

  return "";
}

function moisIndexDepuisNom_(nom) {
  const n = String(nom || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const mois = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
  ];

  return mois.indexOf(n);
}

function onEdit_ANCIEN_DESACTIVE_(e) {
  try {
    if (!e || !e.range) return;

    const sh = e.range.getSheet();
    const name = sh.getName();

    if (!name.startsWith("ALT_")) return;
    if (name.startsWith("ALT_DETAIL_")) return;

    // On ne traite pas les calendriers CAP/CPA à 4 colonnes D/J/H/P
    if (estCalendrierAvecColonnePDepuisFeuille_(sh)) return;

    const range = e.range;
    const startRow = range.getRow();
    const startCol = range.getColumn();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    for (let r = startRow; r < startRow + numRows; r++) {
      if (r < 8 || r > 38) continue;

      for (let c = startCol; c < startCol + numCols; c++) {
        const val = sh.getRange(r, c).getValue();

        // Dans les ALT hors CPA : bloc D/J/H, donc H = 3e colonne du bloc.
        const positionDansBloc = (c - 1) % 3;
        const estColonneH = positionDansBloc === 2;

        if (!estColonneH) continue;

        if (val !== "" && !isNaN(val)) {
          // H orange
          sh.getRange(r, c)
            .setBackground("#E67E00")
            .setFontColor("#FFFFFF");

          // D + J orange
          sh.getRange(r, c - 2, 1, 2)
            .setBackground("#E67E00")
            .setFontColor("#FFFFFF");
        } else {
          // Si on efface une heure, on recalcule proprement l'onglet actif.
          recalculerDebutFinCoursALT_(sh);
        }
      }
    }

    recalculerTotauxDebutFinEtSyntheseALT_(sh);

  } catch (err) {
    Logger.log("onEdit ignoré : " + err);
  }
}


function plagesSeCroisent_(r1, c1, nr1, nc1, r2, c2, nr2, nc2) {
  const r1End = r1 + nr1 - 1;
  const c1End = c1 + nc1 - 1;
  const r2End = r2 + nr2 - 1;
  const c2End = c2 + nc2 - 1;
  return !(r2 > r1End || r2End < r1 || c2 > c1End || c2End < c1);
}

function defusionnerAutour_(sh, row, col, numRows, numCols) {
  const target = sh.getRange(row, col, numRows, numCols);
  try {
    const merged = target.getMergedRanges();
    merged.forEach(r => r.breakApart());
  } catch (e) {
    try {
      target.breakApart();
    } catch (err) {
      Logger.log("defusionnerAutour_ ignoré : " + err);
    }
  }
}


function fusionnerSafe_(sh, row, col, numRows, numCols) {
  row = Math.max(1, Number(row || 1));
  col = Math.max(1, Number(col || 1));
  numRows = Math.max(1, Number(numRows || 1));
  numCols = Math.max(1, Number(numCols || 1));

  ensureSheetSize_(sh, row + numRows - 1, col + numCols - 1);
  defusionnerAutour_(sh, row, col, numRows, numCols);

  const range = sh.getRange(row, col, numRows, numCols);
  if (numRows > 1 || numCols > 1) {
    range.merge();
  }
  return range;
}

function setMergedValue_(sh, row, col, numRows, numCols, value) {
  const r = fusionnerSafe_(sh, row, col, numRows, numCols);
  r.setValue(value);
  return r;
}

function dessinerLegendeEtTotalALT_(sh, legendRow, lastCol, ANNEE, formationPeriodes, monthlyTotalCells) {
  // Ligne 42 : légendes fixes à gauche + total annuel à droite.
  // Ligne 43 : légendes variables issues de Types_Planning + Planning_Periodes.

  const totalWidth = 5;
  const totalStartCol = Math.max(1, lastCol - totalWidth + 1);
  const maxLegendCol = Math.max(1, totalStartCol - 2);

  const clean = sh.getRange(legendRow, 1, 2, lastCol);
  breakApartSafe_(clean);
  clean.clearContent()
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setFontWeight("normal")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID);

  const fixes = [
    { label: "Jours fériés", color: "#D99999" },
    { label: "Vacances scolaires", color: "#222222" },
    { label: "Cours UFA", color: "#E86F00" },
    { label: "Période d'examens", color: "#18c46b" }
  ];

  let col = 1;
  fixes.forEach(item => {
    if (col > maxLegendCol) return;
    const width = Math.min(5, maxLegendCol - col + 1);
    const r = sh.getRange(legendRow, col, 1, width);
    breakApartSafe_(r);
    if (width > 1) r.merge();
    r.setValue(item.label)
      .setBackground(item.color)
      .setFontColor(getTextColorForBackground_(item.color))
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);
    col += width + 1;
  });

  const totalLabelCol = Math.max(1, totalStartCol - 5);
  const totalRefs = (monthlyTotalCells || []).join("+");

  const labelRange = sh.getRange(legendRow, totalLabelCol, 1, 5);
  breakApartSafe_(labelRange);
  labelRange.merge()
    .setValue("Total annuel")
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  const totalRange = sh.getRange(legendRow, totalStartCol, 1, totalWidth);
  breakApartSafe_(totalRange);
  totalRange.merge()
    .setFormula(totalRefs ? "=" + totalRefs : "=0")
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Ligne 43 : variables uniquement.
  const variables = typesVariablesPlanning_(formationPeriodes);

  col = 1;
  variables.forEach(item => {
    if (col > maxLegendCol) return;
    const width = Math.min(5, maxLegendCol - col + 1);
    const r = sh.getRange(legendRow + 1, col, 1, width);
    breakApartSafe_(r);
    if (width > 1) r.merge();

    r.setValue(item.label)
      .setBackground(item.color)
      .setFontColor(getTextColorForBackground_(item.color))
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);

    col += width + 1;
  });

  sh.setRowHeight(legendRow, 24);
  sh.setRowHeight(legendRow + 1, 24);
}


function insererLogoDepuisDrive_(sh, fileId, col, row, xOffset, yOffset, width, height) {
  try {
    const blob = DriveApp.getFileById(fileId).getBlob();
    const img = sh.insertImage(blob, col, row, xOffset || 0, yOffset || 0);
    if (width) img.setWidth(width);
    if (height) img.setHeight(height);
    return img;
  } catch (e) {
    Logger.log("Logo Drive non inséré (" + fileId + ") : " + e);
    return null;
  }
}


function normaliserCleALT_(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function memeFormationNiveauALT_(periode, info) {
  const pf = normaliserCleALT_(periode.Formation);
  const pn = normaliserCleALT_(periode.Niveau);
  const infF = normaliserCleALT_(info.formation);
  const infN = normaliserCleALT_(info.niveau);

  return pf === infF && pn === infN;
}


function diagnostiquerPeriodesALT_() {
  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("DIAG_PERIODES_ALT");
  if (!sh) sh = ss.insertSheet("DIAG_PERIODES_ALT");
  resetSheetComplet_(sh);

  const rows = [[
    "Annee", "Formation", "Niveau", "Type",
    "Date_debut brut", "Date_debut lue",
    "Date_fin brut", "Date_fin lue",
    "Couleur", "Diagnostic"
  ]];

  periodes.forEach(p => {
    const d1 = parseDateGrist_(p.Date_debut);
    const d2 = parseDateGrist_(p.Date_fin);
    const diagnostic = (!d1 || !d2) ? "DATE NON LUE" : "OK";

    rows.push([
      p.Annee_scolaire || "",
      p.Formation || "",
      p.Niveau || "",
      p.Type || "",
      String(p.Date_debut || ""),
      d1 ? toIso_(d1) : "NON LUE",
      String(p.Date_fin || ""),
      d2 ? toIso_(d2) : "NON LUE",
      p.Couleur || "",
      diagnostic
    ]);
  });

  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight("bold").setBackground("#D9EAF7");
  sh.autoResizeColumns(1, rows[0].length);
}



function supprimerQuadrillageZonesModeleALT_(sh, lastCol) {
  // Le modèle officiel n'a pas de quadrillage visible dans ces zones.
  const zones = [
    sh.getRange(1, 1, 4, lastCol),
    sh.getRange(42, 1, 1, lastCol),
    sh.getRange(43, 1, 1, lastCol),
    sh.getRange(44, 1, 1, lastCol),
    sh.getRange(45, 1, 1, lastCol)
  ];

  zones.forEach(r => {
    r.setBorder(false, false, false, false, false, false);
  });
}


/*****************************************************************
 * Orange prioritaire si saisie dans H
 *****************************************************************/
function appliquerCouleurSaisieH_(range) {

  const sh = range.getSheet();
  const val = range.getValue();

  if (val !== "" && !isNaN(val)) {

    range.setBackground("#E67E00").setFontColor("#FFFFFF");

    const row = range.getRow();

    // recolore date + jour de la ligne
    sh.getRange(row, range.getColumn() - 2, 1, 2)
      .setBackground("#E67E00")
      .setFontColor("#FFFFFF");
  }
}


/*****************************************************************
 * Orange auto si saisie H
 *****************************************************************/
function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sh = e.range.getSheet();
    const name = sh.getName();

    if (!name.startsWith("ALT_")) return;
    if (name.startsWith("ALT_DETAIL_")) return;
    if (estCalendrierAvecColonnePDepuisFeuille_(sh)) return; // on exclut CAP/CPA

    const range = e.range;

    for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
      if (r < 8 || r > 38) continue;

      for (let c = range.getColumn(); c < range.getColumn() + range.getNumColumns(); c++) {
        const positionDansBloc = (c - 1) % 3;

        // Bloc ALT classique : D / J / H
        if (positionDansBloc !== 2) continue;

        const val = sh.getRange(r, c).getValue();
        if (val !== "" && !isNaN(val)) {
          sh.getRange(r, c - 2, 1, 3)
            .setBackground("#E86F00")
            .setFontColor("#FFFFFF")
            .setFontWeight("bold");
        }
      }
    }

    recalculerTotauxDebutFinEtSyntheseALT_(sh);

  } catch (err) {
    Logger.log("onEdit ALT ignoré : " + err);
  }
}


/*****************************************************************
 * Fond jaune infos formation/classe
 *****************************************************************/
function appliquerFondInfos_(sh) {
  sh.getRange("A3:AM4")
    .setBackground("#F5EDB3");
}


/*****************************************************************
 * Week-end prioritaire absolu
 *****************************************************************/
function forcerWeekEnds_(sh, row, colDate, colJour) {

  const jour = sh.getRange(row, colJour).getValue();

  if (jour === "S" || jour === "D") {

    sh.getRange(row, colDate, 1, 3)
      .setBackground("#D9D9D9")
      .setFontColor("#000000");
  }
}


function reappliquerMiseEnFormeTitreALT_(sh, info) {
  const zone = info ? getZoneTitreLogoALT_(info) : { titleCol: 10, titleWidth: 22, logoCol: 32, logoWidth: 8 };
  const lastCol = Math.max(sh.getLastColumn(), zone.logoCol + zone.logoWidth - 1);

  const row1 = sh.getRange(1, 1, 1, lastCol);
  breakApartSafe_(row1);
  row1.clearContent()
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setWrap(false)
    .setBorder(false, false, false, false, false, false);

  const rep = sh.getRange(1, 1, 1, 5); // A:E
  breakApartSafe_(rep);
  rep.merge()
    .setBackground("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  const title = sh.getRange(1, zone.titleCol, 1, zone.titleWidth); // CAP/CPA = H:AP
  breakApartSafe_(title);
  title.merge()
    .setValue("CFA RÉGIONAL DE L'ACADÉMIE DE NICE\nUFA : Lycée Les Eucalyptus")
    .setFontWeight("bold")
    .setFontSize(20)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  const logo = sh.getRange(1, zone.logoCol, 1, zone.logoWidth); // CAP/CPA = AQ:AZ
  breakApartSafe_(logo);
  logo.merge()
    .setBackground("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.setRowHeight(1, 82);
}


function reappliquerFondsJaunesInfosALT_(sh, debutColLabel, debutColValue, debutWidth) {
  // Libellés sur fond blanc.
  sh.getRange(3, 2, 2, 4)
    .setBackground("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("right");

  sh.getRange(3, debutColLabel, 2, 6)
    .setBackground("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("right");

  // Valeurs sur fond jaune pâle.
  sh.getRange(3, 6, 2, 12)
    .setBackground("#FFF9C4")
    .setFontWeight("bold")
    .setHorizontalAlignment("left");

  sh.getRange(3, debutColValue, 2, debutWidth)
    .setBackground("#FFF9C4")
    .setFontWeight("bold")
    .setHorizontalAlignment("left");
}







function estTypeFondSaisieALT_(type) {
  /*
   * Types qui doivent servir de "fond" pour les colonnes H/P.
   * Exemple : une VISITE ou un ABDE s'affiche en D/J,
   * mais H/P doivent rester en fond entreprise si une période ENT. existe le même jour.
   */
  const t = normaliserCleALT_(type || "");
  return (
    t.includes("PFMP") ||
    t.includes("STAGE") ||
    t.includes("ENTREPRISE") ||
    t === "ENT" ||
    t === "ENT."
  );
}

function periodesPourDateFormationALT_(formationPeriodes, date) {
  const t = normalize_(date).getTime();

  return (formationPeriodes || []).filter(p => {
    const debut = parseDateGrist_(p.Date_debut);
    const fin = parseDateGrist_(p.Date_fin);
    if (!debut || !fin) return false;
    return t >= debut.getTime() && t <= fin.getTime();
  });
}

function choisirPeriodePrioritaireALT_(periodes) {
  if (!periodes || !periodes.length) return null;

  const copy = periodes.slice();
  copy.sort((a, b) => {
    const pa = prioriteVisuellePeriodeALT_(a);
    const pb = prioriteVisuellePeriodeALT_(b);
    if (pb !== pa) return pb - pa;

    const da1 = parseDateGrist_(a.Date_debut);
    const da2 = parseDateGrist_(a.Date_fin);
    const db1 = parseDateGrist_(b.Date_debut);
    const db2 = parseDateGrist_(b.Date_fin);

    const dureeA = da1 && da2 ? da2.getTime() - da1.getTime() : 0;
    const dureeB = db1 && db2 ? db2.getTime() - db1.getTime() : 0;
    if (dureeA !== dureeB) return dureeA - dureeB;

    return (db1 ? db1.getTime() : 0) - (da1 ? da1.getTime() : 0);
  });

  return copy[0];
}

function trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date) {
  /*
   * Cherche une période de fond pour H/P : ENT., PFMP, STAGE.
   * Cette fonction ne doit jamais renvoyer VISITE, ABDE, CONSEIL, EXAMENS, etc.
   */
  const candidates = periodesPourDateFormationALT_(formationPeriodes, date)
    .filter(p => estTypeFondSaisieALT_(p.Type));

  return choisirPeriodePrioritaireALT_(candidates);
}

function trouverPeriodePourDateFormation_(formationPeriodes, date) {
  /*
   * Cherche l'événement visible en D/J.
   * Tous les types Grist sont affichables : ABDE, VISITE, CONSEIL, EXAMENS, etc.
   */
  return choisirPeriodePrioritaireALT_(periodesPourDateFormationALT_(formationPeriodes, date));
}

function calculerStyleJourALT_(formationPeriodes, vacances, feries, date, hValue, avecColonneP) {
  const iso = toIso_(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const ferie = feries && feries[iso];
  const vac = trouverVacancesPourDate_(vacances || [], date);

  const periodeVisible = trouverPeriodePourDateFormation_(formationPeriodes, date);
  const periodeFond = trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date);
  const periodeExamen = trouverPeriodeExamenPourDateFormation_(formationPeriodes, date);

  let bgDate = "#FFFFFF", bgJour = "#FFFFFF", bgSaisie = "#FFFFFF";
  let fontDate = "#000000", fontJour = "#000000", fontSaisie = "#000000";

  if (vac) {
    bgDate = "#222222"; fontDate = "#FFFFFF";
    bgJour = "#222222"; fontJour = "#FFFFFF";
    bgSaisie = "#FFFFFF"; fontSaisie = "#000000";
  }

  if (periodeFond) {
    const c = normalizeHexColor_(periodeFond.Couleur) || "#92D050";
    const f = getTextColorForBackground_(c);

    bgSaisie = c;
    fontSaisie = f;

    if (!vac) {
      bgDate = c; fontDate = f;
      bgJour = c; fontJour = f;
    }
  }

  if (periodeVisible && !estTypeFondSaisieALT_(periodeVisible.Type)) {
    const c = normalizeHexColor_(periodeVisible.Couleur) || "#00B0F0";
    const f = getTextColorForBackground_(c);

    bgDate = c; fontDate = f;
    bgJour = c; fontJour = f;
  }

  if (periodeExamen && !isWeekend && !ferie) {
    const c = normalizeHexColor_(periodeExamen.Couleur) || "#18c46b";
    const f = getTextColorForBackground_(c);

    bgDate = c; fontDate = f;
    bgJour = c; fontJour = f;
  }

  if (isWeekend) {
    bgDate = "#D9D9D9"; fontDate = "#000000";
    bgJour = "#D9D9D9"; fontJour = "#000000";
    bgSaisie = "#D9D9D9"; fontSaisie = "#000000";
  }

  if (ferie) {
    bgDate = "#D99999"; fontDate = "#000000";
    bgJour = "#D99999"; fontJour = "#000000";
    bgSaisie = "#D99999"; fontSaisie = "#000000";
  }

  const hasHours = hValue !== "" && hValue !== null && hValue !== undefined;

  // Correction importante :
  // l'heure saisie colore seulement H/P, pas D/J.
  // Ainsi EXAMENS, ABDE, VISITE, CONSEIL restent visibles en D/J.
  if (hasHours && !ferie && !isWeekend) {
    bgSaisie = "#E86F00";
    fontSaisie = "#FFFFFF";
  }

  const blockWidth = avecColonneP ? 4 : 3;
  const bg = Array(blockWidth).fill("#FFFFFF");
  const font = Array(blockWidth).fill("#000000");
  const weight = Array(blockWidth).fill("normal");

  bg[0] = bgDate;     font[0] = fontDate;
  bg[1] = bgJour;     font[1] = fontJour;
  bg[2] = bgSaisie;   font[2] = fontSaisie;

  if (hasHours && !ferie && !isWeekend) weight[2] = "bold";

  if (avecColonneP) {
    bg[3] = bgSaisie;
    font[3] = fontSaisie;
    if (hasHours && !ferie && !isWeekend) weight[3] = "bold";
  }

  return { bg, font, weight };
}

function trouverPeriodeExamenPourDateFormation_(formationPeriodes, date) {
  const tDate = normalize_(date).getTime();

  return formationPeriodes.find(p => {
    const type = String(p.Type || "").toUpperCase();
    if (!(type.includes("EXAM"))) return false;

    const debut = parseDateGrist_(p.Date_debut);
    const fin = parseDateGrist_(p.Date_fin);
    if (!debut || !fin) return false;

    return tDate >= debut.getTime() && tDate <= fin.getTime();
  }) || null;
}
function creerCalendrierFormationDetailDemiHeure_(ANNEE, info, periodes, vacances) {
  // Alias de compatibilité appelé par le sommaire.
  // IMPORTANT : génère uniquement la formation demandée.
  return creerCalendrierFormationDemiHeure_(ANNEE, info, periodes, vacances);
}

function genererLigneSommaireActive_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  if (sh.getName() !== "SOMMAIRE_PLANNING") {
    throw new Error("Placez-vous sur la ligne du sommaire à générer.");
  }
  const row = sh.getActiveRange().getRow();
  if (row < 4) throw new Error("Sélectionnez une ligne de planning dans le sommaire.");
  sh.getRange(row, 4).setValue(true);
  genererCalendriersCochesSommaire();
}


function construireLegendeFixeEtDynamiqueALT_(sh, legendRow, formationPeriodes, usedLastCol) {
  // Ligne 42 : légendes fixes.
  construireLegendeFixeALT_(sh, legendRow, usedLastCol);

  // Ligne 43 : légendes variables issues de Planning_Periodes.
  construireLegendeVariableALT_(sh, legendRow + 1, formationPeriodes, usedLastCol);
}

function construireLegendeFixeALT_(sh, row, usedLastCol) {
  const fixed = [
    { label: "Jours fériés", color: "#D99999" },
    { label: "Vacances scolaires", color: "#222222" },
    { label: "Cours UFA", color: "#E86F00" },
    { label: "Période d'examens", color: "#18c46b" }
  ];

  // On nettoie uniquement la partie gauche, sans toucher au total annuel à droite.
  const maxCol = Math.max(1, usedLastCol - 8);
  sh.getRange(row, 1, 1, maxCol)
    
    .clearContent()
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setFontWeight("normal")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  let col = 1;
  fixed.forEach(item => {
    if (col > maxCol) return;
    const width = Math.min(5, maxCol - col + 1);
    const r = sh.getRange(row, col, 1, width);
    if (width > 1) r.merge();
    r.setValue(item.label)
      .setBackground(item.color)
      .setFontColor(getTextColorForBackground_(item.color))
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);
    col += width + 1;
  });
}

function construireLegendeVariableALT_(sh, row, formationPeriodes, usedLastCol) {
  const variableKeywords = [
    "PFMP",
    "ENT.",
    "ENTREPRISE",
    "PROJET",
    "PARCOURSUP",
    "BTS",
    "STAGE",
    "MINI",
    "PORTES",
    "OUVERTES",
    "BANALISATION"
  ];

  const items = [];
  formationPeriodes.forEach(p => {
    const label = String(p.Type || "").trim();
    if (!label) return;

    const upper = label.toUpperCase();
    const keep = variableKeywords.some(k => upper.includes(k));
    if (!keep) return;

    const color = normalizeHexColor_(p.Couleur) || "#00B0F0";
    const key = upper + "|" + color;

    if (!items.some(x => x.key === key)) {
      items.push({ key, label, color });
    }
  });

  const maxCol = Math.max(1, usedLastCol - 8);

  // Nettoyage complet de la ligne variable.
  sh.getRange(row, 1, 1, maxCol)
    
    .clearContent()
    .setBackground("#FFFFFF")
    .setFontColor("#000000")
    .setFontWeight("normal")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  if (!items.length) return;

  let col = 1;
  items.forEach(item => {
    if (col > maxCol) return;

    const width = Math.min(5, maxCol - col + 1);
    const r = sh.getRange(row, col, 1, width);
    if (width > 1) r.merge();

    r.setValue(item.label)
      .setBackground(item.color)
      .setFontColor(getTextColorForBackground_(item.color))
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);

    col += width + 1;
  });
}



/**************** REGROUPEMENT AUTOMATIQUE DES PLANNINGS IDENTIQUES ****************/

function creerGroupesPlanningIdentiquesALT_(periodes) {
  const byClasse = {};

  // Une "classe" = couple Formation + Niveau.
  // On conserve Formation comme intitulé principal, puis on regroupe les Niveaux/classes
  // si la signature complète du planning est identique.
  periodes.forEach(p => {
    const formation = String(p.Formation || "").trim();
    const niveau = String(p.Niveau || "").trim();
    if (!formation || !niveau) return;

    const keyClasse = normaliserCleALT_(formation) + "|" + normaliserCleALT_(niveau);

    if (!byClasse[keyClasse]) {
      byClasse[keyClasse] = {
        formation: formation,
        niveau: niveau,
        periodes: []
      };
    }

    byClasse[keyClasse].periodes.push(p);
  });

  const groupes = {};

  Object.keys(byClasse).forEach(key => {
    const classe = byClasse[key];

    const signature = signaturePlanningClasseALT_(classe.periodes);
    const keyGroupe = normaliserCleALT_(classe.formation) + "||" + signature;

    if (!groupes[keyGroupe]) {
      groupes[keyGroupe] = {
        formation: classe.formation,
        niveaux: [],
        periodes: classe.periodes.slice(),
        signature: signature
      };
    }

    groupes[keyGroupe].niveaux.push(classe.niveau);
  });

  return Object.keys(groupes)
    .map(k => {
      const g = groupes[k];
      const niveaux = valeursUniquesALT_(g.niveaux).sort((a, b) => a.localeCompare(b));

      return {
        formation: g.formation,
        niveau: niveaux.join(" / "),
        groupe: "",
        couleur: couleurDominantePeriodesALT_(g.periodes),
        periodes: g.periodes,
        signature: g.signature,
        estGroupe: niveaux.length > 1
      };
    })
    .sort((a, b) => {
      const fa = normaliserCleALT_(a.formation);
      const fb = normaliserCleALT_(b.formation);
      if (fa !== fb) return fa.localeCompare(fb);
      return normaliserCleALT_(a.niveau).localeCompare(normaliserCleALT_(b.niveau));
    });
}

function signaturePlanningClasseALT_(periodes) {
  return periodes
    .map(p => {
      const d1 = parseDateGrist_(p.Date_debut);
      const d2 = parseDateGrist_(p.Date_fin);
      return [
        normaliserCleALT_(p.Type),
        d1 ? toIso_(d1) : "",
        d2 ? toIso_(d2) : "",
        normalizeHexColor_(p.Couleur) || "",
        normaliserCleALT_(p.Commentaire || "")
      ].join("§");
    })
    .sort()
    .join("¶");
}

function valeursUniquesALT_(values) {
  const out = [];
  values.forEach(v => {
    const s = String(v || "").trim();
    if (!s) return;
    if (!out.some(x => normaliserCleALT_(x) === normaliserCleALT_(s))) out.push(s);
  });
  return out;
}

function couleurDominantePeriodesALT_(periodes) {
  const p = periodes.find(x => {
    const t = String(x.Type || "").toUpperCase();
    return t.includes("PFMP") || t.includes("ENTREPRISE") || t.includes("STAGE");
  }) || periodes[0];

  return p ? (normalizeHexColor_(p.Couleur) || p.Couleur || "#FFFFFF") : "#FFFFFF";
}



function recalculerSyntheseProfsCAPActive() {
  const sh = SpreadsheetApp.getActiveSheet();

  if (!sh.getName().startsWith("ALT_")) {
    SpreadsheetApp.getActive().toast("Onglet ALT requis.", "Synthèse profs", 5);
    return;
  }

  const blockWidth = estCalendrierAvecColonnePDepuisFeuille_(sh) ? 4 : 3;
  if (blockWidth !== 4) {
    SpreadsheetApp.getActive().toast("Synthèse profs réservée aux ALT avec colonne P.", "Synthèse profs", 5);
    return;
  }

  const mois = detecterMoisALTDepuisFeuille_(sh, blockWidth);
  ajouterSyntheseProfsCAP_(sh, mois, blockWidth, 8, 38, 2);
  try { sh.showColumns(50, Math.min(24, sh.getMaxColumns() - 49)); } catch(e) {}

  SpreadsheetApp.getActive().toast("Synthèse profs recalculée en direct en AX2.", "Synthèse profs", 5);
}


function reparerPresentationCAPCPAActive() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (!sh.getName().startsWith("ALT_")) {
    SpreadsheetApp.getActive().toast("Onglet ALT requis.", "Réparation CAP/CPA", 5);
    return;
  }

  const blockWidth = 4;
  const firstDayRow = 8;
  const lastDayRow = 38;

  const mois = [];
  let c = 1;
  while (c <= sh.getLastColumn()) {
    const moisNom = String(sh.getRange(6, c).getDisplayValue() || "").trim();
    if (!moisNom) break;
    mois.push({ name: moisNom, col: c });
    c += blockWidth;
    if (mois.length > 18) break;
  }

  const lastCol = mois.length * blockWidth;

  reappliquerMiseEnFormeTitreALT_(sh, { formation: "CAP", niveau: "CPA" });
  copierImagesModeleALT_(sh, { formation: "CAP", niveau: "CPA" });
  finaliserPresentationALT_(sh, lastCol, true);
  ajouterSyntheseProfsCAP_(sh, mois, blockWidth, firstDayRow, lastDayRow, 2);

  SpreadsheetApp.getActive().toast("Présentation CAP/CPA réparée.", "Réparation CAP/CPA", 5);
}


function finaliserPresentationALT_(sh, lastCol, avecColonneP) {
  try { sh.setHiddenGridlines(true); } catch (e) {}

  const planningLastRow = 44;

  // Nettoyer la zone extérieure au calendrier, mais ne jamais toucher AX et suivantes.
  if (avecColonneP) {
    const synthStartCol = 50; // AX

    if (lastCol + 1 < synthStartCol) {
      sh.getRange(1, lastCol + 1, 75, synthStartCol - lastCol - 1)
        .clearContent()
        .clearFormat()
        .setBackground("#FFFFFF")
        .setBorder(false, false, false, false, false, false);
    }

    sh.getRange(46, 1, 30, Math.min(49, sh.getMaxColumns()))
      .clearContent()
      .clearFormat()
      .setBackground("#FFFFFF")
      .setBorder(false, false, false, false, false, false);

    try { sh.showColumns(synthStartCol, Math.min(24, sh.getMaxColumns() - synthStartCol + 1)); } catch(e) {}
  } else {
    if (lastCol + 1 <= sh.getMaxColumns()) {
      const w = Math.min(20, sh.getMaxColumns() - lastCol);
      if (w > 0) {
        sh.getRange(1, lastCol + 1, 60, w)
          .clearContent()
          .clearFormat()
          .setBackground("#FFFFFF")
          .setBorder(false, false, false, false, false, false);
      }
    }

    sh.getRange(46, 1, Math.min(30, sh.getMaxRows() - 45), lastCol)
      .clearContent()
      .clearFormat()
      .setBackground("#FFFFFF")
      .setBorder(false, false, false, false, false, false);
  }

  // Bordure extérieure propre du planning uniquement.
  sh.getRange(1, 1, planningLastRow, lastCol)
    .setBorder(true, true, true, true, false, false, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Renforcer explicitement la bordure droite et basse.
  sh.getRange(1, lastCol, planningLastRow, 1)
    .setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sh.getRange(planningLastRow, 1, 1, lastCol)
    .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);


  appliquerBorduresLisibiliteALT_(sh, detecterMoisALTDepuisFeuille_(sh, avecColonneP ? 4 : 3), avecColonneP ? 4 : 3);
}





/**************** ACTUALISATION ALT SANS EFFACER LES SAISIES ****************/

function detecterMoisALTDepuisFeuille_(sh, blockWidth) {
  const mois = [];
  let c = 1;

  while (c <= sh.getLastColumn()) {
    const moisNom = String(sh.getRange(6, c).getDisplayValue() || "").trim();
    if (!moisNom) break;

    // On s'arrête avant la synthèse AX.
    if (c >= 50) break;

    mois.push({ name: moisNom, col: c });
    c += blockWidth;
    if (mois.length > 18) break;
  }

  return mois;
}

function estColonneHouPALT_(col, blockWidth) {
  const offset = (col - 1) % blockWidth;
  return offset === 2 || offset === 3; // H puis P dans le bloc mois CAP/CPA
}

function estCalendrierAvecColonnePDepuisFeuille_(sh) {
  // Détection simple : un en-tête H/P apparaît ligne 7.
  for (let c = 1; c <= Math.min(49, sh.getLastColumn()); c++) {
    const v = String(sh.getRange(7, c).getDisplayValue() || "").toUpperCase().trim();
    if (v === "H / P" || v === "H/P") return true;
  }
  return false;
}

function trouverOngletsALT_() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .filter(sh => sh.getName().startsWith("ALT_") && !sh.getName().startsWith("ALT_DETAIL_"));
}



function lireValeurApresLibelleALT_(sh, row, libelle) {
  const lastCol = Math.min(sh.getLastColumn(), 30);
  const vals = sh.getRange(row, 1, 1, lastCol).getDisplayValues()[0];

  const wanted = normaliserCleALT_(libelle).split(" ").join("");
  for (let i = 0; i < vals.length; i++) {
    const v = String(vals[i] || "").trim();
    const n = normaliserCleALT_(v).split(" ").join("");

    if (n === wanted || n.indexOf(wanted + ":") === 0) {
      const parts = v.split(":");
      const inline = parts.length > 1 ? parts.slice(1).join(":").trim() : "";
      if (inline) return inline;

      for (let j = i + 1; j < vals.length; j++) {
        const next = String(vals[j] || "").trim();
        if (next) return next;
      }
    }
  }

  if (row === 3) return String(sh.getRange(3, 3).getDisplayValue() || sh.getRange(3, 2).getDisplayValue() || "").trim();
  if (row === 4) return String(sh.getRange(4, 3).getDisplayValue() || sh.getRange(4, 2).getDisplayValue() || "").trim();

  return "";
}


function getAnneeMoisALT_(ANNEE, monthIndex) {
  // Année scolaire : septembre à décembre = première année ; janvier à août = deuxième année.
  const parts = String(ANNEE.CODE || "").split("-");
  const y1 = Number(parts[0]);
  const y2 = Number(parts[1]);
  return monthIndex >= 8 ? y1 : y2; // JS : septembre = 8
}

function periodeActiveALT_(p) {
  if (p.Actif === undefined || p.Actif === null || p.Actif === "") return true;
  if (p.Actif === true) return true;
  if (p.Actif === false) return false;

  const s = String(p.Actif).trim().toLowerCase();
  return !["false", "faux", "0", "non", "no"].includes(s);
}

function diagnostiquerPeriodesALTActif() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const trouvees = trouverPeriodesPourFeuilleALT_(sh, periodes, ANNEE);

  const msg =
    "Onglet : " + sh.getName() +
    "\nFormation lue : " + lireValeurApresLibelleALT_(sh, 3, "Formation") +
    "\nClasse lue : " + lireValeurApresLibelleALT_(sh, 4, "Classe") +
    "\nPériodes Grist année : " + periodes.length +
    "\nPériodes retenues pour cet ALT : " + trouvees.length +
    "\n\n" + trouvees.slice(0, 20).map(p =>
      [p.Formation, p.Niveau || p.Groupe, p.Date_debut, p.Date_fin, p.Type, p.Couleur].join(" | ")
    ).join("\n");

  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("Diagnostic périodes ALT", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch(e) {
    ss.toast("Diagnostic écrit dans le journal.", "Diagnostic périodes ALT", 8);
  }
}


function trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE) {
  // Lecture robuste dans les lignes 3 et 4.
  const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
  const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

  const fNorm = normaliserCleALT_(formation);
  const classes = String(classe || "")
    .split(/[\s,;\/]+/)
    .map(x => normaliserCleALT_(x))
    .filter(Boolean);

  const retenues = (toutesPeriodes || []).filter(p => {
    if (String(p.Annee_scolaire || "") !== String(ANNEE.CODE || "")) return false;
    if (!periodeActiveALT_(p)) return false;

    const pf = normaliserCleALT_(p.Formation || "");
    const pn = normaliserCleALT_(p.Niveau || p.Groupe || "");

    if (pf !== fNorm) return false;

    // Si la ligne classe contient plusieurs classes regroupées : CIEL CPA MVA...
    // on retient toute période dont le niveau/groupe est dans cette liste.
    if (!classes.length) return true;
    return classes.includes(pn);
  });

  Logger.log(
    "[ALT PERIODES] " + sh.getName() +
    " formation=" + formation +
    " classe=" + classe +
    " periodes retenues=" + retenues.length
  );

  return retenues;
}


function clearPériodesALTConservantSaisies_(sh, mois, blockWidth, firstDayRow, lastDayRow, avecColonneP) {
  // Nettoie uniquement les couleurs de fond / textes de périodes Grist
  // tout en conservant les valeurs saisies dans H/P.
  for (let idx = 0; idx < mois.length; idx++) {
    const c = 1 + idx * blockWidth;

    for (let r = firstDayRow; r <= lastDayRow; r++) {
      const dateVal = sh.getRange(r, c).getValue();
      if (!dateVal) continue;

      // On garde les valeurs des cellules ; on remet le style de base seulement.
      sh.getRange(r, c, 1, avecColonneP ? 4 : 3)
        .setFontColor("#000000")
        .setFontWeight("normal")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
    }
  }
}



function normaliserEnteteDJ_ALT_(sh, mois, blockWidth, avecColonneP) {
  // Ligne 7 : on n'affiche plus le 1er jour du mois.
  // On met des repères fixes : D = date, J = jour, H ou H/P = heures/prof.
  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;

    sh.getRange(7, c)
      .setValue("D")
      .setBackground("#333333")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    sh.getRange(7, c + 1)
      .setValue("J")
      .setBackground("#333333")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    sh.getRange(7, c + 2, 1, avecColonneP ? 2 : 1)
      .setValue(avecColonneP ? "H / P" : "H")
      .setBackground("#E86F00")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  });
}


function appliquerPeriodesALTDepuisGristSansEffacerSaisies_(sh, ANNEE, vacances, toutesPeriodes) {
  /*
   * Actualisation ALT sans effacer les saisies.
   *
   * Corrige les superpositions :
   * - ABDE / VISITE / CONSEIL / EXAMENS en D/J ;
   * - ENT. / PFMP / STAGE conservés en H/P si superposés ;
   * - orange uniquement en H/P lorsqu'une heure est saisie ;
   * - D/J ne passent jamais en orange à cause des heures.
   */
  vacances = vacances || getVacancesDepuisGrist_(ANNEE);
  toutesPeriodes = toutesPeriodes || getPlanningPeriodesDepuisGrist_(ANNEE);

  const avecColonneP = estCalendrierAvecColonnePDepuisFeuille_(sh);
  const blockWidth = avecColonneP ? 4 : 3;
  const firstDayRow = 8;
  const lastDayRow = 38;
  const nbRows = lastDayRow - firstDayRow + 1;
  const mois = detecterMoisALTDepuisFeuille_(sh, blockWidth);

  if (!mois.length) return;

  normaliserEnteteDJ_ALT_(sh, mois, blockWidth, avecColonneP);

  const formationPeriodes = trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE);
  const feries = getFeriesFrance_(Number(ANNEE.CODE.split("-")[0]), Number(ANNEE.CODE.split("-")[1]) + 1);

  Logger.log("[ALT ACTUALISATION RAPIDE] " + sh.getName() + " mois=" + mois.length + " periodes=" + formationPeriodes.length);

  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;
    const monthName = String(sh.getRange(6, c).getDisplayValue() || m.name);
    const monthIndex = moisNomVersIndex_(monthName);
    const year = Number(trouverAnneeALTDepuisColonne_(sh, c)) || getAnneeMoisALT_(ANNEE, monthIndex);

    const range = sh.getRange(firstDayRow, c, nbRows, blockWidth);
    const values = range.getValues();

    const bgs = [];
    const fonts = [];
    const weights = [];
    const aligns = [];

    for (let i = 0; i < nbRows; i++) {
      const rowVals = values[i];
      const day = Number(rowVals[0]);

      let rowBg = Array(blockWidth).fill("#FFFFFF");
      let rowFont = Array(blockWidth).fill("#000000");
      let rowWeight = Array(blockWidth).fill("normal");
      const rowAlign = Array(blockWidth).fill("center");

      if (day) {
        const d = new Date(year, monthIndex, day);
        const style = calculerStyleJourALT_(formationPeriodes, vacances, feries, d, rowVals[2], avecColonneP);
        rowBg = style.bg;
        rowFont = style.font;
        rowWeight = style.weight;
      }

      bgs.push(rowBg);
      fonts.push(rowFont);
      weights.push(rowWeight);
      aligns.push(rowAlign);
    }

    range
      .setBackgrounds(bgs)
      .setFontColors(fonts)
      .setFontWeights(weights)
      .setHorizontalAlignments(aligns)
      .setVerticalAlignment("middle");
  });
debugALT_("Avant légende", sh);
  dessinerLegendeEtTotalALT_(
    sh,
    42,
    mois.length * blockWidth,
    ANNEE,
    formationPeriodes,
    construireRefsTotauxMensuelsALT_(mois, blockWidth)
  );
debugALT_("Avant formule total annuel", sh);
appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth);


debugALT_("Avant finaliser présentation", sh);
  finaliserPresentationALT_(sh, mois.length * blockWidth, avecColonneP);

  debugALT_("Avant recalcul synthèse", sh);
  recalculerTotauxDebutFinEtSyntheseALT_(sh);

  appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth);


debugALT_("Avant nettoyage lignes 42/43", sh);
nettoyerLignes42_43_ALT_(sh, mois.length * blockWidth);


debugALT_("Avant bordure extérieure", sh);
restaurerBordureExterieureALT_(sh, mois.length * blockWidth);


debugALT_("Avant horodatage", sh);
mettreAJourHorodatageActualisationALT_(sh, ANNEE);

ameliorerLisibiliteEnteteALT_(sh, mois, blockWidth);


  SpreadsheetApp.flush();
}








function moisNomVersIndex_(nom) {
  const n = normaliserCleALT_(nom);
  const mois = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DECEMBRE"];
  return Math.max(0, mois.indexOf(n));
}

function construireRefsTotauxMensuelsALT_(mois, blockWidth) {
  return mois.map((m, idx) => {
    const c = 1 + idx * blockWidth;
    return colToLetter_(c + blockWidth - 1) + "40";
  });
}





/**************** CORRECTIF VACANCES POUR ACTUALISATION ALT ****************/

function trouverVacancesPourDate_(vacances, date) {
  const d = normalize_(date).getTime();

  return (vacances || []).find(v => {
    const debut = parseDateGrist_(v.Date_debut || v.Debut || v.date_debut || v.start);
    const fin = parseDateGrist_(v.Date_fin || v.Fin || v.date_fin || v.end);
    if (!debut || !fin) return false;

    return normalize_(debut).getTime() <= d && d <= normalize_(fin).getTime();
  }) || null;
}



function recalculerTotauxALTActif() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (!sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) {
    SpreadsheetApp.getActive().toast("Onglet ALT requis.", "Recalcul ALT", 5);
    return;
  }
  recalculerTotauxDebutFinEtSyntheseALT_(sh);
  SpreadsheetApp.getActive().toast("Totaux, dates et synthèse recalculés.", "Recalcul ALT", 5);
}





/**************** CRÉATION DE PÉRIODES GRIST DEPUIS UNE SÉLECTION ALT ****************/

function creerPeriodesGristDepuisSelectionALT() {
  /*
   * Multi-sélection prise en charge :
   * - sélection simple ;
   * - sélection multiple avec Ctrl/cmd ;
   * - création d'une ligne Grist par plage continue et par classe/groupe.
   */
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  try {
    if (!sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) {
      ss.toast("Placez-vous sur un onglet ALT journalier.", "Création périodes", 6);
      return;
    }

    const ui = SpreadsheetApp.getUi();

    const typeResp = ui.prompt(
      "Créer des périodes Grist",
      "Type de période à créer ? Exemple : ENT., PFMP, EXAMENS, Immersion entreprise",
      ui.ButtonSet.OK_CANCEL
    );
    if (typeResp.getSelectedButton() !== ui.Button.OK) return;

    const type = String(typeResp.getResponseText() || "").trim();
    if (!type) {
      ui.alert("Type obligatoire.");
      return;
    }

    const couleurResp = ui.prompt(
      "Couleur",
      "Couleur HEX ? Exemple : #92D050 pour entreprise, #18c46b pour examens. Laisser vide = couleur du type si connue, sinon #92D050.",
      ui.ButtonSet.OK_CANCEL
    );
    if (couleurResp.getSelectedButton() !== ui.Button.OK) return;

    let couleur = String(couleurResp.getResponseText() || "").trim();
    if (!couleur) couleur = couleurDepuisTypePlanning_(type) || "#92D050";
    couleur = normalizeHexColor_(couleur) || "#92D050";

    const ANNEE = getAnneeActive_();
    const avecColonneP = estCalendrierAvecColonnePDepuisFeuille_(sh);
    const blockWidth = avecColonneP ? 4 : 3;
    const firstDayRow = 8;
    const lastDayRow = 38;

    const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
    const classeTexte = lireValeurApresLibelleALT_(sh, 4, "Classe");
    const groupes = groupesDepuisClasseALT_(classeTexte);

    if (!formation || !groupes.length) {
      ui.alert("Impossible de lire Formation ou Classe dans l'en-tête de l'ALT.");
      return;
    }

    const ranges = getSelectionsALT_();
    if (!ranges.length) {
      ui.alert("Aucune sélection détectée.");
      return;
    }

    const dates = extraireDatesDepuisSelectionsALT_(sh, ranges, ANNEE, blockWidth, firstDayRow, lastDayRow);

    if (!dates.length) {
      ui.alert("Aucune date exploitable dans la sélection. Sélectionnez des cellules entre les lignes 8 et 38 du calendrier.");
      return;
    }

    const plages = compresserDatesEnPlages_(dates);
    const records = [];

    plages.forEach(plage => {
      groupes.forEach(groupe => {
        records.push({
          fields: {
            Annee_scolaire: ANNEE.CODE,
            Formation: formation,
            Niveau: groupe,
            Groupe: "",
            Date_debut: formatDateGrist_(plage.debut),
            Date_fin: formatDateGrist_(plage.fin),
            Type: type,
            Couleur: couleur,
            Ligne_sheet: "",
            Duree_jour: "",
            Commentaire: "Créé depuis sélection " + sh.getName(),
            Actif: true
          }
        });
      });
    });

    const recap =
      records.length + " ligne(s) vont être créées dans Grist." +
      "\nFormation : " + formation +
      "\nClasse(s) : " + groupes.join(", ") +
      "\nType : " + type +
      "\nCouleur : " + couleur +
      "\nPériode(s) :\n" + plages.map(p => "• " + formatDateFr_(p.debut) + " → " + formatDateFr_(p.fin)).join("\n");

    const confirm = ui.alert("Confirmer la création", recap, ui.ButtonSet.OK_CANCEL);
    if (confirm !== ui.Button.OK) return;

    grist_("POST", "/tables/Planning_Periodes/records", { records: records });

    ss.toast(records.length + " période(s) créée(s) dans Grist.", "Création périodes", 8);

    const vacances = getVacancesDepuisGrist_(ANNEE);
    const toutesPeriodes = getPlanningPeriodesDepuisGrist_(ANNEE);
    appliquerPeriodesALTDepuisGristSansEffacerSaisies_(sh, ANNEE, vacances, toutesPeriodes);

  } catch (err) {
    Logger.log("ERREUR creerPeriodesGristDepuisSelectionALT : " + err.message + "\n" + (err.stack || ""));
    SpreadsheetApp.getUi().alert(
      "Erreur création périodes",
      err.message + "\n\nConsultez le journal d'exécution pour le détail.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}


function couleurDepuisTypePlanning_(type) {
  const norm = normaliserCleALT_(type);
  const t = getTypesPlanningDepuisGrist_().find(x => {
    const a = normaliserCleALT_(x.Type || "");
    const b = normaliserCleALT_(x.Libelle || "");
    return a === norm || b === norm;
  });
  return t ? normalizeHexColor_(t.Couleur) : "";
}

function getSelectionsALT_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = ss.getActiveRangeList();

  if (list) {
    return list.getRanges();
  }

  const r = ss.getActiveRange();
  return r ? [r] : [];
}

function extraireDatesDepuisSelectionsALT_(sh, ranges, ANNEE, blockWidth, firstDayRow, lastDayRow) {
  const datesMap = {};

  ranges.forEach(range => {
    const r1 = range.getRow();
    const c1 = range.getColumn();
    const r2 = r1 + range.getNumRows() - 1;
    const c2 = c1 + range.getNumColumns() - 1;

    for (let r = Math.max(firstDayRow, r1); r <= Math.min(lastDayRow, r2); r++) {
      for (let c = c1; c <= c2; c++) {
        const blockStartCol = 1 + Math.floor((c - 1) / blockWidth) * blockWidth;
        if (blockStartCol < 1 || blockStartCol > sh.getLastColumn()) continue;

        const day = Number(sh.getRange(r, blockStartCol).getValue());
        if (!day) continue;

        const moisNom = String(sh.getRange(6, blockStartCol).getDisplayValue() || "").trim();
        const monthIndex = moisNomVersIndex_(moisNom);
        if (monthIndex < 0) continue;

        // Année lue dans la ligne 5 : indispensable pour les plannings qui vont
        // au-delà d'août, par exemple septembre 2027.
        const year = Number(trouverAnneeALTDepuisColonne_(sh, blockStartCol)) || getAnneeMoisALT_(ANNEE, monthIndex);
        const d = new Date(year, monthIndex, day);
        datesMap[toIso_(d)] = d;
      }
    }
  });

  return Object.keys(datesMap)
    .sort()
    .map(k => datesMap[k]);
}

function compresserDatesEnPlages_(dates) {
  if (!dates || !dates.length) return [];

  const sorted = dates
    .map(d => normalize_(d))
    .sort((a, b) => a.getTime() - b.getTime());

  const plages = [];
  let debut = sorted[0];
  let fin = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i];
    const expected = new Date(fin);
    expected.setDate(expected.getDate() + 1);

    if (d.getTime() === expected.getTime()) {
      fin = d;
    } else {
      plages.push({ debut, fin });
      debut = d;
      fin = d;
    }
  }

  plages.push({ debut, fin });
  return plages;
}

function groupesDepuisClasseALT_(classeTexte) {
  let cleaned = String(classeTexte || "").trim();

  // Nettoyage sans expression régulière avec drapeau /g.
  cleaned = cleaned.replace("Classe :", "");
  cleaned = cleaned.replace("Classe:", "");
  cleaned = cleaned.split(",").join(" ");
  cleaned = cleaned.split(";").join(" ");
  cleaned = cleaned.split("/").join(" ");
  cleaned = cleaned.trim();

  if (!cleaned) return [];

  return cleaned
    .split(" ")
    .map(x => String(x || "").trim())
    .filter(x => x);
}


function formatDateGrist_(date) {
  return Utilities.formatDate(date, "Europe/Paris", "yyyy-MM-dd");
}





/**************** BORDURES DE LECTURE ALT ****************/

function appliquerBorduresLisibiliteALT_(sh, mois, blockWidth) {
  /*
   * Bordures de lisibilité uniquement.
   * Ne modifie ni les valeurs, ni les couleurs, ni les heures/profs.
   */
  if (!mois || !mois.length) return;

  const firstMonthRow = 6;
  const lastMonthRow = 40;
  const firstYearRow = 5;
  const lastCol = mois.length * blockWidth;

  // Ligne des années.
  sh.getRange(firstYearRow, 1, 1, lastCol)
    .setBorder(true, true, true, true, true, true, "#666666", SpreadsheetApp.BorderStyle.SOLID);

  // Encadrement de chaque mois.
  mois.forEach((m, idx) => {
    const c = 1 + idx * blockWidth;

    sh.getRange(firstMonthRow, c, lastMonthRow - firstMonthRow + 1, blockWidth)
      .setBorder(true, true, true, true, false, false, "#666666", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    sh.getRange(7, c, 1, blockWidth)
      .setBorder(true, true, true, true, true, false, "#999999", SpreadsheetApp.BorderStyle.SOLID);

    sh.getRange(8, c, 31, blockWidth)
      .setBorder(null, null, null, null, true, true, "#D0D0D0", SpreadsheetApp.BorderStyle.SOLID);
  });

  // Bordure globale.
  sh.getRange(firstMonthRow, 1, lastMonthRow - firstMonthRow + 1, lastCol)
    .setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function reparerBorduresALTActif() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  if (!sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) {
    ss.toast("Placez-vous sur un onglet ALT journalier.", "Bordures ALT", 6);
    return;
  }

  const avecColonneP = estCalendrierAvecColonnePDepuisFeuille_(sh);
  const blockWidth = avecColonneP ? 4 : 3;
  const mois = detecterMoisALTDepuisFeuille_(sh, blockWidth);

  appliquerBorduresLisibiliteALT_(sh, mois, blockWidth);
  ss.toast("Bordures de lisibilité appliquées.", "Bordures ALT", 5);
}
function breakApartSafe_(range) {
  try {
    const sh = range.getSheet();
    const r1 = range.getRow();
    const c1 = range.getColumn();
    const r2 = r1 + range.getNumRows() - 1;
    const c2 = c1 + range.getNumColumns() - 1;

    const merged = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).getMergedRanges();

    merged.forEach(mr => {
      const mr1 = mr.getRow();
      const mc1 = mr.getColumn();
      const mr2 = mr1 + mr.getNumRows() - 1;
      const mc2 = mc1 + mr.getNumColumns() - 1;

      const croise = !(mr2 < r1 || mr1 > r2 || mc2 < c1 || mc1 > c2);
      if (croise) {
        try { mr.breakApart(); } catch (e) {}
      }
    });
  } catch (e) {
    Logger.log("breakApartSafe_ ignoré : " + e);
  }
}

function mergeRangeSafe_(range) {
  breakApartSafe_(range);
  try {
    if (range.getNumRows() > 1 || range.getNumColumns() > 1) {
      range.merge();
    }
  } catch (e) {
    Logger.log("Fusion ignorée : " + range.getA1Notation() + " / " + e);
  }
  return range;
}

function fusionnerIdentiquesSurLigne_(sh, row, startCol, lastCol) {
  let currentValue = sh.getRange(row, startCol).getValue();
  let mergeStart = startCol;

  for (let col = startCol + 1; col <= lastCol + 1; col++) {
    const value = col <= lastCol ? sh.getRange(row, col).getValue() : "__END__";

    if (value !== currentValue) {
      const width = col - mergeStart;

      if (currentValue !== "" && width > 1) {
        const range = sh.getRange(row, mergeStart, 1, width);
        mergeRangeSafe_(range)
          .setHorizontalAlignment("center")
          .setVerticalAlignment("middle");
      }

      currentValue = value;
      mergeStart = col;
    }
  }
}

function fusionnerValeurSurLigne_(sh, row, startCol, lastCol, valeurCible) {
  let mergeStart = null;

  for (let col = startCol; col <= lastCol + 1; col++) {
    const value = col <= lastCol ? sh.getRange(row, col).getValue() : "__END__";

    if (value === valeurCible) {
      if (mergeStart === null) mergeStart = col;
    } else {
      if (mergeStart !== null) {
        const width = col - mergeStart;

        if (width > 1) {
          const range = sh.getRange(row, mergeStart, 1, width);
          mergeRangeSafe_(range)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");
        }

        mergeStart = null;
      }
    }
  }
}

function fusionnerCellulesIdentiquesColonne_(sh, firstRow, lastRow, col) {
  if (lastRow < firstRow) return;

  let currentValue = sh.getRange(firstRow, col).getValue();
  let mergeStart = firstRow;

  for (let row = firstRow + 1; row <= lastRow + 1; row++) {
    const value = row <= lastRow ? sh.getRange(row, col).getValue() : "__END__";

    if (value !== currentValue) {
      const height = row - mergeStart;

      if (currentValue !== "" && height > 1) {
        const range = sh.getRange(mergeStart, col, height, 1);
        mergeRangeSafe_(range)
          .setVerticalAlignment("middle")
          .setHorizontalAlignment("center");
      }

      currentValue = value;
      mergeStart = row;
    }
  }
}

/* Fonction estTypeVisibleCAL_ retirée : version fusionnée en fin de fichier. */


function estTypeFondSaisieALT_(type) {
  return estTypeVisibleCAL_(type);
}

function trouverPeriodePourDateFormation_(formationPeriodes, date) {
  const candidates = periodesPourDateFormationALT_(formationPeriodes, date)
    .filter(p => estTypeVisibleCAL_(p.Type));

  return choisirPeriodePrioritaireALT_(candidates);
}

function trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date) {
  const candidates = periodesPourDateFormationALT_(formationPeriodes, date)
    .filter(p => estTypeVisibleCAL_(p.Type));

  return choisirPeriodePrioritaireALT_(candidates);
}

function typesVariablesPlanning_(formationPeriodes) {
  const items = [];

  (formationPeriodes || [])
    .filter(p => estTypeVisibleCAL_(p.Type))
    .forEach(p => {
      const type = String(p.Type || "").trim();
      const color = normalizeHexColor_(p.Couleur) || "#00B0F0";
      const key = normaliserCleALT_(type) + "|" + color;

      if (!items.some(x => x.key === key)) {
        items.push({
          key,
          label: type,
          type,
          color
        });
      }
    });

  return items;
}

/* Fonction estTypeVisibleCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction getPlanningPeriodesDepuisGrist_ retirée : version fusionnée en fin de fichier. */


function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("BTS") && t.includes("STAGE")) return 105;
  if (t.includes("MINI") && t.includes("STAGE")) return 104;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;

  return 0;
}

function trouverPeriodePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
  );
}

function trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
      .filter(p => estTypeVisibleCAL_(p.Type))
  );
}
function trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE) {
  const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
  const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

  const fNorm = normaliserCleALT_(formation);
  const cNorm = normaliserCleALT_(classe);

  const classes = String(classe || "")
    .split(/[\s,\/]+/)
    .map(x => normaliserCleALT_(x))
    .filter(Boolean);

  return (toutesPeriodes || []).filter(p => {
    if (String(p.Annee_scolaire || "") !== String(ANNEE.CODE || "")) return false;
    if (!periodeActiveALT_(p)) return false;

    const pf = normaliserCleALT_(p.Formation || "");
    const pn = normaliserCleALT_(p.Niveau || p.Groupe || "");

    if (pf !== fNorm) return false;

    // Cas normal
    if (classes.length && classes.includes(pn)) return true;

    // Cas spécial calendriers Mixité
    if (cNorm === "MIXITE" && pn === "MIXITE") return true;

    return !classes.length;
  });
}
function regenererCALHebdo() {
  const ANNEE = getAnneeActive_();

  genererFeuillePlanningHebdo_(ANNEE, {
    suffix: "_hebdo",
    titre: "PLANNING PFMP - STAGES - MIXITÉ - VUE HEBDOMADAIRE",
    start: ANNEE.START,
    end: ANNEE.END
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("CAL hebdo régénéré.", "Planning scolaire", 5);
}

function regenererCALCompact() {
  const ANNEE = getAnneeActive_();

  genererFeuillePlanning_(ANNEE, {
    suffix: "_compact",
    titre: "PLANNING PFMP - STAGES - MIXITÉ",
    start: ANNEE.START,
    end: ANNEE.END
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("CAL compact régénéré.", "Planning scolaire", 5);
}

function regenererCALP1() {
  const ANNEE = getAnneeActive_();
  const y1 = Number(ANNEE.CODE.split("-")[0]);

  genererFeuillePlanning_(ANNEE, {
    suffix: "_P1_Sept_Noel",
    titre: "PLANNING PFMP - PÉRIODE 1 : RENTRÉE À NOËL",
    start: ANNEE.START,
    end: `${y1}-12-31`
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("CAL P1 régénéré.", "Planning scolaire", 5);
}

function regenererCALP2() {
  const ANNEE = getAnneeActive_();
  const y2 = Number(ANNEE.CODE.split("-")[1]);

  genererFeuillePlanning_(ANNEE, {
    suffix: "_P2_Jan_Aout",
    titre: "PLANNING PFMP - PÉRIODE 2 : JANVIER À AOÛT",
    start: `${y2}-01-01`,
    end: ANNEE.END
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("CAL P2 régénéré.", "Planning scolaire", 5);
}
function nettoyerLigne43ALT_(sh, lastCol) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  sh.getRange(43, 1, 1, lastCol)
    .setBorder(false, false, false, false, false, false);
}


/* Fonction getPlanningPeriodesDepuisGrist_ retirée : version fusionnée en fin de fichier. */


function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  if (t.includes("EXAM")) return 500;
  if (t.includes("CONSEIL")) return 490;
  if (t.includes("VISITE")) return 480;
  if (t.includes("APDE") || t.includes("ABDE") || t.includes("BDU")) return 470;

  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("STAGE")) return 105;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;

  return 10;
}

function estTypeFondSaisieALT_(type) {
  const t = normaliserCleALT_(type || "");
  return (
    t.includes("PFMP") ||
    t.includes("STAGE") ||
    t.includes("ENTREPRISE") ||
    t === "ENT" ||
    t === "ENT."
  );
}

function trouverPeriodePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
  );
}

function trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
      .filter(p => estTypeFondSaisieALT_(p.Type))
  );
}

function nettoyerLignes42_43_ALT_(sh, lastCol) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  sh.getRange(42, 1, 2, lastCol)
    .setBorder(false, false, false, false, false, false);
}
function restaurerBordureExterieureALT_(sh, lastCol) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  sh.getRange(1, 1, 44, lastCol)
    .setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);
}
function typesVariablesPlanning_(formationPeriodes) {
  const fixes = [
    "JOURS FERIES", "JOUR FERIE", "FERIE",
    "VACANCES", "VACANCES SCOLAIRES",
    "COURS", "COURS UFA",
    "PERIODE D EXAMENS", "PERIODE D'EXAMENS",
    "EXAMENS", "EXAMEN"
  ];

  const items = [];

  (formationPeriodes || []).forEach(p => {
    const type = String(p.Type || "").trim();
    if (!type) return;

    const norm = normaliserCleALT_(type);
    if (fixes.includes(norm)) return;

    const color = normalizeHexColor_(p.Couleur) || "#00B0F0";
    const key = norm + "|" + color;

    if (!items.some(x => x.key === key)) {
      items.push({
        key: key,
        label: type,
        type: type,
        color: color
      });
    }
  });

  return items;
}
function appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  const firstDayRow = 8;
  const lastDayRow = 38;
  const lastCol = mois.length * blockWidth;

  const plagesH = mois.map((m, idx) => {
    const hCol = 1 + idx * blockWidth + 2; // colonne H du bloc D/J/H ou D/J/H/P
    return sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getA1Notation();
  });

  const formule = "=SUM(" + plagesH.join(",") + ")";

  sh.getRange(42, lastCol - 7, 1, 3)
    .merge()
    .setValue("Total annuel")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.getRange(42, lastCol - 4, 1, 5)
    .merge()
    .setFormula(formule)
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}
function calculerStyleJourALT_(formationPeriodes, vacances, feries, date, hValue, avecColonneP) {
  const iso = toIso_(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const ferie = feries && feries[iso];
  const vac = trouverVacancesPourDate_(vacances || [], date);

  const periodesJour = periodesPourDateFormationALT_(formationPeriodes, date);
  const periodeVisible = choisirPeriodePrioritaireALT_(periodesJour);
  const periodeFond = choisirPeriodePrioritaireALT_(
    periodesJour.filter(p => estTypeFondSaisieALT_(p.Type))
  );

  const hasHours = hValue !== "" && hValue !== null && hValue !== undefined;

  let bgDate = "#FFFFFF", bgJour = "#FFFFFF", bgSaisie = "#FFFFFF";
  let fontDate = "#000000", fontJour = "#000000", fontSaisie = "#000000";

  if (vac) {
    bgDate = "#222222"; fontDate = "#FFFFFF";
    bgJour = "#222222"; fontJour = "#FFFFFF";
    bgSaisie = "#FFFFFF"; fontSaisie = "#000000";
  }

  if (periodeFond) {
    const c = normalizeHexColor_(periodeFond.Couleur) || "#92D050";
    const f = getTextColorForBackground_(c);

    bgSaisie = c;
    fontSaisie = f;

    if (!vac) {
      bgDate = c; fontDate = f;
      bgJour = c; fontJour = f;
    }
  }

  if (periodeVisible && !estTypeFondSaisieALT_(periodeVisible.Type)) {
    const c = normalizeHexColor_(periodeVisible.Couleur) || "#00B0F0";
    const f = getTextColorForBackground_(c);

    bgDate = c; fontDate = f;
    bgJour = c; fontJour = f;
  }

  if (hasHours && !ferie && !isWeekend) {
    const evenementPrioritaire =
      periodeVisible &&
      !estTypeFondSaisieALT_(periodeVisible.Type);

    bgSaisie = "#E86F00";
    fontSaisie = "#FFFFFF";

    if (!evenementPrioritaire) {
      bgDate = "#E86F00";
      fontDate = "#FFFFFF";
      bgJour = "#E86F00";
      fontJour = "#FFFFFF";
    }
  }

  if (isWeekend) {
    bgDate = "#D9D9D9"; fontDate = "#000000";
    bgJour = "#D9D9D9"; fontJour = "#000000";
    bgSaisie = "#D9D9D9"; fontSaisie = "#000000";
  }

  if (ferie) {
    bgDate = "#D99999"; fontDate = "#000000";
    bgJour = "#D99999"; fontJour = "#000000";
    bgSaisie = "#D99999"; fontSaisie = "#000000";
  }

  const blockWidth = avecColonneP ? 4 : 3;
  const bg = Array(blockWidth).fill("#FFFFFF");
  const font = Array(blockWidth).fill("#000000");
  const weight = Array(blockWidth).fill("normal");

  bg[0] = bgDate;
  font[0] = fontDate;

  bg[1] = bgJour;
  font[1] = fontJour;

  bg[2] = bgSaisie;
  font[2] = fontSaisie;

  if (hasHours && !ferie && !isWeekend) {
    weight[0] = "bold";
    weight[1] = "bold";
    weight[2] = "bold";
  }

  if (avecColonneP) {
    bg[3] = bgSaisie;
    font[3] = fontSaisie;

    if (hasHours && !ferie && !isWeekend) {
      weight[3] = "bold";
    }
  }

  return {
    bg: bg,
    font: font,
    weight: weight
  };
}
function estTypeFondSaisieALT_(type) {
  const t = normaliserCleALT_(type || "");
  return (
    t.includes("PFMP") ||
    t.includes("STAGE") ||
    t.includes("ENTREPRISE") ||
    t === "ENT" ||
    t === "ENT."
  );
}

function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  if (t.includes("EXAM")) return 500;
  if (t.includes("CONSEIL")) return 490;
  if (t.includes("VISITE")) return 480;
  if (t.includes("APDE") || t.includes("ABDE") || t.includes("BDU")) return 470;

  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("STAGE")) return 105;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;

  return 10;
}

function trouverPeriodePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
  );
}

function trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date) {
  return choisirPeriodePrioritaireALT_(
    periodesPourDateFormationALT_(formationPeriodes, date)
      .filter(p => estTypeFondSaisieALT_(p.Type))
  );
}


/* Fonction getPlanningPeriodesDepuisGrist_ retirée : version fusionnée en fin de fichier. */


function calculerStyleJourALT_(formationPeriodes, vacances, feries, date, hValue, avecColonneP) {
  const iso = toIso_(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const ferie = feries && feries[iso];
  const vac = trouverVacancesPourDate_(vacances || [], date);

  const periodeVisible = trouverPeriodePourDateFormation_(formationPeriodes, date);
  const periodeFond = trouverPeriodeFondSaisiePourDateFormation_(formationPeriodes, date);

  const hasHours = hValue !== "" && hValue !== null && hValue !== undefined;

  let bgDate = "#FFFFFF", bgJour = "#FFFFFF", bgSaisie = "#FFFFFF";
  let fontDate = "#000000", fontJour = "#000000", fontSaisie = "#000000";

  if (periodeFond) {
    const c = normalizeHexColor_(periodeFond.Couleur) || "#92D050";
    const f = getTextColorForBackground_(c);
    bgDate = c; bgJour = c; bgSaisie = c;
    fontDate = f; fontJour = f; fontSaisie = f;
  }

  if (hasHours) {
    bgDate = "#E86F00"; bgJour = "#E86F00"; bgSaisie = "#E86F00";
    fontDate = "#FFFFFF"; fontJour = "#FFFFFF"; fontSaisie = "#FFFFFF";
  }

  if (periodeVisible && !estTypeFondSaisieALT_(periodeVisible.Type)) {
    const c = normalizeHexColor_(periodeVisible.Couleur) || "#00B0F0";
    const f = getTextColorForBackground_(c);
    bgDate = c; bgJour = c;
    fontDate = f; fontJour = f;
  }

  if (vac) {
    bgDate = "#222222"; bgJour = "#222222";
    fontDate = "#FFFFFF"; fontJour = "#FFFFFF";
  }

  if (isWeekend) {
    bgDate = "#D9D9D9"; bgJour = "#D9D9D9"; bgSaisie = "#D9D9D9";
    fontDate = "#000000"; fontJour = "#000000"; fontSaisie = "#000000";
  }

  if (ferie) {
    bgDate = "#D99999"; bgJour = "#D99999"; bgSaisie = "#D99999";
    fontDate = "#000000"; fontJour = "#000000"; fontSaisie = "#000000";
  }

  const blockWidth = avecColonneP ? 4 : 3;
  const bg = Array(blockWidth).fill("#FFFFFF");
  const font = Array(blockWidth).fill("#000000");
  const weight = Array(blockWidth).fill("normal");

  bg[0] = bgDate; font[0] = fontDate;
  bg[1] = bgJour; font[1] = fontJour;
  bg[2] = bgSaisie; font[2] = fontSaisie;

  if (hasHours && !ferie && !isWeekend) {
    weight[0] = "bold";
    weight[1] = "bold";
    weight[2] = "bold";
  }

  if (avecColonneP) {
    bg[3] = bgSaisie;
    font[3] = fontSaisie;
    if (hasHours && !ferie && !isWeekend) weight[3] = "bold";
  }

  return { bg, font, weight };
}





function appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;
  if (!mois || !mois.length) return;

  const firstDayRow = 8;
  const lastDayRow = 38;
  const lastCol = mois.length * blockWidth;
  const totalValueCol = Math.max(1, lastCol - 4);

  const plagesH = mois.map((m, idx) => {
    const hCol = 1 + idx * blockWidth + 2;
    return sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getA1Notation();
  });

  sh.getRange(42, totalValueCol)
    .setFormulaLocal("=SOMME(" + plagesH.join(";") + ")")
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}


function mettreAJourHorodatageActualisationALT_(sh, ANNEE) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  const now = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");
  const range = sh.getRange("H2:AO2");
  const ancien = String(range.getDisplayValue() || "");

  let genere = ancien.match(/généré le\s+([0-9\/]+\s+[0-9:]+)/i);
  let dateGeneration = genere ? genere[1] : "";

  if (!dateGeneration) {
    dateGeneration = now;
  }

  const texte =
    "CALENDRIER PRÉVISIONNEL  " +
    ANNEE.CODE +
    "  généré le " +
    dateGeneration +
    "  -  actualisé le " +
    now;

  range.setValue(texte);
}
function debugALT_(etape, sh) {
  Logger.log("[DEBUG ALT] " + etape + " | " + (sh ? sh.getName() : ""));
  SpreadsheetApp.getActive().toast(etape, "DEBUG ALT", 5);
}
function appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;
  if (!mois || !mois.length) return;

  const firstDayRow = 8;
  const lastDayRow = 38;
  const lastCol = mois.length * blockWidth;
  const totalValueCol = Math.max(1, lastCol - 4);

  const plagesH = mois.map((m, idx) => {
    const hCol = 1 + idx * blockWidth + 2;
    return sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getA1Notation();
  });

  // Important : pas de merge ici. On écrit seulement dans la cellule existante.
  sh.getRange(42, totalValueCol)
    .setFormula("=SOMME(" + plagesH.join(",") + ")")
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
}
function mettreAJourHorodatageActualisationALT_(sh, ANNEE) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  const now = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");
  const range = sh.getRange("H2:AO2");
  const ancien = String(range.getDisplayValue() || "");

  const m = ancien.match(/généré le\s+([0-9\/]+\s+[0-9:]+)/i);
  const generation = m ? m[1] : now;

  range.setValue(
    "CALENDRIER PRÉVISIONNEL  " +
    ANNEE.CODE +
    "  généré le " +
    generation +
    "  -  actualisé le " +
    now
  );
}
function trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE) {
  const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
  const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

  const fNorm = normaliserCleALT_(formation);
  const classes = String(classe || "")
    .split(/[\s,\/]+/)
    .map(x => normaliserCleALT_(x))
    .filter(Boolean);

  return (toutesPeriodes || []).filter(p => {
    if (String(p.Annee_scolaire || "").trim() !== String(ANNEE.CODE || "").trim()) return false;
    if (!periodeActiveALT_(p)) return false;

    const pf = normaliserCleALT_(p.Formation || "");
    const pn = normaliserCleALT_(p.Niveau || "");
    const pg = normaliserCleALT_(p.Groupe || "");

    if (pf !== fNorm) return false;

    if (!pn && !pg) return true;
    if (!classes.length) return true;

    return classes.includes(pn) || classes.includes(pg);
  });
}
function mettreAJourHorodatageActualisationALT_(sh, ANNEE) {
  if (!sh || !sh.getName().startsWith("ALT_")) return;

  const now = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");
  const lastCol = sh.getLastColumn();
  const rowVals = sh.getRange(2, 1, 1, lastCol).getDisplayValues()[0];

  let target = sh.getRange(2, 1);
  for (let i = 0; i < rowVals.length; i++) {
    const txt = String(rowVals[i] || "");
    if (txt.includes("CALENDRIER PRÉVISIONNEL")) {
      target = sh.getRange(2, i + 1);
      break;
    }
  }

  const merged = target.getMergedRanges();
  const range = merged.length ? merged[0] : target;
  const ancien = String(range.getDisplayValue() || "");

  const m = ancien.match(/généré le\s+([0-9\/]+\s+[0-9:]+)/i);
  const generation = m ? m[1] : now;

  range.setValue(
    "CALENDRIER PRÉVISIONNEL  " +
    ANNEE.CODE +
    "  généré le " +
    generation +
    "  -  actualisé le " +
    now
  );
}
function estTypeEvenementALT_(type) {
  const t = normaliserCleALT_(type || "");
  return (
    t.includes("EXAM") ||
    t.includes("CONSEIL") ||
    t.includes("VISITE") ||
    t.includes("APPEL TEL") ||
    t.includes("APDE") ||
    t.includes("ABDE") ||
    t.includes("BDU")
  );
}

function trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE) {
  const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
  const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

  const fNorm = normaliserCleALT_(formation);
  const classes = String(classe || "")
    .split(/[\s,\/;,-]+/)
    .map(x => normaliserCleALT_(x))
    .filter(Boolean);

  return (toutesPeriodes || []).filter(p => {
    if (String(p.Annee_scolaire || "").trim() !== String(ANNEE.CODE || "").trim()) return false;
    if (!periodeActiveALT_(p)) return false;

    const pf = normaliserCleALT_(p.Formation || "");
    const pn = normaliserCleALT_(p.Niveau || "");
    const pg = normaliserCleALT_(p.Groupe || "");

    if (pf !== fNorm) return false;

    // Les événements pédagogiques doivent s’afficher sur la formation,
    // même si Niveau/Groupe n’est pas strictement identique.
    if (estTypeEvenementALT_(p.Type)) return true;

    if (!pn && !pg) return true;
    if (!classes.length) return true;

    return classes.includes(pn) || classes.includes(pg);
  });
}

function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  if (t.includes("EXAM")) return 500;
  if (t.includes("CONSEIL")) return 490;
  if (t.includes("VISITE")) return 480;
  if (t.includes("APDE") || t.includes("ABDE") || t.includes("BDU")) return 470;

  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("STAGE")) return 105;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;

  return 10;
}

function appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;
  if (!mois || !mois.length) return;

  const firstDayRow = 8;
  const lastDayRow = 38;
  const lastCol = mois.length * blockWidth;
  const totalValueCol = Math.max(1, lastCol - 4);

  const plagesH = mois.map((m, idx) => {
    const hCol = 1 + idx * blockWidth + 2;
    return sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getA1Notation();
  });

  sh.getRange(42, totalValueCol)
    .setFormulaLocal("=SOMME(" + plagesH.join(";") + ")")
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}
function appliquerFormuleTotalAnnuelALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;
  if (!mois || !mois.length) return;

  const firstDayRow = 8;
  const lastDayRow = 38;
  const lastCol = mois.length * blockWidth;
  const totalValueCol = Math.max(1, lastCol - 4);

  const plagesH = mois.map((m, idx) => {
    const hCol = 1 + idx * blockWidth + 2;
    return sh.getRange(firstDayRow, hCol, lastDayRow - firstDayRow + 1, 1).getA1Notation();
  });

  sh.getRange(42, totalValueCol)
    .setFormula("=SUM(" + plagesH.join(";") + ")")
    .setBackground("#666666")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}
function estTypeEvenementALT_(type) {
  const t = normaliserCleALT_(type || "");
  return (
    t.includes("EXAM") ||
    t.includes("CONSEIL") ||
    t.includes("VISITE") ||
    t.includes("APPEL") ||
    t.includes("APDE") ||
    t.includes("ABDE") ||
    t.includes("BDU")
  );
}

function trouverPeriodesPourFeuilleALT_(sh, toutesPeriodes, ANNEE) {
  const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
  const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

  const fNorm = normaliserCleALT_(formation);
  const classes = String(classe || "")
    .split(/[\s,\/;,-]+/)
    .map(x => normaliserCleALT_(x))
    .filter(Boolean);

  return (toutesPeriodes || []).filter(p => {
    if (String(p.Annee_scolaire || "").trim() !== String(ANNEE.CODE || "").trim()) return false;
    if (!periodeActiveALT_(p)) return false;

    const pf = normaliserCleALT_(p.Formation || "");
    const pn = normaliserCleALT_(p.Niveau || "");
    const pg = normaliserCleALT_(p.Groupe || "");

    if (estTypeEvenementALT_(p.Type)) {
      return !pf || pf === fNorm;
    }

    if (pf !== fNorm) return false;
    if (!pn && !pg) return true;
    if (!classes.length) return true;

    return classes.includes(pn) || classes.includes(pg);
  });
}
function ameliorerLisibiliteEnteteALT_(sh, mois, blockWidth) {
  if (!sh || !sh.getName().startsWith("ALT_") || sh.getName().startsWith("ALT_DETAIL_")) return;

  const lastCol = mois.length * blockWidth;

  // 1. Lignes du calendrier plus hautes
  sh.setRowHeights(8, 31, 26); // lignes 8 à 38

  // 2. Titre principal
  sh.getRange(1, 1, 1, lastCol)
    .setFontSize(16)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  sh.setRowHeight(1, 42);

  // 3. Sous-titre calendrier prévisionnel
  sh.getRange(2, 1, 1, lastCol)
    .setFontSize(10)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  sh.setRowHeight(2, 24);

  // 4. Bloc formation / classe
  sh.getRange(3, 1, 2, Math.min(18, lastCol))
    .setFontSize(12)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  // Zone valeur formation / classe, souvent en jaune
  sh.getRange(3, 5, 2, Math.min(16, lastCol - 4))
    .setFontSize(12)
    .setFontWeight("bold")
    .setHorizontalAlignment("left");

  // 5. Bloc début / fin des cours à droite
  sh.getRange(3, Math.max(1, lastCol - 15), 2, 16)
    .setFontSize(12)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  // 6. Lignes mois / années / entêtes D J H
  sh.getRange(5, 1, 3, lastCol)
    .setFontSize(9)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  sh.setRowHeight(5, 22);
  sh.setRowHeight(6, 24);
  sh.setRowHeight(7, 24);

  // 7. Ligne des totaux mensuels
  sh.getRange(39, 1, 2, lastCol)
    .setFontSize(10)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  sh.setRowHeight(39, 22);
  sh.setRowHeight(40, 24);

  // 8. Légendes
  sh.getRange(42, 1, 2, lastCol)
    .setFontSize(10)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");

  sh.setRowHeight(42, 24);
  sh.setRowHeight(43, 24);
}function prioriteVisuellePeriodeALT_(p) {
  const t = normaliserCleALT_(p.Type || "");

  // Événements ponctuels prioritaires
  if (t.includes("EXAM")) return 600;
  if (t.includes("CONSEIL")) return 590;
  if (t.includes("VISITE")) return 580;
  if (t.includes("APPEL TEL")) return 570;
  if (t.includes("APDE") || t.includes("ABDE") || t.includes("BDU")) return 560;

  // Périodes de fond
  if (t.includes("P DIF") || t.includes("PDIF") || t.includes("PARCOURS")) return 120;
  if (t.includes("PFMP")) return 110;
  if (t.includes("STAGE")) return 105;
  if (t.includes("ENTREPRISE") || t === "ENT" || t === "ENT.") return 100;

  return 10;
}



/************************************************************
 * EDT - CALENDRIERS SCOLAIRES MULTI-ANNÉES
 * Ajout durable :
 * 26. Créer calendriers scolaires manquants
 * 27. Régénérer calendrier scolaire année choisie
 *
 * Principe :
 * - "Créer calendriers scolaires manquants" ajoute uniquement les dates absentes
 *   pour toutes les années présentes dans Annees_Scolaires.
 * - "Régénérer..." supprime puis recrée uniquement l'année choisie,
 *   utile après correction des vacances prévisionnelles/officielles.
 ************************************************************/

function EDT_CreerCalendriersScolairesManquants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const annees = EDT_getToutesAnneesScolaires_();

  if (!annees.length) {
    ss.toast("Aucune année trouvée dans Annees_Scolaires.", "Planning scolaire", 8);
    return;
  }

  const dataCalendrier = grist_("GET", "/tables/Calendrier_Scolaire/records");
  const existingKeys = {};
  (dataCalendrier.records || []).forEach(r => {
    const f = r.fields || {};
    const code = String(f.Annee_scolaire || "").trim();
    const date = String(f.Date || "").substring(0, 10);
    if (code && date) existingKeys[date + "_" + code] = true;
  });

  let totalAjoute = 0;
  const details = [];

  annees.forEach(ANNEE => {
    const nb = EDT_CreerCalendrierPourAnnee_(ANNEE, existingKeys, false);
    totalAjoute += nb;
    details.push(ANNEE.CODE + " : " + nb + " date(s) ajoutée(s)");
  });

  ss.toast(
    totalAjoute + " date(s) ajoutée(s) dans Calendrier_Scolaire.",
    "Planning scolaire",
    10
  );

  Logger.log("EDT_CreerCalendriersScolairesManquants\n" + details.join("\n"));
}

function EDT_RegenererCalendrierScolaireAnneeChoisie() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ANNEE = EDT_DemanderAnneeScolaire_("Régénérer le calendrier scolaire");

  const confirmation = ui.alert(
    "Confirmation",
    "Le calendrier Grist de l'année " + ANNEE.CODE + " va être supprimé puis recréé.\n\n" +
    "Les autres années ne seront pas touchées.\n\n" +
    "Continuer ?",
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    ss.toast("Régénération annulée.", "Planning scolaire", 5);
    return;
  }

  const nbSuppr = EDT_SupprimerCalendrierPourAnnee_(ANNEE);
  const nbCree = EDT_CreerCalendrierPourAnnee_(ANNEE, {}, true);

  ss.toast(
    ANNEE.CODE + " régénérée : " + nbSuppr + " date(s) supprimée(s), " + nbCree + " date(s) créée(s).",
    "Planning scolaire",
    10
  );
}

function EDT_getToutesAnneesScolaires_() {
  const data = grist_("GET", "/tables/Annees_Scolaires/records");

  return (data.records || [])
    .map(r => {
      const f = r.fields || {};
      return {
        ID: r.id,
        CODE: String(f.Code || "").trim(),
        START: f.Date_debut,
        END: f.Date_fin,
        ZONE: String(f.Zone || "B").trim() || "B",
        ACTIVE: isTruthy_(f.Active),
        COMMENTAIRE: String(f.Commentaire || "")
      };
    })
    .filter(a => a.CODE && a.START && a.END)
    .sort((a, b) => a.CODE.localeCompare(b.CODE));
}

function EDT_DemanderAnneeScolaire_(titre) {
  const ui = SpreadsheetApp.getUi();
  const annees = EDT_getToutesAnneesScolaires_();

  if (!annees.length) {
    throw new Error("Aucune année scolaire exploitable dans Annees_Scolaires.");
  }

  const liste = annees.map(a => {
    const marqueur = a.ACTIVE ? "  (active)" : "";
    return "• " + a.CODE + marqueur + " : " + a.START + " → " + a.END;
  }).join("\n");

  const response = ui.prompt(
    titre || "Choix de l'année scolaire",
    "Saisis le code exact de l'année à traiter.\n\n" + liste + "\n\nExemple : 2027-2028",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    throw new Error("Choix de l'année annulé.");
  }

  const code = String(response.getResponseText() || "").trim();
  const annee = annees.find(a => a.CODE === code);

  if (!annee) {
    throw new Error("Année scolaire introuvable : " + code);
  }

  return annee;
}

function EDT_getVacancesDepuisGristPourAnnee_(ANNEE) {
  const data = grist_("GET", "/tables/Vacances_Scolaires/records");

  return (data.records || [])
    .map(r => r.fields || {})
    .filter(r =>
      String(r.Annee_scolaire || "").trim() === ANNEE.CODE &&
      String(r.Zone || "").trim() === ANNEE.ZONE &&
      isTruthy_(r.Actif)
    );
}

function EDT_CreerCalendrierPourAnnee_(ANNEE, existingKeys, forceCreate) {
  const start = parseDateGrist_(ANNEE.START);
  const end = parseDateGrist_(ANNEE.END);

  if (!start || !end) {
    throw new Error("Dates invalides pour l'année " + ANNEE.CODE);
  }

  if (end.getTime() < start.getTime()) {
    throw new Error("Date de fin antérieure à la date de début pour " + ANNEE.CODE);
  }

  const feries = getFeriesFrance_(start.getFullYear(), end.getFullYear());
  const vacances = EDT_getVacancesDepuisGristPourAnnee_(ANNEE);
  const records = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const jour = normalize_(d);
    const iso = toIso_(jour);
    const cle = iso + "_" + ANNEE.CODE;

    if (!forceCreate && existingKeys && existingKeys[cle]) {
      continue;
    }

    const ferie = feries[iso] || "";
    const vac = getVacancesPourDate_(jour, vacances);
    const estWeekend = jour.getDay() === 0 || jour.getDay() === 6;

    records.push({
      fields: {
        Date: iso,
        Annee_scolaire: ANNEE.CODE,
        Zone: ANNEE.ZONE,
        Semaine_ISO: getWeekISO_(jour),
        Jour_nom: getJourNom_(jour),
        Jour_numero: jour.getDate(),
        Mois_nom: getMoisNom_(jour),
        Mois_numero: jour.getMonth() + 1,
        Est_weekend: estWeekend,
        Est_ferie: !!ferie,
        Nom_ferie: ferie,
        Est_vacances: !!vac,
        Nom_vacances: vac ? vac.Nom_vacances : "",
        Statut_vacances: vac ? vac.Statut : "",
        Duree_jour_defaut: (estWeekend || ferie || vac) ? 0 : 7
      }
    });
  }

  EDT_PostRecordsCalendrier_(records);

  if (existingKeys) {
    records.forEach(r => {
      existingKeys[r.fields.Date + "_" + r.fields.Annee_scolaire] = true;
    });
  }

  return records.length;
}

function EDT_SupprimerCalendrierPourAnnee_(ANNEE) {
  const data = grist_("GET", "/tables/Calendrier_Scolaire/records");

  const ids = (data.records || [])
    .filter(r => String((r.fields || {}).Annee_scolaire || "").trim() === ANNEE.CODE)
    .map(r => r.id)
    .filter(id => id !== null && id !== undefined);

  EDT_DeleteRecordsCalendrier_(ids);

  return ids.length;
}

function EDT_PostRecordsCalendrier_(records) {
  if (!records || !records.length) return;

  const chunkSize = 200;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    grist_("POST", "/tables/Calendrier_Scolaire/records", { records: chunk });
  }
}

function EDT_DeleteRecordsCalendrier_(ids) {
  if (!ids || !ids.length) return;

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    grist_("DELETE", "/tables/Calendrier_Scolaire/records", { records: chunk });
  }
}



/* Fonction estTypeVisibleCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction creerLignesPlanning_ retirée : version fusionnée en fin de fichier. */



/* Fonction appliquerPeriodesPlanningSurSegments_ retirée : version fusionnée en fin de fichier. */



/* Fonction dessinerBlocJournalierCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction ecrireLibelleAuMilieuBlocCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction appliquerPeriodesPlanningHebdoSurSemaines_ retirée : version fusionnée en fin de fichier. */

/************ NAVIGATION PAR ANNÉE SCOLAIRE ************/


/* Fonction onOpen retirée : version fusionnée en fin de fichier. */


function NAV_Accueil() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("SOMMAIRE_PLANNING");
  if (!sh) {
    mettreAJourSommairePlanning();
    sh = ss.getSheetByName("SOMMAIRE_PLANNING");
  }
  ss.setActiveSheet(sh);
}

function construireMenuNavigationPlanning_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu("📚 Navigation planning");

  menu.addItem("🏠 Accueil / Sommaire", "NAV_Accueil");
  menu.addSeparator();

  const items = listerOngletsPlanningPourNavigation_();

  const props = PropertiesService.getDocumentProperties();
  props.deleteAllProperties();

  let index = 1;
  const parAnnee = {};

  items.forEach(item => {
    if (!parAnnee[item.annee]) parAnnee[item.annee] = [];
    parAnnee[item.annee].push(item);
  });

  Object.keys(parAnnee).sort().forEach(annee => {
    const sousMenu = ui.createMenu("📅 " + annee);

    parAnnee[annee]
      .sort((a, b) => {
        if (a.ordreType !== b.ordreType) return a.ordreType - b.ordreType;
        return a.libelle.localeCompare(b.libelle);
      })
      .forEach(item => {
        const fn = "NAV_OPEN_" + String(index).padStart(3, "0");
        props.setProperty(fn, item.nom);
        sousMenu.addItem(item.prefixe + " " + item.libelle, fn);
        index++;
      });

    menu.addSubMenu(sousMenu);
  });

  menu.addToUi();
}


/* Fonction listerOngletsPlanningPourNavigation_ retirée : version fusionnée en fin de fichier. */


function analyserNomOngletPlanning_(nom) {
  let m;

  m = nom.match(/^ALT_DETAIL_(\d{4}-\d{4})_(.+)$/);
  if (m) {
    return {
      annee: m[1],
      libelle: nettoyerLibelleNavigation_(m[2]),
      type: "Détail demi-heure",
      prefixe: "🔎",
      ordreType: 2
    };
  }

  m = nom.match(/^ALT_(\d{4}-\d{4})_(.+)$/);
  if (m) {
    return {
      annee: m[1],
      libelle: nettoyerLibelleNavigation_(m[2]),
      type: "Carnet regroupé",
      prefixe: "📘",
      ordreType: 1
    };
  }

  m = nom.match(/^CAL_(\d{4})_(\d{4})_(.+)$/);
  if (m) {
    return {
      annee: m[1] + "-" + m[2],
      libelle: nettoyerLibelleNavigation_("CAL " + m[3]),
      type: "Calendrier général",
      prefixe: "📅",
      ordreType: 3
    };
  }

  return null;
}

function nettoyerLibelleNavigation_(txt) {
  return String(txt || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ouvrirOngletDepuisMenu_(fnName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nom = PropertiesService.getDocumentProperties().getProperty(fnName);

  if (!nom) {
    ss.toast("Menu à actualiser : recharge le classeur.", "Navigation planning", 6);
    return;
  }

  const sh = ss.getSheetByName(nom);
  if (!sh) {
    ss.toast("Onglet introuvable : " + nom, "Navigation planning", 6);
    return;
  }

  ss.setActiveSheet(sh);
}

/************ WRAPPERS MENU : prévoir large ************/

function NAV_OPEN_001(){ouvrirOngletDepuisMenu_("NAV_OPEN_001");}
function NAV_OPEN_002(){ouvrirOngletDepuisMenu_("NAV_OPEN_002");}
function NAV_OPEN_003(){ouvrirOngletDepuisMenu_("NAV_OPEN_003");}
function NAV_OPEN_004(){ouvrirOngletDepuisMenu_("NAV_OPEN_004");}
function NAV_OPEN_005(){ouvrirOngletDepuisMenu_("NAV_OPEN_005");}
function NAV_OPEN_006(){ouvrirOngletDepuisMenu_("NAV_OPEN_006");}
function NAV_OPEN_007(){ouvrirOngletDepuisMenu_("NAV_OPEN_007");}
function NAV_OPEN_008(){ouvrirOngletDepuisMenu_("NAV_OPEN_008");}
function NAV_OPEN_009(){ouvrirOngletDepuisMenu_("NAV_OPEN_009");}
function NAV_OPEN_010(){ouvrirOngletDepuisMenu_("NAV_OPEN_010");}
function NAV_OPEN_011(){ouvrirOngletDepuisMenu_("NAV_OPEN_011");}
function NAV_OPEN_012(){ouvrirOngletDepuisMenu_("NAV_OPEN_012");}
function NAV_OPEN_013(){ouvrirOngletDepuisMenu_("NAV_OPEN_013");}
function NAV_OPEN_014(){ouvrirOngletDepuisMenu_("NAV_OPEN_014");}
function NAV_OPEN_015(){ouvrirOngletDepuisMenu_("NAV_OPEN_015");}
function NAV_OPEN_016(){ouvrirOngletDepuisMenu_("NAV_OPEN_016");}
function NAV_OPEN_017(){ouvrirOngletDepuisMenu_("NAV_OPEN_017");}
function NAV_OPEN_018(){ouvrirOngletDepuisMenu_("NAV_OPEN_018");}
function NAV_OPEN_019(){ouvrirOngletDepuisMenu_("NAV_OPEN_019");}
function NAV_OPEN_020(){ouvrirOngletDepuisMenu_("NAV_OPEN_020");}
function NAV_OPEN_021(){ouvrirOngletDepuisMenu_("NAV_OPEN_021");}
function NAV_OPEN_022(){ouvrirOngletDepuisMenu_("NAV_OPEN_022");}
function NAV_OPEN_023(){ouvrirOngletDepuisMenu_("NAV_OPEN_023");}
function NAV_OPEN_024(){ouvrirOngletDepuisMenu_("NAV_OPEN_024");}
function NAV_OPEN_025(){ouvrirOngletDepuisMenu_("NAV_OPEN_025");}
function NAV_OPEN_026(){ouvrirOngletDepuisMenu_("NAV_OPEN_026");}
function NAV_OPEN_027(){ouvrirOngletDepuisMenu_("NAV_OPEN_027");}
function NAV_OPEN_028(){ouvrirOngletDepuisMenu_("NAV_OPEN_028");}
function NAV_OPEN_029(){ouvrirOngletDepuisMenu_("NAV_OPEN_029");}
function NAV_OPEN_030(){ouvrirOngletDepuisMenu_("NAV_OPEN_030");}
function NAV_OPEN_031(){ouvrirOngletDepuisMenu_("NAV_OPEN_031");}
function NAV_OPEN_032(){ouvrirOngletDepuisMenu_("NAV_OPEN_032");}
function NAV_OPEN_033(){ouvrirOngletDepuisMenu_("NAV_OPEN_033");}
function NAV_OPEN_034(){ouvrirOngletDepuisMenu_("NAV_OPEN_034");}
function NAV_OPEN_035(){ouvrirOngletDepuisMenu_("NAV_OPEN_035");}
function NAV_OPEN_036(){ouvrirOngletDepuisMenu_("NAV_OPEN_036");}
function NAV_OPEN_037(){ouvrirOngletDepuisMenu_("NAV_OPEN_037");}
function NAV_OPEN_038(){ouvrirOngletDepuisMenu_("NAV_OPEN_038");}
function NAV_OPEN_039(){ouvrirOngletDepuisMenu_("NAV_OPEN_039");}
function NAV_OPEN_040(){ouvrirOngletDepuisMenu_("NAV_OPEN_040");}
function NAV_OPEN_041(){ouvrirOngletDepuisMenu_("NAV_OPEN_041");}
function NAV_OPEN_042(){ouvrirOngletDepuisMenu_("NAV_OPEN_042");}
function NAV_OPEN_043(){ouvrirOngletDepuisMenu_("NAV_OPEN_043");}
function NAV_OPEN_044(){ouvrirOngletDepuisMenu_("NAV_OPEN_044");}
function NAV_OPEN_045(){ouvrirOngletDepuisMenu_("NAV_OPEN_045");}
function NAV_OPEN_046(){ouvrirOngletDepuisMenu_("NAV_OPEN_046");}
function NAV_OPEN_047(){ouvrirOngletDepuisMenu_("NAV_OPEN_047");}
function NAV_OPEN_048(){ouvrirOngletDepuisMenu_("NAV_OPEN_048");}
function NAV_OPEN_049(){ouvrirOngletDepuisMenu_("NAV_OPEN_049");}
function NAV_OPEN_050(){ouvrirOngletDepuisMenu_("NAV_OPEN_050");}
function NAV_OPEN_051(){ouvrirOngletDepuisMenu_("NAV_OPEN_051");}
function NAV_OPEN_052(){ouvrirOngletDepuisMenu_("NAV_OPEN_052");}
function NAV_OPEN_053(){ouvrirOngletDepuisMenu_("NAV_OPEN_053");}
function NAV_OPEN_054(){ouvrirOngletDepuisMenu_("NAV_OPEN_054");}
function NAV_OPEN_055(){ouvrirOngletDepuisMenu_("NAV_OPEN_055");}
function NAV_OPEN_056(){ouvrirOngletDepuisMenu_("NAV_OPEN_056");}
function NAV_OPEN_057(){ouvrirOngletDepuisMenu_("NAV_OPEN_057");}
function NAV_OPEN_058(){ouvrirOngletDepuisMenu_("NAV_OPEN_058");}
function NAV_OPEN_059(){ouvrirOngletDepuisMenu_("NAV_OPEN_059");}
function NAV_OPEN_060(){ouvrirOngletDepuisMenu_("NAV_OPEN_060");}


/************************************************************
 * PATCH LISIBILITÉ CAL - OPTION 5
 * Séparateurs visuels + couleurs harmonisées
 ************************************************************/


/* Fonction couleurFormationCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction creerLignesPlanning_ retirée : version fusionnée en fin de fichier. */



/* Fonction couleurFamilleCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction couleurPeriodeCAL_ retirée : version fusionnée en fin de fichier. */



/* Fonction appliquerStyleFamillesCAL_ retirée : version fusionnée en fin de fichier. */

/************************************************************
 * VERSION FUSIONNÉE — CAL / ALT / SOMMAIRE
 * À conserver comme version unique des fonctions ci-dessous.
 ************************************************************/

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("🏠 Accueil")
    .addItem("Afficher le sommaire", "NAV_Accueil")
    .addItem("Mettre à jour le sommaire", "mettreAJourSommairePlanning")
    .addToUi();

  try {
    construireMenuNavigationPlanning_();
  } catch (e) {
    Logger.log("Navigation planning non construite : " + e);
  }

  ui.createMenu("⚙️ Outils planning")
    .addItem("1. Créer structure Grist", "creerStructureGrist")
    .addItem("2. Ajouter années exemples", "ajouterAnneesExemples")
    .addItem("3. Ajouter vacances prévisionnelles", "ajouterVacancesPrevisionnelles")
    .addItem("4. Générer calendrier Grist", "genererCalendrierGrist")
    .addSeparator()
    .addItem("5. Générer feuilles Google Sheets", "genererFeuilleCalendrier")
    .addItem("6. Actualiser périodes Grist sans effacer les saisies", "actualiserPlanningPeriodesSeulement")
    .addItem("7. Exporter PDF A3 - 3 pages", "exporterPDF_A3")
    .addSeparator()
    .addItem("8. Créer vue HTML avec zoom", "creerVueHTMLPlanning")
    .addSeparator()
    .addItem("9. Générer calendriers par formation", "genererCalendriersFormationDepuisGantt")
    .addItem("10. Générer / régénérer formations cochées", "genererCalendriersCochesSommaire")
    .addItem("11. Mettre à jour le sommaire", "mettreAJourSommairePlanning")
    .addItem("12. Supprimer les onglets cochés", "supprimerOngletsCochesSommaire")
    .addItem("13. Supprimer l’onglet actif", "supprimerOngletActif")
    .addSeparator()
    .addItem("14. Générer calendriers détaillés demi-heure", "genererCalendriersDemiHeureDepuisGantt")
    .addItem("15. Recalculer synthèses profs ALT détail", "recalculerSynthesesProfsALTDetail")
    .addItem("16. Recalculer synthèse profs CAP/CPA actif", "recalculerSyntheseProfsCAPActive")
    .addItem("17. Réparer présentation CAP/CPA actif", "reparerPresentationCAPCPAActive")
    .addItem("18. Diagnostiquer périodes ALT actif", "diagnostiquerPeriodesALTActif")
    .addItem("19. Recalculer totaux ALT actif", "recalculerTotauxALTActif")
    .addItem("20. Créer périodes Grist depuis sélection ALT", "creerPeriodesGristDepuisSelectionALT")
    .addItem("20 bis. Créer périodes Grist depuis sélection CAL hebdo", "creerPeriodesGristDepuisSelectionCALHebdo")
    .addItem("21. Réparer bordures ALT actif", "reparerBorduresALTActif")
    .addSeparator()
    .addItem("22. Régénérer seulement CAL hebdo", "regenererCALHebdo")
    .addItem("23. Régénérer seulement CAL compact", "regenererCALCompact")
    .addItem("24. Régénérer seulement CAL P1", "regenererCALP1")
    .addItem("25. Régénérer seulement CAL P2", "regenererCALP2")
    .addSeparator()
    .addItem("26. Créer calendriers scolaires manquants", "EDT_CreerCalendriersScolairesManquants")
    .addItem("27. Régénérer calendrier scolaire année choisie", "EDT_RegenererCalendrierScolaireAnneeChoisie")
    .addSeparator()
    .addItem("28. Créer / régénérer un seul ALT", "creerOuRegenererUnSeulALT")
    .addItem("29. Créer structure EDT groupes composés", "EDT_CreerStructureGroupesComposes")
    .addToUi();
}

function getPlanningPeriodesDepuisGrist_(ANNEE) {
  const data = grist_("GET", "/tables/Planning_Periodes/records");

  return (data.records || [])
    .map(r => r.fields || {})
    .filter(r => {
      const anneeOk = String(r.Annee_scolaire || "").trim() === ANNEE.CODE;
      const actifOk = isTruthy_(r.Actif);
      const aDates = !!(r.Date_debut && r.Date_fin);
      const aLigne = Number(r.Ligne_sheet || 0) > 0;

      // Important : on garde aussi les lignes de structure sans date.
      // Elles servent à afficher CAP, BTS1, BTS2, Bachelor, etc. dans les CAL
      // et à proposer la création d'onglets ALT dans le sommaire.
      return anneeOk && actifOk && (aDates || aLigne);
    })
    .sort((a, b) => {
      const la = Number(a.Ligne_sheet || 0);
      const lb = Number(b.Ligne_sheet || 0);
      if (la && lb && la !== lb) return la - lb;
      if (la && !lb) return -1;
      if (!la && lb) return 1;

      const fa = String(a.Formation || "");
      const fb = String(b.Formation || "");
      if (fa !== fb) return fa.localeCompare(fb);

      const na = String(a.Niveau || "");
      const nb = String(b.Niveau || "");
      if (na !== nb) return na.localeCompare(nb);

      const da = String(a.Date_debut || "");
      const db = String(b.Date_debut || "");
      return da.localeCompare(db);
    });
}

function creerLignesPlanning_(periodes, firstRow) {
  const lignes = {};

  (periodes || []).forEach(p => {
    const famille = String(p.Formation || "").trim(); // CAP, 1 BAC PRO, T BAC PRO...
    const classe = String(p.Niveau || "").trim();     // CPA, MVA, CIEL...

    const ligneSheet = Number(p.Ligne_sheet || 0);
    if (!famille || !classe || !ligneSheet) return;

    const key = keyLigneCAL_(famille, classe);

    if (!lignes[key]) {
      lignes[key] = {
        row: ligneSheet,
        niveau: famille,
        formation: classe,
        groupe: String(p.Groupe || "").trim(),
        couleur: couleurFamilleCAL_(famille),
        periodes: []
      };
    }

    if (p.Date_debut && p.Date_fin) {
      lignes[key].periodes.push(p);
    }
  });

  return lignes;
}

function couleurFormationCAL_(formation) {
  return couleurFamilleCAL_(formation);
}

function couleurFamilleCAL_(niveau) {
  const n = normaliserCleALT_(niveau || "");

  if (n.includes("2 BAC PRO") || n.includes("2NDE")) return "#4A86E8";
  if (n.includes("1 BAC PRO") || n.includes("PREMIERE")) return "#00B050";
  if (n.includes("T BAC PRO") || n.includes("TERMINALE")) return "#FF6D00";

  if (n.includes("1BTS") || n.includes("1BTS CPI-CPRP")) return "#E040FB";
  if (n.includes("2BTS") || n.includes("2BTS CPI-CPRP")) return "#AB47BC";

  if (n.includes("CAP")) return "#FFD54F";
  if (n.includes("DUCRETET")) return "#00ACC1";
  if (n.includes("BACHELOR")) return "#7E57C2";

  return "#D9EAF7";
}


function couleurPeriodeCAL_(type, couleurOriginale, ligneInfo) {
  const t = normaliserCleALT_(type || "");


  if (t.includes("PFMP 1 CAP")) return normalizeHexColor_(couleurOriginale) || "#FFD54F";
if (t.includes("PFMP T CAP")) return normalizeHexColor_(couleurOriginale) || "#FFD54F";
if (t.includes("PFMP TCAP")) return normalizeHexColor_(couleurOriginale) || "#FFD54F";
  if (t.includes("PFMP 2")) return "#4A86E8";
  if (t.includes("PFMP 1")) return "#00B050";
  if (t.includes("PFMP TBAC")) return "#FF6D00";
if (t.includes("STAGE")) {
  if (ligneInfo && ligneInfo.couleur) return ligneInfo.couleur;
  return normalizeHexColor_(couleurOriginale) || "#E040FB";
}

  if (
    t.includes("PIF") ||
    t.includes("P.DIF") ||
    t.includes("P DIF") ||
    t.includes("PDIF") ||
    t.includes("PARCOURS") ||
    t.includes("PROJET")
  ) return "#E53935";

  // IMPORTANT CAL HEBDO : ENT. reprend la couleur de la famille/lignée,
  // et non plus le vert générique issu de Grist.
  if (t.includes("ENT") || t.includes("ENTREPRISE")) {
    if (ligneInfo && typeof ligneInfo === "object" && ligneInfo.couleur) {
      return ligneInfo.couleur;
    }
    return "#92D050";
  }

  if (t.includes("BTS")) return "#BA68C8";
  if (t.includes("MINI")) return "#29B6F6";

  return normalizeHexColor_(couleurOriginale) || "#90CAF9";
}



function appliquerStyleFamillesCAL_(sh, lignes, lastCol) {
  const items = Object.keys(lignes || {})
    .map(k => lignes[k])
    .sort((a, b) => a.row - b.row);

  if (!items.length) return;

  items.forEach((info, idx) => {
    const row = Number(info.row || 0);
    if (!row) return;

    const bg = couleurFamilleCAL_(info.niveau);
    const fg = getTextColorForBackground_(bg);

    sh.getRange(row, 1)
      .clearContent()
      .setBackground(bg)
      .setFontColor(fg);

    sh.getRange(row, 2)
      .setValue(info.formation)
      .setBackground(bg)
      .setFontColor(fg)
      .setFontWeight("bold")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false);

    const prev = items[idx - 1];
    const nouveauNiveau =
      !prev || normaliserCleALT_(prev.niveau) !== normaliserCleALT_(info.niveau);

    if (nouveauNiveau) {
      sh.getRange(row, 1, 1, lastCol)
        .setBorder(
          true, null, null, null,
          null, null,
          "#000000",
          SpreadsheetApp.BorderStyle.SOLID_THICK
        );
      sh.setRowHeight(row, 24);
    }
  });
}


function fusionnerNiveauxCAL_(sh, lignes, lastCol) {
  const items = Object.keys(lignes || {})
    .map(k => lignes[k])
    .sort((a, b) => a.row - b.row);

  if (!items.length) return;

  let startRow = items[0].row;
  let niveauCourant = normaliserCleALT_(items[0].niveau);
  let libelleCourant = items[0].niveau;

  for (let i = 1; i <= items.length; i++) {
    const info = items[i];
    const niveauSuivant = info ? normaliserCleALT_(info.niveau) : "__END__";

    if (niveauSuivant !== niveauCourant) {
      const endRow = items[i - 1].row;
      const height = endRow - startRow + 1;
      const bg = couleurFamilleCAL_(libelleCourant);
      const fg = getTextColorForBackground_(bg);

      const range = sh.getRange(startRow, 1, height, 1);
      breakApartSafe_(range);

      if (height > 1) {
        try { range.merge(); } catch (e) {}
      }

      range
        .setValue(libelleCourant)
        .setBackground(bg)
        .setFontColor(fg)
        .setFontWeight("bold")
        .setFontSize(12)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(false);

      if (info) {
        startRow = info.row;
        niveauCourant = niveauSuivant;
        libelleCourant = info.niveau;
      }
    }
  }
}


function estTypeVisibleCAL_(type) {
  const t = normaliserCleALT_(type || "");

  return (
    t.includes("PFMP") ||
    t.includes("PIF") ||
    t.includes("P.DIF") ||
    t.includes("P DIF") ||
    t.includes("PDIF") ||
    t.includes("PARCOURS") ||
    t.includes("PROJET") ||
    t === "ENT" ||
    t === "ENT." ||
    t.includes("ENTREPRISE") ||
    t.includes("MIXITE") ||
    t.includes("BTS_STAGE") ||
    t.includes("BTS STAGE") ||
    t.includes("STAGE BTS") ||
    t.includes("MINI_STAGE") ||
    t.includes("MINI STAGE") ||
    t.includes("MINI-STAGE")
  );
}



function appliquerPeriodesPlanningSurSegments_(sh, periodes, segments, lignes, startCol) {
  const blocs = {};

  (periodes || [])
    .filter(p => p.Date_debut && p.Date_fin)
    .filter(p => estTypeVisibleCAL_(p.Type))
    .forEach(p => {
      const formation = String(p.Formation || "").trim();
      const niveau = String(p.Niveau || "").trim();
      const key = normaliserCleALT_(formation) + "|" + normaliserCleALT_(niveau);

      const ligne = lignes[key] ? lignes[key].row : Number(p.Ligne_sheet || 0);
      if (!ligne || ligne <= 0) return;

      const debut = parseDateGrist_(p.Date_debut);
      const fin = parseDateGrist_(p.Date_fin);
      if (!debut || !fin) return;

      const type = String(p.Type || "").trim();
      const couleur = normalizeHexColor_(p.Couleur) || "#92D050";
      const blocKey = ligne + "|" + normaliserCleALT_(type) + "|" + couleur + "|" + toIso_(debut) + "|" + toIso_(fin);

      if (!blocs[blocKey]) {
        blocs[blocKey] = {
          ligne,
          type,
          couleur,
          cols: {}
        };
      }

      segments.forEach((seg, idx) => {
        const segStart = normalize_(seg.start);
        const segEnd = normalize_(seg.end || seg.start);

        const overlap =
          segStart.getTime() <= fin.getTime() &&
          segEnd.getTime() >= debut.getTime();

        if (overlap) {
          const col = startCol + idx;
          blocs[blocKey].cols[col] = true;
        }
      });
    });

  let indexBloc = 0;

  Object.keys(blocs).forEach(k => {
    const b = blocs[k];
    const cols = Object.keys(b.cols).map(Number).sort((a, c) => a - c);
    if (!cols.length) return;

    let first = cols[0];
    let last = cols[0];

    for (let i = 1; i <= cols.length; i++) {
      const col = cols[i];

      if (col === last + 1) {
        last = col;
      } else {
        dessinerBlocJournalierCAL_(sh, b.ligne, first, last, b.type, b.couleur, indexBloc++);
        first = col;
        last = col;
      }
    }
  });
}

function dessinerBlocJournalierCAL_(sh, ligne, firstCol, lastCol, type, couleur, indexBloc) {
  if (!firstCol || !lastCol || lastCol < firstCol) return;

  const width = lastCol - firstCol + 1;
  const bg = couleurPeriodeCAL_(type, couleur, indexBloc);
  const font = getTextColorForBackground_(bg);
  const label = String(type || "").trim();

  const range = sh.getRange(ligne, firstCol, 1, width);
  breakApartSafe_(range);

  range
    .clearContent()
    .setBackground(bg)
    .setFontColor(font)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  if (width >= 3) {
    try {
      range.merge();
      range.setValue(label);
    } catch (e) {
      ecrireLibelleAuMilieuBlocCAL_(sh, ligne, firstCol, lastCol, label);
    }
  } else {
    ecrireLibelleAuMilieuBlocCAL_(sh, ligne, firstCol, lastCol, label);
  }
}

function ecrireLibelleAuMilieuBlocCAL_(sh, ligne, firstCol, lastCol, label) {
  const middleCol = firstCol + Math.floor((lastCol - firstCol) / 2);

  sh.getRange(ligne, firstCol, 1, lastCol - firstCol + 1).clearContent();

  sh.getRange(ligne, middleCol)
    .setValue(label)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontWeight("bold");
}

function appliquerPeriodesPlanningHebdoSurSemaines_(sh, periodes, semaines, lignes, startCol) {
  const blocs = {};

  (periodes || [])
    .filter(p => p.Date_debut && p.Date_fin)
    .filter(p => estTypeVisibleCAL_(p.Type))
    .forEach(p => {
      const famille = String(p.Formation || "").trim();
      const classe = String(p.Niveau || "").trim();

      const key = keyLigneCAL_(famille, classe);
      const ligneInfo = lignes[key] || null;
      const ligne = ligneInfo ? ligneInfo.row : Number(p.Ligne_sheet || 0);

      if (!ligne || ligne <= 0) return;

      const debut = parseDateGrist_(p.Date_debut);
      const fin = parseDateGrist_(p.Date_fin);
      if (!debut || !fin) return;

      const type = String(p.Type || "").trim();
      const couleur = normalizeHexColor_(p.Couleur) || "#92D050";

      const blocKey =
        ligne + "|" +
        normaliserCleALT_(type) + "|" +
        couleur + "|" +
        toIso_(debut) + "|" +
        toIso_(fin);

      if (!blocs[blocKey]) {
        blocs[blocKey] = {
          ligne: ligne,
          ligneInfo: ligneInfo,
          type: type,
          couleur: couleur,
          cols: {}
        };
      }

      semaines.forEach((seg, idx) => {
        const overlap =
          normalize_(seg.start).getTime() <= fin.getTime() &&
          normalize_(seg.end).getTime() >= debut.getTime();

        if (overlap) {
          blocs[blocKey].cols[startCol + idx] = true;
        }
      });
    });

  Object.keys(blocs).forEach(k => {
    const b = blocs[k];
    const cols = Object.keys(b.cols).map(Number).sort((a, c) => a - c);
    if (!cols.length) return;

    let first = cols[0];
    let last = cols[0];

    for (let i = 1; i <= cols.length; i++) {
      const col = cols[i];

      if (col === last + 1) {
        last = col;
      } else {
        dessinerBlocHebdo_(sh, b.ligne, first, last, b.type, b.couleur, b.ligneInfo);
        first = col;
        last = col;
      }
    }
  });
}

function abregerTypeHebdo_(type, width) {
  const t = String(type || "").trim();
  const u = normaliserCleALT_(t);

  if (u.includes("P.dif.") || u.includes("P DIF") || u.includes("PDIF") || u.includes("PROJET")) return "P.dif.";
  if (u.includes("ENT") || u.includes("ENTREPRISE")) return "ENT.";
  if (u.includes("PFMP")) return width >= 2 ? t : "PF";
  if (u.includes("EXAM")) return "EXAM";
  if (u.includes("STAGE")) return "STAGE";

  return width >= 3 ? t : (t.length > 5 ? t.substring(0, 5) + "." : t);
}


function dessinerBlocHebdo_(sh, ligne, firstCol, lastCol, type, couleur, ligneInfo) {
  if (firstCol === null || lastCol === null || lastCol < firstCol) return;

  const width = lastCol - firstCol + 1;
  const bg = couleurPeriodeCAL_(type, couleur, ligneInfo);
  const color = getTextColorForBackground_(bg);
  const t = normaliserCleALT_(type || "");

  // Cas spécial : ENT / ENTREPRISE = une cellule par semaine, jamais fusionné
  if (t.includes("ENT") || t.includes("ENTREPRISE")) {
    for (let col = firstCol; col <= lastCol; col++) {
      const cell = sh.getRange(ligne, col, 1, 1);
      breakApartSafe_(cell);

      cell
        .setValue("ENT.")
        .setBackground(bg)
        .setFontColor(color)
        .setFontWeight("bold")
        .setFontSize(7)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(false);
    }
    return;
  }

  // Tous les autres blocs restent fusionnés comme avant
  const range = sh.getRange(ligne, firstCol, 1, width);
  breakApartSafe_(range);

  if (width > 1) {
    try { range.merge(); } catch(e) {}
  }

  range
    .setValue(abregerTypeHebdo_(type || "", width))
    .setBackground(bg)
    .setFontColor(color)
    .setFontWeight("bold")
    .setFontSize(width <= 1 ? 7 : 8)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(width > 1);
}


function genererFeuillePlanningHebdo_(ANNEE, options) {
  return withProgress_("Gantt hebdomadaire " + ANNEE.CODE, () => {
    const sheetName = getSheetName_(ANNEE) + options.suffix;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(sheetName);
    if (!sh) sh = ss.insertSheet(sheetName);

    ouvrirFeuilleEtProgress_(sh, sheetName, "Préparation feuille", 0, 0);
    logProgress_("Nettoyage feuille : " + sheetName);
    resetSheetComplet_(sh);

    const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
    const vacances = getVacancesDepuisGrist_(ANNEE);
    const plageAffichage = getPlageAffichagePlanning_(options.start, options.end, periodes);
    const start = plageAffichage.start;
    const end = plageAffichage.end;

    const semaines = construireSegmentsHebdomadaires_(start, end);
    const startCol = 3;
    const firstPlanningRow = 9;

    const lignes = creerLignesPlanning_(periodes, firstPlanningRow);
    const lignesList = Object.keys(lignes)
      .map(k => lignes[k])
      .sort((a, b) => a.row - b.row);

    const lastCol = startCol + semaines.length - 1;

    const lastRow = Math.max(
      firstPlanningRow + Math.max(lignesList.length, 1) - 1,
      getMaxRowPlanning_(lignes, firstPlanningRow),
      50
    );

    ensureSheetSize_(sh, lastRow, lastCol);

    const generated = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");

    sh.getRange(1, startCol, 1, lastCol - startCol + 1)
      .merge()
      .setValue((options.titre || "PLANNING HEBDOMADAIRE") + "   ·   généré le " + generated)
      .setBackground("#1B396A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setFontSize(18)
      .setHorizontalAlignment("right")
      .setVerticalAlignment("middle");

    sh.getRange(2, startCol, 1, lastCol - startCol + 1)
      .merge()
      .setValue("Année scolaire " + ANNEE.CODE + " - Zone " + ANNEE.ZONE)
      .setFontWeight("bold")
      .setFontSize(18)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sh.getRange(3, 2).setValue("Année").setFontWeight("bold").setHorizontalAlignment("right");
    sh.getRange(4, 2).setValue("Semaine").setFontWeight("bold").setHorizontalAlignment("right");
    sh.getRange(5, 2).setValue("Mois").setFontWeight("bold").setHorizontalAlignment("right");
    sh.getRange(6, 2).setValue("Du").setFontWeight("bold").setHorizontalAlignment("right");
    sh.getRange(7, 2).setValue("Au").setFontWeight("bold").setHorizontalAlignment("right");

    const rowAnnees = [];
    const rowSem = [];
    const rowMois = [];
    const rowDebut = [];
    const rowFin = [];

    semaines.forEach(seg => {
      rowAnnees.push(seg.start.getFullYear());
      rowSem.push(getWeekISO_(seg.start));
      rowMois.push(getMoisNom_(seg.start));
      rowDebut.push(seg.start.getDate());
      rowFin.push(seg.end.getDate());
    });

    sh.getRange(3, startCol, 1, semaines.length).setValues([rowAnnees]);
    sh.getRange(4, startCol, 1, semaines.length).setValues([rowSem]);
    sh.getRange(5, startCol, 1, semaines.length).setValues([rowMois]);
    sh.getRange(6, startCol, 1, semaines.length).setValues([rowDebut]).setNumberFormat("0");
    sh.getRange(7, startCol, 1, semaines.length).setValues([rowFin]).setNumberFormat("0");

    lignesList.forEach(info => {
      const bg = couleurFamilleCAL_(info.niveau);
      const fg = getTextColorForBackground_(bg);

      sh.getRange(info.row, 1)
        .clearContent()
        .setBackground(bg)
        .setFontColor(fg);

      sh.getRange(info.row, 2)
        .setValue(info.formation)
        .setBackground(bg)
        .setFontColor(fg)
        .setFontWeight("bold")
        .setFontSize(13)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(false);
    });

    semaines.forEach((seg, idx) => {
      const col = startCol + idx;
      let bg = "#FFFFFF";
      let color = "#000000";

      if (semaineEstNoireVacances_(seg, vacances)) {
        bg = "#222222";
        color = "#FFFFFF";
      }

      sh.getRange(3, col, Math.max(7, lastRow), 1)
        .setBackground(bg)
        .setFontColor(color);
    });

    logProgress_("Application périodes hebdo : " + sheetName);
    appliquerPeriodesPlanningHebdoSurSemaines_(sh, periodes, semaines, lignes, startCol);

    fusionnerIdentiquesSurLigne_(sh, 3, startCol, lastCol);
    fusionnerIdentiquesSurLigne_(sh, 5, startCol, lastCol);
    nettoyerFondLignesEnteteHebdo_(sh, startCol, lastCol);

    sh.setFrozenRows(7);
    sh.setFrozenColumns(2);

    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(2, 95);
    sh.setColumnWidths(startCol, semaines.length, 39);

    sh.setRowHeights(1, lastRow, 28);
    sh.setRowHeight(1, 44);
    sh.setRowHeight(2, 38);
    sh.setRowHeight(3, 22);
    sh.setRowHeight(4, 22);
    sh.setRowHeight(5, 22);
    sh.setRowHeight(6, 22);
    sh.setRowHeight(7, 22);

    sh.getRange(1, 1, lastRow, lastCol)
      .setFontFamily("Arial")
      .setFontSize(9)
      .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

  sh.getRange(1, startCol, 1, lastCol - startCol + 1)
  .setFontSize(16)
  .setFontWeight("bold");

sh.getRange(2, startCol, 1, lastCol - startCol + 1)
  .setFontSize(18)
  .setFontWeight("bold");

    sh.getRange(6, startCol, 2, semaines.length).setNumberFormat("0");

    appliquerStyleFamillesCAL_(sh, lignes, lastCol);
    fusionnerNiveauxCAL_(sh, lignes);
    ajouterLogoLyceeCAL_(sh);

    ajusterDimensionsFeuille_(sh, 50, lastCol);
    finaliserHabillageCALHebdo_(sh, lastCol);

    SpreadsheetApp.flush();
    mettreAJourSommairePlanning();
  });
}

function listerOngletsPlanningPourNavigation_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  return ss.getSheets()
    .map(sh => {
      const nom = sh.getName();
      const info = analyserNomOngletPlanning_(nom);
      if (!info) return null;
      info.nom = nom;
      info.gid = sh.getSheetId();
      info.existe = true;
      return info;
    })
    .filter(Boolean);
}

function listerItemsSommairePlanning_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const map = {};

  listerOngletsPlanningPourNavigation_().forEach(item => {
    map[item.nom] = item;
  });

  let ANNEE = null;
  try {
    ANNEE = getAnneeActive_();
  } catch (e) {
    return Object.keys(map).map(k => map[k]);
  }

  let periodes = [];
  try {
    periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  } catch (e) {
    Logger.log("listerItemsSommairePlanning_ : périodes non lues : " + e);
  }

  const lignes = creerLignesPlanning_(periodes, 0);
  Object.keys(lignes).forEach(k => {
    const info = lignes[k];
    const nom = sanitizeSheetName_("ALT_" + ANNEE.CODE + "_" + info.formation + "_" + info.niveau);
    if (!map[nom]) {
      map[nom] = {
        annee: ANNEE.CODE,
        libelle: nettoyerLibelleNavigation_(info.formation + "_" + info.niveau),
        type: "Carnet regroupé",
        prefixe: "📘",
        ordreType: 1,
        nom,
        gid: "",
        existe: false,
        formation: info.formation,
        niveau: info.niveau
      };
    }
  });

  const calDefs = [
    { suffix: "_hebdo", label: "CAL hebdo" },
    { suffix: "_compact", label: "CAL compact" },
    { suffix: "_P1_Sept_Noel", label: "CAL P1 Sept-Noël" },
    { suffix: "_P2_Jan_Aout", label: "CAL P2 Jan-Août" }
  ];

  calDefs.forEach(c => {
    const nom = getSheetName_(ANNEE) + c.suffix;
    if (!map[nom]) {
      map[nom] = {
        annee: ANNEE.CODE,
        libelle: c.label,
        type: "Calendrier général",
        prefixe: "📅",
        ordreType: 3,
        nom,
        gid: "",
        existe: false
      };
    }
  });

  return Object.keys(map).map(k => map[k]);
}

function mettreAJourSommairePlanning() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sommaireName = "SOMMAIRE_PLANNING";
  let sh = ss.getSheetByName(sommaireName);
  if (!sh) sh = ss.insertSheet(sommaireName, 0);

  resetSheetComplet_(sh);
  ensureSheetSize_(sh, 120, 9);

  sh.getRange(1, 1, 1, 9).merge()
    .setValue("SOMMAIRE DES PLANNINGS PAR ANNÉE SCOLAIRE")
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(14)
    .setHorizontalAlignment("center");

  const generated = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm");

  sh.getRange(2, 1, 1, 9).merge()
    .setValue("Mis à jour le " + generated)
    .setBackground("#EAF2F8")
    .setFontStyle("italic")
    .setHorizontalAlignment("center");

  sh.getRange(3, 1, 1, 9)
    .setValues([[
      "Année scolaire",
      "Type",
      "Carnet / planning",
      "Ouvrir",
      "Régénérer",
      "Supprimer",
      "Dernière mise à jour",
      "Nom exact onglet",
      "État"
    ]])
    .setBackground("#D9EAF7")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  const items = listerItemsSommairePlanning_()
    .sort((a, b) => {
      if (a.annee !== b.annee) return a.annee.localeCompare(b.annee);
      if (a.ordreType !== b.ordreType) return a.ordreType - b.ordreType;
      return a.libelle.localeCompare(b.libelle);
    });

  const rows = [];
  let currentYear = "";

  items.forEach(item => {
    if (item.annee !== currentYear) {
      currentYear = item.annee;
      rows.push({
        header: true,
        values: [currentYear, "", "", "", "", "", "", "", ""]
      });
    }

    rows.push({
      header: false,
      item,
      values: [
        item.annee,
        item.type,
        item.prefixe + " " + item.libelle,
        item.existe ? "Ouvrir" : "",
        false,
        false,
        generated,
        item.nom,
        item.existe ? "OK" : "À créer"
      ]
    });
  });

  if (rows.length) {
    const values = rows.map(r => r.values);
    sh.getRange(4, 1, values.length, 9).setValues(values);

    rows.forEach((r, i) => {
      const row = 4 + i;

      if (r.header) {
        sh.getRange(row, 1, 1, 9)
          .merge()
          .setValue("📅 Année scolaire " + r.values[0])
          .setBackground("#404040")
          .setFontColor("#FFFFFF")
          .setFontWeight("bold")
          .setFontSize(12)
          .setHorizontalAlignment("left");
        return;
      }

      const item = r.item;

      if (item.existe && item.gid) {
        sh.getRange(row, 4).setRichTextValue(
          SpreadsheetApp.newRichTextValue()
            .setText("Ouvrir")
            .setLinkUrl(ss.getUrl() + "#gid=" + item.gid)
            .build()
        );
      } else {
        sh.getRange(row, 4).setValue("");
      }
    });

    for (let r = 4; r < 4 + rows.length; r++) {
      const isHeader = String(sh.getRange(r, 1).getValue()).startsWith("📅");
      if (!isHeader) {
        sh.getRange(r, 5, 1, 2).insertCheckboxes();
      }
    }
  } else {
    sh.getRange(4, 1, 1, 9).merge()
      .setValue("Aucun onglet ALT, ALT_DETAIL ou CAL trouvé.")
      .setFontStyle("italic")
      .setHorizontalAlignment("center");
  }

  sh.setColumnWidth(1, 130);
  sh.setColumnWidth(2, 190);
  sh.setColumnWidth(3, 340);
  sh.setColumnWidth(4, 90);
  sh.setColumnWidth(5, 100);
  sh.setColumnWidth(6, 100);
  sh.setColumnWidth(7, 150);
  sh.setColumnWidth(8, 380);
  sh.setColumnWidth(9, 130);

  sh.setFrozenRows(3);

  const lastUsefulRow = Math.max(4, rows.length + 3);

  sh.getRange(1, 1, lastUsefulRow, 9)
    .setFontFamily("Arial")
    .setFontSize(10)
    .setBorder(true, true, true, true, true, true, "#999999", SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment("middle");

  sh.getRange(4, 1, Math.max(1, lastUsefulRow - 3), 9)
    .setWrap(true);

  SpreadsheetApp.flush();
  ajusterDimensionsFeuille_(sh, lastUsefulRow, 9);
}

function trouverInfoDepuisNomOngletSommaire_(nomOnglet, lignesList, ANNEE) {
  // 1. Cas classique : ALT formation / niveau simple
  const direct = (lignesList || []).find(info => {
    const alt = sanitizeSheetName_("ALT_" + ANNEE.CODE + "_" + info.formation + "_" + info.niveau);
    const det = sanitizeSheetName_("ALT_DETAIL_" + ANNEE.CODE + "_" + info.formation + "_" + info.niveau);
    return nomOnglet === alt || nomOnglet === det;
  });

  if (direct) return direct;

  // 2. Cas robuste : onglet déjà existant, notamment Mixité / regroupements
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(nomOnglet);

  if (sh && nomOnglet.startsWith("ALT_")) {
    const formation = lireValeurApresLibelleALT_(sh, 3, "Formation");
    const classe = lireValeurApresLibelleALT_(sh, 4, "Classe");

    if (formation && classe) {
      const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
      const trouvees = trouverPeriodesPourFeuilleALT_(sh, periodes, ANNEE);

      return {
        formation: formation,
        niveau: classe,
        groupe: classe,
        couleur: couleurDominantePeriodesALT_(trouvees),
        row: 0,
        periodes: trouvees
      };
    }
  }

  return null;
}
function genererCalendriersCochesSommaire() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sommaire = ss.getSheetByName("SOMMAIRE_PLANNING");
  if (!sommaire) throw new Error("Sommaire introuvable.");

  const lastRow = sommaire.getLastRow();
  if (lastRow < 4) {
    ss.toast("Sommaire vide.", "Planning scolaire", 5);
    return;
  }

  const values = sommaire.getRange(4, 1, lastRow - 3, 9).getValues();
  const aGenerer = values
    .map((r, i) => ({
      row: i + 4,
      annee: String(r[0] || "").trim(),
      type: String(r[1] || "").trim(),
      libelle: String(r[2] || "").trim(),
      checked: r[4] === true,
      onglet: String(r[7] || "").trim()
    }))
    .filter(x => x.checked && x.onglet && !x.annee.startsWith("📅"));

  if (!aGenerer.length) {
    ss.toast("Aucun planning coché en colonne E.", "Planning scolaire", 5);
    return;
  }

  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const vacances = getVacancesDepuisGrist_(ANNEE);

  const lignesBrutes = creerLignesPlanning_(periodes, 0);
  const lignesIndividuelles = Object.keys(lignesBrutes).map(k => {
    const info = lignesBrutes[k];
    info.periodes = (periodes || []).filter(p =>
      normaliserCleALT_(p.Formation) === normaliserCleALT_(info.formation) &&
      normaliserCleALT_(p.Niveau) === normaliserCleALT_(info.niveau)
    );
    return info;
  });

  let ok = 0;
  const erreurs = [];

  aGenerer.forEach((item, idx) => {
    try {
      ouvrirFeuilleEtProgress_(sommaire, "Préparation : " + item.onglet, "Génération cochée", idx + 1, aGenerer.length);

      if (item.onglet.startsWith("ALT_DETAIL_")) {
        const info = trouverInfoDepuisNomOngletSommaire_(item.onglet, lignesIndividuelles, ANNEE);
        if (!info) throw new Error("Impossible de retrouver la formation/niveau individuel depuis : " + item.onglet);
        creerCalendrierFormationDemiHeure_(ANNEE, info, periodes, vacances);

      } else if (item.onglet.startsWith("ALT_")) {
        const info = trouverInfoDepuisNomOngletSommaire_(item.onglet, lignesIndividuelles, ANNEE);
        if (!info) throw new Error("Impossible de retrouver la formation/niveau depuis : " + item.onglet);
        creerCalendrierFormation_(ANNEE, info, periodes, vacances);

      } else if (item.onglet.startsWith("CAL_")) {
        if (item.onglet.indexOf("_hebdo") !== -1) regenererCALHebdo();
        else if (item.onglet.indexOf("_compact") !== -1) regenererCALCompact();
        else if (item.onglet.indexOf("_P1_") !== -1) regenererCALP1();
        else if (item.onglet.indexOf("_P2_") !== -1) regenererCALP2();
        else genererFeuilleCalendrier();
      }

      sommaire.getRange(item.row, 5).setValue(false);
      sommaire.getRange(item.row, 9).setValue("OK " + Utilities.formatDate(new Date(), "Europe/Paris", "HH:mm"));
      ok++;

      const generatedSheet = ss.getSheetByName(item.onglet);
      if (generatedSheet) ouvrirFeuilleEtProgress_(generatedSheet, "Terminé : " + item.onglet, "Génération cochée", idx + 1, aGenerer.length);
      SpreadsheetApp.flush();

    } catch (err) {
      const detail = item.onglet + " : " + err.message + "\nSTACK:\n" + (err.stack || "Pas de stack disponible");
      Logger.log(detail);
      erreurs.push(detail);
      sommaire.getRange(item.row, 9).setValue("ERREUR : voir journal");
    }
  });

  mettreAJourSommairePlanning();

  if (erreurs.length) {
    throw new Error(ok + " planning(s) généré(s), " + erreurs.length + " erreur(s) :\n" + erreurs.join("\n"));
  }

  ss.toast(ok + " planning(s) coché(s) généré(s).", "Planning scolaire", 6);
}

function creerOuRegenererUnSeulALT() {
  const ui = SpreadsheetApp.getUi();
  const rep = ui.prompt(
    "Créer / régénérer un seul ALT",
    "Saisis Formation|Niveau, par exemple : 1BTS|MV, 2BTS|CIEL, CAP|CP, Ducretet|TSEC",
    ui.ButtonSet.OK_CANCEL
  );

  if (rep.getSelectedButton() !== ui.Button.OK) return;

  const saisie = String(rep.getResponseText() || "").trim();
  const parts = saisie.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) {
    throw new Error("Format attendu : Formation|Niveau. Exemple : 1BTS|MV");
  }

  const formation = parts[0];
  const niveau = parts[1];

  const ANNEE = getAnneeActive_();
  const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);
  const vacances = getVacancesDepuisGrist_(ANNEE);

  const lignes = creerLignesPlanning_(periodes, 0);
  const key = normaliserCleALT_(formation) + "|" + normaliserCleALT_(niveau);
  const info = lignes[key];

  if (!info) {
    throw new Error("Aucune ligne active trouvée dans Planning_Periodes pour : " + formation + " / " + niveau);
  }

  info.periodes = (periodes || []).filter(p =>
    normaliserCleALT_(p.Formation) === normaliserCleALT_(formation) &&
    normaliserCleALT_(p.Niveau) === normaliserCleALT_(niveau)
  );

  creerCalendrierFormation_(ANNEE, info, periodes, vacances);
  mettreAJourSommairePlanning();

  SpreadsheetApp.getActive().toast("ALT créé/régénéré : " + formation + " / " + niveau, "Planning scolaire", 6);
}

function fusionnerNiveauxCAL_(sh, lignes, lastCol) {
  const items = Object.keys(lignes || {})
    .map(k => lignes[k])
    .sort((a, b) => a.row - b.row);

  if (!items.length) return;

  let startRow = items[0].row;
  let niveauCourant = normaliserCleALT_(items[0].niveau);
  let libelleCourant = items[0].niveau;

  for (let i = 1; i <= items.length; i++) {
    const info = items[i];
    const niveauSuivant = info ? normaliserCleALT_(info.niveau) : "__END__";

    if (niveauSuivant !== niveauCourant) {
      const endRow = items[i - 1].row;
      const height = endRow - startRow + 1;
      const bg = couleurFamilleCAL_(libelleCourant);
      const fg = getTextColorForBackground_(bg);

      const range = sh.getRange(startRow, 1, height, 1);
      breakApartSafe_(range);

      if (height > 1) {
        try { range.merge(); } catch (e) {}
      }

      range
        .setValue(libelleCourant)
        .setBackground(bg)
        .setFontColor(fg)
        .setFontWeight("bold")
        .setFontSize(12)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setWrap(false);

      if (info) {
        startRow = info.row;
        niveauCourant = niveauSuivant;
        libelleCourant = info.niveau;
      }
    }
  }
}


const CAL_LOGO_LYCEE_B64 = "";

function ajouterLogoLyceeCALDepuisB64_(sh) {
  if (!CAL_LOGO_LYCEE_B64) return;

  try {
    const b64 = CAL_LOGO_LYCEE_B64.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Utilities.base64Decode(b64);
    const blob = Utilities.newBlob(bytes, "image/png", "logo_lycee.png");

    const img = sh.insertImage(blob, 1, 1);
    img.setAnchorCell(sh.getRange("A1"));
    img.setWidth(130);
    img.setHeight(55);

    sh.setRowHeight(1, 28);
    sh.setRowHeight(2, 26);
    sh.setRowHeight(3, 22);
    sh.setRowHeight(4, 22);
  } catch (e) {
    Logger.log("Logo lycée non inséré : " + e);
  }
}

function keyLigneCAL_(niveau, formation) {
  return normaliserCleALT_(niveau || "") + "|" + normaliserCleALT_(formation || "");
}

function finaliserHabillageCALHebdo_(sh, lastCol) {
  // Planning : hauteur raisonnable pour tenir sur une page
  sh.setRowHeights(8, 38, 28);

  // Colonne B : classes plus lisibles
  sh.getRange(8, 2, 38, 1)
    .setFontSize(13)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Nettoyage complet entre planning et BFE
  sh.getRange(46, 1, 2, lastCol)
    .breakApart()
    .clearContent()
    .clearFormat()
    .setBackground("#FFFFFF")
    .setBorder(false, false, false, false, false, false);

  // Bandeau BFE
  breakApartSafe_(sh.getRange(48, 3, 2, lastCol - 2));

  sh.getRange(48, 3, 2, lastCol - 2)
    .merge()
    .setValue("Bureau Formations Entreprises — BFE : 04 92 29 30 65")
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(18)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  sh.getRange(48, 1, 2, 2)
    .clearContent()
    .setBackground("#1B396A")
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  sh.setRowHeight(48, 32);
  sh.setRowHeight(49, 32);

  // Nettoyage sous le BFE : on cache carrément les lignes restantes
  const maxRows = sh.getMaxRows();
  if (maxRows > 49) {
    sh.getRange(50, 1, maxRows - 49, lastCol)
      .clearContent()
      .clearFormat()
      .setBackground("#FFFFFF")
      .setBorder(false, false, false, false, false, false);

    sh.hideRows(50, maxRows - 49);
  }
}



/************************************************************
 * CRÉER DES PÉRIODES GRIST DEPUIS UNE SÉLECTION CAL HEBDO
 ************************************************************/

function creerPeriodesGristDepuisSelectionCALHebdo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  try {
    if (!sh.getName().includes("_hebdo")) {
      ui.alert("Place-toi d'abord sur l'onglet CAL hebdo.");
      return;
    }

    const ANNEE = getAnneeActive_();
    const periodes = getPlanningPeriodesDepuisGrist_(ANNEE);

    const plage = getPlageAffichagePlanning_(ANNEE.START, ANNEE.END, periodes);
    const semaines = construireSegmentsHebdomadaires_(plage.start, plage.end);

    const startCol = 3; // colonne C
    const firstPlanningRow = 8;
    const lignes = creerLignesPlanning_(periodes, firstPlanningRow);

    const typeResp = ui.prompt(
      "Créer périodes depuis CAL hebdo",
      "Type de période ? Exemple : ENT., STAGE, PFMP 1ère, PFMP Tbac",
      ui.ButtonSet.OK_CANCEL
    );
    if (typeResp.getSelectedButton() !== ui.Button.OK) return;

    const type = String(typeResp.getResponseText() || "").trim();
    if (!type) {
      ui.alert("Type obligatoire.");
      return;
    }

    const couleurResp = ui.prompt(
      "Couleur",
      "Couleur HEX ? Laisser vide = couleur du type ou couleur de la ligne.",
      ui.ButtonSet.OK_CANCEL
    );
    if (couleurResp.getSelectedButton() !== ui.Button.OK) return;

    let couleur = String(couleurResp.getResponseText() || "").trim();

    const ranges = getSelectionsCALHebdo_();
    if (!ranges.length) {
      ui.alert("Aucune sélection détectée.");
      return;
    }

    const blocs = extraireBlocsDepuisSelectionCALHebdo_(ranges, lignes, semaines, startCol);

    if (!blocs.length) {
      ui.alert("Aucune cellule exploitable. Sélectionne des cellules du planning, à partir de la colonne C.");
      return;
    }

    const records = blocs.map(b => {
      const ligneInfo = b.ligneInfo;
      const couleurFinale =
        normalizeHexColor_(couleur) ||
        couleurDepuisTypePlanningSafe_(type) ||
        (ligneInfo && ligneInfo.couleur) ||
        "#92D050";

      return {
        fields: {
          Annee_scolaire: ANNEE.CODE,
          Formation: ligneInfo.niveau,
          Niveau: ligneInfo.formation,
          Groupe: ligneInfo.groupe || "",
          Date_debut: toIso_(b.start),
          Date_fin: toIso_(b.end),
          Type: type,
          Couleur: couleurFinale,
          Ligne_sheet: ligneInfo.row,
          Duree_jour: "",
          Commentaire: "Créé depuis CAL hebdo",
          Actif: true
        }
      };
    });

    grist_("POST", "/tables/Planning_Periodes/records", { records });

    // Affichage immédiat sur le CAL, sans attendre une régénération complète.
    blocs.forEach(b => {
      const ligneInfo = b.ligneInfo;
      const couleurFinale =
        normalizeHexColor_(couleur) ||
        couleurDepuisTypePlanningSafe_(type) ||
        ligneInfo.couleur ||
        "#92D050";

      dessinerBlocHebdo_(
        sh,
        ligneInfo.row,
        b.firstCol,
        b.lastCol,
        type,
        couleurFinale,
        ligneInfo
      );
    });

    ss.toast(records.length + " période(s) créée(s) dans Grist.", "CAL hebdo", 8);

  } catch (err) {
    ui.alert("Erreur création périodes CAL hebdo :\n" + err.message);
    throw err;
  }
}


function getSelectionsCALHebdo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = ss.getActiveRangeList();

  if (list) return list.getRanges();

  const r = ss.getActiveRange();
  return r ? [r] : [];
}


function extraireBlocsDepuisSelectionCALHebdo_(ranges, lignes, semaines, startCol) {
  const byRow = {};

  ranges.forEach(range => {
    const r1 = range.getRow();
    const r2 = r1 + range.getNumRows() - 1;
    const c1 = range.getColumn();
    const c2 = c1 + range.getNumColumns() - 1;

    for (let row = r1; row <= r2; row++) {
      const ligneInfo = trouverLigneInfoParRowCALHebdo_(lignes, row);
      if (!ligneInfo) continue;

      for (let col = c1; col <= c2; col++) {
        const indexSemaine = col - startCol;
        if (indexSemaine < 0 || indexSemaine >= semaines.length) continue;

        if (!byRow[row]) {
          byRow[row] = {
            ligneInfo,
            cols: {}
          };
        }

        byRow[row].cols[col] = true;
      }
    }
  });

  const blocs = [];

  Object.keys(byRow).forEach(rowKey => {
    const item = byRow[rowKey];
    const cols = Object.keys(item.cols).map(Number).sort((a, b) => a - b);
    if (!cols.length) return;

    let firstCol = cols[0];
    let lastCol = cols[0];

    for (let i = 1; i <= cols.length; i++) {
      const col = cols[i];

      if (col === lastCol + 1) {
        lastCol = col;
      } else {
        const firstIndex = firstCol - startCol;
        const lastIndex = lastCol - startCol;

        blocs.push({
          ligneInfo: item.ligneInfo,
          firstCol,
          lastCol,
          start: semaines[firstIndex].start,
          end: semaines[lastIndex].end
        });

        firstCol = col;
        lastCol = col;
      }
    }
  });

  return blocs;
}


function trouverLigneInfoParRowCALHebdo_(lignes, row) {
  const keys = Object.keys(lignes || {});
  for (let i = 0; i < keys.length; i++) {
    const info = lignes[keys[i]];
    if (Number(info.row) === Number(row)) return info;
  }
  return null;
}


function couleurDepuisTypePlanningSafe_(type) {
  try {
    if (typeof couleurDepuisTypePlanning_ === "function") {
      return couleurDepuisTypePlanning_(type);
    }
  } catch (e) {}

  try {
    const types = getTypesPlanningDepuisGrist_();
    const tNorm = normaliserCleALT_(type || "");

    const found = types.find(t =>
      normaliserCleALT_(t.Type || "") === tNorm ||
      normaliserCleALT_(t.Libelle || "") === tNorm
    );

    return found ? normalizeHexColor_(found.Couleur) : "";
  } catch (e) {
    return "";
  }
}
function finaliserHabillageCALHebdo_(sh, lastCol) {
  // Hauteur planning
  sh.setRowHeights(8, 38, 36);

  // Colonne B plus lisible
  sh.getRange(8, 2, 38, 1)
    .setFontSize(13)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Ligne Bachelor / fin du tableau : bordure forte
  sh.getRange(45, 1, 1, lastCol)
    .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);

  // Zone blanche entre planning et BFE
  sh.getRange(46, 1, 2, lastCol)
    .breakApart()
    .clearContent()
    .clearFormat()
    .setBackground("#FFFFFF")
    .setBorder(false, false, false, false, false, false);

  // BFE
  breakApartSafe_(sh.getRange(48, 3, 2, lastCol - 2));
  sh.getRange(48, 3, 2, lastCol - 2)
    .merge()
    .setValue("Bureau Formations Entreprises — BFE : 04 92 29 30 65")
    .setBackground("#1B396A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(18)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  sh.getRange(48, 1, 2, 2)
    .clearContent()
    .setBackground("#1B396A")
    .setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  sh.setRowHeight(48, 32);
  sh.setRowHeight(49, 32);

  // Bordure extérieure générale du tableau imprimé
  sh.getRange(1, 1, 49, lastCol)
    .setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);

  // Suppression physique des lignes sous le BFE : plus de quadrillage, plus de noir
  const maxRows = sh.getMaxRows();
  if (maxRows > 49) {
    sh.deleteRows(50, maxRows - 49);
  }
  // Trait bas sous la dernière ligne de classe : Bachelor
sh.getRange(45, 1, 1, lastCol)
  .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);
}


/************************************************************
 * PATCH EDT V2.6 — GROUPES COMPOSÉS / GROUPES À CHEVAL
 * À lancer une fois depuis le menu :
 * ⚙️ Outils planning > 29. Créer structure EDT groupes composés
 *
 * Objectif :
 * - conserver les groupes de base qui portent les élèves ;
 * - créer des groupes de regroupement sélectionnables dans l'EDT ;
 * - décrire leur composition dans Groupes_Composition.
 ************************************************************/

function EDT_CreerStructureGroupesComposes() {
  const messages = [];

  EDT_ensureTableGroupesComposition_();
  messages.push("Table Groupes_Composition : OK");

  EDT_ensureColumnsGroupesPourRegroupements_();
  messages.push("Colonnes Groupes : OK");

  SpreadsheetApp.getActiveSpreadsheet().toast(
    messages.join(" · "),
    "EDT groupes composés",
    8
  );

  Logger.log(messages.join("\n"));
}


/**
 * PATCH EDT — PUBLIC / CLASSE ENTIÈRE / GROUPES / REGROUPEMENTS
 * À lancer une fois après collage du script :
 *   EDT_CreerStructurePublicGroupes()
 *
 * Ajoute ou vérifie les colonnes nécessaires sans supprimer les données existantes.
 */
function EDT_CreerStructurePublicGroupes() {
  const messages = [];

  EDT_ensureColumns_("Creneaux_EDT", [
    { id: "Mode_public", type: "Text" }
  ]);
  messages.push("Creneaux_EDT.Mode_public : OK");

  EDT_ensureColumnsGroupesPourRegroupements_();
  messages.push("Groupes.Nature_groupe + Classe_principale : OK");

  EDT_ensureTableGroupesComposition_();
  messages.push("Groupes_Composition : OK");

  SpreadsheetApp.getActiveSpreadsheet().toast(
    messages.join(" · "),
    "EDT public/groupes",
    8
  );

  Logger.log(messages.join("\n"));
}

function EDT_ensureTableGroupesComposition_() {
  const existingTables = EDT_getGristTablesIds_();

  if (existingTables.indexOf("Groupes_Composition") === -1) {
    grist_("POST", "/tables", {
      tables: [{
        id: "Groupes_Composition",
        columns: [
          { id: "Groupe_regroupement", type: "Ref:Groupes" },
          { id: "Groupe_membre", type: "Ref:Groupes" },
          { id: "Ordre", type: "Int" },
          { id: "Actif", type: "Bool" },
          { id: "Commentaire", type: "Text" }
        ]
      }]
    });
    return;
  }

  EDT_ensureColumns_("Groupes_Composition", [
    { id: "Groupe_regroupement", type: "Ref:Groupes" },
    { id: "Groupe_membre", type: "Ref:Groupes" },
    { id: "Ordre", type: "Int" },
    { id: "Actif", type: "Bool" },
    { id: "Commentaire", type: "Text" }
  ]);
}

function EDT_ensureColumnsGroupesPourRegroupements_() {
  EDT_ensureColumns_("Groupes", [
    { id: "Nature_groupe", type: "Text" },
    { id: "Classe_principale", type: "Ref:Classes" },
    { id: "Commentaire_composition", type: "Text" }
  ]);
}

function EDT_ensureColumns_(tableId, columns) {
  const existing = EDT_getGristColumnIds_(tableId);
  const missing = (columns || []).filter(c => existing.indexOf(c.id) === -1);
  if (!missing.length) return;

  grist_("POST", "/tables/" + encodeURIComponent(tableId) + "/columns", {
    columns: missing
  });
}

function EDT_getGristTablesIds_() {
  const data = grist_("GET", "/tables");
  return (data.tables || []).map(t => t.id);
}

function EDT_getGristColumnIds_(tableId) {
  try {
    const data = grist_("GET", "/tables/" + encodeURIComponent(tableId) + "/columns");
    return (data.columns || []).map(c => c.id);
  } catch (e) {
    // Certains documents Grist renvoient les colonnes dans /tables.
    const all = grist_("GET", "/tables");
    const t = (all.tables || []).find(x => x.id === tableId);
    return ((t && t.columns) || []).map(c => c.id);
  }
}

/**
 * Exemple à créer ensuite dans Grist :
 *
 * Table Groupes :
 * - 2MVA1 G1    Nature_groupe = BASE
 * - 2MVA1 G2    Nature_groupe = BASE
 * - 2MVA1 G3    Nature_groupe = BASE
 * - 2MVA2 G4    Nature_groupe = BASE
 * - 2MVA2 G5    Nature_groupe = BASE
 * - 2MVA2 G6    Nature_groupe = BASE
 * - 2MVA Tech A Nature_groupe = REGROUPEMENT
 * - 2MVA Tech B Nature_groupe = REGROUPEMENT
 * - 2MVA Tech C Nature_groupe = REGROUPEMENT
 *
 * Table Groupes_Composition :
 * - 2MVA Tech A -> 2MVA1 G1
 * - 2MVA Tech A -> 2MVA1 G2
 * - 2MVA Tech B -> 2MVA1 G3
 * - 2MVA Tech B -> 2MVA2 G4
 * - 2MVA Tech C -> 2MVA2 G5
 * - 2MVA Tech C -> 2MVA2 G6
 */function EDT_NETTOYER_STRUCTURE_GROUPES() {
  const DRY_RUN = true; // mets false quand tu es sûr

  const actions = [
    // GROUPES : on garde Nom, Nature_groupe, Actif, Commentaire, Effectif...
    ['RemoveColumn', 'Groupes', 'Classes_source'],

    // À supprimer seulement si tu ne t’en sers plus du tout
    // ['RemoveColumn', 'Groupes', 'Classe_principale'],

    // GROUPES_CLASSES : table conservée
    // elle sert à dire dans quelles classes un groupe apparaît

    // GROUPES_COMPOSITION : table conservée
    // elle sert à dire de quels groupes réels est composé un regroupement
  ];

  if (DRY_RUN) {
    Logger.log("MODE TEST — aucune suppression effectuée :");
    actions.forEach(a => Logger.log(JSON.stringify(a)));
    SpreadsheetApp.getActive().toast(
      "Mode test : regarde les logs avant suppression.",
      "EDT nettoyage",
      8
    );
    return;
  }

  gristApplyActions_(actions);

  SpreadsheetApp.getActive().toast(
    "Nettoyage terminé.",
    "EDT nettoyage",
    8
  );
}


function gristApplyActions_(actions) {
  const url = `${GRIST.BASE_URL}/docs/${GRIST.DOC_ID}/apply`;

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      Authorization: "Bearer " + GRIST.API_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(actions),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Erreur Grist apply " + code + " : " + res.getContentText());
  }

  return res.getContentText() ? JSON.parse(res.getContentText()) : {};
}
function EDT_NETTOYER_STRUCTURE_GROUPES() {
  const DRY_RUN = false; // mets false quand tu es sûr

  const actions = [
    // GROUPES : on garde Nom, Nature_groupe, Actif, Commentaire, Effectif...
    ['RemoveColumn', 'Groupes', 'Classes_source'],

    // À supprimer seulement si tu ne t’en sers plus du tout
    // ['RemoveColumn', 'Groupes', 'Classe_principale'],

    // GROUPES_CLASSES : table conservée
    // elle sert à dire dans quelles classes un groupe apparaît

    // GROUPES_COMPOSITION : table conservée
    // elle sert à dire de quels groupes réels est composé un regroupement
  ];

  if (DRY_RUN) {
    Logger.log("MODE TEST — aucune suppression effectuée :");
    actions.forEach(a => Logger.log(JSON.stringify(a)));
    SpreadsheetApp.getActive().toast(
      "Mode test : regarde les logs avant suppression.",
      "EDT nettoyage",
      8
    );
    return;
  }

  gristApplyActions_(actions);

  SpreadsheetApp.getActive().toast(
    "Nettoyage terminé.",
    "EDT nettoyage",
    8
  );
}


function gristApplyActions_(actions) {
  const url = `${GRIST.BASE_URL}/docs/${GRIST.DOC_ID}/apply`;

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      Authorization: "Bearer " + GRIST.API_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(actions),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Erreur Grist apply " + code + " : " + res.getContentText());
  }

  return res.getContentText() ? JSON.parse(res.getContentText()) : {};
}
/************************************************************
 * EDT — SUPPRESSION DE LA TABLE Groupes_Classes
 * À coller dans Apps Script.
 *
 * Principe V2.7 :
 * - Le widget ne lit plus Groupes_Classes.
 * - Les groupes BASE utilisent Groupes.Classe_principale.
 * - Les regroupements utilisent Groupes_Composition pour déduire leurs classes.
 ************************************************************/

function EDT_SUPPRIMER_TABLE_GROUPES_CLASSES() {
  const DRY_RUN = true; // 1) laisse true pour tester ; 2) mets false pour supprimer réellement
  const TABLE_ID = 'Groupes_Classes';

  const tables = grist_('GET', '/tables').tables || [];
  const exists = tables.some(t => t.id === TABLE_ID);

  if (!exists) {
    Logger.log('La table ' + TABLE_ID + ' n’existe déjà plus. Rien à faire.');
    SpreadsheetApp.getActive().toast(
      'La table ' + TABLE_ID + ' n’existe déjà plus.',
      'EDT nettoyage',
      8
    );
    return;
  }

  Logger.log('Table détectée : ' + TABLE_ID);
  Logger.log('Action prévue : ["RemoveTable", "' + TABLE_ID + '"]');

  if (DRY_RUN) {
    SpreadsheetApp.getActive().toast(
      'Mode test : aucune suppression. Mets DRY_RUN = false pour supprimer.',
      'EDT nettoyage',
      10
    );
    return;
  }

  gristApplyActions_([
    ['RemoveTable', TABLE_ID]
  ]);

  SpreadsheetApp.getActive().toast(
    'Table ' + TABLE_ID + ' supprimée.',
    'EDT nettoyage',
    10
  );
}


function gristApplyActions_(actions) {
  const url = `${GRIST.BASE_URL}/docs/${GRIST.DOC_ID}/apply`;

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + GRIST.API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(actions),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const txt = res.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Erreur Grist apply ' + code + ' : ' + txt);
  }

  return txt ? JSON.parse(txt) : {};
}

/************************************************************
 * PATCH EDT — NETTOYAGE DES ANCIENNES COLONNES D'IMPORT
 *
 * Problème identifié :
 * - Groupes.Libelle et Groupes.Code_import contiennent d'anciennes valeurs
 *   d'import et polluent les menus du widget.
 *
 * Nouvelle règle :
 * - Groupes.Nom = affichage du groupe
 * - Groupes.Nature_groupe = BASE ou REGROUPEMENT
 * - Groupes.Classe_principale = classe de rattachement des groupes BASE
 * - Groupes.Type_groupe = AT / App. / autre information métier
 * - Groupes_Composition = composition des regroupements
 ************************************************************/

function EDT_NETTOYER_COLONNES_IMPORT_GROUPES() {
  const actions = [];

  EDT_pushRemoveColumnIfExists_(actions, "Groupes", "Libelle");
  EDT_pushRemoveColumnIfExists_(actions, "Groupes", "Libellé");
  EDT_pushRemoveColumnIfExists_(actions, "Groupes", "Code_import");
  EDT_pushRemoveColumnIfExists_(actions, "Groupes", "Code_Import");

  if (!actions.length) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Aucune colonne d'import à supprimer dans Groupes.",
      "EDT nettoyage",
      8
    );
    Logger.log("EDT_NETTOYER_COLONNES_IMPORT_GROUPES : rien à supprimer.");
    return;
  }

  Logger.log("Actions de nettoyage Groupes :");
  actions.forEach(a => Logger.log(JSON.stringify(a)));

  gristApplyActions_(actions);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Colonnes Libelle / Code_import supprimées de Groupes.",
    "EDT nettoyage",
    8
  );
}

/**
 * Variante plus large, à utiliser seulement si tu veux nettoyer aussi
 * Classes et Groupes_Composition.
 *
 * Elle n'est pas nécessaire au fonctionnement du widget corrigé.
 */
function EDT_NETTOYER_COLONNES_IMPORT_EDT_LARGE() {
  const actions = [];

  ["Groupes", "Classes", "Groupes_Composition"].forEach(tableId => {
    EDT_pushRemoveColumnIfExists_(actions, tableId, "Libelle");
    EDT_pushRemoveColumnIfExists_(actions, tableId, "Libellé");
    EDT_pushRemoveColumnIfExists_(actions, tableId, "Code_import");
    EDT_pushRemoveColumnIfExists_(actions, tableId, "Code_Import");
  });

  if (!actions.length) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Aucune colonne d'import à supprimer.",
      "EDT nettoyage",
      8
    );
    Logger.log("EDT_NETTOYER_COLONNES_IMPORT_EDT_LARGE : rien à supprimer.");
    return;
  }

  Logger.log("Actions de nettoyage large :");
  actions.forEach(a => Logger.log(JSON.stringify(a)));

  gristApplyActions_(actions);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Colonnes d'import supprimées.",
    "EDT nettoyage",
    8
  );
}

function EDT_pushRemoveColumnIfExists_(actions, tableId, colId) {
  const cols = EDT_getGristColumnIds_(tableId);
  if (cols.indexOf(colId) !== -1) {
    actions.push(["RemoveColumn", tableId, colId]);
  }
}


/************************************************************
 * VERSION EDT V2.10.4 — STRUCTURE SERVICES / BUDGETS / PFMP / COENSEIGNEMENT
 * À lancer une fois depuis Apps Script : EDT_STRUCTURE_SERVICES_V2102()
 *
 * Budgets officiels utilisés par le widget : LP, BTS, SI, STI2D.
 * La pondération n'est plus déclarée cours par cours : elle est calculée
 * dans les synthèses selon l'obligation de service et les budgets pondérables.
 ************************************************************/

function EDT_STRUCTURE_SERVICES_V2101() {
  const messages = [];

  EDT_ensureColumns_("Creneaux_EDT", [
    { id: "Nature_service", type: "Text" },
    { id: "Categorie_service", type: "Text" },
    { id: "Consomme_service", type: "Bool" },
    { id: "Coefficient_service", type: "Numeric" },
    { id: "Budget_service", type: "Text" },
    { id: "Autorise_chevauchement_prof", type: "Bool" }
  ]);
  messages.push("Creneaux_EDT : colonnes service/budget OK");

  EDT_ensureTableServicesEnseignantsV299_();
  messages.push("Services_Enseignants : table/colonnes OK");

  EDT_ensureColumns_("Synthese_Hebdo_Enseignants", EDT_colsSyntheseServiceV299_());
  messages.push("Synthese_Hebdo_Enseignants : colonnes service OK");

  EDT_ensureColumns_("Synthese_Annuelle_Enseignants", EDT_colsSyntheseServiceV299_().filter(c => c.id !== "Semaine_ISO"));
  messages.push("Synthese_Annuelle_Enseignants : colonnes service OK");

  EDT_ensureColumns_("Synthese_Annuelle_Ressources", [
    { id: "Heures_service", type: "Numeric" },
    { id: "Heures_hors_service", type: "Numeric" }
  ]);
  messages.push("Synthese_Annuelle_Ressources : colonnes service OK");

  EDT_insererReglesServiceParDefautV299_();
  messages.push("Règles de service par défaut : OK");

  SpreadsheetApp.getActiveSpreadsheet().toast(messages.join(" · "), "EDT V2.10.2", 10);
  Logger.log(messages.join("\n"));
}

function EDT_colsSyntheseServiceV299_() {
  return [
    { id: "Semaine_ISO", type: "Int" },
    { id: "Heures_service_brut", type: "Numeric" },
    { id: "Heures_service_ponderees", type: "Numeric" },
    { id: "Heures_service_retenues", type: "Numeric" },
    { id: "Heures_plus_service", type: "Numeric" },
    { id: "Heures_service_LP", type: "Numeric" },
    { id: "Heures_service_BTS", type: "Numeric" },
    { id: "Heures_service_SI", type: "Numeric" },
    { id: "Heures_service_STI2D", type: "Numeric" },
    { id: "Heures_plus_LP", type: "Numeric" },
    { id: "Heures_plus_BTS", type: "Numeric" },
    { id: "Heures_plus_SI", type: "Numeric" },
    { id: "Heures_plus_STI2D", type: "Numeric" },
    { id: "Heures_ponderees_retenues", type: "Numeric" },
    { id: "Heures_eligibles_non_ponderees", type: "Numeric" }
  ];
}

function EDT_ensureTableServicesEnseignantsV299_() {
  const existingTables = EDT_getGristTablesIds_();
  const columns = [
    { id: "Annee_scolaire", type: "Ref:Annees_Scolaires" },
    { id: "Version_EDT", type: "Ref:Versions_EDT" },
    { id: "Enseignant", type: "Ref:Enseignants" },
    { id: "Obligation_service", type: "Numeric" },
    { id: "Service_socle", type: "Numeric" },
    { id: "Plafond_service_pondere", type: "Numeric" },
    { id: "Coefficient_pondere", type: "Numeric" },
    { id: "Budgets_ponderables", type: "Text" },
    { id: "Budget_service_h", type: "Numeric" },
    { id: "Budget_HS_LP", type: "Numeric" },
    { id: "Budget_HS_BTS", type: "Numeric" },
    { id: "Budget_HS_SI", type: "Numeric" },
    { id: "Budget_HS_STI2D", type: "Numeric" },
    { id: "Autorise_chevauchement_hors_service", type: "Bool" },
    { id: "Actif", type: "Bool" },
    { id: "Commentaire", type: "Text" }
  ];

  if (existingTables.indexOf("Services_Enseignants") === -1) {
    grist_("POST", "/tables", { tables: [{ id: "Services_Enseignants", columns: columns }] });
    return;
  }

  EDT_ensureColumns_("Services_Enseignants", columns);
}

function EDT_insererReglesServiceParDefautV299_() {
  const ens = grist_("GET", "/tables/Enseignants/records").records || [];
  const existing = grist_("GET", "/tables/Services_Enseignants/records").records || [];
  const existingEns = existing.map(r => Number((r.fields || {}).Enseignant || 0)).filter(Boolean);

  const toInsert = ens
    .filter(r => !existingEns.includes(Number(r.id)))
    .map(r => {
      const service = Number((r.fields || {}).Service_hebdo_reference || (r.fields || {}).Service_du_hebdo || (r.fields || {}).Service_hebdo || 18);
      return {
        fields: {
          Enseignant: Number(r.id),
          Obligation_service: service,
          Service_socle: 0,
          Plafond_service_pondere: service,
          Coefficient_pondere: 1.25,
          Budgets_ponderables: "BTS,SI,STI2D",
          Budget_service_h: service,
          Budget_HS_LP: 0,
          Budget_HS_BTS: 0,
          Budget_HS_SI: 0,
          Budget_HS_STI2D: 0,
          Autorise_chevauchement_hors_service: true,
          Actif: true,
          Commentaire: "Créé par EDT V2.10.1 — pondération calculée en synthèse, budgets LP/BTS/SI/STI2D"
        }
      };
    });

  for (let i = 0; i < toInsert.length; i += 100) {
    grist_("POST", "/tables/Services_Enseignants/records", { records: toInsert.slice(i, i + 100) });
  }
}

function EDT_SERVICE_EXEMPLES_V299() {
  Logger.log("V2.10.1 : ne pas déclarer de créneau pondéré.");
  Logger.log("Dans Creneaux_EDT : Compte_service=true, Nature_service=SERVICE, Budget_service=LP/BTS/SI/STI2D.");
  Logger.log("La pondération 1,25 est calculée dans la synthèse selon Services_Enseignants.Budgets_ponderables et Obligation_service.");
  Logger.log("Pour des heures en plus du service : Nature_service=HEURES_PLUS, Compte_service=false, Autorise_chevauchement_prof=true si nécessaire.");
}


/** Compatibilité : ancien nom conservé. */
function EDT_STRUCTURE_SERVICES_V2100(){
  return EDT_STRUCTURE_SERVICES_V2101();
}


/************************************************************
 * VERSION EDT V2.10.2 — STRUCTURE COMPLÉMENTAIRE PFMP / VACANCES
 * À lancer une fois depuis Apps Script : EDT_STRUCTURE_SERVICES_V2102()
 *
 * Le widget V2.10.2 lit Calendrier_Scolaire et Planning_Periodes
 * pour calculer les semaines de service par classe/groupe :
 * - vacances exclues ;
 * - PFMP / stage / entreprise exclues ;
 * - jours fériés conservés comme travaillés.
 ************************************************************/

function EDT_ensureTableIfMissingV2102_(tableId, columns) {
  const existingTables = EDT_getGristTablesIds_();
  if (existingTables.indexOf(tableId) === -1) {
    grist_("POST", "/tables", { tables: [{ id: tableId, columns: columns }] });
    return;
  }
  EDT_ensureColumns_(tableId, columns);
}

function EDT_STRUCTURE_SERVICES_V2102() {
  // Rejoue d'abord la structure services/budgets déjà validée.
  EDT_STRUCTURE_SERVICES_V2101();

  const messages = [];

  EDT_ensureTableIfMissingV2102_("Calendrier_Scolaire", [
    { id: "Date", type: "Date" },
    { id: "Annee_scolaire", type: "Text" },
    { id: "Semaine_ISO", type: "Int" },
    { id: "Jour_nom", type: "Text" },
    { id: "Jour_numero", type: "Int" },
    { id: "Est_weekend", type: "Bool" },
    { id: "Est_ferie", type: "Bool" },
    { id: "Est_vacances", type: "Bool" },
    { id: "Nom_vacances", type: "Text" }
  ]);
  messages.push("Calendrier_Scolaire : colonnes utiles OK");

  EDT_ensureTableIfMissingV2102_("Planning_Periodes", [
    { id: "Annee_scolaire", type: "Text" },
    { id: "Formation", type: "Text" },
    { id: "Niveau", type: "Text" },
    { id: "Classe", type: "Text" },
    { id: "Groupe", type: "Text" },
    { id: "Date_debut", type: "Date" },
    { id: "Date_fin", type: "Date" },
    { id: "Type", type: "Text" },
    { id: "Couleur", type: "Text" },
    { id: "Commentaire", type: "Text" },
    { id: "Actif", type: "Bool" }
  ]);
  messages.push("Planning_Periodes : colonnes PFMP/service OK");

  SpreadsheetApp.getActiveSpreadsheet().toast(messages.join(" · "), "EDT V2.10.2", 10);
  Logger.log(messages.join("\n"));
}

/** Compatibilité : anciens noms conservés. */
function EDT_STRUCTURE_SERVICES_V2101_VERS_V2102(){
  return EDT_STRUCTURE_SERVICES_V2102();
}


/************************************************************
 * EDT V2.10.3 — STRUCTURE COENSEIGNEMENT
 * À lancer une fois depuis Apps Script : EDT_STRUCTURE_SERVICES_V2104()
 *
 * Ajoute dans Creneaux_EDT les colonnes nécessaires :
 * - Coenseignement : booléen Oui/Non ;
 * - Cle_coenseignement : texte, clé commune des créneaux liés ;
 * - Role_coenseignement : TITULAIRE / COMPLEMENT / SIMULTANE ;
 * - Mode_coenseignement : miroir texte, conservé pour compatibilité.
 ************************************************************/
function EDT_STRUCTURE_SERVICES_V2104() {
  EDT_STRUCTURE_SERVICES_V2102();

  EDT_ensureColumns_("Creneaux_EDT", [
    { id: "Coenseignement", type: "Bool" },
    { id: "Cle_coenseignement", type: "Text" },
    { id: "Role_coenseignement", type: "Text" },
    { id: "Mode_coenseignement", type: "Text" }
  ]);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "EDT V2.10.4 : colonnes coenseignement ajoutées / vérifiées",
    "EDT V2.10.4",
    10
  );
}

/** Compatibilité : anciens noms conservés. */
function EDT_STRUCTURE_SERVICES_V2103_VERS_V2104(){
  return EDT_STRUCTURE_SERVICES_V2104();
}


/************************************************************
 * EDT V2.10.9 — STRUCTURE SEMAINES PÉDAGOGIQUES / DIAGNOSTIC
 * À lancer une fois depuis Apps Script : EDT_STRUCTURE_SERVICES_V2105()
 *
 * Pas de nouvelle colonne obligatoire par rapport à V2.10.4.
 * Cette fonction vérifie tout de même les colonnes nécessaires au calcul :
 * - Calendrier_Scolaire : semaine ISO, vacances ;
 * - Planning_Periodes : classe/groupe, dates, type PFMP/stage/entreprise ;
 * - Creneaux_EDT : coenseignement, semaines personnalisées, service/budget.
 ************************************************************/
function EDT_STRUCTURE_SERVICES_V2105() {
  EDT_STRUCTURE_SERVICES_V2104();

  EDT_ensureColumns_("Creneaux_EDT", [
    { id: "Semaines_personnalisees", type: "Text" },
    { id: "Compte_service", type: "Bool" },
    { id: "Consomme_service", type: "Bool" },
    { id: "Nature_service", type: "Text" },
    { id: "Budget_service", type: "Text" },
    { id: "Coenseignement", type: "Bool" },
    { id: "Cle_coenseignement", type: "Text" },
    { id: "Role_coenseignement", type: "Text" }
  ]);

  EDT_ensureColumns_("Planning_Periodes", [
    { id: "Classe", type: "Text" },
    { id: "Groupe", type: "Text" },
    { id: "Date_debut", type: "Date" },
    { id: "Date_fin", type: "Date" },
    { id: "Type", type: "Text" },
    { id: "Actif", type: "Bool" }
  ]);

  EDT_ensureColumns_("Calendrier_Scolaire", [
    { id: "Date", type: "Date" },
    { id: "Annee_scolaire", type: "Text" },
    { id: "Semaine_ISO", type: "Int" },
    { id: "Jour_nom", type: "Text" },
    { id: "Est_weekend", type: "Bool" },
    { id: "Est_vacances", type: "Bool" }
  ]);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "EDT V2.10.9 : structure vérifiée. Le diagnostic et l’analyse des services sont dans le widget.",
    "EDT V2.10.9",
    10
  );
}

/** Compatibilité : anciens noms conservés. */
function EDT_STRUCTURE_SERVICES_V2104_VERS_V2105(){
  return EDT_STRUCTURE_SERVICES_V2105();
}


/**************** VERSION EDT V2.10.9 — STRUCTURE INCHANGÉE ****************/
function EDT_STRUCTURE_SERVICES_V2106() {
  // Pas de nouvelle colonne par rapport à V2.10.5.
  // On relance la structure précédente pour sécuriser les colonnes existantes.
  return EDT_STRUCTURE_SERVICES_V2105();
}


/**************** VERSION EDT V2.10.9 — STRUCTURE INCHANGÉE / CALCUL WIDGET CORRIGÉ ****************/
function EDT_STRUCTURE_SERVICES_V2108() {
  return EDT_STRUCTURE_SERVICES_V2106();
}

function EDT_STRUCTURE_SERVICES_V2106_VERS_V2108(){
  return EDT_STRUCTURE_SERVICES_V2108();
}


/************************************************************
 * EDT V2.10.9 — STRUCTURE / PARAMÈTRE RECALCUL SILENCIEUX
 * Fonction à lancer une fois : EDT_STRUCTURE_SERVICES_V2109()
 ************************************************************/
function EDT_STRUCTURE_SERVICES_V2109() {
  if (typeof EDT_STRUCTURE_SERVICES_V2108 === 'function') {
    EDT_STRUCTURE_SERVICES_V2108();
  } else if (typeof EDT_STRUCTURE_SERVICES_V2106 === 'function') {
    EDT_STRUCTURE_SERVICES_V2106();
  }
  EDT_UPSERT_PARAMETRE_EDT_V2109_('Recalcul_Differe_ms', '60000', 'Délai du recalcul automatique différé en millisecondes — V2.10.9');
  try { SpreadsheetApp.getActiveSpreadsheet().toast('Structure EDT V2.10.9 OK — recalcul différé réglé à 60 secondes.', 'EDT', 6); } catch(e) {}
}

function EDT_STRUCTURE_SERVICES_V2108_VERS_V2109(){
  return EDT_STRUCTURE_SERVICES_V2109();
}

function EDT_UPSERT_PARAMETRE_EDT_V2109_(cle, valeur, commentaire) {
  try {
    const data = grist_('GET', '/tables/Parametres_EDT/records');
    const records = data.records || [];
    const found = records.find(r => String((r.fields || {}).Cle || '') === String(cle));
    if (found) {
      grist_('PATCH', '/tables/Parametres_EDT/records', {
        records: [{ id: found.id, fields: { Valeur: String(valeur), Commentaire: commentaire || '' } }]
      });
    } else {
      grist_('POST', '/tables/Parametres_EDT/records', {
        records: [{ fields: { Cle: String(cle), Valeur: String(valeur), Commentaire: commentaire || '', Actif: true } }]
      });
    }
  } catch (e) {
    Logger.log('EDT_UPSERT_PARAMETRE_EDT_V2109_ impossible : ' + e);
  }
}
