/** EDT V2.0 - Calculs, normalisation, génération séances, synthèses, TRM. Fonctions préfixées EDT_. */

function EDT_recalculerTout() {
  EDT_reconstruireLibelles_();
  EDT_normaliserCreneauxEDT();
  EDT_genererSeancesDepuisCreneaux();
  EDT_calculerSynthesesEDT();
  EDT_calculerSyntheseTRM();
  EDT_markUpdate_();
  EDT_journaliser_('RECALCUL_TOUT_V20', 'Syntheses', 'Recalcul complet EDT V2.0.');
}

function EDT_normaliserCreneauxEDT() {
  var creneaux = EDT_getRecords_('Creneaux_EDT');
  var actions = [];
  var compteur = 1;
  creneaux.forEach(function(r) {
    var f = r.fields;
    var patch = {};
    if (!f.Code_creneau) {
      patch.Code_creneau = 'EDT-' + Utilities.formatDate(new Date(), EDT_CONFIG.TIMEZONE, 'yyyyMMdd') + '-' + String(r.id || compteur++).padStart(5, '0');
    }
    if (!f.Statut) patch.Statut = 'VALIDE';
    if (!f.Type_creneau) patch.Type_creneau = 'Cours';
    if (!f.Type_placement) patch.Type_placement = 'ANNUEL';
    if (!f.Frequence) patch.Frequence = 'HEBDO';
    if (f.Compte_service === null || f.Compte_service === undefined) patch.Compte_service = true;
    if (Object.keys(patch).length) actions.push(['UpdateRecord', 'Creneaux_EDT', r.id, patch]);
  });
  EDT_applyActions_(actions);
}

function EDT_genererSeancesDepuisCreneaux() {
  var creneaux = EDT_getRecords_('Creneaux_EDT');
  var calendrier = EDT_getRecords_('Calendrier_Scolaire');
  EDT_clearTable_('Seances_Generees');
  var actions = [];
  creneaux.forEach(function(c) {
    var f = c.fields;
    if (String(f.Statut || '').toUpperCase() === 'SUPPRIME') return;
    var jour = Number(f.Jour_numero || 0);
    var dateDebut = EDT_dateOnly_(f.Date_debut);
    var dateFin = EDT_dateOnly_(f.Date_fin);
    calendrier.forEach(function(cal) {
      var cf = cal.fields;
      var d = EDT_dateOnly_(cf.Date);
      if (!d) return;
      if (Number(cf.Jour_numero || 0) !== jour) return;
      if (dateDebut && d < dateDebut) return;
      if (dateFin && d > dateFin) return;
      if (!EDT_frequenceOK_(f.Frequence || 'HEBDO', cf.Semaine_ISO, f.Semaines_personnalisees)) return;
      var duree = EDT_durationHours_(f.Heure_debut, f.Heure_fin);
      actions.push(['AddRecord', 'Seances_Generees', null, {
        Creneau: c.id,
        Code_creneau: f.Code_creneau || '',
        Date: d,
        Annee_scolaire: EDT_ref_(f.Annee_scolaire) || cf.Annee_scolaire || null,
        Version_EDT: EDT_ref_(f.Version_EDT) || null,
        Semaine_ISO: Number(cf.Semaine_ISO || 0),
        Jour_numero: jour,
        Jour_nom: f.Jour_nom || cf.Jour_nom || '',
        Enseignant: EDT_ref_(f.Enseignant),
        Classe: EDT_ref_(f.Classe),
        Groupe: EDT_ref_(f.Groupe),
        Salle: EDT_ref_(f.Salle),
        Matiere: EDT_ref_(f.Matiere),
        Type_creneau: f.Type_creneau || 'Cours',
        Heure_debut: f.Heure_debut || '',
        Heure_fin: f.Heure_fin || '',
        Duree: duree,
        Compte_service: f.Compte_service !== false,
        Statut: 'GENEREE',
        Commentaire: 'Générée par EDT V2.0'
      }]);
    });
  });
  EDT_applyActions_(actions);
}

function EDT_calculerSynthesesEDT() {
  var seances = EDT_getRecords_('Seances_Generees');
  var enseignants = EDT_getRecords_('Enseignants');
  var params = EDT_paramsMap_();
  var semainesRef = Number(params.Semaines_Reference_Service || 36);
  var serviceDef = Number(params.Service_Hebdo_Defaut || 18);
  EDT_clearTable_('Synthese_Hebdo_Enseignants');
  EDT_clearTable_('Synthese_Annuelle_Enseignants');
  EDT_clearTable_('Synthese_Hebdo_Ressources');
  EDT_clearTable_('Synthese_Annuelle_Ressources');
  EDT_clearTable_('Services_Enseignants');
  var hProf = {}, aProf = {}, rHebdo = {}, rAnnuel = {};
  seances.forEach(function(s) {
    var f = s.fields;
    if (f.Compte_service === false) return;
    var h = Number(f.Duree || 0);
    var ens = EDT_ref_(f.Enseignant);
    if (ens) {
      var k = [EDT_ref_(f.Annee_scolaire)||'', EDT_ref_(f.Version_EDT)||'', f.Semaine_ISO || 0, ens].join('|');
      hProf[k] = (hProf[k] || 0) + h;
      var ka = [EDT_ref_(f.Annee_scolaire)||'', EDT_ref_(f.Version_EDT)||'', ens].join('|');
      aProf[ka] = (aProf[ka] || 0) + h;
    }
    ['Salle','Classe','Groupe','Matiere'].forEach(function(t) {
      var id = EDT_ref_(f[t]);
      if (!id) return;
      var kr = [EDT_ref_(f.Annee_scolaire)||'', EDT_ref_(f.Version_EDT)||'', t, id, f.Semaine_ISO || 0].join('|');
      rHebdo[kr] = (rHebdo[kr] || 0) + h;
      var kra = [EDT_ref_(f.Annee_scolaire)||'', EDT_ref_(f.Version_EDT)||'', t, id].join('|');
      rAnnuel[kra] = (rAnnuel[kra] || 0) + h;
    });
  });
  var ensById = {}; enseignants.forEach(function(e) { ensById[e.id] = e.fields; });
  var actions = [];
  Object.keys(hProf).forEach(function(k) {
    var p = k.split('|'), ens = Number(p[3]);
    var service = Number((ensById[ens] && ensById[ens].Service_hebdo_reference) || serviceDef);
    var heures = hProf[k], ecart = heures - service;
    actions.push(['AddRecord','Synthese_Hebdo_Enseignants',null,{Annee_scolaire:p[0] ? Number(p[0]) : null, Version_EDT:p[1] ? Number(p[1]) : null, Semaine_ISO:Number(p[2]), Enseignant:ens, Heures_service:heures, Service_hebdo_reference:service, Ecart:ecart, Heures_sup:Math.max(0,ecart)}]);
  });
  Object.keys(aProf).forEach(function(k) {
    var p = k.split('|'), ens = Number(p[2]);
    var service = Number((ensById[ens] && ensById[ens].Service_hebdo_reference) || serviceDef);
    var ann = aProf[k], moy = ann / semainesRef, ecart = moy - service;
    actions.push(['AddRecord','Synthese_Annuelle_Enseignants',null,{Annee_scolaire:p[0] ? Number(p[0]) : null, Version_EDT:p[1] ? Number(p[1]) : null, Enseignant:ens, Heures_annuelles_placees:ann, Moyenne_hebdo_placee:moy, Service_hebdo_reference:service, Ecart_hebdo:ecart, Heures_sup_hebdo:Math.max(0,ecart)}]);
    actions.push(['AddRecord','Services_Enseignants',null,{Annee_scolaire:p[0] ? Number(p[0]) : null, Version_EDT:p[1] ? Number(p[1]) : null, Enseignant:ens, Service_hebdo_reference:service, Semaines_reference:semainesRef, Service_annuel_reference:service*semainesRef, Heures_annuelles_placees:ann, Moyenne_hebdo_placee:moy, Ecart_hebdo:ecart, Heures_sup_hebdo:Math.max(0,ecart)}]);
  });
  Object.keys(rHebdo).forEach(function(k){ var p=k.split('|'); actions.push(['AddRecord','Synthese_Hebdo_Ressources',null,{Annee_scolaire:p[0]?Number(p[0]):null, Version_EDT:p[1]?Number(p[1]):null, Type_ressource:p[2], Ressource_id:Number(p[3]), Semaine_ISO:Number(p[4]), Heures:rHebdo[k]}]); });
  Object.keys(rAnnuel).forEach(function(k){ var p=k.split('|'); actions.push(['AddRecord','Synthese_Annuelle_Ressources',null,{Annee_scolaire:p[0]?Number(p[0]):null, Version_EDT:p[1]?Number(p[1]):null, Type_ressource:p[2], Ressource_id:Number(p[3]), Heures_annuelles:rAnnuel[k], Moyenne_hebdo:rAnnuel[k]/semainesRef}]); });
  EDT_applyActions_(actions);
}

function EDT_calculerSyntheseTRM() {
  var lignes = EDT_getRecords_('TRM_Lignes');
  var rep = EDT_getRecords_('TRM_Repartition_Enseignants');
  var creneaux = EDT_getRecords_('Creneaux_EDT');
  EDT_clearTable_('TRM_Synthese');
  var attrib = {}, pose = {};
  rep.forEach(function(r){ var id=EDT_ref_(r.fields.Ligne_TRM); if(id) attrib[id]=(attrib[id]||0)+Number(r.fields.Heures_hebdo_attribuees||0); });
  creneaux.forEach(function(c){ var f=c.fields; if(String(f.Statut||'').toUpperCase()==='SUPPRIME') return; var id=EDT_ref_(f.Ligne_TRM); if(!id) return; pose[id]=(pose[id]||0)+EDT_durationHours_(f.Heure_debut,f.Heure_fin); });
  var actions=[];
  lignes.forEach(function(l){ var f=l.fields, id=l.id; var dues=Number(f.Heures_hebdo_totales_attendues||f.Heures_hebdo_dues||0); var a=attrib[id]||0, p=pose[id]||0, e=dues-p; var st=e===0?'OK':(e>0?'MANQUE':'DEPASSEMENT'); actions.push(['AddRecord','TRM_Synthese',null,{Annee_scolaire:EDT_ref_(f.Annee_scolaire), Version_EDT:EDT_ref_(f.Version_EDT), Ligne_TRM:id, Heures_hebdo_dues:dues, Heures_hebdo_attribuees:a, Heures_hebdo_posees_EDT:p, Ecart_a_poser:e, Statut:st}]); });
  EDT_applyActions_(actions);
}

function EDT_creerVersionEDT(nom, anneeRef, commentaire) {
  var res = EDT_applyActions_([['AddRecord','Versions_EDT',null,{Annee_scolaire:anneeRef||null, Nom:nom||('Version '+new Date().toISOString()), Statut:'BROUILLON', Date_creation:new Date().toISOString(), Active:false, Commentaire:commentaire||''}]]);
  EDT_markUpdate_();
  return res;
}

function EDT_dupliquerVersionEDT(versionSourceId, nomNouvelleVersion) {
  var newRes = EDT_creerVersionEDT(nomNouvelleVersion || 'Copie version', null, 'Duplication automatique');
  var versions = EDT_getRecords_('Versions_EDT');
  var cible = versions[versions.length-1];
  var creneaux = EDT_getRecords_('Creneaux_EDT').filter(function(r){ return EDT_ref_(r.fields.Version_EDT) === Number(versionSourceId); });
  var actions = [];
  creneaux.forEach(function(r){ var f = Object.assign({}, r.fields); delete f.Code_creneau; f.Version_EDT = cible.id; actions.push(['AddRecord','Creneaux_EDT',null,f]); });
  EDT_applyActions_(actions);
  EDT_normaliserCreneauxEDT();
  EDT_markUpdate_();
}

function EDT_reconstruireLibelles_() {
  EDT_updateLibelleTable_('Enseignants', function(f){ return ((f.Nom || '') + ' ' + (f.Prenom || '')).trim(); }, 'Nom_complet');
  EDT_updateLibelleTable_('Classes', function(f){ return f.Libelle || f.Nom || ''; }, 'Libelle');
  EDT_updateLibelleTable_('Groupes', function(f){ return f.Libelle || f.Nom || ''; }, 'Libelle');
  EDT_updateLibelleTable_('Salles', function(f){ return f.Libelle || f.Nom || ''; }, 'Libelle');
  EDT_updateLibelleTable_('Matieres', function(f){ return f.Libelle || f.Nom || f.Code || ''; }, 'Libelle');
  EDT_updateLibelleTable_('Eleves', function(f){ return ((f.Nom || '') + ' ' + (f.Prenom || '')).trim(); }, 'Nom_complet');
}

function EDT_updateLibelleTable_(table, fn, col) {
  var rows = EDT_getRecords_(table), actions = [];
  rows.forEach(function(r){ var v = fn(r.fields); if (v && r.fields[col] !== v) { var o={}; o[col]=v; actions.push(['UpdateRecord', table, r.id, o]); } });
  EDT_applyActions_(actions);
}

function EDT_paramsMap_() { var p={}; EDT_getRecords_('Parametres_EDT').forEach(function(r){p[r.fields.Cle]=r.fields.Valeur;}); return p; }
function EDT_ref_(v) { if (Array.isArray(v)) return Number(v[1] || v[0]) || null; return Number(v) || null; }
function EDT_dateOnly_(v) { if (!v) return null; if (v instanceof Date) return Utilities.formatDate(v, EDT_CONFIG.TIMEZONE, 'yyyy-MM-dd'); return String(v).slice(0,10); }
function EDT_durationHours_(a,b) { return (EDT_minutes_(b) - EDT_minutes_(a)) / 60; }
function EDT_minutes_(t) { var p = String(t || '00:00').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); }
function EDT_frequenceOK_(freq,w,perso) { freq=String(freq||'HEBDO').toUpperCase(); w=Number(w); if(freq==='HEBDO')return true; if(freq==='S1'||freq==='PAIRE')return w%2===0; if(freq==='S2'||freq==='IMPAIRE')return w%2===1; if(freq==='SUR_4')return w%4===0; if(freq==='PERSONNALISE')return String(perso||'').split(/[;, ]+/).map(Number).indexOf(w)!==-1; return true; }
function EDT_clearTable_(table) { var rows = EDT_getRecords_(table); if (rows.length) EDT_applyActions_([['BulkRemoveRecord', table, rows.map(function(r){return r.id;})]]); }
function EDT_markUpdate_() { var rows = EDT_getRecords_('Parametres_EDT'); var r = rows.find(function(x){ return x.fields.Cle === 'LastUpdate'; }); if (r) EDT_applyActions_([['UpdateRecord','Parametres_EDT',r.id,{Valeur:new Date().toISOString()}]]); }
function EDT_journaliser_(action, tableCible, detail) { try { EDT_applyActions_([['AddRecord','Journal_EDT',null,{Date_action:new Date().toISOString(),Utilisateur:Session.getActiveUser().getEmail()||'inconnu',Action:action,Table_cible:tableCible,Detail:detail}]]); } catch(e) {} }
