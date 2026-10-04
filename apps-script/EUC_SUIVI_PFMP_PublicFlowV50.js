/**
 * Eucalyptus PFMP — v1.0.0-dev.170
 *
 * Règle de comptage :
 * une convention ne compte comme "remontée / enregistrée" que si les
 * informations entreprise ont réellement été saisies ou si elle a franchi
 * une étape administrative postérieure.
 *
 * CONVENTION_GENEREE seule = PAS une convention remontée.
 * Annulée / interrompue / supprimée / révoquée = PAS active.
 */

var EUC_V50_TTL_FAMILY_=300;
var EUC_V50_TTL_DETAIL_=90;

function EUC_V50_txt_(v){return String(v==null?'':v).trim();}
function EUC_V50_norm_(v){
  return EUC_V50_txt_(v).toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function EUC_V50_inactive_(a){
  if(!a)return true;
  if(a.Revoked===true || a.Supprimee_admin===true)return true;
  var s=EUC_V50_norm_(a.Statut_administratif||a.Statut||'');
  return (
    s.indexOf('ANNULEE')>=0 ||
    s.indexOf('INTERROMP')>=0 ||
    s.indexOf('SUPPRIM')>=0 ||
    s.indexOf('REVOQU')>=0
  );
}

function EUC_V50_estRemontee_(a){
  if(!a || EUC_V50_inactive_(a))return false;

  var s=EUC_V50_norm_(a.Statut_administratif||a.Statut||'');

  // États qui prouvent que la convention a réellement été renseignée.
  if([
    'ENTREPRISE_SAISIE',
    'INFORMATIONS_ENREGISTREES',
    'ORIGINAL_DEPOSE_BFE',
    'SIGNE_PROVISEUR',
    'CONVENTION_FINALISEE',
    'CONVENTION_REMISE',
    'PFMP_AUTORISEE'
  ].indexOf(s)>=0)return true;

  // Compatibilité dossiers existants : données entreprise/tuteur réellement saisies.
  return !!(
    EUC_V50_txt_(a.Date_saisie_entreprise) ||
    EUC_V50_txt_(a.Entreprise_raison_sociale) ||
    EUC_V50_txt_(a.Entreprise_siret) ||
    EUC_V50_txt_(a.Entreprise_nis) ||
    EUC_V50_txt_(a.Tuteur_nom) ||
    EUC_V50_txt_(a.Tuteur_telephone) ||
    EUC_V50_txt_(a.Tuteur_courriel)
  );
}

function EUC_V50_incident_(a){
  var s=EUC_V50_norm_(a&&(a.Statut_administratif||a.Statut)||'');
  if(s.indexOf('ANNULEE')>=0)return 'ANNULEE';
  if(s.indexOf('INTERROMP')>=0)return 'INTERROMPUE';
  return '';
}

function EUC_V50_family_(card){
  var fam=EUC_SUIVI_PUBLIC_famille_(card);
  return fam?fam.code:'';
}

function EUC_V50_familyLabel_(fam){
  return fam==='BACPRO'?'BAC PRO':fam;
}

function EUC_V50_periodKind_(p){
  var t=EUC_V50_norm_(p&&p.libelle);
  if(/P[\.\s-]*DIF/.test(t))return 'PDIFF';
  if(/EXAMEN|VISITE|(^| )ENT[\.\s-]*($| )/.test(t))return '';
  if(/PFMP|STAGE|ALTERNANCE/.test(t))return 'METIER';
  return '';
}

function EUC_V50_sourceCards_(annee){
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee);
  return JSON.parse(JSON.stringify((accueil&&accueil.cartes)||[]));
}

function EUC_V50_snapshot_(annee){
  var cache=CacheService.getScriptCache();
  var key='EUC_V50_SNAPSHOT_'+EUC_V50_txt_(annee);
  var cached=cache.get(key);
  if(cached){
    try{return JSON.parse(cached);}catch(e){}
  }

  var cards=EUC_V50_sourceCards_(annee);

  // Une seule lecture de la table d'accès, puis index mémoire.
  var activeBy={};
  EUC_CONVENTION_lireAccesFraisV108_().forEach(function(a){
    if(!EUC_V50_estRemontee_(a))return;

    var an=EUC_V50_txt_(a.Annee_scolaire);
    if(annee && an && an!==annee)return;

    var cid=Number(EUC_PFMP_ref_(a.Classe_convention))||0;
    var pid=Number(EUC_PFMP_ref_(a.Periode))||0;
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(cid>0&&pid>0&&eid>0){
      activeBy[cid+'|'+pid+'|'+eid]=1;
    }
  });

  var counts={};
  Object.keys(activeBy).forEach(function(k){
    var a=k.split('|'),kp=a[0]+'|'+a[1];
    counts[kp]=(counts[kp]||0)+1;
  });

  cards.forEach(function(c){
    var fam=EUC_V50_family_(c);
    var effectif=Number(c.effectif)||0;

    var metier=(c.periodes||[])
      .filter(function(p){return EUC_V50_periodKind_(p)==='METIER';})
      .sort(function(a,b){
        return EUC_V50_txt_(a.debut).localeCompare(EUC_V50_txt_(b.debut));
      });

    metier.forEach(function(p,i){
      p.v50Slot=(fam==='BTS'?'Stage n°':'PFMP n°')+(i+1);
    });

    (c.periodes||[]).forEach(function(p){
      var kind=EUC_V50_periodKind_(p);
      if(kind==='PDIFF')p.v50Slot='P.dif.';
      p.conventions=Number(counts[Number(c.classeId)+'|'+Number(p.id)]||0);
      p.total=Number(p.total)||effectif;
      p.manquantes=Math.max(0,p.total-p.conventions);
      p.pourcentage=p.total?Math.round((p.conventions/p.total)*100):0;
    });
  });

  var out={annee:annee,cartes:cards,builtAt:new Date().toISOString()};
  try{cache.put(key,JSON.stringify(out),EUC_V50_TTL_FAMILY_);}catch(e){}
  return out;
}

function EUC_V50_familySummary_(annee){
  var cards=EUC_V50_snapshot_(annee).cartes||[],fams={};

  cards.forEach(function(c){
    var fam=EUC_V50_family_(c);
    if(!fam)return;

    if(!fams[fam]){
      fams[fam]={
        code:fam,
        libelle:EUC_V50_familyLabel_(fam),
        classes:0,effectif:0,slots:{}
      };
    }

    var f=fams[fam];
    f.classes++;
    f.effectif+=Number(c.effectif)||0;

    (c.periodes||[]).forEach(function(p){
      var slot=EUC_V50_txt_(p.v50Slot);
      if(!slot)return;

      if(!f.slots[slot]){
        f.slots[slot]={libelle:slot,conventions:0,total:0,classes:0};
      }

      f.slots[slot].conventions+=Number(p.conventions)||0;
      f.slots[slot].total+=Number(p.total)||Number(c.effectif)||0;
      f.slots[slot].classes++;
    });
  });

  function order(p){
    if(p.libelle==='P.dif.')return 900;
    var m=p.libelle.match(/(\d+)$/);
    return m?Number(m[1]):500;
  }

  return ['BACPRO','BTS','CAP']
    .filter(function(k){return !!fams[k];})
    .map(function(k){
      var f=fams[k];
      f.periodes=Object.keys(f.slots).map(function(s){
        var p=f.slots[s];
        p.manquantes=Math.max(0,p.total-p.conventions);
        p.pourcentage=p.total?Math.round((p.conventions/p.total)*100):0;
        return p;
      }).sort(function(a,b){return order(a)-order(b);});
      delete f.slots;
      return f;
    });
}

function EUC_V50_familyClasses_(annee,famille){
  return (EUC_V50_snapshot_(annee).cartes||[])
    .filter(function(c){return EUC_V50_family_(c)===famille;})
    .map(function(c){
      var ps=(c.periodes||[])
        .filter(function(p){return !!EUC_V50_txt_(p.v50Slot);})
        .map(function(p){
          var total=Number(p.total)||Number(c.effectif)||0;
          var conv=Number(p.conventions)||0;
          return {
            id:Number(p.id)||0,
            libelle:EUC_V50_txt_(p.v50Slot),
            originalLibelle:EUC_V50_txt_(p.libelle),
            debut:EUC_V50_txt_(p.debut),
            fin:EUC_V50_txt_(p.fin),
            debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
            finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
            conventions:conv,
            total:total,
            manquantes:Math.max(0,total-conv),
            pourcentage:total?Math.round(conv/total*100):0
          };
        });

      return {
        classeId:Number(c.classeId)||0,
        classe:EUC_V50_txt_(c.classe),
        effectif:Number(c.effectif)||0,
        periodes:ps
      };
    })
    .sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});
}

function EUC_SUIVI_PUBLIC_afficherFamillesV50(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamillesV50');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(EUC_V50_txt_(e&&e.parameter&&e.parameter.annee));
  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_resumeFamilleV50(payload){
  payload=payload||{};
  var annee=EUC_V50_txt_(payload.annee);
  var famille=EUC_V50_txt_(payload.famille);
  if(!annee||!famille)throw new Error('Année ou famille manquante.');

  var cache=CacheService.getScriptCache(),key='EUC_V50_FAM_'+annee+'_'+famille;
  var cached=cache.get(key);
  if(cached){try{return JSON.parse(cached);}catch(e){}}

  var f=(EUC_V50_familySummary_(annee)||[]).filter(function(x){
    return x.code===famille;
  })[0]||{
    code:famille,
    libelle:EUC_V50_familyLabel_(famille),
    classes:0,effectif:0,periodes:[]
  };

  try{cache.put(key,JSON.stringify(f),EUC_V50_TTL_FAMILY_);}catch(e){}
  return f;
}

function EUC_SUIVI_PUBLIC_afficherFamilleV50(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamilleV50');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.paramsJson=JSON.stringify({
    annee:EUC_V50_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_V50_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_chargerFamilleV50(payload){
  payload=payload||{};
  var annee=EUC_V50_txt_(payload.annee),famille=EUC_V50_txt_(payload.famille);
  if(!annee||!famille)throw new Error('Année ou famille manquante.');

  var cache=CacheService.getScriptCache(),key='EUC_V50_CLASSES_'+annee+'_'+famille;
  var cached=cache.get(key);
  if(cached){try{return JSON.parse(cached);}catch(e){}}

  var out={
    ok:true,
    annee:annee,
    famille:famille,
    familleLibelle:EUC_V50_familyLabel_(famille),
    classes:EUC_V50_familyClasses_(annee,famille)
  };

  try{cache.put(key,JSON.stringify(out),180);}catch(e){}
  return out;
}

function EUC_V50_detailKey_(annee,classeId,periodeId){
  return 'EUC_V50_DETAIL_'+annee+'_'+classeId+'_'+periodeId;
}

function EUC_V50_statutDetail_(a){
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};

  if(EUC_V50_estRemontee_(a)){
    var l=EUC_V155_statutLibelle_(a);
    return {code:l.code,libelle:l.libelle,active:true};
  }

  var incident=EUC_V50_incident_(a);
  if(incident==='ANNULEE')return {code:'ANNULEE',libelle:'Annulée',active:false};
  if(incident==='INTERROMPUE')return {code:'INTERROMPUE',libelle:'Interrompue',active:false};

  return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
}

function EUC_V50_tuteur_(a){
  if(!a)return '';
  var nom=[EUC_V50_txt_(a.Tuteur_prenom),EUC_V50_txt_(a.Tuteur_nom)]
    .filter(Boolean).join(' ').trim();
  if(!nom)nom=EUC_V50_txt_(a.Tuteur_nom);
  return [
    nom,
    EUC_V50_txt_(a.Tuteur_telephone),
    EUC_V50_txt_(a.Tuteur_courriel)
  ].filter(Boolean).join(' · ');
}

function EUC_DEV394_BASE_EUC_V50_enrichirDetail_(detail,annee,classeId,periodeId){
  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    if(Number(EUC_PFMP_ref_(a.Classe_convention))!==Number(classeId))return false;
    if(periodeId&&Number(EUC_PFMP_ref_(a.Periode))!==Number(periodeId))return false;
    var an=EUC_V50_txt_(a.Annee_scolaire);
    return !annee||!an||an===annee;
  });

  var byEleve={};
  dossiers.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(!eid)return;
    (byEleve[eid]||(byEleve[eid]=[])).push(a);
  });

  var avec=0,ann=0,intp=0;

  (detail.lignes||[]).forEach(function(x){
    var list=(byEleve[Number(x.eleveId)]||[])
      .slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});

    var actif=list.filter(EUC_V50_estRemontee_)[0]||null;
    var dernier=actif||list[0]||null;
    var st=EUC_V50_statutDetail_(dernier);
    var src=actif||dernier;

    x.conventionId=actif?Number(actif.id)||0:0;
    x.numero=actif?EUC_ADMIN_WORKFLOW_numeroV144_(actif):'';
    x.statutCode=st.code;
    x.statut=st.libelle;

    // Les coordonnées restent visibles pour un incident, mais il ne compte pas actif.
    x.entreprise=src?EUC_V50_txt_(src.Entreprise_raison_sociale):'';
    x.siretEntreprise=src?EUC_V50_txt_(src.Entreprise_siret):'';
    x.adresseEntreprise=src?EUC_V155_adresseEntreprise_(src):'';
    x.contactEntreprise=src?EUC_V155_contactEntreprise_(src):'';
    x.tuteurEntreprise=src?EUC_V50_tuteur_(src):'';

    if(st.active)avec++;
    if(st.code==='ANNULEE')ann++;
    if(st.code==='INTERROMPUE')intp++;
  });

  detail.stats=detail.stats||{};
  detail.stats.total=(detail.lignes||[]).length;
  detail.stats.avecConvention=avec;
  detail.stats.annulees=ann;
  detail.stats.interrompues=intp;
  detail.stats.sansConvention=Math.max(0,detail.stats.total-avec-ann-intp);

  return detail;
}

function EUC_SUIVI_CLASSE_prewarmV50(payload){
  payload=payload||{};
  var annee=EUC_V50_txt_(payload.annee);
  var classeId=Number(payload.classe)||0;
  var periodeId=Number(payload.periode)||0;
  if(!annee||!classeId||!periodeId)return {ok:false};

  var key=EUC_V50_detailKey_(annee,classeId,periodeId);
  var cache=CacheService.getScriptCache();
  if(cache.get(key))return {ok:true,cached:true};

  var d=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
  d=EUC_V50_enrichirDetail_(d,annee,classeId,periodeId);

  try{cache.put(key,JSON.stringify(d),EUC_V50_TTL_DETAIL_);}catch(e){}
  return {ok:true,cached:false};
}

function EUC_SUIVI_CLASSE_afficherV50(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V50_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;

  if(classeId<=0)throw new Error('Classe manquante.');

  var key=EUC_V50_detailKey_(annee,classeId,periodeId);
  var cache=CacheService.getScriptCache(),detail=null,cached=cache.get(key);

  if(cached){
    try{detail=JSON.parse(cached);}catch(e){}
  }

  if(!detail){
    detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
    var pid=Number(detail&&detail.periode&&detail.periode.id)||periodeId||0;
    detail=EUC_V50_enrichirDetail_(detail,annee,classeId,pid);
    try{cache.put(key,JSON.stringify(detail),EUC_V50_TTL_DETAIL_);}catch(e){}
  }

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_V50_enrichirDetail_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_V50_enrichirDetail_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_V50_enrichirDetail_',Date.now()-__t);
  }
}
