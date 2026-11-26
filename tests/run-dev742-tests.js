'use strict';
/* DEV742 : établissement fermé administrativement : saisie de l'élève bloquée (déclaration en ligne et QR code). Données fictives. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const test=(nom,fn)=>{fn();n++;};
const J=x=>JSON.parse(JSON.stringify(x));
const c={console,JSON,Object,String,Number,Date,Array,RegExp,Error};
c.EUC_CONVENTION_resumeSignatureV134_=s=>'sig'+s.length;
c.Utilities={Charset:{UTF_8:1},base64EncodeWebSafe:s=>Buffer.from(s).toString('base64'),base64DecodeWebSafe:s=>Buffer.from(s,'base64'),newBlob:b=>({getDataAsString:()=>Buffer.from(b).toString('utf8')})};
const cache={};c.CacheService={getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;}})};
vm.createContext(c);
vm.runInContext(read('apps-script/EUC_DEV742_EtablissementFerme.js'),c);
vm.runInContext(read('apps-script/EUC_SIRET_NIS_StrictV161.gs'),c);
const MSG=c.EUC_DEV742_MESSAGE_;
const fiche=etat=>({entreprise:{raisonSociale:'GARAGE FICTIF',numeroVoie:'1 RUE DES ESSAIS',codePostal:'06000',commune:'NICE',etat:etat}});

test('message demandé : fermé administrativement, contacter l’entreprise (erreur de SIRET), bureau G205',()=>{
  assert.match(MSG,/^Votre saisie est impossible car l’établissement est fermé administrativement\./);
  assert.match(MSG,/contacter l’entreprise/);assert.match(MSG,/erreur de numéro SIRET/);assert.match(MSG,/bureau G205/);});
test('fermé reconnu (Fermé, fermé, FERME), actif ou inconnu non bloqué',()=>{
  ['Fermé','fermé',' FERME '].forEach(e=>assert.equal(c.EUC_DEV742_ferme_({etat:e}),true,e));
  ['Actif','',undefined,null].forEach(e=>assert.equal(c.EUC_DEV742_ferme_({etat:e}),false,String(e)));assert.equal(c.EUC_DEV742_ferme_(null),false);});
test('QR code : SIRET fermé jamais « trouvé », ni preuve d’enregistrement, ni cache ; message pour l’élève',()=>{
  const d=J(c.EUC_V161_mapperEntrepriseFrance_(fiche('Fermé'),'12345678900017'));
  assert.equal(d.found,false);assert.equal(d.ferme,true);assert.equal(d.message,MSG);assert.ok(!d.preuveEnregistrement);
  c.EUC_ENT_traiterReponseApiNavigateur=()=>fiche('Fermé');
  const r=J(c.EUC_V161_traiterSiretFranceNavigateur({},'12345678900017'));assert.equal(r.ferme,true);assert.ok(!r.preuveEnregistrement);
  assert.equal(Object.keys(cache).length,0,'rien en cache');
  const ok=J(c.EUC_V161_mapperEntrepriseFrance_(fiche('Actif'),'12345678900017'));assert.equal(ok.found,true);});
test('QR code : enregistrement refusé côté serveur avec le message',()=>{
  const s=read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs');
  const i=s.indexOf('if(officielFrance&&officielFrance.ferme)throw new Error(officielFrance.message||EUC_DEV742_MESSAGE_);'),j=s.indexOf("throw new Error('SIRET non retrouvé dans la base officielle");
  assert.ok(i>0&&i<j);});
test('déclaration en ligne : dépôt refusé côté serveur avant toute écriture',()=>{
  const s=read('apps-script/EUC_DEV603_Declaration.js'),i=s.indexOf('EUC_DEV742_ferme_(e)) throw new Error(EUC_DEV742_MESSAGE_)');
  assert.ok(i>0&&i<s.indexOf('var ent = { siret: siret',i)&&i<s.indexOf("EUC_ENT_grist('post'",s.indexOf('function EUC_DEV603_deposer')));});
test('pages élève : même texte que le serveur, saisie bloquée',()=>{
  const d=read('apps-script/Declaration_Entreprise_DEV603.html');
  assert.ok(d.includes("var MESSAGE_FERME_742='"+MSG+"'"));
  assert.match(d,/if\(\/\^ferm\/i\.test\(String\(e\.etat\|\|''\)\.trim\(\)\)\)\{SIRET=null;\$\('b3'\)\.disabled=true;/);
  const v117=read('apps-script/PFMP_Continuation_QR_V117.html');assert.ok(v117.includes("msg('"+MSG+"',true);return}"));
  const v116=read('apps-script/PFMP_Acces_QR_V116.html');
  assert.equal((v116.match(/status\((x|r)&&\1\.ferme\?\(\1\.message\|\|depotG205\(\)\):depotG205\(\),true\);\/\* DEV742 \*\//g)||[]).length,2);});
test('bureau : « fermé administrativement » à la place de « fermé selon l’INSEE »',()=>{
  ['apps-script/EUC_DEV665_DemandesAide.js','apps-script/EUC_DEV694_Depots.js','apps-script/Soumissions_A_Traiter_DEV665.html','apps-script/Declaration_Entreprise_DEV603.html'].forEach(f=>{
    const s=read(f);assert.ok(!/fermés? selon l’INSEE|indiqué comme fermé/.test(s),f);});
  assert.match(read('apps-script/EUC_DEV665_DemandesAide.js'),/Établissement fermé administrativement \(INSEE\) : vérifier le SIRET/);});
console.log(n+' tests DEV742 réussis.');
