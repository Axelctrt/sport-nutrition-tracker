import { ShieldCheck } from 'lucide-react';

import { Card } from '@/shared/ui/Card';

export function SyncPrototypeSafeguardsCard() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Garde-fous actifs</h2>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li>Base IndexedDB distincte de la base réelle.</li>
            <li>Aucune donnée SportPilot importée automatiquement.</li>
            <li>Les vraies pesées exigent un flag distinct et une confirmation.</li>
            <li>Route de gestion toujours accessible, avec erreur locale si la configuration est indisponible.</li>
            <li>Jetons et clés Dexie Cloud non exposés à l’interface.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
