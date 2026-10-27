/**
 * DEV575 — Écran « Vérifier les chiffres » : compare, classe par classe et
 * période par période, le nouveau moteur (EUC_SUIVI2_modele_) et les chiffres
 * affichés aujourd'hui sur les cartes de classe (EUC_DEV339_familyData_).
 * Réservé à l'administration. Lecture seule.
 */
function EUC_SUIVI2_exigerAdmin_() {
  var ctx = typeof EUC_PFMP_contexteAdmin_ === 'function' ? EUC_PFMP_contexteAdmin_() : null;
  if (!ctx || !ctx.autorise || ['ADMIN_PFMP', 'DDFPT', 'BUREAU_ENTREPRISES'].indexOf(ctx.role) < 0) {
    throw new Error('Accès réservé à l’administration PFMP.');
  }
  return ctx;
}

function EUC_SUIVI2_afficherControle(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Controle_Chiffres_DEV575');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.annee = EUC_SUIVI2_t_(e && e.parameter && e.parameter.annee);
  t.section = EUC_SUIVI2_t_(e && e.parameter && e.parameter.section);
  return t.evaluate().setTitle('Vérifier les chiffres — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* Nombre ou liste -> nombre ; liste de noms normalisés. */
function EUC_SUIVI2_n_(v) { return Array.isArray(v) ? v.length : (Number(v) || 0); }
function EUC_SUIVI2_noms_(v) {
  return (Array.isArray(v) ? v : []).map(function(x) { return EUC_SUIVI2_norm_(String(x).split(' — ')[0]); }).filter(Boolean);
}
function EUC_SUIVI2_diff_(a, b) {
  var sb = {}; b.forEach(function(x) { sb[x] = 1; });
  return a.filter(function(x) { return !sb[x]; });
}

/* Chiffres actuels des cartes, indexés par classe puis période. */
function EUC_SUIVI2_actuels_(annee) {
  var out = {}, erreurs = [];
  ['BACPRO', 'BTS', 'CAP'].forEach(function(f) {
    var data = null;
    try { data = EUC_DEV339_familyData_(annee, f); } catch (e) { erreurs.push(f + ' : ' + String(e && e.message || e)); return; }
    ((data && data.classes) || []).forEach(function(c) {
      var cid = Number(c.classeId || c.id) || 0; if (!cid) return;
      (c.periodes || []).forEach(function(p) {
        var pid = Number(p.periodeId || p.id) || 0, q = p.quick; if (!pid || !q) return;
        out[cid + '|' + pid] = q;
      });
    });
  });
  return { parPeriode: out, erreurs: erreurs };
}

function EUC_SUIVI2_controle(annee) {
  EUC_SUIVI2_exigerAdmin_();
  var t0 = Date.now(), m = EUC_SUIVI2_modele_(annee), t1 = Date.now();
  var actuels = EUC_SUIVI2_actuels_(m.annee), t2 = Date.now();
  var noms = {};
  m.classes.forEach(function(c) { c.eleves.forEach(function(e) { noms[e.id] = e.libelle; }); });
  var lignes = [];
  m.classes.forEach(function(c) {
    c.periodes.forEach(function(p) {
      var r = p.resume, q = actuels.parPeriode[c.id + '|' + p.id] || null;
      var nouv = p.pdif
        ? { pdif: true, effectif: r.effectif, apprentis: r.apprentis.length, entreprise: r.entreprise.length, lycee: r.lycee.length, aDefinir: r.aDefinir.length, apprentisEnEntreprise: true }
        : { pdif: false, effectif: r.effectif, scolaires: r.scolaires, avec: r.avec.length, sans: r.sans.length, apprentis: r.apprentis.length, annulees: r.annulees.length };
      var act = null, ecarts = [];
      if (q) {
        act = p.pdif
          ? { entreprise: EUC_SUIVI2_n_(q.entreprise), lycee: EUC_SUIVI2_n_(q.lycee), aDefinir: EUC_SUIVI2_n_(q.indefini), apprentis: EUC_SUIVI2_n_(q.apprentis), total: EUC_SUIVI2_n_(q.total) }
          : { avec: EUC_SUIVI2_n_(q.avec), sans: EUC_SUIVI2_n_(q.sans), apprentis: EUC_SUIVI2_n_(q.apprentis), total: EUC_SUIVI2_n_(q.total) };
        var cmp = p.pdif
          ? [['entreprise', r.entreprise, q.entreprise], ['lycee', r.lycee, q.lycee], ['aDefinir', r.aDefinir, q.indefini]]
          : [['avec', r.avec, q.avec], ['sans', r.sans, q.sans], ['apprentis', r.apprentis, q.apprentis]];
        cmp.forEach(function(x) {
          var nouveaux = x[1].map(function(id) { return EUC_SUIVI2_norm_(noms[id]); }), anciens = EUC_SUIVI2_noms_(x[2]);
          var plus = EUC_SUIVI2_diff_(nouveaux, anciens), moins = EUC_SUIVI2_diff_(anciens, nouveaux);
          if (plus.length || moins.length || (!Array.isArray(x[2]) && EUC_SUIVI2_n_(x[2]) !== x[1].length)) {
            var motifs = [];
            if (x[0] === 'sans') x[1].forEach(function(id) {
              var m = (r.motifs || {})[id]; if (!m || plus.indexOf(EUC_SUIVI2_norm_(noms[id])) < 0) return;
              motifs.push(noms[id] + ' : ' + (m.dossiers ? m.dossiers + ' dossier(s), statut ' + m.statut + ', ' + (m.identifiant || 'aucun SIRET/NIS') + (m.ficheEntreprise ? ' (fiche entreprise n° ' + m.ficheEntreprise + ')' : '') : 'aucun dossier sur cette période') +
                (m.autresPeriodes.length ? ' ; dossier(s) sur la période n° ' + m.autresPeriodes.join(', ') : '') +
                (m.jotformNonValide ? ' ; saisie JotForm en attente de validation SIRET' : '') +
                (m.entrepriseSaisie ? ' ; entreprise inscrite dans le dossier : ' + m.entrepriseSaisie : ' ; aucune entreprise dans le dossier') +
                (m.jotformToutes && m.jotformToutes.length ? ' ; JotForm : ' + m.jotformToutes.join(', ') : ' ; aucune saisie JotForm rattachée à l’élève'));
              var mx = (r.mixtes || {})[id]; if (mx) motifs[motifs.length - 1] += ' ; devient apprenti le ' + mx.debut + (mx.fin ? ' (jusqu’au ' + mx.fin + ')' : '');
            });
            ecarts.push({ categorie: x[0], nouveau: x[1].length, actuel: EUC_SUIVI2_n_(x[2]), enPlus: plus.slice(0, 30), enMoins: moins.slice(0, 30), motifs: motifs.slice(0, 30) });
          }
        });
      }
      var mixtes = Object.keys(r.mixtes || {}).map(function(id) { var x = r.mixtes[id]; return noms[id] + ' : apprenti ' + (x.debut ? 'à partir du ' + x.debut : '') + (x.fin ? ' jusqu’au ' + x.fin : ''); });
      lignes.push({ mixtes: mixtes, famille: c.famille, niveau: c.niveau, classe: c.nom, classeId: c.id, periode: p.libelle, periodeSource: p.libelleSource, periodeType: p.type, periodeGroupe: p.groupe,
        periodeId: p.id, debut: p.debut, fin: p.fin, nouveau: nouv, actuel: act, ecarts: ecarts, sansComparaison: !q });
    });
  });
  return {
    version: EUC_SUIVI2_VERSION_, annee: m.annee, temoin: m.temoin, calculeLe: m.calculeLe, depuisCache: !!m.depuisCache,
    calculMs: m.calculMs || 0, moteurMs: t1 - t0, actuelsMs: t2 - t1, erreursActuels: actuels.erreurs,
    periodesSansClasse: m.periodesSansClasse, lignes: lignes,
    gardeFou: m.gardeFou || {},
    resume: { periodes: lignes.length, avecEcart: lignes.filter(function(l) { return l.ecarts.length; }).length, sansComparaison: lignes.filter(function(l) { return l.sansComparaison; }).length }
  };
}

/* Fiche élève : toutes les lignes Grist qui concernent un élève (dossiers,
 * lignes du calendrier citées, saisies JotForm, apprentissage, fiche
 * entreprise), pour comprendre un écart. Administration seulement. */
function EUC_SUIVI2_ficheEleve(recherche) {
  EUC_SUIVI2_exigerAdmin_();
  var q = EUC_SUIVI2_norm_(recherche); if (q.length < 3) throw new Error('Tapez au moins 3 lettres du nom.');
  var src = EUC_SUIVI2_lireSources_(), F = function(r) { return EUC_SUIVI2_champs_(r); };
  function garder(o, cles) { var x = { id: o.id }; cles.forEach(function(k) { if (o[k] != null && o[k] !== '') x[k] = o[k]; }); return x; }
  var classes = {}; (src.classes || []).map(F).forEach(function(c) { classes[c.id] = EUC_SUIVI2_t_(c.Nom || c.Libelle); });
  var eleves = (src.eleves || []).map(F).filter(function(e) { return EUC_SUIVI2_norm_([e.Nom, e.Prenom_usage || e.Prenom].join(' ')).indexOf(q) >= 0 || EUC_SUIVI2_norm_([e.Prenom_usage || e.Prenom, e.Nom].join(' ')).indexOf(q) >= 0; }).slice(0, 5);
  var periodes = {}; (src.periodes || []).map(F).forEach(function(p) { periodes[p.id] = p; });
  var entreprises = {}; (src.entreprises || []).map(F).forEach(function(f) { entreprises[f.id] = f; });
  return eleves.map(function(e) {
    var eid = Number(e.id), cites = {};
    var dossiers = (src.dossiers || []).map(F).filter(function(a) { return EUC_SUIVI2_ref_(a.Eleve) === eid; }).map(function(a) {
      cites[EUC_SUIVI2_ref_(a.Periode)] = 1;
      var x = garder(a, ['Periode', 'Classe_convention', 'Annee_scolaire', 'Statut', 'Statut_administratif', 'Revoked', 'Supprimee_admin', 'Date_debut', 'Date_fin', 'Date_fin_reelle',
        'Entreprise', 'Entreprise_raison_sociale', 'Entreprise_enseigne', 'Entreprise_siret', 'Entreprise_siret_snapshot', 'Entreprise_nis', 'Entreprise_code_postal', 'Entreprise_commune', 'Entreprise_pays', 'Numero_enregistrement', 'Source', 'Origine']);
      var f = entreprises[EUC_SUIVI2_ref_(a.Entreprise)];
      if (f) x.ficheEntreprise = garder(f, ['Raison_sociale', 'Nom', 'SIRET', 'Siret', 'NIS', 'Code_postal', 'Commune', 'Ville', 'Pays', 'Statut', 'Valide']);
      return x;
    });
    var jotform = (src.jotform || []).map(F).filter(function(j) { return EUC_SUIVI2_ref_(j.Eleve_match_id || j.Eleve) === eid; }).map(function(j) {
      return garder(j, ['Decision', 'Importer', 'SIRET_statut', 'SIRET_normalise', 'SIRET_brut', 'Classe_match_id', 'Periode_numero', 'Date_debut_brut', 'Date_fin_brut', 'Entreprise_nom', 'Entreprise_raison_sociale', 'Entreprise_adresse', 'Entreprise_ville', 'Entreprise_code_postal', 'Entreprise_pays', 'Commentaire']);
    });
    var apprentissage = (src.apprentissage || []).map(F).filter(function(r) { return EUC_SUIVI2_ref_(r.Eleve) === eid; }).map(function(r) {
      return garder(r, ['Annee_scolaire', 'Actif', 'Date_contrat_officielle', 'Date_contrat', 'Date_debut', 'Date_fin', 'Date_rupture_contrat', 'Date_rupture', 'Dossier_transmis_CFA', 'Entreprise', 'Statut']);
    });
    var calendrier = Object.keys(cites).filter(Number).map(function(pid) {
      var p = periodes[pid] || { id: pid, absente: true };
      return garder(p, ['absente', 'Libelle_periode', 'Libelle', 'Nom', 'Type', 'Groupe', 'Classes_concernees', 'Classe', 'Annee_scolaire', 'Date_debut', 'Date_fin', 'Actif']);
    });
    return { id: eid, eleve: [e.Nom, e.Prenom_usage || e.Prenom].join(' '), classe: classes[EUC_SUIVI2_ref_(e.Classe)] || '', actif: e.Actif !== false, presentDernierImport: e.Present_dernier_import !== false,
      dossiers: dossiers, calendrier: calendrier, jotform: jotform, apprentissage: apprentissage };
  });
}
