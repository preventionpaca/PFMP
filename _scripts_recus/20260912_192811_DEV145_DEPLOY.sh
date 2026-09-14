#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.145"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_avant_DEV145_${STAMP}"
mkdir -p "$BACKUP"

SERVICE="apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs"
HTML="apps-script/Admin_PFMP.html"

for f in "$SERVICE" "$HTML"; do
  if [ ! -f "$f" ]; then
    echo "ERREUR : fichier introuvable : $f"
    exit 1
  fi
  cp "$f" "$BACKUP/"
done

cat >> "$SERVICE" <<'EOF'

function EUC_ADMIN_WORKFLOW_listerDossiersV145(){
  EUC_ADMIN_WORKFLOW_ctxV144_();
  var rows=EUC_CONVENTION_lireAccesFraisV108_();

  return rows
    .filter(function(a){
      return !!(
        a.Date_saisie_entreprise ||
        a.Numero_enregistrement ||
        a.Entreprise_raison_sociale ||
        a.Statut==='ENTREPRISE_SAISIE'
      );
    })
    .map(function(a){
      return {
        id:Number(a.id),
        numero:EUC_ADMIN_WORKFLOW_numeroV144_(a),
        statut:String(a.Statut_administratif||'INFORMATIONS_ENREGISTREES'),
        eleve:String(a.Eleve_nom||a.Nom_eleve||''),
        classe:String(a.Classe_convention_nom||''),
        entreprise:String(a.Entreprise_raison_sociale||''),
        dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),
        dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),
        dateEnregistrement:EUC_ADMIN_WORKFLOW_dateLisibleV144_(
          EUC_ADMIN_WORKFLOW_dateEnregistrementV144_(a)
        )
      };
    })
    .sort(function(a,b){
      return String(b.numero||'').localeCompare(String(a.numero||''),'fr');
    });
}

function EUC_ADMIN_WORKFLOW_validerEtapeV145(accesId,code,commentaire){
  return EUC_ADMIN_WORKFLOW_validerEtapeV144(
    accesId,
    code,
    {commentaire:String(commentaire||'')}
  );
}

function EUC_ADMIN_WORKFLOW_annulerV145(accesId,motif){
  return EUC_ADMIN_WORKFLOW_annulerV144(accesId,motif);
}

function EUC_ADMIN_WORKFLOW_interrompreV145(accesId,dateFinReelle,motif){
  return EUC_ADMIN_WORKFLOW_interrompreV144(accesId,dateFinReelle,motif);
}
EOF

cat > /tmp/dev145_card.html <<'EOF'
<section class="card" id="workflow-admin-v145">
  <h2>Suivi administratif des conventions</h2>
  <p class="hint">Sélectionnez un dossier pour suivre les étapes de finalisation de la convention.</p>

  <div class="row">
    <label for="wf145Select">Dossier</label>
    <select id="wf145Select">
      <option value="">Chargement...</option>
    </select>
  </div>

  <div id="wf145Header" class="status info">Sélectionnez un dossier.</div>
  <div id="wf145Steps"></div>
  <div id="wf145History" class="hint"></div>

  <div style="margin-top:18px;padding-top:14px;border-top:1px solid #ddd">
    <h3>Actions exceptionnelles</h3>

    <div class="row">
      <label for="wf145CancelReason">Annulation avant démarrage</label>
      <textarea id="wf145CancelReason" rows="3" placeholder="Motif obligatoire"></textarea>
      <button id="wf145CancelBtn" type="button">Annuler avant démarrage</button>
    </div>

    <div class="row">
      <label for="wf145StopDate">Interruption en cours de PFMP</label>
      <input id="wf145StopDate" type="date">
      <textarea id="wf145StopReason" rows="3" placeholder="Motif obligatoire"></textarea>
      <button id="wf145StopBtn" type="button">Enregistrer l'interruption</button>
    </div>
  </div>

  <div id="wf145Status" class="status"></div>
</section>
EOF

cat > /tmp/dev145_script.html <<'EOF'
<script>
(function(){
  const sel=document.getElementById('wf145Select');
  const head=document.getElementById('wf145Header');
  const steps=document.getElementById('wf145Steps');
  const hist=document.getElementById('wf145History');
  const status=document.getElementById('wf145Status');
  const cancelReason=document.getElementById('wf145CancelReason');
  const cancelBtn=document.getElementById('wf145CancelBtn');
  const stopDate=document.getElementById('wf145StopDate');
  const stopReason=document.getElementById('wf145StopReason');
  const stopBtn=document.getElementById('wf145StopBtn');

  if(!sel)return;
  let currentId=null;

  function esc(v){
    const d=document.createElement('div');
    d.textContent=v==null?'':v;
    return d.innerHTML;
  }

  function setStatus(t,k){
    status.textContent=t||'';
    status.className='status '+(k||'');
  }

  function dossierLabel(d){
    return [d.numero,d.eleve,d.classe,d.entreprise].filter(Boolean).join(' — ');
  }

  function loadList(){
    google.script.run
      .withSuccessHandler(function(rows){
        rows=rows||[];
        sel.innerHTML='<option value="">— Choisir un dossier —</option>'+
          rows.map(function(d){
            return '<option value="'+esc(d.id)+'">'+esc(dossierLabel(d))+'</option>';
          }).join('');
      })
      .withFailureHandler(function(e){
        sel.innerHTML='<option value="">Erreur de chargement</option>';
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_listerDossiersV145();
  }

  function render(v){
    if(!v){
      head.textContent='Dossier introuvable.';
      steps.innerHTML='';
      hist.innerHTML='';
      return;
    }

    head.className='status info';
    head.innerHTML =
      '<b>'+esc(v.numero||('Dossier '+v.id))+'</b>'+
      (v.entreprise?' — '+esc(v.entreprise):'')+
      '<br>Statut : <b>'+esc(v.statut||'')+'</b>';

    steps.innerHTML=(v.etapes||[]).map(function(e){
      const done=!!e.validee;
      return '<div class="linecard" style="margin-bottom:10px">'+
        '<div class="linehead">'+(done?'✓ ':'○ ')+esc(e.label)+'</div>'+
        '<div class="hint">'+
        (done
          ? ('Validée'+(e.date?' le '+esc(e.date):'')+(e.auteur?' par '+esc(e.auteur):''))
          : 'À valider')+
        '</div>'+
        (!done
          ? '<div style="margin-top:8px">'+
              '<input data-comment="'+esc(e.code)+'" placeholder="Commentaire facultatif">'+
              '<button type="button" data-step="'+esc(e.code)+'">Valider cette étape</button>'+
            '</div>'
          : '')+
      '</div>';
    }).join('');

    Array.from(steps.querySelectorAll('[data-step]')).forEach(function(btn){
      btn.onclick=function(){
        const code=btn.dataset.step;
        const input=steps.querySelector('[data-comment="'+code+'"]');
        const commentaire=input?input.value:'';

        btn.disabled=true;
        setStatus('Validation en cours...','info');

        google.script.run
          .withSuccessHandler(function(r){
            setStatus('✓ Étape validée.','ok');
            render(r);
          })
          .withFailureHandler(function(e){
            btn.disabled=false;
            setStatus('Erreur : '+(e&&e.message||e),'err');
          })
          .EUC_ADMIN_WORKFLOW_validerEtapeV145(currentId,code,commentaire);
      };
    });

    const h=v.historique||[];
    hist.innerHTML=h.length
      ? '<b>Historique administratif :</b><br>'+
        h.slice().reverse().map(function(x){
          return esc(
            (x.date||'')+' — '+
            (x.libelle||x.action||x.statut||'Action')+
            (x.auteur?' — '+x.auteur:'')+
            (x.motif?' — '+x.motif:'')+
            (x.commentaire?' — '+x.commentaire:'')
          );
        }).join('<br>')
      : 'Aucun historique administratif complémentaire.';
  }

  function loadOne(id){
    currentId=Number(id)||null;
    if(!currentId){
      head.textContent='Sélectionnez un dossier.';
      steps.innerHTML='';
      hist.innerHTML='';
      return;
    }

    head.textContent='Chargement...';
    setStatus('','');

    google.script.run
      .withSuccessHandler(render)
      .withFailureHandler(function(e){
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_vueV144(currentId);
  }

  sel.onchange=function(){loadOne(sel.value);};

  cancelBtn.onclick=function(){
    if(!currentId){
      setStatus('Sélectionnez un dossier.','err');
      return;
    }

    const motif=cancelReason.value.trim();
    if(!motif){
      setStatus("Motif d'annulation obligatoire.",'err');
      return;
    }

    if(!confirm("Confirmer l'annulation avant démarrage de cette PFMP ?"))return;

    cancelBtn.disabled=true;
    setStatus('Annulation en cours...','info');

    google.script.run
      .withSuccessHandler(function(r){
        cancelBtn.disabled=false;
        cancelReason.value='';
        setStatus('✓ PFMP annulée avant démarrage.','ok');
        render(r);
      })
      .withFailureHandler(function(e){
        cancelBtn.disabled=false;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_annulerV145(currentId,motif);
  };

  stopBtn.onclick=function(){
    if(!currentId){
      setStatus('Sélectionnez un dossier.','err');
      return;
    }

    const dateFin=stopDate.value;
    const motif=stopReason.value.trim();

    if(!dateFin){
      setStatus('Date de fin réelle obligatoire.','err');
      return;
    }
    if(!motif){
      setStatus("Motif d'interruption obligatoire.",'err');
      return;
    }

    if(!confirm("Confirmer l'interruption de cette PFMP ?"))return;

    stopBtn.disabled=true;
    setStatus("Enregistrement de l'interruption...",'info');

    google.script.run
      .withSuccessHandler(function(r){
        stopBtn.disabled=false;
        stopDate.value='';
        stopReason.value='';
        setStatus('✓ Interruption enregistrée.','ok');
        render(r);
      })
      .withFailureHandler(function(e){
        stopBtn.disabled=false;
        setStatus('Erreur : '+(e&&e.message||e),'err');
      })
      .EUC_ADMIN_WORKFLOW_interrompreV145(currentId,dateFin,motif);
  };

  loadList();
})();
</script>
EOF

python3 <<'PY'
from pathlib import Path

p=Path("apps-script/Admin_PFMP.html")
s=p.read_text(encoding="utf-8")
card=Path("/tmp/dev145_card.html").read_text(encoding="utf-8")
js=Path("/tmp/dev145_script.html").read_text(encoding="utf-8")

if 'id="workflow-admin-v145"' not in s:
    marker='</main>'
    if marker not in s:
        raise SystemExit("ERREUR : </main> introuvable.")
    s=s.replace(marker,card+marker,1)

if 'EUC_ADMIN_WORKFLOW_listerDossiersV145' not in s:
    s=s.replace('</body></html>',js+'</body></html>',1)

p.write_text(s,encoding="utf-8")
print("Interface DEV.145 ajoutée.")
PY

echo "============================================================"
echo " DEV.145 — CONTROLES"
echo "============================================================"

cp "$SERVICE" /tmp/EUC_ADMIN_WORKFLOW_V145.js
node --check /tmp/EUC_ADMIN_WORKFLOW_V145.js

grep -q "EUC_ADMIN_WORKFLOW_listerDossiersV145" "$SERVICE"
grep -q 'id="workflow-admin-v145"' "$HTML"
grep -q "EUC_ADMIN_WORKFLOW_validerEtapeV145" "$HTML"
grep -q "EUC_ADMIN_WORKFLOW_annulerV145" "$HTML"
grep -q "EUC_ADMIN_WORKFLOW_interrompreV145" "$HTML"

echo "OK : syntaxe serveur valide."
echo "OK : interface workflow présente."

echo
echo "=== PUSH ==="
clasp push -f

echo
echo "=== VERSION ==="
clasp version "$LABEL"

echo
echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy   -i "$DEPLOYMENT_ID"   -d "$LABEL"

echo
echo "=== CONTROLE DEPLOIEMENTS ==="
clasp deployments

echo
echo "============================================================"
echo " DEV.145 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Sauvegarde : $BACKUP"
echo "✓ liste des dossiers"
echo "✓ étapes administratives cliquables"
echo "✓ date + auteur"
echo "✓ historique"
echo "✓ annulation avant démarrage"
echo "✓ interruption avec date réelle + motif"
echo "✓ push + version + déploiement principal effectués"
echo "✓ aucun courriel envoyé automatiquement"
echo
echo "Recharge la page Admin PFMP avec Ctrl+Shift+R."
echo "============================================================"
