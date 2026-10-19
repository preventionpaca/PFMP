/**
 * DEV603 — Formulaire de secours « Déclarer mon entreprise » (remplace JotForm, secours du QR code).
 *
 * Page publique, sans verrou Atrium :
 *   1. l'élève choisit sa classe, saisit nom, prénom, date de naissance et recopie un code déformé
 *      (captcha dessiné par le serveur : la réponse n'est jamais dans la page, un seul usage, 10 min) ;
 *   2. il choisit la période de stage de sa classe ;
 *   3. il vérifie le SIRET (même vérification que le QR code) et saisit responsable et tuteur
 *      (civilité, Prénom, NOM, fonction, téléphone, courriel ; mêmes contrôles que le QR code).
 * Le dépôt reçoit un numéro (D2026-0001) et rejoint la table d'attente de l'import JotForm
 * (EUC_MIGRATION_JOTFORM_PFMP), élève et classe déjà rapprochés, SIRET vérifié. L'administration
 * valide sur la page « Soumissions reçues » (ex-Import JotForm) : la convention est alors créée,
 * reçoit son numéro (PFMP-2026-000123) et l'élève en est informé par courriel.
 * Anti-spam : identité par date de naissance, captcha, case piège, délai minimal, tentatives limitées.
 */
var EUC_DEV603_SOURCE_ = 'FORMULAIRE_SECOURS';
var EUC_DEV603_JETON_H_ = 2;

function EUC_DEV603_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV603_n_(v) { return EUC_DEV603_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); }
/* Mise en forme : Prénom avec majuscule (Jean-Pierre), NOM en capitales (LE GALL). */
function EUC_DEV603_prenom_(v) { return EUC_DEV603_t_(v).toLocaleLowerCase('fr-FR').replace(/(^|[\s'-])([a-zà-öø-ÿ])/g, function(_, s, l) { return s + l.toLocaleUpperCase('fr-FR'); }); }
function EUC_DEV603_nom_(v) { return EUC_DEV603_t_(v).toLocaleUpperCase('fr-FR'); }

/* ---------- Captcha (lettres tracées, sans texte dans l'image) ---------- */
var EUC_DEV603_ALPHABET_ = 'ABCDEFGHJKMNPRSTUVWXYZ23456789';
var EUC_DEV603_GLYPHES_ = {
  A: ['0,6 2,0 4,6', '1,3.5 3,3.5'], B: ['0,6 0,0 3,0 4,1 4,2 3,3 0,3', '3,3 4,4 4,5 3,6 0,6'], C: ['4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5'], D: ['0,0 0,6 3,6 4,5 4,1 3,0 0,0'],
  E: ['4,0 0,0 0,6 4,6', '0,3 3,3'], F: ['4,0 0,0 0,6', '0,3 3,3'], G: ['4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3 2,3'], H: ['0,0 0,6', '4,0 4,6', '0,3 4,3'],
  J: ['4,0 4,5 3,6 1,6 0,5'], K: ['0,0 0,6', '4,0 0,3 4,6'], M: ['0,6 0,0 2,3 4,0 4,6'], N: ['0,6 0,0 4,6 4,0'], P: ['0,6 0,0 3,0 4,1 4,2 3,3 0,3'],
  R: ['0,6 0,0 3,0 4,1 4,2 3,3 0,3', '2,3 4,6'], S: ['4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5'], T: ['0,0 4,0', '2,0 2,6'], U: ['0,0 0,5 1,6 3,6 4,5 4,0'],
  V: ['0,0 2,6 4,0'], W: ['0,0 1,6 2,3 3,6 4,0'], X: ['0,0 4,6', '4,0 0,6'], Y: ['0,0 2,3 4,0', '2,3 2,6'], Z: ['0,0 4,0 0,6 4,6'],
  2: ['0,1 1,0 3,0 4,1 4,2 0,6 4,6'], 3: ['0,1 1,0 3,0 4,1 4,2 3,3 2,3', '3,3 4,4 4,5 3,6 1,6 0,5'], 4: ['3,6 3,0 0,4 4,4'], 5: ['4,0 0,0 0,3 3,3 4,4 4,5 3,6 0,6'],
  6: ['4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,4 3,3 0,3'], 7: ['0,0 4,0 1,6'], 8: ['1,3 0,2 0,1 1,0 3,0 4,1 4,2 3,3 1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3'], 9: ['4,3 1,3 0,2 0,1 1,0 3,0 4,1 4,5 3,6 1,6']
};
function EUC_DEV603_alea_(n) { return Math.floor(Math.random() * n); }
function EUC_DEV603_svg_(code) {
  var w = 230, h = 70, parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Code de sécurité"><rect width="100%" height="100%" fill="#f4f8f6"/>'];
  for (var b = 0; b < 5; b++) parts.push('<path d="M' + EUC_DEV603_alea_(w) + ' ' + EUC_DEV603_alea_(h) + ' Q' + EUC_DEV603_alea_(w) + ' ' + EUC_DEV603_alea_(h) + ' ' + EUC_DEV603_alea_(w) + ' ' + EUC_DEV603_alea_(h) + '" stroke="#9db8ae" stroke-width="1.4" fill="none"/>');
  code.split('').forEach(function(ch, i) {
    var x = 18 + i * 40 + EUC_DEV603_alea_(8), y = 12 + EUC_DEV603_alea_(12), rot = EUC_DEV603_alea_(36) - 18, sx = 5.2 + Math.random() * 1.6, sy = 6 + Math.random() * 1.2;
    var couleur = ['#0b3d33', '#1f2a5a', '#5a1f3d', '#2b2b2b'][EUC_DEV603_alea_(4)];
    parts.push('<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ' 10 18) scale(' + sx.toFixed(2) + ' ' + sy.toFixed(2) + ')" fill="none" stroke="' + couleur + '" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round">');
    EUC_DEV603_GLYPHES_[ch].forEach(function(p) { parts.push('<polyline points="' + p.split(' ').map(function(pt) { var c = pt.split(','); return (Number(c[0]) + (Math.random() - .5) * .35).toFixed(2) + ',' + (Number(c[1]) + (Math.random() - .5) * .35).toFixed(2); }).join(' ') + '"/>'); });
    parts.push('</g>');
  });
  /* Le trait qui barre le mot. */
  parts.push('<path d="M6 ' + (28 + EUC_DEV603_alea_(14)) + ' C70 ' + EUC_DEV603_alea_(h) + ' 150 ' + EUC_DEV603_alea_(h) + ' ' + (w - 6) + ' ' + (28 + EUC_DEV603_alea_(14)) + '" stroke="#0b3d33" stroke-width="2.2" fill="none"/></svg>');
  return parts.join('');
}
function EUC_DEV603_captcha() {
  var code = ''; for (var i = 0; i < 5; i++) code += EUC_DEV603_ALPHABET_.charAt(EUC_DEV603_alea_(EUC_DEV603_ALPHABET_.length));
  var emis = Date.now(), nonce = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return { image: 'data:image/svg+xml;base64,' + Utilities.base64Encode(EUC_DEV603_svg_(code), Utilities.Charset.UTF_8), jeton: 'c' + emis + '.' + nonce + '.' + EUC_DEV598_sig_('C|' + code + '|' + nonce + '|' + emis) };
}
/* Vérifie le captcha (un seul usage, 10 min, au moins 4 s après son affichage). */
function EUC_DEV603_verifierCaptcha_(jeton, reponse, maintenant) {
  var m = /^c(\d+)\.([0-9a-f]{16})\.([0-9a-f]{32})$/.exec(EUC_DEV603_t_(jeton)), r = EUC_DEV603_t_(reponse).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!m) throw new Error('Code de sécurité expiré : cliquez sur « Nouveau code ».');
  var age = (maintenant || Date.now()) - Number(m[1]);
  if (age > 600000) throw new Error('Code de sécurité expiré : cliquez sur « Nouveau code ».');
  if (age < 4000) throw new Error('Envoi trop rapide. Réessayez dans quelques secondes.');
  if (!EUC_DEV598_egal_(m[3], EUC_DEV598_sig_('C|' + r + '|' + m[2] + '|' + m[1]))) throw new Error('Code de sécurité incorrect. Recopiez les 5 caractères de l’image.');
  var cache = CacheService.getScriptCache(), cle = 'EUC_DEV603_CAPTCHA_' + m[2];
  if (cache.get(cle)) throw new Error('Code de sécurité déjà utilisé : cliquez sur « Nouveau code ».');
  cache.put(cle, '1', 900);
}

/* ---------- Jeton de l'élève identifié ---------- */
function EUC_DEV603_jeton_(eleveId, classeId, exp) { return 'e' + eleveId + '.' + classeId + '.' + exp + '.' + EUC_DEV598_sig_('E|' + eleveId + '|' + classeId + '|' + exp); }
function EUC_DEV603_lireJeton_(t, maintenant) {
  var m = /^e(\d+)\.(\d+)\.(\d+)\.([0-9a-f]{32})$/.exec(EUC_DEV603_t_(t));
  if (!m || !EUC_DEV598_egal_(m[4], EUC_DEV598_sig_('E|' + m[1] + '|' + m[2] + '|' + m[3]))) throw new Error('Session invalide : recommencez depuis le début.');
  if (Number(m[3]) < (maintenant || Date.now())) throw new Error('Session expirée : recommencez depuis le début.');
  return { eleveId: Number(m[1]), classeId: Number(m[2]) };
}

/* ---------- Classes, identification ---------- */
function EUC_DEV603_classesModele_(m) {
  return (m.classes || []).filter(function(c) { return c.modeApprentissage !== 'CLASSE_ENTIERE' && c.modeApprentissage !== 'FORMATION_CONTINUE' && (c.periodes || []).some(function(p) { return !p.suivi; }) && (c.eleves || []).length; });
}
function EUC_DEV603_classes() {
  var m = EUC_SUIVI2_modele_('');
  return { ok: true, annee: m.annee, classes: EUC_DEV603_classesModele_(m).map(function(c) { return { id: Number(c.id), nom: c.nom }; }).sort(function(a, b) { return a.nom.localeCompare(b.nom, 'fr'); }), captcha: EUC_DEV603_captcha() };
}
/* Élève de la classe dont nom, prénom (ou prénom d'usage) et date de naissance concordent (calcul pur). */
function EUC_DEV603_trouverEleve_(lignes, idsClasse, nom, prenom, naissance) {
  var n = EUC_DEV603_n_(nom), p = EUC_DEV603_n_(prenom);
  return lignes.filter(function(r) {
    var f = r.fields || r;
    return idsClasse.indexOf(Number(r.id)) >= 0 && EUC_DEV603_n_(f.Nom) === n && (EUC_DEV603_n_(f.Prenom) === p || EUC_DEV603_n_(f.Prenom_usage) === p) && EUC_SUIVI2_date_(f.Date_naissance) === naissance;
  })[0] || null;
}
function EUC_DEV603_identifier(q) {
  q = q || {};
  if (EUC_DEV603_t_(q.site)) throw new Error('Envoi refusé.');
  EUC_DEV603_verifierCaptcha_(q.captchaJeton, q.captcha);
  var naissance = EUC_DEV603_t_(q.naissance), classeId = Number(q.classeId);
  if (!classeId) throw new Error('Choisissez votre classe.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(naissance)) throw new Error('Indiquez votre date de naissance.');
  if (!EUC_DEV603_t_(q.nom) || !EUC_DEV603_t_(q.prenom)) throw new Error('Indiquez votre nom et votre prénom.');
  var cache = CacheService.getScriptCache(), cle = 'EUC_DEV603_ESSAIS_' + classeId + '_' + EUC_DEV603_n_(q.nom).slice(0, 30), essais = Number(cache.get(cle) || 0);
  if (essais >= 6) throw new Error('Trop de tentatives pour ce nom. Réessayez dans une heure ou demandez de l’aide au bureau des entreprises.');
  var m = EUC_SUIVI2_modele_(''), c = EUC_DEV603_classesModele_(m).filter(function(x) { return Number(x.id) === classeId; })[0];
  if (!c) throw new Error('Classe introuvable.');
  var essai = EUC_DEV603_essai_();
  if (essai && EUC_DEV603_n_(q.nom) === EUC_DEV603_n_(essai.nom) && EUC_DEV603_n_(q.prenom) === EUC_DEV603_n_(essai.prenom) && naissance === essai.naissance) {
    return { ok: true, essai: true, jeton: EUC_DEV603_jeton_(0, classeId, Date.now() + EUC_DEV603_JETON_H_ * 3600000), eleve: 'Élève d’essai', classe: c.nom,
      periodes: (c.periodes || []).filter(function(p) { return !p.suivi; }).map(function(p) { return { id: Number(p.id), libelle: p.libelle, debut: p.debut, fin: p.fin }; }) };
  }
  var ids = c.eleves.map(function(e) { return Number(e.id); });
  var lignes = EUC_ENT_grist('get', '/tables/EUC_ELEVES_PFMP/records?filter=' + encodeURIComponent(JSON.stringify({ id: ids }))).records || [];
  var el = EUC_DEV603_trouverEleve_(lignes, ids, q.nom, q.prenom, naissance);
  if (!el) { cache.put(cle, String(essais + 1), 3600); throw new Error('Nous ne trouvons pas d’élève de ' + c.nom + ' avec ce nom, ce prénom et cette date de naissance. Vérifiez l’orthographe (comme sur Pronote).'); }
  var f = el.fields || {}, exp = Date.now() + EUC_DEV603_JETON_H_ * 3600000;
  return { ok: true, jeton: EUC_DEV603_jeton_(Number(el.id), classeId, exp), eleve: EUC_DEV603_prenom_(f.Prenom_usage || f.Prenom) + ' ' + EUC_DEV603_nom_(f.Nom), classe: c.nom,
    periodes: (c.periodes || []).filter(function(p) { return !p.suivi; }).map(function(p) { return { id: Number(p.id), libelle: p.libelle, debut: p.debut, fin: p.fin }; }) };
}

/* ---------- Dépôt ---------- */
function EUC_DEV603_personne_(role, x, obligatoireContact) {
  x = x || {};
  var id = EUC_DEV602_verifierPersonne_(role, x.civilite, x.prenom, x.nom);
  if (!id.civilite) throw new Error(role + ' : choisissez la civilité.');
  var fonction = EUC_DEV603_t_(x.fonction).slice(0, 120), tel = EUC_DEV603_t_(x.telephone).slice(0, 30), mail = EUC_DEV603_t_(x.courriel).toLowerCase().slice(0, 150);
  if (!fonction) throw new Error(role + ' : indiquez la fonction.');
  var t = EUC_DEV603_telephone_(tel, x.pays || 'FR');
  if (obligatoireContact && !t.ok) throw new Error(role + ' : ' + t.erreur);
  var em = EUC_DEV603_courriel_(mail);
  if (obligatoireContact && !em.ok) throw new Error(role + ' : ' + em.erreur);
  return { civilite: id.civilite, prenom: EUC_DEV603_prenom_(id.prenom), nom: EUC_DEV603_nom_(id.nom), fonction: fonction, telephone: t.ok ? t.format : tel, courriel: mail };
}
/* Téléphone selon le pays de l'entreprise (calcul pur) : France, Monaco (ou France), étranger (international). */
function EUC_DEV603_telephone_(v, pays) {
  var brut = EUC_DEV603_t_(v), d = brut.replace(/[\s.\-()\/]/g, '').replace(/^00/, '+');
  var paires = function(x) { return x.replace(/(\d{2})(?=\d)/g, '$1 ').trim(); };
  var fr = function() { var x = d.replace(/^\+33/, '0'); if (/^0[1-9]\d{8}$/.test(x)) return { ok: true, format: paires(x) }; return null; };
  var mc = function() { var x = d.replace(/^\+377/, ''); if (/^9\d{7}$/.test(x)) return { ok: true, format: '+377 ' + paires(x) }; if (/^6\d{8}$/.test(x)) return { ok: true, format: '+377 6 ' + paires(x.slice(1)) }; return null; };
  if (!brut) return { ok: false, erreur: 'indiquez un numéro de téléphone.' };
  pays = String(pays || 'FR').toUpperCase();
  if (pays === 'MC') return (/^\+33|^0/.test(d) ? fr() : mc()) || mc() || fr() || { ok: false, erreur: 'numéro monégasque (+377 93 15 00 00, +377 6 12 34 56 78) ou français (06 12 34 56 78) attendu.' };
  if (pays === 'AUTRE') return /^\+\d{8,15}$/.test(d) ? { ok: true, format: d } : { ok: false, erreur: 'numéro international attendu : + indicatif du pays puis le numéro (ex. +39 0184 123456).' };
  return fr() || { ok: false, erreur: 'numéro français à 10 chiffres attendu (ex. 06 12 34 56 78 ou 04 93 00 00 00).' };
}
/* Courriel : format et fautes de frappe courantes (calcul pur). */
function EUC_DEV603_courriel_(v) {
  var m = EUC_DEV603_t_(v).toLowerCase();
  if (!/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(m)) return { ok: false, erreur: 'adresse courriel invalide (ex. prenom.nom@entreprise.fr).' };
  var dom = m.split('@')[1], fautes = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.fr': 'gmail.com', 'gamil.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmal.fr': 'hotmail.fr', 'yahou.fr': 'yahoo.fr', 'yaho.fr': 'yahoo.fr', 'orange.com': 'orange.fr', 'wanado.fr': 'wanadoo.fr', 'outlok.fr': 'outlook.fr', 'outlook.con': 'outlook.com', 'free.com': 'free.fr', 'sfr.com': 'sfr.fr', 'laposte.com': 'laposte.net' };
  if (fautes[dom]) return { ok: false, erreur: 'l’adresse se termine par « ' + dom + ' » : vouliez-vous écrire « ' + fautes[dom] + ' » ?' };
  return { ok: true };
}
/* Ligne de la table d'attente, au format de l'import JotForm (calcul pur). */
function EUC_DEV603_ligne_(numero, annee, eleve, classe, periode, ent, resp, tut, emailEleve) {
  var raw = { 'Submission ID': 'SECOURS-' + numero, 'Année scolaire': annee, 'Période n°': periode.libelle, 'Date de début': periode.debut, 'Date de fin': periode.fin,
    'Nom': eleve.nom, 'Prénom': eleve.prenom, 'Email': emailEleve, 'Nom entreprise': ent.raisonSociale, 'N° SIRET': ent.siret, 'Adresse entreprise': ent.adresse,
    'Complément adresse entreprise': ent.complement, 'Code postal entreprise': ent.codePostal, 'Ville entreprise': ent.commune, "Adresse e-mail de l'entreprise": resp.courriel, 'Téléphone entreprise': resp.telephone,
    'Civilité du responsable': resp.civilite, 'Prénom du responsable': resp.prenom, 'Nom du responsable': resp.nom, 'Fonction du responsable': resp.fonction, 'Téléphone du responsable': resp.telephone, 'E-mail du responsable': resp.courriel,
    'Civilité du tuteur': tut.civilite, 'Prénom du tuteur': tut.prenom, 'Nom du tuteur': tut.nom, 'Fonction du tuteur': tut.fonction, 'Téléphone du tuteur': tut.telephone, 'Adresse e-mail du tuteur': tut.courriel, 'Source': EUC_DEV603_SOURCE_ };
  return { Submission_ID: raw['Submission ID'], Annee_scolaire: annee, Periode_numero: periode.libelle, Date_debut_brut: periode.debut, Date_fin_brut: periode.fin, Classe_saisie: classe.nom, Diplome: '',
    Nom_eleve: eleve.nom, Prenom_eleve: eleve.prenom, Date_naissance: eleve.naissance, Email_eleve: emailEleve, Entreprise_saisie: ent.enseigne || ent.raisonSociale, SIRET_brut: ent.siret, SIRET_normalise: ent.siret,
    Adresse_entreprise: ent.adresse, Complement_adresse_entreprise: ent.complement, CP_entreprise: ent.codePostal, Ville_entreprise: ent.commune, Email_entreprise: resp.courriel, Telephone_entreprise: resp.telephone,
    Nom_tuteur: tut.nom, Fonction_tuteur: tut.fonction, Email_tuteur: tut.courriel, Telephone_tuteur: tut.telephone, Nom_responsable: resp.nom, Raw_JSON: JSON.stringify(raw),
    Eleve_match_id: eleve.id, Eleve_match_libelle: eleve.prenom + ' ' + eleve.nom, Classe_match_id: classe.id, Classe_match_libelle: classe.nom, Entreprise_match_id: 0, Entreprise_match_libelle: '', Entreprise_score: 0,
    SIRET_statut: 'VERIFIE', SIRET_source: 'Recherche d’entreprises (formulaire de secours)', Raison_sociale_officielle: ent.raisonSociale, Nom_commercial: ent.enseigne || ent.raisonSociale,
    Adresse_officielle: ent.adresse, Complement_adresse_officielle: ent.complement, CP_officiel: ent.codePostal, Ville_officielle: ent.commune, Pays_officiel: 'FR',
    Niveau_controle: ent.actif ? 'VERT' : 'ORANGE', Alertes: ent.actif ? '' : 'Établissement fermé selon l’INSEE', Decision: ent.actif ? 'A_VALIDER' : 'A_CONTROLER', Date_import: new Date().toISOString() };
}
function EUC_DEV603_numero_(annee) {
  var p = PropertiesService.getScriptProperties(), k = 'EUC_DEV603_COMPTEUR_' + annee, n = Number(p.getProperty(k) || 0) + 1;
  p.setProperty(k, String(n)); return 'D' + annee.slice(0, 4) + '-' + String(n).padStart(4, '0');
}
function EUC_DEV603_deposer(q) {
  q = q || {};
  var j = EUC_DEV603_lireJeton_(q.jeton), m = EUC_SUIVI2_modele_(''), c = EUC_DEV603_classesModele_(m).filter(function(x) { return Number(x.id) === j.classeId; })[0];
  if (!c) throw new Error('Classe introuvable.');
  var periode = (c.periodes || []).filter(function(p) { return !p.suivi && Number(p.id) === Number(q.periodeId); })[0];
  if (!periode) throw new Error('Choisissez la période de stage.');
  /* SIRET : revérifié côté serveur (fiche Grist complète ou réponse officielle relue). */
  var siret = EUC_DEV603_t_(q.siret).replace(/\D/g, ''), v = EUC_ENT_validerSiret(siret);
  if (!v.valide) throw new Error(v.message);
  var trouve = EUC_ENT_rechercherSiret(siret), e = trouve.entreprise;
  if (!e && trouve.source === 'api_navigateur') e = (EUC_ENT_traiterReponseApiNavigateur(q.reponseApi, siret) || {}).entreprise;
  if (!e) throw new Error('Entreprise introuvable pour ce SIRET : vérifiez les 14 chiffres.');
  var ent = { siret: siret, raisonSociale: EUC_DEV603_t_(e.raisonSociale), enseigne: EUC_DEV603_t_(q.enseigne || e.enseigne), adresse: EUC_DEV603_t_(e.adresseComplete || e.numeroVoie || e.adresse), complement: EUC_DEV603_t_(e.complementAdresse || e.complement),
    codePostal: EUC_DEV603_t_(e.codePostal), commune: EUC_DEV603_t_(e.commune), actif: e.etat !== 'Fermé' };
  if (!ent.raisonSociale || !ent.commune) throw new Error('Données officielles de l’entreprise incomplètes : faites valider par le bureau des entreprises.');
  var resp = EUC_DEV603_personne_('Responsable de l’entreprise', q.responsable, true);
  var tut = q.tuteurEstResponsable === true ? resp : EUC_DEV603_personne_('Tuteur', q.tuteur, true);
  if (!j.eleveId) return EUC_DEV603_deposerEssai_(m, c, periode, ent, resp, tut);
  var el = (EUC_ENT_grist('get', '/tables/EUC_ELEVES_PFMP/records?filter=' + encodeURIComponent(JSON.stringify({ id: [j.eleveId] }))).records || [])[0];
  if (!el) throw new Error('Élève introuvable.');
  var ef = el.fields || {}, eleve = { id: j.eleveId, nom: EUC_DEV603_nom_(ef.Nom), prenom: EUC_DEV603_prenom_(ef.Prenom_usage || ef.Prenom), naissance: EUC_SUIVI2_date_(ef.Date_naissance) };
  var emailEleve = EUC_DEV603_t_(q.emailEleve).toLowerCase() || EUC_DEV603_t_(ef.Email_eleve || ef.Courriel || ef.Email).toLowerCase();
  if (emailEleve && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(emailEleve)) throw new Error('Votre adresse courriel est invalide.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) throw new Error('Beaucoup d’envois en même temps : réessayez dans un instant.');
  try {
    /* Une convention déjà enregistrée pour cette période n'est jamais doublée. */
    var acces = EUC_ENT_grist('get', '/tables/' + EUC_CONVENTION_ACCES_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ Eleve: [j.eleveId] }))).records || [];
    var deja = acces.filter(function(r) { var f = r.fields || {}; return Number(f.Periode) === Number(periode.id) && f.Revoked !== true && EUC_DEV603_t_(f.Entreprise_siret || f.Entreprise_nis); })[0];
    if (deja) throw new Error('Une entreprise est déjà enregistrée pour cette période (' + EUC_CONVENTION_numeroEnregistrementV568_(Object.assign({ id: deja.id }, deja.fields)) + '). Contactez le bureau des entreprises pour la modifier.');
    var tampon = EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ Eleve_match_id: [j.eleveId] }))).records || [];
    var enAttente = tampon.filter(function(r) { var f = r.fields || {}; return /^SECOURS-/.test(EUC_DEV603_t_(f.Submission_ID)) && EUC_DEV603_t_(f.Periode_numero) === EUC_DEV603_t_(periode.libelle) && ['VALIDEE', 'REJETEE', 'REFUSEE'].indexOf(EUC_DEV603_t_(f.Decision).toUpperCase()) < 0; })[0];
    var numero = enAttente ? EUC_DEV603_t_((enAttente.fields || {}).Submission_ID).replace(/^SECOURS-/, '') : EUC_DEV603_numero_(m.annee);
    var ligne = EUC_DEV603_ligne_(numero, m.annee, eleve, { id: Number(c.id), nom: c.nom }, periode, ent, resp, tut, emailEleve);
    var cols = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/columns').columns || []).map(function(x) { return x.id; }), fields = {};
    Object.keys(ligne).forEach(function(k) { if (cols.indexOf(k) >= 0) fields[k] = ligne[k]; });
    if (enAttente) EUC_ENT_grist('patch', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ id: enAttente.id, fields: fields }] });
    else EUC_ENT_grist('post', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ fields: fields }] });
  } finally { lock.releaseLock(); }
  EUC_DEV603_accuseDepot_(emailEleve, eleve, c.nom, numero, ent.raisonSociale, periode.libelle, false);
  return { ok: true, numero: numero, remplace: !!enAttente, entreprise: ent.raisonSociale, periode: periode.libelle, courriel: emailEleve ? emailEleve.replace(/^(.).*(@.*)$/, '$1…$2') : '' };
}

/* ---------- Après validation par l'administration : numéro de convention à l'élève ---------- */
function EUC_DEV603_apresValidation_(items) {
  try {
    var ids = (items || []).map(function(x) { return Number(x.rowId); }).filter(Boolean); if (!ids.length) return 0;
    var lignes = EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ id: ids }))).records || [], envoyes = 0;
    lignes.forEach(function(r) {
      var f = r.fields || {}; if (!/^SECOURS-/.test(EUC_DEV603_t_(f.Submission_ID))) return;
      var item = items.filter(function(x) { return Number(x.rowId) === Number(r.id); })[0]; if (!item || !item.accessId) return;
      var a = (EUC_ENT_grist('get', '/tables/' + EUC_CONVENTION_ACCES_TABLE_ + '/records?filter=' + encodeURIComponent(JSON.stringify({ id: [item.accessId] }))).records || [])[0]; if (!a) return;
      var af = Object.assign({ id: a.id }, a.fields || {}), numero = EUC_CONVENTION_numeroEnregistrementV568_(af);
      if (!EUC_DEV603_t_(af.Numero_enregistrement)) try { EUC_ENT_grist('patch', '/tables/' + EUC_CONVENTION_ACCES_TABLE_ + '/records', { records: [{ id: Number(a.id), fields: { Numero_enregistrement: numero } }] }); } catch (e) {}
      var mail = EUC_DEV603_t_(f.Email_eleve); if (!mail) return;
      MailApp.sendEmail({ to: mail, name: 'Lycée Les Eucalyptus — PFMP', subject: 'Ta convention de stage est enregistrée — n° ' + numero,
        body: ['Bonjour ' + EUC_DEV603_t_(f.Prenom_eleve) + ',', '', 'Le bureau des entreprises a validé ta déclaration ' + EUC_DEV603_t_(f.Submission_ID).replace(/^SECOURS-/, 'n° ') + '.',
          'Entreprise : ' + EUC_DEV603_t_(f.Raison_sociale_officielle || f.Entreprise_saisie), 'Période : ' + EUC_DEV603_t_(f.Periode_numero), '', 'Numéro de ta convention : ' + numero, '', 'Lycée Les Eucalyptus — bureau des entreprises'].join('\n') });
      envoyes++;
    });
    return envoyes;
  } catch (e) { console.log('DEV603 après validation : ' + (e && e.message || e)); return 0; }
}

function EUC_DEV603_afficher(e) {
  return HtmlService.createTemplateFromFile('Declaration_Entreprise_DEV603').evaluate().setTitle('Déclarer mon entreprise de stage — PFMP').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/* Relecture de la réponse officielle obtenue par le navigateur (même règle que le QR code). */
function EUC_DEV603_traiterApi(q) { q = q || {}; return EUC_ENT_traiterReponseApiNavigateur(q.json, EUC_DEV603_t_(q.siret)); }

/* ---------- Mode essai (24 h) : parcours complet sans élève réel, dépôt non validable ---------- */
var EUC_DEV603_ESSAI_PROP_ = 'EUC_DEV603_ESSAI';
function EUC_DEV603_essai_() {
  try { var e = JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV603_ESSAI_PROP_) || 'null'); return e && Number(e.jusqua) > Date.now() ? e : null; } catch (x) { return null; }
}
function EUC_DEV603_activerEssai() {
  EUC_SUIVI2_exigerAdmin_();
  var e = { nom: 'ESSAI', prenom: 'Formulaire', naissance: '2000-01-01', jusqua: Date.now() + 24 * 3600000 };
  PropertiesService.getScriptProperties().setProperty(EUC_DEV603_ESSAI_PROP_, JSON.stringify(e));
  return { ok: true, nom: e.nom, prenom: e.prenom, naissance: '01/01/2000', jusqua: new Date(e.jusqua).toISOString() };
}
function EUC_DEV603_deposerEssai_(m, c, periode, ent, resp, tut) {
  var numero = 'ESSAI-' + Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyyMMdd-HHmmss');
  var ligne = EUC_DEV603_ligne_(numero, m.annee, { id: 0, nom: 'ESSAI', prenom: 'Formulaire', naissance: '2000-01-01' }, { id: Number(c.id), nom: c.nom }, periode, ent, resp, tut, '');
  ligne.Submission_ID = numero; ligne.Eleve_match_id = 0; ligne.Eleve_match_libelle = 'Élève d’essai'; ligne.Niveau_controle = 'ROUGE'; ligne.Decision = 'ESSAI'; ligne.Alertes = 'Essai du formulaire de secours — ne pas valider (aucun élève rattaché)';
  var cols = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/columns').columns || []).map(function(x) { return x.id; }), fields = {};
  Object.keys(ligne).forEach(function(k) { if (cols.indexOf(k) >= 0) fields[k] = ligne[k]; });
  EUC_ENT_grist('post', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ fields: fields }] });
  return { ok: true, essai: true, numero: numero, remplace: false, entreprise: ent.raisonSociale, periode: periode.libelle };
}

/* ---------- Accusé de dépôt (élève) et copie au bureau des entreprises ---------- */
var EUC_DEV603_BUREAU_ = 'bureau G205 — bureau des formations et des entreprises';
function EUC_DEV603_accuseDepot_(email, eleve, classe, numero, entreprise, periode, probleme) {
  try {
    var copie = typeof EUC_DEV598_copie_ === 'function' ? EUC_DEV598_copie_() : '';
    if (email) MailApp.sendEmail({ to: email, replyTo: copie || undefined, name: 'Lycée Les Eucalyptus — PFMP', subject: (probleme ? 'Ta demande d’aide pour ton entreprise de stage — ' : 'Ta déclaration d’entreprise de stage est reçue — ') + numero,
      body: ['Bonjour ' + eleve.prenom + ',', '', probleme ? 'Ta demande ' + numero + ' est bien reçue : ton entreprise n’a pas pu être vérifiée automatiquement.' : 'Ta déclaration ' + numero + ' est bien reçue.',
        'Entreprise : ' + entreprise, 'Période : ' + periode, '', probleme ? 'Passe au plus vite au ' + EUC_DEV603_BUREAU_ + ' avec les coordonnées de ton entreprise.' : 'Le bureau des entreprises va la vérifier. Tu recevras ensuite ton numéro de convention par courriel.',
        '', 'Lycée Les Eucalyptus — bureau des formations et des entreprises'].join('\n') });
    if (copie) MailApp.sendEmail({ to: copie, name: 'Lycée Les Eucalyptus — PFMP', subject: (probleme ? '[À traiter au bureau] ' : '[Dépôt] ') + numero + ' — ' + eleve.prenom + ' ' + eleve.nom + ' (' + classe + ')',
      body: [(probleme ? 'Demande d’aide (SIRET non vérifié / Monaco / étranger)' : 'Nouvelle déclaration par le formulaire de secours') + ' : ' + numero, 'Élève : ' + eleve.prenom + ' ' + eleve.nom + ' — ' + classe, 'Entreprise : ' + entreprise, 'Période : ' + periode, '', 'À contrôler puis valider dans « Soumissions reçues ».'].join('\n') });
  } catch (e) { console.log('DEV603 accusé : ' + (e && e.message || e)); }
}

/* ---------- Porte de sortie : SIRET qui ne marche pas, entreprise à Monaco ou à l'étranger ---------- */
function EUC_DEV603_signalerProbleme(q) {
  q = q || {};
  var j = EUC_DEV603_lireJeton_(q.jeton), m = EUC_SUIVI2_modele_(''), c = EUC_DEV603_classesModele_(m).filter(function(x) { return Number(x.id) === j.classeId; })[0];
  if (!c) throw new Error('Classe introuvable.');
  var periode = (c.periodes || []).filter(function(p) { return !p.suivi && Number(p.id) === Number(q.periodeId); })[0] || { libelle: '', debut: '', fin: '' };
  var pays = ['FR', 'MC', 'AUTRE'].indexOf(EUC_DEV603_t_(q.pays).toUpperCase()) >= 0 ? EUC_DEV603_t_(q.pays).toUpperCase() : 'FR';
  var entreprise = EUC_DEV603_t_(q.entreprise).slice(0, 200), ville = EUC_DEV603_t_(q.ville).slice(0, 120), message = EUC_DEV603_t_(q.message).slice(0, 1500);
  if (!entreprise || !ville) throw new Error('Indique au moins le nom de l’entreprise et sa ville.');
  var tel = EUC_DEV603_t_(q.telephone) ? EUC_DEV603_telephone_(q.telephone, pays) : { ok: true, format: '' };
  if (!tel.ok) throw new Error('Téléphone de l’entreprise : ' + tel.erreur);
  if (EUC_DEV603_t_(q.courriel) && !EUC_DEV603_courriel_(q.courriel).ok) throw new Error('Courriel de l’entreprise : ' + EUC_DEV603_courriel_(q.courriel).erreur);
  var eleve = { id: j.eleveId, nom: 'ESSAI', prenom: 'Formulaire', naissance: '' }, emailEleve = '';
  if (j.eleveId) {
    var el = (EUC_ENT_grist('get', '/tables/EUC_ELEVES_PFMP/records?filter=' + encodeURIComponent(JSON.stringify({ id: [j.eleveId] }))).records || [])[0], ef = el ? el.fields || {} : {};
    eleve = { id: j.eleveId, nom: EUC_DEV603_nom_(ef.Nom), prenom: EUC_DEV603_prenom_(ef.Prenom_usage || ef.Prenom), naissance: EUC_SUIVI2_date_(ef.Date_naissance) };
    emailEleve = EUC_DEV603_t_(q.emailEleve).toLowerCase() || EUC_DEV603_t_(ef.Email_eleve || ef.Courriel || ef.Email).toLowerCase();
  }
  var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) throw new Error('Beaucoup d’envois en même temps : réessaie dans un instant.');
  var numero;
  try {
    numero = j.eleveId ? EUC_DEV603_numero_(m.annee) : 'ESSAI-' + Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyyMMdd-HHmmss');
    var vide = { civilite: '', prenom: '', nom: EUC_DEV603_t_(q.contact).slice(0, 120), fonction: '', telephone: tel.format, courriel: EUC_DEV603_t_(q.courriel).toLowerCase() };
    var ligne = EUC_DEV603_ligne_(numero, m.annee, eleve, { id: Number(c.id), nom: c.nom }, periode, { siret: EUC_DEV603_t_(q.siret).replace(/\D/g, ''), raisonSociale: entreprise, enseigne: '', adresse: EUC_DEV603_t_(q.adresse).slice(0, 250), complement: '', codePostal: '', commune: ville, actif: true }, vide, vide, emailEleve);
    ligne.Submission_ID = j.eleveId ? 'SECOURS-' + numero : numero; ligne.SIRET_statut = 'A_CONTROLER'; ligne.SIRET_source = 'Non vérifié (' + ({ FR: 'France', MC: 'Monaco', AUTRE: 'étranger' })[pays] + ')';
    ligne.Raison_sociale_officielle = ''; ligne.Adresse_officielle = ''; ligne.CP_officiel = ''; ligne.Ville_officielle = ''; ligne.Pays_officiel = pays === 'AUTRE' ? EUC_DEV603_t_(q.paysNom).slice(0, 60) : pays;
    ligne.Niveau_controle = 'ROUGE'; ligne.Decision = j.eleveId ? 'A_CONTROLER' : 'ESSAI';
    ligne.Alertes = 'Entreprise non vérifiée (' + ({ FR: 'SIRET qui ne fonctionne pas', MC: 'Monaco', AUTRE: 'étranger' })[pays] + ') — élève envoyé au bureau G205' + (message ? ' — message : ' + message : '');
    var cols = (EUC_ENT_grist('get', '/tables/' + EUC_V160_TABLE_ + '/columns').columns || []).map(function(x) { return x.id; }), fields = {};
    Object.keys(ligne).forEach(function(k) { if (cols.indexOf(k) >= 0) fields[k] = ligne[k]; });
    EUC_ENT_grist('post', '/tables/' + EUC_V160_TABLE_ + '/records', { records: [{ fields: fields }] });
  } finally { lock.releaseLock(); }
  EUC_DEV603_accuseDepot_(emailEleve, eleve, c.nom, numero, entreprise + ' (' + ville + ')', periode.libelle, true);
  return { ok: true, numero: numero, bureau: EUC_DEV603_BUREAU_ };
}
