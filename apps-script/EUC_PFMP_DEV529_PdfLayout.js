/**
 * PFMP DEV529 - placement paramétrable des surimpressions de convention.
 *
 * Les coordonnées restent hors Grist : elles décrivent uniquement la mise en
 * page du PDF et sont conservées dans les propriétés du projet Apps Script.
 * L'origine PDF est le coin inférieur gauche ; X augmente vers la droite et Y
 * vers le haut. Les dimensions sont exprimées en points (1 mm = 2,835 pt).
 */
var EUC_DEV529_VERSION_='1.0.0-dev.529';
var EUC_DEV529_LAYOUT_PROP_='EUC_PFMP_PDF_LAYOUT_V529';
var EUC_DEV529_LAYOUT_MEMO_=null;

function EUC_DEV529_layoutDefaults_(){return [
  {cle:'PERIODE_LIGNE',libelle:'Période',page:1,x:95,y:771,w:278,h:23,ordre:10,type:'TEXTE'},
  {cle:'CLASSE_LIGNE',libelle:'Classe',page:1,x:378,y:771,w:80,h:23,ordre:20,type:'TEXTE'},
  {cle:'ELEVE_LIGNE',libelle:'Élève et naissance',page:1,x:24,y:756,w:432,h:13,ordre:30,type:'TEXTE'},
  {cle:'ADRESSE_ELEVE_LIGNE',libelle:'Adresse élève',page:1,x:24,y:744,w:432,h:12,ordre:40,type:'TEXTE'},
  {cle:'CONTACT_ELEVE_LIGNE',libelle:'Téléphone et courriel élève',page:1,x:24,y:732,w:432,h:12,ordre:50,type:'TEXTE'},
  {cle:'DIPLOME_LIGNE',libelle:'Diplôme préparé',page:1,x:24,y:714,w:432,h:15,ordre:60,type:'TEXTE'},
  {cle:'ETABLISSEMENT_LIGNE',libelle:'Établissement',page:1,x:24,y:695,w:432,h:14,ordre:70,type:'TEXTE'},
  {cle:'PROVISEUR_LIGNE',libelle:'Proviseur',page:1,x:24,y:680,w:432,h:14,ordre:80,type:'TEXTE'},
  {cle:'PROF_LIGNE',libelle:'Professeur référent',page:1,x:24,y:665,w:432,h:14,ordre:90,type:'TEXTE'},
  /* Le QR descend de 12 pt par rapport à l'ancienne position afin de rester
   * sous le bord supérieur du tableau sur le modèle agrandi. */
  {cle:'QR',libelle:'QR code',page:1,x:468,y:704,w:92,h:92,ordre:95,type:'QR'},
  {cle:'PROF_SIGNATURE_LIGNE',libelle:'Professeur - cadre de signature',page:2,x:330,y:115,w:160,h:18,ordre:100,type:'TEXTE'},
  {cle:'REFERENCE_LIGNE',libelle:'Référence de convention',page:2,x:405,y:43,w:165,h:13,ordre:110,type:'TEXTE'}
];}
function EUC_DEV529_num_(value,fallback){var n=Number(value);return isFinite(n)?n:Number(fallback);}
function EUC_DEV529_round_(value){return Math.round(Number(value)*10)/10;}
function EUC_DEV529_validate_(candidate,def){
  candidate=candidate||{};def=def||{};
  var page=Math.round(EUC_DEV529_num_(candidate.page,def.page)),x=EUC_DEV529_round_(EUC_DEV529_num_(candidate.x,def.x)),y=EUC_DEV529_round_(EUC_DEV529_num_(candidate.y,def.y)),w=EUC_DEV529_round_(EUC_DEV529_num_(candidate.w,def.w)),h=EUC_DEV529_round_(EUC_DEV529_num_(candidate.h,def.h));
  if(page<1||page>2)throw new Error('Mise en page '+def.cle+' : la page doit être 1 ou 2.');
  if(x<0||y<0||w<4||h<4||x+w>595||y+h>842)throw new Error('Mise en page '+def.cle+' : la zone doit rester dans la page A4 (595 x 842 pt).');
  return {cle:def.cle,libelle:def.libelle,page:page,x:x,y:y,w:w,h:h,ordre:def.ordre,type:def.type};
}
function EUC_DEV529_lireMiseEnPage_(){
  if(EUC_DEV529_LAYOUT_MEMO_)return EUC_DEV529_LAYOUT_MEMO_.map(function(item){return Object.assign({},item);});
  var stored={};
  try{stored=JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV529_LAYOUT_PROP_)||'{}')||{};}catch(e){stored={};}
  EUC_DEV529_LAYOUT_MEMO_=EUC_DEV529_layoutDefaults_().map(function(def){
    try{return EUC_DEV529_validate_(stored[def.cle],def);}catch(eInvalid){return EUC_DEV529_validate_({},def);}
  });
  return EUC_DEV529_LAYOUT_MEMO_.map(function(item){return Object.assign({},item);});
}
function EUC_CONVENTION_listerMiseEnPageV529(){
  EUC_PDF_exigerAdmin_();
  return {version:EUC_DEV529_VERSION_,page:{largeur:595,hauteur:842,unite:'point'},items:EUC_DEV529_lireMiseEnPage_()};
}
function EUC_CONVENTION_enregistrerMiseEnPageV529(items){
  EUC_PDF_exigerAdmin_();items=items||[];
  var incoming={};items.forEach(function(item){incoming[String(item&&item.cle||'').trim()]=item||{};});
  var saved={},validated=EUC_DEV529_layoutDefaults_().map(function(def){var item=EUC_DEV529_validate_(incoming[def.cle],def);saved[def.cle]={page:item.page,x:item.x,y:item.y,w:item.w,h:item.h};return item;});
  PropertiesService.getScriptProperties().setProperty(EUC_DEV529_LAYOUT_PROP_,JSON.stringify(saved));
  EUC_DEV529_LAYOUT_MEMO_=validated;
  return {ok:true,total:validated.length,items:validated};
}
function EUC_CONVENTION_apercuMiseEnPageV529(){
  EUC_PDF_exigerAdmin_();
  return {pdfBase64:EUC_PDF_modeleBase64_(),items:EUC_DEV529_lireMiseEnPage_(),largeur:595,hauteur:842};
}
function EUC_DEV529_miseEnPagePayload_(){
  var out={};EUC_DEV529_lireMiseEnPage_().forEach(function(item){out[item.cle]={p:item.page-1,x:item.x,y:item.y,w:item.w,h:item.h};});return out;
}
