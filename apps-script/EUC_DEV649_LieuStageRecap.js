/**
 * DEV649 — Lieu de stage distinct du siège, entreprise non diffusible, récapitulatif complet des dépôts.
 *
 * 1. Lieu de stage (facultatif) : quand l'élève travaille ailleurs qu'au siège (chantier, atelier, locaux
 *    d'un autre garage…), son adresse est saisie à part. La convention garde le siège ; le suivi, les
 *    ordres de mission et la carte utilisent le lieu de stage pour les visites.
 * 2. Récapitulatif : un seul modèle de courriel pour les deux entrées (page du QR code et formulaire en
 *    ligne), comme l'ancien JotForm : élève, période, entreprise, lieu de stage mis en évidence, responsable,
 *    tuteur, et ce que l'élève doit faire au bureau G205.
 */
function EUC_DEV649_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV649_html_(v) { return EUC_DEV649_t_(v).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* Saisie du lieu de stage (calcul pur) : champs de formulaire lieuStageAdresse / lieuStageCodePostal / lieuStageCommune. */
function EUC_DEV649_lieuSaisi_(d) {
  d = d || {};
  var l = { adresse: EUC_DEV649_t_(d.lieuStageAdresse).slice(0, 300), cp: EUC_DEV649_t_(d.lieuStageCodePostal).slice(0, 20), commune: EUC_DEV649_t_(d.lieuStageCommune).slice(0, 150) };
  if ((l.adresse || l.cp) && !l.commune) throw new Error('Lieu du stage : indique aussi la ville (ou laisse ces champs vides si le stage a lieu au siège).');
  if (l.commune && !l.adresse) throw new Error('Lieu du stage : indique aussi l’adresse (ou laisse ces champs vides si le stage a lieu au siège).');
  return l;
}
/* Adresse du lieu de stage d'une convention (calcul pur) ; vide si le stage a lieu au siège. */
function EUC_DEV649_lieuTexte_(a) {
  a = a || {};
  var adr = EUC_DEV649_t_(a.Lieu_stage_adresse), ville = [EUC_DEV649_t_(a.Lieu_stage_code_postal), EUC_DEV649_t_(a.Lieu_stage_commune)].filter(Boolean).join(' ');
  /* DEV662 : un lieu enregistré avant DEV659 qui recopie le siège n'est plus affiché (visites au siège). */
  if (EUC_DEV649_t_(a.Entreprise_commune) && EUC_DEV659_comparerLieu_({ adresse: a.Lieu_stage_adresse, commune: a.Lieu_stage_commune },
    { adresse: [EUC_DEV649_t_(a.Entreprise_adresse), EUC_DEV649_t_(a.Entreprise_complement)].filter(Boolean).join(', '), commune: a.Entreprise_commune }) === 'IDENTIQUE') return '';
  return [adr, ville].filter(Boolean).join(', ');
}
/* DEV659 : lieu saisi comparé au siège (calcul pur). Des élèves recopient le siège dans « lieu du stage » :
 * le courriel annonçait alors à tort « lieu différent du siège ».
 *  - 'VIDE'       : rien de saisi ;
 *  - 'IDENTIQUE'  : même voie, même ville, même numéro (ou aucun numéro saisi) → lieu ignoré, visites au siège ;
 *  - 'PRECISION'  : même voie, même ville, mais un numéro que le siège n'a pas → gardé comme adresse précise, sans alerte ;
 *  - 'DIFFERENT'  : autre voie, autre ville ou autre numéro → alerte « lieu différent du siège ».
 * Majuscules, accents, ponctuation, type de voie (rue, avenue…), code postal et ville recopiés dans l'adresse sont
 * ignorés ; une faute de frappe légère sur le nom de la voie est tolérée (une erreur pour quatre lettres). */
var EUC_DEV659_MOTS_VOIE_ = ['RUE', 'R', 'AVENUE', 'AV', 'AVE', 'BOULEVARD', 'BD', 'BLVD', 'CHEMIN', 'CH', 'CHE', 'ROUTE', 'RTE', 'RT', 'PLACE', 'PL', 'ALLEE', 'ALL', 'IMPASSE', 'IMP', 'QUAI', 'COURS', 'CRS', 'MONTEE', 'TRAVERSE', 'TRAV', 'SQUARE', 'SQ', 'ESPLANADE', 'PROMENADE', 'PROM', 'CORNICHE', 'LOTISSEMENT', 'LOT', 'RESIDENCE', 'RES', 'VOIE', 'DE', 'DES', 'DU', 'LA', 'LE', 'LES', 'L', 'D', 'ET', 'AUX', 'AU'];
function EUC_DEV659_norm_(v) { return EUC_DEV649_t_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9,]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function EUC_DEV659_ville_(v) { return EUC_DEV659_norm_(v).replace(/\bCEDEX\b.*$/, '').replace(/[^A-Z]/g, '').replace(/^ST(?=[A-Z])/, 'SAINT'); }
/* Voies d'une adresse : pour chaque morceau entre virgules, { voie, numeros } ; la ville et le code postal sont retirés. */
function EUC_DEV659_voies_(adresse, communes) {
  var villes = (communes || []).map(EUC_DEV659_ville_).filter(Boolean);
  return EUC_DEV659_norm_(adresse).split(',').map(function(m) {
    m = m.trim().replace(/\s\d{5}(\s.*)?$/, '').replace(/^\d{5}(\s.*)?$/, '').trim();
    if (!m || villes.indexOf(m.replace(/[^A-Z]/g, '').replace(/^ST(?=[A-Z])/, 'SAINT')) >= 0) return null;
    var numeros = [], mots = [];
    m.split(' ').forEach(function(x) {
      if (/^\d{1,4}[A-Z]?$/.test(x)) numeros.push(x.replace(/[A-Z]$/, ''));
      else if (/^(BIS|TER|B|T)$/.test(x) && numeros.length) return;
      else if (EUC_DEV659_MOTS_VOIE_.indexOf(x) < 0) mots.push(x);
    });
    return mots.length ? { voie: mots.join(''), numeros: numeros } : null;
  }).filter(Boolean);
}
function EUC_DEV659_distance_(a, b) {
  var d = [], i, j;
  for (i = 0; i <= a.length; i++) d[i] = [i];
  for (j = 0; j <= b.length; j++) d[0][j] = j;
  for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function EUC_DEV659_comparerLieu_(lieu, siege) {
  lieu = lieu || {}; siege = siege || {};
  if (!EUC_DEV649_t_(lieu.adresse) && !EUC_DEV649_t_(lieu.commune)) return 'VIDE';
  var vl = EUC_DEV659_ville_(lieu.commune), vs = EUC_DEV659_ville_(siege.commune);
  if (!vl || !vs || vl !== vs) return 'DIFFERENT';
  var communes = [lieu.commune, siege.commune];
  var sv = EUC_DEV659_voies_(siege.adresse, communes), lv = EUC_DEV659_voies_(lieu.adresse, communes);
  if (!sv.length || !lv.length) return 'DIFFERENT';
  var s = sv[0], meilleur = null;
  lv.forEach(function(l) {
    var dist = EUC_DEV659_distance_(l.voie, s.voie);
    if (dist <= Math.floor(Math.max(l.voie.length, s.voie.length) / 4) && (!meilleur || dist < meilleur.dist)) meilleur = { dist: dist, numeros: l.numeros };
  });
  if (!meilleur) return 'DIFFERENT';
  var nl = meilleur.numeros.filter(function(n, i, a) { return a.indexOf(n) === i; }), ns = s.numeros;
  if (!nl.length) return 'IDENTIQUE';
  if (!ns.length) return 'PRECISION';
  return nl.every(function(n) { return ns.indexOf(n) >= 0; }) ? 'IDENTIQUE' : 'DIFFERENT';
}
/* Lieu à enregistrer : vidé s'il recopie le siège. */
function EUC_DEV659_lieuRetenu_(lieu, siege) {
  return EUC_DEV659_comparerLieu_(lieu, siege) === 'IDENTIQUE' ? { adresse: '', cp: '', commune: '' } : (lieu || { adresse: '', cp: '', commune: '' });
}
/* Adresse à visiter (calcul pur) : le lieu de stage s'il existe, sinon le siège. */
function EUC_DEV649_adresseVisite_(lieu, siege) { return EUC_DEV649_t_(lieu) || EUC_DEV649_t_(siege); }

/* DEV650 : entreprise non diffusible : l'annuaire data.gouv (INSEE) masque nom et adresse, mais le registre
 * national des entreprises (INPI, data.inpi.fr) les publie, sans compte. Le site INPI est protégé contre les robots :
 * pas d'interrogation automatique, un lien vers sa recherche avancée par SIRET (établissements actifs et radiés,
 * personnes morales et physiques). SIREN seul (9 chiffres) : fiche de l'entreprise. */
function EUC_DEV649_lienInpi_(id) {
  var n = String(id == null ? '' : id).replace(/\D/g, '');
  if (n.length === 9) return 'https://data.inpi.fr/entreprises/' + n;
  if (n.length !== 14) return '';
  var champs = [];
  ['personneMorale', 'personnePhysique'].forEach(function(t) { ['etablissementPrincipal', 'autresEtablissements'].forEach(function(e) {
    var c = 'formality.content.' + t + '.' + e + '.descriptionEtablissement.siret'; champs.push(c, c + '.whitespace_remove'); }); });
  var q = { checkboxes: { status: { order: 0, searchField: ['is_rad'], values: [{ value: 'false', checked: true }, { value: 'true', checked: true }] } },
    texts: { siret: { order: 3, searchField: champs, checkedSearchField: [], value: n } }, multipleSelects: {}, dates: {} };
  return 'https://data.inpi.fr/recherche_avancee/entreprises?advancedSearch=' + encodeURIComponent(JSON.stringify(q));
}
function EUC_DEV649_dateFr_(v) {
  var s = EUC_DEV649_t_(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : s;
}
function EUC_DEV649_personne_(p) {
  p = p || {};
  return { nom: [EUC_DEV649_t_(p.civilite), EUC_DEV649_t_(p.prenom), EUC_DEV649_t_(p.nom)].filter(Boolean).join(' '), fonction: EUC_DEV649_t_(p.fonction), tel: EUC_DEV649_t_(p.telephone), mail: EUC_DEV649_t_(p.courriel) };
}

/* Récapitulatif (calcul pur) → { texte, html }.
 * info = { source, numero, intro, eleve:{nom,prenom,naissance,classe,adresse,telephone,courriel},
 *   periode:{libelle,debut,fin}, entreprise:{nom,enseigne,identifiant,adresse,telephone,courriel,nonDiffusible},
 *   lieu, responsable:{civilite,prenom,nom,fonction,telephone,courriel}, tuteur:{…}, tuteurEstResponsable,
 *   g205:{requis,motif}, pp:[noms], signature } */
/* Rappel commun aux accusés de dépôt (page du QR code et formulaire en ligne). */
var EUC_DEV649_INTRO_DEPOT_ = 'Déclaration reçue.';
var EUC_DEV649_RAPPEL_SIGNATURES_ = 'Rappel : l’original papier de la convention doit être signé par l’élève et, s’il est mineur, par ses représentants légaux, par l’enseignant référent, par le tuteur et par le représentant de l’entreprise, puis déposé au secrétariat de Madame la Proviseure adjointe. La convention de PFMP n’est valable qu’après la signature de Monsieur le Proviseur : la PFMP ne peut pas débuter avant.';
function EUC_DEV649_recap_(info) {
  info = info || {};
  var T = EUC_DEV649_t_, H = EUC_DEV649_html_, e = info.eleve || {}, p = info.periode || {}, ent = info.entreprise || {}, g = info.g205 || {};
  var resp = EUC_DEV649_personne_(info.responsable), tut = info.tuteurEstResponsable ? resp : EUC_DEV649_personne_(info.tuteur), lieu = T(info.lieu), precis = !!info.lieuPrecision;
  var dates = [EUC_DEV649_dateFr_(p.debut), EUC_DEV649_dateFr_(p.fin)].filter(Boolean).join(' au ');
  var blocs = [
    ['Élève', [['Nom', [T(e.prenom), T(e.nom)].filter(Boolean).join(' ')], ['Date de naissance', EUC_DEV649_dateFr_(e.naissance)], ['Classe', e.classe], ['Adresse personnelle', e.adresse], ['Téléphone', e.telephone], ['Courriel', e.courriel]]],
    ['Période de stage', [['Période', p.libelle], ['Dates', dates]]],
    ['Entreprise (siège, signataire de la convention)', [['Nom', [T(ent.nom), T(ent.enseigne) && T(ent.enseigne) !== T(ent.nom) ? '(' + T(ent.enseigne) + ')' : ''].filter(Boolean).join(' ')], ['SIRET / NIS', ent.identifiant], ['Adresse du siège', ent.adresse], ['Téléphone', ent.telephone], ['Courriel', ent.courriel]]],
    ['Responsable dans l’entreprise', [['Nom', resp.nom], ['Fonction', resp.fonction], ['Téléphone', resp.tel], ['Courriel', resp.mail]]],
    ['Tuteur' + (info.tuteurEstResponsable ? ' (le responsable)' : ''), [['Nom', tut.nom], ['Fonction', tut.fonction], ['Téléphone', tut.tel], ['Courriel', tut.mail]]]
  ];
  var nd = ent.nonDiffusible ? 'Entreprise « non diffusible » sur l’annuaire data.gouv (INSEE) : nom et adresse saisis par l’élève, à vérifier sur le registre de l’INPI.' : '';
  var inpi = ent.nonDiffusible ? EUC_DEV649_lienInpi_(ent.identifiant) : '';
  var g205 = g.requis ? (info.equipe ? 'À FAIRE PAR L’ÉLÈVE : passer' : 'À FAIRE : passer') + ' au bureau G205 (bureau des formations et des entreprises) pour finaliser la convention' + (T(g.motif) ? ' — ' + T(g.motif) : '') + '.' : '';
  var suite = EUC_DEV649_RAPPEL_SIGNATURES_;
  /* Texte brut */
  var lignes = [];
  if (T(info.intro)) lignes.push(T(info.intro).replace(/ {2,}/g, ' '), '');
  lignes.push('Numéro d’enregistrement : ' + T(info.numero) + (T(info.source) ? ' (' + T(info.source) + ')' : ''), '');
  if (g205) lignes.push('!!! ' + g205, '');
  if (lieu && !precis) lignes.push('!!! LIEU DU STAGE DIFFÉRENT DU SIÈGE — les visites se font à cette adresse : ' + lieu, '');
  if (nd) { lignes.push('!!! ' + nd); if (inpi) lignes.push('Fiche INPI : ' + inpi); lignes.push(''); }
  blocs.forEach(function(b) {
    lignes.push('— ' + b[0] + ' —');
    b[1].forEach(function(l) { if (T(l[1])) lignes.push(l[0] + ' : ' + T(l[1])); });
    if (b[0].indexOf('Entreprise') === 0 && lieu) lignes.push((precis ? 'Adresse précise du stage : ' : 'LIEU DU STAGE : ') + lieu);
    lignes.push('');
  });
  if ((info.pp || []).length) lignes.push('Professeur principal : ' + info.pp.join(' / '), '');
  lignes.push(suite);
  if (T(info.signature)) lignes.push('', T(info.signature));
  /* HTML */
  var alerte = function(texte, fond, bord) { return '<div style="margin:12px 0;padding:12px 14px;background:' + fond + ';border:2px solid ' + bord + ';border-radius:8px;font-weight:bold;color:#3b0d0c">' + H(texte) + '</div>'; };
  var html = ['<div style="font-family:Arial,sans-serif;font-size:14px;color:#16302a;max-width:680px">'];
  if (T(info.intro)) html.push('<p>' + H(info.intro).replace(/\n/g, '<br>') + '</p>');
  html.push('<p style="font-size:16px">Numéro d’enregistrement : <b>' + H(info.numero) + '</b>' + (T(info.source) ? ' <span style="color:#5b6b66">(' + H(info.source) + ')</span>' : '') + '</p>');
  if (g205) html.push(alerte('⚠ ' + g205, '#fde8e8', '#b42318'));
  if (lieu && !precis) html.push('<div style="margin:12px 0;padding:12px 14px;background:#fff7d6;border:2px solid #d97706;border-radius:8px"><div style="font-weight:bold;color:#92400e;text-transform:uppercase">⚠ Lieu du stage différent du siège</div><div style="font-size:16px;font-weight:bold;margin-top:4px">' + H(lieu) + '</div><div style="color:#92400e;margin-top:4px">Les visites du professeur se font à cette adresse. Prendre rendez-vous par téléphone avec le tuteur.</div></div>');
  if (nd) html.push('<div style="margin:12px 0;padding:12px 14px;background:#fff7d6;border:2px solid #d97706;border-radius:8px;font-weight:bold;color:#3b0d0c">' + H('⚠ ' + nd) + (inpi ? '<div style="margin-top:6px"><a href="' + H(inpi) + '" style="color:#0b5cad">Ouvrir la fiche de l’entreprise sur data.inpi.fr</a></div>' : '') + '</div>');
  blocs.forEach(function(b) {
    var rows = b[1].filter(function(l) { return T(l[1]); }).map(function(l) { return '<tr><td style="padding:4px 10px 4px 0;color:#5b6b66;vertical-align:top;white-space:nowrap">' + H(l[0]) + '</td><td style="padding:4px 0">' + H(l[1]) + '</td></tr>'; });
    if (b[0].indexOf('Entreprise') === 0 && lieu && precis) rows.push('<tr><td style="padding:4px 10px 4px 0;color:#5b6b66;vertical-align:top;white-space:nowrap">Adresse précise du stage</td><td style="padding:4px 0">' + H(lieu) + '</td></tr>');
    else if (b[0].indexOf('Entreprise') === 0 && lieu) rows.push('<tr><td style="padding:4px 10px 4px 0;color:#92400e;font-weight:bold;white-space:nowrap">Lieu du stage</td><td style="padding:4px 0;font-weight:bold;color:#92400e">' + H(lieu) + '</td></tr>');
    if (rows.length) html.push('<h3 style="margin:16px 0 4px;font-size:15px;color:#0b6b4f">' + H(b[0]) + '</h3><table style="border-collapse:collapse">' + rows.join('') + '</table>');
  });
  if ((info.pp || []).length) html.push('<p style="color:#5b6b66">Professeur principal : ' + H(info.pp.join(' / ')) + '</p>');
  /* « enseignant référent » en gras dans le courriel HTML. */
  html.push('<p style="margin-top:16px">' + H(suite).replace('enseignant référent', '<b>enseignant référent</b>') + '</p>');
  if (T(info.signature)) html.push('<p>' + H(info.signature).replace(/\n/g, '<br>') + '</p>');
  html.push('</div>');
  return { texte: lignes.join('\n'), html: html.join('') };
}

/* Copie de tous les dépôts : lignes cochées « Dépôts et numéros de convention » dans « Destinataires & envois ». */
function EUC_DEV649_copieDepots_() {
  try { return typeof EUC_DEV598_copie_ === 'function' ? EUC_DEV598_copie_('DEPOTS_CONVENTIONS').split(',').filter(Boolean) : []; } catch (e) { return []; }
}

/* Adresse personnelle de l'élève (fiche EUC_ELEVES_PFMP, colonnes selon les imports). */
function EUC_DEV649_adresseEleve_(e) {
  e = e || {};
  var P = function() { for (var i = 0; i < arguments.length; i++) { var v = EUC_DEV649_t_(arguments[i]); if (v) return v; } return ''; };
  var adr = P(e.Adresse, e.Adresse_postale, e.Adresse_1, e.Adresse1), ville = [P(e.Code_postal, e.CP), P(e.Ville, e.Commune)].filter(Boolean).join(' ');
  return { adresse: [adr, ville].filter(Boolean).join(', '), telephone: P(e.Telephone_portable, e.Portable, e.Telephone, e.Tel), naissance: P(e.Date_naissance) };
}

/* Informations du récapitulatif pour une convention enregistrée par la page du QR code (calcul pur). */
function EUC_DEV649_infoAcces_(d, intro, signature) {
  d = d || {};
  var a = d.acces || {}, T = EUC_DEV649_t_, f = EUC_DEV649_adresseEleve_(d.fiche);
  var monaco = /monaco/i.test(T(a.Entreprise_pays)) || T(a.Entreprise_identifiant_type) === 'NIS';
  var nd = a.Entreprise_non_diffusible === true || T(a.Entreprise_validation_statut) === 'A_VERIFIER_NON_DIFFUSIBLE';
  var aValider = monaco && T(a.Entreprise_validation_statut) === 'A_VALIDER';
  var motifs = [];
  if (aValider) motifs.push('entreprise de Monaco à valider : apporter son NIS et ses coordonnées');
  return {
    /* Même accusé que le formulaire en ligne : « Déclaration reçue. », le récapitulatif puis le rappel des signatures. */
    source: 'page du QR code', numero: d.numero, intro: EUC_DEV649_INTRO_DEPOT_, signature: signature,
    eleve: { nom: d.eleve && d.eleve.nom, prenom: d.eleve && d.eleve.prenom, naissance: f.naissance, classe: d.classe, adresse: f.adresse, telephone: f.telephone, courriel: d.eleve && d.eleve.email },
    periode: { libelle: a.Periode_libelle, debut: d.dateDebut, fin: d.dateFin },
    entreprise: { nom: a.Entreprise_raison_sociale, enseigne: a.Entreprise_enseigne, identifiant: T(a.Entreprise_siret) || T(a.Entreprise_nis),
      adresse: [T(a.Entreprise_adresse), T(a.Entreprise_complement), [T(a.Entreprise_code_postal), T(a.Entreprise_commune)].filter(Boolean).join(' '), monaco ? 'Monaco' : ''].filter(Boolean).join(', '),
      telephone: a.Entreprise_telephone, courriel: a.Entreprise_courriel, nonDiffusible: nd },
    lieu: EUC_DEV649_lieuTexte_(a),
    lieuPrecision: EUC_DEV659_comparerLieu_({ adresse: a.Lieu_stage_adresse, cp: a.Lieu_stage_code_postal, commune: a.Lieu_stage_commune }, { adresse: [T(a.Entreprise_adresse), T(a.Entreprise_complement)].filter(Boolean).join(', '), commune: a.Entreprise_commune }) === 'PRECISION',
    responsable: { civilite: a.Responsable_civilite, prenom: a.Responsable_prenom, nom: a.Responsable_nom, fonction: a.Responsable_fonction, telephone: a.Responsable_telephone, courriel: a.Responsable_courriel },
    tuteur: { civilite: a.Tuteur_civilite, prenom: a.Tuteur_prenom, nom: a.Tuteur_nom, fonction: a.Tuteur_fonction, telephone: a.Tuteur_telephone, courriel: a.Tuteur_courriel },
    tuteurEstResponsable: a.Tuteur_est_responsable === true,
    g205: { requis: motifs.length > 0, motif: motifs.join(' ; ') }, pp: d.ppNoms || []
  };
}

/* Colonnes de la table d'attente (import) pour le lieu de stage et l'entreprise non diffusible. */
var EUC_DEV649_COLONNES_TAMPON_ = [['Lieu_stage_adresse', 'Lieu de stage — adresse', 'Text'], ['Lieu_stage_code_postal', 'Lieu de stage — code postal', 'Text'], ['Lieu_stage_commune', 'Lieu de stage — commune', 'Text'], ['Entreprise_non_diffusible', 'Entreprise non diffusible', 'Bool']];
function EUC_DEV649_assurerColonnesTampon_() {
  var cache = null; try { cache = CacheService.getScriptCache(); if (cache.get('EUC_DEV649_TAMPON_OK') === 'OK') return; } catch (e) {}
  var t = encodeURIComponent(EUC_V160_TABLE_), have = {};
  (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).forEach(function(c) { have[c.id] = true; });
  var manque = EUC_DEV649_COLONNES_TAMPON_.filter(function(c) { return !have[c[0]]; }).map(function(c) { return { id: c[0], fields: { label: c[1], type: c[2] } }; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: manque });
  try { if (cache) cache.put('EUC_DEV649_TAMPON_OK', 'OK', 21600); } catch (e2) {}
}
/* Ajoute à une ligne de la table d'attente le lieu de stage et le signalement « non diffusible ». */
function EUC_DEV649_ligneTampon_(ligne, ent) {
  ent = ent || {};
  var l = ent.lieu || {};
  if (l.adresse || l.commune) { ligne.Lieu_stage_adresse = l.adresse; ligne.Lieu_stage_code_postal = l.cp; ligne.Lieu_stage_commune = l.commune; }
  if (ent.nonDiffusible) {
    ligne.Entreprise_non_diffusible = true; ligne.Raison_sociale_officielle = ''; ligne.Adresse_officielle = ''; ligne.Entreprise_saisie = ent.enseigne || ent.raisonSociale;
    ligne.Niveau_controle = 'ORANGE'; ligne.Decision = 'A_CONTROLER';
    ligne.Alertes = [EUC_DEV649_t_(ligne.Alertes), 'Entreprise non diffusible à l’INSEE : nom et adresse saisis par l’élève, à vérifier sur l’INPI' + (EUC_DEV649_lienInpi_(ent.siret) ? ' (' + EUC_DEV649_lienInpi_(ent.siret) + ')' : '')].filter(Boolean).join(' · ');
  }
  if (ligne.Lieu_stage_adresse || ligne.Entreprise_non_diffusible) try { EUC_DEV649_assurerColonnesTampon_(); } catch (e) {}
  return ligne;
}
/* Accusé de dépôt du formulaire en ligne avec le récapitulatif complet : élève + copie (bureau, prof principal). */
function EUC_DEV649_accuseComplet_(email, eleve, classe, numero, probleme, classeId, detail) {
  try {
    var ent = detail.ent || {}, f = EUC_DEV649_adresseEleve_(detail.fiche), T = EUC_DEV649_t_;
    var motifs = [];
    if (probleme) motifs.push('entreprise non vérifiée' + (detail.message ? ' (message : ' + T(detail.message) + ')' : '') + ' : venir avec les coordonnées complètes de l’entreprise');
    var info = {
      source: 'formulaire en ligne', numero: numero,
      intro: probleme ? 'Demande reçue : l’entreprise n’a pas pu être vérifiée automatiquement.' : EUC_DEV649_INTRO_DEPOT_,
      eleve: { nom: eleve.nom, prenom: eleve.prenom, naissance: eleve.naissance || f.naissance, classe: classe, adresse: f.adresse, telephone: f.telephone, courriel: email },
      periode: { libelle: detail.periode && detail.periode.libelle, debut: detail.periode && detail.periode.debut, fin: detail.periode && detail.periode.fin },
      entreprise: { nom: ent.raisonSociale, enseigne: ent.enseigne, identifiant: ent.siret, adresse: [T(ent.adresse), T(ent.complement), [T(ent.codePostal), T(ent.commune)].filter(Boolean).join(' '), ent.pays === 'MC' ? 'Monaco' : ''].filter(Boolean).join(', '),
        telephone: ent.telephone, courriel: ent.courriel, nonDiffusible: !!ent.nonDiffusible },
      lieu: EUC_DEV649_lieuTexte_({ Lieu_stage_adresse: (ent.lieu || {}).adresse, Lieu_stage_code_postal: (ent.lieu || {}).cp, Lieu_stage_commune: (ent.lieu || {}).commune }),
      lieuPrecision: EUC_DEV659_comparerLieu_(ent.lieu, { adresse: [T(ent.adresse), T(ent.complement)].filter(Boolean).join(', '), commune: ent.commune }) === 'PRECISION',
      responsable: detail.resp, tuteur: detail.tut, tuteurEstResponsable: detail.tuteurEstResponsable,
      g205: { requis: motifs.length > 0, motif: motifs.join(' ; ') },
      signature: 'Bureau des formations et des entreprises — bureau G205\nLycée Les Eucalyptus'
    };
    var r = EUC_DEV649_recap_(info), sujet = (probleme ? '[À traiter au bureau G205] ' : '[Dépôt] ') + numero + ' — ' + T(eleve.prenom) + ' ' + T(eleve.nom) + ' (' + T(classe) + ')';
    var copie = EUC_DEV649_copieDepots_();
    if (typeof EUC_DEV603_ppEmails_ === 'function') copie = copie.concat(EUC_DEV603_ppEmails_(classeId));
    copie = copie.filter(function(v, i, a) { return v && a.indexOf(v) === i && v !== T(email).toLowerCase(); });
    /* DEV663 : l'équipe reçoit un courriel séparé, rédigé pour elle, avec le tableau à jour de la classe et de la période. */
    var equipe = copie.length && typeof EUC_DEV663_recapEquipe_ === 'function' ? EUC_DEV663_recapEquipe_(info, classeId, detail.periode && detail.periode.id, eleve.id, numero) : { texte: r.texte, html: r.html, pj: [] };
    if (email) MailApp.sendEmail({ to: email, replyTo: copie.join(',') || undefined, name: 'Lycée Les Eucalyptus — PFMP', subject: (probleme ? 'Ta demande d’aide pour ton entreprise de stage — ' : 'Ta convention de stage — numéro d’enregistrement ') + numero, body: r.texte, htmlBody: r.html });
    if (copie.length) MailApp.sendEmail({ to: copie.join(','), name: 'Lycée Les Eucalyptus — PFMP', subject: sujet, body: equipe.texte, htmlBody: equipe.html, attachments: equipe.pj.length ? equipe.pj : undefined });
  } catch (e) { console.log('DEV649 accusé : ' + (e && e.message || e)); }
}

/* Colonnes du lieu de stage et du signalement « non diffusible » dans la table des conventions. */
var EUC_DEV649_COLONNES_ACCES_ = [['Lieu_stage_adresse', 'Lieu de stage — adresse', 'Text'], ['Lieu_stage_code_postal', 'Lieu de stage — code postal', 'Text'], ['Lieu_stage_commune', 'Lieu de stage — commune', 'Text'], ['Entreprise_non_diffusible', 'Entreprise non diffusible', 'Bool']];
function EUC_DEV649_assurerColonnesAcces_() {
  var cache = null; try { cache = CacheService.getScriptCache(); if (cache.get('EUC_DEV649_ACCES_OK') === 'OK') return; } catch (e) {}
  var t = encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_), have = {};
  (EUC_ENT_grist('get', '/tables/' + t + '/columns').columns || []).forEach(function(c) { have[c.id] = true; });
  var manque = EUC_DEV649_COLONNES_ACCES_.filter(function(c) { return !have[c[0]]; }).map(function(c) { return { id: c[0], fields: { label: c[1], type: c[2] } }; });
  if (manque.length) EUC_ENT_grist('post', '/tables/' + t + '/columns', { columns: manque });
  try { if (cache) cache.put('EUC_DEV649_ACCES_OK', 'OK', 21600); } catch (e2) {}
}
