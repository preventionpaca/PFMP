'use strict';
/* DEV728 — accueil d'administration : rubrique « Cartographie » du bandeau « À faire », effectifs en accordéon calculés à
 * la demande, spinner sur les liens de l'accueil. Données fictives. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function serveur(candidats, o) {
  o = o || {}; const k = { JSON, Object, String, Number, Array, Math, Error,
    EUC_IMPORT_exigerAdminTexte_: () => { if (o.refus) throw new Error('Accès non autorisé.'); return {}; },
    EUC_DEV368_year: () => '2026-2027', EUC_DEV517_geoCandidatesAll_: y => { assert.strictEqual(y, '2026-2027'); return candidats; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV728_AFaireCartographie.js'), k); return k;
}
const C = [
  { entreprise: 'GARAGE A', statut: 'A_VALIDER_MANUELLEMENT', perimetres: ['1MP3D · PFMP n°1'] },
  { entreprise: 'GARAGE B', statut: 'COORDONNEES_A_RENSEIGNER', perimetres: ['1MP3D · PFMP n°1', '1MP3D · PFMP n°2', 'TMELEC · PFMP n°1'] },
  { entreprise: 'HOTEL C', statut: 'GEOCODE_AUTOMATIQUE', perimetres: ['1MP3D · PFMP n°1'] },
  { entreprise: 'CAFE D', statut: 'VALIDE_MANUELLEMENT', perimetres: ['2CAP · PFMP n°1'] },
  { entreprise: 'SALON E', statut: 'A_REGEOCODER', classe: '2CAP · PFMP n°1' },
  { entreprise: 'MAGASIN F', statut: 'A_GEOCODER', perimetres: [] }];

test('cartographie : entreprises non placées comptées une fois, classes concernées sans doublon de période', () => {
  const r = J(serveur(C).EUC_DEV728_aFaireCartographie());
  assert.strictEqual(r.total, 4);
  assert.deepStrictEqual(r.classes, [{ classe: '1MP3D', nombre: 2 }, { classe: '2CAP', nombre: 1 }, { classe: 'TMELEC', nombre: 1 }]);
  assert.strictEqual(r.page, 'geocodage-pfmp-admin'); assert.strictEqual(r.autresClasses, 0);
});

test('cartographie : tout est placé → rien à signaler ; huit classes au plus, le reste compté ; administration seulement', () => {
  assert.strictEqual(serveur(C.filter(x => ['GEOCODE_AUTOMATIQUE', 'VALIDE_MANUELLEMENT'].includes(x.statut))).EUC_DEV728_aFaireCartographie().total, 0);
  const beaucoup = Array.from({ length: 11 }, (_, i) => ({ statut: 'A_GEOCODER', perimetres: ['C' + i + ' · P'] }));
  const r = serveur(beaucoup).EUC_DEV728_aFaireCartographie(); assert.strictEqual(r.classes.length, 8); assert.strictEqual(r.autresClasses, 3);
  assert.throws(() => serveur(C, { refus: true }).EUC_DEV728_aFaireCartographie(), /non autorisé/);
});

/* ---------- page d'accueil ---------- */
const h = read('apps-script/Admin_PFMP.html');
function bandeau(reponses) {
  const el = {}; ['aFaireV694', 'aFaireEleves', 'aFaireCarte', 'aFaireTexte', 'aFaireCarteTexte'].forEach(id => { el[id] = { id, hidden: true, innerHTML: '' }; });
  const k = { document: { getElementById: id => el[id], createElement: () => { let t = ''; return { set textContent(v) { t = String(v); }, get innerHTML() { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); } }; }, addEventListener() {}, querySelectorAll: () => [] },
    window: { addEventListener() {} }, setTimeout, Array, String };
  k.google = { script: { get run() { const hd = {}; const r = { withSuccessHandler(f) { hd.ok = f; return r; }, withFailureHandler(f) { hd.ko = f; return r; },
    EUC_DEV694_aFaire() { reponses.eleves(hd); }, EUC_DEV728_aFaireCartographie() { reponses.carte(hd); } }; return r; } } };
  k.window.google = k.google;
  const src = h.slice(h.indexOf('/* DEV694 / DEV728'), h.indexOf('</script>', h.indexOf('/* DEV694 / DEV728')));
  vm.createContext(k); vm.runInContext(src, k); return el;
}

test('bandeau : une ligne par rubrique avec son lien ; bandeau masqué si aucune rubrique', () => {
  let el = bandeau({ eleves: hd => hd.ok({ points: [{ nombre: 2, texte: 'SIRET à vérifier' }] }), carte: hd => hd.ok({ total: 2, classes: [{ classe: '1MP3D', nombre: 2 }], autresClasses: 0 }) });
  assert.strictEqual(el.aFaireV694.hidden, false); assert.strictEqual(el.aFaireEleves.hidden, false); assert.strictEqual(el.aFaireCarte.hidden, false);
  assert.ok(/<b>2<\/b> entreprises reconnues mais pas encore placées sur la carte/.test(el.aFaireCarteTexte.innerHTML) && /1MP3D : 2/.test(el.aFaireCarteTexte.innerHTML));
  el = bandeau({ eleves: hd => hd.ok({ points: [] }), carte: hd => hd.ok({ total: 1, classes: [] }) });
  assert.strictEqual(el.aFaireV694.hidden, false); assert.strictEqual(el.aFaireEleves.hidden, true);
  el = bandeau({ eleves: hd => hd.ko(new Error('x')), carte: hd => hd.ok({ total: 0 }) });
  assert.strictEqual(el.aFaireV694.hidden, true);
  assert.ok(h.includes('<a id="aFaireCarteLien" target="_top" href="<?= adminBase ?>?page=geocodage-pfmp-admin">'), 'lien sans adresse en dur');
});

test('effectifs : accordéon replié, calcul seulement à l’ouverture ou sur « Mettre à jour », bouton désactivé avec spinner et délai borné', () => {
  assert.ok(/<details class="card effectifs" id="effectifs"><summary>/.test(h) && !/<details class="card effectifs" id="effectifs" open/.test(h));
  const src = h.slice(h.indexOf("var majB=$('effMaj')"), h.indexOf("majB.onclick=charger;"));
  assert.ok(!/^google\.script\.run[^\n]*EUC_DEV592_effectifs/m.test(h.slice(0, h.indexOf("var majB=$('effMaj')"))), 'plus de calcul au chargement de la page');
  assert.ok(/majB\.disabled=true;majB\.innerHTML='<span class="spin"/.test(src) && /180000/.test(src) && /function fin\(\)|fin=function\(\)\{fini=true;clearTimeout\(t\);enCours=false;majB\.disabled=false;majB\.innerHTML=majLib;\}/.test(src));
  assert.ok(h.includes("majB.onclick=charger;$('effectifs').addEventListener('toggle',function(){if(this.open&&!charge)charger();});"));
  assert.ok(/\.withFailureHandler\(function\(e\)\{if\(fini\)return;fin\(\);/.test(h), 'erreur : bouton rendu');
});

test('liens de l’accueil : spinner au clic, retiré au retour sur la page ou après délai', () => {
  const src = h.slice(h.indexOf('/* DEV728 : chaque lien'), h.indexOf('</script>', h.indexOf('/* DEV728 : chaque lien')));
  const handlers = {}, a = { target: '_top', classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); } }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, kids: [],
    insertBefore(x) { this.kids.unshift(x); x.remove = () => { this.kids = this.kids.filter(y => y !== x); }; }, querySelector() { return this.kids[0] || null; }, closest() { return a; } };
  const timers = [], k = { document: { addEventListener: (t, f) => { handlers[t] = f; }, createElement: () => ({ setAttribute() {} }), querySelectorAll: () => a.classList.contains('chargement') ? [a] : [] },
    window: { addEventListener: (t, f) => { handlers['w' + t] = f; } }, setTimeout: (f, ms) => timers.push({ f, ms }), Array };
  vm.createContext(k); vm.runInContext(src, k);
  handlers.click({ target: a, button: 0 });
  assert.ok(a.classList.contains('chargement') && a.attrs['aria-busy'] === 'true' && a.kids.length === 1);
  handlers.click({ target: a, button: 0 }); assert.strictEqual(a.kids.length, 1, 'pas de second spinner');
  handlers.wpageshow(); assert.ok(!a.classList.contains('chargement') && a.kids.length === 0);
  handlers.click({ target: a, button: 0, ctrlKey: true }); assert.ok(!a.classList.contains('chargement'), 'ouverture dans un nouvel onglet au clavier : pas de spinner');
  assert.strictEqual(timers[0].ms, 30000);
});

console.log(n + ' tests DEV728 réussis');
