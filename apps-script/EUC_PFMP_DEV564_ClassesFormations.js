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
  if(key==='TSEC')return{famille:'AUTRES_FORMATIONS',diplome:'Titre professionnel — TSEC'};
  if(key==='TPEEB')return{famille:'AUTRES_FORMATIONS',diplome:'Titre professionnel — TPEEB'};
  if(key==='PMMA'||key==='TPMMA')return{famille:'AUTRES_FORMATIONS',diplome:'Titre professionnel — TPMMA'};
  if(key==='CQPM'||key==='CQPM ASC')return{famille:'AUTRES_FORMATIONS',diplome:'CQPM — ASC'};
  return{famille:String(row&&row.famille||'').trim(),diplome:String(currentDiploma||'').trim()};
}

function EUC_DEV565_classKey_(value){
  return String(value||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
}

/**
 * Les classes C doivent être de vraies lignes distinctes de la table Classes.
 * Ce complément ne renomme jamais les anciennes lignes G et ne fabrique aucun
 * identifiant. Il ajoute seulement les cibles exactes déjà présentes dans le
 * référentiel Grist lorsque le périmètre Pronote courant ne les publie pas.
 */
function EUC_DEV565_mergeRequiredClasses_(rows){
  rows=Array.isArray(rows)?rows.slice():[];
  var wanted={'1MELEC C':true,'TMELEC C':true},seen={};
  rows.forEach(function(row){seen[EUC_DEV565_classKey_(EUC_DEV564_classLabel_(row))]=true;});
  if(seen['1MELEC C']&&seen['TMELEC C'])return rows;
  var source=[];
  try{if(typeof EUC_IMPORT_chargerClassesCamin_==='function')source=EUC_IMPORT_chargerClassesCamin_()||[];}catch(e){source=[];}
  source.forEach(function(row){
    var key=EUC_DEV565_classKey_(EUC_DEV564_classLabel_(row));
    if(!wanted[key]||seen[key]||row.actif===false||!EUC_DEV564_classId_(row))return;
    var normalized=EUC_DEV564_normalizeClass_(row);normalized.famille='BACPRO';
    rows.push(normalized);seen[key]=true;
  });
  rows.sort(function(a,b){return EUC_DEV564_classLabel_(a).localeCompare(EUC_DEV564_classLabel_(b),'fr');});
  return rows;
}
