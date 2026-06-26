import { LoaderCircle } from 'lucide-react';

interface AppSplashScreenProps {
  message?: string;
}

export function AppSplashScreen({ message = 'Ton suivi se prépare' }: AppSplashScreenProps) {
  return (
    <main
      className="grid min-h-screen place-items-center px-6 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="app-splash-screen"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative grid size-24 place-items-center rounded-[2rem] border border-brand-200/80 bg-white/90 shadow-lg shadow-brand-950/10 dark:border-brand-900 dark:bg-slate-900">
          <div className="absolute inset-2 rounded-[1.5rem] bg-brand-50 dark:bg-brand-950/60" />
          <img
            src="/favicon.svg"
            alt=""
            className="relative size-14 motion-safe:animate-[pulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
          />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-brand-300">
          SportPilot
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {message}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
          Préparation de tes données locales et de ton espace de suivi.
        </p>

        <LoaderCircle
          aria-hidden="true"
          className="mt-7 size-6 animate-spin text-brand-700 motion-reduce:animate-none dark:text-brand-300"
        />
      </div>
    </main>
  );
}
