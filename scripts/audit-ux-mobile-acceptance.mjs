import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function requireText(path, pattern, message) {
  const content = read(path);
  if (!pattern.test(content)) failures.push(`${path}: ${message}`);
}

requireText('index.html', /<html\s+lang="fr"/, 'la langue française doit être déclarée');
requireText('index.html', /viewport-fit=cover/, 'viewport-fit=cover est requis pour les zones sûres iOS');
requireText('src/styles/index.css', /:focus-visible/, 'un focus visible global est requis');
requireText('src/styles/index.css', /prefers-reduced-motion:\s*reduce/, 'la réduction des animations doit être prise en charge');
requireText('src/styles/index.css', /env\(safe-area-inset-bottom\)/, 'les zones sûres iOS doivent être prises en charge');
requireText('src/app/layouts/AppLayout.tsx', /href="#main-content"/, 'le lien d’évitement doit cibler le contenu principal');
requireText('src/app/layouts/AppLayout.tsx', /<main[\s\S]*id="main-content"[\s\S]*tabIndex=\{-1\}/, 'le contenu principal doit être ciblable par le lien d’évitement');
requireText('src/app/layouts/PageHeader.tsx', /size-\[var\(--sp-touch-target\)\]/, 'les actions de l’en-tête doivent atteindre 44 px');
requireText('src/app/layouts/MobileAppMenu.tsx', /size-\[var\(--sp-touch-target\)\]/, 'le bouton du menu mobile doit atteindre 44 px');
requireText('src/shared/ui/ThemeToggle.tsx', /size-\[var\(--sp-touch-target\)\]/, 'le bouton de thème doit atteindre 44 px');
requireText('src/shared/ui/ConfirmationDialog.tsx', /useId\(/, 'les identifiants ARIA des confirmations doivent être uniques');
requireText('e2e/ux-mobile-acceptance.spec.ts', /expectPageAccessibilityBaseline/, 'la recette E2E doit exécuter le socle accessibilité');
requireText('e2e/ux-mobile-acceptance.spec.ts', /reducedMotion:\s*'reduce'/, 'la recette E2E doit contrôler la réduction des animations');
requireText('e2e/helpers/app.ts', /identifiant dupliqué/, 'le contrôle des identifiants dupliqués est requis');
requireText('e2e/helpers/app.ts', /action sans nom accessible/, 'le contrôle des actions sans nom est requis');
requireText('e2e/helpers/app.ts', /champ sans libellé accessible/, 'le contrôle des champs sans libellé est requis');
requireText('package.json', /"test:e2e:acceptance"/, 'le script de recette E2E doit être exposé');

if (failures.length > 0) {
  console.error('Audit UX mobile/accessibilité en échec :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit UX mobile/accessibilité réussi.');
console.log('Contrôles : langue, viewport iOS, focus, mouvement réduit, zones sûres, cibles tactiles, ARIA et recette E2E.');
