/** Eucalyptus PFMP — v1.0.0-dev.85 — vérification publique d’un accès QR, sans exposer les listes internes. */
function EUC_CONVENTION_verifierIdentiteV85(token,jour,mois){
  token=String(token||'').trim();jour=Number(jour||0);mois=Number(mois||0);
  if(!token||jour<1||jour>31||mois<1||mois>12)throw new Error('Informations de contrôle invalides.');
  var a=EUC_CONVENTION_trouverAccesParToken_(token),now=Date.now();
  if(a.Bloque_jusqua&&new Date(a.Bloque_jusqua).getTime()>now)throw new Error('Trop de tentatives. Réessayez plus tard.');
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),e=eleves.filter(function(x){return x.id===EUC_PFMP_ref_(a.Eleve);})[0];
  if(!e)throw new Error('Élève introuvable.');
  var iso=EUC_IMPORT_dateExistanteISO_(e.Date_naissance),parts=iso.split('-'),ok=parts.length===3&&Number(parts[2])===jour&&Number(parts[1])===mois;
  if(!ok){
    var n=Number(a.Tentatives_echec||0)+1,fields={Tentatives_echec:n,Date_derniere_utilisation:new Date().toISOString()};
    if(n>=5)fields.Bloque_jusqua=new Date(now+30*60*1000).toISOString();
    EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});
    throw new Error('Vérification impossible. Contrôlez le jour et le mois de naissance.');
  }
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});
  return {ok:true,reference:a.Reference_convention||'',eleve:{nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',classeConvention:a.Classe_convention_nom||'',anneeConvention:a.Annee_scolaire||'',dateDebut:EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_debut),true),dateFin:EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_fin),true)}};
}
