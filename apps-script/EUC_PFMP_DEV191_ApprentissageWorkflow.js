var EUC_DEV191_APP_TABLE_='EUC_APPRENTISSAGE_PFMP';
var EUC_DEV191_DASH_TABLE_='EUC_APPRENTISSAGE_DASHBOARD_SNAPSHOT';

function EUC_DEV191_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV191_norm_(v){
  return EUC_DEV191_txt_(v).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV191_siret_(v){return EUC_DEV191_txt_(v).replace(/\D/g,'').slice(0,14);}
function EUC_DEV191_refId_(v){
  if(typeof v==='number')return v;
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++)if(typeof v[i]==='number')return v[i];
  }
  return Number(v)||0;
}
function EUC_DEV191_tables_(){return (EUC_DEV190_api_('get','/tables',null).tables||[]);}
function EUC_DEV191_cols_(t){return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(t)+'/columns',null).columns||[]);}
function EUC_DEV191_records_(t){return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(t)+'/records',null).records||[]);}
function EUC_DEV191_col_(cols,names){
  var w=names.map(EUC_DEV191_norm_);
  for(var i=0;i<cols.length;i++){
    if(w.indexOf(EUC_DEV191_norm_(cols[i].id))>=0)return cols[i].id;
  }
  return '';
}
function EUC_DEV191_deepPick_(obj,names,depth){
  if(obj==null||depth>6)return '';
  var wanted=names.map(EUC_DEV191_norm_);
  if(typeof obj==='object'){
    if(Array.isArray(obj)){
      for(var i=0;i<obj.length;i++){
        var rr=EUC_DEV191_deepPick_(obj[i],names,depth+1);
        if(rr)return rr;
      }
    }else{
      var keys=Object.keys(obj);
      for(var k=0;k<keys.length;k++){
        if(wanted.indexOf(EUC_DEV191_norm_(keys[k]))>=0){
          var v=obj[keys[k]];
          if(v!=null&&typeof v!=='object'&&String(v).trim()!=='')return String(v).trim();
        }
      }
      for(var j=0;j<keys.length;j++){
        var r=EUC_DEV191_deepPick_(obj[keys[j]],names,depth+1);
        if(r)return r;
      }
    }
  }
  return '';
}
function EUC_DEV191_containsSiret_(obj,siret,depth){
  if(obj==null||depth>7)return false;
  if(typeof obj!=='object')return EUC_DEV191_siret_(obj)===siret;
  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++)if(EUC_DEV191_containsSiret_(obj[i],siret,depth+1))return true;
  }else{
    var keys=Object.keys(obj);
    for(var j=0;j<keys.length;j++)if(EUC_DEV191_containsSiret_(obj[keys[j]],siret,depth+1))return true;
  }
  return false;
}
function EUC_DEV191_normalizeCompany_(raw,siret,source){
  if(raw==null)return {found:false};
  if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){}}

  var useful=
    EUC_DEV191_containsSiret_(raw,siret,0) ||
    !!EUC_DEV191_deepPick_(raw,['nom_raison_sociale','raison_sociale','denomination','nomEntreprise','entreprise'],0);

  if(!useful)return {found:false};

  return {
    ok:true,
    found:true,
    source:source,
    siret:siret,
    nomEntreprise:EUC_DEV191_deepPick_(raw,['nom_raison_sociale','raison_sociale','Raison_sociale','denomination','Nom_entreprise','nomEntreprise','nom_complet','nom'],0),
    nomCommercial:EUC_DEV191_deepPick_(raw,['nom_commercial','Nom_commercial','nomCommercial','enseigne','Entreprise','appellation'],0),
    adresse:EUC_DEV191_deepPick_(raw,['adresse','adresse_complete','Adresse_entreprise','adresse_postale','libelle_voie'],0),
    codePostal:EUC_DEV191_deepPick_(raw,['code_postal','Code_postal','codePostal','CP'],0),
    ville:EUC_DEV191_deepPick_(raw,['libelle_commune','ville','Ville','commune'],0),
    telephoneEntreprise:EUC_DEV191_deepPick_(raw,['telephone_entreprise','Entreprise_telephone','telephone','Téléphone','tel'],0),
    courrielEntreprise:EUC_DEV191_deepPick_(raw,['courriel_entreprise','Entreprise_courriel','courriel','email','mail'],0),
    tuteur:EUC_DEV191_deepPick_(raw,['Tuteur_nom','tuteur','nom_tuteur'],0),
    telephoneTuteur:EUC_DEV191_deepPick_(raw,['Tuteur_telephone','telephone_tuteur'],0),
    courrielTuteur:EUC_DEV191_deepPick_(raw,['Tuteur_courriel','courriel_tuteur','email_tuteur'],0)
  };
}

function EUC_DEV191_lookupSiret(siret){
  siret=EUC_DEV191_siret_(siret);

  if(siret.length!==14){
    return {ok:false,found:false,error:'SIRET invalide : 14 chiffres attendus.'};
  }

  var debug=[];
  try {
    var r = EUC_ENT_rechercherSiret(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_rechercherSiret');
    if(nr.found) return nr;
    debug.push('EUC_ENT_rechercherSiret: no match');
  } catch(e) {
    debug.push('EUC_ENT_rechercherSiret: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_rechercherSiret({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_rechercherSiret:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_V161_traiterSiretFranceNavigateur(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_V161_traiterSiretFranceNavigateur');
    if(nr.found) return nr;
    debug.push('EUC_V161_traiterSiretFranceNavigateur: no match');
  } catch(e) {
    debug.push('EUC_V161_traiterSiretFranceNavigateur: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_V161_traiterSiretFranceNavigateur({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_V161_traiterSiretFranceNavigateur:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_V161_verifierSiretFrance(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_V161_verifierSiretFrance');
    if(nr.found) return nr;
    debug.push('EUC_V161_verifierSiretFrance: no match');
  } catch(e) {
    debug.push('EUC_V161_verifierSiretFrance: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_V161_verifierSiretFrance({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_V161_verifierSiretFrance:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_ENT_mapperEntrepriseGrist_(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_mapperEntrepriseGrist_');
    if(nr.found) return nr;
    debug.push('EUC_ENT_mapperEntrepriseGrist_: no match');
  } catch(e) {
    debug.push('EUC_ENT_mapperEntrepriseGrist_: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_mapperEntrepriseGrist_({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_mapperEntrepriseGrist_:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_ENT_traiterReponseApiNavigateur(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_traiterReponseApiNavigateur');
    if(nr.found) return nr;
    debug.push('EUC_ENT_traiterReponseApiNavigateur: no match');
  } catch(e) {
    debug.push('EUC_ENT_traiterReponseApiNavigateur: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_traiterReponseApiNavigateur({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_traiterReponseApiNavigateur:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_V161_mapperEntrepriseFrance_(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_V161_mapperEntrepriseFrance_');
    if(nr.found) return nr;
    debug.push('EUC_V161_mapperEntrepriseFrance_: no match');
  } catch(e) {
    debug.push('EUC_V161_mapperEntrepriseFrance_: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_V161_mapperEntrepriseFrance_({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_V161_mapperEntrepriseFrance_:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_ENT_mapperReponseApi(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_mapperReponseApi');
    if(nr.found) return nr;
    debug.push('EUC_ENT_mapperReponseApi: no match');
  } catch(e) {
    debug.push('EUC_ENT_mapperReponseApi: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_mapperReponseApi({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_mapperReponseApi:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_ENT_validerSiret(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_validerSiret');
    if(nr.found) return nr;
    debug.push('EUC_ENT_validerSiret: no match');
  } catch(e) {
    debug.push('EUC_ENT_validerSiret: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_validerSiret({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_validerSiret:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_');
    if(nr.found) return nr;
    debug.push('EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_: no match');
  } catch(e) {
    debug.push('EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_:object');
    if(nr2.found) return nr2;
  } catch(e2) {}

  try {
    var r = EUC_ENT_normaliserSiret(siret);
    var nr = EUC_DEV191_normalizeCompany_(r,siret,'EUC_ENT_normaliserSiret');
    if(nr.found) return nr;
    debug.push('EUC_ENT_normaliserSiret: no match');
  } catch(e) {
    debug.push('EUC_ENT_normaliserSiret: '+String(e&&e.message||e));
  }

  try {
    var r2 = EUC_ENT_normaliserSiret({siret:siret,SIRET:siret});
    var nr2 = EUC_DEV191_normalizeCompany_(r2,siret,'EUC_ENT_normaliserSiret:object');
    if(nr2.found) return nr2;
  } catch(e2) {}


  try{
    if(typeof EUC_DEV190Y_findGristCompany_==='function'){
      var g=EUC_DEV190Y_findGristCompany_(siret);
      if(g&&g.found){
        g.ok=true;
        g.source=g.source||'Grist';
        return g;
      }
    }
  }catch(e3){
    debug.push('Grist: '+String(e3&&e3.message||e3));
  }

  return {ok:true,found:false,siret:siret,debug:debug};
}

function EUC_DEV191_ensureAppCols_(){
  var cols=EUC_DEV191_cols_(EUC_DEV191_APP_TABLE_);
  var have={}; cols.forEach(function(c){have[c.id]=true;});

  var wanted=[
    {id:'Nom_entreprise',type:'Text'},
    {id:'Nom_commercial',type:'Text'},
    {id:'SIRET',type:'Text'},
    {id:'Adresse_entreprise',type:'Text'},
    {id:'Code_postal',type:'Text'},
    {id:'Ville',type:'Text'},
    {id:'Entreprise_telephone',type:'Text'},
    {id:'Entreprise_courriel',type:'Text'},
    {id:'Dossier_distribue',type:'Bool'},
    {id:'Date_distribution_dossier',type:'Date'},
    {id:'Dossier_transmis_CFA',type:'Bool'},
    {id:'Date_transmission_CFA',type:'Date'},
    {id:'Date_contrat_officielle',type:'Date'},
    {id:'Date_rupture_contrat',type:'Date'},
    {id:'Nouveau_contrat',type:'Bool'},
    {id:'Statut_dossier',type:'Text'}
  ];

  var missing=wanted.filter(function(c){return !have[c.id];});

  if(missing.length){
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(EUC_DEV191_APP_TABLE_)+'/columns',
      {columns:missing}
    );
  }

  return {ok:true,added:missing.map(function(c){return c.id;})};
}

function EUC_DEV191_ensureDash_(){
  var exists=EUC_DEV191_tables_().some(function(t){return t.id===EUC_DEV191_DASH_TABLE_;});

  if(!exists){
    EUC_DEV190_api_(
      'post',
      '/tables',
      {
        tables:[{
          id:EUC_DEV191_DASH_TABLE_,
          columns:[
            {id:'Annee_scolaire',type:'Text'},
            {id:'Payload_JSON',type:'Text'},
            {id:'Updated_at',type:'Text'},
            {id:'Actif',type:'Bool'}
          ]
        }]
      }
    );
  }
}

function EUC_DEV191_buildDashboard_(annee){
  EUC_DEV191_ensureAppCols_();

  var cols=EUC_DEV191_cols_(EUC_DEV191_APP_TABLE_);
  var rows=EUC_DEV191_records_(EUC_DEV191_APP_TABLE_);
  var cEleve=EUC_DEV191_col_(cols,['Eleve','Élève','Eleve_id']);
  var latest={};

  rows.forEach(function(r){
    var id=EUC_DEV191_refId_((r.fields||{})[cEleve]);
    if(id)latest[id]=r.fields||{};
  });

  var out={
    annee:annee,
    total:0,
    dossierDistribue:0,
    transmisCFA:0,
    contratsValides:0,
    ruptures:0,
    nouveauxContrats:0
  };

  Object.keys(latest).forEach(function(k){
    var f=latest[k];
    out.total++;

    function bool(names){
      var c=EUC_DEV191_col_(cols,names);
      return c ? !!f[c] : false;
    }
    function txt(names){
      var c=EUC_DEV191_col_(cols,names);
      return c ? EUC_DEV191_txt_(f[c]) : '';
    }

    if(bool(['Dossier_distribue']))out.dossierDistribue++;
    if(bool(['Dossier_transmis_CFA']))out.transmisCFA++;
    if(txt(['Date_contrat_officielle','Date_debut']))out.contratsValides++;
    if(txt(['Date_rupture_contrat']))out.ruptures++;
    if(bool(['Nouveau_contrat']))out.nouveauxContrats++;
  });

  return out;
}

function EUC_DEV191_rebuildDashboard(annee){
  EUC_DEV191_ensureDash_();

  var payload=EUC_DEV191_buildDashboard_(annee);
  var now=new Date().toISOString();
  var rows=EUC_DEV191_records_(EUC_DEV191_DASH_TABLE_);

  var active=rows.filter(function(r){
    var f=r.fields||{};
    return f.Actif!==false && EUC_DEV191_txt_(f.Annee_scolaire)===annee;
  });

  if(active.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(EUC_DEV191_DASH_TABLE_)+'/records',
      {
        records:active.map(function(r){
          return {id:r.id,fields:{Actif:false,Updated_at:now}};
        })
      }
    );
  }

  EUC_DEV190_api_(
    'post',
    '/tables/'+encodeURIComponent(EUC_DEV191_DASH_TABLE_)+'/records',
    {
      records:[{
        fields:{
          Annee_scolaire:annee,
          Payload_JSON:JSON.stringify(payload),
          Updated_at:now,
          Actif:true
        }
      }]
    }
  );

  return payload;
}

function EUC_DEV191_getDashboard(annee){
  EUC_DEV191_ensureDash_();

  var rows=EUC_DEV191_records_(EUC_DEV191_DASH_TABLE_)
    .filter(function(r){
      var f=r.fields||{};
      return f.Actif!==false && EUC_DEV191_txt_(f.Annee_scolaire)===annee;
    })
    .sort(function(a,b){
      return (Date.parse((b.fields||{}).Updated_at||'')||0)-
             (Date.parse((a.fields||{}).Updated_at||'')||0);
    });

  if(!rows.length)return EUC_DEV191_rebuildDashboard(annee);

  try{
    return JSON.parse((rows[0].fields||{}).Payload_JSON||'{}');
  }catch(e){
    return EUC_DEV191_rebuildDashboard(annee);
  }
}
