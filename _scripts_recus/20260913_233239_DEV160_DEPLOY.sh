#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.160"

SERVICE="apps-script/EUC_MIGRATION_JOTFORM_V160.gs"
PAGE="apps-script/Migration_JotForm_PFMP_V160.html"
ROUTER="apps-script/EDT.js"
ADMIN_HOME="apps-script/Admin_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV160_${STAMP}"
mkdir -p "$BACKUP"

for f in "$SERVICE" "$PAGE" "$ROUTER" "$ADMIN_HOME"; do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

echo "============================================================"
echo " DEV.160 — MIGRATION JOTFORM 2026-2027"
echo "============================================================"

cat > "$SERVICE" <<'EOF'
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
  var matrix=Utilities.parseCsv(csvText);
  if(!matrix||matrix.length<2)throw new Error('CSV vide ou illisible.');
  var headers=matrix[0].map(EUC_V160_txt_);
  return matrix.slice(1).filter(function(r){return r.some(function(v){return EUC_V160_txt_(v);});}).map(function(r){
    var o={};
    headers.forEach(function(h,i){o[h]=r[i]==null?'':r[i];});
    return o;
  });
}

function EUC_V160_mapCsv_(r){
  var classe=EUC_V160_txt_(r['Classe BAC PRO']||r['Classe CAP']||r['Classe BTS']);
  return {
    Submission_ID:EUC_V160_txt_(r['Submission ID']),
    Annee_scolaire:EUC_V160_txt_(r['Année scolaire']),
    Numero_convention_JotForm:EUC_V160_txt_(r['n° de convention']),
    Periode_numero:EUC_V160_txt_(r['Période n°']),
    Date_debut_brut:EUC_V160_txt_(r['Date de début']),
    Date_fin_brut:EUC_V160_txt_(r['Date de fin']),
    Classe_saisie:classe,
    Diplome:EUC_V160_txt_(r['Diplôme']),
    Nom_eleve:EUC_V160_txt_(r['Nom']),
    Prenom_eleve:EUC_V160_txt_(r['Prénom']),
    Date_naissance:EUC_V160_txt_(r['Date de naissance']),
    Email_eleve:EUC_V160_txt_(r['Email']),
    Entreprise_saisie:EUC_V160_txt_(r['Nom entreprise']),
    SIRET_brut:EUC_V160_txt_(r['N° SIRET']),
    SIRET_normalise:EUC_V160_digits_(r['N° SIRET']),
    Adresse_entreprise:EUC_V160_txt_(r['Adresse entreprise']),
    Complement_adresse_entreprise:EUC_V160_txt_(r['Complément adresse entreprise']),
    CP_entreprise:EUC_V160_txt_(r['Code postal entreprise']),
    Ville_entreprise:EUC_V160_txt_(r['Ville entreprise']),
    Email_entreprise:EUC_V160_txt_(r["Adresse e-mail de l'entreprise"]),
    Telephone_entreprise:EUC_V160_txt_(r['Téléphone entreprise']),
    Nom_tuteur:EUC_V160_txt_(r['Nom du tuteur']),
    Fonction_tuteur:EUC_V160_txt_(r['Fonction du tuteur']),
    Email_tuteur:EUC_V160_txt_(r['Adresse e-mail du tuteur']),
    Telephone_tuteur:EUC_V160_txt_(r['Téléphone du tuteur']),
    Raw_JSON:JSON.stringify(r)
  };
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

function EUC_V160_importCsv(csvText){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  EUC_V160_assurerTable_();

  var rows=EUC_V160_csvRows_(csvText);
  var sourceCount=rows.length;
  rows=rows.filter(function(r){return EUC_V160_txt_(r['Année scolaire'])===EUC_V160_YEAR_;});

  if(!rows.length)throw new Error('Aucune ligne '+EUC_V160_YEAR_+' trouvée dans le CSV.');

  var students=EUC_V160_students_();
  var classes=EUC_V160_classes_();
  var companies=EUC_V160_enterprises_();

  var existing=EUC_IMPORT_lireRecords_(EUC_V160_TABLE_);
  var bySubmission={};
  existing.forEach(function(r){
    var sid=EUC_V160_txt_(r.Submission_ID);
    if(sid)bySubmission[sid]=r;
  });

  var created=0,updated=0;

  rows.forEach(function(raw){
    var row=EUC_V160_analyserRow_(EUC_V160_mapCsv_(raw),students,classes,companies);
    var fields={};
    Object.keys(row).forEach(function(k){fields[k]=row[k];});

    var ex=bySubmission[row.Submission_ID];
    if(ex){
      EUC_ENT_grist('patch','/tables/'+EUC_V160_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
      updated++;
    }else{
      EUC_ENT_grist('post','/tables/'+EUC_V160_TABLE_+'/records',{records:[{fields:fields}]});
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
EOF

cat > "$PAGE" <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f7fb;margin:0;color:#1d2939}
    .wrap{max-width:1500px;margin:auto;padding:24px}
    .top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}
    h1{margin:0}.sub{color:#667085}
    .card{background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px;margin-bottom:18px}
    .upload{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}
    .metric{background:#f8fafc;border:1px solid #d9e1ec;border-radius:12px;padding:12px}
    .metric span{display:block;color:#667085;font-size:12px}.metric b{font-size:22px}
    button,a.btn{border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none}
    .primary{background:#165d9c;color:#fff}.secondary{background:#fff;color:#1d2939;border:1px solid #d9e1ec}
    .okb{background:#067647;color:#fff}
    .tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.tab{background:#fff;border:1px solid #d9e1ec}.tab.active{background:#165d9c;color:#fff}
    table{width:100%;border-collapse:collapse;min-width:1400px}.table-wrap{overflow:auto}
    th,td{border-bottom:1px solid #edf0f4;padding:8px;text-align:left;vertical-align:top;font-size:13px}
    th{background:#f8fafc;position:sticky;top:0;z-index:2}
    .pill{display:inline-block;padding:4px 8px;border-radius:999px;font-weight:800;font-size:11px}
    .VERT{background:#ecfdf3;color:#067647}.ORANGE{background:#fff7ed;color:#b45309}.ROUGE{background:#fff1f2;color:#b42318}
    .small{font-size:11px;color:#667085}.alert{max-width:260px}
    textarea{width:100%;min-height:52px;border:1px solid #b9c7d8;border-radius:8px;padding:6px}
    select{border:1px solid #b9c7d8;border-radius:8px;padding:6px}
    #status{display:none;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-weight:700}
    #status.show{display:block}.info{background:#eef5fb;color:#164e7a}.success{background:#ecfdf3;color:#067647}.error{background:#fff1f2;color:#b42318}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:spin .75s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.metrics{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div>
      <h1>Migration JotForm PFMP — 2026-2027</h1>
      <div class="sub">Import tampon, analyse automatique et contrôle avant toute migration définitive.</div>
    </div>
    <a id="back" class="btn secondary" href="#">← Retour</a>
  </div>

  <div id="status"></div>

  <div class="card">
    <div class="upload">
      <input id="file" type="file" accept=".csv,text/csv">
      <button id="analyse" class="primary" type="button">Analyser / importer le CSV</button>
      <button id="validateGreen" class="okb" type="button">Valider toutes les lignes vertes</button>
    </div>
    <div class="small" style="margin-top:8px">Seules les lignes <b>2026-2027</b> sont importées. Les autres années sont ignorées dans cette phase.</div>

    <div class="metrics">
      <div class="metric"><span>Total tampon</span><b id="mTotal">0</b></div>
      <div class="metric"><span>Vert</span><b id="mVert">0</b></div>
      <div class="metric"><span>À contrôler</span><b id="mOrange">0</b></div>
      <div class="metric"><span>Bloqué</span><b id="mRouge">0</b></div>
      <div class="metric"><span>Validé</span><b id="mValide">0</b></div>
    </div>
  </div>

  <div class="card">
    <div class="tabs">
      <button class="tab active" data-filter="TOUS">Tous</button>
      <button class="tab" data-filter="VERT">Verts</button>
      <button class="tab" data-filter="ORANGE">À contrôler</button>
      <button class="tab" data-filter="ROUGE">Bloqués</button>
      <button class="tab" data-filter="VALIDEE">Validés</button>
      <button class="tab" data-filter="IGNOREE">Ignorés</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Contrôle</th>
          <th>Élève</th>
          <th>Classe</th>
          <th>Dates</th>
          <th>Entreprise saisie</th>
          <th>SIRET</th>
          <th>Rapprochement entreprise</th>
          <th>Alertes</th>
          <th>Décision</th>
          <th>Commentaire</th>
          <th>Action</th>
        </tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const C=<?!= config ?>;
let DATA=<?!= dataJson ?>;
let filter='TOUS';

const tbody=document.getElementById('tbody');
const status=document.getElementById('status');
const analyse=document.getElementById('analyse');
const validateGreen=document.getElementById('validateGreen');

function esc(v){const d=document.createElement('div');d.textContent=v==null?'':v;return d.innerHTML}
function show(text,type){status.textContent=text||'';status.className=text?'show '+type:''}
function busy(btn,text){btn.dataset.old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'+text}
function unbusy(btn){btn.disabled=false;btn.innerHTML=btn.dataset.old||btn.innerHTML}

function renderMetrics(){
  const r=DATA.resume||{};
  document.getElementById('mTotal').textContent=r.total||0;
  document.getElementById('mVert').textContent=r.VERT||0;
  document.getElementById('mOrange').textContent=r.ORANGE||0;
  document.getElementById('mRouge').textContent=r.ROUGE||0;
  document.getElementById('mValide').textContent=r.VALIDEE||0;
}

function visible(x){
  if(filter==='TOUS')return true;
  if(filter==='VALIDEE'||filter==='IGNOREE')return x.decision===filter;
  return x.niveau===filter;
}

function render(){
  renderMetrics();
  tbody.innerHTML=(DATA.lignes||[]).filter(visible).map(function(x){
    return '<tr data-id="'+x.id+'">'+
      '<td><span class="pill '+esc(x.niveau)+'">'+esc(x.niveau)+'</span><div class="small">JotForm '+esc(x.convention||x.submission)+'</div></td>'+
      '<td><b>'+esc(x.eleve)+'</b><div class="small">'+(x.matchEleve?'✓ '+esc(x.matchEleve):'Non reconnu')+'</div></td>'+
      '<td><b>'+esc(x.classe)+'</b><div class="small">'+(x.matchClasse?'✓ '+esc(x.matchClasse):'Non reconnue')+'</div></td>'+
      '<td>'+esc(x.debut)+'<br>'+esc(x.fin)+'</td>'+
      '<td><b>'+esc(x.entreprise)+'</b><div class="small">'+esc(x.ville)+'</div></td>'+
      '<td>'+esc(x.siret||'—')+'<div class="small">'+esc(x.siretN||'')+'</div></td>'+
      '<td>'+(x.matchEntreprise?'<b>'+esc(x.matchEntreprise)+'</b><div class="small">score '+x.score+'%</div>':'<span class="small">Aucun rapprochement sûr</span>')+'</td>'+
      '<td class="alert">'+esc(x.alertes||'—')+'</td>'+
      '<td><select class="decision">'+
        '<option value="A_CONTROLER" '+(x.decision==='A_CONTROLER'?'selected':'')+'>À contrôler</option>'+
        '<option value="VALIDEE" '+(x.decision==='VALIDEE'?'selected':'')+'>Validée</option>'+
        '<option value="IGNOREE" '+(x.decision==='IGNOREE'?'selected':'')+'>Ignorée</option>'+
      '</select></td>'+
      '<td><textarea class="commentaire">'+esc(x.commentaire||'')+'</textarea></td>'+
      '<td><button class="saveLine primary" type="button">Enregistrer</button></td>'+
    '</tr>';
  }).join('');

  Array.from(tbody.querySelectorAll('.saveLine')).forEach(function(btn){
    btn.onclick=function(){
      const tr=btn.closest('tr');
      busy(btn,'Enregistrement...');
      google.script.run
        .withSuccessHandler(function(r){DATA=r;unbusy(btn);show('Ligne enregistrée.','success');render()})
        .withFailureHandler(function(e){unbusy(btn);show('Erreur : '+(e&&e.message||e),'error')})
        .EUC_V160_sauverControle({
          id:Number(tr.dataset.id),
          decision:tr.querySelector('.decision').value,
          commentaire:tr.querySelector('.commentaire').value
        });
    };
  });
}

Array.from(document.querySelectorAll('.tab')).forEach(function(btn){
  btn.onclick=function(){
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');filter=btn.dataset.filter;render();
  };
});

analyse.onclick=function(){
  const file=document.getElementById('file').files[0];
  if(!file){show('Choisissez d’abord le fichier CSV JotForm.','error');return}

  busy(analyse,'Analyse en cours...');
  show('Lecture et analyse du CSV en cours...','info');

  const reader=new FileReader();
  reader.onload=function(){
    google.script.run
      .withSuccessHandler(function(r){
        show('Import tampon terminé : '+r.yearCount+' ligne(s) 2026-2027, '+r.ignoredCount+' autre(s) année(s) ignorée(s).','success');
        google.script.run.withSuccessHandler(function(d){DATA=d;unbusy(analyse);render()}).EUC_V160_lister();
      })
      .withFailureHandler(function(e){unbusy(analyse);show('Erreur : '+(e&&e.message||e),'error')})
      .EUC_V160_importCsv(reader.result);
  };
  reader.onerror=function(){unbusy(analyse);show('Impossible de lire le fichier.','error')};
  reader.readAsText(file,'UTF-8');
};

validateGreen.onclick=function(){
  busy(validateGreen,'Validation en cours...');
  show('Validation des lignes vertes en cours...','info');
  google.script.run
    .withSuccessHandler(function(r){DATA=r;unbusy(validateGreen);show('Toutes les lignes vertes ont été validées.','success');render()})
    .withFailureHandler(function(e){unbusy(validateGreen);show('Erreur : '+(e&&e.message||e),'error')})
    .EUC_V160_validerVerts();
};

document.getElementById('back').href=C.baseUrl+'?page=admin-pfmp';
render();
</script>
</body>
</html>
EOF

python3 <<'PY'
from pathlib import Path

# Route
p=Path("apps-script/EDT.js")
s=p.read_text(encoding="utf-8")
if "migration-jotform-pfmp" not in s:
    markers=["if (page === 'destinataires-envois-pfmp')","if (page === 'suivi-pfmp-classes')"]
    pos=-1
    for marker in markers:
        pos=s.find(marker)
        if pos>=0: break
    if pos<0:
        raise SystemExit("ERREUR : ancre route PFMP introuvable.")
    route="if (page === 'migration-jotform-pfmp') return EUC_V160_afficher(e);\n  "
    s=s[:pos]+route+s[pos:]
p.write_text(s,encoding="utf-8")
print("OK : route migration JotForm ajoutée.")

# Vignette Admin
p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")
if "migration-jotform-pfmp" not in s:
    snippet="""
<style id="migV160Style">
.euc-v160-tile{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #d9e1ec;border-radius:16px;padding:18px;margin:16px 0;box-shadow:0 2px 8px rgba(16,24,40,.05)}
.euc-v160-title{font-weight:800;font-size:18px;color:#163a63;margin-bottom:6px}
.euc-v160-sub{color:#667085;font-size:13px}
</style>
<script id="migV160Script">
(function(){
  function addV160Tile(){
    if(document.getElementById('migV160Tile'))return;
    var a=document.createElement('a');
    a.id='migV160Tile';
    a.className='euc-v160-tile';
    a.href='https://script.google.com/macros/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec?page=migration-jotform-pfmp';
    a.innerHTML='<div class="euc-v160-title">⇄ Migration JotForm PFMP</div><div class="euc-v160-sub">Importer et contrôler les inscriptions JotForm 2026-2027 avant migration définitive.</div>';
    var host=document.querySelector('.tiles,.cards,.grid,.menu-grid,.actions-grid,main,.container')||document.body;
    host.appendChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addV160Tile);else addV160Tile();
})();
</script>
"""
    if "</body>" not in s:
        raise SystemExit("ERREUR : </body> absent Admin_PFMP.html.")
    s=s.replace("</body>",snippet+"</body>",1)
p.write_text(s,encoding="utf-8")
print("OK : vignette Migration JotForm ajoutée.")
PY

echo "============================================================"
echo " DEV.160 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_MIGRATION_JOTFORM_V160.js
cp "$ROUTER" /tmp/EDT_DEV160.js
node --check /tmp/EUC_MIGRATION_JOTFORM_V160.js
node --check /tmp/EDT_DEV160.js

grep -q "EUC_MIGRATION_JOTFORM_PFMP" "$SERVICE"
grep -q "EUC_V160_importCsv" "$SERVICE"
grep -q "EUC_V160_validerVerts" "$SERVICE"
grep -q "migration-jotform-pfmp" "$ROUTER"
grep -q "migV160Tile" "$ADMIN_HOME"
grep -q "Analyser / importer le CSV" "$PAGE"

echo "✓ import CSV JotForm 2026-2027"
echo "✓ table tampon séparée"
echo "✓ rapprochement élèves / classes / entreprises"
echo "✓ vert / orange / rouge"
echo "✓ validation ligne par ligne"
echo "✓ validation en lot des lignes vertes"
echo "✓ aucune écriture définitive dans les conventions à ce stade"

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo
echo "============================================================"
echo " DEV.160 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ Migration JotForm 2026-2027 opérationnelle"
echo "✓ analyse contrôlée avant migration définitive"
echo "✓ push + version + déploiement principal"
echo "============================================================"
