'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'apps-script', 'EUC_PFMP_DEV275B_ApprentissageHistorique.js'),
  'utf8'
);
const ctx = {console, Date, Number, String, Object, Array, Math};
vm.createContext(ctx);
vm.runInContext(source, ctx);

const students = [
  {id: 10, Numero_national: 'INE-001', Nom: 'DUPONT', Prenom: 'Lina', Date_naissance: '2010-01-02', Annee_scolaire: 1, Classe: 101},
  {id: 20, Numero_national: 'INE-001', Nom: 'DUPONT', Prenom: 'Lina', Date_naissance: '2010-01-02', Annee_scolaire: 2, Classe: 202},
  {id: 30, Numero_national: 'INE-002', Nom: 'MARTIN', Prenom: 'Noa', Date_naissance: '2010-03-04', Annee_scolaire: 2, Classe: 202}
];
const aliases = ctx.EUC_DEV275B_studentAliases_(students);
assert.deepStrictEqual(Array.from(aliases[20]).sort((a,b)=>a-b), [10, 20],
  'les inscriptions annuelles du même jeune doivent être reliées');
assert.deepStrictEqual(Array.from(aliases[30]), [30],
  'deux jeunes distincts ne doivent jamais être fusionnés');

const contracts = [
  {id: 1, Eleve: 10, Date_debut: '2026-09-01', Date_fin: '2028-08-31', Date_rupture_contrat: '2027-11-15', Actif: false},
  {id: 2, Eleve: 20, Date_debut: '2028-01-10', Date_fin: '2028-08-31', Actif: true, Nouveau_contrat: true}
];

assert.strictEqual(
  ctx.EUC_DEV275B_evalStudent_(contracts, aliases, 20, '2027-09-20', '2027-10-10').code,
  'APPRENTI',
  'avant la rupture, le contrat de Première doit rester valable en Terminale'
);
assert.strictEqual(
  ctx.EUC_DEV275B_evalStudent_(contracts, aliases, 20, '2027-11-20', '2027-12-15').code,
  'SCOLAIRE',
  'après la rupture et avant un nouveau contrat, le jeune doit redevenir scolaire'
);
assert.strictEqual(
  ctx.EUC_DEV275B_evalStudent_(contracts, aliases, 20, '2028-01-15', '2028-02-02').code,
  'APPRENTI',
  'le nouveau contrat doit rétablir le statut apprenti'
);
assert.strictEqual(
  ctx.EUC_DEV275B_evalStudent_(contracts, aliases, 20, '2027-11-01', '2027-11-30').code,
  'MIXTE',
  'une période traversant la rupture doit rester mixte'
);

console.log('✓ DEV417 : continuité annuelle, rupture et nouveau contrat protégés');
