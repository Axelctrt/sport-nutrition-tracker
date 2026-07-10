import { ArrowLeft, ArrowRight, Cloud, CloudOff, Dumbbell, LockKeyhole, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import { completeProfileOnboarding } from '@/application/onboarding/completeProfileOnboarding';
import { routePaths } from '@/app/routePaths';
import { OnboardingAccountChoice } from '@/features/onboarding/components/OnboardingAccountChoice';
import { OnboardingProfileStep } from '@/features/onboarding/components/OnboardingProfileStep';
import { OnboardingProfileSummary } from '@/features/onboarding/components/OnboardingProfileSummary';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingFlow';
import {
  PROFILE_ONBOARDING_STEPS,
  PROFILE_ONBOARDING_STEP_COPY,
  PROFILE_ONBOARDING_STEP_IDS,
  isProfileOnboardingStepId,
  validateCompleteProfileOnboarding,
  validateProfileOnboardingStep,
  type ProfileOnboardingErrors,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import { saveProfileOnboardingCompletion } from '@/features/onboarding/storage/onboardingCompletionStorage';
import {
  clearProfileOnboardingDraft,
  loadProfileOnboardingDraft,
  STORAGE_ONBOARDING_STEP_ID,
  saveProfileOnboardingDraft,
} from '@/features/onboarding/storage/profileOnboardingDraft';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import { profileFormValuesToEntity } from '@/features/profile/utils/profileForm';
import { formatSocialHandle } from '@/domain/friends/socialIdentity';
import { activateGuestDataSpace } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { appDatabase, activeDataSpace } from '@/infrastructure/database/database';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { SaveStatus, type SaveStatusValue } from '@/shared/ui/SaveStatus';
import { StickyActionBar } from '@/shared/ui/StickyActionBar';

const onboardingSteps = [
  { id: STORAGE_ONBOARDING_STEP_ID },
  ...PROFILE_ONBOARDING_STEPS,
] as const;

type OnboardingStepId = typeof onboardingSteps[number]['id'];

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

function focusFirstInvalidField() {
  window.requestAnimationFrame(() => {
    const invalidField = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalidField?.focus();
    invalidField?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });
}

function profileStepBefore(stepId: ProfileOnboardingStepId): ProfileOnboardingStepId | undefined {
  const index = PROFILE_ONBOARDING_STEPS.findIndex((step) => step.id === stepId);
  return index > 0 ? PROFILE_ONBOARDING_STEPS[index - 1]?.id : undefined;
}

function profileStepAfter(stepId: ProfileOnboardingStepId): ProfileOnboardingStepId | undefined {
  const index = PROFILE_ONBOARDING_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? PROFILE_ONBOARDING_STEPS[index + 1]?.id : undefined;
}

export function OnboardingPage() {
  const actionToast = useActionToast();
  const navigate = useNavigate();
  const { saveProfile } = useProfile();
  const [initialState] = useState(getInitialOnboardingState);
  const [values, setValues] = useState<ProfileFormValues>(initialState.initialValues);
  const valuesRef = useRef(values);
  const [errors, setErrors] = useState<ProfileOnboardingErrors>({});
  const [saveError, setSaveError] = useState<string | undefined>();
  const [draftStatus, setDraftStatus] = useState<SaveStatusValue>(initialState.saveStatus);
  const [socialHandle, setSocialHandle] = useState<string | undefined>();
  const [editingFromSummary, setEditingFromSummary] = useState(false);

  const persistDraft = useCallback((stepId: OnboardingStepId, nextValues = valuesRef.current) => {
    if (!isProfileOnboardingStepId(stepId)) return;
    setDraftStatus('saving');
    setDraftStatus(saveProfileOnboardingDraft(nextValues, stepId) ? 'saved' : 'error');
  }, []);

  const flow = useOnboardingFlow({
    steps: onboardingSteps,
    restoredStepId: initialState.restoredStepId,
    onStepChange: persistDraft,
  });

  const currentStepId = flow.state.currentStepId;
  const currentProfileStepId = isProfileOnboardingStepId(currentStepId)
    ? currentStepId
    : undefined;
  const currentCopy = currentProfileStepId
    ? PROFILE_ONBOARDING_STEP_COPY[currentProfileStepId]
    : undefined;

  useEffect(() => {
    if (
      activeDataSpace.kind !== 'account'
      || currentProfileStepId !== PROFILE_ONBOARDING_STEP_IDS.summary
    ) {
      return;
    }

    let cancelled = false;
    const repository = new DexieSocialIdentityRepository(appDatabase);
    void repository.readIdentity().then((identity) => {
      if (!cancelled) setSocialHandle(formatSocialHandle(identity.handle));
    }).catch(() => {
      if (!cancelled) setSocialHandle(undefined);
    });

    return () => {
      cancelled = true;
    };
  }, [currentProfileStepId]);

  const handleValuesChange = useCallback((patch: Partial<ProfileFormValues>) => {
    setValues((current) => {
      const next = { ...current, ...patch };
      valuesRef.current = next;
      if (isProfileOnboardingStepId(flow.state.currentStepId)) {
        persistDraft(flow.state.currentStepId, next);
      }
      return next;
    });

    const changedFields = new Set(Object.keys(patch));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([field]) => !changedFields.has(field)),
    ) as ProfileOnboardingErrors);
  }, [flow.state.currentStepId, persistDraft]);

  const openFirstProfileStep = () => {
    setErrors({});
    flow.goTo(PROFILE_ONBOARDING_STEP_IDS.name);
  };

  const handleChooseLocal = () => {
    if (activeDataSpace.kind === 'account') {
      activateGuestDataSpace();
      window.location.reload();
      return;
    }

    openFirstProfileStep();
  };

  const handleBack = () => {
    if (!currentProfileStepId) return;
    setErrors({});
    if (editingFromSummary) {
      setEditingFromSummary(false);
      flow.goTo(PROFILE_ONBOARDING_STEP_IDS.summary);
      return;
    }
    const previousProfileStep = profileStepBefore(currentProfileStepId);
    if (previousProfileStep) {
      flow.goTo(previousProfileStep);
      return;
    }
    flow.goTo(STORAGE_ONBOARDING_STEP_ID);
  };

  const handleNext = () => {
    if (!currentProfileStepId) return;
    const stepErrors = validateProfileOnboardingStep(currentProfileStepId, valuesRef.current);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstInvalidField();
      return;
    }

    setErrors({});
    if (editingFromSummary) {
      setEditingFromSummary(false);
      flow.goTo(PROFILE_ONBOARDING_STEP_IDS.summary);
      return;
    }
    const nextProfileStep = profileStepAfter(currentProfileStepId);
    if (nextProfileStep) flow.goTo(nextProfileStep);
  };

  const handleEditSummary = (stepId: ProfileOnboardingStepId) => {
    setErrors({});
    setEditingFromSummary(true);
    flow.goTo(stepId);
  };

  const handleSubmit = async () => {
    if (!currentProfileStepId) return;

    const validation = validateCompleteProfileOnboarding(valuesRef.current);
    if (!validation.parsedValues) {
      setErrors(validation.errors);
      if (validation.firstInvalidStepId) {
        setEditingFromSummary(false);
        flow.goTo(validation.firstInvalidStepId);
      }
      focusFirstInvalidField();
      return;
    }

    setSaveError(undefined);

    await flow.runSubmission(async () => {
      try {
        const completion = await completeProfileOnboarding(
          profileFormValuesToEntity(validation.parsedValues!),
          {
            saveProfile,
            weightRepository: repositories.weight,
          },
        );
        saveProfileOnboardingCompletion();
        clearProfileOnboardingDraft();
        actionToast.success({
          key: 'onboarding-profile-create',
          title: 'Profil créé',
          description: completion.initialWeightCreated
            ? 'SportPilot est prêt et la première pesée a été enregistrée.'
            : 'SportPilot est prêt. L’historique de poids existant a été conservé.',
        });
        navigate(routePaths.dashboard, { replace: true });
      } catch (error) {
        const fallback = 'Le profil n’a pas pu être enregistré sur cet appareil.';
        setSaveError(error instanceof Error ? error.message : fallback);
        actionToast.error({
          key: 'onboarding-profile-create',
          error,
          fallback,
        });
      }
    });
  };

  const isSummaryStep = currentProfileStepId === PROFILE_ONBOARDING_STEP_IDS.summary;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-3 lg:hidden">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Dumbbell aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-bold text-slate-950 dark:text-white">SportPilot</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Configuration du profil</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr] lg:items-start">
          <Card className="hidden overflow-hidden lg:sticky lg:top-10 lg:block">
            <div className="bg-brand-700 p-8 text-white">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
                <Dumbbell aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-100">
                Bienvenue dans SportPilot
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                Configurez votre suivi étape par étape.
              </h1>
              <p className="mt-4 leading-7 text-brand-50">
                Une question principale par écran, avec sauvegarde automatique et reprise après fermeture.
              </p>
            </div>
            <div className="p-8">
              <div className="flex items-start gap-3">
                <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">Données protégées</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Le mode local reste disponible. Les comptes utilisent un espace isolé et une identité sociale distincte du profil privé.
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

          <section aria-labelledby="onboarding-step-title" className="min-w-0 pb-28 lg:pb-0">
            <div className="mb-5 space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  {currentCopy?.eyebrow ?? 'Mode de démarrage'}
                </p>
                <h1
                  ref={flow.headingRef}
                  id="onboarding-step-title"
                  tabIndex={-1}
                  className="mt-1 text-2xl font-bold tracking-tight text-slate-950 outline-none dark:text-white sm:text-3xl"
                >
                  {currentCopy?.title ?? 'Choisir le mode local ou compte'}
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {currentCopy?.description
                    ?? 'Ce choix protège l’espace de données avant la création du profil.'}
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

            {currentStepId === STORAGE_ONBOARDING_STEP_ID ? (
              <OnboardingAccountChoice
                onChooseLocal={handleChooseLocal}
                onContinueWithAccount={openFirstProfileStep}
              />
            ) : currentProfileStepId ? (
              <>
                {currentProfileStepId === PROFILE_ONBOARDING_STEP_IDS.name ? (
                  <InlineNotice
                    tone="info"
                    title={activeDataSpace.kind === 'account' ? 'Compte et espace confirmés' : 'Mode local confirmé'}
                    className="mb-5"
                  >
                    <div className="flex items-start gap-2">
                      {activeDataSpace.kind === 'account' ? (
                        <Cloud aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <CloudOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      )}
                      <p>
                        {activeDataSpace.kind === 'account'
                          ? 'Le profil sera créé dans l’espace isolé du compte actuellement ouvert.'
                          : 'Le profil restera sur cet appareil. Un compte pourra être connecté plus tard depuis Paramètres → Compte et appareils.'}
                      </p>
                    </div>
                  </InlineNotice>
                ) : null}

                {initialState.restored ? (
                  <InlineNotice tone="success" title="Configuration reprise" className="mb-5">
                    Les réponses et l’étape enregistrées sur cet appareil ont été restaurées automatiquement.
                  </InlineNotice>
                ) : null}

                {draftStatus === 'error' ? (
                  <InlineNotice tone="warning" title="Brouillon local indisponible" className="mb-5">
                    Vous pouvez continuer, mais les réponses ne pourront pas être reprises après la fermeture de l’application.
                  </InlineNotice>
                ) : null}

                {saveError ? (
                  <InlineNotice tone="error" title="Enregistrement impossible" className="mb-5">
                    {saveError}
                  </InlineNotice>
                ) : null}

                {Object.keys(errors).length > 0 ? (
                  <InlineNotice tone="error" title="Une réponse doit être corrigée" className="mb-5">
                    Vérifiez le message affiché sous le champ concerné avant de continuer.
                  </InlineNotice>
                ) : null}

                {isSummaryStep ? (
                  <OnboardingProfileSummary
                    values={values}
                    dataSpaceKind={activeDataSpace.kind}
                    socialHandle={socialHandle}
                    onEdit={handleEditSummary}
                  />
                ) : (
                  <OnboardingProfileStep
                    stepId={currentProfileStepId}
                    values={values}
                    errors={errors}
                    onChange={handleValuesChange}
                  />
                )}

                <StickyActionBar mobileBottomOffset="0rem" toastOffset="6rem">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={handleBack}
                      disabled={flow.state.submissionStatus === 'submitting'}
                    >
                      <ArrowLeft aria-hidden="true" className="size-5" />
                      Retour
                    </Button>
                    {isSummaryStep ? (
                      <Button
                        type="button"
                        size="lg"
                        loading={flow.state.submissionStatus === 'submitting'}
                        loadingLabel="Démarrage…"
                        onClick={() => void handleSubmit()}
                      >
                        <Save aria-hidden="true" className="size-5" />
                        Commencer avec SportPilot
                      </Button>
                    ) : (
                      <Button type="button" size="lg" onClick={handleNext}>
                        Suivant
                        <ArrowRight aria-hidden="true" className="size-5" />
                      </Button>
                    )}
                  </div>
                </StickyActionBar>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
