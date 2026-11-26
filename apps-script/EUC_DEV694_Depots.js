/**
 * DEV694 — Dépôts en ligne (« Déclarer mon entreprise », n° PFMP-…-S…) corrigés dans l'Administration des conventions,
 * et bandeau « À faire » de l'accueil d'administration.
 *
 * Un dépôt au SIRET vérifié (ou au NIS de Monaco reconnu) compte déjà « Convention enregistrée » dans le suivi
 * (DEV666) : il reste dans la table d'attente EUC_MIGRATION_JOTFORM_PFMP, que l'Administration des conventions
 * ne lisait pas. Ses coordonnées (responsable et tuteur : prénom, nom, fonction, téléphone, courriel) se corrigent
 * maintenant là où elles sont, avec un motif obligatoire et un historique avant/après, sans créer de convention.
 * DEV697 : le SIRET (ou le NIS de Monaco) manquant se corrige aussi, sans changer la décision ni prévenir l'élève.
 * Les colonnes lues en priorité par le suivi (Responsable_*, Tuteur_*) sont écrites, ainsi que les anciennes
 * colonnes et le texte d'origine (Raw_JSON), pour que tous les écrans affichent la même valeur.
 *
 * Bandeau : nombre de dépôts qui demandent une action au bureau (même calcul que « Soumissions à traiter ») ;
 * il disparaît dès qu'il n'y a plus rien à faire.
 */
var EUC_DEV694_ROLES_ = { Responsable: 'Responsable', Tuteur: 'Tuteur' };
var EUC_DEV694_PARTIES_ = ['prenom', 'nom', 'fonction', 'telephone', 'courriel'];
/* Anciennes colonnes et libellés du texte d'origine, tenus à jour avec la colonne principale. */
var EUC_DEV694_ECHOS_ = {
  Responsable_prenom: { raw: ['Prénom du responsable'] },
  Responsable_nom: { col: ['Nom_responsable'], raw: ['Nom du responsable'] },
  Responsable_fonction: { raw: ['Fonction du responsable'] },
  Responsable_telephone: { col: ['Telephone_entreprise'], raw: ['Téléphone du responsable', 'Téléphone entreprise'] },
  Responsable_courriel: { col: ['Email_entreprise'], raw: ['E-mail du responsable', "Adresse e-mail de l'entreprise"] },
  Tuteur_prenom: { raw: ['Prénom du tuteur'] },
  Tuteur_nom: { col: ['Nom_tuteur'], raw: ['Nom du tuteur'] },
  Tuteur_fonction: { col: ['Fonction_tuteur'], raw: ['Fonction du tuteur'] },
  Tuteur_telephone: { col: ['Telephone_tuteur'], raw: ['Téléphone du tuteur'] },
  Tuteur_courriel: { col: ['Email_tuteur'], raw: ['Adresse e-mail du tuteur', 'E-mail du tuteur'] }
};
var EUC_DEV694_SUIVI_ = ['Historique_admin_JSON', 'Derniere_correction_admin', 'Auteur_derniere_correction_admin'];

function EUC_DEV694_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV694_cles_() { var l = []; Object.keys(EUC_DEV694_ROLES_).forEach(function(r) { EUC_DEV694_PARTIES_.forEach(function(p) { l.push(r + '_' + p); }); }); return l; }
function EUC_DEV694_numero_(f) { return EUC_DEV694_t_((f || {}).Submission_ID).replace(/^SECOURS-/, ''); }

/* Vue d'un dépôt (calcul pur) : valeurs telles que le suivi les affiche. */
function EUC_DEV694_vue_(r) {
  var f = (r && r.fields) || r || {}, T = EUC_DEV694_t_, c = EUC_SUIVI2_contactsTampon_(f), h = [];
  try { h = JSON.parse(T(f.Historique_admin_JSON) || '[]'); } catch (e) { h = []; }
  var pers = function(x) { return { prenom: T(x.prenom), nom: T(x.nom), fonction: T(x.fonction), telephone: T(x.tel), courriel: T(x.mail) }; };
  return { id: Number(r && r.id) || 0, numero: EUC_DEV694_numero_(f), eleve: T(f.Eleve_match_libelle) || [T(f.Prenom_eleve), T(f.Nom_eleve)].filter(Boolean).join(' '),
    classe: T(f.Classe_match_libelle || f.Classe_saisie), periode: T(f.Periode_numero), entreprise: T(f.Raison_sociale_officielle) || T(f.Nom_commercial) || T(f.Entreprise_saisie),
    siret: T(f.SIRET_normalise || f.NIS_normalise), Entreprise: { identifiant: T(f.SIRET_normalise || f.SIRET_brut).replace(/\D/g, '') || T(f.NIS_normalise || f.NIS_brut) }, decision: T(f.Decision).toUpperCase(),
    dansSuivi: typeof EUC_DEV666_dansSuivi_ === 'function' ? EUC_DEV666_dansSuivi_(f) : true,
    Responsable: pers(c.responsable), Tuteur: pers(c.tuteur), historique: Array.isArray(h) ? h.slice(-20).reverse() : [] };
}

/* Changements retenus (calcul pur) : seuls les champs modifiés, contrôlés et mis en forme comme à la saisie de l'élève.
 * Un champ ne peut pas être vidé (l'ancienne valeur réapparaîtrait par les colonnes d'origine). */
function EUC_DEV694_preparer_(vue, changements, pays, eleve) {
  var T = EUC_DEV694_t_, avant = {}, apres = {}, roles = {};
  changements = changements || {};
  /* DEV697 : SIRET (14 chiffres) ou NIS de Monaco manquant ou erroné (ex. convention saisie sans SIRET). */
  if (Object.prototype.hasOwnProperty.call(changements, 'Entreprise_identifiant')) {
    var brut = T(changements.Entreprise_identifiant), ancienId = T((vue.Entreprise || {}).identifiant);
    if (brut && brut.replace(/[\s.-]+/g, '').toUpperCase() !== ancienId.toUpperCase()) {
      var nisN = brut.toUpperCase().replace(/[\s.-]+/g, '');
      if (/^\d{4}[A-Z]\d{5}$/.test(nisN) || /^EUCMC\d{4,}$/.test(nisN)) { avant.Entreprise_identifiant = ancienId; apres.Entreprise_identifiant = nisN; }
      else {
        var sv = EUC_ENT_validerSiret(brut);
        if (!sv.valide) throw new Error('SIRET / NIS : ' + sv.message + ' (NIS de Monaco : 4 chiffres, une lettre, 5 chiffres).');
        avant.Entreprise_identifiant = ancienId; apres.Entreprise_identifiant = sv.siret;
      }
    } else if (!brut && ancienId) throw new Error('Le SIRET / NIS ne peut pas être vidé (corrigez-le plutôt).');
  }
  EUC_DEV694_cles_().forEach(function(k) {
    if (!Object.prototype.hasOwnProperty.call(changements, k)) return;
    var role = k.split('_')[0], part = k.slice(role.length + 1), ancien = T(vue[role][part]), nv = T(changements[k]).slice(0, 150);
    if (nv === ancien) return;
    if (!nv) throw new Error(role + ' : le champ « ' + part + ' » ne peut pas être vidé (corrigez-le plutôt).');
    avant[k] = ancien; apres[k] = nv; roles[role] = true;
  });
  if (!Object.keys(apres).length) throw new Error('Aucune modification détectée.');
  Object.keys(roles).forEach(function(role) {
    var v = function(p) { var k = role + '_' + p; return Object.prototype.hasOwnProperty.call(apres, k) ? apres[k] : T(vue[role][p]); };
    var lib = role === 'Tuteur' ? 'Tuteur' : 'Responsable';
    if (Object.prototype.hasOwnProperty.call(apres, role + '_prenom') || Object.prototype.hasOwnProperty.call(apres, role + '_nom')) {
      var id = EUC_DEV602_verifierPersonne_(lib, '', v('prenom'), v('nom'));
      EUC_DEV692_pasLEleve_(lib, id.prenom, id.nom, eleve);
      if (Object.prototype.hasOwnProperty.call(apres, role + '_prenom')) apres[role + '_prenom'] = EUC_DEV603_prenom_(id.prenom);
      if (Object.prototype.hasOwnProperty.call(apres, role + '_nom')) apres[role + '_nom'] = EUC_DEV603_nom_(id.nom);
    }
    if (Object.prototype.hasOwnProperty.call(apres, role + '_telephone')) {
      var essais = [pays || 'FR', 'FR', 'MC', 'AUTRE'], tel = null;
      for (var i = 0; i < essais.length && !tel; i++) { var r = EUC_DEV603_telephone_(apres[role + '_telephone'], essais[i]); if (r.ok) tel = r.format; }
      if (!tel) throw new Error(lib + ' : ' + EUC_DEV603_telephone_(apres[role + '_telephone'], 'FR').erreur);
      apres[role + '_telephone'] = tel;
    }
    if (Object.prototype.hasOwnProperty.call(apres, role + '_courriel')) {
      var m = T(apres[role + '_courriel']).toLowerCase(), em = EUC_DEV603_courriel_(m);
      if (!em.ok) throw new Error(lib + ' : ' + em.erreur);
      apres[role + '_courriel'] = m;
    }
  });
  Object.keys(apres).forEach(function(k) { if (apres[k] === avant[k]) { delete apres[k]; delete avant[k]; } });
  if (!Object.keys(apres).length) throw new Error('Aucune modification détectée.');
  return { avant: avant, apres: apres };
}

/* Champs Grist à écrire (calcul pur) : colonnes principales, anciennes colonnes, texte d'origine, historique. */
function EUC_DEV694_champs_(f, ch, motif, auteur, maintenant) {
  var champs = {}, raw = null;
  try { raw = JSON.parse(EUC_DEV694_t_(f.Raw_JSON) || '{}'); } catch (e) { raw = null; }
  Object.keys(ch.apres).forEach(function(k) {
    if (k === 'Entreprise_officielle') return;
    if (k === 'Entreprise_identifiant') {
      var id = ch.apres[k];
      if (/^\d{14}$/.test(id)) { champs.SIRET_brut = id; champs.SIRET_normalise = id; }
      else { champs.NIS_brut = id; champs.NIS_normalise = id; champs.Entreprise_identifiant_type = 'NIS'; }
      return;
    }
    var v = ch.apres[k], e = EUC_DEV694_ECHOS_[k] || {};
    champs[k] = v;
    (e.col || []).forEach(function(c) { champs[c] = v; });
    if (raw && typeof raw === 'object') (e.raw || []).forEach(function(l) { if (Object.prototype.hasOwnProperty.call(raw, l) || l === e.raw[0]) raw[l] = v; });
  });
  if (raw && typeof raw === 'object') champs.Raw_JSON = JSON.stringify(raw);
  var h = []; try { h = JSON.parse(EUC_DEV694_t_(f.Historique_admin_JSON) || '[]'); } catch (eH) { h = []; }
  if (!Array.isArray(h)) h = [];
  h.push({ date: maintenant, auteur: auteur, action: 'CORRECTION_ADMINISTRATIVE', motif: motif, avant: ch.avant, apres: ch.apres });
  champs.Historique_admin_JSON = JSON.stringify(h);
  champs.Derniere_correction_admin = maintenant;
  champs.Auteur_derniere_correction_admin = auteur;
  return champs;
}

function EUC_DEV694_lire_(q) {
  q = q || {};
  var T = EUC_DEV694_t_, id = Number(q.id) || 0, numero = T(q.numero).replace(/[^A-Za-z0-9-]/g, ''), r = null;
  if (id) r = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ id: [id] }))).records || [])[0];
  else if (numero) r = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ Submission_ID: ['SECOURS-' + numero, numero] }))).records || [])
    .sort(function(a, b) { return Number(b.id) - Number(a.id); })[0];
  if (!r) throw new Error('Dépôt introuvable' + (numero ? ' (' + numero + ')' : '') + '.');
  return r;
}

function EUC_DEV694_vueDepot(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_();
  return EUC_DEV694_vue_(EUC_DEV694_lire_(q));
}

/* DEV713 : SIRET corrigé = entreprise officielle relue (même règle que « Vérifier le SIRET » des soumissions) :
 * nom, adresse, code postal, ville et état (actif ou fermé) suivent le nouveau SIRET, sinon l'ancienne adresse restait.
 * Calcul pur : e = entreprise de l'annuaire (EUC_ENT_rechercherSiret). */
function EUC_DEV713_officiel_(e, f, siret) {
  var T = EUC_DEV694_t_, actif = e.etat !== 'Fermé';
  return {
    SIRET_statut: 'VERIFIE', SIRET_source: 'Administration des conventions (correction du SIRET)',
    Raison_sociale_officielle: T(e.raisonSociale), Nom_commercial: T(e.enseigne || (f || {}).Entreprise_saisie || e.raisonSociale),
    Adresse_officielle: T(e.adresseComplete || e.numeroVoie || e.adresse), Complement_adresse_officielle: T(e.complementAdresse || e.complement),
    CP_officiel: T(e.codePostal), Ville_officielle: T(e.commune), Pays_officiel: 'FR', Niveau_controle: actif ? 'VERT' : 'ORANGE'
  };
}
function EUC_DEV713_adresse_(f) { var T = EUC_DEV694_t_; f = f || {}; return [T(f.Raison_sociale_officielle), [T(f.Adresse_officielle), [T(f.CP_officiel), T(f.Ville_officielle)].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' — '); }

function EUC_DEV694_corrigerDepot(q) {
  var ctx = EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var motif = EUC_DEV694_t_(q.motif).slice(0, 1000);
  if (!motif) throw new Error('Motif de correction obligatoire.');
  var r = EUC_DEV694_lire_({ id: q.id }), f = r.fields || {}, T = EUC_DEV694_t_;
  if (/^(IGNOREE|REJETEE|REFUSEE|ESSAI)$/.test(T(f.Decision).toUpperCase())) throw new Error('Ce dépôt est classé sans suite (' + T(f.Decision) + ') : il ne se corrige plus.');
  var pays = /^(MC|MONACO)$/i.test(T(f.Pays_officiel)) || T(f.Entreprise_identifiant_type).toUpperCase() === 'NIS' ? 'MC' : T(f.Pays_officiel) && !/^FR$/i.test(T(f.Pays_officiel)) ? 'AUTRE' : 'FR';
  var eleve = { prenom: T(f.Prenom_eleve), nom: T(f.Nom_eleve) };
  var ch = EUC_DEV694_preparer_(EUC_DEV694_vue_(r), q.changements, pays, eleve);
  /* DEV713 : nouveau SIRET : entreprise officielle relue avant toute écriture (annuaire relu par le navigateur au besoin). */
  var officiel = null, nouveau = ch.apres.Entreprise_identifiant;
  if (nouveau && /^\d{14}$/.test(nouveau)) {
    var trouve = EUC_ENT_rechercherSiret(nouveau), e = trouve.entreprise;
    if (!e && trouve.source === 'api_navigateur') {
      if (!q.reponseApi) return { aVerifierNavigateur: true, url: trouve.url };
      e = (EUC_ENT_traiterReponseApiNavigateur(q.reponseApi, nouveau) || {}).entreprise;
    }
    if (!e) throw new Error('Aucune entreprise trouvée pour le SIRET ' + nouveau + ' : vérifiez les 14 chiffres.');
    if (e.nonDiffusible === true && !T(e.raisonSociale)) throw new Error('Entreprise non diffusible : nom et adresse absents de l’annuaire. Utilisez « Accès INPI ».');
    officiel = EUC_DEV713_officiel_(e, f, nouveau);
    var av = EUC_DEV713_adresse_(f), ap = EUC_DEV713_adresse_(officiel);
    if (av !== ap) { ch.avant.Entreprise_officielle = av; ch.apres.Entreprise_officielle = ap + (officiel.Niveau_controle === 'ORANGE' ? ' (établissement fermé administrativement)' : ''); }
  }
  var champs = EUC_DEV694_champs_(f, ch, motif, T(ctx && ctx.email), new Date().toISOString());
  if (officiel) Object.keys(officiel).forEach(function(k) { champs[k] = officiel[k]; });
  var have = {}; (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/columns').columns || []).forEach(function(c) { have[c.id] = true; });
  var manque = EUC_DEV694_cles_().concat(EUC_DEV694_SUIVI_, ['SIRET_brut', 'SIRET_normalise', 'NIS_brut', 'NIS_normalise', 'Entreprise_identifiant_type']).filter(function(k) { return !have[k] && Object.prototype.hasOwnProperty.call(champs, k); });
  if (manque.length) {
    EUC_ENT_grist('post', '/tables/' + EUC_V160_TABLE_ + '/columns', { columns: manque.map(function(k) { return { id: k, fields: { label: k.replace(/_/g, ' '), type: 'Text' } }; }) });
    manque.forEach(function(k) { have[k] = true; });
  }
  var ecrit = {}; Object.keys(champs).forEach(function(k) { if (have[k]) ecrit[k] = champs[k]; });
  EUC_ENT_grist('patch', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ id: Number(r.id), fields: ecrit }] });
  console.log('DEV694 dépôt ' + EUC_DEV694_numero_(f) + ' corrigé (' + Object.keys(ch.apres).join(', ') + ') par ' + T(ctx && ctx.email));
  return EUC_DEV694_vue_({ id: r.id, fields: Object.assign({}, f, ecrit) });
}

/* Bandeau « À faire » (calcul pur) : dépôts qui demandent une action, par type. */
function EUC_DEV694_compter_(liste) {
  var n = { aide: 0, siret: 0, nis: 0, ferme: 0, doublon: 0, prevenir: 0 };
  (liste || []).forEach(function(x) {
    if (x.aPrevenir) n.prevenir++;
    if (!x.aTraiter) return;
    if (x.doublonDe) n.doublon++;
    else if (!x.dansSuivi) { if (x.aide) n.aide++; else if (x.pays === 'MC') n.nis++; else n.siret++; }
    else if (x.ferme) n.ferme++;
  });
  var l = [];
  if (n.aide) l.push({ cle: 'aide', nombre: n.aide, texte: n.aide > 1 ? 'demandes d’aide : entreprise à identifier' : 'demande d’aide : entreprise à identifier' });
  if (n.siret) l.push({ cle: 'siret', nombre: n.siret, texte: 'SIRET à vérifier' });
  if (n.nis) l.push({ cle: 'nis', nombre: n.nis, texte: 'NIS de Monaco à saisir' });
  if (n.ferme) l.push({ cle: 'ferme', nombre: n.ferme, texte: n.ferme > 1 ? 'établissements fermés administrativement (INSEE) à vérifier' : 'établissement fermé administrativement (INSEE) à vérifier' });
  if (n.doublon) l.push({ cle: 'doublon', nombre: n.doublon, texte: n.doublon > 1 ? 'doublons à classer sans suite' : 'doublon à classer sans suite' });
  if (n.prevenir) l.push({ cle: 'prevenir', nombre: n.prevenir, texte: n.prevenir > 1 ? 'élèves à prévenir (problème résolu)' : 'élève à prévenir (problème résolu)' });
  return l;
}
function EUC_DEV694_aFaire() {
  EUC_IMPORT_exigerAdminTexte_();
  var l = EUC_DEV665_enAttente_(EUC_DEV665_lignes_());
  return { ok: true, points: EUC_DEV694_compter_(l), page: 'soumissions-a-traiter-pfmp' };
}

/* Dépôts en ligne de l'année ajoutés à la recherche « Rechercher une convention » de l'Administration des conventions
 * (même lecture et même dédoublonnage que le contrôle des noms : un dépôt devenu convention n'est pas compté deux fois). */
function EUC_DEV694_listeDepots(q) {
  EUC_ADMIN_WORKFLOW_ctxV144_(); q = q || {};
  var annee = EUC_DEV694_t_(q.annee), out = [];
  EUC_DEV688_parcourir_(annee, function(a, id, e, base) {
    if (base.source !== 'SOUMISSION') return;
    var n = Number(String(base.id).replace(/^S/, '')) || 0; if (!n) return;
    out.push({ id: 'S' + n, depot: n, numero: base.numero, jeune: base.eleve, classe: base.classe, entreprise: base.entreprise, periode: base.periode, statut: base.statut,
      recherche: [base.numero, base.eleve, base.classe, base.entreprise, 'depot en ligne'].join(' ') });
  });
  return out.sort(function(x, y) { return x.classe.localeCompare(y.classe, 'fr') || x.jeune.localeCompare(y.jeune, 'fr'); });
}
