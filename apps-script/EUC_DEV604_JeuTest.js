/**
 * DEV604 — Classe et élève de test (administration).
 *
 * Crée, sans doublon, dans Grist : une classe « TEST … » (écartée des effectifs, du suivi des
 * professeurs, de la carte et des books), une période PFMP de l'année pour cette classe, et un
 * élève de test dont le courriel est celui de l'administrateur (il reçoit les courriels du QR code,
 * du formulaire de secours et de la validation). Aperçu d'abord, écriture avec confirmation 'CREER'.
 * Les identités saisies ne sont jamais écrites dans le code : elles viennent du formulaire.
 */
function EUC_DEV604_t_(v) { return v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
function EUC_DEV604_n_(v) { return EUC_DEV604_t_(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function EUC_DEV604_colonnes_(table) {
  /* Les colonnes à formule (calculées par Grist) ne sont jamais écrites : Grist refuserait (400). */
  var out = {}; (EUC_DEV604_etape_('lecture des colonnes de ' + table, function() { return EUC_ENT_grist('get', '/tables/' + table + '/columns').columns || []; })).forEach(function(c) {
    var f = c.fields || {}; if (f.isFormula && EUC_DEV604_t_(f.formula)) return; out[c.id] = String(f.type || 'Text'); }); return out;
}
/* Exécute une étape et nomme l'étape en cas d'erreur. */
function EUC_DEV604_etape_(nom, fn) { try { return fn(); } catch (e) { throw new Error('Échec à l’étape « ' + nom + ' » : ' + String(e && e.message || e).replace(/^Error:\s*/, '')); } }
function EUC_DEV604_lignes_(table) { try { return EUC_ENT_grist('get', '/tables/' + table + '/records').records || []; } catch (e) { return []; } }
/* Valeur au format de la colonne (calcul pur) : date en secondes, référence, liste de références, booléen. */
function EUC_DEV604_valeur_(type, v) {
  if (v == null || v === '') return v;
  if (type === 'Date') return Math.round(Date.parse(String(v) + 'T00:00:00Z') / 1000);
  if (/^RefList:/.test(type)) return ['L'].concat((Array.isArray(v) ? v : [v]).map(Number));
  if (/^Ref:/.test(type)) return isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined;
  if (type === 'Bool') return v === true || v === 'true';
  if (/^(Int|Numeric)$/.test(type)) return Number(v);
  return Array.isArray(v) ? v.join(', ') : String(v);
}
/* Champs filtrés sur les colonnes existantes et convertis (calcul pur). */
function EUC_DEV604_champs_(cols, souhait) {
  var out = {}; Object.keys(souhait).forEach(function(k) { if (!cols[k] || souhait[k] === undefined) return; var v = EUC_DEV604_valeur_(cols[k], souhait[k]); if (v !== undefined && !(typeof v === 'number' && isNaN(v))) out[k] = v; }); return out;
}
/* Référence vers une ligne d'une autre table, retrouvée par son texte (année « 2026-2027 », type « PFMP »). */
function EUC_DEV604_ref_(type, texte, champs) {
  var m = /^Ref(?:List)?:(.+)$/.exec(type || ''); if (!m) return texte;
  var cible = EUC_DEV604_n_(texte), trouve = EUC_DEV604_lignes_(m[1]).filter(function(r) { var f = r.fields || {}; return champs.some(function(c) { return EUC_DEV604_n_(f[c]) === cible; }); })[0];
  return trouve ? Number(trouve.id) : undefined;
}

function EUC_DEV604_jeuTest(q) {
  var ctx = EUC_SUIVI2_exigerAdmin_(); q = q || {};
  var annee = EUC_SUIVI2_anneeCourante_(EUC_SUIVI2_aujourdhui_());
  var nomClasse = EUC_DEV604_t_(q.classe || 'TEST PFMP').toUpperCase();
  if (!EUC_SUIVI2_classeTest_(nomClasse)) throw new Error('Le nom de la classe doit commencer par « TEST » (ex. TEST PFMP).');
  var prenom = EUC_DEV604_t_(q.prenom), nom = EUC_DEV604_t_(q.nom).toUpperCase(), email = EUC_DEV604_t_(q.email).toLowerCase(), naissance = EUC_DEV604_t_(q.naissance);
  var debut = EUC_DEV604_t_(q.debut), fin = EUC_DEV604_t_(q.fin), libelle = EUC_DEV604_t_(q.libelle || 'PFMP test');
  if (!prenom || !nom) throw new Error('Indiquez le prénom et le nom de l’élève de test.');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) throw new Error('Adresse courriel invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(naissance)) throw new Error('Indiquez une date de naissance.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) throw new Error('Dates de la période invalides.');

  var cc = EUC_DEV604_colonnes_('Classes'), cp = EUC_DEV604_colonnes_('Planning_Periodes'), ce = EUC_DEV604_colonnes_('EUC_ELEVES_PFMP');
  var classe = EUC_DEV604_lignes_('Classes').filter(function(r) { return EUC_DEV604_n_((r.fields || {}).Nom) === EUC_DEV604_n_(nomClasse); })[0];
  var plan = { annee: annee, classe: { nom: nomClasse, existe: !!classe, id: classe ? Number(classe.id) : 0 } };
  var periode = classe ? EUC_DEV604_lignes_('Planning_Periodes').filter(function(r) { var f = r.fields || {}; var ids = Array.isArray(f.Classes_concernees) ? f.Classes_concernees.slice(1).map(Number) : [Number(f.Classe)]; return ids.indexOf(Number(classe.id)) >= 0 && EUC_DEV604_n_(f.Libelle_periode || f.Libelle || f.Nom) === EUC_DEV604_n_(libelle); })[0] : null;
  plan.periode = { libelle: libelle, debut: debut, fin: fin, existe: !!periode, id: periode ? Number(periode.id) : 0 };
  var eleve = classe ? EUC_DEV604_lignes_('EUC_ELEVES_PFMP').filter(function(r) { var f = r.fields || {}; return EUC_DEV604_n_(f.Nom) === EUC_DEV604_n_(nom) && EUC_DEV604_n_(f.Prenom) === EUC_DEV604_n_(prenom); })[0] : null;
  plan.eleve = { prenom: prenom, nom: nom, email: email, naissance: naissance, existe: !!eleve, id: eleve ? Number(eleve.id) : 0 };
  if (q.confirmation !== 'CREER') { plan.apercu = true; plan.ok = true; return plan; }

  var anneeRefP = EUC_DEV604_ref_(cp.Annee_scolaire, annee, ['Code', 'Libelle']), typeRef = EUC_DEV604_ref_(cp.Type, 'PFMP', ['Type', 'Libelle', 'Code']);
  var anneeRefE = EUC_DEV604_ref_(ce.Annee_scolaire, annee, ['Code', 'Libelle']);
  if (!classe) {
    var fc = EUC_DEV604_champs_(cc, { Nom: nomClasse, Actif: true, Etab: 'LP', Code_import: nomClasse, Classe_PFMP: nomClasse });
    plan.classe.id = Number((EUC_DEV604_etape_('création de la classe', function() { return EUC_ENT_grist('post', '/tables/Classes/records', { records: [{ fields: fc }] }); }).records || [{}])[0].id);
  }
  var champsP = EUC_DEV604_champs_(cp, { Libelle_periode: libelle, Libelle: libelle, Nom: libelle, Type: typeRef, Date_debut: debut, Date_fin: fin, Annee_scolaire: anneeRefP, Classes_concernees: [plan.classe.id], Classe_PFMP: nomClasse, Actif: true, Commentaire: 'Période de test (DEV604)' });
  if (periode) EUC_DEV604_etape_('mise à jour de la période', function() { EUC_ENT_grist('patch', '/tables/Planning_Periodes/records', { records: [{ id: periode.id, fields: EUC_DEV604_champs_(cp, { Date_debut: debut, Date_fin: fin }) }] }); });
  else plan.periode.id = Number((EUC_DEV604_etape_('création de la période', function() { return EUC_ENT_grist('post', '/tables/Planning_Periodes/records', { records: [{ fields: champsP }] }); }).records || [{}])[0].id);
  var champsE = EUC_DEV604_champs_(ce, { Nom: nom, Prenom: prenom, Date_naissance: naissance, Email_eleve: email, Courriel: email, Classe: plan.classe.id, Annee_scolaire: anneeRefE, Actif: true, Present_dernier_import: true });
  if (eleve) EUC_DEV604_etape_('mise à jour de l’élève', function() { EUC_ENT_grist('patch', '/tables/EUC_ELEVES_PFMP/records', { records: [{ id: eleve.id, fields: champsE }] }); });
  else plan.eleve.id = Number((EUC_DEV604_etape_('création de l’élève', function() { return EUC_ENT_grist('post', '/tables/EUC_ELEVES_PFMP/records', { records: [{ fields: champsE }] }); }).records || [{}])[0].id);
  try { CacheService.getScriptCache().remove('EUC_DEV586_CLASSES'); } catch (e) {}
  plan.ok = true; plan.apercu = false; plan.auteur = ctx && ctx.email || '';
  return plan;
}
