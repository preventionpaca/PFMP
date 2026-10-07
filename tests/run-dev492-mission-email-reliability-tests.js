const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const server = fs.readFileSync('apps-script/EUC_PFMP_DEV370_AdminTools.js', 'utf8');
const mission = fs.readFileSync('apps-script/Ordres_Mission_PFMP_V368.html', 'utf8');
let passed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('✓', name); }
  catch (error) { console.error('✗', name, error.message); process.exitCode = 1; }
}

function serverContext(options) {
  options = options || {};
  const cache = {};
  const sent = [];
  const scriptCache = {
    get: key => Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null,
    put: (key, value) => { cache[key] = value; },
    remove: key => { delete cache[key]; }
  };
  const ctx = {
    console, Date, JSON, Object, Math, isFinite,
    CacheService: { getScriptCache: () => scriptCache },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    MailApp: {
      getRemainingDailyQuota: () => options.quota == null ? 50 : options.quota,
      sendEmail: value => sent.push(value)
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid: () => '00000000-0000-4000-8000-000000000000',
      computeDigest: () => [1, 2, 3],
      base64EncodeWebSafe: () => 'digest-web-safe',
      base64Decode: () => [80, 68, 70],
      newBlob: (bytes, mime, name) => ({ bytes, mime, name })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(server, ctx);
  ctx.EUC_DEV368_t = value => String(value == null ? '' : value).trim();
  ctx.EUC_RELEASE_isBlue_ = () => options.blue === true;
  ctx.EUC_DEV368_admin = () => ({ email: 'administration@example.test' });
  ctx.EUC_DEV440_prepareMissionTransportEmail = () => ({
    to: 'professeur@example.test', cc: 'bfe@example.test', replyTo: 'administration@example.test',
    subject: 'Ordre de mission', body: 'Message texte', htmlBody: '<p>Message</p>', kind: 'DEFINITIF'
  });
  ctx.EUC_DEV436_pdfMission = () => ({ base64: 'UERG', mime: 'application/pdf', name: 'ordre.pdf', generationMs: 1250 });
  ctx.EUC_DEV476_missionEmailSender_ = () => ({ from: 'deploiement@example.test' });
  return { ctx, cache, sent };
}

test('le navigateur confirme dans la page avant tout appel serveur', () => {
  assert.match(mission, /id="emailConfirmDialog"/);
  assert.match(mission, /emailConfirmDialog\.showModal\(\)/);
  assert.match(mission, /emailConfirmSend\.onclick/);
  assert.doesNotMatch(mission, /EUC_DEV440_prepareMissionTransportEmail\(payload\)/);
});

test('le clic confirmé appelle directement l envoi avec un identifiant de suivi', () => {
  assert.match(mission, /requestId:missionEmailRequestId_\(\)/);
  assert.match(mission, /\.EUC_DEV440_sendMissionTransportEmail\(operation\.payload\)/);
  assert.match(mission, /EUC_DEV492_getMissionEmailStatus\(\{requestId:operation\.payload\.requestId\}\)/);
});

test('le suivi rend toujours le bouton et affiche le résultat serveur', () => {
  assert.match(mission, /function finishMissionEmail_\(operation,ok,message\)/);
  assert.match(mission, /busy\(operation\.button,false\)/);
  assert.match(mission, /state==='SENT'/);
  assert.match(mission, /state==='ERROR'/);
  assert.match(mission, /Le suivi a dépassé cinq minutes/);
});

test('le serveur remet le même message au professeur et à la copie BFE', () => {
  const { ctx, cache, sent } = serverContext();
  const result = ctx.EUC_DEV440_sendMissionTransportEmail({ requestId: 'DEV492_GREEN_REQUEST_001' });
  assert.equal(result.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'professeur@example.test');
  assert.equal(sent[0].cc, 'bfe@example.test');
  assert.equal(sent[0].attachments[0].name, 'ordre.pdf');
  const status = JSON.parse(cache.DEV492_MISSION_EMAIL_STATUS_DEV492_GREEN_REQUEST_001);
  assert.equal(status.state, 'SENT');
  assert.equal(status.attachment, 'ordre.pdf');
});

test('une reprise avec le même identifiant ne renvoie jamais le courriel', () => {
  const { ctx, sent } = serverContext();
  const payload = { requestId: 'DEV492_IDEMPOTENT_REQUEST_1' };
  ctx.EUC_DEV440_sendMissionTransportEmail(payload);
  const recovered = ctx.EUC_DEV440_sendMissionTransportEmail(payload);
  assert.equal(sent.length, 1);
  assert.equal(recovered.recovered, true);
});

test('le serveur refuse avant envoi lorsque le quota ne couvre pas les deux destinataires', () => {
  const { ctx, cache, sent } = serverContext({ quota: 1 });
  assert.throws(() => ctx.EUC_DEV440_sendMissionTransportEmail({ requestId: 'DEV492_QUOTA_REQUEST_001' }), /Quota quotidien/);
  assert.equal(sent.length, 0);
  assert.equal(JSON.parse(cache.DEV492_MISSION_EMAIL_STATUS_DEV492_QUOTA_REQUEST_001).state, 'ERROR');
});

test('le site bleu ne peut jamais envoyer un ordre de mission', () => {
  const { ctx, sent } = serverContext({ blue: true });
  assert.throws(() => ctx.EUC_DEV440_sendMissionTransportEmail({ requestId: 'DEV492_BLUE_REQUEST_001' }), /désactivé sur le site bleu/);
  assert.equal(sent.length, 0);
});

if (!process.exitCode) console.log(`\n${passed} tests DEV492 fiabilité courriels missions réussis.`);
