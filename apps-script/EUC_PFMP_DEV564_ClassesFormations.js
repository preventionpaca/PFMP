/**
 * DEV564 — corrections métier non destructives des classes et formations.
 *
 * Les identifiants et libellés Grist restent inchangés. En particulier, les
 * anciennes lignes techniques 37/38 demeurent des doublons G : elles ne sont
 * jamais détournées pour représenter les classes C. L'import conserve des
 * cibles exactes distinctes pour 1MELEC, 1MELEC C, TMELEC et TMELEC C dès que
 * ces vraies classes existent dans le référentiel.
 */
function EUC_DEV564_classId_(row){
  row=row||{};return Number(row.classeId||row.id||row.Classe_id)||0;
}

function EUC_DEV564_classLabel_(row){
  row=row||{};return String(row.classe||row.nom||row.libelle||row.label||'').trim();
}

function EUC_DEV564_normalizeClass_(row){
  row=row||{};var out={};Object.keys(row).forEach(function(k){out[k]=row[k];});
  var label=EUC_DEV564_classLabel_(row);if(!label)return out;
  out.classe=label;out.nom=label;out.libelle=label;out.label=label;
  return out;
}

function EUC_DEV564_training_(row,currentDiploma){
  var label=EUC_DEV564_classLabel_(row),key=String(label||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
  if(key==='TSEC')return{famille:'TITRE_PRO',diplome:'Titre professionnel — TSEC'};
  if(key==='PMMA'||key==='TPMMA')return{famille:'TITRE_PRO',diplome:'Titre professionnel — PMMA'};
  if(key==='CQPM'||key==='CQPM ASC')return{famille:'CQPM',diplome:'CQPM — ASC'};
  return{famille:String(row&&row.famille||'').trim(),diplome:String(currentDiploma||'').trim()};
}
