#!/usr/bin/env node
/**
 * Docs guard for /docs (Project OPS v1.0).
 * Zero dependencies. Run locally: `npm run check:docs` or `node scripts/docs-check.mjs`.
 *
 * Checks:
 *  1. No secret / credential materials tracked in docs.
 *  2. Active docs use v1.0 naming (no inherited version suffix) and v1.0 markers.
 *  3. Every relative markdown link / inline path reference resolves to a real file.
 *  4. All JSON files under docs parse cleanly.
 *
 * Exemptions (intentional, documented in docs/README.md section 6):
 *  - `docs/06-reference/archive/**` keeps original names + content as snapshots.
 *  - The provenance table in `docs/README.md` deliberately names old files.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const ARCHIVE = path.join(DOCS, '06-reference', 'archive');
const DOC_EXT = new Set(['.md', '.json', '.yaml', '.yml', '.sql', '.csv', '.txt', '.py', '.png']);
const TEXT_EXT = new Set(['.md', '.json', '.yaml', '.yml', '.csv', '.txt', '.py', '.sql', '.mjs']);
const VERSION_SUFFIX = /(^|[_.\-/])v1[_.][0-9]/i;

const errors = [];
const fail = (kind, file, line, message) => {
  errors.push({ kind, file: toRel(file), line, message });
};
const toRel = (p) => path.relative(ROOT, p).replaceAll(path.sep, '/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const allFiles = walk(DOCS);
if (allFiles.length === 0) {
  console.error(`docs-check: ${toRel(DOCS)} not found or empty`);
  process.exit(1);
}
const isArchive = (f) => f.startsWith(ARCHIVE + path.sep);
const textFiles = allFiles.filter((f) => TEXT_EXT.has(path.extname(f).toLowerCase()));
const basenames = new Set(allFiles.map((f) => path.basename(f)));

// --- 1. secrets -------------------------------------------------------------
const SECRET_PATTERNS = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['OpenAI key', /sk-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /ghp_[A-Za-z0-9]{20,}/],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{20,}/],
  ['GitLab token', /glpat-[A-Za-z0-9_-]{20,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['PEM private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential in URL', /[a-z][a-z0-9+.-]*:\/\/[^/\s:]+:[^/\s@]+@/i],
]
// Credential-in-URL regex chỉ áp dụng khi value KHÔNG phải placeholder <...>.
const isPlaceholderLine = (line) => /:\/\/[^/\s:]+:<[^>]+>@/.test(line);
for (const file of allFiles) {
  if (path.basename(file).startsWith('.env')) {
    fail('secret', file, 0, 'env file tracked in docs');
    continue;
  }
  if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [label, re] of SECRET_PATTERNS) {
      if (label === 'credential in URL' && isPlaceholderLine(line)) continue
      if (re.test(line)) fail('secret', file, i + 1, `possible ${label}`)
    }
  });
}

// --- 2. version consistency -------------------------------------------------
for (const file of allFiles) {
  if (isArchive(file)) continue; // snapshots intentionally keep original names
  if (VERSION_SUFFIX.test(path.basename(file))) {
    fail('version', file, 0, 'active file name carries an inherited version suffix');
  }
}
for (const file of textFiles) {
  if (isArchive(file) || path.extname(file).toLowerCase() !== '.md') continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const rel = toRel(file);
    // Provenance table + "source bundle v1.5" notes intentionally name old versions.
    if (/\barchive\//i.test(line) || /provenance|nguồn gốc|bản cũ|snapshot/i.test(line)) return;
    if (/^\s*\|/.test(line) || /bundle|zip/i.test(line)) return;
    const hits = [...line.matchAll(/v1[._][0-9]+/gi)]
      .map((m) => m[0])
      .filter((v) => v.toLowerCase() !== 'v1.0' && v.toLowerCase() !== 'v1_0');
    if (hits.length === 0) return;
    // Provenance table in the entrypoint deliberately lists old file names.
    if (toRel(file) === 'docs/README.md' && /^\s*\|/.test(line)) return;
    fail('version', file, i + 1, `stale version marker(s): ${[...new Set(hits)].join(', ')}`);
  });
}

// --- 3. relative links + inline path references ----------------------------
function resolveCandidate(fromFile, raw) {
  let token = raw.trim().replace(/^<|>$/g, '').split('#')[0].split('?')[0].trim();
  if (!token || /^(https?:|mailto:|data:|\/\/)/i.test(token)) return null;
  if (token.endsWith('/')) return true; // directory link
  const ext = path.extname(token).toLowerCase();
  if (!DOC_EXT.has(ext)) return null;

  const tries = [];
  if (token.startsWith('/')) tries.push(path.join(DOCS, token.replace(/^\/+/, '')));
  else {
    tries.push(path.resolve(path.dirname(fromFile), token));
    tries.push(path.resolve(DOCS, token)); // root-relative style from entrypoint
  }
  for (const t of tries) {
    if (existsSync(t) && (statSync(t).isFile() || statSync(t).isDirectory())) return true;
  }

  // Bare filename written without a directory: accept if the basename exists anywhere in docs.
  if (!token.includes('/') && basenames.has(path.basename(token))) return true;
  return false;
}

for (const file of textFiles) {
  if (isArchive(file)) continue; // archive keeps self-references to old names
  const ext = path.extname(file).toLowerCase();
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (ext === '.md') {
    // Strip fenced code blocks before scanning links (paths there are shell commands).
    let inFence = false;
    const proseLines = lines.map((line) => {
      if (/^\s*```/.test(line)) { inFence = !inFence; return ''; }
      return inFence ? '' : line;
    });
    proseLines.forEach((line, i) => {
      const rel = toRel(file);
      // Provenance table left column deliberately lists original file names.
      if (rel === 'docs/README.md' && /^\s*\| `?[^`|]+\.([a-z]+)`? \|/.test(line)) return;
      for (const m of line.matchAll(/\]\(([^)]+)\)/g)) {
        if (!resolveCandidate(file, m[1])) {
          fail('link', file, i + 1, `dangling markdown link: ${m[1]}`);
        }
      }
      for (const m of line.matchAll(/`([^`]+)`/g)) {
        const token = m[1].trim();
        if (!DOC_EXT.has(path.extname(token).toLowerCase())) continue;
        if (!token.includes('/') && !token.includes('.')) continue;
        if (!resolveCandidate(file, token)) {
          fail('link', file, i + 1, `dangling inline path: ${token}`);
        }
      }
    });
  }
}

// --- 4. JSON validity -------------------------------------------------------
for (const file of allFiles) {
  if (path.extname(file).toLowerCase() !== '.json') continue;
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    fail('json', file, 0, `invalid JSON: ${e.message}`);
  }
}

// --- report -----------------------------------------------------------------
if (errors.length) {
  console.error(`docs-check: FAILED with ${errors.length} issue(s)\n`);
  const byKind = new Map();
  for (const e of errors) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind).push(e);
  }
  for (const [kind, list] of byKind) {
    console.error(`[${kind}] ${list.length}`);
    for (const e of list) {
      console.error(`  ${e.file}${e.line ? ':' + e.line : ''} — ${e.message}`);
    }
  }
  process.exit(1);
}

console.log(`docs-check: OK — ${allFiles.length} files, 0 secrets, 0 stale versions, 0 dangling links, JSON valid.`);
