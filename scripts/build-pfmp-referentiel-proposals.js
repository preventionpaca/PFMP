const fs = require('fs');
const path = require('path');

const source = require('../proposals/pfmp-source-readonly.json').tables;
const outDir = path.resolve(__dirname, '..', 'proposals');

const classPlan = {
  1:['CAP_CAR','CAP CAR','CAP|1 CA','Correspondance probable à valider','Le code classe contient CAP CAR, la période utilise le niveau 1 CA.'],
  2:['CAPP','CAPP','', 'Correspondance impossible à déterminer','Aucune période PFMP et aucun libellé de diplôme développé.'],
  3:['CAR','CAR','1 BAC PRO|CPA','Correspondance probable à valider','CAR dans la classe, CPA dans le planning.'],
  4:['CIEL','CIEL','1 BAC PRO|CIEL','Correspondance probable à valider','Spécialité identique ; année déduite de la seule année active.'],
  5:['MELEC','MELEC','1 BAC PRO|MELEC','Correspondance probable à valider','Spécialité identique ; plusieurs classes MELEC partagent les périodes.'],
  6:['MELEC','MELEC','1 BAC PRO|MELEC','Correspondance probable à valider','Classe suffixée G et doublon actif portant le même nom.'],
  7:['MP3D','MP3D','1 BAC PRO|MP3','Correspondance probable à valider','Écart de code MP3D/MP3.'],
  8:['MT','MT','1 BAC PRO|MT','Correspondance probable à valider','Spécialité identique ; année déduite.'],
  9:['MVA','MVA','1 BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent les mêmes périodes.'],
 10:['MVA','MVA','1 BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent les mêmes périodes.'],
 11:['RMO','RMO','1 BAC PRO|RMO','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 12:['RSP','RSP','1 BAC PRO|RSP','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 13:['CAR','CAR','2 BAC PRO|CPA','Correspondance probable à valider','CAR dans la classe, CPA dans le planning.'],
 14:['MP3D','MP3D','2 BAC PRO|MP3D','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 15:['MTNE','MTNE','2 BAC PRO|MTNE','Correspondance probable à valider','Deux classes MTNE partagent la période.'],
 16:['MTNE','MTNE','2 BAC PRO|MTNE','Correspondance probable à valider','Deux classes MTNE partagent la période.'],
 17:['MVA','MVA','2 BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent la période.'],
 18:['MVA','MVA','2 BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent la période.'],
 19:['REMI','REMI','2 BAC PRO|REMI','Correspondance probable à valider','Deux classes REMI partagent la période.'],
 20:['REMI','REMI','2 BAC PRO|REMI','Correspondance probable à valider','Deux classes REMI partagent la période.'],
 23:['CAP_CAR','CAP CAR','CAP|T CA','Correspondance probable à valider','Le code classe contient CAP CAR, la période utilise le niveau T CA.'],
 24:['CAR','CAR','T BAC PRO|CPA','Correspondance probable à valider','CAR dans la classe, CPA dans le planning.'],
 25:['CIEL','CIEL','T BAC PRO|CIEL','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 26:['MELEC','MELEC','T BAC PRO|MELEC','Correspondance probable à valider','Plusieurs classes MELEC partagent les périodes.'],
 27:['MELEC','MELEC','T BAC PRO|MELEC','Correspondance probable à valider','Classe suffixée G et doublon actif portant le même nom.'],
 28:['MP3D','MP3D','T BAC PRO|MP3D','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 29:['MT','MT','T BAC PRO|MT','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 30:['MVA','MVA','T BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent les périodes.'],
 31:['MVA','MVA','T BAC PRO|MVA','Correspondance probable à valider','Deux classes MVA partagent les périodes.'],
 32:['RMO','RMO','T BAC PRO|RMO','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 33:['RSP','RSP','T BAC PRO|RSP','Correspondance probable à valider','Spécialité identique ; année déduite.'],
 34:['TPMMA','TPMMA','', 'Correspondance impossible à déterminer','Aucune période et aucune formation renseignée.'],
 35:['TSEC','TSEC','Ducretet|TSEC','Correspondance probable à valider','Formation Ducretet/TSEC trouvée, mais aucune période de type PFMP ou Stage.'],
 36:['CQPM_ASC','CQPM ASC','', 'Correspondance impossible à déterminer','Aucune période et aucune formation renseignée.'],
 37:['MELEC','MELEC','1 BAC PRO|MELEC','Correspondance impossible à déterminer','Doublon actif exact de la classe 1MELEC G.'],
 38:['MELEC','MELEC','T BAC PRO|MELEC','Correspondance impossible à déterminer','Doublon actif exact de la classe TMELEC G.'],
 39:['BTS_ELEC','BTS ELEC','1BTS|ELEC','Correspondance probable à valider','Classe et période contiennent BTS/ELEC ; suffixe Alt à confirmer.'],
 40:['BTS_ELEC','BTS ELEC','2BTS|ELEC','Correspondance impossible à déterminer','Aucune période 2BTS ELEC trouvée.']
};

function iso(value) {
  if (!value) return '';
  return typeof value === 'number' ? new Date(value * 1000).toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function norm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function csv(rows, columns) {
  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return `${columns.map(esc).join(',')}\n${rows.map((row) => columns.map((column) => esc(row[column])).join(',')).join('\n')}\n`;
}

const activeYear = source.Annees_Scolaires.find((row) => row.fields.Active === true);
if (!activeYear) throw new Error('Aucune année active unique exploitable.');
const yearCode = activeYear.fields.Code;

const diplomaMap = new Map();
for (const [id, plan] of Object.entries(classPlan)) {
  const [code, label, , classification, ambiguity] = plan;
  if (!diplomaMap.has(code)) diplomaMap.set(code, {Code: code, Libelle: label, Actif: true, Ordre: diplomaMap.size + 1, Classification: classification, Justification: ambiguity, Classes: []});
  diplomaMap.get(code).Classes.push(id);
  if (classification === 'Correspondance impossible à déterminer') diplomaMap.get(code).Classification = classification;
}
const diplomas = [...diplomaMap.values()].map((row) => ({...row, Classes: row.Classes.join('|')}));

const offers = source.Classes.map((row, index) => {
  const plan = classPlan[row.id];
  if (!plan) throw new Error(`Classe non analysée : ${row.id}`);
  return {
    Code_temporaire: `${yearCode}__CLASSE_${row.id}`,
    Annee_id: activeYear.id,
    Annee_code: yearCode,
    Diplome_code: plan[0],
    Classe_id: row.id,
    Classe_code: row.fields.Code_import || '',
    Classe_libelle: row.fields.Libelle || row.fields.Nom || '',
    Actif_source: row.fields.Actif === true,
    Actif_propose: row.fields.Actif === true,
    Ordre: index + 1,
    Classification: plan[3],
    Ambiguite: plan[4]
  };
});

const offerByPeriodKey = new Map();
for (const offer of offers) {
  const key = classPlan[offer.Classe_id][2];
  if (!key) continue;
  if (!offerByPeriodKey.has(key)) offerByPeriodKey.set(key, []);
  offerByPeriodKey.get(key).push(offer);
}

const officialPeriods = source.Planning_Periodes.filter((row) => /PFMP|Stage BTS/i.test(String(row.fields.Type || '')));
const sequence = new Map();
const periods = officialPeriods.map((row) => {
  const f = row.fields;
  const key = `${f.Formation}|${f.Niveau}`;
  const matches = offerByPeriodKey.get(key) || [];
  const seqKey = `${f.Annee_scolaire}|${f.Formation}|${f.Niveau}`;
  sequence.set(seqKey, (sequence.get(seqKey) || 0) + 1);
  const proposedCode = `${norm(f.Annee_scolaire)}_${norm(f.Formation)}_${norm(f.Niveau)}_${String(sequence.get(seqKey)).padStart(2, '0')}`;
  const start = iso(f.Date_debut), end = iso(f.Date_fin);
  let classification = 'Correspondance impossible à déterminer';
  let ambiguity = 'Aucune classe active correspondante.';
  let offerCode = '';
  if (matches.length === 1) {
    classification = /CPA|MP3$|1 CA|T CA/.test(key) ? 'Correspondance probable à valider' : 'Correspondance certaine';
    ambiguity = classification === 'Correspondance certaine' ? '' : 'Écart entre le code de classe et le niveau de période.';
    offerCode = matches[0].Code_temporaire;
  } else if (matches.length > 1) {
    ambiguity = `La période correspond à ${matches.length} classes actives ; une référence Offre_formation unique est insuffisante.`;
  }
  return {
    Periode_id: row.id,
    Annee_scolaire: f.Annee_scolaire || '',
    Formation: f.Formation || '',
    Niveau: f.Niveau || '',
    Type: f.Type || '',
    Date_debut: start,
    Date_fin: end,
    Offre_temporaire_proposee: offerCode,
    Offres_candidates: matches.map((item) => item.Code_temporaire).join('|'),
    Libelle_periode_propose: `${f.Type} — ${f.Niveau} — ${start} au ${end}`,
    Code_periode_propose: proposedCode,
    Classification: classification,
    Ambiguite: ambiguity
  };
});

const files = [
  ['pfmp-diplomes-proposes.csv', diplomas, ['Code','Libelle','Actif','Ordre','Classification','Justification','Classes']],
  ['pfmp-offres-formation-proposees.csv', offers, ['Code_temporaire','Annee_id','Annee_code','Diplome_code','Classe_id','Classe_code','Classe_libelle','Actif_source','Actif_propose','Ordre','Classification','Ambiguite']],
  ['pfmp-periodes-correspondances-proposees.csv', periods, ['Periode_id','Annee_scolaire','Formation','Niveau','Type','Date_debut','Date_fin','Offre_temporaire_proposee','Offres_candidates','Libelle_periode_propose','Code_periode_propose','Classification','Ambiguite']]
];
for (const [name, rows, columns] of files) fs.writeFileSync(path.join(outDir, name), csv(rows, columns));

const counts = {
  years: source.Annees_Scolaires.length,
  activeYears: source.Annees_Scolaires.filter((row) => row.fields.Active === true).length,
  classes: source.Classes.length,
  activeClasses: source.Classes.filter((row) => row.fields.Actif === true).length,
  inactiveClasses: source.Classes.filter((row) => row.fields.Actif === false).length,
  diplomasProposed: diplomas.length,
  offersProposed: offers.length,
  periodsTotal: source.Planning_Periodes.length,
  officialPeriodsRecognized: periods.length,
  periodCertain: periods.filter((row) => row.Classification === 'Correspondance certaine').length,
  periodProbable: periods.filter((row) => row.Classification === 'Correspondance probable à valider').length,
  periodImpossible: periods.filter((row) => row.Classification === 'Correspondance impossible à déterminer').length,
  periodOfferDirectlyFillable: periods.filter((row) => row.Offre_temporaire_proposee).length,
  classesWithoutOfficialPeriod: offers.filter((offer) => !(offerByPeriodKey.get(classPlan[offer.Classe_id][2]) || []).length || !periods.some((period) => period.Offres_candidates.split('|').includes(offer.Code_temporaire))).length
};
fs.writeFileSync(path.join(outDir, 'pfmp-proposition-summary.json'), `${JSON.stringify(counts, null, 2)}\n`);
console.log(JSON.stringify(counts));
