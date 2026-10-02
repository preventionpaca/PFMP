function EUC_DEV211_txt_(v){ return String(v==null?'':v).trim(); }
function EUC_DEV211_norm_(v){
  return EUC_DEV211_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV211_refId_(v){
  if(typeof v==='number') return v;
  if(Array.isArray(v)){ for(var i=0;i<v.length;i++){ if(typeof v[i]==='number') return v[i]; } }
  return Number(v)||0;
}
function EUC_DEV211_cols_(table){ return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(table)+'/columns',null).columns||[]); }
function EUC_DEV211_records_(table){ return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent(table)+'/records',null).records||[]); }
function EUC_DEV211_col_(cols,names){
  var wanted=names.map(EUC_DEV211_norm_);
  for(var i=0;i<cols.length;i++){ if(wanted.indexOf(EUC_DEV211_norm_(cols[i].id))>=0) return cols[i].id; }
  return '';
}

function EUC_DEV211_aliases_(name){
  var n=EUC_DEV211_norm_(name), out={};
  function add(v){ v=EUC_DEV211_norm_(v); if(v) out[v]=true; }
  add(n); add(n.replace('BTS',''));

  var groups=[
    ['1BTSMV','1TSMV','1BTSMVVL','1BTSMETIERSDESVEHICULES'],
    ['2BTSMV','2TSMV','2BTSMVVL','2BTSMETIERSDESVEHICULES'],
    ['1CAPP','1CAPPEINTRE','1CAPPEINTURE','1CAPPEINTREAUTOMOBILE'],
    ['2CAPP','2CAPPEINTRE','2CAPPEINTURE','2CAPPEINTREAUTOMOBILE'],
    ['1BTSELECALT','1BTSELECTROTECHNIQUEALT','1ELECALT'],
    ['2BTSELECALT','2BTSELECTROTECHNIQUEALT','2ELECALT'],
    ['BACHELORIP','BACHELORINTEGRATIONDESPROCEDES','BIP','BACHELORBIP']
  ];

  groups.forEach(function(g){
    if(g.indexOf(n)>=0){ g.forEach(add); }
  });

  if(/^1BTS/.test(n)) add(n.replace(/^1BTS/,'1'));
  if(/^2BTS/.test(n)) add(n.replace(/^2BTS/,'2'));
  if(/^BTS1/.test(n)) add(n.replace(/^BTS1/,'1'));
  if(/^BTS2/.test(n)) add(n.replace(/^BTS2/,'2'));

  return Object.keys(out);
}

function EUC_DEV211_isFullClassApprenticeship_(className){
  var n=EUC_DEV211_norm_(className);
  return (
    n.indexOf('CAPP')>=0 ||
    n.indexOf('CAPPEINTRE')>=0 ||
    n.indexOf('BTSELECALT')>=0 ||
    n.indexOf('BTSELECTROTECHNIQUEALT')>=0 ||
    n==='BACHELORIP' ||
    n==='BIP' ||
    n.indexOf('BACHELORINTEGRATIONDESPROCEDES')>=0
  );
}

function EUC_DEV211_mergeStructure_(annee,baseClasses){
  var classes=(baseClasses||[]).slice(), byNorm={};
  classes.forEach(function(c){ byNorm[EUC_DEV211_norm_(c.nom)]=true; });

  var cols=EUC_DEV211_cols_('EUC_ELEVES_PFMP');
  var rows=EUC_DEV211_records_('EUC_ELEVES_PFMP');
  var cCode=EUC_DEV211_col_(cols,['Code_classe_importe','Code_classe','Classe_Pronote']);
  var cClasse=EUC_DEV211_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cActif=EUC_DEV211_col_(cols,['Actif']);
  var cPresent=EUC_DEV211_col_(cols,['Present_dernier_import']);

  rows.forEach(function(r){
    var f=r.fields||{};
    if(cActif && f[cActif]===false) return;
    if(cPresent && f[cPresent]===false) return;

    var code=cCode ? EUC_DEV211_txt_(f[cCode]) : '';
    if(!code) return;

    var norm=EUC_DEV211_norm_(code);
    if(byNorm[norm]) return;

    var ref=cClasse ? EUC_DEV211_refId_(f[cClasse]) : 0;
    classes.push({id:ref || ('code:'+code), nom:code, synthetic:!ref});
    byNorm[norm]=true;
  });

  classes.sort(function(a,b){ return String(a.nom||'').localeCompare(String(b.nom||''),'fr'); });
  return classes;
}

function EUC_DEV211_getStructureSnapshot(annee){
  var base=(typeof EUC_DEV206B_getStructureSnapshot==='function')
    ? EUC_DEV206B_getStructureSnapshot(annee)
    : EUC_DEV206_getStructureSnapshot(annee);

  return {
    ok:true,
    source:(base.source||'snapshot')+'+eleves',
    updatedAt:base.updatedAt||'',
    annee:annee,
    classes:EUC_DEV211_mergeStructure_(annee,base.classes||[])
  };
}

function EUC_DEV211_rebuildStructureSnapshot(annee){
  var base=(typeof EUC_DEV206B_rebuildStructureSnapshot==='function')
    ? EUC_DEV206B_rebuildStructureSnapshot(annee)
    : EUC_DEV206_rebuildStructureSnapshot(annee);

  return {
    ok:true,
    source:'rebuilt+eleves',
    updatedAt:base.updatedAt||'',
    annee:annee,
    classes:EUC_DEV211_mergeStructure_(annee,base.classes||[])
  };
}

function EUC_DEV211_studentsForClass_(classeId,classeNom){
  var cols=EUC_DEV211_cols_('EUC_ELEVES_PFMP');
  var rows=EUC_DEV211_records_('EUC_ELEVES_PFMP');

  var cClasse=EUC_DEV211_col_(cols,['Classe','Classe_id','ClasseRef']);
  var cCode=EUC_DEV211_col_(cols,['Code_classe_importe','Code_classe','Classe_Pronote']);
  var cNom=EUC_DEV211_col_(cols,['Nom']);
  var cPrenom=EUC_DEV211_col_(cols,['Prenom','Prénom']);
  var cActif=EUC_DEV211_col_(cols,['Actif']);
  var cPresent=EUC_DEV211_col_(cols,['Present_dernier_import']);

  var aliases=EUC_DEV211_aliases_(classeNom);
  var idNum=Number(classeId)||0;
  var out=[];

  rows.forEach(function(r){
    var f=r.fields||{};
    if(cActif && f[cActif]===false) return;
    if(cPresent && f[cPresent]===false) return;

    var ok=false;

    /*
     * DEV255 — la référence Classe est prioritaire et exclusive
     * dès qu'un ID réel de classe est disponible.
     *
     * Les alias ne servent plus qu'aux classes synthétiques / sans ID.
     */
    if(idNum && cClasse){
      ok=(
        EUC_DEV211_refId_(f[cClasse])===idNum
      );
    }else if(cCode){
      var code=EUC_DEV211_norm_(f[cCode]);
      if(aliases.indexOf(code)>=0) ok=true;
    }

    if(!ok) return;

    out.push({
      id:r.id,
      nom:cNom ? EUC_DEV211_txt_(f[cNom]) : '',
      prenom:cPrenom ? EUC_DEV211_txt_(f[cPrenom]) : ''
    });
  });

  out.sort(function(a,b){ return (a.nom+' '+a.prenom).localeCompare(b.nom+' '+b.prenom,'fr'); });
  return out;
}

function EUC_DEV211_loadApprentis(annee,classeId,classeNom){
  var t0=Date.now();
  var students=EUC_DEV211_studentsForClass_(classeId,classeNom);
  var app=(typeof EUC_DEV208_latestAppMap_==='function') ? EUC_DEV208_latestAppMap_() : {map:{},cols:[]};
  var cols=app.cols||[];

  function c(names){ return EUC_DEV211_col_(cols,names); }
  function val(f,names){ var cc=c(names); return cc ? EUC_DEV211_txt_(f[cc]) : ''; }
  function bool(f,names){ var cc=c(names); return cc ? !!f[cc] : false; }

  return {
    ok:true,
    source:'direct+ref-priority255',
    durationMs:Date.now()-t0,
    students:students.map(function(s){
      var row=(app.map||{})[s.id], f=row ? (row.fields||{}) : {};
      return {
        id:s.id,
        nom:s.nom,
        prenom:s.prenom,
        apprenti:bool(f,['Actif','Apprenti']) || EUC_DEV211_isFullClassApprenticeship_(classeNom),
        debut:val(f,['Date_debut','Date_contrat_officielle']),
        fin:val(f,['Date_fin']),
        siret:val(f,['SIRET']),
        nomEntreprise:val(f,['Nom_entreprise']),
        nomCommercial:val(f,['Nom_commercial','Entreprise']),
        adresse:val(f,['Adresse_entreprise','Adresse']),
        cp:val(f,['Code_postal','CodePostal','CP']),
        ville:val(f,['Ville']),
        telEntreprise:val(f,['Entreprise_telephone','Telephone_entreprise']),
        mailEntreprise:val(f,['Entreprise_courriel','Courriel_entreprise']),
        tuteur:val(f,['Tuteur_nom','Tuteur']),
        telTuteur:val(f,['Tuteur_telephone','Telephone_tuteur']),
        mailTuteur:val(f,['Tuteur_courriel','Courriel_tuteur']),
        dossierRemis:bool(f,['Dossier_distribue']),
        dateDossier:val(f,['Date_distribution_dossier']),
        transmisCfa:bool(f,['Dossier_transmis_CFA']),
        dateCfa:val(f,['Date_transmission_CFA']),
        dateContrat:val(f,['Date_contrat_officielle','Date_debut']),
        dateRupture:val(f,['Date_rupture_contrat']),
        nouveauContrat:bool(f,['Nouveau_contrat'])
      };
    })
  };
}

function EUC_DEV211_getDashboard(annee){
  var eCols=EUC_DEV211_cols_('EUC_ELEVES_PFMP');
  var eRows=EUC_DEV211_records_('EUC_ELEVES_PFMP');
  var cCode=EUC_DEV211_col_(eCols,['Code_classe_importe','Code_classe','Classe_Pronote']);
  var cActif=EUC_DEV211_col_(eCols,['Actif']);
  var cPresent=EUC_DEV211_col_(eCols,['Present_dernier_import']);

  var fullIds={}, classEntiere=0;

  eRows.forEach(function(r){
    var f=r.fields||{};
    if(cActif && f[cActif]===false) return;
    if(cPresent && f[cPresent]===false) return;
    var code=cCode ? EUC_DEV211_txt_(f[cCode]) : '';

    if(EUC_DEV211_isFullClassApprenticeship_(code)){
      fullIds[r.id]=true;
      classEntiere++;
    }
  });

  var mixite=0,dossier=0,cfa=0,valides=0,ruptures=0;

  try{
    var aCols=EUC_DEV211_cols_('EUC_APPRENTISSAGE_PFMP');
    var aRows=EUC_DEV211_records_('EUC_APPRENTISSAGE_PFMP');

    var cEleve=EUC_DEV211_col_(aCols,['Eleve','Élève','Eleve_id']);
    var cAActif=EUC_DEV211_col_(aCols,['Actif']);
    var cDossier=EUC_DEV211_col_(aCols,['Dossier_distribue']);
    var cCfa=EUC_DEV211_col_(aCols,['Dossier_transmis_CFA']);
    var cDebut=EUC_DEV211_col_(aCols,['Date_contrat_officielle','Date_debut']);
    var cRupture=EUC_DEV211_col_(aCols,['Date_rupture_contrat']);

    var latest={};
    aRows.forEach(function(r){
      var id=EUC_DEV211_refId_((r.fields||{})[cEleve]);
      if(!id) return;
      if(!latest[id] || r.id>latest[id].id) latest[id]=r;
    });

    Object.keys(latest).forEach(function(k){
      var f=latest[k].fields||{}, id=Number(k);
      if(cDossier && f[cDossier]) dossier++;
      if(cCfa && f[cCfa]) cfa++;
      if(cDebut && EUC_DEV211_txt_(f[cDebut]) && !(cRupture && EUC_DEV211_txt_(f[cRupture]))) valides++;
      if(cRupture && EUC_DEV211_txt_(f[cRupture])) ruptures++;
      if(!fullIds[id] && cAActif && f[cAActif]!==false) mixite++;
    });
  }catch(e){}

  return {
    ok:true,
    global:{
      classeEntiere:classEntiere,
      mixite:mixite,
      totalApprentis:classEntiere+mixite,
      dossierRemis:dossier,
      transmisCFA:cfa,
      contratsValides:valides,
      ruptures:ruptures
    }
  };
}