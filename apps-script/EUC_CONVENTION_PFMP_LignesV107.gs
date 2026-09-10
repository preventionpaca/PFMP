/** Eucalyptus PFMP — v1.0.0-dev.107 — modèles de lignes de convention pilotés par Grist. */
var EUC_CONVENTION_LIGNES_TABLE_='EUC_PARAMETRES_LIGNES_CONVENTION';

function EUC_CONVENTION_modelesLignesDefautV107_(){
  return [
    {Cle:'PERIODE_L1',Modele:'du **{{DATE_DEBUT}}** au **{{DATE_FIN}}**',Taille_police:8.0,Gras:false,Ordre:10},
    {Cle:'PERIODE_L2',Modele:'soit **{{NB_JOURS}}** jours',Taille_police:7.0,Gras:false,Ordre:20},
    {Cle:'CLASSE_LIGNE',Modele:'Classe : **{{CLASSE}}**',Taille_police:8.0,Gras:false,Ordre:30},
    {Cle:'ELEVE_LIGNE',Modele:'**{{NOM_PRENOM}}**    Né(e) le : **{{DATE_NAISSANCE}}**',Taille_police:7.0,Gras:false,Ordre:40},
    {Cle:'ADRESSE_ELEVE_LIGNE',Modele:'Adresse personnelle : **{{ADRESSE_ELEVE_COMPLETE}}**',Taille_police:6.5,Gras:false,Ordre:50},
    {Cle:'CONTACT_ELEVE_LIGNE',Modele:'N° de téléphone : **{{TEL_ELEVE}}**    e-mail : **{{EMAIL_ELEVE}}**',Taille_police:6.4,Gras:false,Ordre:60},
    {Cle:'DIPLOME_LIGNE',Modele:'Diplôme préparé : **{{DIPLOME}}**',Taille_police:7.0,Gras:false,Ordre:70},
    {Cle:'ETABLISSEMENT_LIGNE',Modele:'**{{ETABLISSEMENT}}**    {{ADRESSE_ETAB}}    Tél : **{{TEL_ETAB}}**',Taille_police:6.2,Gras:false,Ordre:80},
    {Cle:'PROVISEUR_LIGNE',Modele:'Représenté par Monsieur **{{PROVISEUR}}** en qualité de {{FONCTION_PROVISEUR}}    e-mail : **{{EMAIL_ETAB}}**',Taille_police:6.1,Gras:false,Ordre:90},
    {Cle:'PROF_LIGNE',Modele:'Professeur référent : **{{PROF_REFERENT}}**    e-mail : **{{EMAIL_PROF}}**',Taille_police:6.1,Gras:false,Ordre:100},
    {Cle:'PROF_SIGNATURE_LIGNE',Modele:'**{{PROF_REFERENT}}**',Taille_police:5.8,Gras:false,Ordre:110},
    {Cle:'REFERENCE_LIGNE',Modele:'Réf. {{REFERENCE}}',Taille_police:5.0,Gras:false,Ordre:120}
  ];
}

function EUC_CONVENTION_assurerTableLignesV107_(){
  var t=EUC_CONVENTION_LIGNES_TABLE_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;});
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:[
      {id:'Cle',fields:{label:'Clé',type:'Text'}},
      {id:'Modele',fields:{label:'Modèle de ligne',type:'Text'}},
      {id:'Taille_police',fields:{label:'Taille police',type:'Numeric'}},
      {id:'Gras',fields:{label:'Gras ligne entière',type:'Bool'}},
      {id:'Actif',fields:{label:'Actif',type:'Bool'}},
      {id:'Ordre',fields:{label:'Ordre',type:'Int'}}
    ]}]});
  }
  var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/records'),rows=raw.records||[],present={};
  rows.forEach(function(r){present[String((r.fields||{}).Cle||'').trim()]=true;});
  var missing=EUC_CONVENTION_modelesLignesDefautV107_().filter(function(d){return !present[d.Cle];});
  if(missing.length){EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/records',{records:missing.map(function(d){return {fields:{Cle:d.Cle,Modele:d.Modele,Taille_police:d.Taille_police,Gras:d.Gras,Actif:true,Ordre:d.Ordre}};})});}
  return {ok:true,table:t,creee:!exists,ajoutees:missing.map(function(d){return d.Cle;})};
}

function EUC_CONVENTION_lireModelesLignesV107_(){
  EUC_CONVENTION_assurerTableLignesV107_();
  var defs=EUC_CONVENTION_modelesLignesDefautV107_(),fallback={};defs.forEach(function(d){fallback[d.Cle]=d;});
  var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_LIGNES_TABLE_)+'/records'),out={};
  (raw.records||[]).forEach(function(r){var f=r.fields||{},cle=String(f.Cle||'').trim();if(!cle||f.Actif===false)return;var d=fallback[cle]||{};out[cle]={modele:String(f.Modele||d.Modele||''),taille:Number(f.Taille_police||d.Taille_police||6),gras:f.Gras===true};});
  defs.forEach(function(d){if(!out[d.Cle])out[d.Cle]={modele:d.Modele,taille:d.Taille_police,gras:d.Gras};});
  return out;
}

function EUC_CONVENTION_variablesLignesV107_(data){
  data=data||{};var e=data.eleve||{},et=data.etablissement||{};
  var adresse=[String(e.adresse||'').trim(),[String(e.codePostal||'').trim(),String(e.ville||'').trim()].filter(Boolean).join(' ')].filter(Boolean).join(' - ');
  return {
    DATE_DEBUT:data.debutCourt||data.debut||'',DATE_FIN:data.finCourt||data.fin||'',NB_JOURS:String(data.jours||0),CLASSE:data.classe||'',
    NOM_PRENOM:[e.nom||'',e.prenom||''].filter(Boolean).join(' '),DATE_NAISSANCE:e.dateNaissance||'',ADRESSE_ELEVE_COMPLETE:adresse,
    TEL_ELEVE:e.telephone||'',EMAIL_ELEVE:e.courriel||'',DIPLOME:data.diplome||e.formation||'',
    ETABLISSEMENT:et.libelle||'',ADRESSE_ETAB:et.adresse||'',TEL_ETAB:et.telephone||'',PROVISEUR:et.proviseur||'',
    FONCTION_PROVISEUR:et.fonctionProviseur||'',EMAIL_ETAB:et.email||'',PROF_REFERENT:data.professeurReferent||'',EMAIL_PROF:data.professeurReferentEmail||'',REFERENCE:data.reference||''
  };
}

function EUC_CONVENTION_rendreModeleLigneV107_(modele,vars){
  return String(modele||'').replace(/\{\{([A-Z0-9_]+)\}\}/g,function(_,k){return Object.prototype.hasOwnProperty.call(vars,k)?String(vars[k]||''):'';}).replace(/\s{5,}/g,'    ').trim();
}

function EUC_CONVENTION_rendreLignesV107_(data,modeles){
  var vars=EUC_CONVENTION_variablesLignesV107_(data),out={};
  Object.keys(modeles||{}).forEach(function(cle){var m=modeles[cle]||{};out[cle]={texte:EUC_CONVENTION_rendreModeleLigneV107_(m.modele,vars),taille:Number(m.taille||6),gras:m.gras===true};});
  return out;
}

function EUC_CONVENTION_parametresLignesInfoV107(){EUC_PDF_exigerAdmin_();return {version:'v1.0.0-dev.107',table:EUC_CONVENTION_LIGNES_TABLE_,modeles:EUC_CONVENTION_lireModelesLignesV107_()};}
