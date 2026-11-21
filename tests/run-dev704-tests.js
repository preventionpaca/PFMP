/* DEV704 — Statistiques : pôles de formation, niveaux courts, apprentis comptés, classes accueillies en même temps. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const h = fs.readFileSync(path.join(__dirname, '..', 'apps-script/Statistiques_PFMP_DEV698.html'), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const ligne = debut => { const i = h.indexOf(debut); assert.ok(i >= 0, debut); return h.slice(i, h.indexOf('\n', i)); };
const k = vm.createContext({});
vm.runInContext(["const FAM={BACPRO:'Bac pro',BTS:'BTS',CAP:'CAP',BP:'BP',MC:'Mention complémentaire',AUTRES_FORMATIONS:'Autres formations'};", ligne('  const famLib='), ligne('  function niveauCourt('), ligne('  const POLES='), ligne('  const ORDRE_POLE='), ligne('  function pole('), ligne('  function rangNiveau('), ligne('  function parPole('), ligne('  function grappes('), h.slice(h.indexOf('  function grappes(') + ligne('  function grappes(').length + 1, h.indexOf('  function rendre(')),
  'this.niveauCourt=niveauCourt;this.pole=pole;this.parPole=parPole;this.grappes=grappes;'].join('\n'), k);

test('niveaux courts : Première bac, Terminale bac, BTS 2e année', () => {
  assert.equal(k.niveauCourt({ famille: 'BACPRO', niveau: 'Première Bac Pro' }), 'Première bac');
  assert.equal(k.niveauCourt({ famille: 'BACPRO', niveau: 'Terminale Bac Pro' }), 'Terminale bac');
  assert.equal(k.niveauCourt({ famille: 'BTS', niveau: '2e année BTS' }), 'BTS 2e année');
  assert.equal(k.niveauCourt({ famille: 'CAP', niveau: 'Terminale CAP' }), 'CAP Terminale');
});
test('pôles : filières voisines regroupées, du CAP au Bachelor, Bachelor en dernier', () => {
  const p = (diplome, classe) => k.pole({ diplome, classe })[0];
  assert.equal(p('BAC PRO Maintenance des Véhicules légers', '1MVA1'), 'AUTO'); assert.equal(p('BTS Maintenance des Véhicules légers', '2BTS MV'), 'AUTO');
  assert.equal(p('BAC PRO Carrossier Peintre Automobile', '1CAR'), 'CARRO'); assert.equal(p('CAP — CAPP', '1CAPP'), 'CARRO'); assert.equal(p('CAP Carrossier Peintre Automobile', 'TCAP CAR'), 'CARRO');
  assert.equal(p('BAC PRO Cybersécurité Informatique Electronique', '1CIEL'), 'NUM', 'Électronique de la cybersécurité : pas le pôle électricité');
  assert.equal(p("BAC PRO Métiers de l'Electricité et de ses Environnements Connectés", '1MELEC'), 'ELEC'); assert.equal(p('Titre professionnel — TPEEB', 'TPEEB 19'), 'ELEC'); assert.equal(p('BTS — BTS ELEC Alt', '1BTS ELEC Alt'), 'ELEC');
  assert.equal(p('BAC PRO Modélisation et Prototypage 3D', '1MP3D'), 'MP3D'); assert.equal(p('BTS Conception de Produits Industriels', '1BTS CPI'), 'MP3D');
  assert.equal(p('BTS Conception des Procédés et Réalisation des Processus', '1BTS CPRP'), 'PROD'); assert.equal(p('BAC PRO Microtechniques', '1MT'), 'PROD');
  assert.equal(p('Bachelor — IP', 'Bachelor IP'), 'BACH');
  const r = J => JSON.parse(JSON.stringify(J));
  const t = r(k.parPole([{ x: { diplome: 'Bachelor — IP' }, c: ['Bachelor — IP', 1] }, { x: { diplome: 'BTS Maintenance des Véhicules légers', famille: 'BTS' }, c: ['BTS MV', 2] }, { x: { diplome: 'BAC PRO Maintenance des Véhicules légers', famille: 'BACPRO' }, c: ['Bac pro MVL', 3] }], (p, l) => [p, l.length]));
  assert.deepEqual(t.map(x => x.c[0]), ['Automobile — maintenance des véhicules', 'Bachelor']);
  assert.deepEqual(t[0].enfants.map(c => c[0]), ['Bac pro MVL', 'BTS MV'], 'bac pro avant BTS');
});
test('en même temps : seulement les stages dont les dates se chevauchent, apprentis en contrat sur ces dates', () => {
  const e = { stages: [{ e: 1, classe: '1MVA1', periode: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18' }, { e: 2, classe: 'TMVA2', periode: 'PFMP n°2', debut: '2027-01-11', fin: '2027-02-05' }, { e: 3, classe: '2BTS MV', periode: 'Stage n°1', debut: '2026-12-14', fin: '2027-01-15' }],
    apps: [{ classe: '2BTS MV', debut: '2027-02-01', fin: '2028-08-31' }] };
  const g = JSON.parse(JSON.stringify(k.grappes(e)));
  assert.equal(g.length, 1, 'les trois stages s’enchaînent : 1MVA1 ↔ 2BTS MV ↔ TMVA2');
  const e2 = { stages: [e.stages[0], e.stages[1]], apps: e.apps };
  const g2 = JSON.parse(JSON.stringify(k.grappes(e2)));
  assert.equal(g2.length, 2, '1MVA1 et TMVA2 sans chevauchement : jamais « ensemble »');
  assert.deepEqual(Array.from(k.grappes(e2)[1].etiquettes), ['TMVA2 (stage)', '2BTS MV (apprenti)']);
  assert.deepEqual(Array.from(k.grappes(e2)[0].etiquettes), ['1MVA1 (stage)']);
});
test('page : apprentis dans les détails, entreprises de stage et d’apprentissage, communes explicites', () => {
  assert.match(h, /tableau\('dElevesC',\['Classe','Filière','Élèves en stage','Apprentis','Total en entreprise'\]/);
  assert.match(h, /\['Pôle \/ filière','Élèves en stage','Apprentis','dont employeur non renseigné','Entreprises — stage','Entreprises — apprentissage','Entreprises au total'\]/);
  assert.match(h, /e\.apps\.forEach\(function\(a\)\{const y=v\(a\);y\.a\.add\(e\.k\);y\.t\.add\(e\.k\)\}\)/, 'employeurs des apprentis comptés');
  assert.match(h, /entreprises:function\(E\)\{return[^}]*tableauFilieres\('dEnt',E\)/);
  assert.match(h, /<h3>Classes accueillies dans une même entreprise \(sur l’année\)<\/h3>/); assert.match(h, /<h3>Classes accueillies en même temps, par période<\/h3>/);
  assert.match(h, /tableau\('simul',\['Classes accueillies en même temps','Entreprise','Commune','Période\(s\)','Du','Au'\]/);
  assert.match(h, /const entEl=function\(e,n\)\{return e\+' entreprise'\+\(e>1\?'s':''\)\+' · '\+n\+' élève'/);
  assert.match(h, /tableau\('dConv',\['Pôle \/ filière','Niveau','Conventions','dont dates décalées'\],parPole\(/);
});
console.log(n + ' tests DEV704 réussis.');
