import {
  Activity,
  Pencil,
  Scale,
  UserRound,
  Utensils,
} from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import {
  appendProfileImpactHistory,
  createProfileImpactHistoryEntry,
  detectProfileImpactFields,
  previewProfileImpact,
  type ProfileImpactPreview as ProfileImpactPreviewModel,
} from '@/application/profile/profileImpactService';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { ProfileImpactHistory } from '@/features/profile/components/ProfileImpactHistory';
import { ProfileImpactPreview } from '@/features/profile/components/ProfileImpactPreview';
import { ProfileOverview } from '@/features/profile/components/ProfileOverview';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import {
  profileFormValuesToEntity,
  profileToFormValues,
} from '@/features/profile/utils/profileForm';
import {
  SettingsSectionDirectory,
  type SettingsDirectoryItem,
} from '@/features/settings/components/SettingsSectionDirectory';
import { useCurrentWeight } from '@/features/weight/hooks/useCurrentWeight';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { UnsavedChangesGuard } from '@/shared/ui/UnsavedChangesGuard';

const profileSections: readonly SettingsDirectoryItem[] = [
  {
    id: 'profile-personal',
    label: 'Informations personnelles',
    description: 'Sexe, âge, taille et poids initial historique.',
    keywords: ['age', 'taille', 'sexe', 'poids'],
    icon: UserRound,
  },
  {
    id: 'profile-goal',
    label: 'Objectif et activité',
    description: 'Perte, maintien, prise et activité quotidienne.',
    keywords: ['objectif', 'activité', 'pas'],
    icon: Activity,
  },
  {
    id: 'profile-macros',
    label: 'Macronutriments',
    description: 'Protéines et lipides exprimés par kilo.',
    keywords: ['proteines', 'lipides', 'glucides'],
    icon: Utensils,
  },
] as const;

interface ProfilePageContentProps {
  profile: UserProfile;
  saveProfile: (profile: NewEntity<UserProfile>) => Promise<UserProfile>;
}

interface PendingImpact {
  values: ProfileFormValues;
  preview: ProfileImpactPreviewModel;
}

interface ProfileFeedback {
  tone: 'warning' | 'error';
  title: string;
  message: string;
}

function ProfilePageContent({ profile, saveProfile }: ProfilePageContentProps) {
  const actionToast = useActionToast();
  const { currentWeight } = useCurrentWeight(profile);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const editorTitleRef = useRef<HTMLHeadingElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingImpact, setPendingImpact] = useState<PendingImpact | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<ProfileFeedback | undefined>();

  useEffect(() => {
    if (!isEditing) return;
    window.requestAnimationFrame(() => editorTitleRef.current?.focus());
  }, [isEditing]);

  const restoreEditButtonFocus = () => {
    window.requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const closeEditor = () => {
    setIsEditing(false);
    setIsDirty(false);
    setPendingImpact(undefined);
    setDiscardDialogOpen(false);
    restoreEditButtonFocus();
  };

  const startEditing = () => {
    setFeedback(undefined);
    setPendingImpact(undefined);
    setIsDirty(false);
    setIsEditing(true);
  };

  const requestCancelEditing = () => {
    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }
    closeEditor();
  };

  const persistProfile = async (
    values: ProfileFormValues,
    preview?: ProfileImpactPreviewModel,
  ) => {
    const entity = profileFormValuesToEntity(values);
    const nextProfile = preview
      ? {
          ...entity,
          profileImpactHistory: appendProfileImpactHistory(
            profile.profileImpactHistory,
            createProfileImpactHistoryEntry(preview),
          ),
        }
      : entity;

    const savedProfile = await saveProfile(nextProfile);
    if (!preview) {
      return { savedProfile };
    }

    try {
      await calculateAndPersistDailyTarget(preview.date, savedProfile);
      return { savedProfile };
    } catch (recalculationError) {
      return { savedProfile, recalculationError };
    }
  };

  const reportSuccess = (withImpact: boolean) => {
    setFeedback(undefined);
    actionToast.success({
      key: 'profile-update',
      title: 'Profil mis à jour',
      ...(withImpact ? { description: 'Objectifs du jour recalculés' } : {}),
    });
  };

  const reportError = (error: unknown) => {
    const fallback = 'Le profil n’a pas pu être mis à jour. Vérifie les champs puis réessaie.';
    setFeedback({
      tone: 'error',
      title: 'Enregistrement impossible',
      message: error instanceof Error ? error.message : fallback,
    });
  };

  const handleSubmit = async (values: ProfileFormValues) => {
    setFeedback(undefined);
    setPendingImpact(undefined);
    const entity = profileFormValuesToEntity(values);
    const changedFields = detectProfileImpactFields(profile, entity);

    try {
      if (changedFields.length === 0) {
        await persistProfile(values);
        reportSuccess(false);
        closeEditor();
        return;
      }

      const preview = await previewProfileImpact(
        profile,
        entity,
        format(new Date(), 'yyyy-MM-dd'),
      );
      setPendingImpact({ values, preview });
      window.requestAnimationFrame(() => {
        const previewTitle = document.getElementById('profile-impact-preview-title');
        if (typeof previewTitle?.scrollIntoView === 'function') {
          previewTitle.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
          });
        }
      });
    } catch (error) {
      reportError(error);
    }
  };

  const confirmImpact = async () => {
    if (!pendingImpact) return;
    setIsConfirming(true);
    setFeedback(undefined);

    try {
      const result = await persistProfile(pendingImpact.values, pendingImpact.preview);
      setPendingImpact(undefined);
      if (result.recalculationError) {
        setFeedback({
          tone: 'warning',
          title: 'Profil enregistré, recalcul à relancer',
          message: 'Le profil et le journal ont été enregistrés localement, mais les objectifs de la journée n’ont pas pu être recalculés. Recharge la page pour relancer le calcul.',
        });
        closeEditor();
        return;
      }
      reportSuccess(true);
      closeEditor();
    } catch (error) {
      reportError(error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section
      aria-labelledby="profile-title"
      className="min-w-0 overflow-x-clip"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Scale
              aria-hidden="true"
              className="mt-1 size-6 shrink-0 text-brand-700 dark:text-brand-300"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Profil local
              </p>
              <h1
                id="profile-title"
                className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
              >
                Profil et objectifs
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
                {isEditing
                  ? 'Modifie les informations nécessaires, puis enregistre ou annule tes changements.'
                  : 'Consulte les informations utilisées par SportPilot. Active le mode édition uniquement lorsque tu souhaites les modifier.'}
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button
              ref={editButtonRef}
              type="button"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              aria-controls="profile-editor"
              aria-expanded="false"
              onClick={startEditing}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Modifier le profil
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <ProfileOverview profile={profile} currentWeight={currentWeight} />
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={feedback.title}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      {pendingImpact ? (
        <ProfileImpactPreview
          preview={pendingImpact.preview}
          isSaving={isConfirming}
          onConfirm={() => void confirmImpact()}
          onCancel={() => setPendingImpact(undefined)}
        />
      ) : null}

      <ProfileImpactHistory entries={profile.profileImpactHistory ?? []} />

      {isEditing ? (
        <>
          <div className="mt-4">
            <SettingsSectionDirectory
              sections={profileSections}
              title="Accéder à une rubrique du profil"
            />
          </div>

          <div
            id="profile-editor"
            className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2
              ref={editorTitleRef}
              tabIndex={-1}
              className="text-xl font-bold text-slate-950 outline-none dark:text-white"
            >
              Modifier le profil
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les changements restent locaux tant que tu ne les enregistres pas.
            </p>
            <div className="mt-5">
              <ProfileForm
                initialValues={profileToFormValues(profile)}
                submitLabel="Enregistrer le profil"
                onSubmit={handleSubmit}
                onDirtyChange={setIsDirty}
                onValuesChange={() => {
                  if (pendingImpact) setPendingImpact(undefined);
                }}
                secondaryAction={{
                  label: 'Annuler',
                  onClick: requestCancelEditing,
                }}
              />
            </div>
          </div>
        </>
      ) : null}

      <UnsavedChangesGuard when={isEditing && isDirty} />

      <ConfirmationDialog
        open={discardDialogOpen}
        title="Annuler les modifications ?"
        description="Les changements saisis depuis l’ouverture du mode édition seront perdus."
        confirmLabel="Abandonner les modifications"
        cancelLabel="Continuer la modification"
        onCancel={() => setDiscardDialogOpen(false)}
        onConfirm={closeEditor}
      />
    </section>
  );
}

export function ProfilePage() {
  const { profile, saveProfile } = useProfile();

  if (!profile) return null;

  return <ProfilePageContent profile={profile} saveProfile={saveProfile} />;
}
