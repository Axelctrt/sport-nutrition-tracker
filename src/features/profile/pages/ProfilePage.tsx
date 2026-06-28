import {
  Activity,
  Scale,
  UserRound,
  Utensils,
} from 'lucide-react';
import { useState } from 'react';

import { useProfile } from '@/app/providers/profile/useProfile';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
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
import { InlineNotice } from '@/shared/ui/InlineNotice';

const profileSections: readonly SettingsDirectoryItem[] = [
  {
    id: 'profile-personal',
    label: 'Informations personnelles',
    description: 'Sexe, âge, taille et poids de référence.',
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

export function ProfilePage() {
  const { profile, saveProfile } = useProfile();
  const [feedback, setFeedback] = useState<
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | undefined
  >();

  if (!profile) return null;

  const handleSubmit = async (
    values: ProfileFormValues,
  ) => {
    setFeedback(undefined);

    try {
      await saveProfile(
        profileFormValuesToEntity(values),
      );
      setFeedback({
        tone: 'success',
        message:
          'Le profil a été mis à jour dans la base locale.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Le profil n’a pas pu être mis à jour.',
      });
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
              Ouvre uniquement la rubrique que tu souhaites
              modifier. Les sections restent mémorisées sur cet
              appareil.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ProfileOverview profile={profile} />
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={
            feedback.tone === 'success'
              ? 'Profil enregistré'
              : 'Enregistrement impossible'
          }
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

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
        />
      </div>
    </section>
  );
}
