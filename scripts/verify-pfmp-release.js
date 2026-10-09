#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'pfmp-release-config.json'), 'utf8'
));
const channelArg = process.argv.indexOf('--channel');
const channel = channelArg >= 0 ? process.argv[channelArg + 1] : 'development';

if (!['development', 'stable'].includes(channel)) {
  throw new Error('Canal attendu : development ou stable.');
}

const claspPath = path.join(process.env.HOME, '.clasprc.json');
const clasp = JSON.parse(fs.readFileSync(claspPath, 'utf8'));
const token = clasp.tokens && clasp.tokens.default && clasp.tokens.default.access_token;
if (!token) throw new Error('Jeton CLASP absent. Exécutez clasp login.');

const runtimeErrors = [
  'ReferenceError',
  'TypeError:',
  'SyntaxError:',
  'Exception:',
  'Impossible de trouver le fichier HTML'
];

function targetFor(route) {
  if (channel === 'development') return config.channels.development;
  return route.scope === 'public'
    ? config.channels.stablePublic
    : config.channels.stableAdmin;
}

function urlFor(route) {
  const target = targetFor(route);
  const url = new URL(
    `https://script.google.com/a/macros/${config.domain}/s/` +
    `${target.deploymentId}/${target.endpoint}`
  );
  url.searchParams.set('page', route.page);
  return url.toString();
}

async function verify(route) {
  const url = urlFor(route);
  try {
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${token}`},
      redirect: 'follow',
      signal: AbortSignal.timeout(60000)
    });
    const body = await response.text();
    const errors = runtimeErrors.filter(term => body.includes(term));
    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const login = response.url.includes('accounts.google.com');
    const expected = body.includes(route.expected);
    const appsScriptErrorPage = /^(?:Erreur|Error)$/i.test(title);
    if (appsScriptErrorPage) errors.push('Page Apps Script en erreur');
    const ok = response.status === 200 && !login && !errors.length && expected;
    return {route, response, errors, title, login, expected, ok};
  } catch (error) {
    return {
      route,
      response: {status: 0, url},
      errors: [error.name],
      title: '',
      login: false,
      expected: false,
      ok: false
    };
  }
}

async function main() {
  let results = [];
  for (let index = 0; index < config.routes.length; index += 6) {
    const batch = config.routes.slice(index, index + 6);
    results.push(...await Promise.all(batch.map(verify)));
  }

  // Une nouvelle version Apps Script peut subir un unique démarrage à froid :
  // la requête expire alors que la route répond normalement quelques secondes
  // plus tard. Rejouer uniquement les échecs une fois ne masque pas une panne
  // durable ; le second échec reste bloquant et déclenche le rollback.
  const firstFailures = results.filter(result => !result.ok);
  if (firstFailures.length) {
    const retried = await Promise.all(firstFailures.map(result => verify(result.route)));
    const byPage = new Map(retried.map(result => [result.route.page, result]));
    results = results.map(result => byPage.get(result.route.page) || result);
  }

  for (const result of results) {
    const detail = result.ok
      ? (firstFailures.some(first => first.route.page === result.route.page)
          ? 'OK (2e tentative)'
          : 'OK')
      : [
          `HTTP ${result.response.status}`,
          result.login ? 'connexion Google' : '',
          result.errors.join(', '),
          result.expected ? '' : `contenu attendu absent: ${result.route.expected}`
        ].filter(Boolean).join(' ; ');
    console.log(`${result.route.page}\t${detail}\t${result.title}`);
  }

  const failed = results.filter(result => !result.ok);
  console.log(
    `\nCanal ${channel}: ${results.length - failed.length}/${results.length} routes valides.`
  );
  if (failed.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
