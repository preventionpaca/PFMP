/* DEV691 — Responsable et tuteur : lettres seulement pour nom et prénom, chiffres (+ indicatif) pour le téléphone, champs obligatoires, dans les deux formulaires. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const mod = read('apps-script/Saisie_Contacts_DEV691.html');
function client() {
  const ecoute = {}, k = { window: {}, String, Math, setTimeout, clearTimeout,
    document: { addEventListener: (t, f) => { (ecoute[t] = ecoute[t] || []).push(f); }, querySelectorAll: () => [] } };
  vm.createContext(k); vm.runInContext(mod.replace(/^<script[^>]*>|<\/script>\s*$/g, ''), k); k.__ecoute = ecoute; return k;
}
function champ(attrs, valeur) {
  const parent = { querySelector: () => parent._aide || null };
  const el = { tagName: 'INPUT', value: valeur, selectionStart: valeur.length, parentNode: parent, attrs, setSelectionRange() {}, setAttribute() {},
    matches: sel => sel.split(',').some(s => (s.includes('[name=') && s.includes('[name=' + attrs.name + ']')) || (s.startsWith('input.') && s === 'input.' + attrs.cls) || (s === '#' + attrs.id)),
    insertAdjacentElement: (pos, a) => { parent._aide = a; } };
  return el;
}
test('frappe : chiffres et symboles retirés des noms (lettres, accents, apostrophe, trait d’union gardés) ; téléphone : chiffres, espaces et + en tête', () => {
  const k = client(), L = k.window.EUC_DEV691.lettres, C = k.window.EUC_DEV691.chiffres;
  assert.equal(L('Jean-Noël'), 'Jean-Noël'); assert.equal(L("D'Arc O’Neil"), "D'Arc O’Neil"); assert.equal(L('06 12 34'), '  '); assert.equal(L('Dupont2'), 'Dupont'); assert.equal(L('Éloïse'), 'Éloïse');
  assert.equal(C('+377 93 15'), '+377 93 15'); assert.equal(C('06.12.34.56.78'), '0612345678'); assert.equal(C('06 12 ab'), '06 12 '); assert.equal(C('12+34'), '1234', 'le + seulement en tête');
  assert.equal(k.window.EUC_DEV691.MSG_NOM, 'Ce champ ne contient que des lettres, aucun chiffre.'); assert.match(k.window.EUC_DEV691.MSG_TEL, /n’accepte que des chiffres \(et le \+ de l’indicatif international/);
});
test('frappe : la saisie interdite est retirée et le message s’affiche sous le champ (QR et « Déclarer mon entreprise »)', () => {
  const k = client(), ecoute = k.__ecoute.input[0];
  global.document = { createElement: () => ({ setAttribute() {}, style: {}, textContent: '' }) }; k.document.createElement = global.document.createElement;
  const nomQr = champ({ name: 'responsableNom' }, 'Martin06'); ecoute({ target: nomQr }); assert.equal(nomQr.value, 'Martin'); assert.equal(nomQr.parentNode._aide.textContent, 'Ce champ ne contient que des lettres, aucun chiffre.');
  const telDecl = champ({ cls: 'tel' }, '06 12 ab'); ecoute({ target: telDecl }); assert.equal(telDecl.value, '06 12 '); assert.match(telDecl.parentNode._aide.textContent, /que des chiffres/);
  const autre = champ({ name: 'entrepriseCommune' }, 'Nice 06'); ecoute({ target: autre }); assert.equal(autre.value, 'Nice 06', 'autres champs intouchés');
});
test('pages : module inclus dans le formulaire QR, sa reprise et « Déclarer mon entreprise » ; champs marqués obligatoires', () => {
  const inc = "<?!= HtmlService.createHtmlOutputFromFile('Saisie_Contacts_DEV691').getContent() ?>";
  for (const f of ['PFMP_Acces_QR_V116.html', 'PFMP_Continuation_QR_V117.html', 'Declaration_Entreprise_DEV603.html']) assert.ok(read('apps-script/' + f).includes(inc), f);
  const qr = read('apps-script/PFMP_Acces_QR_V116.html');
  ['responsablePrenom', 'responsableFonction', 'responsableTelephone', 'responsableCourriel', 'tuteurPrenom', 'tuteurFonction', 'tuteurTelephone', 'tuteurCourriel'].forEach(f => assert.match(qr, new RegExp(' \\*\\n<input name="' + f + '"'), f));
  const v117 = read('apps-script/PFMP_Continuation_QR_V117.html'); assert.match(v117, /<label>Téléphone \*<input name="tuteurTelephone"/);
  const d = read('apps-script/Declaration_Entreprise_DEV603.html'); ['Civilité', 'Prénom', 'NOM', 'Fonction', 'Téléphone', 'Courriel'].forEach(l => assert.match(d, new RegExp('<label>' + l + ' \\*</label>'), l));
});
test('serveur : message « que des lettres » ; formulaire QR : téléphones contrôlés comme « Déclarer mon entreprise » (France, Monaco, international)', () => {
  const k = { String, Error }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV602_Identites.js'), k);
  assert.throws(() => k.EUC_DEV602_verifierPersonne_('Responsable', 'M.', 'Paul', '0612345678'), /ce champ ne contient que des lettres, aucun chiffre/);
  const d = { String, Error, Math, Number }; vm.createContext(d); vm.runInContext(read('apps-script/EUC_DEV603_Declaration.js').match(/function EUC_DEV603_t_[^\n]*\n/)[0] + read('apps-script/EUC_DEV603_Declaration.js').match(/function EUC_DEV603_telephone_[\s\S]*?\n}\n/)[0], d);
  assert.equal(d.EUC_DEV603_telephone_('06 12 34 56 78', 'FR').ok, true); assert.equal(d.EUC_DEV603_telephone_('+377 93 15 00 00', 'MC').ok, true); assert.equal(d.EUC_DEV603_telephone_('Gamal', 'FR').ok, false);
  const qr = read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs');
  assert.match(qr, /telR=EUC_DEV603_telephone_\(respTelephone,paysTel\);\s*if\(!telR\.ok\)throw new Error\('Téléphone du responsable/); assert.match(qr, /EUC_DEV603_telephone_\(tTelephone,paysTel\)/);
  assert.match(qr, /if\(!respNom\|\|!respPrenom\|\|!respFonction\|\|!respTelephone\|\|!respCourriel\)/, 'champs du responsable obligatoires'); assert.match(qr, /if\(!tNom\|\|!tPrenom\|\|!tFonction\|\|!tTelephone\|\|!tCourriel\)/, 'champs du tuteur obligatoires');
});
console.log(n + ' tests DEV691 réussis.');
