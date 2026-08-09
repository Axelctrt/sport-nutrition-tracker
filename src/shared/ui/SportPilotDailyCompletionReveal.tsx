import { Activity, Check, Moon, Utensils } from 'lucide-react';
import { createPortal } from 'react-dom';

import '@/shared/ui/uxMotionPolish.css';
import { useModalReveal } from '@/shared/ui/useModalReveal';

interface SportPilotDailyCompletionRevealProps {
  onContinue: () => void;
}

const completedStages = [
  { label: 'Check-in', icon: Check },
  { label: 'Sport', icon: Activity },
  { label: 'Alimentation', icon: Utensils },
  { label: 'Check-out', icon: Moon },
] as const;

export function SportPilotDailyCompletionReveal({
  onContinue,
}: SportPilotDailyCompletionRevealProps) {
  const { backdropRef, dialogRef, initialFocusRef } = useModalReveal(onContinue);

  return createPortal(
    <div ref={backdropRef} className="sp-daily-completion-backdrop" role="presentation">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sportpilot-daily-completion-title"
        aria-describedby="sportpilot-daily-completion-description"
        tabIndex={-1}
        className="sp-daily-completion"
      >
        <div className="sp-daily-completion__halo" aria-hidden="true" />
        <div className="relative z-10">
          <span className="sp-daily-completion__icon" aria-hidden="true">
            <Check className="size-7" />
          </span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--sp-accent-primary)]">
            Objectif quotidien atteint
          </p>
          <h2
            id="sportpilot-daily-completion-title"
            className="mt-2 text-2xl font-extrabold text-[var(--sp-text-primary)]"
          >
            Journée complétée
          </h2>
          <p
            id="sportpilot-daily-completion-description"
            className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]"
          >
            Tes quatre repères du jour sont enregistrés. Ton suivi est complet et prêt pour les prochaines analyses.
          </p>

          <ul className="mt-5 grid grid-cols-2 gap-2" aria-label="Étapes de la journée complétées">
            {completedStages.map(({ label, icon: Icon }) => (
              <li key={label} className="sp-daily-completion__stage">
                <Icon aria-hidden="true" className="size-4" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <button
            ref={initialFocusRef}
            type="button"
            className="sp-button mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
            onClick={onContinue}
          >
            Continuer
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
