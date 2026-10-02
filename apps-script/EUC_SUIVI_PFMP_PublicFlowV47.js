/**
 * Eucalyptus PFMP — v1.0.0-dev.167
 *
 * Circuit :
 *   1. Synthèse familles : BAC PRO / BTS / CAP
 *   2. Une famille -> classes de cette famille, avec décompte par période
 *   3. Une période de classe -> détail complet des élèves
 *
 * Les conventions annulées/interrompues/supprimées/révoquées
 * ne comptent jamais comme conventions actives.
 */

var EUC_V47_TTL_=120;

function EUC_V47_txt_(v){return String(v==null?'':v).trim();}
function EUC_V47_norm_(v){
  return EUC_V47_txt_(v).toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function EUC_V47_active_(a){
  if(!a)return false;
  if(a.Revoked===true || a.Supprimee_admin===true)return false;
  var s=EUC_V47_norm_(a.Statut_administratif||a.Statut||'');
  return !(
    s.indexOf('ANNULEE')>=0 ||
    s.indexOf('INTERROMP')>=0 ||
    s.indexOf('SUPPRIM')>=0 ||
    s.indexOf('REVOQU')>=0
  );
}

function EUC_V47_family_(card){
  var fam=EUC_SUIVI_PUBLIC_famille_(card);
  return fam?fam.code:'';
}

function EUC_V47_familyLabel_(fam){
  return fam==='BACPRO'?'BAC PRO':fam;
}

function EUC_V47_periodKind_(p,fam){
  var t=EUC_V47_norm_(p&&p.libelle);
  if(/P[\.\s-]*DIF/.test(t))return 'PDIFF';
  if(/EXAMEN|VISITE|(^| )ENT[\.\s-]*($| )/.test(t))return '';
  if(/PFMP|STAGE|ALTERNANCE/.test(t))return 'METIER';
  return '';
}

function EUC_V47_sourceCards_(annee){
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee);
  return JSON.parse(JSON.stringify((accueil&&accueil.cartes)||[]));
}

function EUC_V47_snapshot_(annee){
  var cache=CacheService.getScriptCache();
  var key='EUC_V47_SNAPSHOT_'+EUC_V47_txt_(annee);
  var cached=cache.get(key);
  if(cached){
    try{return JSON.parse(cached);}catch(e){}
  }

  var cards=EUC_V47_sourceCards_(annee);

  // Comptage strict des conventions actives, dédoublonné par élève.
  var activeBy={};
  EUC_CONVENTION_lireAccesFraisV108_().forEach(function(a){
    if(!EUC_V47_active_(a))return;
    var an=EUC_V47_txt_(a.Annee_scolaire);
    if(annee && an && an!==annee)return;

    var cid=Number(EUC_PFMP_ref_(a.Classe_convention))||0;
    var pid=Number(EUC_PFMP_ref_(a.Periode))||0;
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(cid>0&&pid>0&&eid>0)activeBy[cid+'|'+pid+'|'+eid]=1;
  });

  var counts={};
  Object.keys(activeBy).forEach(function(k){
    var a=k.split('|');
    var kp=a[0]+'|'+a[1];
    counts[kp]=(counts[kp]||0)+1;
  });

  cards.forEach(function(c){
    var fam=EUC_V47_family_(c);
    var effectif=Number(c.effectif)||0;

    var metier=(c.periodes||[])
      .filter(function(p){return EUC_V47_periodKind_(p,fam)==='METIER';})
      .sort(function(a,b){
        return EUC_V47_txt_(a.debut).localeCompare(EUC_V47_txt_(b.debut));
      });

    metier.forEach(function(p,i){
      p.v47Slot=(fam==='BTS'?'Stage n°':'PFMP n°')+(i+1);
    });

    (c.periodes||[]).forEach(function(p){
      var kind=EUC_V47_periodKind_(p,fam);
      if(kind==='PDIFF')p.v47Slot='P.dif.';
      p.conventions=Number(counts[Number(c.classeId)+'|'+Number(p.id)]||0);
      p.total=Number(p.total)||effectif;
      p.manquantes=Math.max(0,p.total-p.conventions);
      p.pourcentage=p.total?Math.round((p.conventions/p.total)*100):0;
    });
  });

  var out={annee:annee,cartes:cards};
  try{cache.put(key,JSON.stringify(out),EUC_V47_TTL_);}catch(e){}
  return out;
}

function EUC_V47_familySummary_(annee){
  var cards=EUC_V47_snapshot_(annee).cartes||[];
  var fams={};

  cards.forEach(function(c){
    var fam=EUC_V47_family_(c);
    if(!fam)return;

    if(!fams[fam]){
      fams[fam]={
        code:fam,
        libelle:EUC_V47_familyLabel_(fam),
        classes:0,
        effectif:0,
        slots:{}
      };
    }

    var f=fams[fam];
    f.classes++;
    f.effectif+=Number(c.effectif)||0;

    (c.periodes||[]).forEach(function(p){
      var slot=EUC_V47_txt_(p.v47Slot);
      if(!slot)return;

      if(!f.slots[slot]){
        f.slots[slot]={
          libelle:slot,
          conventions:0,
          total:0,
          classes:0
        };
      }

      f.slots[slot].conventions+=Number(p.conventions)||0;
      f.slots[slot].total+=Number(p.total)||Number(c.effectif)||0;
      f.slots[slot].classes++;
    });
  });

  var orderSlot=function(x){
    if(x.libelle==='P.dif.')return 900;
    var m=x.libelle.match(/(\d+)$/);
    return m?Number(m[1]):500;
  };

  return ['BACPRO','BTS','CAP']
    .filter(function(k){return !!fams[k];})
    .map(function(k){
      var f=fams[k];
      f.periodes=Object.keys(f.slots).map(function(s){
        var p=f.slots[s];
        p.manquantes=Math.max(0,p.total-p.conventions);
        p.pourcentage=p.total?Math.round((p.conventions/p.total)*100):0;
        return p;
      }).sort(function(a,b){return orderSlot(a)-orderSlot(b);});
      delete f.slots;
      return f;
    });
}

function EUC_V47_familyClasses_(annee,famille){
  var cards=(EUC_V47_snapshot_(annee).cartes||[])
    .filter(function(c){return EUC_V47_family_(c)===famille;});

  return cards.map(function(c){
    var ps=(c.periodes||[])
      .filter(function(p){return !!EUC_V47_txt_(p.v47Slot);})
      .map(function(p){
        return {
          id:Number(p.id)||0,
          libelle:EUC_V47_txt_(p.v47Slot),
          originalLibelle:EUC_V47_txt_(p.libelle),
          debut:EUC_V47_txt_(p.debut),
          fin:EUC_V47_txt_(p.fin),
          debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
          finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
          conventions:Number(p.conventions)||0,
          total:Number(p.total)||Number(c.effectif)||0,
          manquantes:Math.max(0,(Number(p.total)||Number(c.effectif)||0)-(Number(p.conventions)||0)),
          pourcentage:(Number(p.total)||Number(c.effectif)||0)
            ? Math.round((Number(p.conventions)||0)/(Number(p.total)||Number(c.effectif)||1)*100)
            : 0
        };
      });

    return {
      classeId:Number(c.classeId)||0,
      classe:EUC_V47_txt_(c.classe),
      effectif:Number(c.effectif)||0,
      periodes:ps
    };
  }).sort(function(a,b){
    return a.classe.localeCompare(b.classe,'fr');
  });
}

function EUC_SUIVI_PUBLIC_afficherFamillesV47(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamillesV47');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(EUC_V47_txt_(e&&e.parameter&&e.parameter.annee));
  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_bootstrapFamillesV47(payload){
  payload=payload||{};
  var fake={parameter:{annee:EUC_V47_txt_(payload.annee)}};
  var ctx=EUC_SUIVI_PUBLIC_contexte_(fake);
  return {
    ok:true,
    ctx:ctx,
    familles:EUC_V47_familySummary_(ctx.active)
  };
}

function EUC_SUIVI_PUBLIC_afficherFamilleV47(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamilleV47');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.paramsJson=JSON.stringify({
    annee:EUC_V47_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_V47_txt_(e&&e.parameter&&e.parameter.famille)
  });
  return tpl.evaluate()
    .setTitle('Suivi des conventions — '+EUC_V47_familyLabel_(EUC_V47_txt_(e&&e.parameter&&e.parameter.famille)))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_chargerFamilleV47(payload){
  payload=payload||{};
  var annee=EUC_V47_txt_(payload.annee);
  var famille=EUC_V47_txt_(payload.famille);
  if(!annee||!famille)throw new Error('Année ou famille manquante.');
  return {
    ok:true,
    annee:annee,
    famille:famille,
    familleLibelle:EUC_V47_familyLabel_(famille),
    classes:EUC_V47_familyClasses_(annee,famille)
  };
}

function EUC_V47_statutDetail_(a){
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
  if(EUC_V47_active_(a)){
    var s=EUC_V155_statutLibelle_(a);
    return {code:s.code,libelle:s.libelle,active:true};
  }
  var n=EUC_V47_norm_(a.Statut_administratif||a.Statut||'');
  if(n.indexOf('ANNULEE')>=0)return {code:'ANNULEE',libelle:'Annulée',active:false};
  if(n.indexOf('INTERROMP')>=0)return {code:'INTERROMPUE',libelle:'Interrompue',active:false};
  return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
}

function EUC_V47_tuteur_(a){
  if(!a)return '';
  var nom=[EUC_V47_txt_(a.Tuteur_prenom),EUC_V47_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  if(!nom)nom=EUC_V47_txt_(a.Tuteur_nom);
  return [nom,EUC_V47_txt_(a.Tuteur_telephone),EUC_V47_txt_(a.Tuteur_courriel)].filter(Boolean).join(' · ');
}

function EUC_V47_enrichirDetail_(detail,annee,classeId,periodeId){
  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    if(Number(EUC_PFMP_ref_(a.Classe_convention))!==Number(classeId))return false;
    if(periodeId&&Number(EUC_PFMP_ref_(a.Periode))!==Number(periodeId))return false;
    var an=EUC_V47_txt_(a.Annee_scolaire);
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
    var list=(byEleve[Number(x.eleveId)]||[]).slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});
    var actif=list.filter(EUC_V47_active_)[0]||null;
    var dernier=actif||list[0]||null;
    var st=EUC_V47_statutDetail_(dernier);
    var src=actif||dernier;

    x.conventionId=actif?Number(actif.id)||0:0;
    x.numero=actif?EUC_ADMIN_WORKFLOW_numeroV144_(actif):'';
    x.statutCode=st.code;
    x.statut=st.libelle;
    x.entreprise=src?EUC_V47_txt_(src.Entreprise_raison_sociale):'';
    x.adresseEntreprise=src?EUC_V155_adresseEntreprise_(src):'';
    x.contactEntreprise=src?EUC_V155_contactEntreprise_(src):'';
    x.tuteurEntreprise=src?EUC_V47_tuteur_(src):'';

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

  // Numérotation visible de toutes les périodes de la classe.
  var ps=(detail.periodes||[]).slice().sort(function(a,b){
    return EUC_V47_txt_(a.debut).localeCompare(EUC_V47_txt_(b.debut));
  });
  var fam=EUC_V47_family_(detail.classe||{});
  var n=0;
  ps.forEach(function(p){
    var kind=EUC_V47_periodKind_(p,fam);
    if(kind==='PDIFF'){
      p.libelle='P.dif.';
    }else if(kind==='METIER'){
      n++;
      p.libelle=(fam==='BTS'?'Stage n°':'PFMP n°')+n;
    }
  });
  detail.periodes=ps;

  if(detail.periode){
    var cur=ps.filter(function(p){return Number(p.id)===Number(detail.periode.id);})[0];
    if(cur)detail.periode.libelle=cur.libelle;
  }

  return detail;
}

function EUC_SUIVI_CLASSE_afficherV47(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V47_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');

  var detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
  var pid=Number(detail&&detail.periode&&detail.periode.id)||periodeId||0;
  detail=EUC_V47_enrichirDetail_(detail,annee,classeId,pid);

  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);

  return tpl.evaluate()
    .setTitle('Suivi PFMP — '+detail.classe.nom)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
