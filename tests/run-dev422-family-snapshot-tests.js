'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps-script/EUC_PFMP_DEV339_FamilleUX.js'), 'utf8');
const detail = {
  classe: {id: 25, nom: 'TCIEL'},
  periode: {id: 61, libelle: 'PFMP n°1'},
  lignes: []
};

for (let i = 1; i <= 24; i++) {
  detail.lignes.push({eleveId: i, nom: `ELEVE${i}`, statut: 'Convention enregistrée'});
}
detail.lignes.push({eleveId: 25, nom: 'SANS', statut: 'Sans convention'});
detail.lignes.push({eleveId: 26, nom: 'APPRENTI', statut: 'Apprenti', apprenti: true});

const records = [{
  fields: {
    Annee_scolaire: '2026-2027',
    Famille: 'BACPRO',
    Classe_id: 25,
    Periode_id: 61,
    Payload_JSON: JSON.stringify(detail),
    Updated_at: '2026-10-03T08:00:00.000Z',
    Actif: true
  }
}];

const context = {
  console,
  CacheService: {getScriptCache: () => ({get: () => null, put: () => {}, remove: () => {}})},
  EUC_DEV190I_TABLE_: 'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT',
  EUC_DEV190G_fastRecords_: () => records
};
vm.createContext(context);
vm.runInContext(source, context);

const family = {
  classes: [{
    classeId: 25,
    classe: 'TCIEL',
    apprentis: 0,
    periodes: [{id: 61, libelle: 'PFMP n°1', conventions: 0, total: 26, apprentis: 0}]
  }]
};

context.EUC_DEV422_hydrateFamily_(family, '2026-2027', 'BACPRO');
const period = family.classes[0].periodes[0];

assert.equal(period.conventions, 24, 'les conventions doivent venir du snapshot détaillé');
assert.equal(period.apprentis, 1, 'les apprentis doivent venir du même snapshot détaillé');
assert.equal(period.total, 25, 'le total scolaire doit exclure les apprentis');
assert.equal(period.sansConvention, 1, 'le sans convention doit être cohérent avec la bulle');
assert.equal(family.classes[0].apprentis, 1, 'le badge classe doit être cohérent');
assert.equal(period.quick.avec.length, 24, 'la bulle pré-calculée doit reprendre les 24 conventions');
assert.equal(period.quick.sans.length, 1, 'la bulle pré-calculée doit reprendre le sans convention');

const incident = context.EUC_DEV422_quickFromDetail_({
  classe: {nom: 'TEST'},
  periode: {libelle: 'PFMP n°1'},
  lignes: [{nom: 'ANNULEE', statut: 'Convention annulée'}]
});
assert.equal(incident.annuleesInterrompues.length, 1, 'les conventions annulées doivent être isolées');
assert.equal(incident.sans.length, 0, 'une convention annulée ne doit pas être recomptée sans convention');

console.log('✓ DEV422 : compteurs et contrôle rapide partagent le snapshot détaillé');
