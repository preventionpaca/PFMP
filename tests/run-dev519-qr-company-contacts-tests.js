const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const consolidation=read('EUC_PFMP_DEV340_ConsolidationLive.js');
const family=read('EUC_PFMP_DEV339_FamilleUX.js');
const qr=read('PFMP_Acces_QR_V116.html');

let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}

function context(referenceRows){
  const reads=[];
  const c={console,Date,Math,JSON,String,Number,Object,Array,RegExp,isFinite,
    EUC_IMPORT_dateExistanteISO_:v=>String(v||''),
    EUC_DEV190G_fastRecords_:(table,filter)=>{reads.push({table,filter});return referenceRows[table]||[];}
  };
  vm.createContext(c);vm.runInContext(consolidation,c);c.__reads=reads;return c;
}

test('les coordonnées PFMP sont enrichies en une lecture groupée des fiches liées',()=>{
  const c=context({
    EUC_ENTREPRISES:[{id:11,fields:{Telephone:'04 93 00 00 00',Courriel:'accueil@example.test'}}],
    EUC_CONTACTS_ENTREPRISES:[{id:21,fields:{Prenom:'Rita',Nom:'Responsable',Telephone_direct:'06 11 11 11 11',Courriel_direct:'rita@example.test'}}]
  });
  const out=c.EUC_DEV519_enrichAccessCompanyContacts_([{id:1,Entreprise:[11],Contact_entreprise:[21]}]);
  assert.equal(out[0].Entreprise_telephone,'04 93 00 00 00');
  assert.equal(out[0].Entreprise_courriel,'accueil@example.test');
  assert.equal(out[0].Responsable_prenom,'Rita');
  assert.equal(out[0].Responsable_nom,'Responsable');
  assert.equal(out[0].Responsable_telephone,'06 11 11 11 11');
  assert.equal(out[0].Responsable_courriel,'rita@example.test');
  assert.deepEqual(c.__reads.map(x=>x.table),['EUC_ENTREPRISES','EUC_CONTACTS_ENTREPRISES']);
});

test('une entreprise sans référence directe est retrouvée par son SIRET sans choix ambigu de contact',()=>{
  const c=context({
    EUC_ENTREPRISES:[{id:12,fields:{SIRET:'123 456 789 00012',Telephone:'04 93 12 12 12',Courriel:'societe@example.test'}}],
    EUC_CONTACTS_ENTREPRISES:[{id:22,fields:{Entreprise:[12],Actif:true,Prenom:'Unique',Nom:'Contact',Telephone_direct:'06 12 12 12 12',Courriel_direct:'unique@example.test'}}]
  });
  const out=c.EUC_DEV519_enrichAccessCompanyContacts_([{id:3,Entreprise_siret:'12345678900012'}]);
  assert.equal(out[0].Entreprise_telephone,'04 93 12 12 12');
  assert.equal(out[0].Entreprise_courriel,'societe@example.test');
  assert.equal(out[0].Responsable_nom,'Contact');
  assert.equal(out[0].Responsable_prenom,'Unique');
});

test('le responsable est distingué du tuteur quand plusieurs contacts existent',()=>{
  const c=context({
    EUC_ENTREPRISES:[{id:12,fields:{SIRET:'12345678900012'}}],
    EUC_CONTACTS_ENTREPRISES:[
      {id:31,fields:{Entreprise:[12],Actif:true,Type_contact:'Tuteur',Prenom:'Tom',Nom:'Tuteur',Telephone_direct:'06 30 00 00 00'}},
      {id:32,fields:{Entreprise:[12],Actif:true,Type_contact:'Responsable entreprise',Prenom:'Rita',Nom:'Direction',Telephone_direct:'06 31 00 00 00',Courriel_direct:'rita@example.test'}}
    ]
  });
  const out=c.EUC_DEV519_enrichAccessCompanyContacts_([{id:4,Entreprise:[12]}]);
  assert.equal(out[0].Responsable_prenom,'Rita');
  assert.equal(out[0].Responsable_nom,'Direction');
  assert.equal(out[0].Responsable_telephone,'06 31 00 00 00');
});

test('deux responsables possibles ne sont jamais choisis arbitrairement',()=>{
  const c=context({
    EUC_ENTREPRISES:[{id:12,fields:{}}],
    EUC_CONTACTS_ENTREPRISES:[
      {id:41,fields:{Entreprise:[12],Actif:true,Type_contact:'Responsable',Nom:'Premier'}},
      {id:42,fields:{Entreprise:[12],Actif:true,Type_contact:'Direction',Nom:'Second'}}
    ]
  });
  const out=c.EUC_DEV519_enrichAccessCompanyContacts_([{id:5,Entreprise:[12]}]);
  assert.equal(out[0].Responsable_nom,'');
});

test('les anciens alias et le tuteur responsable alimentent la colonne responsable',()=>{
  const c=context({});
  const alias=c.EUC_DEV519_enrichAccessCompanyContacts_([{Nom_responsable_entreprise:'Nom historique',Prenom_responsable_entreprise:'Prénom',Telephone_responsable:'04 93 00 00 00',Courriel_responsable:'resp@example.test'}])[0];
  assert.equal(alias.Responsable_nom,'Nom historique');
  assert.match(c.EUC_DEV340_contact_(alias),/Prénom Nom historique · 04 93 00 00 00 · resp@example\.test/);
  const same=c.EUC_DEV519_enrichAccessCompanyContacts_([{Tuteur_est_responsable:true,Tuteur_prenom:'Tom',Tuteur_nom:'Tuteur',Tuteur_telephone:'06 12 34 56 78',Tuteur_courriel:'tom@example.test'}])[0];
  assert.match(c.EUC_DEV340_contact_(same),/Tom Tuteur · 06 12 34 56 78 · tom@example\.test/);
});

test('les alias historiques JotForm conservent le responsable et les coordonnées générales',()=>{
  const c=context({});
  const row=c.EUC_DEV519_enrichAccessCompanyContacts_([{
    SIRET_brut:'123 456 789 00012',Entreprise_saisie:'SOCIETE TEST',Nom_commercial:'ATELIER TEST',
    Adresse_entreprise:'1 RUE DU TEST',CP_entreprise:'06000',Ville_entreprise:'NICE',
    Telephone_entreprise:'04 93 10 20 30',Email_entreprise:'accueil@example.test',
    Nom_representant:'Direction',Prenom_representant:'Rita',
    Telephone_representant:'06 10 20 30 40',Email_representant:'rita@example.test'
  }])[0];
  assert.equal(row.Entreprise_raison_sociale,'SOCIETE TEST');
  assert.equal(row.Entreprise_enseigne,'ATELIER TEST');
  assert.equal(row.Entreprise_telephone,'04 93 10 20 30');
  assert.equal(row.Entreprise_courriel,'accueil@example.test');
  assert.equal(row.Responsable_nom,'Direction');
  assert.equal(row.Responsable_prenom,'Rita');
  assert.match(c.EUC_DEV340_contact_(row),/Rita Direction · 06 10 20 30 40 · rita@example\.test/);
  const compact=c.EUC_DEV340_compactAccess_(row);
  assert.equal(compact.Entreprise_telephone,'04 93 10 20 30');
  assert.equal(compact.Responsable_courriel,'rita@example.test');
});

test('le rendu utilise les coordonnées générales de l’entreprise en dernier recours',()=>{
  const c=context({});
  c.EUC_V155_contactEntreprise_=()=>'';
  assert.equal(c.EUC_DEV340_contact_({Entreprise_telephone:'04 93 10 20 30',Entreprise_courriel:'accueil@example.test'}),'04 93 10 20 30 · accueil@example.test');
});

test('les instantanés de la convention restent prioritaires et évitent les lectures inutiles',()=>{
  const c=context({});
  const out=c.EUC_DEV519_enrichAccessCompanyContacts_([{
    id:2,Entreprise:11,Contact_entreprise:21,
    Entreprise_telephone_snapshot:'04 93 22 22 22',Entreprise_courriel_snapshot:'historique@example.test',
    Responsable_nom:'Nom signé',Responsable_prenom:'Prénom signé',
    Responsable_telephone:'06 22 22 22 22',Responsable_courriel:'signe@example.test'
  }]);
  assert.equal(out[0].Entreprise_telephone,'04 93 22 22 22');
  assert.equal(out[0].Entreprise_courriel,'historique@example.test');
  assert.equal(out[0].Responsable_nom,'Nom signé');
  assert.equal(c.__reads.length,0);
  const compact=c.EUC_DEV340_compactAccess_(out[0]);
  assert.equal(compact.Entreprise_telephone,'04 93 22 22 22');
  assert.equal(compact.Contact_entreprise,21);
});

test('le chargement familial applique l’enrichissement avant de construire les lignes',()=>{
  assert.match(family,/rows=EUC_DEV519_enrichAccessCompanyContacts_\(rows\)/);
  assert.match(consolidation,/jamais une requête Grist par élève/);
});

test('le préremplissage QR recalcule le SIRET et identifie le champ invalide',()=>{
  assert.match(qr,/Un remplissage JavaScript ne déclenche pas l'évènement input[\s\S]*?controleSiret\(\)/);
  assert.match(qr,/const badLabel = bad && \(labels\[bad\.name\]/);
  assert.match(qr,/le champ « '\+badLabel\+' » est incomplet ou incorrect/);
});

test('la case tuteur identique retire réellement les obligations des champs masqués',()=>{
  const script=(qr.match(/<script id="EUC_REQUIRED_CONTACTS_FIX11">([\s\S]*?)<\/script>/)||[])[1];
  assert.ok(script,'script de validation des contacts introuvable');
  const listeners={},fields={};
  ['responsableNom','responsablePrenom','responsableFonction','responsableTelephone','responsableCourriel','tuteurNom','tuteurPrenom','tuteurFonction','tuteurTelephone','tuteurCourriel'].forEach(name=>{
    fields[name]={name,id:name,value:'',required:false,setAttribute(){},closest(){return null;},focus(){}};
  });
  fields.tuteurEstResponsable={name:'tuteurEstResponsable',checked:true,addEventListener(type,fn){listeners[type]=fn;}};
  const save={addEventListener(type,fn){listeners['save-'+type]=fn;}};
  const document={readyState:'complete',querySelector(sel){const m=/\[name="([^"]+)"\]/.exec(sel);return m?fields[m[1]]||null:null;},getElementById(id){return id==='save'?save:(fields[id]||null);},createElement(){throw new Error('aucune étoile ne doit être créée sans label');}};
  const c={console,document,field:name=>fields[name]||null,msg(){}};vm.createContext(c);vm.runInContext(script,c);
  assert.equal(fields.responsableNom.required,true);
  ['tuteurNom','tuteurPrenom','tuteurFonction','tuteurTelephone','tuteurCourriel'].forEach(name=>assert.equal(fields[name].required,false,name));
  fields.tuteurEstResponsable.checked=false;listeners.change();
  ['tuteurNom','tuteurPrenom','tuteurFonction','tuteurTelephone','tuteurCourriel'].forEach(name=>assert.equal(fields[name].required,true,name));
});

if(!process.exitCode)console.log(`\n${n} tests DEV519 QR et coordonnées entreprise réussis.`);
