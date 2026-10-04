'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','apps-script','EUC_PFMP_DEV370_AdminTools.js'),'utf8');
const ctx={console,JSON,String,Number,Boolean,Array,Object,Math,Date};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'EUC_PFMP_DEV370_AdminTools.js'});

assert.equal(ctx.EUC_DEV374_missionEligible_({apprenti:true,conventionId:0,statutCode:'APPRENTI'}),true,
  'un apprenti sans convention PFMP doit être visitable');
assert.equal(ctx.EUC_DEV374_missionEligible_({apprenti:false,conventionId:42,statutCode:'AVEC_CONVENTION'}),true,
  'un élève conventionné doit rester visitable');
assert.equal(ctx.EUC_DEV374_missionEligible_({apprenti:false,conventionId:0,statutCode:'SANS_CONVENTION'}),false,
  'un élève scolaire sans convention ne doit pas entrer dans un ordre de mission');
assert.equal(ctx.EUC_DEV374_missionEligible_({apprenti:false,conventionId:42,statutCode:'CONVENTION_INTERROMPUE'}),false,
  'une convention interrompue doit rester exclue');

ctx.EUC_DEV368_admin=()=>({autorise:true});
ctx.EUC_DEV368_mapTransport=()=>({
  '2026-2027|10|101|7':{mode:'Bus'},
  '2026-2027|10|101|8':{mode:'Train'}
});
ctx.EUC_DEV368_targets=()=>[{annee:'2026-2027',famille:'BACPRO',classeId:10,classe:'TCAR',periode:{id:101,libelle:'PFMP n°1',debut:'28/09/2026',fin:'16/10/2026'}}];
ctx.EUC_DEV374_missionDetail_=()=>({lignes:[
  {eleveId:7,nom:'APPRENTI',prenom:'Test',apprenti:true,statutCode:'APPRENTI',conventionId:0,professeurVisiteur:'M. VISITEUR',entreprise:'GARAGE ÉCOLE',adresseEntreprise:'1 rue Exemple'},
  {eleveId:8,nom:'SCOLAIRE',prenom:'Test',apprenti:false,statutCode:'AVEC_CONVENTION',conventionId:8,professeurVisiteur:'M. VISITEUR',entreprise:'ATELIER ÉCOLE',adresseEntreprise:'2 rue Exemple'},
  {eleveId:9,nom:'SANS',prenom:'Convention',apprenti:false,statutCode:'SANS_CONVENTION',conventionId:0,professeurVisiteur:'M. VISITEUR'}
]});

const out=ctx.EUC_DEV374_missions({annee:'2026-2027',famille:'BACPRO',classeId:10,periodeId:101});
assert.equal(out.groups.length,1);
assert.deepEqual(Array.from(out.groups[0].lignes,x=>x.eleve),['APPRENTI Test','SCOLAIRE Test']);
assert.equal(out.groups[0].lignes[0].entreprise,'GARAGE ÉCOLE');
assert.equal(out.groups[0].lignes[0].transport,'Bus');

console.log('✓ DEV439 apprentis inclus dans les ordres de mission');
