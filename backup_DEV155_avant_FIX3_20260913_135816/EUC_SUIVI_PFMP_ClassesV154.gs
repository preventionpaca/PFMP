/** Eucalyptus PFMP — v1.0.0-dev.154
 * Accueil du suivi PFMP par classe et période.
 * Filtre majeur : année scolaire active.
 */
var EUC_SUIVI_CLASSES_V154_='v1.0.0-dev.154';

function EUC_V154_txt_(v){return String(v==null?'':v).trim();}

function EUC_V154_refIds_(v){
  if(v==null||v==='')return [];
  if(Array.isArray(v)){
    var a=v.slice();
    if(a.length&&typeof a[0]==='string'&&a[0].toUpperCase()==='L')a=a.slice(1);
    return a.map(Number).filter(function(x){return x>0;});
  }
  if(typeof v==='number')return v>0?[Number(v)]:[];
  var s=String(v).trim();
  if(!s)return [];
  try{
    var j=JSON.parse(s);
    if(Array.isArray(j))return EUC_V154_refIds_(j);
  }catch(e){}
  return s.split(/[;,| ]+/).map(Number).filter(function(x){return x>0;});
}

function EUC_V154_anneesMap_(){
  var out={};
  try{
    EUC_IMPORT_lireRecords_('Annees_Scolaires').forEach(function(a){
      out[String(a.id)]=EUC_V154_txt_(a.Code||a.Libelle);
    });
  }catch(e){}
  return out;
}

function EUC_V154_anneeCode_(v,map){
  var s=EUC_V154_txt_(v);
  if(!s)return '';
  if(map&&map[s])return map[s];
  var m=s.match(/20\d{2}\s*[-\/]\s*20\d{2}/);
  if(m)return m[0].replace(/\s/g,'').replace('/','-');
  var y=s.match(/20\d{2}/);
  if(y){var n=Number(y[0]);return n+'-'+(n+1);}
  return s;
}

function EUC_V154_cat_(c){
  var t=[c.Nom,c.Libelle,c.Formation,c.Niveau,c.Filiere,c.Filiere_Pronote,c.Niveau_Pronote]
    .map(EUC_V154_txt_).join(' ').toUpperCase();
  if(t.indexOf('BTS')>=0)return 'BTS';
  if(t.indexOf('CAP')>=0)return 'CAP';
  return 'BAC PRO';
}

function EUC_V154_classeNom_(c){
  return EUC_V154_txt_(c.Nom||c.Libelle||c.Code_import||('Classe '+c.id));
}

function EUC_V154_periodeLibelle_(p){
  return EUC_V154_txt_(p.Libelle||p.Type||p.Groupe||p.Nom||('PFMP '+p.id));
}

function EUC_V154_dossierEligible_(a){
  if(a.Supprimee_admin===true)return false;
  return !!(a.Date_saisie_entreprise||a.Numero_enregistrement||a.Entreprise_raison_sociale||a.Statut==='ENTREPRISE_SAISIE');
}

function EUC_V154_anneeDossier_(a,map){
  if(typeof EUC_PFMP_anneeDossierV148_==='function'){
    try{return EUC_PFMP_anneeDossierV148_(a);}catch(e){}
  }
  return EUC_V154_anneeCode_(a.Annee_scolaire,map);
}

function EUC_V154_accueil_(codeAnnee){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var anneeMap=EUC_V154_anneesMap_();
  codeAnnee=EUC_V154_txt_(codeAnnee);

  var classes=EUC_IMPORT_lireRecords_('Classes').filter(function(c){return c.Actif!==false;});
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){
    if(e.Actif===false||e.Present_dernier_import===false)return false;
    var an=EUC_V154_anneeCode_(e.Annee_scolaire,anneeMap);
    return !codeAnnee||!an||an===codeAnnee;
  });
  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes').filter(function(p){
    if(p.Actif===false)return false;
    var an=EUC_V154_anneeCode_(p.Annee_scolaire,anneeMap);
    return !codeAnnee||!an||an===codeAnnee;
  });
  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(EUC_V154_dossierEligible_);

  var effectifs={};
  eleves.forEach(function(e){
    var cid=Number(EUC_PFMP_ref_(e.Classe));
    if(cid>0)effectifs[cid]=(effectifs[cid]||0)+1;
  });

  var perByClass={};
  periodes.forEach(function(p){
    var ids=EUC_V154_refIds_(p.Classes_concernees);
    if(!ids.length){
      var single=Number(EUC_PFMP_ref_(p.Classe));
      if(single>0)ids=[single];
    }
    ids.forEach(function(cid){
      if(!perByClass[cid])perByClass[cid]=[];
      perByClass[cid].push(p);
    });
  });

  var counts={};
  dossiers.forEach(function(a){
    var cid=Number(EUC_PFMP_ref_(a.Classe_convention));
    var pid=Number(EUC_PFMP_ref_(a.Periode));
    if(!(cid>0&&pid>0))return;
    var an=EUC_V154_anneeDossier_(a,anneeMap);
    if(codeAnnee&&an&&an!==codeAnnee)return;
    var key=cid+'|'+pid;
    counts[key]=(counts[key]||0)+1;
  });

  var cards=[];
  classes.forEach(function(c){
    var cid=Number(c.id);
    var total=Number(effectifs[cid]||0);
    var ps=(perByClass[cid]||[]).slice().sort(function(a,b){
      return String(EUC_IMPORT_dateExistanteISO_(a.Date_debut)||'').localeCompare(String(EUC_IMPORT_dateExistanteISO_(b.Date_debut)||''));
    });
    if(!total&&!ps.length)return;

    cards.push({
      classeId:cid,
      classe:EUC_V154_classeNom_(c),
      categorie:EUC_V154_cat_(c),
      effectif:total,
      periodes:ps.map(function(p){
        var nb=Number(counts[cid+'|'+p.id]||0);
        return {
          id:Number(p.id),
          libelle:EUC_V154_periodeLibelle_(p),
          debut:EUC_IMPORT_dateExistanteISO_(p.Date_debut),
          fin:EUC_IMPORT_dateExistanteISO_(p.Date_fin),
          conventions:nb,
          total:total,
          ratio:total?nb/total:0
        };
      })
    });
  });

  cards.sort(function(a,b){
    if(a.categorie!==b.categorie)return a.categorie.localeCompare(b.categorie,'fr');
    return a.classe.localeCompare(b.classe,'fr');
  });

  return {version:EUC_SUIVI_CLASSES_V154_,annee:codeAnnee,cartes:cards};
}

function EUC_SUIVI_CLASSES_accueilV154(codeAnnee){return EUC_V154_accueil_(codeAnnee);}

function EUC_SUIVI_CLASSES_afficherV154(e){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var ctx=EUC_PFMP_contexteAnneeV148();
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classes');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.accueilJson=JSON.stringify(EUC_V154_accueil_(ctx.active));
  return tpl.evaluate().setTitle('Suivi PFMP par classe').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function DIAGNOSTIC_DEV154_ACCUEIL(){
  var ctx=EUC_PFMP_contexteAnneeV148();
  var out=EUC_V154_accueil_(ctx.active);
  console.log('=== DEV.154 — ACCUEIL SUIVI PFMP ===');
  console.log('Année : '+ctx.active);
  console.log('Classes : '+out.cartes.length);
  out.cartes.forEach(function(c){
    console.log(c.categorie+' | '+c.classe+' | '+c.effectif+' élève(s) | '+c.periodes.map(function(p){
      return p.libelle+' '+p.conventions+'/'+p.total;
    }).join(' ; '));
  });
  return out;
}
