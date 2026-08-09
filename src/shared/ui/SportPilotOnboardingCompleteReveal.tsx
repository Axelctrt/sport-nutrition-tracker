import { Check, Compass, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/ui/Button';
import { useModalReveal } from '@/shared/ui/useModalReveal';

interface SportPilotOnboardingCompleteRevealProps {
  onContinue: () => void;
}

export function SportPilotOnboardingCompleteReveal({
  onContinue,
}: SportPilotOnboardingCompleteRevealProps) {
  const { backdropRef, dialogRef, initialFocusRef } = useModalReveal(onContinue);

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <section
        ref={dialogRef}
        aria-labelledby="onboarding-complete-title"
        aria-describedby="onboarding-complete-description"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl motion-safe:animate-[sp-onboarding-step-enter_300ms_var(--sp-ease-enter)_both] dark:border-slate-700 dark:bg-slate-900/95 sm:p-7"
        role="dialog"
        tabIndex={-1}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-400/20 to-transparent" />
        <div className="relative text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-[0_18px_45px_-18px_rgba(13,148,136,0.8)]">
            <Compass className="size-8" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Configuration terminée
          </p>
          <h2 id="onboarding-complete-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Tout est prêt
          </h2>
          <p id="onboarding-complete-description" className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ton profil, tes premières cibles et ton espace de données sont prêts. Tu peux maintenant découvrir ton tableau de bord.
          </p>
        </div>

        <ul className="relative mt-6 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
          <li className="flex items-center gap-2.5"><Check className="size-4 text-emerald-600" /> Profil enregistré</li>
          <li className="flex items-center gap-2.5"><Check className="size-4 text-emerald-600" /> Cibles initiales calculées</li>
          <li className="flex items-center gap-2.5"><Sparkles className="size-4 text-brand-600" /> Accueil personnalisé disponible</li>
        </ul>

        <Button ref={initialFocusRef} className="relative mt-5 w-full" size="lg" onClick={onContinue}>
          Découvrir mon accueil
        </Button>
      </section>
    </div>,
    document.body,
  );
}
