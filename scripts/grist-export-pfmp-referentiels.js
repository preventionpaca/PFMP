const fs = require('fs');
const path = require('path');

const DOC_ID = 'j1jDArBkzi7P';
const tokenFile = process.env.EUC_PFMP_GRIST_TOKEN_FILE;
if (!tokenFile) throw new Error('EUC_PFMP_GRIST_TOKEN_FILE absent.');
const stat = fs.statSync(tokenFile);
if ((stat.mode & 0o077) !== 0) throw new Error('Le fichier du jeton doit être en mode 600.');
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (!token) throw new Error('Jeton vide.');

const selections = {
  Annees_Scolaires: ['Code','Libelle','Code_import','Date_debut','Date_fin','Zone','Active','Actif','Commentaire'],
  Classes: ['Code','Code_import','Nom','Libelle','Formation','Niveau','Effectif','Actif','Active','Commentaire'],
  Planning_Periodes: ['Annee_scolaire','Formation','Niveau','Classe','Groupe','Date_debut','Date_fin','Type','Couleur','Ligne_sheet','Duree_jour','Commentaire','Actif','Offre_formation','Libelle_periode','Code_periode'],
  EUC_DIPLOMES: ['Code','Libelle','Actif','Ordre','Commentaire'],
  EUC_OFFRES_FORMATION: ['Annee_scolaire','Diplome','Classe','Actif','Ordre','Commentaire']
};

async function getRecords(table) {
  const response = await fetch(`https://docs.getgrist.com/api/docs/${DOC_ID}/tables/${encodeURIComponent(table)}/records`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'}
  });
  if (!response.ok) throw new Error(`Lecture ${table} refusée (${response.status}).`);
  const json = await response.json();
  return (json.records || []).map((record) => {
    const fields = {};
    for (const key of selections[table]) {
      if (Object.prototype.hasOwnProperty.call(record.fields || {}, key)) fields[key] = record.fields[key];
    }
    return {id: record.id, fields};
  });
}

(async () => {
  const output = {docId: DOC_ID, extractedAt: new Date().toISOString(), tables: {}};
  for (const table of Object.keys(selections)) output.tables[table] = await getRecords(table);
  const outDir = path.resolve(__dirname, '..', 'proposals');
  fs.mkdirSync(outDir, {recursive: true});
  const outFile = path.join(outDir, 'pfmp-source-readonly.json');
  fs.writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`, {mode: 0o600});
  console.log(JSON.stringify({docId: DOC_ID, counts: Object.fromEntries(Object.entries(output.tables).map(([key, rows]) => [key, rows.length])), output: 'proposals/pfmp-source-readonly.json'}));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
