
/**
 * PFMP DEV277A — diagnostic strictement lecture seule.
 * Aucune écriture Grist, aucun rebuild de snapshot.
 */
function EUC_DEV277A_txt_(v){
  return String(v==null?'':v).trim();
}
function EUC_DEV277A_norm_(v){
  return EUC_DEV277A_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}
function EUC_DEV277A_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}
  if(Array.isArray(v))return Number(v[1]||v[0])||0;
  return Number(v)||0;
}
function EUC_DEV277A_iso_(v){
  if(v===null||v===undefined||v==='')return '';
  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var d=EUC_IMPORT_dateExistanteISO_(v);
      if(d)return d;
    }
  }catch(e){}
  var s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  return s;
}
function EUC_DEV277A_safe_(fn){
  try{
    return {ok:true,value:fn()};
  }catch(e){
    return {
      ok:false,
      error:String(e&&e.message||e)
    };
  }
}
function EUC_DEV277A_pickStudent_(obj,eid){
  if(!obj)return null;

  if(typeof obj==='string'){
    try{obj=JSON.parse(obj);}catch(e){return null;}
  }

  var rows=Array.isArray(obj.students)
    ? obj.students
    : [];

  return rows.filter(function(x){
    return Number(x&&x.id)===Number(eid);
  })[0]||null;
}
function EUC_DEV277A_pickTmp3d_(obj){
  obj=obj||{};
  var rows=obj.classes||(
    obj.payload&&obj.payload.classes
  )||[];

  return rows.filter(function(c){
    var name=EUC_DEV277A_norm_(
      c&&(
        c.classe||
        c.nom||
        c.classeNom||
        c.code
      )
    );
    return name==='TMP3D';
  })[0]||null;
}
function EUC_DEV277A_appRow_(r){
  return {
    id:Number(r.id)||0,
    Eleve:EUC_DEV277A_ref_(r.Eleve),
    Annee_scolaire:EUC_DEV277A_txt_(r.Annee_scolaire),
    Actif:r.Actif!==false,
    Statut_dossier:EUC_DEV277A_txt_(r.Statut_dossier),
    Date_contrat_officielle:EUC_DEV277A_iso_(r.Date_contrat_officielle),
    Date_debut:EUC_DEV277A_iso_(r.Date_debut),
    Date_fin:EUC_DEV277A_iso_(r.Date_fin),
    Date_rupture_contrat:EUC_DEV277A_iso_(r.Date_rupture_contrat),
    Nouveau_contrat:!!r.Nouveau_contrat,
    Dossier_distribue:!!r.Dossier_distribue,
    Dossier_remis:!!r.Dossier_remis,
    Date_distribution_dossier:EUC_DEV277A_iso_(r.Date_distribution_dossier),
    Date_remise_dossier:EUC_DEV277A_iso_(r.Date_remise_dossier),
    Dossier_transmis_CFA:!!r.Dossier_transmis_CFA,
    Date_transmission_CFA:EUC_DEV277A_iso_(r.Date_transmission_CFA),
    Entreprise:EUC_DEV277A_txt_(r.Entreprise),
    Nom_entreprise:EUC_DEV277A_txt_(r.Nom_entreprise),
    Nom_commercial:EUC_DEV277A_txt_(r.Nom_commercial),
    SIRET:EUC_DEV277A_txt_(r.SIRET),
    Date_creation:EUC_DEV277A_txt_(r.Date_creation),
    Date_modification:EUC_DEV277A_txt_(r.Date_modification)
  };
}
function EUC_DEV277A_diag(payload){
  payload=payload||{};

  try{
    if(typeof EUC_IMPORT_exigerAdminTexte_==='function'){
      EUC_IMPORT_exigerAdminTexte_();
    }
  }catch(e){}

  var annee=EUC_DEV277A_txt_(payload.annee)||'2026-2027';
  var nom=EUC_DEV277A_norm_(payload.nom||'KIROF');
  var prenom=EUC_DEV277A_norm_(payload.prenom||'Adriano');

  var students=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];

  var matches=students.filter(function(e){
    var n=EUC_DEV277A_norm_(e.Nom);
    var p=EUC_DEV277A_norm_(e.Prenom_usage||e.Prenom);

    return (
      n===nom &&
      (!prenom || p===prenom)
    );
  });

  var out={
    ok:true,
    lectureSeule:true,
    diagnosticLe:new Date().toISOString(),
    recherche:{
      annee:annee,
      nom:nom,
      prenom:prenom
    },
    eleves:[],
    conclusions:[]
  };

  matches.forEach(function(e){
    var eid=Number(e.id)||0;
    var cid=EUC_DEV277A_ref_(e.Classe);

    var appRows=(EUC_IMPORT_lireRecords_(
      'EUC_APPRENTISSAGE_PFMP'
    )||[])
      .filter(function(r){
        return EUC_DEV277A_ref_(r.Eleve)===eid;
      })
      .map(EUC_DEV277A_appRow_)
      .sort(function(a,b){
        return b.id-a.id;
      });

    var complete=appRows.filter(function(r){
      return (
        !!r.Date_contrat_officielle &&
        !!r.Date_debut &&
        !!r.Date_fin &&
        !r.Date_rupture_contrat
      );
    });

    var latest=appRows[0]||null;

    var item={
      eleve:{
        id:eid,
        nom:e.Nom||'',
        prenom:e.Prenom_usage||e.Prenom||'',
        classeId:cid,
        codeClasse:e.Code_classe_importe||'',
        sourcePronote:e.Source_Pronote||''
      },
      apprentissageRows:appRows,
      analyseBrute:{
        nbLignes:appRows.length,
        nbContratsComplets:complete.length,
        derniereLigne:latest,
        plusRecentContratComplet:complete[0]||null
      },
      selectionDEV192:EUC_DEV277A_safe_(function(){
        if(typeof EUC_DEV192_currentContractRows_!=='function'){
          return {absent:true};
        }

        return (EUC_DEV192_currentContractRows_(eid)||[])
          .slice(0,8)
          .map(function(r){
            return {
              id:Number(r.id)||0,
              fields:r.fields||{}
            };
          });
      }),
      selectionDEV277:EUC_DEV277A_safe_(function(){
        if(typeof EUC_DEV277_bestCurrent_!=='function'){
          return {absent:true};
        }

        var ep=EUC_DEV277_bestCurrent_(eid,annee);

        return {
          episode:ep||null,
          statut:
            ep&&typeof EUC_DEV277_status_==='function'
              ? EUC_DEV277_status_(ep)
              : null
        };
      }),
      loaders:{},
      dashboards:{},
      suiviFamille:{},
      detailsPeriodes:[]
    };

    item.loaders.DEV192=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV192_loadApprentis!=='function'){
        return {absent:true};
      }
      return EUC_DEV277A_pickStudent_(
        EUC_DEV192_loadApprentis(
          annee,
          cid,
          e.Code_classe_importe||'TMP3D'
        ),
        eid
      );
    });

    item.loaders.DEV235=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV235_loadStudentsJson!=='function'){
        return {absent:true};
      }
      return EUC_DEV277A_pickStudent_(
        EUC_DEV235_loadStudentsJson(
          annee,
          cid,
          e.Code_classe_importe||'TMP3D'
        ),
        eid
      );
    });

    item.loaders.DEV277=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV277_loadStudentsJson!=='function'){
        return {absent:true};
      }
      return EUC_DEV277A_pickStudent_(
        EUC_DEV277_loadStudentsJson(
          annee,
          cid,
          e.Code_classe_importe||'TMP3D'
        ),
        eid
      );
    });

    item.dashboards.DEV251=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV251_dashboardDetails!=='function'){
        return {absent:true};
      }

      var r=EUC_DEV251_dashboardDetails(annee)||{};
      var found={};

      Object.keys(r.lists||{}).forEach(function(k){
        found[k]=(r.lists[k]||[]).filter(function(x){
          return Number(x&&x.id)===eid;
        });
      });

      return found;
    });

    item.dashboards.DEV277=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV277_dashboardDetails!=='function'){
        return {absent:true};
      }

      var r=EUC_DEV277_dashboardDetails(annee)||{};
      var found={};

      Object.keys(r.lists||{}).forEach(function(k){
        found[k]=(r.lists[k]||[]).filter(function(x){
          return Number(x&&x.id)===eid;
        });
      });

      return found;
    });

    item.suiviFamille.G1=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV190G1_chargerFamille!=='function'){
        return {absent:true};
      }

      var r=EUC_DEV190G1_chargerFamille({
        annee:annee,
        famille:'BACPRO'
      });

      return {
        tmp3d:EUC_DEV277A_pickTmp3d_(r),
        resume:
          typeof EUC_DEV190G1_resumeFamille==='function'
            ? EUC_DEV190G1_resumeFamille({
                annee:annee,
                famille:'BACPRO'
              })
            : null
      };
    });

    item.suiviFamille.DEV276=EUC_DEV277A_safe_(function(){
      if(typeof EUC_DEV276_familyLive!=='function'){
        return {absent:true};
      }

      var r=EUC_DEV276_familyLive({
        annee:annee,
        famille:'BACPRO'
      });

      return {
        tmp3d:EUC_DEV277A_pickTmp3d_(r),
        apprentis:r&&r.apprentis
      };
    });

    var familyResult=null;

    try{
      if(
        item.suiviFamille.G1.ok &&
        item.suiviFamille.G1.value &&
        item.suiviFamille.G1.value.tmp3d
      ){
        familyResult=item.suiviFamille.G1.value.tmp3d;
      }
    }catch(e2){}

    (familyResult&&familyResult.periodes||[])
      .forEach(function(p){
        var pid=Number(p.id)||0;

        var d={
          id:pid,
          libelle:p.libelle||p.v50Slot||p.v51Slot||'',
          debut:p.debut||'',
          fin:p.fin||'',
          apprentis:p.apprentis,
          total:p.total,
          conventions:p.conventions
        };

        d.readOne=EUC_DEV277A_safe_(function(){
          if(typeof EUC_DEV190I_readOne!=='function'){
            return {absent:true};
          }

          var rr=EUC_DEV190I_readOne({
            annee:annee,
            classe:cid,
            periode:pid
          });

          var detail=rr&&rr.detail;
          var row=(detail&&detail.lignes||[])
            .filter(function(x){
              return Number(x.eleveId)===eid;
            })[0]||null;

          return {
            stats:detail&&detail.stats,
            eleve:row
          };
        });

        item.detailsPeriodes.push(d);
      });

    if(
      appRows.length>1 &&
      complete.length &&
      latest &&
      !latest.Date_contrat_officielle
    ){
      out.conclusions.push(
        'Plusieurs lignes apprentissage pour '+e.Nom+' '+(e.Prenom_usage||e.Prenom||'')+
        ' : la ligne la plus récente est incomplète alors qu’un ancien contrat complet existe.'
      );
    }

    if(!complete.length){
      out.conclusions.push(
        'Aucun contrat complet actuellement stocké pour '+e.Nom+' '+(e.Prenom_usage||e.Prenom||'')+
        ' : les dates ont réellement disparu ou n’ont jamais été persistées.'
      );
    }

    out.eleves.push(item);
  });

  if(!matches.length){
    out.conclusions.push(
      'Aucun élève KIROF Adriano trouvé dans EUC_ELEVES_PFMP.'
    );
  }

  return out;
}

function EUC_DEV277A_page(e){
  var t=HtmlService.createTemplateFromFile(
    'EUC_DEV277A_DiagnosticKirof'
  );

  t.paramsJson=JSON.stringify({
    annee:
      e&&e.parameter&&e.parameter.annee
        ? String(e.parameter.annee)
        : '2026-2027',
    nom:
      e&&e.parameter&&e.parameter.nom
        ? String(e.parameter.nom)
        : 'KIROF',
    prenom:
      e&&e.parameter&&e.parameter.prenom
        ? String(e.parameter.prenom)
        : 'Adriano'
  });

  return t.evaluate()
    .setTitle('Diagnostic apprentissage — lecture seule')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
