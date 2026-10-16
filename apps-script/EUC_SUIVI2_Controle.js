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
            });
            ecarts.push({ categorie: x[0], nouveau: x[1].length, actuel: EUC_SUIVI2_n_(x[2]), enPlus: plus.slice(0, 30), enMoins: moins.slice(0, 30), motifs: motifs.slice(0, 30) });
          }
        });
      }
      lignes.push({ famille: c.famille, niveau: c.niveau, classe: c.nom, classeId: c.id, periode: p.libelle, periodeSource: p.libelleSource, periodeType: p.type, periodeGroupe: p.groupe,
        periodeId: p.id, debut: p.debut, fin: p.fin, nouveau: nouv, actuel: act, ecarts: ecarts, sansComparaison: !q });
    });
  });
  return {
    version: EUC_SUIVI2_VERSION_, annee: m.annee, temoin: m.temoin, calculeLe: m.calculeLe, depuisCache: !!m.depuisCache,
    calculMs: m.calculMs || 0, moteurMs: t1 - t0, actuelsMs: t2 - t1, erreursActuels: actuels.erreurs,
    periodesSansClasse: m.periodesSansClasse, lignes: lignes,
    structureJotform: (function() { try { return EUC_SUIVI2_structureJotform_(); } catch (e) { return { erreur: String(e && e.message || e) }; } })(),
    resume: { periodes: lignes.length, avecEcart: lignes.filter(function(l) { return l.ecarts.length; }).length, sansComparaison: lignes.filter(function(l) { return l.sansComparaison; }).length }
  };
}

/* Diagnostic de structure JotForm : noms des colonnes et champs liés aux
 * dates, avec le seul FORMAT de leur valeur (chiffres → 9, lettres → a). */
function EUC_SUIVI2_formatSeul_(v) {
  if (v == null) return '';
  if (typeof v === 'object') return '{' + Object.keys(v).slice(0, 6).join(',') + '}';
  return String(v).slice(0, 40).replace(/[0-9]/g, '9').replace(/[A-Za-zÀ-ÿ]/g, 'a');
}
function EUC_SUIVI2_structureJotform_() {
  var g = EUC_SUIVI2_grist_(), rep = UrlFetchApp.fetch(g.base + '/tables/EUC_MIGRATION_JOTFORM_PFMP/records?limit=400', { headers: g.entetes, muteHttpExceptions: true });
  if (rep.getResponseCode() !== 200) return { erreur: 'lecture ' + rep.getResponseCode() };
  var lignes = (JSON.parse(rep.getContentText()).records || []).filter(function(r) { return EUC_SUIVI2_t_(r.fields.SIRET_statut).toUpperCase() === 'VERIFIE'; }).slice(0, 3);
  return lignes.map(function(r) {
    var f = r.fields, colonnes = {}, brut = {};
    Object.keys(f).forEach(function(k) { if (/date|debut|fin|periode|soumi|created|envoi/i.test(k)) colonnes[k] = EUC_SUIVI2_formatSeul_(f[k]); });
    var raw = f.Raw_JSON || f.Raw_json || f.Donnees_brutes;
    try { raw = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { raw = null; }
    Object.keys(raw || {}).forEach(function(k) {
      var v = raw[k], libelle = v && typeof v === 'object' && v.text ? v.text : k;
      if (/date|d[ée]but|fin|p[ée]riode/i.test(libelle + ' ' + k)) brut[k + (libelle !== k ? ' « ' + libelle + ' »' : '')] = EUC_SUIVI2_formatSeul_(v && typeof v === 'object' && 'answer' in v ? v.answer : v);
    });
    return { colonnes: colonnes, reponseBrute: brut, typeReponseBrute: raw ? (Array.isArray(raw) ? 'tableau' : 'objet') : 'absente' };
  });
}
