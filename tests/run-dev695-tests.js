/* DEV695 — Formulaires élèves : « Responsable de l’entreprise » et « Tuteur de stage », jamais le responsable ou le tuteur légal. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'apps-script', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const FORMS = ['PFMP_Acces_QR_V116.html', 'PFMP_Continuation_QR_V117.html', 'Declaration_Entreprise_DEV603.html', 'PFMP.html'];
test('les quatre formulaires élèves (QR, suite du QR, « Déclarer mon entreprise », formulaire ouvert par le code) nomment « Responsable de l’entreprise » et « Tuteur de stage »', () => {
  FORMS.forEach(f => {
    const h = read(f);
    assert.match(h, /<h[23]>Responsable de l’entreprise<\/h[23]>/, f);
    assert.match(h, /<h[23]>(6\. )?Tuteur de stage<\/h[23]>/, f);
    assert.ok(h.includes('<b>Ce n’est pas ton responsable légal</b> (parent ou personne qui s’occupe de toi)'), f + ' : aide responsable');
    assert.ok(h.includes('<b>Ce n’est pas ton tuteur légal</b> ni un parent'), f + ' : aide tuteur');
    assert.ok(!/Responsable dans l’entreprise|<h[23]>Tuteur<\/h[23]>|<h2>6\. Tuteur<\/h2>/.test(h), f + ' : ancien libellé');
    assert.ok(/Le tuteur de stage est (également|aussi) le responsable de l’entreprise/.test(h), f + ' : case « même personne »');
  });
});
test('récapitulatif envoyé : « Responsable de l’entreprise » et « Tuteur de stage »', () => {
  const r = read('EUC_DEV649_LieuStageRecap.js');
  assert.ok(r.includes("['Responsable de l’entreprise', [") && r.includes("['Tuteur de stage' + (info.tuteurEstResponsable ? ' (le responsable de l’entreprise)' : '')"));
});
console.log(n + ' tests DEV695 réussis.');
