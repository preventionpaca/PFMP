/** Eucalyptus PFMP — v1.0.0-dev.161
 * 1) Référentiel France / Monaco (SIRET / NIS)
 * 2) Etat actuel d'un élève : une ligne par élève/période
 *    avec historique secondaire des conventions annulées/interrompues.
 */

function EUC_V161_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_V161_norm_(v){
  return EUC_V161_txt_(v)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function EUC_V161_col_(id,label,type){
  return {id:id,fields:{label:label,type:type||'Text'}};
}

function EUC_V161_assurerColonnesEntreprises_(){
  var table='Entreprises';
  var current=EUC_ENT_grist('get','/tables/'+table+'/columns').columns||[];
  var have={};
  current.forEach(function(c){have[c.id]=true;});

  var c=EUC_V161_col_;
  var wanted=[
    c('Pays','Pays'),
    c('NIS','NIS Monaco'),
    c('RCI','RCI Monaco'),
    c('Statut_validation','Statut validation'),
    c('Source_creation','Source création')
  ];

  var missing=wanted.filter(function(x){return !have[x.id];});
  if(missing.length){
    EUC_ENT_grist('post','/tables/'+table+'/columns',{columns:missing});
  }
  return true;
}

function EUC_V161_rechercherEntrepriseMonaco(nis){
  EUC_V161_assurerColonnesEntreprises_();

  nis=EUC_V161_txt_(nis);
  if(!nis)return {found:false};

  var rows=EUC_IMPORT_lireRecords_('Entreprises');
  var hit=rows.filter(function(r){
    return EUC_V161_norm_(r.Pays)==='monaco' &&
           EUC_V161_norm_(r.NIS)===EUC_V161_norm_(nis);
  })[0];

  if(!hit)return {found:false,nis:nis};

  function get(names){
    for(var i=0;i<names.length;i++){
      if(EUC_V161_txt_(hit[names[i]]))return EUC_V161_txt_(hit[names[i]]);
    }
    return '';
  }

  return {
    found:true,
    id:Number(hit.id)||0,
    pays:'Monaco',
    nis:EUC_V161_txt_(hit.NIS),
    rci:EUC_V161_txt_(hit.RCI),
    nom:get(['Nom','Nom_entreprise','Raison_sociale','Entreprise']),
    adresse:get(['Adresse','Adresse_entreprise']),
    cp:get(['Code_postal','CP','Code_postal_entreprise']),
    ville:get(['Ville','Ville_entreprise'])||'Monaco',
    email:get(['Email','Email_entreprise','Adresse_email']),
    telephone:get(['Telephone','Téléphone','Telephone_entreprise']),
    statut:EUC_V161_txt_(hit.Statut_validation)
  };
}

function EUC_V161_estIncident_(x){
  var code=EUC_V161_norm_(
    (x&&x.statutCode)||' '+(x&&x.statut)||' '+(x&&x.status)||''
  );
  return code.indexOf('annul')>=0 || code.indexOf('interromp')>=0;
}

function EUC_V161_incidentLabel_(x){
  var code=EUC_V161_norm_((x&&x.statutCode)||' '+(x&&x.statut)||'');
  if(code.indexOf('interromp')>=0)return 'Convention interrompue';
  return 'Convention annulée';
}

function EUC_V161_historiqueDepuisLigne_(x){
  return {
    type:EUC_V161_incidentLabel_(x),
    numero:EUC_V161_txt_(x.numero),
    entreprise:EUC_V161_txt_(x.entreprise),
    statut:EUC_V161_txt_(x.statut),
    statutCode:EUC_V161_txt_(x.statutCode)
  };
}

function EUC_SUIVI_CLASSE_detailV161(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId);
  d.historiqueIncidents=[];

  d.lignes=(d.lignes||[]).map(function(x){
    x.historiqueConventions=x.historiqueConventions||[];

    if(EUC_V161_estIncident_(x)){
      var hist=EUC_V161_historiqueDepuisLigne_(x);
      x.historiqueConventions.push(hist);
      d.historiqueIncidents.push({
        eleveId:x.eleveId,
        nom:EUC_V161_txt_(x.nom),
        prenom:EUC_V161_txt_(x.prenom),
        numero:hist.numero,
        entreprise:hist.entreprise,
        statut:hist.statut||hist.type,
        type:hist.type
      });

      x.statutCode='SANS_CONVENTION';
      x.statut='Sans convention';
      x.numero='';
      x.entreprise='';
      x.adresseEntreprise='';
      x.contactEntreprise='';
    }

    return x;
  });

  var total=d.lignes.length;
  var sans=0,avec=0;
  d.lignes.forEach(function(x){
    if(EUC_V161_norm_(x.statutCode).indexOf('sans convention')>=0 ||
       EUC_V161_norm_(x.statut).indexOf('sans convention')>=0){
      sans++;
    }else{
      avec++;
    }
  });

  d.stats=d.stats||{};
  d.stats.total=total;
  d.stats.avecConvention=avec;
  d.stats.sansConvention=sans;
  d.stats.annulees=d.historiqueIncidents.filter(function(x){
    return EUC_V161_norm_(x.type).indexOf('annul')>=0;
  }).length;
  d.stats.interrompues=d.historiqueIncidents.filter(function(x){
    return EUC_V161_norm_(x.type).indexOf('interromp')>=0;
  }).length;

  return d;
}

function EUC_V161_historiqueHtml_(detail){
  var incidents=(detail&&detail.historiqueIncidents)||[];
  if(!incidents.length)return '';

  function e(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var rows=incidents.map(function(x){
    return '<tr>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e((x.nom||'')+' '+(x.prenom||''))+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e(x.numero||'—')+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px">'+e(x.entreprise||'—')+'</td>'+ 
      '<td style="border:1px solid #cfd8e3;padding:7px;color:#b42318;font-weight:700">'+e(x.statut||x.type)+'</td>'+ 
    '</tr>';
  }).join('');

  return '<br><h3 style="font-family:Arial,sans-serif;color:#b42318">Conventions annulées ou interrompues pendant cette PFMP</h3>'+ 
    '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">'+ 
    '<thead><tr style="background:#fff1f2">'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Élève</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Convention</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Ancienne entreprise</th>'+ 
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Situation</th>'+ 
    '</tr></thead><tbody>'+rows+'</tbody></table>';
}
