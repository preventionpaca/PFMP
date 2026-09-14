/** Eucalyptus PFMP — v1.0.0-dev.28 — sélection d’élèves pour le formulaire. */
function EUC_PFMP_listerElevesPourPeriode(anneeId,offreId,dateReference) {
  EUC_ENT_controlerAccesUtilisateur_();
  EUC_ENT_controlerCibleRecette_();
  anneeId=Number(anneeId||0);
  offreId=Number(offreId||0);
  dateReference=EUC_PFMP_dateIso_(dateReference);
  if(!anneeId||!offreId)throw new Error('Année scolaire et classe obligatoires.');

  var catalogue=EUC_PFMP_chargerReferentiel();
  var offre=catalogue.offres.filter(function(o){return o.id===offreId&&o.anneeId===anneeId;})[0];
  if(!offre)throw new Error('Classe absente du référentiel PFMP actif.');

  var rows=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.eleves),actifs=[],sortis=[];
  rows.forEach(function(r){
    var f=r.fields||{};
    if(EUC_PFMP_ref_(f.Annee_scolaire)!==anneeId)return;
    var memeOffre=EUC_PFMP_ref_(f.Offre_formation)===offreId;
    var memeClasse=String(f.Code_classe_importe||'').toUpperCase()===String(offre.classe||'').toUpperCase();
    if(!memeOffre&&!memeClasse)return;
    if(f.Actif===false)return;

    var entree=EUC_PFMP_dateIso_(f.Date_entree),sortie=EUC_PFMP_dateIso_(f.Date_sortie);
    var avantEntree=!!(dateReference&&entree&&entree>dateReference);
    var dejaSorti=!!(dateReference&&sortie&&sortie<dateReference);
    if(avantEntree)return;

    var item={
      id:r.id,
      nom:f.Nom||'',
      prenom:f.Prenom_usage||f.Prenom||'',
      dateNaissance:EUC_PFMP_dateIso_(f.Date_naissance),
      dateEntree:entree,
      dateSortie:sortie,
      numeroNational:f.Numero_national||f.Numero_National||f.Identifiant_national||'',
      sorti:dejaSorti
    };
    (dejaSorti?sortis:actifs).push(item);
  });

  function tri(a,b){
    return String(a.nom).localeCompare(String(b.nom),'fr',{sensitivity:'base'})||String(a.prenom).localeCompare(String(b.prenom),'fr',{sensitivity:'base'});
  }
  actifs.sort(tri);sortis.sort(tri);
  return {version:EUC_PFMP_VERSION,classe:offre.classe,dateReference:dateReference,actifs:actifs,sortis:sortis,secoursSaisieLibre:true};
}
