import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderTerminal } from './terminal.mjs';

const USER = process.env.GH_USER || 'vitor-galdino';
const TOKEN = process.env.GH_TOKEN;
const STATS_FILE = 'data/stats.json';
const SVG_FILE = 'assets/terminal.svg';
const EXCLUDE_LANGS = 'JSON,JSON5,YAML,Markdown,SVG,XML,CSV,Text,TOML,INI,Properties,diff,reStructuredText';
const EXCLUDE_DIRS = 'node_modules,dist,build,.next,out,coverage,vendor,venv,.venv,__pycache__';

async function gql(query, variables = {}, attempt = 1) {
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
  } catch (e) {
    if (attempt >= 4) throw e;
    await new Promise(r => setTimeout(r, attempt * 3000));
    return gql(query, variables, attempt + 1);
  }
}

async function totalCommits() {
  const { user } = await gql('query($l:String!){ user(login:$l){ createdAt } }', { l: USER });
  const start = new Date(user.createdAt).getUTCFullYear(), now = new Date();
  let total = 0;
  for (let y = start; y <= now.getUTCFullYear(); y++) {
    const from = new Date(Date.UTC(y, 0, 1)).toISOString();
    const to = y === now.getUTCFullYear() ? now.toISOString() : new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
    const d = await gql('query($l:String!,$f:DateTime!,$t:DateTime!){ user(login:$l){ contributionsCollection(from:$f,to:$t){ totalCommitContributions restrictedContributionsCount } } }', { l: USER, f: from, t: to });
    const cc = d.user.contributionsCollection;
    total += cc.totalCommitContributions + cc.restrictedContributionsCount;
  }
  return total;
}

async function ownRepos() {
  const repos = [];
  let after = null;
  do {
    const d = await gql(`query($l:String!,$a:String){ user(login:$l){ repositories(first:100, after:$a, ownerAffiliations:OWNER, isFork:false){
      pageInfo{ hasNextPage endCursor } nodes{ nameWithOwner isEmpty } } } }`, { l: USER, a: after });
    const r = d.user.repositories;
    repos.push(...r.nodes.filter(n => !n.isEmpty).map(n => n.nameWithOwner));
    after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
  } while (after);
  return repos;
}

const gitAuthEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
  GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${TOKEN}`).toString('base64')}`,
};

function countLines(repos) {
  const work = mkdtempSync(join(tmpdir(), 'loc-'));
  let total = 0, skipped = 0;
  for (const full of repos) {
    const dir = join(work, full.replace('/', '__'));
    try {
      const clone = env => execFileSync('git', ['clone', '--quiet', '--depth', '1', `https://github.com/${full}.git`, dir], { stdio: 'ignore', env });
      try { clone(gitAuthEnv); } catch { rmSync(dir, { recursive: true, force: true }); clone({ ...process.env, GIT_TERMINAL_PROMPT: '0' }); }
      const out = execFileSync('cloc', ['.', '--json', '--quiet', `--exclude-lang=${EXCLUDE_LANGS}`, `--exclude-dir=${EXCLUDE_DIRS}`, '--not-match-f=(package-lock|yarn\\.lock|pnpm-lock|\\.min\\.)'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const code = out.trim() ? JSON.parse(out).SUM?.code ?? 0 : 0;
      total += code;
    } catch (e) {
      skipped++;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  console.log(`repositories: ${repos.length}, skipped: ${skipped}`);
  return total;
}

async function contributionWeeks() {
  const d = await gql('query($l:String!){ user(login:$l){ contributionsCollection{ contributionCalendar{ weeks{ contributionDays{ contributionCount } } } } } }', { l: USER });
  return d.user.contributionsCollection.contributionCalendar.weeks.map(w => w.contributionDays.map(x => x.contributionCount));
}

const now = new Date();
const FULL_EVERY_HOURS = 24;
const cached = existsSync(STATS_FILE) ? JSON.parse(readFileSync(STATS_FILE, 'utf8')) : null;
const age = cached?.updatedAt ? (now - new Date(cached.updatedAt)) / 3600000 : Infinity;
const full = process.env.FORCE_FULL === 'true' || !cached?.heatmap || age >= FULL_EVERY_HOURS - 0.5;

let stats;
if (full) {
  stats = {
    commits: await totalCommits(),
    loc: countLines(await ownRepos()),
    heatmap: await contributionWeeks(),
    updatedAt: now.toISOString(),
  };
  console.log('full refresh — commits:', stats.commits, 'loc:', stats.loc);
} else {
  stats = cached;
  console.log(`sun refresh only (stats are ${age.toFixed(1)}h old)`);
}

const syncedAt = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
mkdirSync('data', { recursive: true });
mkdirSync('assets', { recursive: true });
writeFileSync(STATS_FILE, JSON.stringify(stats) + '\n');
writeFileSync(SVG_FILE, renderTerminal({ stats, heatmap: stats.heatmap, crt: true, syncedAt, world: 'map', since: 2022, idle: ['the world is just the beginning', 'earth was never the limit'], sunAt: now, home: { lat: -23.55, lon: -46.63, label: 'brasil / sp', time: now.toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) } }));
