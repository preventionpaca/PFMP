var EUC_SUIVI_PUBLIC_V1_='1.0.0';
var EUC_SUIVI_PUBLIC_TTL_=600;

function EUC_SUIVI_PUBLIC_txt_(v){return String(v==null?'':v).trim();}
function EUC_SUIVI_PUBLIC_norm_(v){
  return EUC_SUIVI_PUBLIC_txt_(v).toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
}
function EUC_SUIVI_PUBLIC_famille_(c){
  var cat=EUC_SUIVI_PUBLIC_norm_(c&&c.categorie);
  var nom=EUC_SUIVI_PUBLIC_norm_(c&&c.classe);
  if(cat.indexOf('CAP')>=0||nom.indexOf('CAP')>=0)return {code:'CAP',libelle:'CAP',ordre:1};
  if(cat.indexOf('BTS')>=0||nom.indexOf('BTS')>=0)return {code:'BTS',libelle:'BTS',ordre:3};
  if(cat.indexOf('BAC')>=0||cat.indexOf('PRO')>=0||/^[T12]/.test(nom))return {code:'BACPRO',libelle:'Bac professionnel',ordre:2};
  return null;
}
function EUC_SUIVI_PUBLIC_niveau_(famille,c){
  var nom=EUC_SUIVI_PUBLIC_norm_(c&&c.classe);
  if(famille==='BACPRO'){
    if(/^T/.test(nom))return {code:'TERM',libelle:'Terminale',ordre:3};
    if(/^1/.test(nom)||/^P/.test(nom))return {code:'PREM',libelle:'Première',ordre:2};
    if(/^2/.test(nom)||/^S/.test(nom))return {code:'SECD',libelle:'Seconde',ordre:1};
  }
  if(famille==='CAP'){
    if(/^T/.test(nom)||/2E|2EME|2ÈME/.test(nom))return {code:'TCAP',libelle:'Terminale CAP',ordre:2};
    return {code:'1CAP',libelle:'1re année CAP',ordre:1};
  }
  if(famille==='BTS'){
    if(/(^|[^0-9])2([^0-9]|$)/.test(nom)||/2E|2EME|2ÈME|DEUXIEME/.test(nom))return {code:'BTS2',libelle:'2e année BTS',ordre:2};
    return {code:'BTS1',libelle:'1re année BTS',ordre:1};
  }
  return {code:'AUTRE',libelle:'Autre niveau',ordre:99};
}
function EUC_SUIVI_PUBLIC_periodeKey_(p){
  return [EUC_SUIVI_PUBLIC_txt_(p&&p.libelle),EUC_SUIVI_PUBLIC_txt_(p&&p.debut),EUC_SUIVI_PUBLIC_txt_(p&&p.fin)].join('|');
}
function EUC_SUIVI_PUBLIC_dateFr_(iso){
  var s=EUC_SUIVI_PUBLIC_txt_(iso),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?(m[3]+'/'+m[2]+'/'+m[1]):s;
}
function EUC_SUIVI_PUBLIC_cacheKey_(annee){return 'EUC_SUIVI_PUBLIC_V1_'+EUC_SUIVI_PUBLIC_txt_(annee);}
function EUC_SUIVI_PUBLIC_accueilSource_(annee){
  if(typeof EUC_SUIVI_CLASSES_accueilP1==='function')return EUC_SUIVI_CLASSES_accueilP1(annee,false);
  if(typeof EUC_SUIVI_CLASSES_accueilV154==='function')return EUC_SUIVI_CLASSES_accueilV154(annee);
  if(typeof EUC_V154_accueil_==='function')return EUC_V154_accueil_(annee);
  throw new Error('Source synthèse PFMP introuvable.');
}
function EUC_SUIVI_PUBLIC_contexte_(e){
  var ctx;
  if(typeof EUC_SUIVI_CLASSES_contexteP12_==='function')ctx=EUC_SUIVI_CLASSES_contexteP12_(false);
  else if(typeof EUC_PFMP_contexteAnneeLectureV155_==='function')ctx=EUC_PFMP_contexteAnneeLectureV155_();
  else ctx=EUC_PFMP_contexteAnneeV148();
  var requested=EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.annee);
  if(requested&&ctx&&Array.isArray(ctx.annees)&&ctx.annees.some(function(a){return a.code===requested;}))ctx.active=requested;
  return ctx;
}
function EUC_SUIVI_PUBLIC_synthese_(annee){
  var cache=CacheService.getScriptCache(),key=EUC_SUIVI_PUBLIC_cacheKey_(annee),cached=cache.get(key);
  if(cached)return JSON.parse(cached);
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee),cards=(accueil&&accueil.cartes)||[],groupes={};
  cards.forEach(function(card){
    var fam=EUC_SUIVI_PUBLIC_famille_(card); if(!fam)return;
    var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,card),gk=fam.code+'|'+niv.code;
    if(!groupes[gk])groupes[gk]={famille:fam.code,familleLibelle:fam.libelle,familleOrdre:fam.ordre,niveau:niv.code,niveauLibelle:niv.libelle,niveauOrdre:niv.ordre,effectif:0,classes:0,periodes:{}};
    var g=groupes[gk]; g.effectif+=Number(card.effectif)||0; g.classes++;
    (card.periodes||[]).forEach(function(p){
      var pk=EUC_SUIVI_PUBLIC_periodeKey_(p);
      if(!g.periodes[pk])g.periodes[pk]={key:pk,libelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)||'PFMP',debut:EUC_SUIVI_PUBLIC_txt_(p.debut),fin:EUC_SUIVI_PUBLIC_txt_(p.fin),debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),conventions:0,total:0,classes:0};
      var gp=g.periodes[pk]; gp.conventions+=Number(p.conventions)||0; gp.total+=Number(p.total)||0; gp.classes++;
    });
  });
  var liste=Object.keys(groupes).map(function(k){
    var g=groupes[k];
    g.periodes=Object.keys(g.periodes).map(function(pk){
      var p=g.periodes[pk]; p.manquantes=Math.max(0,p.total-p.conventions); p.pourcentage=p.total?Math.round((p.conventions/p.total)*100):0; return p;
    }).sort(function(a,b){var da=a.debut||'9999',db=b.debut||'9999';return da!==db?da.localeCompare(db):a.libelle.localeCompare(b.libelle,'fr');});
    return g;
  }).sort(function(a,b){return a.familleOrdre!==b.familleOrdre?a.familleOrdre-b.familleOrdre:a.niveauOrdre-b.niveauOrdre;});
  var out={version:EUC_SUIVI_PUBLIC_V1_,annee:annee,groupes:liste};
  try{cache.put(key,JSON.stringify(out),EUC_SUIVI_PUBLIC_TTL_);}catch(e){}
  return out;
}
function EUC_SUIVI_PUBLIC_classes_(annee,famille,niveau,periodeKey){
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee),rows=[];
  ((accueil&&accueil.cartes)||[]).forEach(function(card){
    var fam=EUC_SUIVI_PUBLIC_famille_(card); if(!fam||fam.code!==famille)return;
    var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,card); if(niv.code!==niveau)return;
    var p=(card.periodes||[]).find(function(x){return EUC_SUIVI_PUBLIC_periodeKey_(x)===periodeKey;}); if(!p)return;
    rows.push({classeId:Number(card.classeId)||0,classe:EUC_SUIVI_PUBLIC_txt_(card.classe),categorie:EUC_SUIVI_PUBLIC_txt_(card.categorie),effectif:Number(card.effectif)||0,periodeId:Number(p.id)||0,periodeLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle),debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),conventions:Number(p.conventions)||0,total:Number(p.total)||0,manquantes:Math.max(0,(Number(p.total)||0)-(Number(p.conventions)||0)),pourcentage:Number(p.total)?Math.round((Number(p.conventions)||0)/(Number(p.total)||1)*100):0});
  });
  rows.sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});
  return rows;
}
function EUC_SUIVI_PUBLIC_afficherAccueil(e){
  var ctx=EUC_SUIVI_PUBLIC_contexte_(e),data=EUC_SUIVI_PUBLIC_synthese_(ctx.active),tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Accueil');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()}); tpl.anneeContextJson=JSON.stringify(ctx); tpl.dataJson=JSON.stringify(data);
  return tpl.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_SUIVI_PUBLIC_afficherClasses(e){
  var ctx=EUC_SUIVI_PUBLIC_contexte_(e);
  var famille=EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.famille),niveau=EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.niveau),periodeKey=EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.periode);
  if(!famille||!niveau||!periodeKey)throw new Error('Sélection incomplète.');
  var synth=EUC_SUIVI_PUBLIC_synthese_(ctx.active),group=(synth.groupes||[]).find(function(g){return g.famille===famille&&g.niveau===niveau;}),periode=group?(group.periodes||[]).find(function(p){return p.key===periodeKey;}):null,classes=EUC_SUIVI_PUBLIC_classes_(ctx.active,famille,niveau,periodeKey);
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()}); tpl.anneeContextJson=JSON.stringify(ctx); tpl.groupJson=JSON.stringify(group||{}); tpl.periodeJson=JSON.stringify(periode||{}); tpl.classesJson=JSON.stringify(classes);
  return tpl.evaluate().setTitle('Suivi des conventions — classes').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * V2 ASYNC
 * Le doGet ne calcule plus la synthèse.
 * Il renvoie uniquement le squelette HTML.
 */

function EUC_SUIVI_PUBLIC_afficherAccueilV2(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Accueil');
  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });
  tpl.requestedYear=JSON.stringify(
    EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.annee)
  );

  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_SUIVI_PUBLIC_bootstrapV2(payload){
  payload=payload||{};
  var total0=Date.now();

  function logStep_(step,t0,extra){
    var o={
      diagnostic:'SUIVI_CONVENTIONS_V2_DIAG',
      step:step,
      dureeMs:Date.now()-t0
    };
    extra=extra||{};
    Object.keys(extra).forEach(function(k){o[k]=extra[k];});
    console.log(JSON.stringify(o));
  }

  var fake={
    parameter:{
      annee:EUC_SUIVI_PUBLIC_txt_(payload.annee)
    }
  };

  var t1=Date.now();
  var ctx=EUC_SUIVI_PUBLIC_contexte_(fake);
  logStep_('contexte',t1,{
    active:ctx&&ctx.active||'',
    annees:ctx&&ctx.annees?ctx.annees.length:0
  });

  var t2=Date.now();
  var cache=CacheService.getScriptCache();
  var key=EUC_SUIVI_PUBLIC_cacheKey_(ctx.active);
  var cached=cache.get(key);
  logStep_('cache_lookup_synthese',t2,{hit:!!cached});

  var data;

  if(cached){
    var t3=Date.now();
    data=JSON.parse(cached);
    logStep_('cache_parse_synthese',t3,{
      groupes:(data.groupes||[]).length
    });
  }else{
    var t4=Date.now();
    var accueil=EUC_SUIVI_PUBLIC_accueilSource_(ctx.active);
    logStep_('accueil_source',t4,{
      cartes:accueil&&accueil.cartes?accueil.cartes.length:0
    });

    var t5=Date.now();
    data=EUC_SUIVI_PUBLIC_synthese_(ctx.active);
    logStep_('synthese',t5,{
      groupes:(data.groupes||[]).length
    });
  }

  logStep_('TOTAL_BOOTSTRAP',total0,{
    active:ctx.active,
    groupes:(data.groupes||[]).length
  });

  return {
    ok:true,
    ctx:ctx,
    data:data,
    diagnosticMs:Date.now()-total0
  };
}


function EUC_SUIVI_PUBLIC_afficherClassesV2(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Classes');

  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  tpl.paramsJson=JSON.stringify({
    annee:EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.annee),
    famille:EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.famille),
    niveau:EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.niveau),
    periode:EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.periode)
  });

  return tpl.evaluate()
    .setTitle('Suivi des conventions — classes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_SUIVI_PUBLIC_classesV2(payload){
  payload=payload||{};

  var fake={
    parameter:{
      annee:EUC_SUIVI_PUBLIC_txt_(payload.annee)
    }
  };

  var ctx=EUC_SUIVI_PUBLIC_contexte_(fake);

  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);
  var periodeKey=EUC_SUIVI_PUBLIC_txt_(payload.periode);

  if(!famille || !niveau || !periodeKey){
    throw new Error('Sélection incomplète.');
  }

  var synth=EUC_SUIVI_PUBLIC_synthese_(ctx.active);

  var group=(synth.groupes||[]).find(function(g){
    return g.famille===famille && g.niveau===niveau;
  })||{};

  var periode=(group.periodes||[]).find(function(p){
    return p.key===periodeKey;
  })||{};

  var classes=EUC_SUIVI_PUBLIC_classes_(
    ctx.active,
    famille,
    niveau,
    periodeKey
  );

  return {
    ok:true,
    ctx:ctx,
    group:group,
    periode:periode,
    classes:classes
  };
}

/**
 * V3 LAZY
 * On ne calcule plus toute la synthèse au chargement.
 * La page reçoit seulement le contexte + les familles/niveaux.
 * Chaque bloc demande ses périodes séparément.
 */

function EUC_SUIVI_PUBLIC_structureV3(payload){
  payload=payload||{};
  var fake={parameter:{annee:EUC_SUIVI_PUBLIC_txt_(payload.annee)}};
  var ctx=EUC_SUIVI_PUBLIC_contexte_(fake);

  // Structure statique, ultra légère.
  return {
    ok:true,
    ctx:ctx,
    groupes:[
      {famille:'CAP',familleLibelle:'CAP',niveau:'1CAP',niveauLibelle:'1re année CAP',ordre:1},
      {famille:'CAP',familleLibelle:'CAP',niveau:'TCAP',niveauLibelle:'Terminale CAP',ordre:2},
      {famille:'BACPRO',familleLibelle:'Bac professionnel',niveau:'SECD',niveauLibelle:'Seconde',ordre:1},
      {famille:'BACPRO',familleLibelle:'Bac professionnel',niveau:'PREM',niveauLibelle:'Première',ordre:2},
      {famille:'BACPRO',familleLibelle:'Bac professionnel',niveau:'TERM',niveauLibelle:'Terminale',ordre:3},
      {famille:'BTS',familleLibelle:'BTS',niveau:'BTS1',niveauLibelle:'1re année BTS',ordre:1},
      {famille:'BTS',familleLibelle:'BTS',niveau:'BTS2',niveauLibelle:'2e année BTS',ordre:2}
    ]
  };
}

function EUC_SUIVI_PUBLIC_periodesGroupeV3(payload){
  payload=payload||{};
  var fake={parameter:{annee:EUC_SUIVI_PUBLIC_txt_(payload.annee)}};
  var ctx=EUC_SUIVI_PUBLIC_contexte_(fake);

  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  // Une seule synthèse globale peut encore être coûteuse,
  // mais chaque appel est indépendant et la page reste utilisable.
  var synth=EUC_SUIVI_PUBLIC_synthese_(ctx.active);
  var group=(synth.groupes||[]).find(function(g){
    return g.famille===famille && g.niveau===niveau;
  });

  return {
    ok:true,
    annee:ctx.active,
    group:group||{
      famille:famille,
      niveau:niveau,
      periodes:[],
      classes:0,
      effectif:0
    }
  };
}

function EUC_SUIVI_PUBLIC_afficherAccueilV3(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Accueil');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(
    EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.annee)
  );

  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * V4
 * Aucun google.script.run automatique à l'ouverture.
 * La page d'entrée est entièrement statique.
 * Les périodes d'un niveau ne sont chargées qu'au clic utilisateur.
 */
function EUC_SUIVI_PUBLIC_afficherAccueilV4(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_Accueil');

  tpl.config=JSON.stringify({
    baseUrl:ScriptApp.getService().getUrl()
  });

  tpl.requestedYear=JSON.stringify(
    EUC_SUIVI_PUBLIC_txt_(e&&e.parameter&&e.parameter.annee)
  );

  return tpl.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

/**
 * V4.1 : chargement léger des périodes.
 * Aucun calcul global V154 au clic sur un niveau.
 */
function EUC_SUIVI_PUBLIC_refsV41_(v){
  if(v==null || v==='')return [];
  if(Array.isArray(v)){
    var a=v.slice();
    if(a.length && String(a[0]).toUpperCase()==='L')a=a.slice(1);
    return a.map(function(x){
      if(Array.isArray(x) && x.length>1)return Number(x[1])||0;
      return Number(x)||0;
    }).filter(function(x){return x>0;});
  }
  var n=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(v):v)||0;
  return n>0?[n]:[];
}

function EUC_SUIVI_PUBLIC_periodesGroupeV41(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee || !famille || !niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var annees=EUC_IMPORT_lireRecords_('Annees_Scolaires');
  var ar=annees.filter(function(a){
    return EUC_SUIVI_PUBLIC_txt_(a.Code||a.code||a.Libelle||a.Annee)===annee;
  })[0];
  var anneeId=ar?Number(ar.id)||0:0;

  var classes=EUC_IMPORT_lireRecords_('Classes')
    .filter(function(c){return c.Actif!==false;})
    .map(function(c){
      return {
        raw:c,
        id:Number(c.id)||0,
        classe:(typeof EUC_V154_classeNom_==='function')
          ? EUC_V154_classeNom_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Nom||c.Libelle||c.Code_import||''),
        categorie:(typeof EUC_V154_cat_==='function')
          ? EUC_V154_cat_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Categorie||c.Type||'')
      };
    })
    .filter(function(c){
      var fam=EUC_SUIVI_PUBLIC_famille_(c);
      if(!fam || fam.code!==famille)return false;
      var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,c);
      return niv.code===niveau;
    });

  var classIds={};
  classes.forEach(function(c){if(c.id>0)classIds[c.id]=true;});

  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){
      if(p.Actif===false)return false;

      var pa=p.Annee_scolaire;
      var paId=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(pa):pa)||0;
      var paTxt=EUC_SUIVI_PUBLIC_txt_(pa);

      if(anneeId>0 && paId>0 && paId!==anneeId)return false;
      if(!paId && paTxt && paTxt!==annee)return false;

      var refs=[];
      [p.Classes_concernees,p.Classes,p.Classe,p.Classe_PFMP].forEach(function(v){
        EUC_SUIVI_PUBLIC_refsV41_(v).forEach(function(id){
          if(refs.indexOf(id)<0)refs.push(id);
        });
      });

      if(refs.length){
        return refs.some(function(id){return !!classIds[id];});
      }

      var txt=EUC_SUIVI_PUBLIC_norm_([
        p.Niveau,p.Type,p.Libelle,p.Groupe,p.Commentaire
      ].filter(Boolean).join(' '));

      if(famille==='BACPRO'){
        if(niveau==='TERM')return /TBAC|TERMINALE|T BAC/.test(txt);
        if(niveau==='PREM')return /1ERE|1RE|PREMIERE|1 BAC/.test(txt);
        if(niveau==='SECD')return /2NDE|SECONDE|2 BAC/.test(txt);
      }
      if(famille==='CAP'){
        if(niveau==='TCAP')return /TCAP|TERMINALE CAP|2 CAP/.test(txt);
        if(niveau==='1CAP')return /1CAP|1 CAP/.test(txt);
      }
      if(famille==='BTS'){
        if(niveau==='BTS2')return /BTS.*2|2.*BTS|2E ANNEE/.test(txt);
        if(niveau==='BTS1')return /BTS.*1|1.*BTS|1RE ANNEE/.test(txt);
      }
      return false;
    })
    .map(function(p){
      var lib=(typeof EUC_V154_periodeLibelle_==='function')
        ? EUC_V154_periodeLibelle_(p)
        : EUC_SUIVI_PUBLIC_txt_(p.Type||p.Libelle||p.Groupe||'PFMP');

      var norm=EUC_SUIVI_PUBLIC_norm_(lib);
      if(famille==='BACPRO' && niveau==='TERM' && (norm==='VFMP'||norm==='VEMP')){
        return null;
      }

      var debut=EUC_IMPORT_dateExistanteISO_(p.Date_debut);
      var fin=EUC_IMPORT_dateExistanteISO_(p.Date_fin);

      return {
        id:Number(p.id)||0,
        key:[lib,debut,fin].join('|'),
        libelle:lib,
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(fin),
        conventions:null,
        total:null,
        manquantes:null,
        pourcentage:null
      };
    })
    .filter(Boolean);

  var uniq={};
  periodes.forEach(function(p){
    var k=String(p.id||0)+'|'+p.key;
    if(!uniq[k])uniq[k]=p;
  });

  var out=Object.keys(uniq).map(function(k){return uniq[k];});

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V41',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out.length
  }));

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out
  };
}

/**
 * V4.1 : chargement léger des périodes.
 * Aucun calcul global V154 au clic sur un niveau.
 */
function EUC_SUIVI_PUBLIC_refsV41_(v){
  if(v==null || v==='')return [];
  if(Array.isArray(v)){
    var a=v.slice();
    if(a.length && String(a[0]).toUpperCase()==='L')a=a.slice(1);
    return a.map(function(x){
      if(Array.isArray(x) && x.length>1)return Number(x[1])||0;
      return Number(x)||0;
    }).filter(function(x){return x>0;});
  }
  var n=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(v):v)||0;
  return n>0?[n]:[];
}

function EUC_SUIVI_PUBLIC_periodesGroupeV41(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee || !famille || !niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var annees=EUC_IMPORT_lireRecords_('Annees_Scolaires');
  var ar=annees.filter(function(a){
    return EUC_SUIVI_PUBLIC_txt_(a.Code||a.code||a.Libelle||a.Annee)===annee;
  })[0];
  var anneeId=ar?Number(ar.id)||0:0;

  var classes=EUC_IMPORT_lireRecords_('Classes')
    .filter(function(c){return c.Actif!==false;})
    .map(function(c){
      return {
        raw:c,
        id:Number(c.id)||0,
        classe:(typeof EUC_V154_classeNom_==='function')
          ? EUC_V154_classeNom_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Nom||c.Libelle||c.Code_import||''),
        categorie:(typeof EUC_V154_cat_==='function')
          ? EUC_V154_cat_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Categorie||c.Type||'')
      };
    })
    .filter(function(c){
      var fam=EUC_SUIVI_PUBLIC_famille_(c);
      if(!fam || fam.code!==famille)return false;
      var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,c);
      return niv.code===niveau;
    });

  var classIds={};
  classes.forEach(function(c){if(c.id>0)classIds[c.id]=true;});

  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){
      if(p.Actif===false)return false;

      var pa=p.Annee_scolaire;
      var paId=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(pa):pa)||0;
      var paTxt=EUC_SUIVI_PUBLIC_txt_(pa);

      if(anneeId>0 && paId>0 && paId!==anneeId)return false;
      if(!paId && paTxt && paTxt!==annee)return false;

      var refs=[];
      [p.Classes_concernees,p.Classes,p.Classe,p.Classe_PFMP].forEach(function(v){
        EUC_SUIVI_PUBLIC_refsV41_(v).forEach(function(id){
          if(refs.indexOf(id)<0)refs.push(id);
        });
      });

      if(refs.length){
        return refs.some(function(id){return !!classIds[id];});
      }

      var txt=EUC_SUIVI_PUBLIC_norm_([
        p.Niveau,p.Type,p.Libelle,p.Groupe,p.Commentaire
      ].filter(Boolean).join(' '));

      if(famille==='BACPRO'){
        if(niveau==='TERM')return /TBAC|TERMINALE|T BAC/.test(txt);
        if(niveau==='PREM')return /1ERE|1RE|PREMIERE|1 BAC/.test(txt);
        if(niveau==='SECD')return /2NDE|SECONDE|2 BAC/.test(txt);
      }
      if(famille==='CAP'){
        if(niveau==='TCAP')return /TCAP|TERMINALE CAP|2 CAP/.test(txt);
        if(niveau==='1CAP')return /1CAP|1 CAP/.test(txt);
      }
      if(famille==='BTS'){
        if(niveau==='BTS2')return /BTS.*2|2.*BTS|2E ANNEE/.test(txt);
        if(niveau==='BTS1')return /BTS.*1|1.*BTS|1RE ANNEE/.test(txt);
      }
      return false;
    })
    .map(function(p){
      var lib=(typeof EUC_V154_periodeLibelle_==='function')
        ? EUC_V154_periodeLibelle_(p)
        : EUC_SUIVI_PUBLIC_txt_(p.Type||p.Libelle||p.Groupe||'PFMP');

      var norm=EUC_SUIVI_PUBLIC_norm_(lib);
      if(famille==='BACPRO' && niveau==='TERM' && (norm==='VFMP'||norm==='VEMP')){
        return null;
      }

      var debut=EUC_IMPORT_dateExistanteISO_(p.Date_debut);
      var fin=EUC_IMPORT_dateExistanteISO_(p.Date_fin);

      return {
        id:Number(p.id)||0,
        key:[lib,debut,fin].join('|'),
        libelle:lib,
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(fin),
        conventions:null,
        total:null,
        manquantes:null,
        pourcentage:null
      };
    })
    .filter(Boolean);

  var uniq={};
  periodes.forEach(function(p){
    var k=String(p.id||0)+'|'+p.key;
    if(!uniq[k])uniq[k]=p;
  });

  var out=Object.keys(uniq).map(function(k){return uniq[k];});

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V41',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out.length
  }));

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out
  };
}

/**
 * V4.1 : chargement léger des périodes.
 * Aucun calcul global V154 au clic sur un niveau.
 */
function EUC_SUIVI_PUBLIC_refsV41_(v){
  if(v==null || v==='')return [];
  if(Array.isArray(v)){
    var a=v.slice();
    if(a.length && String(a[0]).toUpperCase()==='L')a=a.slice(1);
    return a.map(function(x){
      if(Array.isArray(x) && x.length>1)return Number(x[1])||0;
      return Number(x)||0;
    }).filter(function(x){return x>0;});
  }
  var n=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(v):v)||0;
  return n>0?[n]:[];
}

function EUC_SUIVI_PUBLIC_periodesGroupeV41(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee || !famille || !niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var annees=EUC_IMPORT_lireRecords_('Annees_Scolaires');
  var ar=annees.filter(function(a){
    return EUC_SUIVI_PUBLIC_txt_(a.Code||a.code||a.Libelle||a.Annee)===annee;
  })[0];
  var anneeId=ar?Number(ar.id)||0:0;

  var classes=EUC_IMPORT_lireRecords_('Classes')
    .filter(function(c){return c.Actif!==false;})
    .map(function(c){
      return {
        raw:c,
        id:Number(c.id)||0,
        classe:(typeof EUC_V154_classeNom_==='function')
          ? EUC_V154_classeNom_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Nom||c.Libelle||c.Code_import||''),
        categorie:(typeof EUC_V154_cat_==='function')
          ? EUC_V154_cat_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Categorie||c.Type||'')
      };
    })
    .filter(function(c){
      var fam=EUC_SUIVI_PUBLIC_famille_(c);
      if(!fam || fam.code!==famille)return false;
      var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,c);
      return niv.code===niveau;
    });

  var classIds={};
  classes.forEach(function(c){if(c.id>0)classIds[c.id]=true;});

  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){
      if(p.Actif===false)return false;

      var pa=p.Annee_scolaire;
      var paId=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(pa):pa)||0;
      var paTxt=EUC_SUIVI_PUBLIC_txt_(pa);

      if(anneeId>0 && paId>0 && paId!==anneeId)return false;
      if(!paId && paTxt && paTxt!==annee)return false;

      var refs=[];
      [p.Classes_concernees,p.Classes,p.Classe,p.Classe_PFMP].forEach(function(v){
        EUC_SUIVI_PUBLIC_refsV41_(v).forEach(function(id){
          if(refs.indexOf(id)<0)refs.push(id);
        });
      });

      if(refs.length){
        return refs.some(function(id){return !!classIds[id];});
      }

      var txt=EUC_SUIVI_PUBLIC_norm_([
        p.Niveau,p.Type,p.Libelle,p.Groupe,p.Commentaire
      ].filter(Boolean).join(' '));

      if(famille==='BACPRO'){
        if(niveau==='TERM')return /TBAC|TERMINALE|T BAC/.test(txt);
        if(niveau==='PREM')return /1ERE|1RE|PREMIERE|1 BAC/.test(txt);
        if(niveau==='SECD')return /2NDE|SECONDE|2 BAC/.test(txt);
      }
      if(famille==='CAP'){
        if(niveau==='TCAP')return /TCAP|TERMINALE CAP|2 CAP/.test(txt);
        if(niveau==='1CAP')return /1CAP|1 CAP/.test(txt);
      }
      if(famille==='BTS'){
        if(niveau==='BTS2')return /BTS.*2|2.*BTS|2E ANNEE/.test(txt);
        if(niveau==='BTS1')return /BTS.*1|1.*BTS|1RE ANNEE/.test(txt);
      }
      return false;
    })
    .map(function(p){
      var lib=(typeof EUC_V154_periodeLibelle_==='function')
        ? EUC_V154_periodeLibelle_(p)
        : EUC_SUIVI_PUBLIC_txt_(p.Type||p.Libelle||p.Groupe||'PFMP');

      var norm=EUC_SUIVI_PUBLIC_norm_(lib);
      if(famille==='BACPRO' && niveau==='TERM' && (norm==='VFMP'||norm==='VEMP')){
        return null;
      }

      var debut=EUC_IMPORT_dateExistanteISO_(p.Date_debut);
      var fin=EUC_IMPORT_dateExistanteISO_(p.Date_fin);

      return {
        id:Number(p.id)||0,
        key:[lib,debut,fin].join('|'),
        libelle:lib,
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(fin),
        conventions:null,
        total:null,
        manquantes:null,
        pourcentage:null
      };
    })
    .filter(Boolean);

  var uniq={};
  periodes.forEach(function(p){
    var k=String(p.id||0)+'|'+p.key;
    if(!uniq[k])uniq[k]=p;
  });

  var out=Object.keys(uniq).map(function(k){return uniq[k];});

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V41',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out.length
  }));

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out
  };
}

/**
 * V4.2
 * La page intermédiaire "classes" ne relance PLUS la synthèse globale V154.
 * Elle lit uniquement Classes + Planning_Periodes.
 * Les compteurs élèves/conventions ne sont pas calculés ici :
 * le clic ouvre directement le suivi détaillé existant.
 */

function EUC_SUIVI_PUBLIC_libelleNiveauV42_(famille,niveau){
  var map={
    'CAP|1CAP':'1re année CAP',
    'CAP|TCAP':'Terminale CAP',
    'BACPRO|SECD':'Seconde',
    'BACPRO|PREM':'Première',
    'BACPRO|TERM':'Terminale',
    'BTS|BTS1':'1re année BTS',
    'BTS|BTS2':'2e année BTS'
  };
  return map[famille+'|'+niveau]||niveau;
}

function EUC_SUIVI_PUBLIC_libelleFamilleV42_(famille){
  return {
    CAP:'CAP',
    BACPRO:'Bac professionnel',
    BTS:'BTS'
  }[famille]||famille;
}

function EUC_SUIVI_PUBLIC_periodeObjetV42_(p){
  var lib=(typeof EUC_V154_periodeLibelle_==='function')
    ? EUC_V154_periodeLibelle_(p)
    : EUC_SUIVI_PUBLIC_txt_(p.Type||p.Libelle||p.Groupe||'PFMP');

  var debut=EUC_IMPORT_dateExistanteISO_(p.Date_debut);
  var fin=EUC_IMPORT_dateExistanteISO_(p.Date_fin);

  return {
    id:Number(p.id)||0,
    libelle:lib,
    debut:debut,
    fin:fin,
    key:[lib,debut,fin].join('|'),
    debutFr:EUC_SUIVI_PUBLIC_dateFr_(debut),
    finFr:EUC_SUIVI_PUBLIC_dateFr_(fin)
  };
}

function EUC_SUIVI_PUBLIC_classesV42(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);
  var periodeKey=EUC_SUIVI_PUBLIC_txt_(payload.periode);

  if(!annee||!famille||!niveau||!periodeKey){
    throw new Error('Sélection incomplète.');
  }

  var annees=EUC_IMPORT_lireRecords_('Annees_Scolaires');
  var ar=annees.filter(function(a){
    return EUC_SUIVI_PUBLIC_txt_(a.Code||a.code||a.Libelle||a.Annee)===annee;
  })[0];
  var anneeId=ar?Number(ar.id)||0:0;

  var classes=EUC_IMPORT_lireRecords_('Classes')
    .filter(function(c){return c.Actif!==false;})
    .map(function(c){
      var card={
        id:Number(c.id)||0,
        classe:(typeof EUC_V154_classeNom_==='function')
          ? EUC_V154_classeNom_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Nom||c.Libelle||c.Code_import||''),
        categorie:(typeof EUC_V154_cat_==='function')
          ? EUC_V154_cat_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Categorie||c.Type||''),
        raw:c
      };
      return card;
    })
    .filter(function(c){
      var fam=EUC_SUIVI_PUBLIC_famille_(c);
      if(!fam||fam.code!==famille)return false;
      var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,c);
      return niv.code===niveau;
    });

  var ids={};
  classes.forEach(function(c){if(c.id>0)ids[c.id]=true;});

  var target=null;
  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){
      if(p.Actif===false)return false;

      var pa=p.Annee_scolaire;
      var paId=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(pa):pa)||0;
      var paTxt=EUC_SUIVI_PUBLIC_txt_(pa);

      if(anneeId>0&&paId>0&&paId!==anneeId)return false;
      if(!paId&&paTxt&&paTxt!==annee)return false;

      return true;
    })
    .map(EUC_SUIVI_PUBLIC_periodeObjetV42_);

  target=periodes.filter(function(p){return p.key===periodeKey;})[0]||null;

  // Compatibilité : si le lien contient directement l'id.
  if(!target && /^\d+$/.test(periodeKey)){
    target=periodes.filter(function(p){return p.id===Number(periodeKey);})[0]||null;
  }

  if(!target){
    throw new Error('Période introuvable pour '+annee+'.');
  }

  // Retrouver la ligne brute de la période sélectionnée.
  var rawPeriod=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){return Number(p.id)===Number(target.id);})[0]||{};

  var refs=[];
  [rawPeriod.Classes_concernees,rawPeriod.Classes,rawPeriod.Classe,rawPeriod.Classe_PFMP]
    .forEach(function(v){
      if(typeof EUC_SUIVI_PUBLIC_refsV41_==='function'){
        EUC_SUIVI_PUBLIC_refsV41_(v).forEach(function(id){
          if(refs.indexOf(id)<0)refs.push(id);
        });
      }else{
        var id=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(v):v)||0;
        if(id&&refs.indexOf(id)<0)refs.push(id);
      }
    });

  var rows=classes
    .filter(function(c){
      // Si Planning_Periodes porte des classes explicites, on respecte ce lien.
      if(refs.length)return refs.indexOf(c.id)>=0;
      // Sinon on garde les classes du niveau sélectionné.
      return true;
    })
    .map(function(c){
      return {
        classeId:c.id,
        classe:c.classe,
        categorie:c.categorie,
        periodeId:target.id,
        periodeLibelle:target.libelle,
        debutFr:target.debutFr,
        finFr:target.finFr,
        effectif:null,
        conventions:null,
        total:null,
        manquantes:null,
        pourcentage:null
      };
    })
    .sort(function(a,b){
      return a.classe.localeCompare(b.classe,'fr');
    });

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V42',
    operation:'classes_legeres',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    periodeId:target.id,
    classes:rows.length
  }));

  return {
    ok:true,
    ctx:{
      active:annee,
      annees:[{code:annee,libelle:annee}]
    },
    group:{
      famille:famille,
      familleLibelle:EUC_SUIVI_PUBLIC_libelleFamilleV42_(famille),
      niveau:niveau,
      niveauLibelle:EUC_SUIVI_PUBLIC_libelleNiveauV42_(famille,niveau)
    },
    periode:target,
    classes:rows
  };
}

/**
 * V4.3
 * Objectif métier :
 * - ne montrer que les vraies périodes PFMP/stage du niveau choisi ;
 * - exclure P.dif., ENT., EXAMENS, VISITE et autres événements de planning ;
 * - dédoublonner strictement les périodes identiques ;
 * - n'utiliser que les classes réellement concernées.
 */

function EUC_SUIVI_PUBLIC_estPeriodeMetierV43_(p){
  var t=EUC_SUIVI_PUBLIC_norm_([
    p&&p.Type,
    p&&p.Libelle,
    p&&p.Groupe,
    p&&p.Niveau,
    p&&p.Commentaire
  ].filter(Boolean).join(' '));

  if(!t)return false;

  // Exclusions explicites : ce ne sont pas des périodes de convention à afficher.
  if(
    /(^| )P[\.\s-]*DIF($| )/.test(t) ||
    /(^| )ENT[\.\s-]*($| )/.test(t) ||
    /EXAMEN/.test(t) ||
    /VISITE/.test(t) ||
    /RENCONTRE/.test(t) ||
    /JOURNEE/.test(t)
  ){
    return false;
  }

  // On garde uniquement PFMP / STAGE / ALTERNANCE explicite.
  return /PFMP|STAGE|ALTERNANCE/.test(t);
}

function EUC_SUIVI_PUBLIC_niveauTexteCompatibleV43_(famille,niveau,p){
  var t=EUC_SUIVI_PUBLIC_norm_([
    p&&p.Type,
    p&&p.Libelle,
    p&&p.Groupe,
    p&&p.Niveau,
    p&&p.Commentaire
  ].filter(Boolean).join(' '));

  if(famille==='BACPRO'){
    if(niveau==='TERM'){
      if(/1ERE|1RE|PREMIERE|SECONDE|2NDE/.test(t))return false;
      return /TBAC|TERMINALE|T BAC|PFMP TBAC/.test(t) || !/BAC|1ERE|1RE|PREMIERE|SECONDE|2NDE/.test(t);
    }
    if(niveau==='PREM'){
      if(/TERMINALE|TBAC|SECONDE|2NDE/.test(t))return false;
      return /1ERE|1RE|PREMIERE|1 BAC|PFMP 1/.test(t) || !/BAC|TERMINALE|TBAC|SECONDE|2NDE/.test(t);
    }
    if(niveau==='SECD'){
      if(/TERMINALE|TBAC|1ERE|1RE|PREMIERE/.test(t))return false;
      return /2NDE|SECONDE|2 BAC|PFMP 2/.test(t) || !/BAC|TERMINALE|TBAC|1ERE|1RE|PREMIERE/.test(t);
    }
  }

  if(famille==='CAP'){
    if(niveau==='TCAP'){
      if(/1CAP|1 CAP/.test(t))return false;
      return /TCAP|TERMINALE CAP|2 CAP/.test(t) || !/CAP/.test(t);
    }
    if(niveau==='1CAP'){
      if(/TCAP|TERMINALE CAP|2 CAP/.test(t))return false;
      return /1CAP|1 CAP/.test(t) || !/CAP/.test(t);
    }
  }

  if(famille==='BTS'){
    if(niveau==='BTS2'){
      if(/BTS.*1|1.*BTS|1RE ANNEE/.test(t))return false;
      return /BTS.*2|2.*BTS|2E ANNEE|DEUXIEME/.test(t) || !/BTS/.test(t);
    }
    if(niveau==='BTS1'){
      if(/BTS.*2|2.*BTS|2E ANNEE|DEUXIEME/.test(t))return false;
      return /BTS.*1|1.*BTS|1RE ANNEE|PREMIERE/.test(t) || !/BTS/.test(t);
    }
  }

  return true;
}

function EUC_SUIVI_PUBLIC_periodesGroupeV43(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee||!famille||!niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var annees=EUC_IMPORT_lireRecords_('Annees_Scolaires');
  var ar=annees.filter(function(a){
    return EUC_SUIVI_PUBLIC_txt_(a.Code||a.code||a.Libelle||a.Annee)===annee;
  })[0];
  var anneeId=ar?Number(ar.id)||0:0;

  var classes=EUC_IMPORT_lireRecords_('Classes')
    .filter(function(c){return c.Actif!==false;})
    .map(function(c){
      return {
        id:Number(c.id)||0,
        classe:(typeof EUC_V154_classeNom_==='function')
          ? EUC_V154_classeNom_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Nom||c.Libelle||c.Code_import||''),
        categorie:(typeof EUC_V154_cat_==='function')
          ? EUC_V154_cat_(c)
          : EUC_SUIVI_PUBLIC_txt_(c.Categorie||c.Type||'')
      };
    })
    .filter(function(c){
      var fam=EUC_SUIVI_PUBLIC_famille_(c);
      if(!fam||fam.code!==famille)return false;
      return EUC_SUIVI_PUBLIC_niveau_(fam.code,c).code===niveau;
    });

  var classIds={};
  classes.forEach(function(c){if(c.id>0)classIds[c.id]=true;});

  var rows=EUC_IMPORT_lireRecords_('Planning_Periodes')
    .filter(function(p){
      if(p.Actif===false)return false;

      var pa=p.Annee_scolaire;
      var paId=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(pa):pa)||0;
      var paTxt=EUC_SUIVI_PUBLIC_txt_(pa);

      if(anneeId>0&&paId>0&&paId!==anneeId)return false;
      if(!paId&&paTxt&&paTxt!==annee)return false;

      if(!EUC_SUIVI_PUBLIC_estPeriodeMetierV43_(p))return false;

      var refs=[];
      [p.Classes_concernees,p.Classes,p.Classe,p.Classe_PFMP].forEach(function(v){
        if(typeof EUC_SUIVI_PUBLIC_refsV41_==='function'){
          EUC_SUIVI_PUBLIC_refsV41_(v).forEach(function(id){
            if(refs.indexOf(id)<0)refs.push(id);
          });
        }else{
          var id=Number((typeof EUC_PFMP_ref_==='function')?EUC_PFMP_ref_(v):v)||0;
          if(id&&refs.indexOf(id)<0)refs.push(id);
        }
      });

      // Si la période indique des classes : c'est la source de vérité.
      if(refs.length){
        if(!refs.some(function(id){return !!classIds[id];}))return false;
      }else{
        // Sans classes explicites, on exige une compatibilité textuelle de niveau.
        if(!EUC_SUIVI_PUBLIC_niveauTexteCompatibleV43_(famille,niveau,p))return false;
      }

      // Règle déjà demandée : VFMP/VEMP masquées pour terminale Bac Pro scolaire.
      var nt=EUC_SUIVI_PUBLIC_norm_(p.Type||p.Libelle||p.Groupe||'');
      if(famille==='BACPRO'&&niveau==='TERM'&&(nt==='VFMP'||nt==='VEMP'))return false;

      return true;
    })
    .map(function(p){
      var lib=(typeof EUC_V154_periodeLibelle_==='function')
        ? EUC_V154_periodeLibelle_(p)
        : EUC_SUIVI_PUBLIC_txt_(p.Type||p.Libelle||p.Groupe||'PFMP');

      var debut=EUC_IMPORT_dateExistanteISO_(p.Date_debut);
      var fin=EUC_IMPORT_dateExistanteISO_(p.Date_fin);

      return {
        id:Number(p.id)||0,
        libelle:lib,
        debut:debut,
        fin:fin,
        key:[EUC_SUIVI_PUBLIC_norm_(lib),debut,fin].join('|'),
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(fin),
        conventions:null,
        total:null,
        manquantes:null,
        pourcentage:null
      };
    });

  // Dédoublonnage STRICT : même libellé + mêmes dates = une seule période affichée.
  var uniq={};
  rows.forEach(function(p){
    if(!uniq[p.key])uniq[p.key]=p;
  });

  var out=Object.keys(uniq)
    .map(function(k){return uniq[k];})
    .sort(function(a,b){
      var da=a.debut||'9999',db=b.debut||'9999';
      if(da!==db)return da.localeCompare(db);
      return a.libelle.localeCompare(b.libelle,'fr');
    });

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V43',
    operation:'periodes_metier',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out.length
  }));

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:classes.length,
    periodes:out
  };
}

/**
 * V4.4 — circuit demandé :
 * NIVEAU -> PERIODES (compteur global)
 * PERIODE -> CLASSES (compteur par classe)
 * CLASSE -> LISTE COMPLETE DES ELEVES (écran existant)
 *
 * Les deux premiers niveaux s'appuient sur les cartes V154 déjà fiables :
 * elles portent pour chaque classe ses vraies périodes, son effectif et
 * son nombre de conventions.
 */

function EUC_SUIVI_PUBLIC_periodeVisibleV44_(p){
  var t=EUC_SUIVI_PUBLIC_norm_(
    (p&&p.libelle)||''
  );

  if(!t)return false;

  // On ne garde que les périodes de convention/stage.
  if(!/PFMP|STAGE|ALTERNANCE/.test(t))return false;

  // Exclusions métier.
  if(
    /P[\.\s-]*DIF/.test(t) ||
    /^ENT[\.\s-]*$/.test(t) ||
    /EXAMEN/.test(t) ||
    /VISITE/.test(t)
  ) return false;

  return true;
}

function EUC_SUIVI_PUBLIC_cartesNiveauV44_(annee,famille,niveau){
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee);
  return ((accueil&&accueil.cartes)||[]).filter(function(card){
    var fam=EUC_SUIVI_PUBLIC_famille_(card);
    if(!fam||fam.code!==famille)return false;
    var niv=EUC_SUIVI_PUBLIC_niveau_(fam.code,card);
    return niv.code===niveau;
  });
}

function EUC_SUIVI_PUBLIC_niveauV44(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee||!famille||!niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var cards=EUC_SUIVI_PUBLIC_cartesNiveauV44_(annee,famille,niveau);
  var byKey={};

  cards.forEach(function(card){
    (card.periodes||[]).forEach(function(p){
      if(!EUC_SUIVI_PUBLIC_periodeVisibleV44_(p))return;

      // Règle demandée précédemment : pas de VFMP/VEMP en T Bac Pro scolaire.
      var nt=EUC_SUIVI_PUBLIC_norm_(p.libelle||'');
      if(
        famille==='BACPRO' &&
        niveau==='TERM' &&
        (nt==='VFMP'||nt==='VEMP')
      ) return;

      var key=EUC_SUIVI_PUBLIC_periodeKey_(p);

      if(!byKey[key]){
        byKey[key]={
          key:key,
          id:Number(p.id)||0,
          libelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)||'PFMP',
          debut:EUC_SUIVI_PUBLIC_txt_(p.debut),
          fin:EUC_SUIVI_PUBLIC_txt_(p.fin),
          debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
          finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
          conventions:0,
          total:0,
          classes:0
        };
      }

      var x=byKey[key];
      x.conventions+=Number(p.conventions)||0;
      x.total+=Number(p.total)||0;
      x.classes++;
    });
  });

  var periodes=Object.keys(byKey).map(function(k){
    var p=byKey[k];
    p.manquantes=Math.max(0,p.total-p.conventions);
    p.pourcentage=p.total
      ? Math.round((p.conventions/p.total)*100)
      : 0;
    return p;
  }).sort(function(a,b){
    var da=a.debut||'9999';
    var db=b.debut||'9999';
    return da!==db
      ? da.localeCompare(db)
      : a.libelle.localeCompare(b.libelle,'fr');
  });

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V44',
    operation:'niveau_periodes',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:cards.length,
    periodes:periodes.length
  }));

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:cards.length,
    effectif:cards.reduce(function(s,c){
      return s+(Number(c.effectif)||0);
    },0),
    periodes:periodes
  };
}

function EUC_SUIVI_PUBLIC_classesV44(payload){
  payload=payload||{};
  var t0=Date.now();

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);
  var periodeKey=EUC_SUIVI_PUBLIC_txt_(payload.periode);

  if(!annee||!famille||!niveau||!periodeKey){
    throw new Error('Sélection incomplète.');
  }

  var cards=EUC_SUIVI_PUBLIC_cartesNiveauV44_(annee,famille,niveau);
  var rows=[];
  var periode=null;

  cards.forEach(function(card){
    var p=(card.periodes||[]).filter(function(x){
      return EUC_SUIVI_PUBLIC_periodeKey_(x)===periodeKey;
    })[0];

    if(!p)return;
    if(!EUC_SUIVI_PUBLIC_periodeVisibleV44_(p))return;

    if(!periode){
      periode={
        key:periodeKey,
        id:Number(p.id)||0,
        libelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)||'PFMP',
        debut:EUC_SUIVI_PUBLIC_txt_(p.debut),
        fin:EUC_SUIVI_PUBLIC_txt_(p.fin),
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin)
      };
    }

    var total=Number(p.total)||Number(card.effectif)||0;
    var conventions=Number(p.conventions)||0;

    rows.push({
      classeId:Number(card.classeId)||0,
      classe:EUC_SUIVI_PUBLIC_txt_(card.classe),
      categorie:EUC_SUIVI_PUBLIC_txt_(card.categorie),
      effectif:Number(card.effectif)||total,
      periodeId:Number(p.id)||0,
      periodeLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)||'PFMP',
      debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
      finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
      conventions:conventions,
      total:total,
      manquantes:Math.max(0,total-conventions),
      pourcentage:total
        ? Math.round((conventions/total)*100)
        : 0
    });
  });

  rows.sort(function(a,b){
    return a.classe.localeCompare(b.classe,'fr');
  });

  if(!periode){
    throw new Error('Période introuvable pour ce niveau.');
  }

  console.log(JSON.stringify({
    diagnostic:'SUIVI_CONVENTIONS_V44',
    operation:'periode_classes',
    dureeMs:Date.now()-t0,
    annee:annee,
    famille:famille,
    niveau:niveau,
    periode:periodeKey,
    classes:rows.length
  }));

  return {
    ok:true,
    ctx:{
      active:annee,
      annees:[{code:annee,libelle:annee}]
    },
    group:{
      famille:famille,
      familleLibelle:
        famille==='BACPRO'
          ? 'Bac professionnel'
          : famille,
      niveau:niveau,
      niveauLibelle:
        niveau==='TERM' ? 'Terminale' :
        niveau==='PREM' ? 'Première' :
        niveau==='SECD' ? 'Seconde' :
        niveau==='1CAP' ? '1re année CAP' :
        niveau==='TCAP' ? 'Terminale CAP' :
        niveau==='BTS1' ? '1re année BTS' :
        niveau==='BTS2' ? '2e année BTS' :
        niveau
    },
    periode:periode,
    classes:rows
  };
}

/**
 * V4.5
 * Snapshot commun mis en cache :
 * - cartes V154
 * - comptage des conventions ACTIVES seulement
 * - périodes numérotées chronologiquement par niveau
 *
 * Une convention annulée, interrompue, supprimée ou révoquée
 * ne compte jamais dans "Avec convention".
 */
var EUC_SUIVI_V45_TTL_=120;

function EUC_SUIVI_V45_statutNorm_(a){
  return EUC_SUIVI_PUBLIC_norm_(
    a && (a.Statut_administratif || a.Statut || '')
  );
}

function EUC_SUIVI_V45_estActive_(a){
  if(!a)return false;
  if(a.Revoked===true)return false;
  if(a.Supprimee_admin===true)return false;

  var s=EUC_SUIVI_V45_statutNorm_(a);

  if(
    s.indexOf('ANNULEE')>=0 ||
    s.indexOf('INTERROMP')>=0 ||
    s.indexOf('SUPPRIM')>=0 ||
    s.indexOf('REVOQU')>=0
  ){
    return false;
  }

  return true;
}

function EUC_SUIVI_V45_snapshotKey_(annee){
  return 'EUC_SUIVI_V45_'+EUC_SUIVI_PUBLIC_txt_(annee);
}

function EUC_SUIVI_V45_snapshot_(annee){
  var cache=CacheService.getScriptCache();
  var key=EUC_SUIVI_V45_snapshotKey_(annee);
  var cached=cache.get(key);

  if(cached){
    try{return JSON.parse(cached);}catch(e){}
  }

  var t0=Date.now();
  var accueil=EUC_SUIVI_PUBLIC_accueilSource_(annee);
  var cards=JSON.parse(JSON.stringify((accueil&&accueil.cartes)||[]));

  // Comptage actif par classe / période / élève.
  // On dédoublonne par élève pour éviter de compter plusieurs dossiers.
  var dossiers=EUC_CONVENTION_lireAccesFraisV108_();
  var activeBy={};

  dossiers.forEach(function(a){
    if(!EUC_SUIVI_V45_estActive_(a))return;

    var an=EUC_SUIVI_PUBLIC_txt_(a.Annee_scolaire);
    if(annee && an && an!==annee)return;

    var cid=Number(EUC_PFMP_ref_(a.Classe_convention))||0;
    var pid=Number(EUC_PFMP_ref_(a.Periode))||0;
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(!(cid>0&&pid>0&&eid>0))return;

    activeBy[cid+'|'+pid+'|'+eid]=1;
  });

  var counts={};
  Object.keys(activeBy).forEach(function(k){
    var parts=k.split('|');
    var kp=parts[0]+'|'+parts[1];
    counts[kp]=(counts[kp]||0)+1;
  });

  cards.forEach(function(c){
    (c.periodes||[]).forEach(function(p){
      p.conventions=Number(counts[
        Number(c.classeId)+'|'+Number(p.id)
      ]||0);
      p.total=Number(p.total)||Number(c.effectif)||0;
      p.ratio=p.total?p.conventions/p.total:0;
    });
  });

  var out={
    annee:annee,
    cartes:cards,
    builtAt:new Date().toISOString(),
    dureeMs:Date.now()-t0
  };

  try{
    cache.put(key,JSON.stringify(out),EUC_SUIVI_V45_TTL_);
  }catch(e){}

  return out;
}

function EUC_SUIVI_V45_cartesNiveau_(annee,famille,niveau){
  var snap=EUC_SUIVI_V45_snapshot_(annee);
  return (snap.cartes||[]).filter(function(card){
    var fam=EUC_SUIVI_PUBLIC_famille_(card);
    if(!fam||fam.code!==famille)return false;
    return EUC_SUIVI_PUBLIC_niveau_(fam.code,card).code===niveau;
  });
}

function EUC_SUIVI_V45_labelPeriode_(famille,numero){
  return (famille==='BTS'?'Stage n°':'PFMP n°')+numero;
}

function EUC_SUIVI_PUBLIC_niveauV45(payload){
  payload=payload||{};

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);

  if(!annee||!famille||!niveau){
    throw new Error('Année, famille ou niveau manquant.');
  }

  var cards=EUC_SUIVI_V45_cartesNiveau_(annee,famille,niveau);
  var byKey={};

  cards.forEach(function(card){
    (card.periodes||[]).forEach(function(p){
      if(!EUC_SUIVI_PUBLIC_periodeVisibleV44_(p))return;

      var nt=EUC_SUIVI_PUBLIC_norm_(p.libelle||'');
      if(
        famille==='BACPRO' &&
        niveau==='TERM' &&
        (nt==='VFMP'||nt==='VEMP')
      ) return;

      var key=EUC_SUIVI_PUBLIC_periodeKey_(p);

      if(!byKey[key]){
        byKey[key]={
          key:key,
          id:Number(p.id)||0,
          originalLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)||'PFMP',
          debut:EUC_SUIVI_PUBLIC_txt_(p.debut),
          fin:EUC_SUIVI_PUBLIC_txt_(p.fin),
          debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
          finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
          conventions:0,
          total:0,
          classes:0
        };
      }

      byKey[key].conventions+=Number(p.conventions)||0;
      byKey[key].total+=Number(p.total)||Number(card.effectif)||0;
      byKey[key].classes++;
    });
  });

  var periodes=Object.keys(byKey)
    .map(function(k){return byKey[k];})
    .sort(function(a,b){
      var da=a.debut||'9999',db=b.debut||'9999';
      if(da!==db)return da.localeCompare(db);
      return a.originalLibelle.localeCompare(b.originalLibelle,'fr');
    });

  periodes.forEach(function(p,i){
    p.numero=i+1;
    p.libelle=EUC_SUIVI_V45_labelPeriode_(famille,p.numero);
    p.manquantes=Math.max(0,p.total-p.conventions);
    p.pourcentage=p.total
      ? Math.round((p.conventions/p.total)*100)
      : 0;
  });

  return {
    ok:true,
    annee:annee,
    famille:famille,
    niveau:niveau,
    classes:cards.length,
    effectif:cards.reduce(function(s,c){
      return s+(Number(c.effectif)||0);
    },0),
    periodes:periodes
  };
}

function EUC_SUIVI_PUBLIC_classesV45(payload){
  payload=payload||{};

  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  var famille=EUC_SUIVI_PUBLIC_txt_(payload.famille);
  var niveau=EUC_SUIVI_PUBLIC_txt_(payload.niveau);
  var periodeKey=EUC_SUIVI_PUBLIC_txt_(payload.periode);

  if(!annee||!famille||!niveau||!periodeKey){
    throw new Error('Sélection incomplète.');
  }

  var cards=EUC_SUIVI_V45_cartesNiveau_(annee,famille,niveau);

  // Reconstituer l'ordre chronologique de toutes les périodes du niveau.
  var keys={};
  cards.forEach(function(card){
    (card.periodes||[]).forEach(function(p){
      if(!EUC_SUIVI_PUBLIC_periodeVisibleV44_(p))return;
      var k=EUC_SUIVI_PUBLIC_periodeKey_(p);
      if(!keys[k]){
        keys[k]={
          key:k,
          debut:EUC_SUIVI_PUBLIC_txt_(p.debut),
          originalLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle)
        };
      }
    });
  });

  var ordered=Object.keys(keys)
    .map(function(k){return keys[k];})
    .sort(function(a,b){
      var da=a.debut||'9999',db=b.debut||'9999';
      if(da!==db)return da.localeCompare(db);
      return a.originalLibelle.localeCompare(b.originalLibelle,'fr');
    });

  var index=ordered.findIndex(function(x){
    return x.key===periodeKey;
  });
  var numero=index>=0?index+1:1;
  var displayLabel=EUC_SUIVI_V45_labelPeriode_(famille,numero);

  var rows=[];
  var periode=null;

  cards.forEach(function(card){
    var p=(card.periodes||[]).filter(function(x){
      return EUC_SUIVI_PUBLIC_periodeKey_(x)===periodeKey;
    })[0];

    if(!p)return;

    if(!periode){
      periode={
        key:periodeKey,
        id:Number(p.id)||0,
        libelle:displayLabel,
        originalLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle),
        numero:numero,
        debut:EUC_SUIVI_PUBLIC_txt_(p.debut),
        fin:EUC_SUIVI_PUBLIC_txt_(p.fin),
        debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
        finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin)
      };
    }

    var total=Number(p.total)||Number(card.effectif)||0;
    var conventions=Number(p.conventions)||0;

    rows.push({
      classeId:Number(card.classeId)||0,
      classe:EUC_SUIVI_PUBLIC_txt_(card.classe),
      categorie:EUC_SUIVI_PUBLIC_txt_(card.categorie),
      effectif:Number(card.effectif)||total,
      periodeId:Number(p.id)||0,
      periodeLibelle:displayLabel,
      originalPeriodeLibelle:EUC_SUIVI_PUBLIC_txt_(p.libelle),
      debutFr:EUC_SUIVI_PUBLIC_dateFr_(p.debut),
      finFr:EUC_SUIVI_PUBLIC_dateFr_(p.fin),
      conventions:conventions,
      total:total,
      manquantes:Math.max(0,total-conventions),
      pourcentage:total
        ? Math.round((conventions/total)*100)
        : 0
    });
  });

  rows.sort(function(a,b){
    return a.classe.localeCompare(b.classe,'fr');
  });

  if(!periode){
    throw new Error('Période introuvable pour ce niveau.');
  }

  return {
    ok:true,
    ctx:{
      active:annee,
      annees:[{code:annee,libelle:annee}]
    },
    group:{
      famille:famille,
      familleLibelle:
        famille==='BACPRO'?'Bac professionnel':famille,
      niveau:niveau,
      niveauLibelle:
        niveau==='TERM'?'Terminale':
        niveau==='PREM'?'Première':
        niveau==='SECD'?'Seconde':
        niveau==='1CAP'?'1re année CAP':
        niveau==='TCAP'?'Terminale CAP':
        niveau==='BTS1'?'1re année BTS':
        niveau==='BTS2'?'2e année BTS':niveau
    },
    periode:periode,
    classes:rows
  };
}

function EUC_SUIVI_PUBLIC_warmV45(payload){
  payload=payload||{};
  var annee=EUC_SUIVI_PUBLIC_txt_(payload.annee);
  if(!annee)return {ok:false};
  var snap=EUC_SUIVI_V45_snapshot_(annee);
  return {
    ok:true,
    annee:annee,
    cartes:(snap.cartes||[]).length,
    builtAt:snap.builtAt
  };
}
