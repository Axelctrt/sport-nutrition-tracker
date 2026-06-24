import { Dumbbell, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import { profileFormValuesToEntity } from '@/features/profile/utils/profileForm';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { saveProfile } = useProfile();
  const [saveError, setSaveError] = useState<string | undefined>();

  const handleSubmit = async (values: ProfileFormValues) => {
    setSaveError(undefined);

    try {
      await saveProfile(profileFormValuesToEntity(values));
      navigate(routePaths.dashboard, { replace: true });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Le profil n’a pas pu être enregistré sur cet appareil.',
      );
    }
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
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Profil local
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Créer le profil local
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Tous les paramètres pourront être modifiés ensuite depuis la page Profil.
            </p>
          </div>

          {saveError ? (
            <InlineNotice tone="error" title="Enregistrement impossible" className="mb-6">
              {saveError}
            </InlineNotice>
          ) : null}

          <ProfileForm
            initialValues={DEFAULT_PROFILE_FORM_VALUES}
            submitLabel="Créer mon profil"
            onSubmit={handleSubmit}
          />
        </Card>
      </div>
    </main>
  );
}
