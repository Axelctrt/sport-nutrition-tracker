import { Moon, RotateCcw, Sparkles, Sun, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getVisualThemeDefinition,
  visualThemeCatalog,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import { SportPilotBadgeReveal } from "@/shared/ui/SportPilotBadgeReveal";
import { SportPilotMultiStepLoader } from "@/shared/ui/SportPilotMultiStepLoader";
import {
  type SportPilotButtonState,
  SportPilotStatefulButton,
} from "@/shared/ui/SportPilotStatefulButton";
import { SportPilotUnlockReveal } from "@/shared/ui/SportPilotUnlockReveal";

const loaderSteps = [
  { id: "prepare", label: "Préparation de la photo" },
  { id: "analyse", label: "Analyse du repas" },
  { id: "estimate", label: "Création de l’estimation" },
] as const;

const buttonStates: SportPilotButtonState[] = [
  "idle",
  "pressed",
  "loading",
  "success",
  "error",
];

export function VisualLabPage() {
  const initialTheme = useRef(
    document.documentElement.dataset.sportTheme ?? "core",
  );
  const initialDark = useRef(document.documentElement.classList.contains("dark"));
  const [themeId, setThemeId] = useState<VisualThemeId>("core");
  const [buttonState, setButtonState] = useState<SportPilotButtonState>("idle");
  const [loaderStep, setLoaderStep] = useState(1);
  const [themeRevealId, setThemeRevealId] = useState<VisualThemeId>();
  const [badgeReveal, setBadgeReveal] = useState(false);
  const [dark, setDark] = useState(initialDark.current);

  useEffect(() => {
    document.documentElement.dataset.sportTheme = themeId;
  }, [themeId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => () => {
    document.documentElement.dataset.sportTheme = initialTheme.current;
    document.documentElement.classList.toggle("dark", initialDark.current);
  }, []);

  const reset = () => {
    setThemeId("core");
    setButtonState("idle");
    setLoaderStep(1);
    setThemeRevealId(undefined);
    setBadgeReveal(false);
    setDark(initialDark.current);
  };

  const revealTheme = themeRevealId
    ? getVisualThemeDefinition(themeRevealId)
    : undefined;

  return (
    <main className="min-h-dvh bg-[var(--sp-bg-primary)] px-4 py-6 text-[var(--sp-text-primary)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-[var(--sp-border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--sp-accent-primary)]">
              Preview et développement uniquement
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Laboratoire visuel SportPilot</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-text-secondary)]">
              Teste les thèmes, les célébrations et les états animés sans modifier les données utilisateur ni les déblocages.
            </p>
          </div>
          <button
            type="button"
            className="sp-button sp-button--secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Réinitialiser
          </button>
        </header>

        <section className="mt-6" aria-labelledby="lab-themes-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="lab-themes-title" className="text-xl font-bold">Thèmes appliqués</h2>
              <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                Le changement est temporaire et n’est jamais enregistré.
              </p>
            </div>
            <button
              type="button"
              className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
              {dark ? "Tester en clair" : "Tester en sombre"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {visualThemeCatalog.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={themeId === theme.id}
                className="sp-card sp-card--interactive min-h-24 p-4 text-left"
                onClick={() => setThemeId(theme.id)}
              >
                <span className="text-xs font-bold uppercase text-[var(--sp-text-muted)]">{theme.rarity}</span>
                <strong className="mt-2 block">{theme.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="États interactifs">
          <article className="sp-card p-5">
            <h2 className="text-lg font-bold">Bouton stateful</h2>
            <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
              Sélectionne un état pour vérifier la transition, le libellé et l’icône.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {buttonStates.map((state) => (
                <button
                  key={state}
                  type="button"
                  className="sp-button sp-button--secondary min-h-10 rounded-[var(--sp-radius-control)] px-3 text-xs font-bold"
                  onClick={() => setButtonState(state)}
                >
                  {state}
                </button>
              ))}
            </div>
            <SportPilotStatefulButton
              fullWidth
              className="mt-5"
              state={buttonState}
              idleLabel="Analyser avec l’IA"
              loadingLabel="Analyse en cours…"
              successLabel="Analyse terminée"
              errorLabel="Réessayer"
            />
          </article>

          <article className="sp-card p-5">
            <h2 className="text-lg font-bold">Loader multi-étapes</h2>
            <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
              Les étapes correspondent à des états honnêtes, sans faux pourcentage.
            </p>
            <SportPilotMultiStepLoader
              steps={loaderSteps}
              activeStep={loaderStep}
              className="mt-5"
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="sp-button sp-button--secondary min-h-11 flex-1 rounded-[var(--sp-radius-control)] px-3 text-sm font-bold"
                onClick={() => setLoaderStep((step) => Math.max(0, step - 1))}
              >
                Étape précédente
              </button>
              <button
                type="button"
                className="sp-button min-h-11 flex-1 rounded-[var(--sp-radius-control)] px-3 text-sm font-bold"
                onClick={() => setLoaderStep((step) => Math.min(loaderSteps.length, step + 1))}
              >
                Étape suivante
              </button>
            </div>
          </article>
        </section>

        <section className="mt-8" aria-labelledby="lab-reveals-title">
          <h2 id="lab-reveals-title" className="text-xl font-bold">Célébrations</h2>
          <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
            Les actions ferment uniquement la démonstration et n’appliquent aucun thème.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visualThemeCatalog.filter(({ id }) => id !== "core").map((theme) => (
              <button
                key={theme.id}
                type="button"
                className="sp-card sp-card--interactive flex min-h-16 items-center gap-3 p-4 text-left"
                onClick={() => setThemeRevealId(theme.id)}
              >
                <Sparkles aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
                <span>
                  <strong className="block">Reveal {theme.name}</strong>
                  <span className="text-xs text-[var(--sp-text-muted)]">{theme.rarity}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="sp-card sp-card--interactive flex min-h-16 items-center gap-3 p-4 text-left"
              onClick={() => setBadgeReveal(true)}
            >
              <Trophy aria-hidden="true" className="size-5 text-[var(--sp-success)]" />
              <span>
                <strong className="block">Reveal de badge</strong>
                <span className="text-xs text-[var(--sp-text-muted)]">Célébration compacte</span>
              </span>
            </button>
          </div>
        </section>

        <aside className="mt-8 rounded-[var(--sp-radius-card)] border border-[var(--sp-warning)] bg-[color-mix(in_srgb,var(--sp-warning)_8%,var(--sp-surface-card))] p-4 text-sm leading-6 text-[var(--sp-text-secondary)]">
          <strong className="text-[var(--sp-text-primary)]">Aucune donnée n’est modifiée.</strong> Cette page manipule uniquement des états visuels temporaires du navigateur.
        </aside>
      </div>

      {revealTheme ? (
        <SportPilotUnlockReveal
          theme={revealTheme}
          onTry={() => setThemeRevealId(undefined)}
          onKeepCurrent={() => setThemeRevealId(undefined)}
        />
      ) : null}
      {badgeReveal ? (
        <SportPilotBadgeReveal
          name="Première séance"
          description="Ta progression commence ici. Continue à construire une routine qui te ressemble."
          onContinue={() => setBadgeReveal(false)}
          onViewRewards={() => setBadgeReveal(false)}
        />
      ) : null}
    </main>
  );
}
