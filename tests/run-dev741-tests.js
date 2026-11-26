'use strict';
/* DEV741 : recherche dans « Soumissions à traiter » (données fictives). */
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','apps-script','Soumissions_A_Traiter_DEV665.html'),'utf8');
let n=0;function t(nom,f){f();n++;}
const extraire=nom=>{const i=html.indexOf('function '+nom+'(');assert(i>=0,nom);let j=html.indexOf('{',i),d=0;for(;j<html.length;j++){if(html[j]==='{')d++;else if(html[j]==='}'&&!--d)break;}return html.slice(i,j+1);};
const ctx={};vm.createContext(ctx);
vm.runInContext(['sansAccent741','texte741','correspond741'].map(extraire).join('\n'),ctx);
const q=s=>ctx.sansAccent741(s).split(/\s+/).filter(Boolean);
const x={eleve:'Élodie Testeur',classe:'1MV-A',numero:'2026-0042',numeroSaisi:'12345678901234',periode:'2',saisie:{nom:'Garage Fictif',ville:'Nice'},officiel:{nom:'FICTIF AUTOMOBILES',ville:'NICE'}};
t('champ de recherche présent',()=>{assert(/id="recherche"/.test(html));assert(/\$\('recherche'\)\.oninput=function\(\)\{dessiner\(\);\}/.test(html));});
t('casse et accents ignorés',()=>{assert(ctx.correspond741(x,q('elodie')));assert(ctx.correspond741(x,q('TESTEUR')));});
t('entreprise saisie ou officielle, SIRET, dépôt, classe',()=>{['garage','automobiles','1234567','0042','1mv'].forEach(m=>assert(ctx.correspond741(x,q(m)),m));});
t('tous les mots doivent figurer',()=>{assert(ctx.correspond741(x,q('fictif nice')));assert(!ctx.correspond741(x,q('fictif cannes')));});
t('recherche vide : tout passe, champs absents tolérés',()=>{assert(ctx.correspond741(x,q('  ')));assert(ctx.correspond741({},[]));assert(!ctx.correspond741({},q('x')));});
t('filtre appliqué après le filtre d’onglet, message sans résultat',()=>{assert(/l=l\.filter\(function\(x\)\{return correspond741\(x,q741\);\}\)/.test(html));assert(/Aucun dépôt ne correspond/.test(html));});
console.log(n+' tests DEV741 réussis.');
