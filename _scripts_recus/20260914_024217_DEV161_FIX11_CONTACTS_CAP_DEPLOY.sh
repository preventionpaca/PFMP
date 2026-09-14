#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix11-contacts-cap"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
QR_SERVICE="apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs"
DONNEES="apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX11_${STAMP}"
mkdir -p "$BACKUP"

for f in "$QR_PAGE" "$QR_SERVICE" "$DONNEES"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX11 — CONTACTS OBLIGATOIRES + DIPLOME CAP"
echo "============================================================"

# ============================================================
# 1) FRONTEND : rendre obligatoires nom/prénom/téléphone/mail
#    responsable + tuteur et afficher * sur les labels.
# ============================================================

cat > /tmp/EUC_REQUIRED_CONTACTS_FIX11.html <<'EOF'
<script id="EUC_REQUIRED_CONTACTS_FIX11">
(function(){
  'use strict';

  var REQUIRED=[
    'responsableNom',
    'responsablePrenom',
    'responsableTelephone',
    'responsableCourriel',
    'tuteurNom',
    'tuteurPrenom',
    'tuteurTelephone',
    'tuteurCourriel'
  ];

  function fieldByName(name){
    return document.querySelector('[name="'+name+'"]') ||
           document.getElementById(name) ||
           (typeof field==='function' ? field(name) : null);
  }

  function markRequired(el){
    if(!el)return;
    el.required=true;
    el.setAttribute('aria-required','true');

    if(/Courriel$/i.test(el.name||el.id||'')){
      el.setAttribute('type','email');
      el.setAttribute('autocomplete','email');
    }

    if(/Telephone$/i.test(el.name||el.id||'')){
      el.setAttribute('inputmode','tel');
      el.setAttribute('autocomplete','tel');
    }

    var label=el.closest('label');
    if(label && !label.querySelector('.euc-required-star')){
      var star=document.createElement('span');
      star.className='euc-required-star';
      star.textContent=' *';
      star.setAttribute('aria-hidden','true');

      // Ajout à la première ligne du label, avant l'input.
      var firstText=null;
      for(var i=0;i<label.childNodes.length;i++){
        if(label.childNodes[i].nodeType===3 && label.childNodes[i].textContent.trim()){
          firstText=label.childNodes[i];
          break;
        }
      }
      if(firstText) firstText.after(star);
      else label.insertBefore(star,label.firstChild);
    }
  }

  function txt(name){
    var el=fieldByName(name);
    return el ? String(el.value||'').trim() : '';
  }

  function message(text){
    if(typeof msg==='function'){
      try{msg(text,true);return;}catch(e){}
    }
    var status=document.getElementById('status');
    if(status){
      status.textContent=text;
      status.className='status error';
    }
  }

  function validateContacts(){
    var missing=[];

    [
      ['responsableNom','nom du responsable'],
      ['responsablePrenom','prénom du responsable'],
      ['responsableTelephone','téléphone du responsable'],
      ['responsableCourriel','e-mail du responsable']
    ].forEach(function(x){
      if(!txt(x[0]))missing.push(x[1]);
    });

    var same=fieldByName('tuteurEstResponsable');
    var sameChecked=!!(same && same.checked);

    if(!sameChecked){
      [
        ['tuteurNom','nom du tuteur'],
        ['tuteurPrenom','prénom du tuteur'],
        ['tuteurTelephone','téléphone du tuteur'],
        ['tuteurCourriel','e-mail du tuteur']
      ].forEach(function(x){
        if(!txt(x[0]))missing.push(x[1]);
      });
    }

    if(missing.length){
      message('Champs obligatoires manquants : '+missing.join(', ')+'.');
      var firstName=missing[0];
      var order=[
        'responsableNom','responsablePrenom','responsableTelephone','responsableCourriel',
        'tuteurNom','tuteurPrenom','tuteurTelephone','tuteurCourriel'
      ];
      for(var i=0;i<order.length;i++){
        var el=fieldByName(order[i]);
        if(el && !String(el.value||'').trim() && !(sameChecked && order[i].indexOf('tuteur')===0)){
          el.focus();
          break;
        }
      }
      return false;
    }

    return true;
  }

  function boot(){
    REQUIRED.forEach(function(name){
      markRequired(fieldByName(name));
    });

    var save=document.getElementById('save');
    if(save){
      save.addEventListener('click',function(ev){
        if(!validateContacts()){
          ev.preventDefault();
          ev.stopImmediatePropagation();
        }
      },true);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
</script>
<style id="EUC_REQUIRED_CONTACTS_FIX11_STYLE">
.euc-required-star{
  color:#b42318;
  font-weight:800;
}
</style>
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")
block=Path("/tmp/EUC_REQUIRED_CONTACTS_FIX11.html").read_text(encoding="utf-8")

s=re.sub(
    r'\n?<script id="EUC_REQUIRED_CONTACTS_FIX11">.*?</script>\s*'
    r'<style id="EUC_REQUIRED_CONTACTS_FIX11_STYLE">.*?</style>\n?',
    '\n',
    s,
    flags=re.S
)

if "</body>" not in s:
    raise SystemExit("ERREUR : </body> introuvable dans PFMP_Acces_QR_V116.html.")

s=s.replace("</body>",block+"\n</body>",1)
p.write_text(s,encoding="utf-8")
print("OK 1/3 : champs contacts obligatoires + astérisques.")
PY

# ============================================================
# 2) BACKEND : validation serveur stricte des 4 champs.
# ============================================================

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs")
s=p.read_text(encoding="utf-8")

a=s.find("function EUC_CONVENTION_enregistrerEntrepriseV117(")
if a<0:
    raise SystemExit("ERREUR : fonction EUC_CONVENTION_enregistrerEntrepriseV117 introuvable.")
b=s.find("\nfunction ",a+10)
if b<0:b=len(s)
blk=s[a:b]

old="""  var respNom=txt(d.responsableNom,150);
  var tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';"""

new="""  var respNom=txt(d.responsableNom,150);
  var respPrenom=txt(d.responsablePrenom,150);
  var respTelephone=txt(d.responsableTelephone,50);
  var respCourriel=txt(d.responsableCourriel,250);
  var tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';"""

if old not in blk and "var respPrenom=" not in blk:
    raise SystemExit("ERREUR : déclaration responsable attendue introuvable.")
if old in blk:
    blk=blk.replace(old,new,1)

old2="""  if(!raison||!adresse||!commune||!respNom){
    throw new Error('Raison sociale, adresse, commune et nom du responsable sont obligatoires.');
  }

  var tNom=tuteurEst?respNom:txt(d.tuteurNom,150);
  if(!tNom)throw new Error('Le nom du tuteur est obligatoire.');"""

new2="""  if(!raison||!adresse||!commune){
    throw new Error('Raison sociale, adresse et commune sont obligatoires.');
  }

  if(!respNom||!respPrenom||!respTelephone||!respCourriel){
    throw new Error('Nom, prénom, téléphone et e-mail du responsable de l’entreprise sont obligatoires.');
  }

  var tNom=tuteurEst?respNom:txt(d.tuteurNom,150);
  var tPrenom=tuteurEst?respPrenom:txt(d.tuteurPrenom,150);
  var tTelephone=tuteurEst?respTelephone:txt(d.tuteurTelephone,50);
  var tCourriel=tuteurEst?respCourriel:txt(d.tuteurCourriel,250);

  if(!tNom||!tPrenom||!tTelephone||!tCourriel){
    throw new Error('Nom, prénom, téléphone et e-mail du tuteur sont obligatoires.');
  }"""

if old2 not in blk and "var tPrenom=" not in blk:
    raise SystemExit("ERREUR : bloc validation responsable/tuteur attendu introuvable.")
if old2 in blk:
    blk=blk.replace(old2,new2,1)

# Réutiliser les variables déjà validées dans les champs enregistrés.
blk=blk.replace("Responsable_prenom:txt(d.responsablePrenom,150),","Responsable_prenom:respPrenom,",1)
blk=blk.replace("Responsable_telephone:txt(d.responsableTelephone,50),","Responsable_telephone:respTelephone,",1)
blk=blk.replace("Responsable_courriel:txt(d.responsableCourriel,250),","Responsable_courriel:respCourriel,",1)
blk=blk.replace("Tuteur_prenom:tuteurEst?txt(d.responsablePrenom,150):txt(d.tuteurPrenom,150),","Tuteur_prenom:tPrenom,",1)
blk=blk.replace("Tuteur_telephone:tuteurEst?txt(d.responsableTelephone,50):txt(d.tuteurTelephone,50),","Tuteur_telephone:tTelephone,",1)
blk=blk.replace("Tuteur_courriel:tuteurEst?txt(d.responsableCourriel,250):txt(d.tuteurCourriel,250),","Tuteur_courriel:tCourriel,",1)

s=s[:a]+blk+s[b:]
p.write_text(s,encoding="utf-8")
print("OK 2/3 : validation serveur stricte responsable/tuteur.")
PY

# ============================================================
# 3) DIPLOME : la table explicite "Diplômes par classe" est
#    l'autorité d'impression ; référentiel général seulement fallback.
# ============================================================

cat > /tmp/EUC_DIPLOME_V94_FIX11.txt <<'EOF'
function EUC_CONVENTION_diplomeV94_(classeId,e){
  /*
   * Autorité d'impression :
   * EUC_CLASSES_DIPLOMES_PFMP.Intitule_diplome
   * Cette table est précisément administrée via "Diplômes par classe".
   */
  try{
    var rows=EUC_CONVENTION_recordsV94_('EUC_CLASSES_DIPLOMES_PFMP').filter(function(r){
      return r.Actif!==false &&
        String(EUC_CONVENTION_refIdV80_(r.Classe))===String(classeId);
    });

    if(rows.length){
      var exact=EUC_CONVENTION_txtV80_(rows[0].Intitule_diplome);
      if(exact)return exact;
    }
  }catch(errExact){
    console.log('DIPLOME_EXACT_FALLBACK '+String(errExact&&errExact.message||errExact));
  }

  /*
   * Fallback : offre de formation -> diplôme canonique.
   */
  try{
    var offres=EUC_CONVENTION_recordsV94_('EUC_OFFRES_FORMATION').filter(function(r){
      return r.Actif!==false &&
        String(EUC_CONVENTION_refIdV80_(r.Classe))===String(classeId);
    });

    if(offres.length){
      var diplomes=EUC_CONVENTION_recordsV94_('EUC_DIPLOMES');
      var byId={};
      diplomes.forEach(function(d){byId[String(d.id)]=d;});

      for(var i=0;i<offres.length;i++){
        var did=EUC_CONVENTION_refIdV80_(offres[i].Diplome);
        var d=byId[String(did)];
        if(!d)continue;

        var txt=EUC_CONVENTION_txtV80_(
          d.Libelle||
          d.Libelle_affichage||
          d.Intitule||
          d.Nom||
          d.Code
        );

        if(txt)return txt;
      }
    }
  }catch(errCanonique){}

  return EUC_CONVENTION_txtV80_(e.Formation_Pronote||e.Formation||'');
}
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs")
s=p.read_text(encoding="utf-8")
new_fn=Path("/tmp/EUC_DIPLOME_V94_FIX11.txt").read_text(encoding="utf-8").strip()

s,n=re.subn(
    r'function EUC_CONVENTION_diplomeV94_\(classeId,e\)\{.*?\}(?=\nfunction )',
    lambda m:new_fn,
    s,
    count=1,
    flags=re.S
)

if n!=1:
    raise SystemExit("ERREUR : fonction EUC_CONVENTION_diplomeV94_ introuvable.")

p.write_text(s,encoding="utf-8")
print("OK 3/3 : correspondance explicite classe -> diplôme remise prioritaire.")
PY

echo
echo "============================================================"
echo " CONTROLES AVANT PUSH"
echo "============================================================"

# Frontend contacts
grep -q 'id="EUC_REQUIRED_CONTACTS_FIX11"' "$QR_PAGE"
for n in responsableNom responsablePrenom responsableTelephone responsableCourriel tuteurNom tuteurPrenom tuteurTelephone tuteurCourriel; do
  grep -q "$n" "$QR_PAGE"
done

# Backend
grep -q "respPrenom" "$QR_SERVICE"
grep -q "respTelephone" "$QR_SERVICE"
grep -q "respCourriel" "$QR_SERVICE"
grep -q "tPrenom" "$QR_SERVICE"
grep -q "tTelephone" "$QR_SERVICE"
grep -q "tCourriel" "$QR_SERVICE"
grep -q "Nom, prénom, téléphone et e-mail du responsable" "$QR_SERVICE"
grep -q "Nom, prénom, téléphone et e-mail du tuteur" "$QR_SERVICE"

# Diplôme
python3 <<'PY'
from pathlib import Path
s=Path("apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs").read_text(encoding="utf-8")
a=s.find("function EUC_CONVENTION_diplomeV94_(")
b=s.find("\nfunction ",a+10)
blk=s[a:b if b>=0 else len(s)]
p1=blk.find("EUC_CLASSES_DIPLOMES_PFMP")
p2=blk.find("EUC_OFFRES_FORMATION")
if p1<0 or p2<0 or p1>p2:
    raise SystemExit("ERREUR : priorité diplôme incorrecte.")
print("✓ EUC_CLASSES_DIPLOMES_PFMP prioritaire")
PY

# Syntaxes
cp "$QR_SERVICE" /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX11.js
cp "$DONNEES" /tmp/EUC_CONVENTION_PFMP_DonneesV80_FIX11.js
node --check /tmp/EUC_CONVENTION_PFMP_QRPublicV85_FIX11.js
node --check /tmp/EUC_CONVENTION_PFMP_DonneesV80_FIX11.js

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_REQUIRED_CONTACTS_FIX11">(.*?)</script>',s,re.S)
if not m: raise SystemExit("ERREUR : JS contacts FIX11 introuvable.")
Path("/tmp/EUC_REQUIRED_CONTACTS_FIX11.js").write_text(m.group(1),encoding="utf-8")
PY
node --check /tmp/EUC_REQUIRED_CONTACTS_FIX11.js

echo "✓ frontend contacts valide"
echo "✓ validation serveur valide"
echo "✓ diplôme exact par classe prioritaire"
echo "✓ syntaxe complète valide"

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
echo " DEV.161 FIX11 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Tests :"
echo "1. Responsable : nom/prénom/téléphone/e-mail tous obligatoires."
echo "2. Tuteur distinct : idem."
echo "3. Tuteur = responsable : données responsable réutilisées."
echo "4. Générer un CAP : l'intitulé vient de Diplômes par classe."
echo "============================================================"
