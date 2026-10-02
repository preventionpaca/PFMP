/**
 * Eucalyptus PFMP — v1.0.0-dev.273g
 * Résolution explicite d'une divergence de date de naissance Pronote / Grist.
 */
function EUC_DEV273G_txt_(v){
  return String(v == null ? '' : v).trim();
}

function EUC_DEV273G_norm_(v){
  return EUC_DEV273G_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function EUC_DEV273G_iso_(v){
  if (v === null || v === undefined || v === '') return '';

  try {
    if (typeof EUC_IMPORT_dateExistanteISO_ === 'function') {
      var a = EUC_IMPORT_dateExistanteISO_(v);
      if (a) return a;
    }
  } catch (e) {}

  try {
    if (typeof EUC_SUIVI_dateISO_ === 'function') {
      var b = EUC_SUIVI_dateISO_(v);
      if (b) return b;
    }
  } catch (e2) {}

  var s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) {
    return m[3] + '-' +
      String(m[2]).padStart(2, '0') + '-' +
      String(m[1]).padStart(2, '0');
  }

  return '';
}

function EUC_DEV273G_fr_(iso){
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
}

function EUC_DEV273G_dateGrist_(iso){
  if (typeof EUC_IMPORT_dateGrist_ === 'function') {
    return EUC_IMPORT_dateGrist_(iso);
  }

  var ms = Date.parse(String(iso || '') + 'T00:00:00Z');
  return isFinite(ms) ? ms / 1000 : null;
}

function EUC_DEV273G_parse_(payload){
  payload = payload || {};
  var texte = String(payload.texte || '');

  if (!texte.trim()) {
    throw new Error('Aucune donnée Pronote disponible.');
  }

  var parsed;

  if (typeof EUC_IMPORT_analyserTexteComplet_ === 'function') {
    parsed = EUC_IMPORT_analyserTexteComplet_(texte, {annee: payload.annee});
  } else if (typeof EUC_IMPORT_analyserTexte_ === 'function') {
    parsed = EUC_IMPORT_analyserTexte_(texte, {annee: payload.annee});
  } else {
    throw new Error('Parseur Pronote introuvable.');
  }

  try {
    if (typeof EUC_IMPORT_extraireProfesseursPrincipaux_ === 'function') {
      EUC_IMPORT_extraireProfesseursPrincipaux_(texte, parsed);
    }
  } catch (e) {}

  return parsed;
}

function EUC_DEV273G_recordsEleves_(){
  try {
    if (typeof EUC_IMPORT_lireRecords_ === 'function') {
      return EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP') || [];
    }
  } catch (e) {}

  var r = EUC_ENT_grist('get', '/tables/EUC_ELEVES_PFMP/records');

  return (r && r.records || []).map(function(x){
    var f = Object.assign({}, x.fields || {});
    f.id = x.id;
    return f;
  });
}

function EUC_DEV273G_findExisting_(r, rows){
  var out = [];

  if (r.numeroNational) {
    out = (rows || []).filter(function(e){
      return EUC_DEV273G_txt_(e.Numero_national) ===
        EUC_DEV273G_txt_(r.numeroNational);
    });
  }

  if (!out.length && r.ident) {
    out = (rows || []).filter(function(e){
      return EUC_DEV273G_txt_(e.Identifiant_Pronote || e.Identifiant_import) ===
        EUC_DEV273G_txt_(r.ident);
    });
  }

  if (!out.length && r.numero) {
    out = (rows || []).filter(function(e){
      return EUC_DEV273G_txt_(e.Numero_Pronote) ===
        EUC_DEV273G_txt_(r.numero);
    });
  }

  if (!out.length) {
    var n = EUC_DEV273G_norm_(r.nom);
    var p = EUC_DEV273G_norm_(r.prenom);

    out = (rows || []).filter(function(e){
      return EUC_DEV273G_norm_(e.Nom) === n &&
        EUC_DEV273G_norm_(e.Prenom_usage || e.Prenom) === p;
    });
  }

  return out.length === 1 ? out[0] : null;
}

function EUC_DEV273G_infoAmbiguite(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload = payload || {};

  var parsed = EUC_DEV273G_parse_(payload);
  var ligne = Number(payload.ligne) || 0;

  var r = (parsed.rows || []).filter(function(x){
    return Number(x.ligne) === ligne;
  })[0];

  if (!r) {
    throw new Error('Ligne Pronote ' + ligne + ' introuvable.');
  }

  var e = EUC_DEV273G_findExisting_(r, EUC_DEV273G_recordsEleves_());

  if (!e) {
    throw new Error('Impossible d’identifier une fiche Grist unique pour cette ligne.');
  }

  var dateGrist = EUC_DEV273G_iso_(e.Date_naissance);
  var datePronote = EUC_DEV273G_iso_(r.naissance);

  if (!dateGrist || !datePronote) {
    throw new Error('Une des deux dates de naissance est absente.');
  }

  return {
    ok: true,
    ligne: ligne,
    nom: r.nom || '',
    prenom: r.prenom || '',
    recordId: Number(e.id) || 0,
    dateGrist: dateGrist,
    dateGristFr: EUC_DEV273G_fr_(dateGrist),
    datePronote: datePronote,
    datePronoteFr: EUC_DEV273G_fr_(datePronote)
  };
}

function EUC_DEV273G_remplacerDateLigne_(texte, ligne, sourceIso, cibleIso){
  var lines = String(texte || '').split(/\r?\n/);
  var idx = Number(ligne) - 1;

  if (idx < 0 || idx >= lines.length) {
    throw new Error('Ligne Pronote introuvable dans le texte source.');
  }

  var changed = false;

  lines[idx] = lines[idx].replace(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})\b/g,
    function(token){
      if (changed) return token;
      if (EUC_DEV273G_iso_(token) !== sourceIso) return token;

      changed = true;

      if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
        return cibleIso;
      }

      var sep = token.indexOf('/') >= 0
        ? '/'
        : token.indexOf('.') >= 0
          ? '.'
          : '-';

      var m = cibleIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      return m
        ? m[3] + sep + m[2] + sep + m[1]
        : cibleIso;
    }
  );

  if (!changed) {
    throw new Error(
      'La date Pronote n’a pas pu être remplacée automatiquement sur la ligne ' +
      ligne +
      '.'
    );
  }

  return lines.join('\n');
}

function EUC_DEV273G_resoudreAmbiguite(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload = payload || {};

  var decision = String(payload.decision || '').toUpperCase();

  if (['GRIST', 'PRONOTE'].indexOf(decision) < 0) {
    throw new Error('Décision invalide.');
  }

  var info = EUC_DEV273G_infoAmbiguite(payload);

  if (decision === 'PRONOTE') {
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_ELEVES_PFMP/records',
      {
        records: [{
          id: info.recordId,
          fields: {
            Date_naissance: EUC_DEV273G_dateGrist_(info.datePronote)
          }
        }]
      }
    );

    return {
      ok: true,
      decision: 'PRONOTE',
      texteCorrige: null,
      message: 'Date Pronote enregistrée dans Grist.'
    };
  }

  return {
    ok: true,
    decision: 'GRIST',
    texteCorrige: EUC_DEV273G_remplacerDateLigne_(
      String(payload.texte || ''),
      info.ligne,
      info.datePronote,
      info.dateGrist
    ),
    message: 'Date Grist conservée pour cet import.'
  };
}
