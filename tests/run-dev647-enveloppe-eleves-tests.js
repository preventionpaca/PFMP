/* DEV647 — Pages des élèves par la page d'enveloppe enregistrer-pfmp (sans bandeau Google Apps Script). */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };

test('EUC_LIEN_eleve_ construit les adresses depuis la table des liens', () => {
  const k = {}; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV640_Liens.js'), k);
  const base = k.EUC_LIEN_('enregistrer');
  assert.strictEqual(k.EUC_LIEN_eleve_(''), base);
  assert.strictEqual(k.EUC_LIEN_eleve_('page=pfmp&rid=12'), base + '?page=pfmp&rid=12');
  assert.strictEqual(k.EUC_LIEN_eleve_('?page=pfmp&token=ab'), base + '?page=pfmp&token=ab');
});

test('QR imprimés, code de secours et lien de secours passent par l’enveloppe', () => {
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_PdfV95.gs'), /data\.formUrl=EUC_LIEN_eleve_\('page=pfmp&rid='\+encodeURIComponent\(rid\)\);/);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_DonneesV80.gs'), /formUrl:EUC_LIEN_eleve_\('page=pfmp&rid='\+encodeURIComponent\(rid\)\)/);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_Service.gs'), /formUrl:EUC_LIEN_eleve_\('page=pfmp&token='\+encodeURIComponent\(token\)\)/);
  assert.match(read('apps-script/EUC_DEV603_Declaration.js'), /url: EUC_LIEN_eleve_\('page=pfmp&rid=' \+ rid\)/);
  assert.match(read('apps-script/EUC_PFMP_WebApp.gs'), /qr\.secoursUrl=EUC_LIEN_eleve_\(''\);/);
});

test('Les pages élèves acceptent d’être affichées dans l’enveloppe', () => {
  const web = read('apps-script/EUC_PFMP_WebApp.gs');
  assert.match(web, /setTitle\('Accès sécurisé PFMP'\)[^;]*setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)/);
  assert.match(web, /setTitle\('Entreprise et tuteur — PFMP'\)[^;]*setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)/);
  assert.match(read('apps-script/EUC_DEV603_Declaration.js'), /setTitle\('Enregistrer ma PFMP — Lycée Les Eucalyptus'\)[^;]*ALLOWALL/);
});

test('Choix 2 : aussi pour les conventions dont le QR code n’a pas de code écrit dessous', () => {
  const p = read('apps-script/Declaration_Entreprise_DEV603.html');
  assert.ok(p.includes('<b>1. Ma convention comporte un QR code</b>'));
  assert.ok(p.includes('<b>2. Ma convention n’a pas de QR code, ou pas de code écrit sous le QR code</b>'));
});
console.log(n + ' tests DEV647 réussis.');
