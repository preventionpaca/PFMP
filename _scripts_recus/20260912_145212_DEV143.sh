#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV142_avant_DEV143_${STAMP}"
mkdir -p "$BACKUP"

for f in \
  apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs \
  apps-script/Parametres_Convention_PFMP.html \
  apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs
do
  [ -f "$f" ] && cp "$f" "$BACKUP/" || true
done

cat > apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.143 — notifications paramétrables + enregistrement administratif. */

var EUC_NOTIF_V143_='v1.0.0-dev.143';
var EUC_NOTIF_TABLE_V143_='EUC_PARAMETRES_CONVENTION_PFMP';

function EUC_NOTIF_txtV143_(v,n){
  return String(v==null?'':v).trim().slice(0,n||10000);
}
function EUC_NOTIF_emailV143_(v){
  var x=EUC_NOTIF_txtV143_(v,250).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:'';
}
function EUC_NOTIF_uniqueV143_(a){
  var seen={},out=[];
  (a||[]).forEach(function(v){
    var x=EUC_NOTIF_emailV143_(v);
    if(x&&!seen[x]){seen[x]=true;out.push(x);}
  });
  return out;
}

function EUC_NOTIF_defaultsV143_(){
  return {
    NOTIF_BFE_EMAIL:'bfe@lycee-les-eucalyptus.org',
    NOTIF_AUTO_ENVOI:'NON',
    NOTIF_OBJET:'[PFMP] Enregistrement {{NUMERO_ENREGISTREMENT}} — {{PRENOM_ELEVE}} {{NOM_ELEVE}}',
    NOTIF_CORPS:[
      'Bonjour,',
      '',
      'La demande de convention de PFMP de {{PRENOM_ELEVE}} {{NOM_ELEVE}} auprès de {{ENTREPRISE}} a bien été enregistrée sous le numéro {{NUMERO_ENREGISTREMENT}}.',
      '',
      'Période prévue : {{DATE_DEBUT}} au {{DATE_FIN}}.',
      '',
      'L’original papier de la convention doit maintenant être déposé au Bureau des formations et des entreprises afin d’être présenté à la signature de Monsieur le Proviseur.',
      '',
      'Important : cet enregistrement ne vaut pas validation définitive de la PFMP. La convention signée constitue le document officiel.',
      '',
      'Une fois signée par Monsieur le Proviseur et par les parties concernées, la convention devra être remise à l’entreprise. La PFMP ne pourra débuter qu’après finalisation de la convention.',
      '',
      'Ce message confirme uniquement l’enregistrement administratif des informations transmises.'
    ].join('\n'),
    NOTIF_SIGNATURE:'Cordialement,\nBureau des formations et des entreprises\nLycée Les Eucalyptus'
  };
}

function EUC_NOTIF_paramsV143_(){
  var p=EUC_NOTIF_defaultsV143_();
  try{
    EUC_IMPORT_lireRecords_(EUC_NOTIF_TABLE_V143_)
      .filter(function(r){return r.Actif!==false;})
      .forEach(function(r){
        var k=String(r.Cle||'').trim();
        if(Object.prototype.hasOwnProperty.call(p,k)){
          p[k]=String(r.Valeur==null?'':r.Valeur);
        }
      });
  }catch(e){}
  return p;
}

function EUC_CONVENTION_notificationConfigLireV143(){
  var p=EUC_NOTIF_paramsV143_();
  return {
    version:EUC_NOTIF_V143_,
    variables:[
      '{{NUMERO_ENREGISTREMENT}}','{{PRENOM_ELEVE}}','{{NOM_ELEVE}}',
      '{{CLASSE}}','{{ENTREPRISE}}','{{DATE_DEBUT}}','{{DATE_FIN}}',
      '{{PROF_PRINCIPAL}}'
    ],
    items:[
      {cle:'NOTIF_BFE_EMAIL',label:'Adresse destinataire BFE / information',type:'email',valeur:p.NOTIF_BFE_EMAIL},
      {cle:'NOTIF_AUTO_ENVOI',label:'Envoi automatique après enregistrement (OUI / NON)',type:'text',valeur:p.NOTIF_AUTO_ENVOI},
      {cle:'NOTIF_OBJET',label:'Objet du courriel',type:'text',valeur:p.NOTIF_OBJET},
      {cle:'NOTIF_CORPS',label:'Corps du courriel',type:'textarea',valeur:p.NOTIF_CORPS},
      {cle:'NOTIF_SIGNATURE',label:'Signature du courriel',type:'textarea',valeur:p.NOTIF_SIGNATURE}
    ]
  };
}

function EUC_CONVENTION_notificationConfigEnregistrerV143(items){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise)throw new Error('Accès administrateur requis.');

  var allowed={
    NOTIF_BFE_EMAIL:true,NOTIF_AUTO_ENVOI:true,NOTIF_OBJET:true,
    NOTIF_CORPS:true,NOTIF_SIGNATURE:true
  };

  var rows=EUC_IMPORT_lireRecords_(EUC_NOTIF_TABLE_V143_),byKey={};
  rows.forEach(function(r){byKey[String(r.Cle||'')]=r;});

  var posts=[],patches=[],now=new Date().toISOString();

  (items||[]).forEach(function(x){
    var k=String(x.cle||'').trim();
    if(!allowed[k])return;

    var v=String(x.valeur==null?'':x.valeur);

    if(k==='NOTIF_BFE_EMAIL'&&!EUC_NOTIF_emailV143_(v)){
      throw new Error('Adresse BFE invalide.');
    }
    if(k==='NOTIF_AUTO_ENVOI'){
      v=/^(OUI|YES|TRUE|1)$/i.test(v)?'OUI':'NON';
    }

    var fields={
      Cle:k,
      Valeur:v,
      Description:'Notification PFMP — '+k,
      Ordre:k==='NOTIF_BFE_EMAIL'?200:k==='NOTIF_AUTO_ENVOI'?210:k==='NOTIF_OBJET'?220:k==='NOTIF_CORPS'?230:240,
      Actif:true,
      Date_modification:now,
      Auteur:ctx.email||''
    };

    var ex=byKey[k];
    if(ex)patches.push({id:ex.id,fields:fields});
    else posts.push({fields:fields});
  });

  if(posts.length)EUC_ENT_grist('post','/tables/'+EUC_NOTIF_TABLE_V143_+'/records',{records:posts});
  if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_NOTIF_TABLE_V143_+'/records',{records:patches});

  return {ok:true,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length};
}

function EUC_NOTIF_assurerColonnesV143_(){
  var t=EUC_CONVENTION_ACCES_TABLE_;
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[],have={};
  cols.forEach(function(c){have[c.id]=true;});

  var defs=[
    ['Numero_enregistrement','Numéro d’enregistrement','Text'],
    ['Date_enregistrement','Date d’enregistrement','DateTime'],
    ['Statut_administratif','Statut administratif','Text'],
    ['Etat_courriel_confirmation','État courriel confirmation','Text'],
    ['Date_courriel_confirmation','Date courriel confirmation','DateTime'],
    ['Erreur_courriel_confirmation','Erreur courriel confirmation','Text'],
    ['Destinataires_courriel','Destinataires courriel','Text'],
    ['Date_depot_BFE','Date dépôt BFE','DateTime'],
    ['Date_signature_proviseur','Date signature Proviseur','DateTime'],
    ['Date_remise_convention','Date remise convention','DateTime'],
    ['Date_annulation','Date annulation','DateTime'],
    ['Motif_annulation','Motif annulation','Text'],
    ['Date_interruption','Date interruption','DateTime'],
    ['Motif_interruption','Motif interruption','Text']
  ];

  var missing=defs.filter(function(d){return !have[d[0]];}).map(function(d){
    return {id:d[0],fields:{label:d[1],type:d[2]}};
  });

  if(missing.length){
    EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});
  }
  return missing.map(function(x){return x.id;});
}

function EUC_NOTIF_assurerParamsV143_(){
  var rows=EUC_IMPORT_lireRecords_(EUC_NOTIF_TABLE_V143_),have={};
  rows.forEach(function(r){have[String(r.Cle||'')]=true;});
  var p=EUC_NOTIF_defaultsV143_();

  var defs=[
    ['NOTIF_BFE_EMAIL',p.NOTIF_BFE_EMAIL,'Adresse destinataire des notifications PFMP',200],
    ['NOTIF_AUTO_ENVOI',p.NOTIF_AUTO_ENVOI,'Envoi automatique après enregistrement : OUI / NON',210],
    ['NOTIF_OBJET',p.NOTIF_OBJET,'Objet du courriel PFMP',220],
    ['NOTIF_CORPS',p.NOTIF_CORPS,'Corps du courriel PFMP',230],
    ['NOTIF_SIGNATURE',p.NOTIF_SIGNATURE,'Signature du courriel PFMP',240]
  ];

  var posts=defs.filter(function(d){return !have[d[0]];}).map(function(d){
    return {fields:{Cle:d[0],Valeur:d[1],Description:d[2],Ordre:d[3],Actif:true}};
  });

  if(posts.length){
    EUC_ENT_grist('post','/tables/'+EUC_NOTIF_TABLE_V143_+'/records',{records:posts});
  }

  return posts.map(function(x){return x.fields.Cle;});
}

function INSTALLER_DEV143_BLOC_A(){
  var ctx=EUC_PFMP_contexteAdmin_();
  if(!ctx||!ctx.autorise)throw new Error('Accès administrateur requis.');

  return {
    ok:true,
    version:EUC_NOTIF_V143_,
    colonnesCreees:EUC_NOTIF_assurerColonnesV143_(),
    parametresCrees:EUC_NOTIF_assurerParamsV143_(),
    aucunMailEnvoye:true
  };
}

function EUC_NOTIF_dossierV143_(accesId){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var a=rows.filter(function(r){return Number(r.id)===Number(accesId);})[0];
  if(!a)throw new Error('Dossier QR '+accesId+' introuvable.');

  var eleveId=Number(EUC_PFMP_ref_(a.Eleve));
  var classeId=Number(EUC_PFMP_ref_(a.Classe_convention));

  var e=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(x){
    return Number(x.id)===eleveId;
  })[0];

  if(!e)throw new Error('Élève introuvable.');

  var annee=String(a.Annee_scolaire||'');
  var y=(annee.match(/20\d{2}/)||['PFMP'])[0];
  var numero=String(a.Numero_enregistrement||'').trim()||
    ('PFMP-'+y+'-'+String(Number(a.id)).padStart(6,'0'));

  var parents=[];
  try{
    parents=EUC_IMPORT_lireRecords_('EUC_RESPONSABLES_ELEVES_PFMP')
      .filter(function(r){
        return Number(EUC_PFMP_ref_(r.Eleve))===eleveId&&r.Responsable_legal===true;
      })
      .map(function(r){return EUC_NOTIF_emailV143_(r.Email);})
      .filter(Boolean);
  }catch(err){}

  var pp=[],ppNames=[];
  try{
    var links=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');
    var profs=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP'),by={};
    profs.forEach(function(p){by[Number(p.id)]=p;});

    links.filter(function(l){
      return l.Actif!==false &&
        String(l.Role||'')==='PROFESSEUR_PRINCIPAL' &&
        Number(EUC_PFMP_ref_(l.Classe))===classeId;
    }).forEach(function(l){
      var p=by[Number(EUC_PFMP_ref_(l.Professeur))];
      if(!p)return;
      var em=EUC_NOTIF_emailV143_(p.Email);
      if(em)pp.push(em);
      ppNames.push([p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' '));
    });
  }catch(err){}

  return {
    acces:a,
    numero:numero,
    eleve:{
      nom:String(e.Nom||''),
      prenom:String(e.Prenom_usage||e.Prenom||''),
      email:EUC_NOTIF_emailV143_(e.Email_eleve||e.Courriel||e.Email)
    },
    classe:String(a.Classe_convention_nom||''),
    entreprise:String(a.Entreprise_raison_sociale||''),
    dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),
    dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),
    parents:EUC_NOTIF_uniqueV143_(parents),
    pp:EUC_NOTIF_uniqueV143_(pp),
    ppNoms:ppNames.filter(Boolean)
  };
}

function EUC_NOTIF_variablesV143_(d){
  return {
    NUMERO_ENREGISTREMENT:d.numero,
    PRENOM_ELEVE:d.eleve.prenom,
    NOM_ELEVE:d.eleve.nom,
    CLASSE:d.classe,
    ENTREPRISE:d.entreprise,
    DATE_DEBUT:d.dateDebut,
    DATE_FIN:d.dateFin,
    PROF_PRINCIPAL:d.ppNoms.join(' / ')
  };
}

function EUC_NOTIF_renderV143_(template,vars){
  return String(template||'').replace(/\{\{([A-Z0-9_]+)\}\}/g,function(_,k){
    return Object.prototype.hasOwnProperty.call(vars,k)?String(vars[k]||''):'';
  });
}

function EUC_NOTIF_preparerV143_(accesId){
  var d=EUC_NOTIF_dossierV143_(accesId);
  var p=EUC_NOTIF_paramsV143_();
  var vars=EUC_NOTIF_variablesV143_(d);

  var bfe=EUC_NOTIF_emailV143_(p.NOTIF_BFE_EMAIL);
  var to=d.eleve.email?[d.eleve.email]:d.parents.slice();
  var cc=[];

  if(d.eleve.email)cc=cc.concat(d.parents);
  cc=cc.concat(d.pp);
  if(bfe)cc.push(bfe);

  to=EUC_NOTIF_uniqueV143_(to);
  cc=EUC_NOTIF_uniqueV143_(cc).filter(function(x){return to.indexOf(x)<0;});

  if(!to.length){
    to=EUC_NOTIF_uniqueV143_(d.pp.concat(bfe?[bfe]:[]));
    cc=[];
  }

  var body=EUC_NOTIF_renderV143_(p.NOTIF_CORPS,vars);
  var sign=EUC_NOTIF_renderV143_(p.NOTIF_SIGNATURE,vars);
  if(sign)body+='\n\n'+sign;

  return {
    dossier:d,
    params:p,
    to:to,
    cc:cc,
    subject:EUC_NOTIF_renderV143_(p.NOTIF_OBJET,vars),
    body:body,
    auto:/^(OUI|YES|TRUE|1)$/i.test(String(p.NOTIF_AUTO_ENVOI||''))
  };
}

function EUC_CONVENTION_apresEnregistrementV143_(accesId,numero){
  var rows=EUC_CONVENTION_lireAccesFraisV108_();
  var a=rows.filter(function(r){return Number(r.id)===Number(accesId);})[0];
  if(!a)throw new Error('Dossier QR introuvable après enregistrement.');

  var now=new Date().toISOString();
  var stable=String(a.Numero_enregistrement||numero||'').trim();

  if(!stable){
    var an=String(a.Annee_scolaire||'');
    var y=(an.match(/20\d{2}/)||['PFMP'])[0];
    stable='PFMP-'+y+'-'+String(Number(a.id)).padStart(6,'0');
  }

  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{
    records:[{id:a.id,fields:{
      Numero_enregistrement:stable,
      Date_enregistrement:a.Date_enregistrement||now,
      Statut_administratif:a.Statut_administratif||'INFORMATIONS_ENREGISTREES'
    }}]
  });

  if(String(a.Etat_courriel_confirmation||'')==='ENVOYE'&&a.Date_courriel_confirmation){
    return {envoye:false,dejaEnvoye:true,numero:stable};
  }

  var n=EUC_NOTIF_preparerV143_(a.id);

  if(!n.auto){
    return {
      envoye:false,
      simulation:true,
      numero:stable,
      to:n.to,
      cc:n.cc,
      message:'Envoi automatique désactivé dans les paramètres.'
    };
  }

  try{
    MailApp.sendEmail({
      to:n.to.join(','),
      cc:n.cc.join(','),
      subject:n.subject,
      body:n.body,
      name:'Lycée Les Eucalyptus — PFMP'
    });

    EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{
      records:[{id:a.id,fields:{
        Etat_courriel_confirmation:'ENVOYE',
        Date_courriel_confirmation:now,
        Erreur_courriel_confirmation:'',
        Destinataires_courriel:JSON.stringify({to:n.to,cc:n.cc})
      }}]
    });

    return {envoye:true,numero:stable,to:n.to,cc:n.cc};

  }catch(err){
    var detail=String(err&&err.message?err.message:err).slice(0,1000);

    try{
      EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{
        records:[{id:a.id,fields:{
          Etat_courriel_confirmation:'ERREUR',
          Erreur_courriel_confirmation:detail
        }}]
      });
    }catch(ignore){}

    return {envoye:false,numero:stable,erreur:detail,to:n.to,cc:n.cc};
  }
}

function DIAGNOSTIC_DEV143_PFMP_000223(){
  var n=EUC_NOTIF_preparerV143_(223);

  console.log('=== DEV.143 — DIAGNOSTIC ===');
  console.log('Numéro : '+n.dossier.numero);
  console.log('AUTO : '+(n.auto?'OUI':'NON'));
  console.log('TO : '+(n.to.join(', ')||'—'));
  console.log('CC : '+(n.cc.join(', ')||'—'));
  console.log('OBJET : '+n.subject);
  console.log('');
  console.log(n.body);
  console.log('');
  console.log('AUCUN COURRIEL ENVOYÉ PAR CE DIAGNOSTIC.');

  return n;
}
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

old="return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.'};}"

new=(
"var notif={};\\n"
"try{notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);}\\n"
"catch(err143){notif={envoye:false,erreur:String(err143&&err143.message?err143.message:err143)};}\\n"
"return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}"
)

if old in s:
    s=s.replace(old,new,1)
elif "EUC_CONVENTION_apresEnregistrementV143_" not in s:
    raise SystemExit("ERREUR : point d'insertion QRPublic DEV.143 introuvable.")

p.write_text(s,encoding="utf-8")
print("Pont post-enregistrement DEV.143 installé.")
PY

cat > /tmp/dev143_card.html <<'EOF'
<section class="card" id="notif-config-v143">
<h2>Notifications / courriels PFMP</h2>
<p>Ces paramètres pilotent le courriel envoyé après l’enregistrement de l’entreprise. Les variables disponibles sont affichées sous le formulaire.</p>
<div id="notifForm"><div class="status info">Chargement des paramètres de notification…</div></div>
<button id="saveNotif" disabled>Enregistrer les notifications</button>
<div id="notifStatus" class="status"></div>
<div id="notifVars" class="hint"></div>
</section>
EOF

cat > /tmp/dev143_script.html <<'EOF'
<script>
(function(){
 const box=document.getElementById('notifForm');
 const save=document.getElementById('saveNotif');
 const status=document.getElementById('notifStatus');
 const vars=document.getElementById('notifVars');

 function esc(v){
   const d=document.createElement('div');
   d.textContent=v==null?'':v;
   return d.innerHTML;
 }
 function st(t,k){
   status.textContent=t;
   status.className='status '+(k||'');
 }

 google.script.run
  .withSuccessHandler(function(r){
    const items=(r&&r.items)||[];
    box.innerHTML=items.map(function(x){
      const control=x.type==='textarea'
        ? '<textarea data-cle="'+esc(x.cle)+'" rows="'+(x.cle==='NOTIF_CORPS'?12:4)+'">'+esc(x.valeur)+'</textarea>'
        : '<input data-cle="'+esc(x.cle)+'" type="'+(x.type||'text')+'" value="'+esc(x.valeur)+'">';
      return '<div class="row"><label>'+esc(x.label)+'</label>'+control+'</div>';
    }).join('');
    vars.innerHTML='<b>Variables :</b> '+((r.variables||[]).map(esc).join(', '));
    save.disabled=false;
  })
  .withFailureHandler(function(e){
    box.innerHTML='<div class="status err">'+esc(e&&e.message||e)+'</div>';
  })
  .EUC_CONVENTION_notificationConfigLireV143();

 save.onclick=function(){
   const items=[...box.querySelectorAll('[data-cle]')].map(function(el){
     return {cle:el.dataset.cle,valeur:el.value};
   });

   save.disabled=true;
   st('Enregistrement…','info');

   google.script.run
    .withSuccessHandler(function(r){
      save.disabled=false;
      st('✓ Paramètres de notification enregistrés — '+r.total+' valeur(s).','ok');
    })
    .withFailureHandler(function(e){
      save.disabled=false;
      st('Erreur : '+(e&&e.message||e),'err');
    })
    .EUC_CONVENTION_notificationConfigEnregistrerV143(items);
 };
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Parametres_Convention_PFMP.html")
s=p.read_text(encoding="utf-8")
card=Path("/tmp/dev143_card.html").read_text(encoding="utf-8")
js=Path("/tmp/dev143_script.html").read_text(encoding="utf-8")

if 'id="notif-config-v143"' not in s:
    marker='<div class="version">'
    if marker not in s:
        raise SystemExit("ERREUR : emplacement carte paramètres introuvable.")
    s=s.replace(marker,card+marker,1)

if 'EUC_CONVENTION_notificationConfigLireV143' not in s:
    s=s.replace('</body></html>',js+'</body></html>',1)

p.write_text(s,encoding="utf-8")
print("Carte Notifications PFMP ajoutée.")
PY

echo "=== CONTROLES DEV.143 ==="

cp apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs /tmp/EUC_NOTIF_V143.js
cp apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs /tmp/EUC_QR_V143.js

node --check /tmp/EUC_NOTIF_V143.js
node --check /tmp/EUC_QR_V143.js

grep -q "INSTALLER_DEV143_BLOC_A" apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs
grep -q "DIAGNOSTIC_DEV143_PFMP_000223" apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs
grep -q 'id="notif-config-v143"' apps-script/Parametres_Convention_PFMP.html
grep -q "EUC_CONVENTION_apresEnregistrementV143_" apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs

echo "OK : code DEV.143 préparé."

echo "=== PUSH APPS SCRIPT ==="
clasp push -f

echo "============================================================"
echo " DEV.143 PREPAREE ET POUSSEE"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "Aucun déploiement public effectué."
echo "Aucun courriel envoyé par ce script."
echo
echo "ETAPE 1 dans Apps Script : INSTALLER_DEV143_BLOC_A"
echo "ETAPE 2 dans Apps Script : DIAGNOSTIC_DEV143_PFMP_000223"
echo "NOTIF_AUTO_ENVOI vaut NON par défaut."
echo "============================================================"
