import {
  Activity,
  Pencil,
  Scale,
  UserRound,
  Utensils,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRef, useState } from 'react';

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
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { UnsavedChangesGuard } from '@/shared/ui/UnsavedChangesGuard';

const profileSections: readonly SettingsDirectoryItem[] = [
  {
    id: 'profile-personal',
    label: 'Informations personnelles',
    description: 'Identité et mesures.',
    keywords: ['age', 'taille', 'sexe', 'poids'],
    icon: UserRound,
  },
  {
    id: 'profile-goal',
    label: 'Objectif nutritionnel et activité',
    description: 'Objectif calorique, rythme visé et niveau d’activité.',
    keywords: ['objectif', 'nutrition', 'activité', 'pas'],
    icon: Activity,
  },
  {
    id: 'profile-macros',
    label: 'Macronutriments',
    description: 'Macros.',
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

function ProfilePageContent({ profile, saveProfile }: ProfilePageContentProps) {
  const actionToast = useActionToast();
  const { currentWeight } = useCurrentWeight(profile);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const saveInFlightRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingImpact, setPendingImpact] = useState<PendingImpact | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [recalculationWarning, setRecalculationWarning] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const focusEditButton = () => {
    window.setTimeout(() => editButtonRef.current?.focus(), 0);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setIsDirty(false);
    setPendingImpact(undefined);
    setDiscardDialogOpen(false);
    setSaveError(undefined);
    focusEditButton();
  };

  const openEditor = () => {
    setRecalculationWarning(false);
    setSaveError(undefined);
    setIsEditing(true);
  };

  const persistProfile = async (
    values: ProfileFormValues,
    preview?: ProfileImpactPreviewModel,
  ) => {
    const entity = profileFormValuesToEntity(values);
    const savedProfile = await saveProfile(preview
      ? {
          ...entity,
          profileImpactHistory: appendProfileImpactHistory(
            profile.profileImpactHistory,
            createProfileImpactHistoryEntry(preview),
          ),
        }
      : entity);

    if (!preview) return false;
    try {
      await calculateAndPersistDailyTarget(preview.date, savedProfile);
      return false;
    } catch {
      return true;
    }
  };

  const reportSuccess = () => {
    actionToast.success({
      key: 'profile-update',
      title: 'Profil mis à jour',
    });
  };

  const reportError = (error: unknown) => {
    setSaveError(
      error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Profil non enregistré. Réessaie.',
    );
  };

  const handleSubmit = async (values: ProfileFormValues) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setRecalculationWarning(false);
    setSaveError(undefined);
    setPendingImpact(undefined);
    const entity = profileFormValuesToEntity(values);

    try {
      if (detectProfileImpactFields(profile, entity).length === 0) {
        await persistProfile(values);
        reportSuccess();
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
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const confirmImpact = async () => {
    if (!pendingImpact || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setIsConfirming(true);
    setSaveError(undefined);

    try {
      const recalculationFailed = await persistProfile(
        pendingImpact.values,
        pendingImpact.preview,
      );
      setPendingImpact(undefined);
      if (recalculationFailed) {
        setRecalculationWarning(true);
        closeEditor();
        return;
      }
      reportSuccess();
      closeEditor();
    } catch (error) {
      reportError(error);
    } finally {
      saveInFlightRef.current = false;
      setIsConfirming(false);
    }
  };

  const editAction = (
    <Button
      ref={editButtonRef}
      type="button"
      variant="secondary"
      className="shrink-0"
      aria-label="Modifier le profil"
      title="Modifier le profil"
      aria-expanded={isEditing}
      onClick={openEditor}
    >
      <span aria-hidden="true">Modifier</span>
      <Pencil aria-hidden="true" className="size-4" />
    </Button>
  );

  return (
    <section
      aria-labelledby="profile-title"
      className="min-w-0 overflow-x-clip"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-start gap-3">
          <Scale
            aria-hidden="true"
            className="mt-1 size-6 shrink-0 text-brand-700 dark:text-brand-300"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Profil local
            </p>
            <h1
              id="profile-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Profil et objectif nutritionnel
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Consulte ou modifie tes données personnelles, ton objectif calorique et tes macronutriments.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ProfileOverview
          profile={profile}
          currentWeight={currentWeight}
          action={editAction}
        />
      </div>

      {recalculationWarning ? (
        <InlineNotice
          className="mt-4"
          tone="warning"
          title="Profil enregistré, recalcul à relancer"
        >
          Le profil et le journal ont été enregistrés localement. Recharge la page.
        </InlineNotice>
      ) : null}

      <ProfileImpactHistory entries={profile.profileImpactHistory ?? []} />

      <BottomSheet
        open={isEditing}
        title="Modifier le profil"
        description="Mets à jour tes informations, ton objectif nutritionnel et tes macronutriments."
        closeLabel="Fermer la modification du profil"
        initialFocusSelector="#firstName"
        className="sm:self-center sm:max-h-[calc(100%-3rem)] sm:rounded-3xl sm:border"
        onClose={() => isDirty ? setDiscardDialogOpen(true) : closeEditor()}
      >
        <SettingsSectionDirectory
          sections={profileSections}
          title="Rubriques"
        />
        {saveError ? (
          <InlineNotice className="mt-4" tone="error" title="Enregistrement impossible">
            {saveError}
          </InlineNotice>
        ) : null}
        <div className="mt-4">
          <ProfileForm
            initialValues={profileToFormValues(profile)}
            submitLabel="Enregistrer le profil"
            onSubmit={handleSubmit}
            onDirtyChange={setIsDirty}
            onValuesChange={() => {
              setSaveError(undefined);
              if (pendingImpact) setPendingImpact(undefined);
            }}
            secondaryAction={{
              label: 'Annuler',
              onClick: () => isDirty ? setDiscardDialogOpen(true) : closeEditor(),
            }}
          />
        </div>
        {pendingImpact ? (
          <ProfileImpactPreview
            preview={pendingImpact.preview}
            isSaving={isConfirming}
            onConfirm={() => void confirmImpact()}
            onCancel={() => setPendingImpact(undefined)}
          />
        ) : null}
      </BottomSheet>

      <UnsavedChangesGuard when={isEditing && isDirty} />

      <ConfirmationDialog
        open={discardDialogOpen}
        title="Annuler les modifications ?"
        description="Les changements seront perdus."
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
