var EUC_DEV190Q_STRUCTURE_TABLE_ = 'EUC_PFMP_STRUCTURE_SNAPSHOT';

function EUC_DEV190Q_txt_(v){ return String(v==null?'':v).trim(); }
function EUC_DEV190Q_normSiret_(v){ return EUC_DEV190Q_txt_(v).replace(/\D/g,'').slice(0,14); }

function EUC_DEV190Q_ensureStructureTable_(){
  var t=EUC_DEV190_api_('get','/tables',null);
  var exists=(t.tables||[]).some(function(x){return x.id===EUC_DEV190Q_STRUCTURE_TABLE_;});

  if(!exists){
    EUC_DEV190_api_('post','/tables',{
      tables:[{
        id:EUC_DEV190Q_STRUCTURE_TABLE_,
        columns:[
          {id:'Annee_scolaire',type:'Text'},
          {id:'Payload_JSON',type:'Text'},
          {id:'Updated_at',type:'Text'},
          {id:'Actif',type:'Bool'},
          {id:'Snapshot_version',type:'Text'}
        ]
      }]
    });
  }

  return {ok:true,created:!exists};
}

function EUC_DEV190Q_level_(name){
  var n=EUC_DEV190Q_txt_(name).toUpperCase();

  if(n.indexOf('BTS')>=0) return /^2/.test(n)?'BTS 2e année':'BTS 1re année';
  if(n.indexOf('CAP')>=0) return (/^T/.test(n)||/^2/.test(n))?'Terminale CAP':'1re année CAP';
  if(/^T/.test(n)) return 'Terminale';
  if(/^1/.test(n)) return 'Première';
  if(/^2/.test(n)) return 'Seconde';
  return 'Autres';
}

function EUC_DEV190Q_family_(name){
  var n=EUC_DEV190Q_txt_(name).toUpperCase();
  if(n.indexOf('BTS')>=0) return 'BTS';
  if(n.indexOf('CAP')>=0) return 'CAP';
  return 'BACPRO';
}

function EUC_DEV190Q_buildStructurePayload_(annee){
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var classes=(meta.classes||[]).map(function(c){
    var id=Number(c.id||c.classeId)||0;
    var nom=c.nom||c.classe||c.libelle||('Classe '+id);

    return {
      id:id,
      nom:nom,
      famille:EUC_DEV190Q_family_(nom),
      niveau:EUC_DEV190Q_level_(nom)
    };
  });

  classes.sort(function(a,b){
    return String(a.nom).localeCompare(String(b.nom),'fr');
  });

  return {
    annee:annee,
    classes:classes,
    terminales:classes.filter(function(c){
      return c.niveau==='Terminale'||c.niveau==='Terminale CAP';
    })
  };
}

function EUC_DEV190Q_syncStructure(annee){
  annee=EUC_DEV190Q_txt_(annee);

  if(!annee){
    annee=EUC_PFMP_contexteAnneeLectureV155_().active;
  }

  EUC_DEV190Q_ensureStructureTable_();

  var now=new Date().toISOString();
  var all=EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(EUC_DEV190Q_STRUCTURE_TABLE_)+'/records',
    null
  ).records||[];

  var active=all.filter(function(r){
    var f=r.fields||{};
    return f.Actif!==false && String(f.Annee_scolaire||'')===annee;
  });

  if(active.length){
    EUC_DEV190_api_(
      'patch',
      '/tables/'+encodeURIComponent(EUC_DEV190Q_STRUCTURE_TABLE_)+'/records',
      {
        records:active.map(function(r){
          return {
            id:r.id,
            fields:{Actif:false,Updated_at:now}
          };
        })
      }
    );
  }

  var payload=EUC_DEV190Q_buildStructurePayload_(annee);

  EUC_DEV190_api_(
    'post',
    '/tables/'+encodeURIComponent(EUC_DEV190Q_STRUCTURE_TABLE_)+'/records',
    {
      records:[{
        fields:{
          Annee_scolaire:annee,
          Payload_JSON:JSON.stringify(payload),
          Updated_at:now,
          Actif:true,
          Snapshot_version:'1.0.0-dev.190q'
        }
      }]
    }
  );

  return {
    ok:true,
    annee:annee,
    classes:payload.classes.length,
    terminales:payload.terminales.length,
    updatedAt:now
  };
}

function EUC_DEV190Q_getStructure(annee){
  annee=EUC_DEV190Q_txt_(annee);

  if(!annee){
    annee=EUC_PFMP_contexteAnneeLectureV155_().active;
  }

  EUC_DEV190Q_ensureStructureTable_();

  var all=EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(EUC_DEV190Q_STRUCTURE_TABLE_)+'/records',
    null
  ).records||[];

  var rows=all.filter(function(r){
    var f=r.fields||{};
    return f.Actif!==false && String(f.Annee_scolaire||'')===annee;
  }).sort(function(a,b){
    return (Date.parse((b.fields||{}).Updated_at||'')||0) -
           (Date.parse((a.fields||{}).Updated_at||'')||0);
  });

  if(!rows.length){
    EUC_DEV190Q_syncStructure(annee);
    return EUC_DEV190Q_getStructure(annee);
  }

  return {
    ok:true,
    annee:annee,
    updatedAt:(rows[0].fields||{}).Updated_at||'',
    payload:JSON.parse((rows[0].fields||{}).Payload_JSON||'{}')
  };
}

function EUC_DEV190Q_ensureApprentissageColumns_(){
  var table='EUC_APPRENTISSAGE_PFMP';

  var r=EUC_DEV190_api_(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns',
    null
  );

  var existing={};
  (r.columns||[]).forEach(function(c){existing[c.id]=true;});

  var wanted=[
    {id:'SIRET',type:'Text'},
    {id:'Adresse_entreprise',type:'Text'},
    {id:'Code_postal',type:'Text'},
    {id:'Ville',type:'Text'},
    {id:'Entreprise_telephone',type:'Text'},
    {id:'Entreprise_courriel',type:'Text'}
  ];

  var missing=wanted.filter(function(c){return !existing[c.id];});

  if(missing.length){
    EUC_DEV190_api_(
      'post',
      '/tables/'+encodeURIComponent(table)+'/columns',
      {columns:missing}
    );
  }

  return {ok:true,added:missing.map(function(c){return c.id;})};
}

function EUC_DEV190Q_pickField_(f,names){
  f=f||{};

  for(var i=0;i<names.length;i++){
    var k=names[i];

    if(f[k]!=null && String(f[k]).trim()!==''){
      return String(f[k]).trim();
    }
  }

  return '';
}

function EUC_DEV190Q_lookupEntrepriseSiret(siret){
  siret=EUC_DEV190Q_normSiret_(siret);

  if(siret.length!==14){
    return {ok:false,found:false,error:'SIRET incomplet'};
  }

  var tables=['Entreprises','ENTREPRISES','EUC_ENTREPRISES','EUC_ENTREPRISE'];

  for(var ti=0;ti<tables.length;ti++){
    var rows=[];

    try{
      rows=(EUC_DEV190_api_(
        'get',
        '/tables/'+encodeURIComponent(tables[ti])+'/records',
        null
      ).records||[]);
    }catch(e){
      rows=[];
    }

    for(var i=0;i<rows.length;i++){
      var f=rows[i].fields||{};

      var fsiret=EUC_DEV190Q_normSiret_(
        EUC_DEV190Q_pickField_(f,['SIRET','Siret','siret','Numero_SIRET','NumeroSIRET'])
      );

      if(fsiret!==siret) continue;

      return {
        ok:true,
        found:true,
        siret:siret,
        entreprise:EUC_DEV190Q_pickField_(f,['Entreprise','Nom','Nom_entreprise','Raison_sociale','RaisonSociale','Appellation']),
        adresse:EUC_DEV190Q_pickField_(f,['Adresse','Adresse_entreprise','Adresse1','Adresse_postale']),
        codePostal:EUC_DEV190Q_pickField_(f,['Code_postal','CodePostal','CP']),
        ville:EUC_DEV190Q_pickField_(f,['Ville','Commune']),
        telephoneEntreprise:EUC_DEV190Q_pickField_(f,['Telephone','Téléphone','Telephone_entreprise','Tel','TEL']),
        courrielEntreprise:EUC_DEV190Q_pickField_(f,['Courriel','Email','Mail','Courriel_entreprise']),
        tuteur:EUC_DEV190Q_pickField_(f,['Tuteur','Tuteur_nom','Nom_tuteur','Maitre_apprentissage','Maitre_d_apprentissage']),
        telephoneTuteur:EUC_DEV190Q_pickField_(f,['Tuteur_telephone','Telephone_tuteur','Tel_tuteur']),
        courrielTuteur:EUC_DEV190Q_pickField_(f,['Tuteur_courriel','Courriel_tuteur','Email_tuteur'])
      };
    }
  }

  return {ok:true,found:false,siret:siret};
}

function EUC_DEV190Q_status(){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var structure=EUC_DEV190Q_getStructure(ctx.active);
  var appr=EUC_DEV190Q_ensureApprentissageColumns_();

  return {
    ok:true,
    annee:ctx.active,
    structure:{
      classes:(structure.payload&&structure.payload.classes||[]).length,
      terminales:(structure.payload&&structure.payload.terminales||[]).length,
      updatedAt:structure.updatedAt||''
    },
    apprentissageColumnsAdded:appr.added||[]
  };
}
