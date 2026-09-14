/** EDT V2.0 - Préparation PFMP. Toutes les fonctions sont préfixées EDT_. */

function EDT_calculerRepartitionPFMP() {
  var quotas = EDT_getRecords_('Quotas_PFMP_Enseignants').filter(function(r){ return r.fields.Actif !== false; });
  var classes = {};
  quotas.forEach(function(r){
    var f = r.fields;
    var k = [EDT_ref_(f.Annee_scolaire)||'', EDT_ref_(f.Classe)||'', f.Categorie_suivi||''].join('|');
    if (!classes[k]) classes[k] = [];
    classes[k].push(r);
  });
  EDT_clearTable_('Repartition_PFMP');
  var actions = [];
  Object.keys(classes).forEach(function(k){
    var rows = classes[k];
    var total = rows.reduce(function(s,r){ return s + Number(r.fields.Heures_hebdo_reference || 0); }, 0) || 1;
    rows.forEach(function(r){
      var f = r.fields;
      var ratio = Number(f.Heures_hebdo_reference || 0) / total;
      actions.push(['AddRecord','Repartition_PFMP',null,{
        Annee_scolaire: EDT_ref_(f.Annee_scolaire),
        Classe: EDT_ref_(f.Classe),
        Enseignant: EDT_ref_(f.Enseignant),
        Categorie_suivi: f.Categorie_suivi || '',
        Heures_reference: Number(f.Heures_hebdo_reference || 0),
        Ratio: ratio,
        Nombre_eleves_a_suivre: null,
        Commentaire: 'Répartition au ratio. Renseigner le nombre d’élèves à suivre si nécessaire.'
      }]);
    });
  });
  EDT_applyActions_(actions);
  EDT_markUpdate_();
}
