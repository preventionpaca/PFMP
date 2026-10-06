const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8');
let ok=0,ko=0;
function assert(value,message){if(!value)throw new Error(message||'assertion failed');}
function test(name,fn){try{fn();console.log('✓',name);ok++;}catch(e){console.error('✗',name,'-',e.message);ko++;}}

const admin=read('EUC_CENTRE_ADMIN_PFMP_WebApp.gs');
const tools=read('EUC_PFMP_DEV370_AdminTools.js');
const family=read('Suivi_Conventions_Famille_DEV459.html');
const pp=read('EUC_PFMP_DEV441_AccesPpGeocodage.js');
const form=read('Apprentissage_PFMP_V190X.html');
const loader=read('EUC_PFMP_DEV208_ClassDetailSnapshot.js');
const bridge=read('EUC_PFMP_DEV235_JsonBridge.js');

test('le centre et les outils admin utilisent le déploiement administrateur',()=>{
  const adminId='AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg';
  assert(admin.includes('baseUrl:EUC_DEV368_boot().baseUrl'),'centre non relié au boot admin');
  assert(tools.includes(adminId),'URL admin absente');
  const boot=tools.slice(tools.indexOf('function EUC_DEV368_boot'),tools.indexOf('function EUC_DEV368_afficherSans'));
  assert(!boot.includes('AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW'),'boot encore public');
});

test('la navigation de synthèse sort du cadre vers le bon déploiement',()=>{
  assert(family.includes('<base target="_top">'),'base top absente');
  assert(family.includes('<a class="period" target="_top"'),'période non top');
});

test('une expiration Grist en secondes Unix est interprétée correctement',()=>{
  const ctx={Date,Number,String,Array,isFinite};
  vm.createContext(ctx);vm.runInContext(pp,ctx);
  assert(ctx.EUC_DEV463_dateMs_(1791237599)===1791237599000,'secondes non converties');
  assert(ctx.EUC_DEV463_dateMs_('1791237599')===1791237599000,'secondes texte non converties');
  assert(ctx.EUC_DEV463_dateMs_('2026-10-16T21:59:59.000Z')===Date.parse('2026-10-16T21:59:59.000Z'),'ISO altéré');
});

test('la fiche apprenti expose responsable et copie vers le tuteur',()=>{
  for(const token of ['responsableEntreprise:v(\'.responsable-ent\')','Nom du responsable','Tuteur identique au responsable','.same-contact','.responsable-ent,.tel-ent,.mail-ent'])assert(form.includes(token),token);
  assert(loader.includes("responsableEntreprise:val(f,['Responsable_nom','Responsable','Nom_responsable_entreprise'])"),'responsable absent du chargeur');
  assert(bridge.includes('responsableEntreprise: txt(s.responsableEntreprise)'),'responsable absent du pont JSON');
});

test('les dates disposent de largeur et réservent la place du calendrier',()=>{
  assert(form.includes('DEV463_APPRENTIS_CONTACTS_DATES'),'correctif CSS absent');
  assert(form.includes('grid-template-columns:minmax(205px,30%)'),'colonne élève trop étroite');
  assert(form.includes('padding-right:24px!important'),'icône calendrier non réservée');
});

test('les liens Apprentis séparent administration et consultation publique',()=>{
  assert(form.includes('DEV463_APPRENTIS_ROUTES_EXPLICITES'),'surcharge absente');
  assert(form.includes("'https://alternance.loucodi.fr/'"),'accueil admin canonique absent');
  assert(form.includes("PUBLIC+'?page=apprentissage-public-pfmp'"),'consultation publique absente');
  assert(form.includes("ADMIN+'?page=snapshot-pfmp-admin'"),'maintenance admin absente');
});

console.log(`\nDEV463: ${ok} tests réussis, ${ko} échec(s)`);
if(ko)process.exit(1);
