import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const failures = [];
const limits = {
  largestJavaScriptBytes: 560 * 1024,
  totalJavaScriptBytes: 2 * 1024 * 1024,
  totalCssBytes: 100 * 1024,
};

function fail(message) {
  failures.push(message);
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+-rc\.\d+$/.test(packageJson.version)) {
  fail(`la version ${String(packageJson.version)} n’est pas une Release Candidate.`);
}

const files = collectFiles(dist);
const relativeFiles = files.map((path) => relative(dist, path).replaceAll('\\', '/'));
const javascriptFiles = files.filter((path) => extname(path) === '.js');
const cssFiles = files.filter((path) => extname(path) === '.css');
const sourceMaps = relativeFiles.filter((path) => path.endsWith('.map'));

if (sourceMaps.length > 0) {
  fail(`des source maps de production sont présentes : ${sourceMaps.join(', ')}.`);
}

const javascriptSizes = javascriptFiles.map((path) => ({
  path: relative(dist, path).replaceAll('\\', '/'),
  bytes: statSync(path).size,
}));
const largestJavaScript = javascriptSizes.reduce(
  (largest, current) => current.bytes > largest.bytes ? current : largest,
  { path: 'aucun', bytes: 0 },
);
const totalJavaScriptBytes = javascriptSizes.reduce((total, file) => total + file.bytes, 0);
const totalCssBytes = cssFiles.reduce((total, path) => total + statSync(path).size, 0);

if (largestJavaScript.bytes > limits.largestJavaScriptBytes) {
  fail(`le chunk ${largestJavaScript.path} dépasse 560 Kio (${largestJavaScript.bytes} octets).`);
}
if (totalJavaScriptBytes > limits.totalJavaScriptBytes) {
  fail(`le JavaScript total dépasse 2 Mio (${totalJavaScriptBytes} octets).`);
}
if (totalCssBytes > limits.totalCssBytes) {
  fail(`le CSS total dépasse 100 Kio (${totalCssBytes} octets).`);
}

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
if (!/assets\/index-[A-Za-z0-9_-]+\.js/.test(indexHtml)) {
  fail('index.html ne référence pas un bundle JavaScript versionné par hash.');
}
if (!/assets\/index-[A-Za-z0-9_-]+\.css/.test(indexHtml)) {
  fail('index.html ne référence pas une feuille de style versionnée par hash.');
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
const shortcutUrls = (manifest.shortcuts ?? []).map((shortcut) => shortcut.url);
const expectedShortcutUrls = [
  './#/food/select',
  './#/activities/add',
  './#/strength/sessions',
  './#/weight',
];
if (new Set(shortcutUrls).size !== shortcutUrls.length) {
  fail('le manifeste PWA contient des raccourcis dupliqués.');
}
for (const expectedUrl of expectedShortcutUrls) {
  if (!shortcutUrls.includes(expectedUrl)) {
    fail(`le raccourci PWA ${expectedUrl} est absent.`);
  }
}
if (manifest.id !== './' || manifest.start_url !== './' || manifest.scope !== './') {
  fail('les chemins id/start_url/scope du manifeste ne sont pas relatifs et cohérents.');
}

if (failures.length > 0) {
  console.error('\nAudit Release Candidate échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Audit Release Candidate réussi : ${javascriptFiles.length} chunks JS, `
    + `${Math.round(totalJavaScriptBytes / 1024)} Kio de JS, `
    + `${Math.round(totalCssBytes / 1024)} Kio de CSS, `
    + `plus gros chunk ${Math.round(largestJavaScript.bytes / 1024)} Kio.`,
  );
}
