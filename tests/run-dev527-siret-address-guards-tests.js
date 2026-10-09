const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const validation=read('EUC_ENT_Validation.gs');
const api=read('EUC_ENT_ApiEntreprise.gs');
const strict=read('EUC_SIRET_NIS_StrictV161.gs');

let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}
function apiContext(local){
  const ctx={encodeURIComponent,EUC_ENT_controlerAccesUtilisateur_:()=>true,EUC_ENT_verifierDoublonGrist:()=>local,EUC_ENT_lireConfiguration:()=>({EUC_ENT_API_RECHERCHE_URL:'https://recherche-entreprises.api.gouv.fr/search'})};
  vm.createContext(ctx);vm.runInContext(validation,ctx);vm.runInContext(api,ctx);return ctx;
}

test('une fiche Grist complète reste prioritaire',()=>{
  const ctx=apiContext({id:1,SIRET:'45218779200034',Raison_sociale:'GEMEA',Adresse_complete:'12 RUE LOUIS GARNERAY',Code_postal:'06300',Commune:'NICE'});
  const out=ctx.EUC_ENT_rechercherSiret('45218779200034');
  assert.equal(out.source,'grist');assert.equal(out.entreprise.numeroVoie,'12 RUE LOUIS GARNERAY');
});

test('une fiche Grist sans rue ne masque plus l’API officielle',()=>{
  const ctx=apiContext({id:2,SIRET:'49141406600036',Raison_sociale:'NOUVELLE GENERATION ELECTRIQUE',Adresse_complete:'',Code_postal:'06300',Commune:'NICE'});
  const out=ctx.EUC_ENT_rechercherSiret('49141406600036');
  assert.equal(out.source,'api_navigateur');assert.equal(out.gristIncomplet,true);assert.match(out.url,/49141406600036/);
});

test('la réponse officielle exacte NGE fournit une adresse visitable',()=>{
  const ctx=apiContext(null),siret='49141406600036';
  const raw={siren:'491414066',nom_complet:'NOUVELLE GENERATION ELECTRIQUE (NGE)',nom_raison_sociale:'NOUVELLE GENERATION ELECTRIQUE',matching_etablissements:[{siret,adresse:'IMMEUBLE BEL CANTO 43 B BOULEVARD PIERRE SEMARD 06300 NICE',code_postal:'06300',libelle_commune:'NICE'}],siege:{siret,numero_voie:'43',indice_repetition:'B',type_voie:'BOULEVARD',libelle_voie:'PIERRE SEMARD',complement_adresse:'IMMEUBLE BEL CANTO',code_postal:'06300',libelle_commune:'NICE',etat_administratif:'A'}};
  const mapped=ctx.EUC_ENT_mapperReponseApi(raw,siret);
  assert.equal(mapped.numeroVoie,'43 B BOULEVARD PIERRE SEMARD');assert.equal(mapped.complementAdresse,'IMMEUBLE BEL CANTO');assert.equal(mapped.codePostal,'06300');assert.equal(mapped.commune,'NICE');
});

test('la vérification officielle navigateur reste disponible pour l’enregistrement final',()=>{
  const cache={},siret='49141406600036',ctx={CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;}})},EUC_ENT_traiterReponseApiNavigateur:()=>({source:'api',entreprise:{siret,raisonSociale:'NOUVELLE GENERATION ELECTRIQUE',numeroVoie:'43 B BOULEVARD PIERRE SEMARD',complementAdresse:'IMMEUBLE BEL CANTO',codePostal:'06300',commune:'NICE',pays:'France'}})};
  let searches=0;ctx.EUC_ENT_rechercherSiret=()=>{searches++;return{source:'api_navigateur',siret,url:'https://example.invalid'};};vm.createContext(ctx);vm.runInContext(strict,ctx);
  const first=ctx.EUC_V161_traiterSiretFranceNavigateur({},siret),saved=ctx.EUC_V161_verifierSiretFrance(siret);
  assert.equal(first.entrepriseAdresse,'43 B BOULEVARD PIERRE SEMARD');assert.equal(saved.entrepriseAdresse,first.entrepriseAdresse);assert.equal(searches,0);
});

test('une identité sans rue n’est jamais marquée vérifiée',()=>{
  const ctx={CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{}})}};vm.createContext(ctx);vm.runInContext(strict,ctx);
  const out=ctx.EUC_V161_mapperEntrepriseFrance_({entreprise:{raisonSociale:'TEST',codePostal:'06300',commune:'NICE'}},'49141406600036');
  assert.equal(out.found,false);assert.equal(out.incomplete,true);assert.deepEqual(Array.from(out.champsManquants),['adresse']);
});

if(!process.exitCode)console.log(`\n${n} tests DEV527 garde-fous adresse SIRET réussis.`);
