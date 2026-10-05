/** PFMP DEV462 — une même règle de statut apprenti dans toutes les vues. */
var EUC_DEV462_VERSION_='1.0.0-dev.462';
function EUC_DEV462_effectiveEpisode_(ep){
  ep=ep||{};
  var invalid=!!(ep.debut&&ep.fin&&ep.fin<ep.debut),effectiveFin=invalid&&ep.actif?'9999-12-31':ep.fin;
  return {invalid:invalid,fin:effectiveFin,full:!!ep.contrat&&!!ep.debut&&!!effectiveFin};
}
function EUC_DEV277_score_(ep,today){
  var effective=EUC_DEV462_effectiveEpisode_(ep),full=effective.full;
  var current=full&&!ep.rupture&&ep.debut<=today&&effective.fin>=today;
  var future=full&&!ep.rupture&&ep.debut>today,score=0;
  if(current)score+=10000000;else if(future)score+=7000000;else if(full&&!ep.rupture)score+=5000000;else if(ep.dossierDistribue||ep.dossierRemis||ep.transmisCfa)score+=2000000;
  if(ep.actif)score+=100000;if(ep.contrat)score+=30000;if(ep.debut)score+=20000;if(ep.fin)score+=10000;
  return score+Math.min(Number(ep.id)||0,999999);
}
function EUC_DEV277_status_(ep){
  if(!ep)return {code:'SCOLAIRE',apprenti:false,futur:false};
  var today=EUC_DEV277_today_(),effective=EUC_DEV462_effectiveEpisode_(ep);
  if(ep.rupture&&ep.rupture<=today)return {code:'SCOLAIRE_RUPTURE',apprenti:false,futur:false};
  if(effective.full&&ep.debut<=today&&effective.fin>=today)return {code:'APPRENTI',apprenti:true,futur:false,dateIncoherente:effective.invalid};
  if(effective.full&&ep.debut>today)return {code:'FUTUR_APPRENTI',apprenti:false,futur:true,dateIncoherente:effective.invalid};
  if(ep.dossierDistribue||ep.dossierRemis||ep.transmisCfa||ep.contrat||ep.debut)return {code:'FUTUR_APPRENTI',apprenti:false,futur:true,dateIncoherente:effective.invalid};
  return {code:'SCOLAIRE',apprenti:false,futur:false};
}
