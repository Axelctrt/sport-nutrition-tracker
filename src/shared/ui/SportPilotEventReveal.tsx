import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface SportPilotEventRevealProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: readonly { label: string; value: string }[];
  primaryLabel?: string;
  onPrimary?: () => void;
  onContinue: () => void;
}

export function SportPilotEventReveal({
  eyebrow,
  title,
  description,
  metrics = [],
  primaryLabel,
  onPrimary,
  onContinue,
}: SportPilotEventRevealProps) {
  return (
    <div className="fixed inset-0 z-[92] grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <section
        aria-labelledby="event-reveal-title"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_-34px_rgba(15,23,42,0.78)] backdrop-blur-xl motion-safe:animate-[sp-onboarding-step-enter_280ms_var(--sp-ease-enter)_both] dark:border-slate-700 dark:bg-slate-900/95 sm:p-7"
        role="dialog"
      >
        <div aria-hidden="true" className="absolute -right-12 -top-12 size-40 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-lg shadow-brand-600/20">
            <Sparkles className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">{eyebrow}</p>
            <h2 id="event-reveal-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
        </div>

        {metrics.length > 0 ? (
          <dl className="relative mt-5 grid gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{metric.label}</dt>
                <dd className="mt-1 flex items-center gap-2 font-black text-slate-950 dark:text-white">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="relative mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onContinue}>Continuer</Button>
          {primaryLabel && onPrimary ? (
            <Button onClick={onPrimary}>
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
