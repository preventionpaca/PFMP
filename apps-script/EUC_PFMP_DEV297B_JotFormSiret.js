/**
 * Eucalyptus PFMP — v1.0.0-dev.297b
 * Enrichissement automatique du tampon JotForm par SIRET.
 */
var EUC_DEV297B_TABLE_='EUC_MIGRATION_JOTFORM_PFMP';
var EUC_DEV297B_YEAR_='2026-2027';

function EUC_DEV297B_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV297B_digits_(v){return EUC_DEV297B_txt_(v).replace(/\D+/g,'');}
function EUC_DEV297B_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_DEV297B_ensureCols_(){
  var path='/tables/'+encodeURIComponent(EUC_DEV297B_TABLE_)+'/columns';
  var cols;
  try{
    cols=(EUC_ENT_grist('get',path).columns||[]);
  }catch(e){
    throw new Error('DEV297C / lecture schéma tampon : '+String(e&&e.message||e));
  }
  var have={};
  cols.forEach(function(c){have[String(c.id||'')]=true;});
  var c=EUC_DEV297B_col_;
  var wanted=[
    c('Importer','Importer','Bool'),
    c('SIRET_statut','État SIRET'),
    c('SIRET_source','Source SIRET'),
    c('Raison_sociale_officielle','Raison sociale officielle'),
    c('Nom_commercial','Nom commercial / enseigne'),
    c('Adresse_officielle','Adresse officielle'),
    c('CP_officiel','CP officiel'),
    c('Ville_officielle','Ville officielle'),
    c('SIRET_erreur','Erreur SIRET')
  ];
  var missing=wanted.filter(function(x){return !have[x.id];});
  missing.forEach(function(col){
    try{
      EUC_ENT_grist('post',path,{columns:[col]});
    }catch(e){
      throw new Error('DEV297C / création colonne '+col.id+' : '+String(e&&e.message||e));
    }
  });
  return {ok:true,ajoutees:missing.map(function(x){return x.id;})};
}

function EUC_DEV297B_findExistingCompany_(siret){
  try{
    var rows=EUC_IMPORT_lireRecords_('EUC_ENTREPRISES')||[];
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      if(EUC_DEV297B_digits_(r.SIRET)===siret){
        return {
          found:true,
          source:'EUC_ENTREPRISES',
          nomEntreprise:EUC_DEV297B_txt_(r.Raison_sociale||r.Nom_entreprise),
          nomCommercial:EUC_DEV297B_txt_(r.Enseigne||r.Nom_commercial),
          adresse:EUC_DEV297B_txt_(r.Adresse_complete||r.Adresse),
          codePostal:EUC_DEV297B_txt_(r.Code_postal||r.CP),
          ville:EUC_DEV297B_txt_(r.Commune||r.Ville)
        };
      }
    }
  }catch(e){}
  return {found:false};
}

function EUC_DEV297B_parseGov_(json,siret){
  var results=(json&&json.results)||[];

  for(var i=0;i<results.length;i++){
    var r=results[i]||{};
    var candidates=[];

    if(r.siege)candidates.push(r.siege);

    var m=r.matching_etablissements||r.matching_siege||[];
    if(Array.isArray(m))candidates=candidates.concat(m);

    if(r.siret)candidates.push(r);

    for(var j=0;j<candidates.length;j++){
      var e=candidates[j]||{};
      if(EUC_DEV297B_digits_(e.siret)!==siret)continue;

      return {
        found:true,
        source:'Annuaire des Entreprises',
        nomEntreprise:EUC_DEV297B_txt_(
          r.nom_raison_sociale||
          r.nom_complet||
          r.nom_entreprise||
          r.denomination
        ),
        nomCommercial:EUC_DEV297B_txt_(
          e.nom_commercial||
          e.enseigne||
          r.nom_commercial
        ),
        adresse:EUC_DEV297B_txt_(
          e.adresse||
          e.adresse_complete
        ),
        codePostal:EUC_DEV297B_txt_(
          e.code_postal
        ),
        ville:EUC_DEV297B_txt_(
          e.libelle_commune||
          e.commune
        )
      };
    }
  }

  return {found:false};
}

function EUC_DEV297B_verifierSirets(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  var schema=EUC_DEV297B_ensureCols_();
  var rows;
  try{
    rows=(EUC_IMPORT_lireRecords_(EUC_DEV297B_TABLE_)||[]).filter(function(r){
      return EUC_DEV297B_txt_(r.Annee_scolaire)===EUC_DEV297B_YEAR_;
    });
  }catch(e){
    throw new Error('DEV297C / lecture tampon : '+String(e&&e.message||e));
  }

  var groups={},invalid=[];
  rows.forEach(function(r){
    var s=EUC_DEV297B_digits_(r.SIRET_normalise||r.SIRET_brut);
    if(s.length!==14){invalid.push({row:r,siret:s});return;}
    if(!groups[s])groups[s]=[];
    groups[s].push(r);
  });

  var cache={},remote=[];
  Object.keys(groups).forEach(function(siret){
    var local=EUC_DEV297B_findExistingCompany_(siret);
    if(local.found)cache[siret]=local; else remote.push(siret);
  });

  for(var start=0;start<remote.length;start+=20){
    var slice=remote.slice(start,start+20);
    var req=slice.map(function(siret){return {
      url:'https://recherche-entreprises.api.gouv.fr/search?q='+encodeURIComponent(siret)+'&per_page=10',
      method:'get',muteHttpExceptions:true,followRedirects:true,headers:{Accept:'application/json'}
    };});
    var responses;
    try{responses=UrlFetchApp.fetchAll(req);}catch(e){
      throw new Error('DEV297C / recherche distante lot '+(start+1)+'-'+Math.min(start+slice.length,remote.length)+' : '+String(e&&e.message||e));
    }
    responses.forEach(function(res,i){
      var siret=slice[i];
      try{
        var code=res.getResponseCode();
        if(code<200||code>=300){cache[siret]={found:false,error:'API entreprises HTTP '+code};return;}
        cache[siret]=EUC_DEV297B_parseGov_(JSON.parse(res.getContentText()||'{}'),siret);
        if(!cache[siret].found)cache[siret].error='SIRET non retrouvé dans la source publique.';
      }catch(e2){cache[siret]={found:false,error:String(e2&&e2.message||e2)};}
    });
  }

  var patches=[];
  invalid.forEach(function(it){
    var n=it.siret.length;
    patches.push({id:Number(it.row.id),fields:{
      Importer:false,
      SIRET_statut:n===9?'MANUEL_SIREN_9_CHIFFRES':'MANUEL_SIRET_INVALIDE',
      SIRET_source:'',
      SIRET_erreur:n?'SIRET/SIREN incomplet ou invalide : '+n+' chiffre(s).':'SIRET absent.'
    }});
  });

  Object.keys(groups).forEach(function(siret){
    var hit=cache[siret]||{found:false,error:'Aucun résultat'};
    groups[siret].forEach(function(r){
      var studentOk=Number(r.Eleve_match_id)||0;
      var classOk=Number(r.Classe_match_id)||0;
      if(hit.found){
        patches.push({id:Number(r.id),fields:{
          Importer:!!(studentOk&&classOk),
          SIRET_statut:'VERIFIE',
          SIRET_source:hit.source||'',
          Raison_sociale_officielle:hit.nomEntreprise||'',
          Nom_commercial:hit.nomCommercial||r.Entreprise_saisie||'',
          Adresse_officielle:hit.adresse||'',
          CP_officiel:hit.codePostal||'',
          Ville_officielle:hit.ville||'',
          SIRET_erreur:''
        }});
      }else{
        patches.push({id:Number(r.id),fields:{
          Importer:false,SIRET_statut:'A_CONTROLER',SIRET_source:'',SIRET_erreur:hit.error||'Entreprise non retrouvée.'
        }});
      }
    });
  });

  var path='/tables/'+encodeURIComponent(EUC_DEV297B_TABLE_)+'/records';
  var patched=0;
  for(var p0=0;p0<patches.length;p0+=20){
    var chunk=patches.slice(p0,p0+20);
    try{
      EUC_ENT_grist('patch',path,{records:chunk});
      patched+=chunk.length;
    }catch(batchErr){
      for(var j=0;j<chunk.length;j++){
        try{
          EUC_ENT_grist('patch',path,{records:[chunk[j]]});
          patched++;
        }catch(rowErr){
          throw new Error(
            'DEV297C / écriture Grist ligne tampon id='+chunk[j].id+
            ' : '+String(rowErr&&rowErr.message||rowErr)+
            ' ; champs='+Object.keys(chunk[j].fields||{}).join(',')
          );
        }
      }
    }
  }

  var out=EUC_DEV297B_lister();
  out.diagnostic={
    lignes:rows.length,
    sirets14:Object.keys(groups).length,
    siretsDistants:remote.length,
    lignesInvalides:invalid.length,
    patches:patches.length,
    patchesOK:patched,
    colonnesAjoutees:schema.ajoutees||[]
  };
  return out;
}

function EUC_DEV297B_lister(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  EUC_DEV297B_ensureCols_();

  var rows=(EUC_IMPORT_lireRecords_(EUC_DEV297B_TABLE_)||[])
    .filter(function(r){
      return EUC_DEV297B_txt_(r.Annee_scolaire)===EUC_DEV297B_YEAR_;
    })
    .map(function(r){
      return {
        id:Number(r.id)||0,
        submission:EUC_DEV297B_txt_(r.Submission_ID),
        eleve:(EUC_DEV297B_txt_(r.Nom_eleve)+' '+EUC_DEV297B_txt_(r.Prenom_eleve)).trim(),
        classe:EUC_DEV297B_txt_(r.Classe_saisie),
        siret:EUC_DEV297B_txt_(r.SIRET_normalise||r.SIRET_brut),
        entrepriseSaisie:EUC_DEV297B_txt_(r.Entreprise_saisie),
        raisonOfficielle:EUC_DEV297B_txt_(r.Raison_sociale_officielle),
        nomCommercial:EUC_DEV297B_txt_(r.Nom_commercial),
        adresseOfficielle:EUC_DEV297B_txt_(r.Adresse_officielle),
        cpOfficiel:EUC_DEV297B_txt_(r.CP_officiel),
        villeOfficielle:EUC_DEV297B_txt_(r.Ville_officielle),
        siretStatut:EUC_DEV297B_txt_(r.SIRET_statut),
        siretErreur:EUC_DEV297B_txt_(r.SIRET_erreur),
        importer:r.Importer===true,
        matchEleve:EUC_DEV297B_txt_(r.Eleve_match_libelle),
        matchClasse:EUC_DEV297B_txt_(r.Classe_match_libelle),
        alertes:EUC_DEV297B_txt_(r.Alertes),
        decision:EUC_DEV297B_txt_(r.Decision)
      };
    });

  var counts={total:rows.length,verifies:0,manuel:0,importer:0};

  rows.forEach(function(r){
    if(r.siretStatut==='VERIFIE')counts.verifies++;
    else counts.manuel++;
    if(r.importer)counts.importer++;
  });

  return {
    annee:EUC_DEV297B_YEAR_,
    counts:counts,
    lignes:rows
  };
}

function EUC_DEV297B_sauverLigne(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var id=Number(payload.id)||0;
  if(!id)throw new Error('Ligne invalide.');

  var fields={
    Importer:payload.importer===true,
    Nom_commercial:EUC_DEV297B_txt_(payload.nomCommercial)
  };

  EUC_ENT_grist(
    'patch',
    '/tables/'+EUC_DEV297B_TABLE_+'/records',
    {records:[{id:id,fields:fields}]}
  );

  return {ok:true};
}

function EUC_DEV297B_validerSelection(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  var rows=(EUC_IMPORT_lireRecords_(EUC_DEV297B_TABLE_)||[])
    .filter(function(r){
      return EUC_DEV297B_txt_(r.Annee_scolaire)===EUC_DEV297B_YEAR_;
    });

  var now=new Date().toISOString();
  var patches=rows.map(function(r){
    var ok=r.Importer===true;

    return {
      id:r.id,
      fields:{
        Decision:ok?'VALIDEE':'IGNOREE',
        Date_validation:ok?now:null,
        Valide_par:ok?(ctx.email||''):''
      }
    };
  });

  if(patches.length){
    EUC_ENT_grist('patch','/tables/'+EUC_DEV297B_TABLE_+'/records',{records:patches});
  }

  return EUC_DEV297B_lister();
}
