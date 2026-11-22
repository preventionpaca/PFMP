/* DEV707 — Établissement d'accueil : SIRET du siège hors Alpes-Maritimes → choix de l'établissement de stage. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const tests = [];
const test = (nom, fn) => tests.push([nom, fn]);

const part = read('apps-script/Etablissements_DEV707.html');
const code = part.match(/<script id="EUC_DEV707_ETABLISSEMENTS">([\s\S]*?)<\/script>/)[1];

/* Réponse de l'annuaire officiel (forme réelle, recherche « TECHNIDRILL » dans le 06). */
const ANNUAIRE = { results: [
  { siren: '351053673', nom_complet: 'TECHNIDRILL', matching_etablissements: [
    { siret: '35105367300049', adresse: 'ZI CARROS LE BROC 18EME RUE 1ERE AVENUE 06510 CARROS', code_postal: '06510', libelle_commune: 'CARROS', etat_administratif: 'A' },
    { siret: '35105367300072', adresse: 'ILOT P 11 EME RUE BAT 123 UNITE 1 4EME AVENUE 06510 CARROS', code_postal: '06510', libelle_commune: 'CARROS', etat_administratif: 'A' },
    { siret: '35105367300023', adresse: 'ILOT G3 1ERE AVENUE 6EME R ZONE INDUSTRIELLE 06510 CARROS', code_postal: '06510', etat_administratif: 'F' },
    { siret: '35105367300064', adresse: '55 RUE AMPERE 69680 CHASSIEU', code_postal: '69680', etat_administratif: 'A' }] },
  { siren: '444301782', nom_complet: 'TECHNIDRILL INVESTISSEMENTS', matching_etablissements: [{ siret: '44430178200017', code_postal: '06510', etat_administratif: 'A' }] }] };

/* Mini document : assez pour la boîte de choix (création, insertion, boutons, clics). */
function dom() {
  const els = {};
  function el(tag) {
    const e = { tagName: tag, id: '', className: '', attrs: {}, children: [], parentNode: null, disabled: false, listeners: {}, _html: '', dataset: {},
      classList: { contains: c => (e.className || '').split(' ').includes(c) },
      setAttribute(k, v) { this.attrs[k] = v; },
      appendChild(c) { c.parentNode = this; this.children.push(c); if (c.id) els[c.id] = c; return c; },
      removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; if (els[c.id] === c) delete els[c.id]; },
      insertAdjacentElement(pos, c) { const p = this.parentNode || racine; c.parentNode = p; p.children.push(c); if (c.id) els[c.id] = c; },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      click() { if (!this.disabled) (this.listeners.click || []).forEach(f => f()); },
      querySelector(s) { return this.querySelectorAll(s)[0] || null; },
      querySelectorAll(s) { return (this._boutons || []).filter(b => s === 'button' || (s === 'button[data-i]' && b.dataset.i != null) || (s === '.euc707-non' && b.className === 'euc707-non')); }
    };
    Object.defineProperty(e, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; this._boutons = [];
      const re = /<button type="button"( class="([^"]*)")?( data-i="(\d+)")?>/g; let m; while ((m = re.exec(v))) { const b = el('button'); b.className = m[2] || ''; if (m[4] != null) b.dataset.i = m[4]; this._boutons.push(b); } } });
    return e;
  }
  const racine = el('div');
  return { racine, el, document: { getElementById: id => els[id] || null, createElement: el } };
}
function charger(fetchFn) {
  const d = dom(), w = { document: d.document, fetch: fetchFn, setTimeout, clearTimeout, AbortController, encodeURIComponent, String, Number, Object };
  w.window = w; vm.createContext(w); vm.runInContext(code, w);
  return { E: w.EUC707, d };
}
const attendre = () => new Promise(r => setTimeout(r, 0));

test('établissements proposés : même SIREN, ouverts, dans les Alpes-Maritimes, autre que le SIRET saisi', () => {
  const { E } = charger(() => { throw new Error('pas d’appel'); });
  const l = JSON.parse(JSON.stringify(E.etablissements(ANNUAIRE, '35105367300064')));
  assert.deepEqual(l.map(x => x.siret), ['35105367300049', '35105367300072'], 'Carros 00049 et 00072 ; fermé, siège et autre SIREN exclus');
  assert.equal(E.etablissements(ANNUAIRE, '35105367300049').some(x => x.siret === '35105367300049'), false);
  assert.deepEqual([E.horsZone('69680'), E.horsZone('06510'), E.horsZone('98000'), E.horsZone(''), E.horsZone('6510')], [true, false, false, false, false]);
});

test('SIRET dans les Alpes-Maritimes ou à Monaco : aucune question, aucun appel à l’annuaire', () => {
  let appels = 0; const { E, d } = charger(() => { appels++; return Promise.reject(new Error('x')); });
  const ancre = d.el('div'); d.racine.appendChild(ancre);
  assert.equal(E.proposer({ siret: '35105367300049', nom: 'TECHNIDRILL', cp: '06510', commune: 'CARROS', ancre, choisir() {} }), false);
  assert.equal(E.proposer({ siret: '12345678901234', nom: 'X', cp: '98000', ancre, choisir() {} }), false);
  assert.equal(appels, 0);
});

test('siège à Chassieu : question posée, Continuer bloqué, choix de Carros → nouvelle vérification avec ce SIRET', async () => {
  const urls = []; const { E, d } = charger(u => { urls.push(u); return Promise.resolve({ ok: true, json: () => Promise.resolve(ANNUAIRE) }); });
  const ancre = d.el('div'); ancre.id = 'officiel'; d.racine.appendChild(ancre);
  const cont = d.el('button'); let choisi = '';
  assert.equal(E.proposer({ siret: '35105367300064', nom: 'TECHNIDRILL', cp: '69680', commune: 'CHASSIEU', ancre, bloquer: cont, choisir: s => { choisi = s; } }), true);
  const box = d.document.getElementById('euc707Box');
  assert.match(box.innerHTML, /recherche des autres établissements/, 'chargement visible'); assert.equal(cont.disabled, true, 'Continuer bloqué pendant la recherche');
  await attendre(); await attendre(); await attendre();
  assert.match(urls[0], /recherche-entreprises\.api\.gouv\.fr\/search\?q=TECHNIDRILL&departement=06/);
  assert.match(box.innerHTML, /Où fais-tu ton stage/); assert.match(box.innerHTML, /ZI CARROS LE BROC 18EME RUE 1ERE AVENUE/); assert.match(box.innerHTML, /CHASSIEU/);
  assert.equal(cont.disabled, true, 'Continuer bloqué tant que l’élève n’a pas répondu');
  const boutons = box.querySelectorAll('button[data-i]'); boutons[0].click();
  assert.equal(choisi, '35105367300049'); assert.equal(cont.disabled, false);
  assert.ok(box.querySelectorAll('button').every(b => b.disabled), 'double clic impossible'); assert.match(boutons[0].innerHTML, /Vérification du SIRET 35105367300049/, 'spinner et libellé sur le bouton choisi');
});

test('« Non, je fais bien mon stage à Chassieu » : établissement conservé, Continuer libéré', async () => {
  const { E, d } = charger(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ANNUAIRE) }));
  const ancre = d.el('button'); d.racine.appendChild(ancre); const cont = d.el('button'); let choisi = '';
  E.proposer({ siret: '35105367300064', nom: 'TECHNIDRILL', cp: '69680', commune: 'CHASSIEU', ancre, bloquer: cont, choisir: s => { choisi = s; } });
  await attendre(); await attendre(); await attendre();
  const box = d.document.getElementById('euc707Box'); box.querySelector('.euc707-non').click();
  assert.equal(choisi, ''); assert.equal(cont.disabled, false); assert.match(box.innerHTML, /Établissement de CHASSIEU conservé/);
});

test('annuaire indisponible ou aucun autre établissement : rien n’est affiché, l’élève n’est jamais bloqué', async () => {
  for (const f of [() => Promise.resolve({ ok: false, status: 429 }), () => Promise.reject(new Error('réseau')), () => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })]) {
    const { E, d } = charger(f); const ancre = d.el('div'); d.racine.appendChild(ancre); const cont = d.el('button');
    E.proposer({ siret: '35105367300064', nom: 'TECHNIDRILL', cp: '69680', ancre, bloquer: cont, choisir() {} });
    await attendre(); await attendre(); await attendre();
    assert.equal(d.document.getElementById('euc707Box'), null); assert.equal(cont.disabled, false);
  }
});

test('les quatre formulaires élèves incluent le choix et relancent la vérification du SIRET choisi', () => {
  const inc = "<?!= EUC_ENT_inclure('Etablissements_DEV707') ?>";
  for (const f of ['Declaration_Entreprise_DEV603', 'PFMP_Acces_QR_V116', 'PFMP_Continuation_QR_V117', 'PFMP']) assert.ok(read('apps-script/' + f + '.html').includes(inc), f);
  assert.match(read('apps-script/Declaration_Entreprise_DEV603.html'), /EUC707\.proposer\(\{siret:s,nom:e\.raisonSociale,cp:e\.codePostal,commune:e\.commune,ancre:\$\('officiel'\),bloquer:\$\('b3'\),choisir:function\(x\)\{\$\('siret'\)\.value=x;SIRET=null;\$\('verifier'\)\.click\(\);\}\}\)/);
  assert.equal((read('apps-script/PFMP_Acces_QR_V116.html').match(/EUC707\.proposer\(/g) || []).length, 2, 'QR : les deux chemins de vérification');
  assert.match(read('apps-script/PFMP_Continuation_QR_V117.html'), /EUC707\.proposer\(/);
  assert.match(read('apps-script/PFMP_Scripts.html'), /EUC707\.proposer\(/);
  assert.ok(!/alternance|loucodi|lycee-les-eucalyptus/i.test(part), 'aucune adresse publique de l’application en dur');
});

test('administration : « Élèves par entreprise » signale un établissement hors 06 sans lieu de stage distinct', () => {
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  const f = new Function(h.match(/function horsZone707\(e\)\{[^\n]*\}/)[0] + ';return horsZone707;')();
  assert.equal(f({ siret: '35105367300064', cp: '69680', lieu: '' }), true);
  assert.equal(f({ siret: '35105367300049', cp: '06510', lieu: '' }), false);
  assert.equal(f({ siret: '35105367300064', cp: '69680', lieu: 'Carros' }), false, 'lieu de stage distinct déjà saisi');
  assert.equal(f({ siret: '', cp: '69680' }), false, 'sans SIRET (Monaco, NIS) : non concerné');
  assert.match(h, /annuaire-entreprises\.data\.gouv\.fr\/entreprise\/'\+esc\(String\(e\.siret\)\.slice\(0,9\)\)/);
  assert.match(read('apps-script/EUC_DEV688_ControleNoms.js'), /base\.cle = x\.cle; base\.cp = x\.cp;/);
  assert.match(read('Documentation/DECISIONS_METIER.md'), /\(DEV707\) : la convention porte le SIRET de l'établissement d'accueil/);
});

(async () => {
  for (const [nom, fn] of tests) { await fn(); n++; console.log('ok - ' + nom); }
  console.log(n + ' tests DEV707 réussis');
})().catch(e => { console.error(e); process.exit(1); });
