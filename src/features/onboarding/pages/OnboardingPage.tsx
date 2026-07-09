import { Dumbbell, LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingFlow';
import {
  clearProfileOnboardingDraft,
  loadProfileOnboardingDraft,
  PROFILE_ONBOARDING_STEP_ID,
  saveProfileOnboardingDraft,
} from '@/features/onboarding/storage/profileOnboardingDraft';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import { profileFormValuesToEntity } from '@/features/profile/utils/profileForm';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SaveStatus, type SaveStatusValue } from '@/shared/ui/SaveStatus';

const onboardingSteps = [{ id: PROFILE_ONBOARDING_STEP_ID }] as const;

interface InitialOnboardingState {
  initialValues: ProfileFormValues;
  restored: boolean;
  restoredStepId?: string;
  saveStatus: SaveStatusValue;
}

function getInitialOnboardingState(): InitialOnboardingState {
  const result = loadProfileOnboardingDraft();

  if (result.status === 'restored') {
    return {
      initialValues: result.draft.values,
      restored: true,
      restoredStepId: result.draft.stepId,
      saveStatus: 'saved',
    };
  }

  return {
    initialValues: DEFAULT_PROFILE_FORM_VALUES,
    restored: false,
    saveStatus: result.status === 'unavailable' ? 'error' : 'idle',
  };
}

export function OnboardingPage() {
  const actionToast = useActionToast();
  const navigate = useNavigate();
  const { saveProfile } = useProfile();
  const [initialState] = useState(getInitialOnboardingState);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [draftStatus, setDraftStatus] = useState<SaveStatusValue>(initialState.saveStatus);
  const flow = useOnboardingFlow({
    steps: onboardingSteps,
    restoredStepId: initialState.restoredStepId,
  });

  const handleValuesChange = useCallback((values: ProfileFormValues) => {
    setDraftStatus('saving');
    setDraftStatus(saveProfileOnboardingDraft(values) ? 'saved' : 'error');
  }, []);

  const handleSubmit = async (values: ProfileFormValues) => {
    setSaveError(undefined);

    await flow.runSubmission(async () => {
      try {
        await saveProfile(profileFormValuesToEntity(values));
        clearProfileOnboardingDraft();
        actionToast.success({
          key: 'onboarding-profile-create',
          title: 'Profil créé',
          description: 'SportPilot est prêt à suivre tes données.',
        });
        navigate(routePaths.dashboard, { replace: true });
      } catch (error) {
        const fallback = 'Le profil n’a pas pu être enregistré sur cet appareil.';
        setSaveError(
          error instanceof Error
            ? error.message
            : fallback,
        );
        actionToast.error({
          key: 'onboarding-profile-create',
          error,
          fallback,
        });
      }
    });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.4fr] lg:items-start">
        <Card className="overflow-hidden lg:sticky lg:top-10">
          <div className="bg-brand-700 p-6 text-white sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
              <Dumbbell aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-100">
              Bienvenue dans SportPilot
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Configure ton suivi en quelques minutes.
            </h1>
            <p className="mt-4 leading-7 text-brand-50">
              Ces informations serviront aux futurs calculs énergétiques, nutritionnels et sportifs.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">Données locales</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Le profil reste dans IndexedDB sur cet appareil. Aucun compte et aucun serveur ne sont utilisés.
                </p>
                <Link
                  to={routePaths.privacy}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  Lire la politique de confidentialité
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <section aria-labelledby="onboarding-profile-title" className="min-w-0">
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Profil local
              </p>
              <h2
                ref={flow.headingRef}
                id="onboarding-profile-title"
                tabIndex={-1}
                className="mt-1 text-2xl font-bold tracking-tight text-slate-950 outline-none dark:text-white"
              >
                Créer le profil local
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Tous les paramètres pourront être modifiés ensuite depuis la page Profil.
              </p>
            </div>

            <div className="flex items-end gap-4">
              <OnboardingProgress
                currentStep={flow.progress.currentPosition}
                totalSteps={flow.progress.totalSteps}
                className="min-w-0 flex-1"
              />
              <SaveStatus status={draftStatus} className="mb-0.5 shrink-0" />
            </div>
          </div>

          {initialState.restored ? (
            <InlineNotice tone="success" title="Configuration reprise" className="mb-6">
              Les réponses enregistrées sur cet appareil ont été restaurées automatiquement.
            </InlineNotice>
          ) : null}

          {draftStatus === 'error' ? (
            <InlineNotice tone="warning" title="Brouillon local indisponible" className="mb-6">
              Tu peux continuer, mais les réponses ne pourront pas être reprises après la fermeture de l’application.
            </InlineNotice>
          ) : null}

          {saveError ? (
            <InlineNotice tone="error" title="Enregistrement impossible" className="mb-6">
              {saveError}
            </InlineNotice>
          ) : null}

          <ProfileForm
            initialValues={initialState.initialValues}
            submitLabel="Créer mon profil"
            onSubmit={handleSubmit}
            onValuesChange={handleValuesChange}
          />
        </section>
      </div>
    </main>
  );
}
