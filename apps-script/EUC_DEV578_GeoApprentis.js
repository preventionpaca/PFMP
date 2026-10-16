/**
 * DEV578 — Les entreprises des apprentis entrent dans le géocodage.
 *
 * La page « Géocodage des entreprises » ne lisait que les conventions de
 * stage (fiches de classe) : une entreprise qui n'accueille que des apprentis
 * n'y apparaissait jamais, et restait absente de la carte des apprentis.
 * Ces détails supplémentaires, construits depuis les dossiers d'apprentissage
 * de l'année (adresse, code postal, ville, SIRET), ont la même forme que ceux
 * des conventions. Lecture seule.
 */
function EUC_DEV578_geoApprentisDetails_(q) {
  q = q || {};
  var annee = EUC_DEV368_year(q.annee), classes = {}, eleves = {}, groupes = {};
  try { EUC_DEV541_apprentissageClasses_(annee).forEach(function(c) { classes[c.id] = c; }); } catch (e) { return []; }
  EUC_DEV538_records_('EUC_ELEVES_PFMP', {}).forEach(function(r) {
    var f = EUC_DEV538_fields_(r), id = EUC_DEV538_n_(r.id || f.id), cid = EUC_DEV538_ref_(f.Classe);
    if (id && classes[cid]) eleves[id] = cid;
  });
  var dernier = EUC_DEV538_latestByStudent_(EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP', {}), annee);
  Object.keys(dernier).forEach(function(eid) {
    var cid = eleves[eid], c = classes[cid];
    if (!c) return;
    if (q.classeId && EUC_DEV538_n_(q.classeId) !== c.id) return;
    if (q.famille && EUC_DEV538_t_(q.famille).toUpperCase() !== c.famille) return;
    var f = EUC_DEV538_fields_(dernier[eid]), P = EUC_DEV538_pick_;
    var entreprise = EUC_DEV538_t_(P(f, ['Nom_commercial', 'Nom_entreprise', 'Entreprise']));
    /* Même construction que la carte des apprentis, pour que le point retrouve l'entreprise. */
    var adresse = EUC_DEV540_normalizeAddress_([EUC_DEV538_t_(P(f, ['Adresse_entreprise', 'Adresse'])), EUC_DEV538_t_(P(f, ['Code_postal', 'CodePostal', 'CP'])), EUC_DEV538_t_(f.Ville)].filter(Boolean).join(', '));
    if (!entreprise || !adresse) return;
    var g = groupes[cid] = groupes[cid] || { annee: annee, famille: c.famille, classe: { id: c.id, nom: c.classe }, periode: { id: 0, libelle: 'Apprentissage' }, lignes: [] };
    g.lignes.push({ eleveId: Number(eid), entreprise: entreprise, adresseEntreprise: adresse, siretEntreprise: EUC_DEV538_t_(f.SIRET).replace(/\D/g, '') });
  });
  return Object.keys(groupes).map(function(k) { return groupes[k]; });
}
