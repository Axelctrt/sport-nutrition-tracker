import {
  ArrowLeft,
  Camera,
  Database,
  Download,
  LockKeyhole,
  RefreshCw,
  ServerOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const localDataItems = [
  'Le profil, le poids, les pas, les activités, les repas et les séances sont enregistrés dans IndexedDB sur cet appareil.',
  'SportPilot ne nécessite ni compte, ni backend, ni synchronisation vers un serveur SportPilot.',
  'SportPilot n’intègre pas de publicité, de suivi publicitaire ni d’outil d’analyse d’audience.',
] as const;

const externalRequestItems = [
  'Une recherche alimentaire transmet uniquement le terme recherché à Open Food Facts.',
  'Une recherche par code-barres transmet le code détecté ou saisi à Open Food Facts.',
  'Les requêtes indiquent le nom, la version et la plateforme de SportPilot, mais pas le profil, le poids, les repas ou les séances.',
  'Comme pour toute requête web, Open Food Facts et les intermédiaires réseau peuvent recevoir des informations techniques telles que l’adresse IP ou le navigateur.',
] as const;

const controlItems = [
  'Les sauvegardes JSON et les exports CSV sont téléchargés comme fichiers sur l’appareil choisi par l’utilisateur.',
  'Une restauration affiche une prévisualisation et demande une confirmation avant de remplacer les données locales.',
  'La page Sauvegarde permet d’effacer les données SportPilot. La suppression des données du site dans le navigateur produit le même effet.',
  'Un diagnostic technique contient des versions, des capacités et des compteurs, sans détail des données personnelles.',
] as const;

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-300"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrivacyPage() {
  const { profile } = useProfile();

  useEffect(() => {
    document.title = 'Confidentialité · SportPilot';
  }, []);
  const returnPath = profile ? routePaths.settings : routePaths.onboarding;
  const returnLabel = profile ? 'Retour aux paramètres' : 'Retour à la création du profil';

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          to={returnPath}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {returnLabel}
        </Link>

        <header className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Transparence et contrôle local
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Confidentialité
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            Cette page décrit précisément où vont les données, quand une connexion externe est utilisée et comment supprimer ou sauvegarder les informations de SportPilot.
          </p>
        </header>

        <InlineNotice className="mt-6" title="Principe principal">
          Les données de suivi restent localement sur l’appareil. Une connexion externe est utilisée uniquement pour rechercher volontairement un produit dans Open Food Facts ou télécharger une mise à jour de la PWA.
        </InlineNotice>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <Database aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Données conservées localement
                </h2>
                <BulletList items={localDataItems} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <ServerOff aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Open Food Facts
                </h2>
                <BulletList items={externalRequestItems} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <Camera aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Caméra et scanner
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  La caméra démarre uniquement après une action explicite et avec l’autorisation du navigateur. Les images sont analysées dans le navigateur : elles ne sont ni enregistrées ni envoyées à SportPilot ou à Open Food Facts. Seul le code-barres détecté peut être transmis lors d’une recherche de produit.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <Download aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Sauvegarde, diagnostic et suppression
                </h2>
                <BulletList items={controlItems} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-4 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">Sécurité du navigateur</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  La version publiée utilise HTTPS et des en-têtes limitant les scripts, les intégrations et les permissions. Le stockage local n’est toutefois pas un coffre chiffré : une personne ayant accès au navigateur ou à l’appareil peut potentiellement consulter les données.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">Durée de conservation</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Les données restent présentes jusqu’à leur suppression depuis SportPilot, depuis les réglages du navigateur ou lors de la suppression des données de l’application installée.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <InlineNotice className="mt-4" title="Limites des estimations">
          Les calories, objectifs, allures, volumes et suggestions de progression sont des estimations d’aide au suivi. SportPilot ne remplace pas un médecin, un diététicien, un kinésithérapeute ou un entraîneur qualifié.
        </InlineNotice>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={routePaths.backup}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Sauvegarder ou supprimer mes données
          </Link>
          <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Politique intégrée à SportPilot {__APP_VERSION__}
          </p>
        </div>
      </div>
    </main>
  );
}
