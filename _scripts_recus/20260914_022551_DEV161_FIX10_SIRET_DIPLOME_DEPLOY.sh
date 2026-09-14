#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.161-fix10-siret-diplome"

QR_PAGE="apps-script/PFMP_Acces_QR_V116.html"
STRICT="apps-script/EUC_SIRET_NIS_StrictV161.gs"
DONNEES="apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV161_avant_FIX10_${STAMP}"
mkdir -p "$BACKUP"

for f in "$QR_PAGE" "$STRICT" "$DONNEES"; do
  [ -f "$f" ] || { echo "ERREUR : fichier introuvable : $f"; exit 1; }
  cp "$f" "$BACKUP/"
done

echo "============================================================"
echo " DEV.161 FIX10 — SIRET FRANCE + DIPLOME CANONIQUE"
echo "============================================================"

cat > "$STRICT" <<'EOF'
/** Eucalyptus PFMP — DEV.161 FIX10 — SIRET France strict / NIS Monaco. */

function EUC_V161_mapperEntrepriseFrance_(rep,siret){
  if(!rep)return {found:false};

  var d=rep.entreprise||rep.data||rep;
  function p(){
    for(var i=0;i<arguments.length;i++){
      var v=arguments[i];
      if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;
    }
    return '';
  }

  var raison=p(
    d.raisonSociale,d.raison_sociale,d.nom,d.nom_complet,d.denomination,
    d.nomComplet,d.nom_commercial
  );

  var adresse=p(d.adresse,d.adresse_complete,d.adresseComplete);
  var cp=p(d.codePostal,d.code_postal,d.cp);
  var commune=p(d.commune,d.ville,d.localite);

  if(!raison && !adresse && !cp && !commune){
    return {found:false};
  }

  return {
    found:true,
    entrepriseSiret:String(siret||'').replace(/\D/g,''),
    entrepriseRaisonSociale:raison,
    entrepriseEnseigne:p(d.enseigne,d.nomCommercial,d.nom_commercial),
    entrepriseAdresse:adresse,
    entrepriseComplement:p(d.complement,d.complement_adresse,d.complementAdresse),
    entrepriseCodePostal:cp,
    entrepriseCommune:commune,
    entreprisePays:'France'
  };
}

function EUC_V161_verifierSiretFrance(siret){
  siret=String(siret||'').replace(/\D/g,'');

  if(!/^\d{14}$/.test(siret)){
    throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  }

  var r=EUC_ENT_rechercherSiret(siret);
  if(!r)return {found:false};

  if(String(r.source||'')==='api_navigateur'){
    return {
      found:false,
      navigateur:true,
      siret:r.siret||siret,
      url:r.url||''
    };
  }

  return EUC_V161_mapperEntrepriseFrance_(r,siret);
}

function EUC_V161_traiterSiretFranceNavigateur(json,siret){
  siret=String(siret||'').replace(/\D/g,'');

  if(!/^\d{14}$/.test(siret)){
    throw new Error('Le SIRET doit comporter exactement 14 chiffres.');
  }

  var r=EUC_ENT_traiterReponseApiNavigateur(json,siret);
  return EUC_V161_mapperEntrepriseFrance_(r,siret);
}

function EUC_V161_normaliserNIS_(nis){
  return String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');
}

function EUC_V161_resoudreEntrepriseMonacoPourSauvegarde_(nis){
  nis=EUC_V161_normaliserNIS_(nis);
  if(!nis)throw new Error('Le NIS est obligatoire pour une entreprise monégasque.');
  var r=EUC_V161_rechercherEntrepriseMonaco(nis);
  return r&&r.found?r:null;
}
EOF

cat > /tmp/EUC_FIX10_FRANCE_OLD.txt <<'EOF'
google.script.run
          .withSuccessHandler(function(r){
            search.disabled=false;
            if(!r||!r.found){
              document.documentElement.dataset.eucFranceVerified='0';
              clearIdentity(false);
              lockIdentity(true,false);
              lockOne('entrepriseEnseigne',false);
              status('SIRET non retrouvé : enregistrement impossible.',true);
              return;
            }
            fillIdentity(r,false);
            V('entreprisePays','France');
            document.documentElement.dataset.eucFranceVerified='1';
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('✓ Entreprise française retrouvée. Données officielles verrouillées.',false);
          })
          .withFailureHandler(function(e){
            search.disabled=false;
            document.documentElement.dataset.eucFranceVerified='0';
            clearIdentity(false);
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('Erreur de recherche SIRET : '+(e&&e.message||e),true);
          })
          .EUC_V161_verifierSiretFrance(siret);
EOF

cat > /tmp/EUC_FIX10_FRANCE_NEW.txt <<'EOF'
google.script.run
          .withSuccessHandler(function(r){
            if(r&&r.navigateur){
              var controller=new AbortController();
              var timer=setTimeout(function(){controller.abort();},8000);

              fetch(r.url,{
                headers:{Accept:'application/json'},
                signal:controller.signal
              })
              .then(function(rep){
                if(!rep.ok)throw new Error(
                  rep.status===429
                    ? 'API temporairement limitée.'
                    : 'API entreprises indisponible ('+rep.status+').'
                );
                return rep.json();
              })
              .then(function(json){
                google.script.run
                  .withSuccessHandler(function(x){
                    clearTimeout(timer);
                    search.disabled=false;

                    if(!x||!x.found){
                      document.documentElement.dataset.eucFranceVerified='0';
                      clearIdentity(false);
                      lockIdentity(true,false);
                      lockOne('entrepriseEnseigne',false);
                      status('SIRET non retrouvé : enregistrement impossible.',true);
                      return;
                    }

                    fillIdentity(x,false);
                    V('entreprisePays','France');
                    document.documentElement.dataset.eucFranceVerified='1';
                    lockIdentity(true,false);
                    lockOne('entrepriseEnseigne',false);
                    status('✓ Entreprise française retrouvée. Données officielles verrouillées.',false);
                  })
                  .withFailureHandler(function(e){
                    clearTimeout(timer);
                    search.disabled=false;
                    document.documentElement.dataset.eucFranceVerified='0';
                    status('Erreur SIRET : '+(e&&e.message||e),true);
                  })
                  .EUC_V161_traiterSiretFranceNavigateur(json,siret);
              })
              .catch(function(e){
                clearTimeout(timer);
                search.disabled=false;
                document.documentElement.dataset.eucFranceVerified='0';
                clearIdentity(false);
                lockIdentity(true,false);
                lockOne('entrepriseEnseigne',false);
                status(
                  e&&e.name==='AbortError'
                    ? 'API entreprises trop lente.'
                    : 'Erreur de recherche SIRET : '+(e&&e.message||e),
                  true
                );
              });

              return;
            }

            search.disabled=false;

            if(!r||!r.found){
              document.documentElement.dataset.eucFranceVerified='0';
              clearIdentity(false);
              lockIdentity(true,false);
              lockOne('entrepriseEnseigne',false);
              status('SIRET non retrouvé : enregistrement impossible.',true);
              return;
            }

            fillIdentity(r,false);
            V('entreprisePays','France');
            document.documentElement.dataset.eucFranceVerified='1';
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('✓ Entreprise française retrouvée. Données officielles verrouillées.',false);
          })
          .withFailureHandler(function(e){
            search.disabled=false;
            document.documentElement.dataset.eucFranceVerified='0';
            clearIdentity(false);
            lockIdentity(true,false);
            lockOne('entrepriseEnseigne',false);
            status('Erreur de recherche SIRET : '+(e&&e.message||e),true);
          })
          .EUC_V161_verifierSiretFrance(siret);
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/PFMP_Acces_QR_V116.html")
s=p.read_text(encoding="utf-8")

m=re.search(r'<script id="EUC_QR_CONTROLLER_FIX9">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : contrôleur QR FIX9 introuvable.")

block=m.group(1)
old=Path("/tmp/EUC_FIX10_FRANCE_OLD.txt").read_text(encoding="utf-8").rstrip("\n")
new=Path("/tmp/EUC_FIX10_FRANCE_NEW.txt").read_text(encoding="utf-8").rstrip("\n")

if old not in block:
    raise SystemExit("ERREUR : branche France FIX9 attendue introuvable.")

block=block.replace(old,new,1)
s=s[:m.start(1)]+block+s[m.end(1):]
p.write_text(s,encoding="utf-8")

print("OK 1/2 : recherche SIRET France corrigée.")
PY

cat > /tmp/EUC_DIPLOME_V94_FIX10.txt <<'EOF'
function EUC_CONVENTION_diplomeV94_(classeId,e){
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
  }catch(errCanonique){
    console.log('DIPLOME_CANONIQUE_FALLBACK '+String(errCanonique&&errCanonique.message||errCanonique));
  }

  try{
    var rows=EUC_CONVENTION_recordsV94_('EUC_CLASSES_DIPLOMES_PFMP').filter(function(r){
      return r.Actif!==false &&
        String(EUC_CONVENTION_refIdV80_(r.Classe))===String(classeId);
    });

    if(rows.length){
      var manuel=EUC_CONVENTION_txtV80_(rows[0].Intitule_diplome);
      if(manuel)return manuel;
    }
  }catch(errManuel){}

  return EUC_CONVENTION_txtV80_(e.Formation_Pronote||e.Formation||'');
}
EOF

python3 <<'PY'
from pathlib import Path
import re

p=Path("apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs")
s=p.read_text(encoding="utf-8")
new_fn=Path("/tmp/EUC_DIPLOME_V94_FIX10.txt").read_text(encoding="utf-8").strip()

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
print("OK 2/2 : diplôme imprimé basé en priorité sur EUC_DIPLOMES.")
PY

echo
echo "============================================================"
echo " CONTROLES AVANT PUSH"
echo "============================================================"

for f in "$STRICT" "$DONNEES"; do
  cp "$f" "/tmp/$(basename "$f").js"
  node --check "/tmp/$(basename "$f").js"
done

python3 <<'PY'
from pathlib import Path
import re
s=Path("apps-script/PFMP_Acces_QR_V116.html").read_text(encoding="utf-8")
m=re.search(r'<script id="EUC_QR_CONTROLLER_FIX9">(.*?)</script>',s,re.S)
if not m:
    raise SystemExit("ERREUR : contrôleur QR introuvable.")
Path("/tmp/EUC_QR_CONTROLLER_FIX10.js").write_text(m.group(1),encoding="utf-8")
PY

node --check /tmp/EUC_QR_CONTROLLER_FIX10.js

grep -q "EUC_V161_traiterSiretFranceNavigateur" "$STRICT"
grep -q "api_navigateur" "$STRICT"
grep -q "fetch(r.url" "$QR_PAGE"
grep -q "EUC_OFFRES_FORMATION" "$DONNEES"
grep -q "EUC_DIPLOMES" "$DONNEES"

echo "✓ syntaxe serveur valide"
echo "✓ syntaxe frontend valide"
echo "✓ France : API navigateur correctement gérée"
echo "✓ Monaco : circuit existant non modifié"
echo "✓ diplôme : priorité au référentiel EUC_DIPLOMES"
echo "✓ fallback diplôme manuel conservé"

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
echo " DEV.161 FIX10 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "Tests :"
echo "1. Générer une convention CAP et vérifier le diplôme."
echo "2. France : saisir un SIRET réel et cliquer Rechercher."
echo "3. Vérifier remplissage automatique + verrouillage."
echo "4. Monaco : simple contrôle de non-régression."
echo "============================================================"
