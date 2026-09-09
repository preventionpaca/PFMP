/** Eucalyptus PFMP — v1.0.0-dev.80 — données enrichies pour impression convention. */
function EUC_CONVENTION_refIdV80_(v){return EUC_PFMP_ref_(v);}
function EUC_CONVENTION_txtV80_(v){return String(v===null||v===undefined?'':v).trim();}
function EUC_CONVENTION_adresseV80_(o){
  o=o||{};
  return [o.Adresse_1,o.Adresse_2,o.Adresse_3,o.Adresse_4].map(EUC_CONVENTION_txtV80_).filter(Boolean).join(', ');
}
function EUC_CONVENTION_telRespV80_(r){return EUC_CONVENTION_txtV80_(r.Telephone_portable||r.Telephone_fixe||r.Telephone_professionnel);}
function EUC_CONVENTION_respScoreV80_(r){
  var s=0;if(r.Responsable_legal===true)s+=100;if(r.Responsable_en_charge===true)s+=60;if(EUC_CONVENTION_telRespV80_(r))s+=10;if(EUC_CONVENTION_txtV80_(r.Email))s+=10;if(EUC_CONVENTION_adresseV80_(r))s+=5;return s;
}
function EUC_CONVENTION_responsablePrioritaireV80_(eleveId){
  var rows=[];try{rows=EUC_IMPORT_lireRecords_('EUC_RESPONSABLES_ELEVES_PFMP');}catch(e){return null;}
  rows=rows.filter(function(r){return EUC_CONVENTION_refIdV80_(r.Eleve)===Number(eleveId);});
  rows.sort(function(a,b){return EUC_CONVENTION_respScoreV80_(b)-EUC_CONVENTION_respScoreV80_(a)||String(a.Rang_responsable||'').localeCompare(String(b.Rang_responsable||''));});
  return rows[0]||null;
}
function EUC_CONVENTION_compterJoursV80_(debut,fin){
  if(!debut||!fin)return 0;var d=new Date(debut+'T12:00:00Z'),f=new Date(fin+'T12:00:00Z'),n=0;if(isNaN(d)||isNaN(f)||d>f)return 0;
  for(;d<=f;d.setUTCDate(d.getUTCDate()+1)){var j=d.getUTCDay();if(j!==0&&j!==6)n++;}return n;
}
function EUC_CONVENTION_coordonneesV80_(e){
  var r=EUC_CONVENTION_responsablePrioritaireV80_(e.id),adresseEleve=EUC_CONVENTION_adresseV80_(e),adresseResp=EUC_CONVENTION_adresseV80_(r||{}),cp=EUC_CONVENTION_txtV80_(e.Code_postal),ville=EUC_CONVENTION_txtV80_(e.Ville),pays=EUC_CONVENTION_txtV80_(e.Pays),email=EUC_CONVENTION_txtV80_(e.Email_eleve||e.Courriel),tel=EUC_CONVENTION_txtV80_(e.Telephone_eleve||e.Telephone);
  if(!adresseEleve&&r){adresseEleve=adresseResp;cp=EUC_CONVENTION_txtV80_(r.Code_postal);ville=EUC_CONVENTION_txtV80_(r.Ville);pays=EUC_CONVENTION_txtV80_(r.Pays);}
  if(!email&&r)email=EUC_CONVENTION_txtV80_(r.Email);
  if(!tel&&r)tel=EUC_CONVENTION_telRespV80_(r);
  return {adresse:adresseEleve,codePostal:cp,ville:ville,pays:pays,email:email,telephone:tel,responsable:r?{nom:EUC_CONVENTION_txtV80_(r.Nom),prenom:EUC_CONVENTION_txtV80_(r.Prenom),lien:EUC_CONVENTION_txtV80_(r.Lien_avec_eleve),type:EUC_CONVENTION_txtV80_(r.Type_responsabilite)}:null,sourceEmail:EUC_CONVENTION_txtV80_(e.Email_eleve||e.Courriel)?'ELEVE':(email?'RESPONSABLE':''),sourceTelephone:EUC_CONVENTION_txtV80_(e.Telephone_eleve||e.Telephone)?'ELEVE':(tel?'RESPONSABLE':'')};
}
function EUC_CONVENTION_donneesImpressionV80(token){
  var a=EUC_CONVENTION_trouverAccesParToken_(token),rows=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),e=rows.filter(function(x){return x.id===EUC_CONVENTION_refIdV80_(a.Eleve);})[0];if(!e)throw new Error('Élève introuvable.');
  var debut=EUC_IMPORT_dateExistanteISO_(a.Date_debut),fin=EUC_IMPORT_dateExistanteISO_(a.Date_fin),c=EUC_CONVENTION_coordonneesV80_(e),pdifMode=String(a.PDIF_mode||'');
  return {reference:a.Reference_convention||'',token:String(token||''),formUrl:ScriptApp.getService().getUrl()+'?page=pfmp&token='+encodeURIComponent(token),annee:a.Annee_scolaire||'',classe:a.Classe_convention_nom||'',debut:debut,fin:fin,jours:EUC_CONVENTION_compterJoursV80_(debut,fin),pdifMode:pdifMode,professeurReferent:EUC_CONVENTION_txtV80_(e.Professeur_principal),eleve:{nom:EUC_CONVENTION_txtV80_(e.Nom),prenom:EUC_CONVENTION_txtV80_(e.Prenom_usage||e.Prenom),dateNaissance:EUC_IMPORT_dateExistanteISO_(e.Date_naissance),adresse:c.adresse,codePostal:c.codePostal,ville:c.ville,pays:c.pays,telephone:c.telephone,courriel:c.email,formation:EUC_CONVENTION_txtV80_(e.Formation_Pronote),responsable:c.responsable,sourceTelephone:c.sourceTelephone,sourceEmail:c.sourceEmail}};
}
