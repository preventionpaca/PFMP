/* DEV709 — suivi d'une classe : sous le tableau, élèves en stage dans une même entreprise et professeurs affectés. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Suivi_PFMP_Classe_Detail_V156.html'), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const bloc = (html.match(/<script id="EUC_DEV709_MEME_ENTREPRISE">([\s\S]*?)<\/script>/) || [])[1];

function page(lignes) {
  const el = () => ({ style: {}, innerHTML: '', setAttribute() {}, parentNode: null });
  const box = { el: null };
  const wrap = el(), tb = el();
  wrap.parentNode = { insertBefore(b) { box.el = b; } };
  tb.closest = () => wrap;
  const document = {
    readyState: 'complete',
    getElementById: id => id === 'tbody' ? tb : id === 'euc709Box' ? box.el : null,
    createElement: () => el()
  };
  const k = { window: { EUC_DEV417_DETAIL_CURRENT: { lignes } }, document, setTimeout: f => f(), MutationObserver: function () { this.observe = () => {}; }, String, Object };
  vm.createContext(k); vm.runInContext(bloc, k);
  return { k, box: () => box.el };
}
const L = (nom, entreprise, adresse, visite, tel, o) => Object.assign({ nom, prenom: 'A', entreprise, adresseEntreprise: adresse, professeurVisiteur: visite, professeurTelephone: tel, statut: 'Convention signée' }, o);

test('bloc présent, en lecture seule (aucun appel serveur)', () => {
  assert.ok(bloc, 'bloc DEV709');
  assert.ok(!/google\.script\.run/.test(bloc));
});

test('regroupe par entreprise (casse, accents, forme juridique) et code postal ; ignore les élèves seuls, sans entreprise ou hors stage', () => {
  const { k } = page([]);
  const gs = k.window.EUC_DEV709_groupes([
    L('DUPONT', 'Garage Azur SARL', '1 rue du Port 06300 Nice', 'M. X', 'Mme Y'),
    L('MARTIN', 'GARAGE AZUR', '1 rue du Port, 06300 NICE', 'M. X', 'Mme Y'),
    L('ALBERT', 'Garage Azur', '5 av. de Grasse 06400 Cannes', 'M. Z', ''),
    L('SEUL', 'Électricité Côte', '06000 Nice', '', ''),
    L('VIDE', '', '', '', ''),
    L('ANNULE', 'GARAGE AZUR', '06300 Nice', '', '', { statut: 'Convention annulée' })
  ]);
  assert.equal(gs.length, 1);
  assert.equal(gs[0].nombre, 2);
  assert.deepEqual(Array.from(gs[0].eleves), ['DUPONT A', 'MARTIN A']);
  assert.equal(gs[0].visiteVerdict, 'UN_SEUL'); assert.equal(gs[0].telephoneVerdict, 'UN_SEUL');
});

test('signale plusieurs professeurs ou aucun professeur affecté', () => {
  const { k } = page([]);
  const gs = k.window.EUC_DEV709_groupes([
    L('A', 'CH Cannes', '06400', 'M. X', ''), L('B', 'CH Cannes', '06400', 'Mme W', ''), L('C', 'CH Cannes', '06400', '', '')
  ]);
  assert.equal(gs[0].visiteVerdict, 'PLUSIEURS'); assert.equal(gs[0].telephoneVerdict, 'AUCUN');
});

test('encadré sous le tableau : liste et alerte ; message si aucune entreprise partagée ; masqué sans élève', () => {
  let p = page([L('DUPONT', 'Garage Azur', '06300', 'M. X', 'Mme Y'), L('MARTIN', 'Garage Azur', '06300', 'Mme W', 'Mme Y')]);
  const h = p.box().innerHTML;
  assert.ok(/Élèves en stage dans une même entreprise/.test(h));
  assert.ok(/2 élèves<\/b> : DUPONT A, MARTIN A/.test(h));
  assert.ok(/Suivi téléphonique : <span class="euc709-ok">Mme Y ✓/.test(h));
  assert.ok(/plusieurs professeurs/.test(h) && /1 à vérifier/.test(h));
  p = page([L('DUPONT', 'Garage Azur', '06300', '', ''), L('MARTIN', 'Autre', '06300', '', '')]);
  assert.ok(/Aucune entreprise n’accueille plusieurs élèves/.test(p.box().innerHTML));
  p = page([]);
  assert.equal(p.box().style.display, 'none');
});

test('échappe les noms (pas d’injection HTML)', () => {
  const p = page([L('<b>X</b>', 'Ent <i>', '06300', '', ''), L('Y', 'Ent <i>', '06300', '', '')]);
  assert.ok(!/<b>X<\/b>/.test(p.box().innerHTML) && /&lt;b&gt;X/.test(p.box().innerHTML));
});

console.log(n + ' tests DEV709 réussis');
