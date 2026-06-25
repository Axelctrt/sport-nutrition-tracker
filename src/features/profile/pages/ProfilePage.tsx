import { useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { ProfileOverview } from '@/features/profile/components/ProfileOverview';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import {
  profileFormValuesToEntity,
  profileToFormValues,
} from '@/features/profile/utils/profileForm';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function ProfilePage() {
  const { profile, saveProfile } = useProfile();
  const [feedback, setFeedback] = useState<
    { tone: 'success' | 'error'; message: string } | undefined
  >();

  if (!profile) {
    return null;
  }

  const handleSubmit = async (values: ProfileFormValues) => {
    setFeedback(undefined);

    try {
      await saveProfile(profileFormValuesToEntity(values));
      setFeedback({
        tone: 'success',
        message: 'Le profil a été mis à jour dans la base locale.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'Le profil n’a pas pu être mis à jour.',
      });
    }
  };

  return (
    <section aria-labelledby="profile-title" className="mx-auto min-w-0 max-w-4xl overflow-x-clip">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Profil local
        </p>
        <h1 id="profile-title" className="mt-1 text-2xl font-bold sm:text-3xl tracking-tight text-slate-950 dark:text-white">
          Profil
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Ces données déterminent les futurs calculs de métabolisme, de dépense énergétique et de macronutriments.
        </p>
      </div>

      <ProfileOverview profile={profile} />

      {feedback ? (
        <InlineNotice
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Profil enregistré' : 'Enregistrement impossible'}
          className="mt-6"
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6 min-w-0">
        <ProfileForm
          key={profile.updatedAt}
          initialValues={profileToFormValues(profile)}
          submitLabel="Enregistrer le profil"
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
