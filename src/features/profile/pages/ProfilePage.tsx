import {
  Activity,
  Scale,
  UserRound,
  Utensils,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

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
import { InlineNotice } from '@/shared/ui/InlineNotice';

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

function ProfilePageContent({ profile, saveProfile }: ProfilePageContentProps) {
  const actionToast = useActionToast();
  const { currentWeight } = useCurrentWeight(profile);
  const [pendingImpact, setPendingImpact] = useState<PendingImpact | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState<
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | undefined
  >();

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
    setFeedback({
      tone: 'success',
      message: withImpact
        ? 'Le profil a été mis à jour. Les objectifs de la journée ont été recalculés et le changement a été ajouté au journal.'
        : 'Le profil a été mis à jour dans la base locale.',
    });
    actionToast.success({
      key: 'profile-update',
      title: 'Profil mis à jour',
      ...(withImpact ? { description: 'Objectifs du jour recalculés' } : {}),
    });
  };

  const reportError = (error: unknown) => {
    const fallback = 'Le profil n’a pas pu être mis à jour.';
    setFeedback({
      tone: 'error',
      message: error instanceof Error ? error.message : fallback,
    });
    actionToast.error({
      key: 'profile-update',
      error,
      fallback,
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
        const message = 'Le profil et le journal ont été enregistrés, mais les objectifs de la journée n’ont pas pu être recalculés. Recharge la page pour relancer le calcul.';
        setFeedback({ tone: 'error', message });
        actionToast.error({
          key: 'profile-update-recalculation',
          error: result.recalculationError,
          fallback: message,
        });
        return;
      }
      reportSuccess(true);
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
        <div className="flex items-start gap-3">
          <Scale
            aria-hidden="true"
            className="mt-1 size-6 text-brand-700 dark:text-brand-300"
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
              Ouvre uniquement la rubrique que tu souhaites modifier. Les sections restent mémorisées sur cet appareil.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ProfileOverview profile={profile} currentWeight={currentWeight} />
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Profil enregistré' : 'Enregistrement impossible'}
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

      <div className="mt-4">
        <SettingsSectionDirectory
          sections={profileSections}
          title="Accéder à une rubrique du profil"
        />
      </div>

      <div className="mt-4">
        <ProfileForm
          initialValues={profileToFormValues(profile)}
          submitLabel="Enregistrer le profil"
          onSubmit={handleSubmit}
          onValuesChange={() => {
            if (pendingImpact) setPendingImpact(undefined);
          }}
        />
      </div>
    </section>
  );
}

export function ProfilePage() {
  const { profile, saveProfile } = useProfile();

  if (!profile) return null;

  return <ProfilePageContent profile={profile} saveProfile={saveProfile} />;
}
