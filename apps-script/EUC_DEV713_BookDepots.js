/**
 * DEV713 — Book des entreprises : dépôts en ligne (« Déclarer mon entreprise », n° PFMP-…-S…) comptés dans le suivi.
 *
 * Un dépôt au SIRET vérifié (ou au NIS de Monaco reconnu) compte « Convention enregistrée » dans le suivi (DEV666)
 * mais reste dans la table d'attente EUC_MIGRATION_JOTFORM_PFMP tant qu'il n'est pas importé. Le Book ne lisait que
 * la table des conventions : l'élève manquait (ex. deux élèves dans la même entreprise, un seul dans le Book).
 * Ces dépôts sont ajoutés au Book sous la même forme que les conventions (EUC_DEV513_geoAccessDetails_).
 * Un dépôt déjà importé (VALIDEE, Importer) ou classé est ignoré : sa convention est déjà lue. Lecture seule.
 */
function EUC_DEV713_t_(v) { return v == null ? '' : String(v).trim(); }
/* Date ISO (aaaa-mm-jj) depuis une date ISO ou française (jj/mm/aaaa). */
function EUC_DEV713_iso_(v) { var s = EUC_DEV713_t_(v), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) || s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return !m ? '' : m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + m[2] + '-' + m[1]; }

/* Lignes du Book (calcul pur). depots : lignes de la table d'attente ; eleves : id → élève ; classes : id → {famille, nom, periodes:[{id, libelle, debut, fin}]}. */
function EUC_DEV713_details_(q, depots, eleves, classes) {
  q = q || {}; var T = EUC_DEV713_t_, y = T(q.annee), fam = T(q.famille).toUpperCase(), cid0 = Number(q.classeId) || 0, pid0 = Number(q.periodeId) || 0, groupes = {};
  (depots || []).forEach(function(j) {
    var depot = T(j.Submission_ID); if (!/^SECOURS-/.test(depot)) return;
    var decision = T(j.Decision).toUpperCase(), importee = j.Importer === true || /^(1|OUI|YES|TRUE|VRAI)$/i.test(T(j.Importer));
    if (importee || ['VALIDEE', 'IGNOREE', 'REJETEE', 'REFUSEE', 'ESSAI'].indexOf(decision) >= 0) return;
    if (typeof EUC_DEV666_dansSuivi_ === 'function' && !EUC_DEV666_dansSuivi_(j)) return;
    var numero = depot.replace(/^SECOURS-/, ''), an = T(j.Annee_scolaire);
    if (!/^20\d{2}-20\d{2}$/.test(an)) { var m = numero.match(/PFMP-(20\d{2})-/); an = m ? m[1] + '-' + (Number(m[1]) + 1) : ''; }
    if (y && an !== y) return;
    var eid = Number(EUC_PFMP_ref_(j.Eleve_match_id || j.Eleve || j.Eleve_id)) || 0, e = eleves[eid]; if (!eid || !e) return;
    if (e.Donnee_test === true) return;
    var cid = Number(EUC_PFMP_ref_(e.Classe)) || 0, info = classes[cid]; if (!cid || !info) return;
    if (cid0 && cid !== cid0) return; if (fam && T(info.famille).toUpperCase() !== fam) return;
    var brut = T(j.Periode_libelle) || (Number(j.Periode_numero) ? 'PFMP n°' + Number(j.Periode_numero) : T(j.Periode_numero)), d1 = EUC_DEV713_iso_(j.Date_debut || j.Date_debut_brut);
    var ps = info.periodes || [], p = ps.filter(function(x) { return d1 && x.debut && x.fin && d1 >= x.debut && d1 <= x.fin; })[0] || ps.filter(function(x) { return T(x.libelle) === brut; })[0];
    if (!p) return; if (pid0 && Number(p.id) !== pid0) return;
    var c = typeof EUC_SUIVI2_contactsTampon_ === 'function' ? EUC_SUIVI2_contactsTampon_(j) : { responsable: {}, tuteur: {} };
    var a = { Entreprise_adresse: T(j.Adresse_officielle), Entreprise_code_postal: T(j.CP_officiel), Entreprise_commune: T(j.Ville_officielle),
      Lieu_stage_adresse: j.Lieu_stage_adresse, Lieu_stage_code_postal: j.Lieu_stage_code_postal, Lieu_stage_commune: j.Lieu_stage_commune };
    var adresse = [a.Entreprise_adresse, a.Entreprise_code_postal, a.Entreprise_commune].filter(Boolean).join(', ');
    if (typeof EUC_DEV649_lieuTexte_ === 'function' && EUC_DEV649_lieuTexte_(a)) adresse = EUC_DEV649_lieuTexte_(a);
    var k = cid + '|' + p.id, g = groupes[k] || (groupes[k] = { annee: an, famille: T(info.famille).toUpperCase(), classe: { id: cid, nom: T(info.nom) }, periode: { id: Number(p.id), libelle: T(p.libelle) }, lignes: [] });
    var nm = function(x) { return [T(x && x.prenom), T(x && x.nom)].filter(Boolean).join(' '); };
    g.lignes.push({ eleveId: eid, nom: T(e.Nom), prenom: T(e.Prenom_usage || e.Prenom), professeurVisiteur: '',
      entreprise: T(j.Raison_sociale_officielle) || T(j.Nom_commercial) || T(j.Entreprise_saisie), adresseEntreprise: adresse,
      siretEntreprise: T(j.SIRET_normalise || j.SIRET_brut).replace(/\D/g, '') || T(j.NIS_normalise || j.NIS_brut),
      contactEntreprise: nm(c.responsable), telephoneEntreprise: T(c.responsable && c.responsable.tel), courrielEntreprise: T(c.responsable && c.responsable.mail),
      tuteurEntreprise: nm(c.tuteur), telephoneTuteur: T(c.tuteur && c.tuteur.tel), courrielTuteur: T(c.tuteur && c.tuteur.mail),
      sourceRecordId: 0, dateSaisieEntreprise: T(j.Date_import || j.Date_soumission || j.Created_at) || an.slice(0, 4) + '-09-01', depot: numero });
  });
  return Object.keys(groupes).map(function(k) { return groupes[k]; });
}

/* Lecture (une table d'attente, élèves, catalogue de l'année) ; jamais bloquant pour le Book. */
function EUC_DEV713_depotsDetails_(q) {
  try {
    q = q || {}; var y = typeof EUC_DEV368_year === 'function' ? EUC_DEV368_year(q.annee) : EUC_DEV713_t_(q.annee), eleves = {}, classes = {};
    (EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP') || []).forEach(function(e) { eleves[Number(e.id)] = e; });
    (EUC_DEV441_catalog_(y, false).classes || []).forEach(function(c) {
      var id = Number(c.classeId) || 0; if (!id) return;
      classes[id] = { famille: c.famille, nom: c.classe || c.nom, periodes: (c.periodes || []).map(function(p) { return { id: Number(p.id || p.periodeId) || 0, libelle: EUC_DEV713_t_(p.libelle || p.nom), debut: EUC_DEV713_iso_(p.debut), fin: EUC_DEV713_iso_(p.fin) }; }) };
    });
    return EUC_DEV713_details_(Object.assign({}, q, { annee: y }), EUC_IMPORT_lireRecords_('EUC_MIGRATION_JOTFORM_PFMP') || [], eleves, classes);
  } catch (e) { console.log('DEV713 dépôts du Book : ' + (e && e.message || e)); return []; }
}
