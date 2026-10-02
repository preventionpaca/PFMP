/** Eucalyptus PFMP — v1.0.0-dev.160
 * Migration contrôlée JotForm -> Grist/Apps Script.
 * Phase 1 : import tampon + analyse + validation 2026-2027.
 */

var EUC_V160_TABLE_='EUC_MIGRATION_JOTFORM_PFMP';
var EUC_V160_YEAR_='2026-2027';

function EUC_V160_txt_(v){return String(v==null?'':v).trim();}

function EUC_V160_norm_(v){
  return EUC_V160_txt_(v)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function EUC_V160_digits_(v){return EUC_V160_txt_(v).replace(/\D+/g,'');}

function EUC_V160_ref_(v){
  if(Array.isArray(v))return Number(v[1]||v[0])||0;
  return Number(v)||0;
}

function EUC_V160_col_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_V160_assurerTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tables.some(function(t){return t.id===EUC_V160_TABLE_;});
  var c=EUC_V160_col_;
  var cols=[
    c('Submission_ID','Submission ID'),
    c('Annee_scolaire','Année scolaire'),
    c('Numero_convention_JotForm','N° convention JotForm'),
    c('Periode_numero','Période n°'),
    c('Date_debut_brut','Date début brut'),
    c('Date_fin_brut','Date fin brut'),
    c('Classe_saisie','Classe saisie'),
    c('Diplome','Diplôme'),
    c('Nom_eleve','Nom élève'),
    c('Prenom_eleve','Prénom élève'),
    c('Date_naissance','Date de naissance'),
    c('Email_eleve','Email élève'),
    c('Entreprise_saisie','Entreprise saisie'),
    c('SIRET_brut','SIRET brut'),
    c('SIRET_normalise','SIRET normalisé'),
    c('Adresse_entreprise','Adresse entreprise'),
    c('Complement_adresse_entreprise','Complément adresse entreprise'),
    c('CP_entreprise','CP entreprise'),
    c('Ville_entreprise','Ville entreprise'),
    c('Email_entreprise','Email entreprise'),
    c('Telephone_entreprise','Téléphone entreprise'),
    c('Nom_tuteur','Nom tuteur'),
    c('Fonction_tuteur','Fonction tuteur'),
    c('Email_tuteur','Email tuteur'),
    c('Telephone_tuteur','Téléphone tuteur'),
    c('Eleve_match_id','Élève match ID','Int'),
    c('Eleve_match_libelle','Élève reconnu'),
    c('Classe_match_id','Classe match ID','Int'),
    c('Classe_match_libelle','Classe reconnue'),
    c('Entreprise_match_id','Entreprise match ID','Int'),
    c('Entreprise_match_libelle','Entreprise reconnue'),
    c('Entreprise_score','Score entreprise','Int'),
    c('Niveau_controle','Niveau contrôle'),
    c('Alertes','Alertes'),
    c('Decision','Décision'),
    c('Commentaire_controle','Commentaire contrôle'),
    c('Date_import','Date import','DateTime'),
    c('Date_validation','Date validation','DateTime'),
    c('Valide_par','Validé par'),
    c('Raw_JSON','Données brutes JSON')
  ];

  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_V160_TABLE_,columns:cols}]});
  }else{
    var current=EUC_ENT_grist('get','/tables/'+EUC_V160_TABLE_+'/columns').columns||[];
    var have={};current.forEach(function(x){have[x.id]=true;});
    var missing=cols.filter(function(x){return !have[x.id];});
    if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_V160_TABLE_+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V160_get_(r,names){
  for(var i=0;i<names.length;i++){
    if(Object.prototype.hasOwnProperty.call(r,names[i]) && EUC_V160_txt_(r[names[i]]))return r[names[i]];
  }
  return '';
}

function EUC_V160_students_(){
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');}catch(e){return [];}
  return rows.map(function(r){
    var nom=EUC_V160_get_(r,['Nom','NOM','Nom_eleve']);
    var prenom=EUC_V160_get_(r,['Prenom','Prénom','PRENOM','Prenom_eleve']);
    var classe=EUC_V160_get_(r,['Classe_libelle','Classe','CLASSE']);
    return {
      id:Number(r.id),
      nom:EUC_V160_txt_(nom),
      prenom:EUC_V160_txt_(prenom),
      classe:EUC_V160_txt_(classe),
      key:EUC_V160_norm_(nom)+'|'+EUC_V160_norm_(prenom)
    };
  }).filter(function(x){return x.id&&x.nom;});
}

function EUC_V160_classes_(){
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('Classes');}catch(e){return [];}
  return rows.map(function(r){
    var label=EUC_V160_get_(r,['Nom','Classe','Libelle','Libellé','Code','Label']);
    return {id:Number(r.id),label:EUC_V160_txt_(label),norm:EUC_V160_norm_(label)};
  }).filter(function(x){return x.id&&x.label;});
}

function EUC_V160_enterprises_(){
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('Entreprises');}catch(e){return [];}
  return rows.map(function(r){
    var nom=EUC_V160_get_(r,['Nom','Nom_entreprise','Raison_sociale','Raison sociale','Entreprise']);
    var siret=EUC_V160_get_(r,['SIRET','Siret','N_SIRET','Numero_SIRET','Numéro SIRET']);
    var adr=EUC_V160_get_(r,['Adresse','Adresse_entreprise','Adresse entreprise']);
    var cp=EUC_V160_get_(r,['Code_postal','Code postal','CP','Code_postal_entreprise']);
    var ville=EUC_V160_get_(r,['Ville','Ville_entreprise','Ville entreprise']);
    return {
      id:Number(r.id),nom:EUC_V160_txt_(nom),siret:EUC_V160_digits_(siret),
      adresse:EUC_V160_txt_(adr),cp:EUC_V160_txt_(cp),ville:EUC_V160_txt_(ville),
      nomN:EUC_V160_norm_(nom),adrN:EUC_V160_norm_(adr),villeN:EUC_V160_norm_(ville)
    };
  }).filter(function(x){return x.id&&x.nom;});
}

function EUC_V160_lev_(a,b){
  a=String(a||'');b=String(b||'');
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  var prev=[],cur=[],i,j;
  for(j=0;j<=b.length;j++)prev[j]=j;
  for(i=1;i<=a.length;i++){
    cur[0]=i;
    for(j=1;j<=b.length;j++){
      cur[j]=Math.min(
        cur[j-1]+1,
        prev[j]+1,
        prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1)
      );
    }
    prev=cur;cur=[];
  }
  return prev[b.length];
}

function EUC_V160_similarity_(a,b){
  a=EUC_V160_norm_(a);b=EUC_V160_norm_(b);
  if(!a||!b)return 0;
  if(a===b)return 100;
  var max=Math.max(a.length,b.length);
  return Math.max(0,Math.round((1-EUC_V160_lev_(a,b)/max)*100));
}

function EUC_V160_matchStudent_(row,students){
  var key=EUC_V160_norm_(row.Nom_eleve)+'|'+EUC_V160_norm_(row.Prenom_eleve);
  var exact=students.filter(function(s){return s.key===key;});
  if(exact.length===1)return {id:exact[0].id,label:exact[0].nom+' '+exact[0].prenom,ok:true};
  if(exact.length>1)return {id:0,label:'Plusieurs élèves correspondants',ok:false,alert:'Élève ambigu'};
  return {id:0,label:'',ok:false,alert:'Élève introuvable'};
}

function EUC_V160_matchClass_(classeSaisie,classes){
  var n=EUC_V160_norm_(classeSaisie);
  var exact=classes.filter(function(c){return c.norm===n;});
  if(exact.length===1)return {id:exact[0].id,label:exact[0].label,ok:true};
  return {id:0,label:'',ok:false,alert:'Classe introuvable'};
}

function EUC_V160_matchEnterprise_(row,companies){
  var siret=EUC_V160_digits_(row.SIRET_brut);
  var nomN=EUC_V160_norm_(row.Entreprise_saisie);
  var adrN=EUC_V160_norm_(row.Adresse_entreprise);
  var villeN=EUC_V160_norm_(row.Ville_entreprise);

  if(siret.length===14){
    var exact=companies.filter(function(c){return c.siret===siret;});
    if(exact.length===1)return {id:exact[0].id,label:exact[0].nom,score:100,reason:'SIRET exact'};
  }

  var best=null;
  companies.forEach(function(c){
    var nameScore=EUC_V160_similarity_(nomN,c.nomN);
    var cityScore=(villeN&&c.villeN&&villeN===c.villeN)?12:0;
    var addrScore=(adrN&&c.adrN&&EUC_V160_similarity_(adrN,c.adrN)>=85)?10:0;
    var score=Math.min(99,nameScore+cityScore+addrScore);
    if(!best||score>best.score)best={id:c.id,label:c.nom,score:score,reason:'Nom/adresse'};
  });

  if(best&&best.score>=88)return best;
  return best||{id:0,label:'',score:0,reason:''};
}

function EUC_V160_csvRows_(csvText){
  return EUC_DEV296_csvRows_(csvText);
}

function EUC_V160_mapCsv_(r){
  return EUC_DEV296_mapCsv_(r);
}

function EUC_V160_analyserRow_(row,students,classes,companies){
  var alerts=[];
  var stu=EUC_V160_matchStudent_(row,students);
  var cla=EUC_V160_matchClass_(row.Classe_saisie,classes);
  var ent=EUC_V160_matchEnterprise_(row,companies);

  if(!stu.ok)alerts.push(stu.alert||'Élève à vérifier');
  if(!cla.ok)alerts.push(cla.alert||'Classe à vérifier');

  var siret=EUC_V160_digits_(row.SIRET_brut);
  if(!siret)alerts.push('SIRET absent');
  else if(siret.length===9)alerts.push('SIREN 9 chiffres, SIRET à compléter');
  else if(siret.length!==14)alerts.push('SIRET invalide');

  if(!ent.id||ent.score<88)alerts.push('Entreprise à rapprocher');

  if(!row.Date_debut_brut||!row.Date_fin_brut)alerts.push('Dates PFMP incomplètes');

  var level='VERT';
  if(!stu.ok||!cla.ok||!row.Date_debut_brut||!row.Date_fin_brut)level='ROUGE';
  else if(alerts.length)level='ORANGE';

  row.Eleve_match_id=stu.id||0;
  row.Eleve_match_libelle=stu.label||'';
  row.Classe_match_id=cla.id||0;
  row.Classe_match_libelle=cla.label||'';
  row.Entreprise_match_id=ent.id||0;
  row.Entreprise_match_libelle=ent.label||'';
  row.Entreprise_score=ent.score||0;
  row.Niveau_controle=level;
  row.Alertes=alerts.join(' · ');
  row.Decision=level==='VERT'?'A_VALIDER':'A_CONTROLER';
  row.Date_import=new Date().toISOString();
  return row;
}

function EUC_V160_importCsv__DEV331_ORIG(csvText){
  var ctx=EUC_V156_contexteAdmin_();

  if(!ctx){
    throw new Error('Accès administrateur requis.');
  }

  EUC_V160_assurerTable_();

  var sourceRows=EUC_V160_csvRows_(csvText);
  var sourceCount=sourceRows.length;

  var foundYears={};

  sourceRows.forEach(function(r){
    var y=EUC_DEV296_year_(
      EUC_DEV296_get_(
        r,
        [
          'Année scolaire',
          'Annee scolaire',
          'Annee_scolaire'
        ]
      )
    );

    if(y){
      foundYears[y]=(foundYears[y]||0)+1;
    }
  });

  var rows=sourceRows.filter(function(r){
    var y=EUC_DEV296_year_(
      EUC_DEV296_get_(
        r,
        [
          'Année scolaire',
          'Annee scolaire',
          'Annee_scolaire'
        ]
      )
    );

    return y===EUC_V160_YEAR_;
  });

  if(!rows.length){
    throw new Error(
      'Aucune ligne '+
      EUC_V160_YEAR_+
      ' trouvée dans le CSV. Années détectées : '+
      (
        Object.keys(foundYears).length
          ? JSON.stringify(foundYears)
          : 'aucune'
      )+
      '. Vérifiez que le fichier sélectionné est bien l’export CSV JotForm.'
    );
  }

  var students=EUC_V160_students_();
  var classes=EUC_V160_classes_();
  var companies=EUC_V160_enterprises_();

  var existing=EUC_IMPORT_lireRecords_(EUC_V160_TABLE_);
  var bySubmission={};

  existing.forEach(function(r){
    var sid=EUC_V160_txt_(r.Submission_ID);

    if(sid){
      bySubmission[sid]=r;
    }
  });

  var created=0;
  var updated=0;

  rows.forEach(function(raw){
    var row=EUC_V160_analyserRow_(
      EUC_V160_mapCsv_(raw),
      students,
      classes,
      companies
    );

    var fields={};

    Object.keys(row).forEach(function(k){
      fields[k]=row[k];
    });

    var ex=bySubmission[row.Submission_ID];

    if(ex){
      EUC_ENT_grist(
        'patch',
        '/tables/'+EUC_V160_TABLE_+'/records',
        {
          records:[
            {
              id:ex.id,
              fields:fields
            }
          ]
        }
      );

      updated++;
    }else{
      EUC_ENT_grist(
        'post',
        '/tables/'+EUC_V160_TABLE_+'/records',
        {
          records:[
            {
              fields:fields
            }
          ]
        }
      );

      created++;
    }
  });

  return {
    ok:true,
    sourceCount:sourceCount,
    yearCount:rows.length,
    ignoredCount:sourceCount-rows.length,
    created:created,
    updated:updated,
    anneesDetectees:foundYears,
    resume:EUC_V160_resume_()
  };
}

function EUC_V160_resume_(){
  EUC_V160_assurerTable_();
  var rows=EUC_IMPORT_lireRecords_(EUC_V160_TABLE_)
    .filter(function(r){return EUC_V160_txt_(r.Annee_scolaire)===EUC_V160_YEAR_;});

  var out={total:rows.length,VERT:0,ORANGE:0,ROUGE:0,VALIDEE:0,IGNOREE:0};
  rows.forEach(function(r){
    var n=EUC_V160_txt_(r.Niveau_controle);
    if(out[n]!=null)out[n]++;
    var d=EUC_V160_txt_(r.Decision);
    if(d==='VALIDEE')out.VALIDEE++;
    if(d==='IGNOREE')out.IGNOREE++;
  });
  return out;
}

function EUC_V160_lister(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');
  EUC_V160_assurerTable_();

  var rows=EUC_IMPORT_lireRecords_(EUC_V160_TABLE_)
    .filter(function(r){return EUC_V160_txt_(r.Annee_scolaire)===EUC_V160_YEAR_;})
    .map(function(r){
      return {
        id:Number(r.id),
        submission:EUC_V160_txt_(r.Submission_ID),
        convention:EUC_V160_txt_(r.Numero_convention_JotForm),
        periode:EUC_V160_txt_(r.Periode_numero),
        debut:EUC_V160_txt_(r.Date_debut_brut),
        fin:EUC_V160_txt_(r.Date_fin_brut),
        classe:EUC_V160_txt_(r.Classe_saisie),
        eleve:(EUC_V160_txt_(r.Nom_eleve)+' '+EUC_V160_txt_(r.Prenom_eleve)).trim(),
        entreprise:EUC_V160_txt_(r.Entreprise_saisie),
        siret:EUC_V160_txt_(r.SIRET_brut),
        siretN:EUC_V160_txt_(r.SIRET_normalise),
        ville:EUC_V160_txt_(r.Ville_entreprise),
        matchEleve:EUC_V160_txt_(r.Eleve_match_libelle),
        matchClasse:EUC_V160_txt_(r.Classe_match_libelle),
        matchEntreprise:EUC_V160_txt_(r.Entreprise_match_libelle),
        score:Number(r.Entreprise_score)||0,
        niveau:EUC_V160_txt_(r.Niveau_controle),
        alertes:EUC_V160_txt_(r.Alertes),
        decision:EUC_V160_txt_(r.Decision),
        commentaire:EUC_V160_txt_(r.Commentaire_controle)
      };
    });

  return {annee:EUC_V160_YEAR_,resume:EUC_V160_resume_(),lignes:rows};
}

function EUC_V160_sauverControle(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var id=Number(payload.id);
  if(!id)throw new Error('Ligne invalide.');

  var fields={
    Decision:EUC_V160_txt_(payload.decision),
    Commentaire_controle:EUC_V160_txt_(payload.commentaire)
  };

  if(fields.Decision==='VALIDEE'){
    fields.Date_validation=new Date().toISOString();
    fields.Valide_par=ctx.email||'';
  }

  EUC_ENT_grist('patch','/tables/'+EUC_V160_TABLE_+'/records',{records:[{id:id,fields:fields}]});
  return EUC_V160_lister();
}

function EUC_V160_validerVerts(){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  var rows=EUC_IMPORT_lireRecords_(EUC_V160_TABLE_)
    .filter(function(r){
      return EUC_V160_txt_(r.Annee_scolaire)===EUC_V160_YEAR_ &&
             EUC_V160_txt_(r.Niveau_controle)==='VERT' &&
             EUC_V160_txt_(r.Decision)!=='IGNOREE';
    });

  rows.forEach(function(r){
    EUC_ENT_grist('patch','/tables/'+EUC_V160_TABLE_+'/records',{
      records:[{id:r.id,fields:{
        Decision:'VALIDEE',
        Date_validation:new Date().toISOString(),
        Valide_par:ctx.email||''
      }}]
    });
  });

  return EUC_V160_lister();
}

function EUC_V160_afficher(e){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  EUC_V160_assurerTable_();

  var tpl=HtmlService.createTemplateFromFile('Migration_JotForm_PFMP_V160');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl(),annee:EUC_V160_YEAR_});
  tpl.dataJson=JSON.stringify(EUC_V160_lister());

  return tpl.evaluate()
    .setTitle('Migration JotForm PFMP 2026-2027')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
