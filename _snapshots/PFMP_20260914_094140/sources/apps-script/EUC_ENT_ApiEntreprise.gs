/** Eucalyptus Entreprises SIRET — v1.0.0-dev.8 */
function EUC_ENT_rechercherSiret(valeur) {
  EUC_ENT_controlerAccesUtilisateur_();
  var v=EUC_ENT_validerSiret(valeur); if(!v.valide) throw new Error(v.message);
  var existante=EUC_ENT_verifierDoublonGrist(v.siret); if(existante) return {source:'grist',entreprise:EUC_ENT_mapperEntrepriseGrist_(existante)};
  var c=EUC_ENT_lireConfiguration(); var base=c.EUC_ENT_API_RECHERCHE_URL||'https://recherche-entreprises.api.gouv.fr/search';
  if(base!=='https://recherche-entreprises.api.gouv.fr/search') throw new Error('URL de l’API Recherche d’entreprises non autorisée.');
  return {source:'api_navigateur',siret:v.siret,url:base+'?q='+encodeURIComponent(v.siret)+'&page=1&per_page=1'};
}
function EUC_ENT_traiterReponseApiNavigateur(json,valeur) {
  EUC_ENT_controlerAccesUtilisateur_();
  var v=EUC_ENT_validerSiret(valeur); if(!v.valide) throw new Error(v.message);
  if(!json||!Array.isArray(json.results)||!json.results.length) return {source:'api',introuvable:true};
  return {source:'api',entreprise:EUC_ENT_mapperReponseApi(json.results[0],v.siret)};
}
function EUC_ENT_mapperReponseApi(u,siret) {
  var candidats=(u.matching_etablissements||[]).concat(u.siege?[u.siege]:[]), e=null;
  candidats.some(function(x){if(String(x.siret)===siret){e=x;return true;}return false;}); e=e||{};
  if(u.siege&&String(u.siege.siret)===siret)e=Object.assign({},u.siege,e);
  var adresse=EUC_ENT_normaliserAdresse_({numero:e.numero_voie,indice:e.indice_repetition,typeVoie:e.type_voie,voie:e.libelle_voie,complement:e.complement_adresse,codePostal:e.code_postal,ville:e.libelle_commune_etranger||e.libelle_commune,pays:e.libelle_pays_etranger||'France',codePays:e.code_pays_etranger,adresseComplete:e.adresse||e.geo_adresse});
  return {siret:siret,siren:u.siren||siret.slice(0,9),raisonSociale:u.nom_raison_sociale||u.nom_complet||'',enseigne:e.nom_commercial||(e.liste_enseignes||[])[0]||'',estSiege:!!e.est_siege,etat:e.etat_administratif==='A'?'Actif':'Fermé',formeJuridique:u.nature_juridique||'',codeApe:e.activite_principale||u.activite_principale||'',libelleActivite:'',dateCreation:e.date_creation||'',complementAdresse:adresse.complement,numeroVoie:adresse.adresse,codePostal:adresse.codePostal,commune:adresse.ville,pays:adresse.pays,adresseComplete:adresse.adresse,diffusionPartielle:(u.statut_diffusion!=='O'||e.statut_diffusion_etablissement!=='O')};
}
function EUC_ENT_echapperRegExp_(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function EUC_ENT_normaliserAdresse_(d){
  d=d||{};var espace=function(v){return String(v||'').trim().replace(/\s+/g,' ');};
  var cp=espace(d.codePostal),ville=espace(d.ville),pays=espace(d.pays)||'France',structuree=[espace(d.numero),espace(d.indice),espace(d.typeVoie),espace(d.voie)].filter(Boolean).join(' '),adresse=structuree||espace(d.adresseComplete);
  if(!structuree&&adresse)adresse=EUC_ENT_nettoyerSuffixesAdresse_(adresse,cp,ville,pays);
  return EUC_ENT_appliquerCodePostalMonaco_({adresse:adresse,complement:espace(d.complement),codePostal:cp,ville:ville,pays:pays},d.codePays);
}
function EUC_ENT_appliquerCodePostalMonaco_(adresseNormalisee,codePays){
  var a=Object.assign({},adresseNormalisee||{}),normaliser=EUC_ENT_normaliserComparaison_,pays=normaliser(a.pays),ville=normaliser(a.ville).replace(/[\s-]+/g,''),code=normaliser(codePays);
  var estMonaco=pays==='MONACO'||code==='MC'||code==='MCO'||((ville==='MONACO'||ville==='MONTECARLO')&&pays==='MONACO');
  if(!String(a.codePostal||'').trim()&&estMonaco)a.codePostal='98000';
  return a;
}
function EUC_ENT_normaliserComparaison_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
function EUC_ENT_nettoyerSuffixesAdresse_(adresse,codePostal,ville,pays){
  var mots=String(adresse||'').trim().replace(/\s+/g,' ').split(' ').filter(Boolean),suffixes=[codePostal,ville,pays,'MC','MCO','FR','FRA'].filter(Boolean).map(function(v){return String(v).trim().split(/\s+/);}),change=true;
  while(change&&mots.length){change=false;for(var i=0;i<suffixes.length;i++){var s=suffixes[i];if(s.length>mots.length)continue;var ok=true;for(var j=0;j<s.length;j++)if(EUC_ENT_normaliserComparaison_(mots[mots.length-s.length+j])!==EUC_ENT_normaliserComparaison_(s[j])){ok=false;break;}if(ok){mots.splice(mots.length-s.length,s.length);change=true;break;}}}
  return mots.join(' ');
}
function EUC_ENT_mapperEntrepriseGrist_(r){
  var a=EUC_ENT_normaliserAdresse_({adresseComplete:r.Adresse||r.Adresse_complete,complement:r.Complement_adresse,codePostal:r.Code_postal,ville:r.Commune,pays:r.Pays||'France'});
  return {id:r.id,siret:r.SIRET||'',raisonSociale:r.Raison_sociale||'',enseigne:r.Enseigne||'',adresseComplete:a.adresse,numeroVoie:a.adresse,complementAdresse:a.complement,codePostal:a.codePostal,commune:a.ville,pays:a.pays,etat:r.Etat||''};
}
