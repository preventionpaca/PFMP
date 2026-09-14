#!/usr/bin/env bash
set -euo pipefail
cd ~/PFMP || exit 1
F='apps-script/EUC_CONVENTION_PFMP_AdminBridgeV141.gs'
B="backup_DEV140_avant_DEV141_$(date +%Y%m%d_%H%M%S)"; mkdir -p "$B"
[ -f "$F" ] && cp "$F" "$B/" || true
cp apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs "$B/"
cat > "$F" <<'EOF'
/** Eucalyptus PFMP — v1.0.0-dev.141 — diagnostic pont QR vers administration, lecture seule. */
var EUC_CONVENTION_ADMIN_VERSION_V141_='v1.0.0-dev.141';
function EUC_V141_txt_(v,n){return String(v==null?'':v).trim().slice(0,n||500);}
function EUC_V141_mail_(v){var x=EUC_V141_txt_(v,250).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x:'';}
function EUC_V141_unique_(a){var s={},o=[];(a||[]).forEach(function(v){var x=EUC_V141_mail_(v);if(x&&!s[x]){s[x]=1;o.push(x);}});return o;}
function EUC_V141_responsables_(eleveId){var r=[];try{r=EUC_IMPORT_lireRecords_('EUC_RESPONSABLES_ELEVES_PFMP');}catch(e){return [];}return r.filter(function(x){return Number(EUC_PFMP_ref_(x.Eleve))===Number(eleveId);}).map(function(x){return {id:x.id,rang:EUC_V141_txt_(x.Rang_responsable,30),nom:[x.Prenom,x.Nom].filter(Boolean).join(' '),legal:x.Responsable_legal===true,enCharge:x.Responsable_en_charge===true,email:EUC_V141_mail_(x.Email)};}).filter(function(x){return x.email;});}
function EUC_V141_pp_(classeId){var l=[],p=[];try{l=EUC_IMPORT_lireRecords_('EUC_CLASSES_PROFESSEURS_PFMP');p=EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP');}catch(e){return [];}var m={};p.forEach(function(x){m[Number(x.id)]=x;});return l.filter(function(x){return x.Actif!==false&&String(x.Role||'')==='PROFESSEUR_PRINCIPAL'&&Number(EUC_PFMP_ref_(x.Classe))===Number(classeId);}).map(function(x){var q=m[Number(EUC_PFMP_ref_(x.Professeur))];return q?{id:q.id,nom:[q.Civilite,q.Prenom,q.Nom].filter(Boolean).join(' '),email:EUC_V141_mail_(q.Email)}:null;}).filter(function(x){return x&&x.email;});}
function EUC_V141_dossier_(a){if(!a)throw new Error('Accès convention absent.');var eid=Number(EUC_PFMP_ref_(a.Eleve)),cid=Number(EUC_PFMP_ref_(a.Classe_convention)),pid=Number(EUC_PFMP_ref_(a.Periode));var e=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(x){return Number(x.id)===eid;})[0];if(!e)throw new Error('Élève '+eid+' introuvable.');var n=EUC_V141_txt_(a.Numero_enregistrement,100);if(!n){var an=EUC_V141_txt_(a.Annee_scolaire,50),d=(an.match(/20\d{2}/)||['PFMP'])[0];n='PFMP-'+d+'-'+String(Number(a.id||0)).padStart(6,'0');}var resp=EUC_V141_responsables_(eid),pp=EUC_V141_pp_(cid),em=EUC_V141_mail_(e.Email_eleve||e.Courriel||e.Email),bfe='bfe@lycee-les-eucalyptus.org';var dest={eleve:em?[em]:[],responsables:EUC_V141_unique_(resp.map(function(x){return x.email;})),pp:EUC_V141_unique_(pp.map(function(x){return x.email;})),bfe:[bfe]};dest.tous=EUC_V141_unique_([].concat(dest.eleve,dest.responsables,dest.pp,dest.bfe));return {version:EUC_CONVENTION_ADMIN_VERSION_V141_,lectureSeule:true,accesId:Number(a.id),numero:n,eleve:{id:eid,nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',email:em},classe:{id:cid,nom:a.Classe_convention_nom||''},periode:{id:pid,libelle:a.Periode_libelle||'',debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin)},entreprise:{siret:a.Entreprise_siret||'',raison:a.Entreprise_raison_sociale||''},responsables:resp,professeursPrincipaux:pp,destinataires:dest};}
function DIAGNOSTIC_DEV141_DOSSIER(id){id=Number(id||0);if(!id)throw new Error('ID QR obligatoire.');var a=EUC_CONVENTION_lireAccesFraisV108_().filter(function(x){return Number(x.id)===id;})[0];if(!a)throw new Error('Dossier QR '+id+' introuvable.');var d=EUC_V141_dossier_(a);console.log('=== DEV.141 — LECTURE SEULE ===');console.log('Numéro : '+d.numero);console.log('Élève : '+d.eleve.prenom+' '+d.eleve.nom+' | '+(d.eleve.email||'AUCUN EMAIL'));console.log('Classe : '+d.classe.nom+' | ID '+d.classe.id);console.log('Période : '+d.periode.libelle+' | '+d.periode.debut+' -> '+d.periode.fin);console.log('Entreprise : '+d.entreprise.raison+' | '+d.entreprise.siret);console.log('=== RESPONSABLES ===');d.responsables.forEach(function(x){console.log((x.rang||'')+' | '+x.nom+' | '+x.email+' | légal='+x.legal+' | en charge='+x.enCharge);});if(!d.responsables.length)console.log('Aucun responsable avec courriel.');console.log('=== PP ===');d.professeursPrincipaux.forEach(function(x){console.log(x.nom+' | '+x.email);});if(!d.professeursPrincipaux.length)console.log('Aucun PP avec courriel.');console.log('=== DESTINATAIRES ===');console.log('Élève : '+(d.destinataires.eleve.join(', ')||'—'));console.log('Parents : '+(d.destinataires.responsables.join(', ')||'—'));console.log('PP : '+(d.destinataires.pp.join(', ')||'—'));console.log('BFE : '+d.destinataires.bfe.join(', '));console.log('Total uniques : '+d.destinataires.tous.length);console.log('AUCUNE ECRITURE — AUCUN COURRIEL.');return d;}
function DIAGNOSTIC_DEV141_PFMP_000223(){return DIAGNOSTIC_DEV141_DOSSIER(223);}
EOF
cp "$F" /tmp/EUC_CONVENTION_PFMP_AdminBridgeV141.js
node --check /tmp/EUC_CONVENTION_PFMP_AdminBridgeV141.js
if grep -nE 'MailApp|GmailApp|sendEmail|sendMail' "$F"; then echo 'ERREUR: envoi mail détecté'; exit 1; fi
echo '=== PUSH DEV.141 ==='
clasp push -f
echo '============================================================'
echo 'DEV.141 OK — aucun déploiement, aucun mail, aucune écriture Grist.'
echo 'Dans Apps Script, exécuter : DIAGNOSTIC_DEV141_PFMP_000223'
echo "Sauvegarde : $B"
echo '============================================================'
