/** Eucalyptus PFMP — v1.0.0-dev.75 — groupes de classes élèves incluant BTS + génération par classe brute Pronote. */

function EUC_CONVENTION_scoreClasseEleve_(classeEleve, c) {
  var a = EUC_CONVENTION_norm_(classeEleve);
  var b = EUC_CONVENTION_norm_(c && c.nom);
  var l = EUC_CONVENTION_norm_(c && c.libelle);
  if (!a) return -1;
  if (a === b || a === l) return 1000;
  var ca = a.replace(/[^A-Z0-9]/g, '');
  var cb = b.replace(/[^A-Z0-9]/g, '');
  var cl = l.replace(/[^A-Z0-9]/g, '');
  if (ca && (ca === cb || ca === cl)) return 950;
  var score = 0;
  var aBts = /BTS/.test(a), bBts = /BTS/.test(b + ' ' + l);
  if (aBts !== bBts) return -1;
  if (aBts && bBts) score += 200;
  var aNum = (/^\s*([12])/.exec(a) || /BTS\s*([12])/.exec(a) || [])[1] || '';
  var bNum = (/^\s*([12])/.exec(b) || /BTS\s*([12])/.exec(b + ' ' + l) || [])[1] || '';
  if (aNum && bNum) score += (aNum === bNum ? 120 : -120);
  var toks = a.split(/[^A-Z0-9]+/).filter(function(x){ return x && x.length >= 2 && x !== 'BTS'; });
  toks.forEach(function(t){ if ((b + ' ' + l).indexOf(t) >= 0) score += 25; });
  if (ca && cb && (ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0)) score += 80;
  if (ca && cl && (ca.indexOf(cl) >= 0 || cl.indexOf(ca) >= 0)) score += 80;
  return score;
}

function EUC_CONVENTION_resoudreClasseEleve_(classeEleve, classes) {
  var best = null, bestScore = -1;
  (classes || []).forEach(function(c){
    var s = EUC_CONVENTION_scoreClasseEleve_(classeEleve, c);
    if (s > bestScore) { bestScore = s; best = c; }
  });
  return bestScore >= 80 ? best : null;
}

function EUC_CONVENTION_lireGroupesClassesElevesAdmin() {
  EUC_IMPORT_exigerAdminTexte_();
  var classes = EUC_IMPORT_chargerClassesCamin_().filter(function(c){ return c.actif; });
  var rows = EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(r){ return r.Actif !== false; });
  var groups = {};
  rows.forEach(function(r){
    var raw = String(r.Code_classe_importe || r.Classe_nom || '').trim();
    if (!raw) return;
    var key = EUC_CONVENTION_norm_(raw);
    if (!groups[key]) groups[key] = { key:key, nom:raw, effectif:0, eleves:[] };
    groups[key].effectif++;
    groups[key].eleves.push({ id:r.id, nom:r.Nom||'', prenom:r.Prenom_usage||r.Prenom||'' });
  });
  return Object.keys(groups).map(function(k){
    var g = groups[k], c = EUC_CONVENTION_resoudreClasseEleve_(g.nom, classes);
    g.classeConventionId = c ? c.id : 0;
    g.classeConventionNom = c ? c.nom : '';
    g.bts = /BTS/.test(EUC_CONVENTION_norm_(g.nom));
    g.eleves.sort(function(a,b){ return String(a.nom).localeCompare(String(b.nom),'fr') || String(a.prenom).localeCompare(String(b.prenom),'fr'); });
    return g;
  }).sort(function(a,b){ return String(a.nom).localeCompare(String(b.nom),'fr'); });
}

function EUC_CONVENTION_preparerAccesClasseNom(payload) {
  var ctx = EUC_IMPORT_exigerAdminTexte_(); payload = payload || {};
  var classeElevesNom = String(payload.classeElevesNom || '').trim();
  var classeConventionId = Number(payload.classeConventionId || 0);
  var periodeId = Number(payload.periodeId || 0);
  var pdifId = Number(payload.pdifPeriodeId || 0);
  var annee = String(payload.anneeConvention || '').trim();
  var parcours = payload.parcoursDifferencie || {};
  if (!classeElevesNom || !classeConventionId || !periodeId || !/^20\d{2}-20\d{2}$/.test(annee)) throw new Error('Classe d’élèves, classe de convention, période et année scolaire sont obligatoires.');

  var key = EUC_CONVENTION_norm_(classeElevesNom);
  var eleves = EUC_CONVENTION_lireElevesAdmin().filter(function(e){ return EUC_CONVENTION_norm_(e.classe) === key; });
  if (!eleves.length) throw new Error('Aucun élève actif trouvé dans la classe '+classeElevesNom+'.');

  var meta = EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var cl = meta.classes.filter(function(c){ return c.id === classeConventionId; })[0];
  var p = meta.periodes.filter(function(x){ return x.id === periodeId; })[0];
  var pdif = pdifId ? meta.periodes.filter(function(x){ return x.id === pdifId; })[0] : null;
  if (!cl || !p) throw new Error('Classe de convention ou période introuvable.');

  var lot = 'LOT-'+Utilities.getUuid(), records = [], items = [], base = ScriptApp.getService().getUrl();
  EUC_CONVENTION_assurerTableAcces_();
  eleves.forEach(function(e){
    var mode = String(parcours[String(e.id)] || '').toUpperCase();
    if (pdif && mode !== 'LYCEE' && mode !== 'ENTREPRISE') throw new Error('Parcours différencié à préciser pour '+e.nom+' '+e.prenom+'.');
    var a = EUC_CONVENTION_preparerRecordAcces_(ctx,e,cl,p,annee,{pdif:pdif,pdifMode:mode,lot:lot});
    records.push(a.record);
    items.push({eleveId:e.id,nom:e.nom,prenom:e.prenom,dateNaissance:e.dateNaissance,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),annee:annee,classe:cl.nom,debut:p.debut,fin:a.dateFin,pdifMode:mode,pdif:pdif?{type:pdif.type,debut:pdif.debut,fin:pdif.fin}:null});
  });
  EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:records});
  CacheService.getScriptCache().put('EUC_CONV_LOT_'+lot,JSON.stringify({lot:lot,classe:cl.nom,classeEleves:classeElevesNom,annee:annee,periode:p,items:items}),21600);
  return {ok:true,total:items.length,lot:lot,classeElevesNom:classeElevesNom,classeConvention:cl.nom,periode:p,anneeConvention:annee,items:items,urlImpressionLot:base+'?page=conventions-pfmp-batch-print&lot='+encodeURIComponent(lot)};
}
