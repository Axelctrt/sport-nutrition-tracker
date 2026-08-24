import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS_PORT = 5199;
const HARNESS_ORIGIN = `http://127.0.0.1:${HARNESS_PORT}`;
const DEMO_USER = 'sportpilot-goals-conflict@demo.local';
const ISOLATION_DEMO_USER = 'sportpilot-goals-isolation@demo.local';
const GOAL_ID = 'goal-dexie-cloud-conflict';
const NORMAL_ROW_PROBE_ID = 'goal-dexie-cloud-normal-row-probe';
const EXPECTED_WINNER = 55_000;
const FORBIDDEN_PRODUCTION_HOST = ['zhnyk8met', 'dexie', 'cloud'].join('.');

function progress(phase) {
  console.log(`[integration-cloud:goals] ${phase}`);
}

async function withTimeout(promise, label, timeoutMs = 45_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timeout integration-cloud: ${label}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable d’environnement requise: ${name}`);
  return value;
}

function assertSafeTestDatabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.dexie.cloud')) {
    throw new Error('Le gate integration-cloud exige une URL Dexie Cloud HTTPS.');
  }
  if (url.hostname === FORBIDDEN_PRODUCTION_HOST) {
    throw new Error('GARDE integration-cloud: la base de production est interdite.');
  }
  return url.origin;
}

async function readManagementCredentials(databaseUrl, credentialDirectory) {
  const configPath = join(credentialDirectory, 'dexie-cloud.json');
  const keyPath = join(credentialDirectory, 'dexie-cloud.key');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (assertSafeTestDatabaseUrl(config.dbUrl) !== databaseUrl) {
    throw new Error('Le répertoire de credentials ne correspond pas à la base TEST demandée.');
  }
  const keys = JSON.parse(await readFile(keyPath, 'utf8'));
  const credentials = keys[databaseUrl];
  if (
    typeof credentials?.clientId !== 'string'
    || typeof credentials?.clientSecret !== 'string'
    || !credentials.clientId
    || !credentials.clientSecret
  ) {
    throw new Error('Credentials Dexie Cloud TEST absents ou invalides.');
  }
  return credentials;
}

function dexieCliCommand() {
  if (process.platform !== 'win32') {
    return { executable: 'npx', prefix: [] };
  }
  const npmExecutable = process.env.npm_execpath;
  if (!npmExecutable) {
    throw new Error('Lance le gate via npm afin de localiser npx sans shell.');
  }
  return {
    executable: process.execPath,
    prefix: [join(dirname(npmExecutable), 'npx-cli.js')],
  };
}

async function runDexieCli(credentialDirectory, args) {
  try {
    const command = dexieCliCommand();
    await execFileAsync(
      command.executable,
      [...command.prefix, '--yes', 'dexie-cloud@latest', ...args],
      {
        cwd: credentialDirectory,
        windowsHide: true,
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      },
    );
  } catch (error) {
    throw new Error(
      `Commande Dexie Cloud TEST en échec (${args[0] ?? 'inconnue'}).`,
      { cause: error },
    );
  }
}

async function provisionTestDatabase(databaseUrl, credentialDirectory) {
  const demoUsersFixture = join(
    REPO_ROOT,
    'tests',
    'integration-cloud',
    'fixtures',
    'dexie-demo-users.json',
  );
  const goalsSchemaFixture = join(
    REPO_ROOT,
    'tests',
    'integration-cloud',
    'fixtures',
    'dexie-goals-schema.json',
  );
  await runDexieCli(credentialDirectory, ['import', demoUsersFixture]);
  await runDexieCli(credentialDirectory, ['import', goalsSchemaFixture]);
  await runDexieCli(credentialDirectory, ['whitelist', '--force', HARNESS_ORIGIN]);
  await clearSyntheticRealm(databaseUrl, credentialDirectory, DEMO_USER);
  await clearSyntheticRealm(
    databaseUrl,
    credentialDirectory,
    ISOLATION_DEMO_USER,
  );
}

async function clearSyntheticRealm(
  databaseUrl,
  credentialDirectory,
  realmId = DEMO_USER,
) {
  if (realmId !== DEMO_USER && realmId !== ISOLATION_DEMO_USER) {
    throw new Error('Le reset integration-cloud est limité aux realms synthétiques déclarés.');
  }
  await runDexieCli(credentialDirectory, [
    'clear-realm',
    realmId,
    '--yes',
    '--db',
    databaseUrl,
  ]);
}

function requestedRepeatCount() {
  const argument = process.argv.find((value) => value.startsWith('--repeat='));
  if (!argument) return 1;
  const count = Number(argument.slice('--repeat='.length));
  if (!Number.isSafeInteger(count) || count < 1 || count > 20) {
    throw new Error('--repeat doit être un entier compris entre 1 et 20.');
  }
  return count;
}

function clockProof(result) {
  if (result.t1Real === undefined || result.t2Real === undefined) {
    return undefined;
  }
  if (result.aRawDateAtT1 !== undefined) {
    return result.t1Real < result.t2Real
      && result.aRawDateAtT1 > result.bRawDateAtT2;
  }
  return result.t1Real < result.t2Real;
}

async function createObserver(databaseUrl, credentials) {
  const response = await fetch(`${databaseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      scopes: ['ACCESS_DB', 'GLOBAL_READ'],
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });
  if (!response.ok) {
    throw new Error(`Authentification de l’observateur serveur refusée (${response.status}).`);
  }
  const tokens = await response.json();
  if (typeof tokens.accessToken !== 'string' || !tokens.accessToken) {
    throw new Error('L’observateur serveur n’a reçu aucun access token.');
  }
  const authorization = `Bearer ${tokens.accessToken}`;

  async function rows(tableName, realmId = DEMO_USER) {
    const query = new URLSearchParams({ realmId });
    const result = await fetch(
      `${databaseUrl}/all/${tableName}?${query.toString()}`,
      { headers: { Authorization: authorization } },
    );
    if (!result.ok) {
      throw new Error(
        `Lecture serveur indépendante ${tableName} refusée (${result.status}).`,
      );
    }
    const values = await result.json();
    if (!Array.isArray(values)) {
      throw new Error(`Réponse serveur ${tableName} inattendue.`);
    }
    return values;
  }

  async function goalMutations(goalId, realmId = DEMO_USER) {
    const mutationRows = await rows('realGoalMutations', realmId);
    const privateRealmSuffix = `:${realmId}`;
    return mutationRows
      .filter((row) =>
        row?.accountUserId === realmId
        && row?.entityId === goalId)
      .map((row) => ({
        ...row,
        id:
          typeof row.id === 'string'
          && row.id.startsWith('#')
          && row.id.endsWith(privateRealmSuffix)
            ? row.id.slice(0, -privateRealmSuffix.length)
            : row.id,
      }));
  }

  async function goalHead(goalId, realmId = DEMO_USER) {
    const headRows = await rows('realGoalMutationHeads', realmId);
    const candidates = headRows.filter((row) =>
      row?.accountUserId === realmId
      && row?.entityId === goalId
      && typeof row?.id === 'string'
      && !row.id.startsWith('#'));
    if (candidates.length > 1) {
      throw new Error('Lecture serveur ambiguë: plusieurs heads causaux Goals.');
    }
    return candidates[0];
  }

  return {
    goalMutations,
    goalHead,
    async diagnostic(goalId, realmId = DEMO_USER) {
      const [mutations, head] = await Promise.all([
        goalMutations(goalId, realmId),
        goalHead(goalId, realmId),
      ]);
      return {
        mutationIds: mutations.map((mutation) => mutation.id),
        headId: head?.id,
        headMutationId: head?.mutationId,
      };
    },
    async goal(goalId, realmId = DEMO_USER) {
      const [mutations, head] = await Promise.all([
        goalMutations(goalId, realmId),
        goalHead(goalId, realmId),
      ]);
      if (head) {
        const winner = mutations.find((mutation) =>
          mutation.id === head.mutationId);
        if (!winner) {
          return {
            id: goalId,
            headId: head.id,
            headMutationId: head.mutationId,
            canonicalSource: 'incomplete-realGoalMutationHead',
            mutationCount: mutations.length,
          };
        }
        return {
          id: winner.goal?.id ?? goalId,
          owner: winner.owner,
          realmId: winner.realmId,
          targetValue: winner.goal?.targetValue,
          updatedAt: winner.goal?.updatedAt ?? winner.marker?.updatedAt,
          status: winner.operation === 'delete' ? 'deleted' : winner.goal?.status,
          mutationId: winner.id,
          parentMutationId: winner.parentMutationId,
          headId: head.id,
          headMutationId: head.mutationId,
          mutationOperation: winner.operation,
          canonicalSource: 'realGoalMutationHeads',
          mutationCount: mutations.length,
        };
      }
      if (mutations.length > 0) {
        throw new Error(
          'Le journal Goals serveur existe sans head causal; aucun winner temporel n’est choisi.',
        );
      }
      const goalRows = await rows('realGoals', realmId);
      const row = goalRows.find((candidate) => candidate?.id === `#${goalId}`)
        ?? (goalRows.length === 1 ? goalRows[0] : undefined);
      if (!row && goalRows.length > 1) {
        throw new Error('Lecture serveur ambiguë: plusieurs Goals dans le realm synthétique.');
      }
      if (!row) return undefined;
      return {
        id: row.id ?? `#${goalId}`,
        owner: row.owner,
        realmId: row.realmId,
        targetValue: row.targetValue,
        updatedAt: row.updatedAt,
        syncRevision: row.syncRevision,
        syncActorId: row.syncActorId,
        $$ts: row.$$ts,
        canonicalSource: 'legacy-realGoals',
        mutationCount: 0,
      };
    },
  };
}

async function waitForServerGoal(observer, goalId, targetValue, timeoutMs = 30_000) {
  const startedAt = Date.now();
  let last;
  while (Date.now() - startedAt < timeoutMs) {
    last = await observer.goal(goalId);
    if (last?.targetValue === targetValue) return last;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(
    `Le serveur n’a pas atteint targetValue=${targetValue}; dernière valeur=${last?.targetValue ?? 'absente'}.`,
  );
}

async function waitForServerState(
  observer,
  goalId,
  predicate,
  description,
  realmId = DEMO_USER,
  timeoutMs = 30_000,
) {
  const startedAt = Date.now();
  let last;
  while (Date.now() - startedAt < timeoutMs) {
    last = await observer.goal(goalId, realmId);
    if (predicate(last)) return last;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(
    `Le serveur n’a pas atteint ${description}; dernier état=${JSON.stringify(last)}.`,
  );
}

function goal(targetValue, updatedAt, id = GOAL_ID) {
  return {
    id,
    title: 'TEST DEXIE CLOUD GOALS CONFLICT',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-18',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-18T11:51:21.266Z',
    updatedAt,
  };
}

async function createContext(browser, clockOffsetMs) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    locale: 'fr-FR',
  });
  await context.addInitScript((offsetMs) => {
    const NativeDate = Date;
    const nativeNow = NativeDate.now.bind(NativeDate);
    let activeOffsetMs = offsetMs;
    function SkewedDate(...args) {
      if (!new.target) {
        return new NativeDate(nativeNow() + activeOffsetMs).toString();
      }
      return args.length === 0
        ? new NativeDate(nativeNow() + activeOffsetMs)
        : new NativeDate(...args);
    }
    Object.setPrototypeOf(SkewedDate, NativeDate);
    SkewedDate.prototype = NativeDate.prototype;
    Object.defineProperty(NativeDate.prototype, 'constructor', {
      configurable: true,
      writable: true,
      value: SkewedDate,
    });
    Object.defineProperty(SkewedDate, 'name', { value: 'Date' });
    Object.defineProperty(SkewedDate, 'now', {
      configurable: true,
      writable: true,
      value: () => nativeNow() + activeOffsetMs,
    });
    Object.defineProperty(globalThis, 'Date', {
      configurable: true,
      writable: true,
      value: SkewedDate,
    });
    globalThis.__SPORTPILOT_REAL_NOW__ = () => nativeNow();
    globalThis.__SPORTPILOT_CLOCK_OFFSET_MS__ = activeOffsetMs;
    globalThis.__SPORTPILOT_SET_CLOCK_OFFSET__ = (nextOffsetMs) => {
      activeOffsetMs = nextOffsetMs;
      globalThis.__SPORTPILOT_CLOCK_OFFSET_MS__ = activeOffsetMs;
    };
  }, clockOffsetMs);
  return context;
}

async function evaluateClient(page, method, ...args) {
  return withTimeout(page.evaluate(
    async ({ methodName, methodArgs }) => {
      const client = window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__;
      if (!client) throw new Error('API integration-cloud absente.');
      const callable = client[methodName];
      if (typeof callable !== 'function') {
        throw new Error(`Méthode integration-cloud absente: ${methodName}`);
      }
      return callable.apply(client, methodArgs);
    },
    { methodName: method, methodArgs: args },
  ), `client.${method}`);
}

async function runRedScenario({
  databaseUrl,
  observer,
  browser,
  runId,
  legacyBaseline = false,
}) {
  const contextA = await createContext(browser, 30 * 60 * 1000);
  const contextB = await createContext(browser, 0);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const traces = [];

  try {
    progress('navigation des deux contextes');
    await Promise.all([
      pageA.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      pageB.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      pageB.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    progress('authentification demo des deux replicas');
    const [authA, authB] = await Promise.all([
      evaluateClient(pageA, 'initialize', {
        databaseUrl,
        device: 'A',
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(pageB, 'initialize', {
        databaseUrl,
        device: 'B',
        runId,
        demoUser: DEMO_USER,
      }),
    ]);
    if (authA.userId !== authB.userId || authA.userId !== DEMO_USER) {
      throw new Error('Les deux replicas ne partagent pas le même compte synthétique.');
    }

    progress(legacyBaseline
      ? 'création de la baseline v16 10000 sans journal immuable'
      : 'création et transport de la baseline 10000');
    const baseline = goal(10_000, '2026-08-18T12:00:00.000Z');
    await evaluateClient(pageB, 'putLocalGoal', baseline);
    if (legacyBaseline) {
      await evaluateClient(pageB, 'putLegacyReplicaGoal', baseline);
    } else {
      await evaluateClient(pageB, 'stage', GOAL_ID);
    }
    await evaluateClient(pageB, 'syncTransport');
    const serverBaseline = await waitForServerGoal(observer, GOAL_ID, 10_000);
    await evaluateClient(pageA, 'syncTransport', 'pull');
    if (legacyBaseline) {
      if (
        serverBaseline.canonicalSource !== 'legacy-realGoals'
        || serverBaseline.mutationCount !== 0
      ) {
        throw new Error('La baseline de migration contient déjà un journal v17.');
      }
      const migrationPreview = await evaluateClient(pageA, 'runtimeAnalyze');
      if (migrationPreview.changeOrigin !== 'unknown') {
        throw new Error(
          `La baseline v16 ne déclenche pas la réconciliation initiale sûre (${migrationPreview.changeOrigin ?? 'absent'}).`,
        );
      }
      await evaluateClient(pageA, 'reconcileInitialCloudBaseline');
    } else {
      await evaluateClient(pageA, 'putLocalGoal', baseline);
    }
    const [baselineA, baselineB] = await Promise.all([
      evaluateClient(pageA, 'establishEqualBaseline'),
      evaluateClient(pageB, 'establishEqualBaseline'),
    ]);
    traces.push({
      label: 'BASELINE',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      B: await evaluateClient(pageB, 'snapshot', GOAL_ID),
      server: serverBaseline,
      previews: { A: baselineA, B: baselineB },
    });

    progress('mutation A=8000 avec contexte A offline');
    await contextA.setOffline(true);
    const t1Real = Date.now();
    const aClockAtT1 = await evaluateClient(pageA, 'clock');
    const aMutation = goal(8_000, new Date(aClockAtT1.rawDateNow).toISOString());
    await evaluateClient(pageA, 'putLocalGoal', aMutation);
    await evaluateClient(pageA, 'stage', GOAL_ID);
    const afterAOffline = {
      label: 'A_OFFLINE_STAGED',
      orchestratorRealNow: t1Real,
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      server: await observer.goal(GOAL_ID),
    };
    traces.push(afterAOffline);
    if (afterAOffline.server?.targetValue !== 10_000) {
      throw new Error('A a transporté une mutation alors que son contexte était offline.');
    }

    progress('mutation B=55000 puis cloud.sync réel');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
    const t2Real = Date.now();
    const bClockAtT2 = await evaluateClient(pageB, 'clock');
    if (!(t1Real < t2Real && aClockAtT1.rawDateNow > bClockAtT2.rawDateNow)) {
      throw new Error('Le clock skew réel T1/T2 n’a pas été établi.');
    }
    const bMutation = goal(55_000, new Date(bClockAtT2.rawDateNow).toISOString());
    await evaluateClient(pageB, 'putLocalGoal', bMutation);
    await evaluateClient(pageB, 'stage', GOAL_ID);
    traces.push({
      label: 'B_ONLINE_BEFORE_SYNC',
      orchestratorRealNow: t2Real,
      B: await evaluateClient(pageB, 'snapshot', GOAL_ID),
    });
    await evaluateClient(pageB, 'syncTransport');
    const serverAfterB = await waitForServerGoal(observer, GOAL_ID, 55_000);
    traces.push({
      label: 'B_ONLINE_AFTER_SYNC',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      B: await evaluateClient(pageB, 'snapshot', GOAL_ID),
      server: serverAfterB,
    });

    progress('reconnexion A: premier cloud.sync runtime');
    traces.push({
      label: 'TRACE_1_BEFORE_A_FIRST_CLOUD_SYNC',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      B: await evaluateClient(pageB, 'snapshot', GOAL_ID),
      server: await observer.goal(GOAL_ID),
    });
    await contextA.setOffline(false);
    await evaluateClient(pageA, 'runtimeFirstSync');
    const serverAfterFirstASync = await observer.goal(GOAL_ID);
    traces.push({
      label: 'TRACE_2_AFTER_A_FIRST_CLOUD_SYNC_BEFORE_ANALYSIS',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      server: serverAfterFirstASync,
    });

    progress('reconnexion A: analyse Goals runtime');
    const previewA = await evaluateClient(pageA, 'runtimeAnalyze');
    traces.push({
      label: 'TRACE_3_4_AFTER_GOALS_ANALYSIS_WITH_ORIGIN',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      preview: previewA,
      origin: previewA.changeOrigin ?? 'equal',
      server: await observer.goal(GOAL_ID),
    });

    let synchronizeResult;
    if (previewA.differingEntityCount > 0) {
      progress(`reconnexion A: synchronize origin=${previewA.changeOrigin ?? 'unknown'}`);
      synchronizeResult = await evaluateClient(
        pageA,
        'runtimeSynchronize',
        previewA.changeOrigin ?? 'unknown',
      );
    }
    traces.push({
      label: 'TRACE_5_6_AFTER_SYNCHRONIZE_AND_A_JOURNAL',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      synchronizeResult,
      server: await observer.goal(GOAL_ID),
    });

    progress('reconnexion A: second cloud.sync et observation finale');
    await evaluateClient(pageA, 'runtimeFirstSync');
    const serverFinal = await observer.goal(GOAL_ID);
    traces.push({
      label: 'TRACE_7_8_AFTER_A_SECOND_CLOUD_SYNC_AND_CANONICAL_SERVER',
      orchestratorRealNow: Date.now(),
      A: await evaluateClient(pageA, 'snapshot', GOAL_ID),
      server: serverFinal,
    });

    await evaluateClient(pageB, 'syncTransport', 'pull');
    const finalA = await evaluateClient(pageA, 'snapshot', GOAL_ID);
    const finalB = await evaluateClient(pageB, 'snapshot', GOAL_ID);
    return {
      name: legacyBaseline
        ? 'goals-real-dexie-cloud-legacy-baseline-to-v18-causal-journal'
        : 'goals-real-dexie-cloud-skewed-offline-reconnect',
      runId,
      replicas: 2,
      t1Real,
      t2Real,
      aRawDateAtT1: aClockAtT1.rawDateNow,
      bRawDateAtT2: bClockAtT2.rawDateNow,
      serverAfterB,
      serverAfterFirstASync,
      serverFinal,
      finalA,
      finalB,
      traces,
      expectedTargetValue: EXPECTED_WINNER,
      legacyBaseline,
      passed:
        serverFinal?.targetValue === EXPECTED_WINNER
        && (!legacyBaseline || serverFinal?.mutationCount === 3),
    };
  } catch (error) {
    await writeReport({
      name: legacyBaseline
        ? 'goals-real-dexie-cloud-legacy-baseline-to-v18-causal-journal'
        : 'goals-real-dexie-cloud-skewed-offline-reconnect',
      runId,
      failedBeforeResult: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      traces,
    });
    throw error;
  } finally {
    await Promise.allSettled([
      evaluateClient(pageA, 'close'),
      evaluateClient(pageB, 'close'),
    ]);
    await contextA.close();
    await contextB.close();
  }
}

async function runNormalRowProbe({ databaseUrl, observer, browser, runId }) {
  const contextA = await createContext(browser, 30 * 60 * 1000);
  const contextB = await createContext(browser, 0);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const traces = [];
  try {
    progress('sonde normal-row: navigation et authentification');
    await Promise.all([
      pageA.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      pageB.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      pageB.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    const [authA, authB] = await Promise.all([
      evaluateClient(pageA, 'initialize', {
        databaseUrl,
        device: 'A',
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(pageB, 'initialize', {
        databaseUrl,
        device: 'B',
        runId,
        demoUser: DEMO_USER,
      }),
    ]);

    progress('sonde normal-row: baseline neutre 10000');
    const baseline = {
      ...goal(10_000, '2026-08-18T12:00:00.000Z'),
      id: NORMAL_ROW_PROBE_ID,
    };
    await evaluateClient(pageB, 'putReplicaGoalDirect', baseline);
    await evaluateClient(pageB, 'syncTransport');
    const serverBaseline = await waitForServerGoal(
      observer,
      NORMAL_ROW_PROBE_ID,
      10_000,
    );
    await evaluateClient(pageA, 'syncTransport', 'pull');
    traces.push({
      label: 'NORMAL_ROW_BASELINE',
      A: await evaluateClient(pageA, 'replicaSnapshotDirect', NORMAL_ROW_PROBE_ID),
      B: await evaluateClient(pageB, 'replicaSnapshotDirect', NORMAL_ROW_PROBE_ID),
      server: serverBaseline,
    });

    progress('sonde normal-row: A offline update 8000');
    await contextA.setOffline(true);
    const t1Real = Date.now();
    const aClock = await evaluateClient(pageA, 'clock');
    await evaluateClient(pageA, 'updateReplicaGoalDirect', NORMAL_ROW_PROBE_ID, {
      targetValue: 8_000,
      updatedAt: new Date(aClock.rawDateNow).toISOString(),
    });
    traces.push({
      label: 'NORMAL_ROW_A_OFFLINE',
      A: await evaluateClient(pageA, 'replicaSnapshotDirect', NORMAL_ROW_PROBE_ID),
      server: await observer.goal(NORMAL_ROW_PROBE_ID),
    });

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
    progress('sonde normal-row: B update plus tard 55000');
    const t2Real = Date.now();
    const bClock = await evaluateClient(pageB, 'clock');
    await evaluateClient(pageB, 'updateReplicaGoalDirect', NORMAL_ROW_PROBE_ID, {
      targetValue: 55_000,
      updatedAt: new Date(bClock.rawDateNow).toISOString(),
    });
    traces.push({
      label: 'NORMAL_ROW_B_BEFORE_SYNC',
      B: await evaluateClient(pageB, 'replicaSnapshotDirect', NORMAL_ROW_PROBE_ID),
    });
    await evaluateClient(pageB, 'syncTransport');
    const serverAfterB = await waitForServerGoal(
      observer,
      NORMAL_ROW_PROBE_ID,
      55_000,
    );

    progress('sonde normal-row: reconnexion A');
    await contextA.setOffline(false);
    await evaluateClient(pageA, 'syncTransport');
    const serverAfterA = await observer.goal(NORMAL_ROW_PROBE_ID);
    traces.push({
      label: 'NORMAL_ROW_AFTER_A_RECONNECT',
      A: await evaluateClient(pageA, 'replicaSnapshotDirect', NORMAL_ROW_PROBE_ID),
      server: serverAfterA,
    });
    return {
      name: 'dexie-cloud-normal-row-clock-skew-probe',
      sessionClocks: { A: authA.sessionClock, B: authB.sessionClock },
      t1Real,
      t2Real,
      aRawDateAtT1: aClock.rawDateNow,
      bRawDateAtT2: bClock.rawDateNow,
      serverAfterB,
      serverAfterA,
      expectedTargetValue: EXPECTED_WINNER,
      passed: serverAfterA?.targetValue === EXPECTED_WINNER,
      traces,
    };
  } finally {
    await Promise.allSettled([
      evaluateClient(pageA, 'close'),
      evaluateClient(pageB, 'close'),
    ]);
    await contextA.close();
    await contextB.close();
  }
}

async function runConflictVariant({
  databaseUrl,
  observer,
  browser,
  runId,
  name,
  olderDevice,
  olderClockOffsetMs,
  laterDevice,
  laterClockOffsetMs,
}) {
  const olderContext = await createContext(browser, 0);
  const laterContext = await createContext(browser, 0);
  const olderPage = await olderContext.newPage();
  const laterPage = await laterContext.newPage();
  try {
    await Promise.all([
      olderPage.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      laterPage.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      olderPage.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      laterPage.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    await Promise.all([
      evaluateClient(olderPage, 'initialize', {
        databaseUrl,
        device: olderDevice,
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(laterPage, 'initialize', {
        databaseUrl,
        device: laterDevice,
        runId,
        demoUser: DEMO_USER,
      }),
    ]);
    const baseline = goal(10_000, '2026-08-18T12:00:00.000Z');
    await evaluateClient(laterPage, 'putLocalGoal', baseline);
    await evaluateClient(laterPage, 'stage', GOAL_ID);
    const localBaseline = await evaluateClient(laterPage, 'snapshot', GOAL_ID);
    if (
      localBaseline.mutationHeads.length !== 1
      || !localBaseline.mutationHeads[0]?.nonPrivate
      || localBaseline.immutableMutations.length !== 2
    ) {
      throw new Error(
        `Bootstrap causal local incomplet: ${JSON.stringify({
          mutationCount: localBaseline.immutableMutations.length,
          heads: localBaseline.mutationHeads,
        })}`,
      );
    }
    await evaluateClient(laterPage, 'syncTransport');
    progress(`bootstrap serveur observé: ${JSON.stringify(
      await observer.diagnostic(GOAL_ID),
    )}`);
    await waitForServerGoal(observer, GOAL_ID, 10_000);
    await evaluateClient(olderPage, 'syncTransport', 'pull');
    await evaluateClient(olderPage, 'putLocalGoal', baseline);
    await Promise.all([
      evaluateClient(olderPage, 'establishEqualBaseline'),
      evaluateClient(laterPage, 'establishEqualBaseline'),
    ]);
    await Promise.all([
      evaluateClient(olderPage, 'setClockOffset', olderClockOffsetMs),
      evaluateClient(laterPage, 'setClockOffset', laterClockOffsetMs),
    ]);

    await olderContext.setOffline(true);
    const t1Real = Date.now();
    const olderClock = await evaluateClient(olderPage, 'clock');
    await evaluateClient(
      olderPage,
      'putLocalGoal',
      goal(8_000, new Date(olderClock.rawDateNow).toISOString()),
    );
    await evaluateClient(olderPage, 'stage', GOAL_ID);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));

    const t2Real = Date.now();
    const laterClock = await evaluateClient(laterPage, 'clock');
    await evaluateClient(
      laterPage,
      'putLocalGoal',
      goal(55_000, new Date(laterClock.rawDateNow).toISOString()),
    );
    await evaluateClient(laterPage, 'stage', GOAL_ID);
    await evaluateClient(laterPage, 'syncTransport');
    const serverAfterLater = await waitForServerGoal(
      observer,
      GOAL_ID,
      EXPECTED_WINNER,
    );

    if (Math.abs(olderClockOffsetMs) >= 24 * 60 * 60 * 1000) {
      await evaluateClient(olderPage, 'setClockOffset', 0);
    }
    await olderContext.setOffline(false);
    await evaluateClient(olderPage, 'runtimeFirstSync');
    const preview = await evaluateClient(olderPage, 'runtimeAnalyze');
    if (preview.differingEntityCount > 0) {
      await evaluateClient(
        olderPage,
        'runtimeSynchronize',
        preview.changeOrigin ?? 'unknown',
      );
    }
    await evaluateClient(olderPage, 'runtimeFirstSync');
    await evaluateClient(laterPage, 'syncTransport', 'pull');
    const serverFinal = await waitForServerGoal(
      observer,
      GOAL_ID,
      EXPECTED_WINNER,
    );
    const [finalOlder, finalLater] = await Promise.all([
      evaluateClient(olderPage, 'snapshot', GOAL_ID),
      evaluateClient(laterPage, 'snapshot', GOAL_ID),
    ]);
    return {
      name,
      t1Real,
      t2Real,
      olderRawDateAtT1: olderClock.rawDateNow,
      laterRawDateAtT2: laterClock.rawDateNow,
      serverAfterLater,
      serverFinal,
      finalOlder,
      finalLater,
      expectedTargetValue: EXPECTED_WINNER,
      passed:
        serverFinal?.targetValue === EXPECTED_WINNER
        && finalOlder.appGoal?.targetValue === EXPECTED_WINNER
        && finalLater.appGoal?.targetValue === EXPECTED_WINNER,
    };
  } finally {
    await Promise.allSettled([
      evaluateClient(olderPage, 'close'),
      evaluateClient(laterPage, 'close'),
    ]);
    await olderContext.close();
    await laterContext.close();
  }
}

async function runTwoOfflineBranchVariant({
  databaseUrl,
  observer,
  browser,
  runId,
  firstDevice,
}) {
  const contextA = await createContext(browser, 0);
  const contextB = await createContext(browser, 0);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const firstPage = firstDevice === 'A' ? pageA : pageB;
  const secondPage = firstDevice === 'A' ? pageB : pageA;
  const firstContext = firstDevice === 'A' ? contextA : contextB;
  const secondContext = firstDevice === 'A' ? contextB : contextA;
  const expected = firstDevice === 'A' ? 8_000 : 55_000;

  async function reconcile(page) {
    const preview = await evaluateClient(page, 'runtimeAnalyze');
    if (preview.differingEntityCount > 0) {
      await evaluateClient(
        page,
        'runtimeSynchronize',
        preview.changeOrigin ?? 'unknown',
      );
    }
  }

  try {
    await Promise.all([
      pageA.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      pageB.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      pageB.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    await Promise.all([
      evaluateClient(pageA, 'initialize', {
        databaseUrl,
        device: 'A',
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(pageB, 'initialize', {
        databaseUrl,
        device: 'B',
        runId,
        demoUser: DEMO_USER,
      }),
    ]);
    const baseline = goal(10_000, '2026-08-18T12:00:00.000Z');
    await evaluateClient(pageB, 'putLocalGoal', baseline);
    await evaluateClient(pageB, 'stage', GOAL_ID);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, GOAL_ID, 10_000);
    await evaluateClient(pageA, 'syncTransport', 'pull');
    await evaluateClient(pageA, 'putLocalGoal', baseline);
    await Promise.all([
      evaluateClient(pageA, 'establishEqualBaseline'),
      evaluateClient(pageB, 'establishEqualBaseline'),
    ]);
    await Promise.all([
      evaluateClient(pageA, 'setClockOffset', 24 * 60 * 60 * 1000),
      evaluateClient(pageB, 'setClockOffset', -24 * 60 * 60 * 1000),
    ]);

    await Promise.all([
      contextA.setOffline(true),
      contextB.setOffline(true),
    ]);
    await evaluateClient(
      pageA,
      'putLocalGoal',
      goal(8_000, '2040-01-01T00:00:00.000Z'),
    );
    await evaluateClient(pageA, 'stage', GOAL_ID);
    await evaluateClient(
      pageB,
      'putLocalGoal',
      goal(55_000, '2000-01-01T00:00:00.000Z'),
    );
    await evaluateClient(pageB, 'stage', GOAL_ID);

    await evaluateClient(firstPage, 'setClockOffset', 0);
    await firstContext.setOffline(false);
    await evaluateClient(firstPage, 'runtimeFirstSync');
    const afterFirst = await waitForServerGoal(observer, GOAL_ID, expected);

    await evaluateClient(secondPage, 'setClockOffset', 0);
    await secondContext.setOffline(false);
    await evaluateClient(secondPage, 'runtimeFirstSync');
    await reconcile(secondPage);
    await evaluateClient(secondPage, 'runtimeFirstSync');
    await evaluateClient(firstPage, 'runtimeFirstSync');
    await reconcile(firstPage);

    const [serverFinal, mutations, finalA, finalB] = await Promise.all([
      observer.goal(GOAL_ID),
      observer.goalMutations(GOAL_ID),
      evaluateClient(pageA, 'snapshot', GOAL_ID),
      evaluateClient(pageB, 'snapshot', GOAL_ID),
    ]);
    const targets = mutations.map((mutation) => mutation.goal?.targetValue);
    return {
      name: `two-offline-first-${firstDevice.toLowerCase()}`,
      firstDevice,
      afterFirst,
      serverFinal,
      mutationCount: mutations.length,
      expectedTargetValue: expected,
      passed:
        afterFirst.targetValue === expected
        && serverFinal?.targetValue === expected
        && targets.includes(8_000)
        && targets.includes(55_000)
        && finalA.appGoal?.targetValue === expected
        && finalB.appGoal?.targetValue === expected,
    };
  } finally {
    await Promise.allSettled([
      evaluateClient(pageA, 'close'),
      evaluateClient(pageB, 'close'),
    ]);
    await contextA.close();
    await contextB.close();
  }
}

async function runStaleDescendantVariant({
  databaseUrl,
  observer,
  browser,
  runId,
}) {
  const contextA = await createContext(browser, 0);
  const contextB = await createContext(browser, 0);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await Promise.all([
      pageA.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      pageB.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      pageB.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    await Promise.all([
      evaluateClient(pageA, 'initialize', {
        databaseUrl,
        device: 'A',
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(pageB, 'initialize', {
        databaseUrl,
        device: 'B',
        runId,
        demoUser: DEMO_USER,
      }),
    ]);

    const baseline = goal(10_000, '2026-08-18T12:00:00.000Z');
    await evaluateClient(pageB, 'putLocalGoal', baseline);
    await evaluateClient(pageB, 'stage', GOAL_ID);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, GOAL_ID, 10_000);
    await evaluateClient(pageA, 'syncTransport', 'pull');
    await evaluateClient(pageA, 'putLocalGoal', baseline);
    await Promise.all([
      evaluateClient(pageA, 'establishEqualBaseline'),
      evaluateClient(pageB, 'establishEqualBaseline'),
    ]);
    await evaluateClient(pageA, 'setClockOffset', 24 * 60 * 60 * 1000);

    await contextA.setOffline(true);
    for (const targetValue of [8_000, 7_000, 6_000]) {
      await evaluateClient(
        pageA,
        'putLocalGoal',
        goal(targetValue, `2040-01-0${targetValue / 1_000}T00:00:00.000Z`),
      );
      await evaluateClient(pageA, 'stage', GOAL_ID);
    }
    await evaluateClient(
      pageB,
      'putLocalGoal',
      goal(55_000, '2000-01-01T00:00:00.000Z'),
    );
    await evaluateClient(pageB, 'stage', GOAL_ID);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, GOAL_ID, 55_000);

    await evaluateClient(pageA, 'setClockOffset', 0);
    await contextA.setOffline(false);
    await evaluateClient(pageA, 'runtimeFirstSync');
    const preview = await evaluateClient(pageA, 'runtimeAnalyze');
    if (preview.differingEntityCount > 0) {
      await evaluateClient(
        pageA,
        'runtimeSynchronize',
        preview.changeOrigin ?? 'unknown',
      );
    }
    await evaluateClient(pageA, 'runtimeFirstSync');
    await evaluateClient(pageB, 'syncTransport', 'pull');

    const [serverFinal, mutations, finalA, finalB] = await Promise.all([
      observer.goal(GOAL_ID),
      observer.goalMutations(GOAL_ID),
      evaluateClient(pageA, 'snapshot', GOAL_ID),
      evaluateClient(pageB, 'snapshot', GOAL_ID),
    ]);
    const byTarget = new Map(mutations.flatMap((mutation) =>
      typeof mutation.goal?.targetValue === 'number'
        ? [[mutation.goal.targetValue, mutation]]
        : []));
    const a1 = byTarget.get(8_000);
    const a2 = byTarget.get(7_000);
    const a3 = byTarget.get(6_000);
    return {
      name: 'stale-branch-descendants-blocked',
      serverFinal,
      mutationCount: mutations.length,
      expectedTargetValue: 55_000,
      passed:
        serverFinal?.targetValue === 55_000
        && Boolean(a1 && a2 && a3)
        && a2?.parentMutationId === a1?.id
        && a3?.parentMutationId === a2?.id
        && serverFinal?.headMutationId !== a1?.id
        && serverFinal?.headMutationId !== a2?.id
        && serverFinal?.headMutationId !== a3?.id
        && finalA.appGoal?.targetValue === 55_000
        && finalB.appGoal?.targetValue === 55_000,
    };
  } finally {
    await Promise.allSettled([
      evaluateClient(pageA, 'close'),
      evaluateClient(pageB, 'close'),
    ]);
    await contextA.close();
    await contextB.close();
  }
}

async function runRequiredBehaviorSuite({
  databaseUrl,
  observer,
  browser,
  runId,
}) {
  const contextA = await createContext(browser, 30 * 60 * 1000);
  const contextB = await createContext(browser, 0);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const results = [];

  async function occurredAt(page) {
    const clock = await evaluateClient(page, 'clock');
    return new Date(clock.rawDateNow).toISOString();
  }

  async function establishActiveBaseline(goalId) {
    const value = goal(10_000, '2026-08-18T12:00:00.000Z', goalId);
    await evaluateClient(pageB, 'putLocalGoal', value);
    await evaluateClient(pageB, 'stage', goalId);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, goalId, 10_000);
    await evaluateClient(pageA, 'syncTransport', 'pull');
    await evaluateClient(pageA, 'putLocalGoal', value);
    await Promise.all([
      evaluateClient(pageA, 'establishEqualBaseline'),
      evaluateClient(pageB, 'establishEqualBaseline'),
    ]);
    return value;
  }

  async function convergeA(goalId) {
    await contextA.setOffline(false);
    await evaluateClient(pageA, 'runtimeFirstSync');
    const preview = await evaluateClient(pageA, 'runtimeAnalyze');
    if (preview.differingEntityCount > 0) {
      await evaluateClient(
        pageA,
        'runtimeSynchronize',
        preview.changeOrigin ?? 'unknown',
      );
    }
    await evaluateClient(pageA, 'runtimeFirstSync');
    await evaluateClient(pageB, 'syncTransport', 'pull');
    return Promise.all([
      evaluateClient(pageA, 'snapshot', goalId),
      evaluateClient(pageB, 'snapshot', goalId),
    ]);
  }

  async function expectDeleted(goalId) {
    return waitForServerState(
      observer,
      goalId,
      (value) => value?.status === 'deleted',
      'un état supprimé',
    );
  }

  try {
    await Promise.all([
      pageA.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
      pageB.goto(`${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`),
    ]);
    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
      pageB.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__)),
    ]);
    await Promise.all([
      evaluateClient(pageA, 'initialize', {
        databaseUrl,
        device: 'A',
        runId,
        demoUser: DEMO_USER,
      }),
      evaluateClient(pageB, 'initialize', {
        databaseUrl,
        device: 'B',
        runId,
        demoUser: DEMO_USER,
      }),
    ]);

    const updateThenDeleteId = 'goal-update-old-delete-new';
    await establishActiveBaseline(updateThenDeleteId);
    await contextA.setOffline(true);
    await evaluateClient(
      pageA,
      'putLocalGoal',
      goal(8_000, await occurredAt(pageA), updateThenDeleteId),
    );
    await evaluateClient(pageA, 'stage', updateThenDeleteId);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    await evaluateClient(
      pageB,
      'deleteLocalGoal',
      updateThenDeleteId,
      await occurredAt(pageB),
    );
    await evaluateClient(pageB, 'stage', updateThenDeleteId);
    await evaluateClient(pageB, 'syncTransport');
    const updateThenDeleteServer = await expectDeleted(updateThenDeleteId);
    const [updateThenDeleteA, updateThenDeleteB] = await convergeA(
      updateThenDeleteId,
    );
    results.push({
      name: 'update-ancien-vs-delete-recent',
      server: updateThenDeleteServer,
      passed:
        !updateThenDeleteA.appGoal
        && !updateThenDeleteB.appGoal
        && updateThenDeleteA.appMarkers.some((marker) => marker.status === 'deleted'),
    });

    const deleteThenUpdateId = 'goal-delete-old-update-new';
    await establishActiveBaseline(deleteThenUpdateId);
    await contextA.setOffline(true);
    await evaluateClient(
      pageA,
      'deleteLocalGoal',
      deleteThenUpdateId,
      await occurredAt(pageA),
    );
    await evaluateClient(pageA, 'stage', deleteThenUpdateId);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    await evaluateClient(
      pageB,
      'putLocalGoal',
      goal(55_000, await occurredAt(pageB), deleteThenUpdateId),
    );
    await evaluateClient(pageB, 'stage', deleteThenUpdateId);
    await evaluateClient(pageB, 'syncTransport');
    const deleteThenUpdateServer = await waitForServerGoal(
      observer,
      deleteThenUpdateId,
      55_000,
    );
    const [deleteThenUpdateA, deleteThenUpdateB] = await convergeA(
      deleteThenUpdateId,
    );
    results.push({
      name: 'delete-ancien-vs-update-recent',
      server: deleteThenUpdateServer,
      passed:
        deleteThenUpdateA.appGoal?.targetValue === 55_000
        && deleteThenUpdateB.appGoal?.targetValue === 55_000,
    });

    const deleteThenRestoreId = 'goal-delete-old-restore-new';
    await establishActiveBaseline(deleteThenRestoreId);
    await contextA.setOffline(true);
    await evaluateClient(
      pageA,
      'deleteLocalGoal',
      deleteThenRestoreId,
      await occurredAt(pageA),
    );
    await evaluateClient(pageA, 'stage', deleteThenRestoreId);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    await evaluateClient(
      pageB,
      'deleteLocalGoal',
      deleteThenRestoreId,
      await occurredAt(pageB),
    );
    await evaluateClient(pageB, 'stage', deleteThenRestoreId);
    const restoredByB = goal(
      55_000,
      await occurredAt(pageB),
      deleteThenRestoreId,
    );
    await evaluateClient(
      pageB,
      'restoreLocalGoal',
      restoredByB,
      restoredByB.updatedAt,
    );
    await evaluateClient(pageB, 'stage', deleteThenRestoreId);
    await evaluateClient(pageB, 'syncTransport');
    const deleteThenRestoreServer = await waitForServerGoal(
      observer,
      deleteThenRestoreId,
      55_000,
    );
    const [deleteThenRestoreA, deleteThenRestoreB] = await convergeA(
      deleteThenRestoreId,
    );
    results.push({
      name: 'delete-ancien-vs-restore-recent',
      server: deleteThenRestoreServer,
      passed:
        deleteThenRestoreServer.mutationOperation === 'restore'
        && deleteThenRestoreA.appGoal?.targetValue === 55_000
        && deleteThenRestoreB.appGoal?.targetValue === 55_000,
    });

    const restoreThenDeleteId = 'goal-restore-old-delete-new';
    await establishActiveBaseline(restoreThenDeleteId);
    const baselineDeleteAt = await occurredAt(pageB);
    await evaluateClient(
      pageB,
      'deleteLocalGoal',
      restoreThenDeleteId,
      baselineDeleteAt,
    );
    await evaluateClient(pageB, 'stage', restoreThenDeleteId);
    await evaluateClient(pageB, 'syncTransport');
    await expectDeleted(restoreThenDeleteId);
    await convergeA(restoreThenDeleteId);

    await contextA.setOffline(true);
    const restoredByA = goal(
      8_000,
      await occurredAt(pageA),
      restoreThenDeleteId,
    );
    await evaluateClient(
      pageA,
      'restoreLocalGoal',
      restoredByA,
      restoredByA.updatedAt,
    );
    await evaluateClient(pageA, 'stage', restoreThenDeleteId);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    const temporaryRestoreB = goal(
      10_000,
      await occurredAt(pageB),
      restoreThenDeleteId,
    );
    await evaluateClient(
      pageB,
      'restoreLocalGoal',
      temporaryRestoreB,
      temporaryRestoreB.updatedAt,
    );
    await evaluateClient(pageB, 'stage', restoreThenDeleteId);
    await evaluateClient(
      pageB,
      'deleteLocalGoal',
      restoreThenDeleteId,
      await occurredAt(pageB),
    );
    await evaluateClient(pageB, 'stage', restoreThenDeleteId);
    await evaluateClient(pageB, 'syncTransport');
    const restoreThenDeleteServer = await expectDeleted(restoreThenDeleteId);
    const [restoreThenDeleteA, restoreThenDeleteB] = await convergeA(
      restoreThenDeleteId,
    );
    results.push({
      name: 'restore-ancien-vs-delete-recent',
      server: restoreThenDeleteServer,
      passed:
        restoreThenDeleteServer.mutationOperation === 'delete'
        && !restoreThenDeleteA.appGoal
        && !restoreThenDeleteB.appGoal,
    });

    const followUp = goal(
      60_000,
      await occurredAt(pageB),
      deleteThenUpdateId,
    );
    await evaluateClient(pageB, 'putLocalGoal', followUp);
    await evaluateClient(pageB, 'stage', deleteThenUpdateId);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, deleteThenUpdateId, 60_000);
    let [followUpA, followUpB] = await convergeA(deleteThenUpdateId);
    results.push({
      name: 'mutation-suivante-b-online',
      passed:
        followUpA.appGoal?.targetValue === 60_000
        && followUpB.appGoal?.targetValue === 60_000,
    });

    for (const targetValue of [61_000, 62_000]) {
      const rapid = goal(
        targetValue,
        await occurredAt(pageB),
        deleteThenUpdateId,
      );
      await evaluateClient(pageB, 'putLocalGoal', rapid);
      await evaluateClient(pageB, 'stage', deleteThenUpdateId);
    }
    await evaluateClient(pageB, 'syncTransport');
    const rapidServer = await waitForServerGoal(
      observer,
      deleteThenUpdateId,
      62_000,
    );
    [followUpA, followUpB] = await convergeA(deleteThenUpdateId);
    results.push({
      name: 'deux-mutations-rapides',
      server: rapidServer,
      passed:
        followUpA.appGoal?.targetValue === 62_000
        && followUpB.appGoal?.targetValue === 62_000,
    });

    await pageA.reload();
    await pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__));
    await evaluateClient(pageA, 'initialize', {
      databaseUrl,
      device: 'A',
      runId,
      demoUser: DEMO_USER,
    });
    await evaluateClient(pageA, 'runtimeFirstSync');
    const afterReload = await evaluateClient(pageA, 'snapshot', deleteThenUpdateId);
    results.push({
      name: 'reload-navigation',
      passed:
        afterReload.appGoal?.targetValue === 62_000
        && afterReload.replicaGoal?.targetValue === 62_000,
    });

    const sessionId = 'goal-session-reauth';
    await establishActiveBaseline(sessionId);
    await contextA.setOffline(true);
    await evaluateClient(
      pageA,
      'putLocalGoal',
      goal(8_000, await occurredAt(pageA), sessionId),
    );
    await evaluateClient(pageA, 'stage', sessionId);
    const beforeSessionExpiry = await evaluateClient(pageA, 'snapshot', sessionId);
    await evaluateClient(
      pageB,
      'putLocalGoal',
      goal(55_000, await occurredAt(pageB), sessionId),
    );
    await evaluateClient(pageB, 'stage', sessionId);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, sessionId, 55_000);

    await evaluateClient(pageA, 'close');
    await contextA.setOffline(false);
    await pageA.reload();
    await pageA.waitForFunction(() => Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__));
    await evaluateClient(pageA, 'initialize', {
      databaseUrl,
      device: 'A',
      runId,
      demoUser: DEMO_USER,
    });
    await evaluateClient(pageA, 'reauthenticateForSessionTest');
    await evaluateClient(pageA, 'runtimeFirstSync');
    const sessionPreview = await evaluateClient(pageA, 'runtimeAnalyze');
    if (sessionPreview.differingEntityCount > 0) {
      await evaluateClient(
        pageA,
        'runtimeSynchronize',
        sessionPreview.changeOrigin ?? 'unknown',
      );
    }
    await evaluateClient(pageA, 'runtimeFirstSync');
    const [sessionServer, sessionMutations, sessionAfter] = await Promise.all([
      observer.goal(sessionId),
      observer.goalMutations(sessionId),
      evaluateClient(pageA, 'snapshot', sessionId),
    ]);
    const offlineSessionMutation = sessionMutations.find((mutation) =>
      mutation.goal?.targetValue === 8_000);
    const stagedOfflineSessionMutation = beforeSessionExpiry.immutableMutations
      .find((mutation) =>
        mutation.entityId === sessionId
        && mutation.goal?.targetValue === 8_000);
    results.push({
      name: 'session-expiry-reauth',
      server: sessionServer,
      offlineMutation: offlineSessionMutation,
      stagedParentMutationId: stagedOfflineSessionMutation?.parentMutationId,
      finalAppTarget: sessionAfter.appGoal?.targetValue,
      passed:
        sessionServer?.targetValue === 55_000
        && Boolean(offlineSessionMutation)
        && offlineSessionMutation?.parentMutationId
          === stagedOfflineSessionMutation?.parentMutationId
        && sessionAfter.appGoal?.targetValue === 55_000,
    });

    const offlineId = 'goal-offline-pure';
    await establishActiveBaseline(offlineId);
    await contextA.setOffline(true);
    await evaluateClient(
      pageA,
      'putLocalGoal',
      goal(77_000, await occurredAt(pageA), offlineId),
    );
    await evaluateClient(pageA, 'stage', offlineId);
    const offlineSnapshot = await evaluateClient(pageA, 'snapshot', offlineId);
    const offlineServer = await observer.goal(offlineId);
    results.push({
      name: 'offline-pur-sans-reseau',
      passed:
        offlineSnapshot.appGoal?.targetValue === 77_000
        && offlineSnapshot.replicaGoal?.targetValue === 77_000
        && offlineSnapshot.immutableTransportJournal.length > 0
        && offlineServer?.targetValue === 10_000,
    });
    await contextA.setOffline(false);

    const isolationId = 'goal-account-isolation';
    await evaluateClient(
      pageB,
      'putLocalGoal',
      goal(11_000, await occurredAt(pageB), isolationId),
    );
    await evaluateClient(pageB, 'stage', isolationId);
    await evaluateClient(pageB, 'syncTransport');
    await waitForServerGoal(observer, isolationId, 11_000);
    const isolationContext = await createContext(browser, 0);
    const isolationPage = await isolationContext.newPage();
    try {
      await isolationPage.goto(
        `${HARNESS_ORIGIN}/tests/integration-cloud/goals-dexie-cloud-client.html`,
      );
      await isolationPage.waitForFunction(() =>
        Boolean(window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__));
      await evaluateClient(isolationPage, 'initialize', {
        databaseUrl,
        device: 'B',
        runId: `${runId}-isolation`,
        demoUser: ISOLATION_DEMO_USER,
      });
      const isolationClock = await occurredAt(isolationPage);
      await evaluateClient(
        isolationPage,
        'putLocalGoal',
        goal(99_000, isolationClock, isolationId),
      );
      await evaluateClient(isolationPage, 'stage', isolationId);
      await evaluateClient(isolationPage, 'syncTransport');
      const [mainRealm, isolationRealm] = await Promise.all([
        waitForServerState(
          observer,
          isolationId,
          (value) => value?.targetValue === 11_000,
          'targetValue=11000 dans le compte principal',
        ),
        waitForServerState(
          observer,
          isolationId,
          (value) => value?.targetValue === 99_000,
          'targetValue=99000 dans le compte isolé',
          ISOLATION_DEMO_USER,
        ),
      ]);
      results.push({
        name: 'isolation-compte',
        passed:
          mainRealm.targetValue === 11_000
          && isolationRealm.targetValue === 99_000,
      });
    } finally {
      await evaluateClient(isolationPage, 'close').catch(() => undefined);
      await isolationContext.close();
    }

    return {
      name: 'goals-real-dexie-cloud-behavior-suite',
      caseCount: results.length,
      passedCount: results.filter((entry) => entry.passed).length,
      passed: results.every((entry) => entry.passed),
      results,
    };
  } finally {
    await Promise.allSettled([
      evaluateClient(pageA, 'close'),
      evaluateClient(pageB, 'close'),
    ]);
    await contextA.close();
    await contextB.close();
  }
}

async function writeReport(report) {
  const reportPath = join(
    REPO_ROOT,
    'test-results',
    'integration-cloud',
    'goals-dexie-cloud-latest.json',
  );
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

async function main() {
  const databaseUrl = assertSafeTestDatabaseUrl(
    requiredEnvironment('SPORTPILOT_DEXIE_TEST_DB_URL'),
  );
  const credentialDirectory = resolve(
    requiredEnvironment('SPORTPILOT_DEXIE_TEST_CREDENTIAL_DIR'),
  );
  progress('validation URL/credentials TEST');
  const credentials = await readManagementCredentials(
    databaseUrl,
    credentialDirectory,
  );
  progress('provisionnement demo user, schéma, whitelist et reset ciblé');
  await provisionTestDatabase(databaseUrl, credentialDirectory);
  progress('authentification de l’observateur REST indépendant');
  const observer = await createObserver(databaseUrl, credentials);
  if (await observer.goal(GOAL_ID)) {
    throw new Error('Le reset ciblé du realm synthétique n’a pas produit un état vide.');
  }

  const packageMetadata = JSON.parse(
    await readFile(join(REPO_ROOT, 'package.json'), 'utf8'),
  );
  if (packageMetadata.dependencies?.['dexie-cloud-addon'] !== '4.4.13') {
    throw new Error('Le gate exige dexie-cloud-addon@4.4.13 exactement.');
  }

  progress('démarrage du serveur Vite local du harness');
  const vite = await createServer({
    root: REPO_ROOT,
    configFile: false,
    clearScreen: false,
    define: { __APP_VERSION__: JSON.stringify(packageMetadata.version) },
    resolve: { alias: { '@': join(REPO_ROOT, 'src') } },
    server: {
      host: '127.0.0.1',
      port: HARNESS_PORT,
      strictPort: true,
    },
  });
  await vite.listen();

  const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {};
  progress('lancement de Chromium et des replicas isolés');
  const browser = await chromium.launch({ ...launchOptions, headless: true });
  let result;
  try {
    const runProbe = process.argv.includes('--normal-row-probe');
    const runLegacyMigration = process.argv.includes('--legacy-migration');
    const runSuite = process.argv.includes('--suite');
    const runBehavior = process.argv.includes('--behavior');
    if ([runProbe, runLegacyMigration, runSuite, runBehavior].filter(Boolean).length > 1) {
      throw new Error(
        '--normal-row-probe, --legacy-migration, --suite et --behavior sont mutuellement exclusifs.',
      );
    }
    if (runBehavior) {
      result = await runRequiredBehaviorSuite({
        databaseUrl,
        observer,
        browser,
        runId: `goals-behavior-${Date.now()}`,
      });
    } else if (runSuite) {
      const variants = [
        {
          name: 'stale-offline-plus-1h',
          olderDevice: 'B',
          olderClockOffsetMs: 60 * 60 * 1000,
          laterDevice: 'A',
          laterClockOffsetMs: 0,
        },
        {
          name: 'stale-offline-plus-24h',
          olderDevice: 'B',
          olderClockOffsetMs: 24 * 60 * 60 * 1000,
          laterDevice: 'A',
          laterClockOffsetMs: 0,
        },
        {
          name: 'stale-offline-minus-24h',
          olderDevice: 'B',
          olderClockOffsetMs: -24 * 60 * 60 * 1000,
          laterDevice: 'A',
          laterClockOffsetMs: 0,
        },
        {
          name: 'mirror-a-offline-b-online',
          olderDevice: 'A',
          olderClockOffsetMs: 60 * 60 * 1000,
          laterDevice: 'B',
          laterClockOffsetMs: 0,
        },
      ];
      const runs = [];
      for (const [index, variant] of variants.entries()) {
        if (index > 0) {
          await clearSyntheticRealm(databaseUrl, credentialDirectory);
        }
        progress(`suite cloud réelle: ${variant.name}`);
        runs.push(await runConflictVariant({
          databaseUrl,
          observer,
          browser,
          runId: `goals-suite-${Date.now()}-${index + 1}`,
          ...variant,
        }));
      }
      for (const firstDevice of ['A', 'B']) {
        await clearSyntheticRealm(databaseUrl, credentialDirectory);
        progress(`suite cloud réelle: two-offline-first-${firstDevice.toLowerCase()}`);
        runs.push(await runTwoOfflineBranchVariant({
          databaseUrl,
          observer,
          browser,
          runId: `goals-two-offline-${Date.now()}-${firstDevice.toLowerCase()}`,
          firstDevice,
        }));
      }
      await clearSyntheticRealm(databaseUrl, credentialDirectory);
      progress('suite cloud réelle: stale descendants A1 -> A2 -> A3');
      runs.push(await runStaleDescendantVariant({
        databaseUrl,
        observer,
        browser,
        runId: `goals-stale-descendants-${Date.now()}`,
      }));
      await clearSyntheticRealm(databaseUrl, credentialDirectory);
      await clearSyntheticRealm(
        databaseUrl,
        credentialDirectory,
        ISOLATION_DEMO_USER,
      );
      progress('suite cloud réelle: delete/restore, reload, rafale, isolation, offline');
      runs.push(await runRequiredBehaviorSuite({
        databaseUrl,
        observer,
        browser,
        runId: `goals-behavior-${Date.now()}`,
      }));
      result = {
        name: 'goals-real-dexie-cloud-required-variants',
        repeatCount: runs.length,
        passedCount: runs.filter((run) => run.passed).length,
        passed: runs.every((run) => run.passed),
        runs,
      };
    } else {
    const repeatCount = runProbe || runLegacyMigration ? 1 : requestedRepeatCount();
    const runs = [];
    for (let index = 0; index < repeatCount; index += 1) {
      if (index > 0) {
        progress(`reset ciblé avant répétition ${index + 1}/${repeatCount}`);
        await clearSyntheticRealm(databaseUrl, credentialDirectory);
      }
      runs.push(await (runProbe ? runNormalRowProbe : runRedScenario)({
        databaseUrl,
        observer,
        browser,
        runId: `goals-cloud-${Date.now()}-run-${index + 1}`,
        legacyBaseline: runLegacyMigration,
      }));
    }
    result = runs.length === 1
      ? runs[0]
      : {
          name: 'goals-real-dexie-cloud-skewed-offline-reconnect-repeat',
          repeatCount,
          passedCount: runs.filter((run) => run.passed).length,
          passed: runs.every((run) => run.passed),
          runs,
        };
    }
  } finally {
    await browser.close();
    await vite.close();
  }

  const report = {
    testDatabaseUrl: databaseUrl,
    demoUser: DEMO_USER,
    addonVersion: packageMetadata.dependencies['dexie-cloud-addon'],
    dexieVersion: packageMetadata.dependencies.dexie,
    result,
  };
  const reportPath = await writeReport(report);
  console.log(JSON.stringify({
    test: result.name,
    replicas: result.replicas ?? result.runs?.[0]?.replicas,
    repeatCount: result.repeatCount ?? 1,
    passedCount: result.passedCount ?? (result.passed ? 1 : 0),
    serverAfterB:
      result.serverAfterB?.targetValue
      ?? result.runs?.at(-1)?.serverAfterB?.targetValue
      ?? result.runs?.at(-1)?.serverAfterLater?.targetValue,
    serverAfterReconnectA:
      result.serverFinal?.targetValue
      ?? result.serverAfterA?.targetValue
      ?? result.runs?.at(-1)?.serverFinal?.targetValue,
    expected:
      result.expectedTargetValue
      ?? result.runs?.at(-1)?.expectedTargetValue,
    clockSkewEstablished:
      result.runs
        ? result.runs
            .map(clockProof)
            .filter((proof) => proof !== undefined)
            .every(Boolean)
        : clockProof(result),
    reportPath,
    passed: result.passed,
  }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
