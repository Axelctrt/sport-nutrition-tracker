import dns from 'node:dns';
import { lookup } from 'node:dns/promises';

dns.setDefaultResultOrder('ipv4first');

const targets = [
  {
    name: 'API produit',
    host: 'world.openfoodfacts.org',
    url: 'https://world.openfoodfacts.org/api/v3.6/product/3017620422003.json?fields=code,product_name',
  },
  {
    name: 'Recherche Search-a-licious',
    host: 'search.openfoodfacts.org',
    url: 'https://search.openfoodfacts.org/search?q=yaourt&langs=fr,en&page_size=2&page=1',
    inspectSearch: true,
  },
  {
    name: 'Recherche historique',
    host: 'world.openfoodfacts.org',
    url: 'https://world.openfoodfacts.org/cgi/search.pl?action=process&search_simple=1&json=1&page_size=1&page=1&search_terms=yaourt&fields=code,product_name',
  },
];

function errorDetails(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause && typeof cause === 'object') {
    const code = 'code' in cause ? String(cause.code) : 'sans code';
    const message = 'message' in cause ? String(cause.message) : String(cause);
    return `${error.message} — ${code}: ${message}`;
  }
  return error.message;
}

for (const target of targets) {
  console.log(`\n=== ${target.name} ===`);

  try {
    const addresses = await lookup(target.host, { all: true });
    console.log('DNS:', addresses.map(({ address, family }) => `${address} (IPv${family})`).join(', '));
  } catch (error) {
    console.error('DNS ECHEC:', errorDetails(error));
    continue;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(target.url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SportPilot/0.8.4 diagnostic',
      },
      signal: controller.signal,
    });
    console.log(`HTTP: ${response.status} ${response.statusText}`);
    console.log('Content-Type:', response.headers.get('content-type') ?? 'non renseigné');

    if (target.inspectSearch && response.ok) {
      const data = await response.json();
      const hits = Array.isArray(data?.hits) ? data.hits : [];
      console.log('Résultats annoncés:', data?.count ?? 'non renseigné');
      console.log('Résultats reçus:', hits.length);
      console.log(
        'Clés du premier résultat:',
        hits[0] && typeof hits[0] === 'object' ? Object.keys(hits[0]).join(', ') : 'aucun résultat',
      );
    }
  } catch (error) {
    console.error('HTTP ECHEC:', errorDetails(error));
  } finally {
    clearTimeout(timeout);
  }
}
