const fs = require('fs');
const path = require('path');

const source = require('../proposals/pfmp-source-readonly.json').tables;
const outDir = path.resolve(__dirname, '..', 'proposals');

// Liste métier fournie par l'utilisateur : utilisée uniquement pour produire le CSV de validation.
// Elle ne doit jamais être importée comme constante dans la Web App ou Apps Script.
const authorized = [
  '1CAP CAR','1CAR','1CIEL','1MELEC','1MP3D','1MT','1MVA1','1MVA2','1RMO','1RSP',
  '2CAR','2MP3D','2MTNE1','2MTNE2','2MVA1','2MVA2','2REMI1','2REMI2',
  'TCAP CAR','TCAR','TCIEL','TMELEC','TMP3D','TMT','TMVA1','TMVA2','TRMO','TRSP',
  '1BTS CPI','2BTS CPI','1BTS CPRP','2BTS CPRP','1BTS MV','2BTS MV','1BTS ELEC','2BTS ELEC','1BTS CIEL','2BTS CIEL'
];

const plans = {
  '1CAP CAR':['CAP_CAR',[285]],
  '1CAR':['BAC_PRO_CAR',[26,34]], '1CIEL':['BAC_PRO_CIEL',[25,33]],
  '1MELEC':['BAC_PRO_MELEC',[28,36]], '1MP3D':['BAC_PRO_MP3D',[29,37]],
  '1MT':['BAC_PRO_MT',[30,38]], '1MVA1':['BAC_PRO_MVA',[27,35]], '1MVA2':['BAC_PRO_MVA',[27,35]],
  '1RMO':['BAC_PRO_RMO',[31,39]], '1RSP':['BAC_PRO_RSP',[32,40]],
  '2CAR':['BAC_PRO_CAR',[137]], '2MP3D':['BAC_PRO_MP3D',[140]],
  '2MTNE1':['DIPLOME_A_DETERMINER_MTNE',[141]], '2MTNE2':['DIPLOME_A_DETERMINER_MTNE',[141]],
  '2MVA1':['BAC_PRO_MVA',[138]], '2MVA2':['BAC_PRO_MVA',[138]],
  '2REMI1':['DIPLOME_A_DETERMINER_REMI',[139]], '2REMI2':['DIPLOME_A_DETERMINER_REMI',[139]],
  'TCAP CAR':['CAP_CAR',[284,287]], 'TCAR':['BAC_PRO_CAR',[10,62]],
  'TCIEL':['BAC_PRO_CIEL',[9,61]], 'TMELEC':['BAC_PRO_MELEC',[12,64]],
  'TMP3D':['BAC_PRO_MP3D',[13,65]],
  'TMT':['BAC_PRO_MT',[14,66]], 'TMVA1':['BAC_PRO_MVA',[11,63]], 'TMVA2':['BAC_PRO_MVA',[11,63]],
  'TRMO':['BAC_PRO_RMO',[15,67]], 'TRSP':['BAC_PRO_RSP',[16,68]],
  '1BTS CPI':['BTS_CPI',[273]], '2BTS CPI':['BTS_CPI',[]],
  '1BTS CPRP':['BTS_CPRP',[272]], '2BTS CPRP':['BTS_CPRP',[]],
  '1BTS MV':['BTS_MV',[275,278]], '2BTS MV':['BTS_MV',[277]],
  '1BTS ELEC':['BTS_ELEC',[274]], '2BTS ELEC':['BTS_ELEC',[]],
  '1BTS CIEL':['BTS_CIEL',[271]], '2BTS CIEL':['BTS_CIEL',[]]
};

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function csv(rows, columns) {
  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return `${columns.map(esc).join(',')}\n${rows.map((row) => columns.map((column) => esc(row[column])).join(',')).join('\n')}\n`;
}

const rows = authorized.map((label) => {
  const exact = source.Classes.filter((row) => (row.fields.Nom || row.fields.Libelle) === label);
  const normalized = source.Classes.filter((row) => normalize(row.fields.Nom || row.fields.Libelle) === normalize(label));
  let candidates = exact.length ? exact : normalized;
  let confidence;
  if (exact.length === 1) confidence = 'Correspondance exacte';
  else if (exact.length > 1) confidence = 'Plusieurs classes candidates';
  else if (normalized.length === 1) confidence = 'Correspondance normalisée certaine';
  else if (normalized.length > 1) confidence = 'Plusieurs classes candidates';
  else confidence = 'Classe introuvable';

  // Les deux classes ELEC portent explicitement le suffixe métier « Alt » dans Grist.
  if (confidence === 'Classe introuvable' && /^(?:1|2)BTS ELEC$/.test(label)) {
    candidates = source.Classes.filter((row) => normalize(row.fields.Nom).replace(/ALT$/, '') === normalize(label));
    if (candidates.length === 1) confidence = 'Correspondance normalisée certaine';
  }

  const plan = plans[label];
  const candidate = candidates.length === 1 ? candidates[0] : null;
  const comments = [];
  if (!candidate && candidates.length > 1) comments.push(`Candidats Grist : ${candidates.map((row) => row.id).join('|')}`);
  if (!candidate && !candidates.length) comments.push('Classe absente de la table Classes.');
  if (!plan[1].length) comments.push('Aucune période scolaire officielle identifiée.');
  if (/DIPLOME_A_DETERMINER/.test(plan[0])) comments.push('MTNE/REMI est une famille, pas un diplôme final validé.');
  if (label === '1BTS MV') comments.push('ID 278 est une période Stage BTS en modalité Mixité/apprentissage.');
  if (/^(?:2BTS CPI|2BTS CPRP)$/.test(label)) comments.push('Calendrier partagé Mixité trouvé dans les lignes ENT., sans Stage BTS scolaire.');

  return {
    Libelle_utilisateur: label,
    Classe_Grist_ID: candidate ? candidate.id : '',
    Code_Grist: candidate ? candidate.fields.Code_import || '' : '',
    Libelle_Grist: candidate ? candidate.fields.Libelle || candidate.fields.Nom || '' : '',
    Annee_scolaire: '2026-2027 (déduite)',
    Diplome_propose: plan[0],
    Statut_propose: 'Scolaire ou Apprenti (choix utilisateur)',
    Periodes_Grist_IDs: plan[1].join('|'),
    Afficher_formulaire_PFMP: true,
    Niveau_confiance: confidence,
    Commentaire: comments.join(' ')
  };
});

if (rows.length !== 38) throw new Error('La proposition doit contenir exactement 38 classes.');
const columns = ['Libelle_utilisateur','Classe_Grist_ID','Code_Grist','Libelle_Grist','Annee_scolaire','Diplome_propose','Statut_propose','Periodes_Grist_IDs','Afficher_formulaire_PFMP','Niveau_confiance','Commentaire'];
fs.writeFileSync(path.join(outDir, 'pfmp-classes-autorisees-proposees.csv'), csv(rows, columns));
const summary = Object.fromEntries(['Correspondance exacte','Correspondance normalisée certaine','Correspondance probable à valider','Classe introuvable','Plusieurs classes candidates'].map((key) => [key, rows.filter((row) => row.Niveau_confiance === key).length]));
summary.total = rows.length;
summary.classesExcluesGrist = source.Classes.filter((row) => !rows.some((item) => item.Classe_Grist_ID && Number(item.Classe_Grist_ID) === row.id) && !rows.some((item) => item.Commentaire.includes(`Candidats Grist :`) && item.Commentaire.split('Candidats Grist : ')[1].split(' ')[0].split('|').includes(String(row.id)))).map((row) => row.id);
fs.writeFileSync(path.join(outDir, 'pfmp-classes-autorisees-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
