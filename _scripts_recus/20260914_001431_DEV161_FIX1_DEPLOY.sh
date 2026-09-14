#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix1"

SERVICE="apps-script/EUC_PFMP_International_StatusV161.gs"
RENDERER="apps-script/EUC_SUIVI_PFMP_V156.gs"
DETAIL_PAGE="apps-script/Suivi_PFMP_Classe_Detail_V156.html"
MAIL_SERVICE="apps-script/EUC_SUIVI_PFMP_EnvoisV157.gs"
QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX1_${STAMP}"
mkdir -p "$BACKUP"
for f in "$SERVICE" "$RENDERER" "$DETAIL_PAGE" "$MAIL_SERVICE" "$QR_PAGE"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX1 — REPRISE ROBUSTE"
echo "============================================================"

# 1) Vérifier que le premier passage a bien créé le service et branché le renderer.
grep -q "function EUC_SUIVI_CLASSE_detailV161" "$SERVICE" || { echo "ERREUR : service V161 incomplet."; exit 1; }
if ! grep -q "EUC_SUIVI_CLASSE_detailV161(" "$RENDERER"; then
  perl -0pi -e 's/EUC_SUIVI_CLASSE_detailV156\(/EUC_SUIVI_CLASSE_detailV161(/' "$RENDERER"
fi
echo "OK 1/5 : service et renderer V161 présents."

# 2) Ajouter l'historique secondaire sous le statut sans dépendre de la mise en forme exacte.
if ! grep -q "function historyNoteV161" "$DETAIL_PAGE"; then
  cat > /tmp/dev161_history_helper.txt <<'EOF'
  function historyNoteV161(x){
    const h=x.historiqueConventions||[];
    if(!h.length)return '';
    return '<div class="small" style="margin-top:5px;color:#b42318;font-weight:700">'+
      h.map(function(v){
        return esc(v.type)+(v.numero?' — '+esc(v.numero):'')+(v.entreprise?' — '+esc(v.entreprise):'');
      }).join('<br>')+
    '</div>';
  }

EOF
  awk '
    BEGIN{done=0}
    !done && /function statusPill/ {
      while ((getline line < "/tmp/dev161_history_helper.txt") > 0) print line;
      close("/tmp/dev161_history_helper.txt");
      done=1
    }
    {print}
    END{if(!done) exit 42}
  ' "$DETAIL_PAGE" > /tmp/dev161_detail.tmp || { echo "ERREUR : fonction statusPill introuvable."; exit 1; }
  mv /tmp/dev161_detail.tmp "$DETAIL_PAGE"
fi

if ! grep -q "statusPill(x)+historyNoteV161(x)" "$DETAIL_PAGE"; then
  perl -0pi -e 's/(tbody\.innerHTML[\s\S]*?)statusPill\(x\)/$1statusPill(x)+historyNoteV161(x)/' "$DETAIL_PAGE"
fi

grep -q "statusPill(x)+historyNoteV161(x)" "$DETAIL_PAGE" || { echo "ERREUR : ajout de la mention historique impossible."; exit 1; }
echo "OK 2/5 : historique secondaire visible sous le statut actuel."

# 3) Email : travailler sur le détail V161 et ajouter le bloc historique sous le tableau.
perl -0pi -e 's/EUC_SUIVI_CLASSE_detailV156\(payload\.annee,payload\.classeId,payload\.periodeId\)/EUC_SUIVI_CLASSE_detailV161(payload.annee,payload.classeId,payload.periodeId)/g' "$MAIL_SERVICE"
if ! grep -q "EUC_V161_historiqueHtml_(detail)" "$MAIL_SERVICE"; then
  perl -0pi -e 's/EUC_V157_htmlTable_\(detail\)/EUC_V157_htmlTable_(detail)+EUC_V161_historiqueHtml_(detail)/' "$MAIL_SERVICE"
fi
grep -q "EUC_V161_historiqueHtml_(detail)" "$MAIL_SERVICE" || { echo "ERREUR : historique email non ajouté."; exit 1; }
echo "OK 3/5 : email = situation actuelle + historique séparé."

# 4) Convention papier : libellé commun France / Monaco.
for f in apps-script/Convention_PFMP_*.html; do
  [ -f "$f" ] || continue
  sed -i \
    -e 's/N° de SIRET/SIRET \/ NIS (Monaco)/g' \
    -e 's/N° SIRET/SIRET \/ NIS (Monaco)/g' \
    -e 's/Numéro SIRET/SIRET \/ NIS (Monaco)/g' "$f"
done
if ! grep -q "SIRET / NIS (Monaco)" apps-script/Convention_PFMP_*.html; then
  echo "ERREUR : aucun libellé SIRET/NIS trouvé dans les modèles de convention."
  exit 1
fi
echo "OK 4/5 : convention papier = SIRET / NIS (Monaco)."

# 5) QR : ajout léger du choix France / Monaco et recherche NIS dans notre référentiel.
if ! grep -q "EUC_V161_MONACO_UI" "$QR_PAGE"; then
  cat > /tmp/dev161_monaco_snippet.html <<'EOF'
<style id="EUC_V161_MONACO_UI">
  .euc-v161-country{margin:10px 0;padding:10px;border:1px solid #d9e1ec;border-radius:10px;background:#f8fafc}
  .euc-v161-country select{width:100%;box-sizing:border-box;margin-top:6px;padding:9px;border:1px solid #b9c7d8;border-radius:8px;background:#fff}
  .euc-v161-msg{margin-top:8px;font-size:13px;font-weight:700}
</style>
<script id="EUC_V161_MONACO_UI_SCRIPT">
(function(){
  function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function findIdentifier(){
    return Array.from(document.querySelectorAll('input')).find(function(inp){
      var all=norm((inp.placeholder||'')+' '+(inp.name||'')+' '+(inp.id||''));
      return all.indexOf('siret')>=0;
    })||null;
  }
  function setField(words,value){
    if(!value)return;
    var labels=Array.from(document.querySelectorAll('label'));
    for(var i=0;i<labels.length;i++){
      var t=norm(labels[i].textContent);
      if(!words.some(function(w){return t.indexOf(norm(w))>=0;}))continue;
      var input=labels[i].htmlFor?document.getElementById(labels[i].htmlFor):null;
      if(!input)input=labels[i].querySelector('input,textarea');
      if(!input&&labels[i].parentElement)input=labels[i].parentElement.querySelector('input,textarea');
      if(input&&!input.value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
      return;
    }
  }
  function init(){
    var identifier=findIdentifier();
    if(!identifier)return;
    var box=document.createElement('div');
    box.className='euc-v161-country';
    box.innerHTML='<b>Pays de l’entreprise</b><select id="eucV161Country"><option value="FR">France</option><option value="MC">Monaco</option></select><div id="eucV161Msg" class="euc-v161-msg"></div>';
    identifier.parentElement.insertBefore(box,identifier);
    var country=box.querySelector('#eucV161Country');
    var msg=box.querySelector('#eucV161Msg');
    country.onchange=function(){
      if(country.value==='MC'){
        identifier.placeholder='Saisir le NIS (Monaco)';
        msg.textContent='Le NIS sera recherché dans le référentiel Monaco.';
        msg.style.color='#164e7a';
      }else{
        identifier.placeholder='Saisir le SIRET';
        msg.textContent='';
      }
    };
    identifier.addEventListener('blur',function(){
      if(country.value!=='MC')return;
      var nis=identifier.value.trim();
      if(!nis)return;
      msg.textContent='Recherche dans le référentiel Monaco...';
      msg.style.color='#164e7a';
      google.script.run
        .withSuccessHandler(function(r){
          if(r&&r.found){
            msg.textContent='Entreprise trouvée : '+(r.nom||'');
            msg.style.color='#067647';
            setField(['nom entreprise','raison sociale'],r.nom);
            setField(['adresse entreprise'],r.adresse);
            setField(['code postal'],r.cp);
            setField(['ville'],r.ville||'Monaco');
            setField(['email entreprise','adresse e-mail de l’entreprise'],r.email);
            setField(['telephone entreprise','téléphone entreprise'],r.telephone);
          }else{
            msg.textContent='Entreprise Monaco inconnue : complétez les coordonnées. Elle devra être validée administrativement.';
            msg.style.color='#b45309';
          }
        })
        .withFailureHandler(function(e){
          msg.textContent='Recherche impossible : '+(e&&e.message||e);
          msg.style.color='#b42318';
        })
        .EUC_V161_rechercherEntrepriseMonaco(nis);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>
EOF
  awk '
    /<\/body>/ && !done {
      while ((getline line < "/tmp/dev161_monaco_snippet.html") > 0) print line;
      close("/tmp/dev161_monaco_snippet.html");
      done=1
    }
    {print}
    END{if(!done) exit 42}
  ' "$QR_PAGE" > /tmp/dev161_qr.tmp || { echo "ERREUR : </body> introuvable dans QR V116."; exit 1; }
  mv /tmp/dev161_qr.tmp "$QR_PAGE"
fi

grep -q "EUC_V161_MONACO_UI" "$QR_PAGE" || { echo "ERREUR : surcouche Monaco absente."; exit 1; }
echo "OK 5/5 : QR France / Monaco ajouté."

echo
echo "============================================================"
echo " DEV.161 FIX1 — CONTROLES AVANT PUSH"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_PFMP_International_StatusV161_FIX1.js
cp "$RENDERER" /tmp/EUC_SUIVI_PFMP_V156_DEV161_FIX1.js
cp "$MAIL_SERVICE" /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161_FIX1.js
node --check /tmp/EUC_PFMP_International_StatusV161_FIX1.js
node --check /tmp/EUC_SUIVI_PFMP_V156_DEV161_FIX1.js
node --check /tmp/EUC_SUIVI_PFMP_EnvoisV157_DEV161_FIX1.js

grep -q "EUC_SUIVI_CLASSE_detailV161" "$RENDERER"
grep -q "historyNoteV161" "$DETAIL_PAGE"
grep -q "EUC_V161_historiqueHtml_" "$MAIL_SERVICE"
grep -q "EUC_V161_MONACO_UI" "$QR_PAGE"

echo "✓ syntaxe serveur valide"
echo "✓ état actuel + historique secondaire"
echo "✓ email avec historique séparé"
echo "✓ papier SIRET / NIS (Monaco)"
echo "✓ QR France / Monaco"

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
echo " DEV.161 FIX1 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ élève avec convention annulée => Sans convention"
echo "✓ ancienne convention visible en historique secondaire"
echo "✓ même logique dans l'email"
echo "✓ convention papier SIRET / NIS (Monaco)"
echo "✓ recherche NIS Monaco dans le référentiel interne"
echo "✓ push + version + déploiement principal"
echo "============================================================"
