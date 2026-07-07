import {
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
  SOCIAL_ACTIVITY_CARDIO_FIELDS,
  SOCIAL_ACTIVITY_COMMON_FIELDS,
  SOCIAL_ACTIVITY_OVERRIDE_MODE_LABELS,
  SOCIAL_ACTIVITY_STRENGTH_FIELDS,
  SOCIAL_ACTIVITY_VISIBILITY_LABELS,
  cloneSocialActivityFieldSelection,
  createSocialActivityGlobalSharingPolicy,
  createSocialActivitySharingOverride,
  normalizeSocialActivityFieldSelection,
  type SocialActivityCardioField,
  type SocialActivityCommonField,
  type SocialActivityFamily,
  type SocialActivityFieldSelection,
  type SocialActivityGlobalSharingPolicy,
  type SocialActivityOverrideMode,
  type SocialActivitySharingOverride,
  type SocialActivityStrengthField,
  type SocialActivityVisibility,
} from '@/domain/friends/socialActivitySharingPolicy';

const commonFieldLabels: Record<SocialActivityCommonField, string> = {
  activityType: 'Type d’activité',
  title: 'Titre',
  date: 'Date',
  time: 'Heure',
  duration: 'Durée',
  intensity: 'Intensité',
  calories: 'Calories',
};

const cardioFieldLabels: Record<SocialActivityCardioField, string> = {
  distance: 'Distance',
  sessionType: 'Type de séance',
  terrain: 'Terrain',
  stroke: 'Nage',
  poolLength: 'Longueur du bassin',
  bikeType: 'Type de vélo',
  environment: 'Environnement',
  pace: 'Allure ou rythme',
  speed: 'Vitesse',
  paceSeries: 'Évolution du rythme',
  elevation: 'Dénivelé',
  heartRate: 'Fréquence cardiaque',
  cadence: 'Cadence',
  intervals: 'Intervalles',
  laps: 'Tours',
  segments: 'Segments',
  chart: 'Graphique',
};

const strengthFieldLabels: Record<SocialActivityStrengthField, string> = {
  sessionName: 'Nom de la séance',
  muscleGroups: 'Groupes musculaires',
  exerciseCount: 'Nombre d’exercices',
  exercises: 'Exercices',
  sets: 'Séries',
  repetitions: 'Répétitions',
  loads: 'Charges',
  bodyweight: 'Poids du corps',
  restTimes: 'Temps de repos',
  rpe: 'RPE',
  volume: 'Volume',
};

interface FieldGroupProps<T extends string> {
  readonly title: string;
  readonly fields: readonly T[];
  readonly selected: readonly T[];
  readonly labels: Record<T, string>;
  readonly onToggle: (field: T) => void;
  readonly disabled?: boolean;
}

function FieldGroup<T extends string>({
  title,
  fields,
  selected,
  labels,
  onToggle,
  disabled = false,
}: FieldGroupProps<T>) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <legend className="px-1 text-sm font-semibold text-slate-950 dark:text-white">{title}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
          >
            <input
              type="checkbox"
              checked={selected.includes(field)}
              onChange={() => onToggle(field)}
              disabled={disabled}
              className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>{labels[field]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function toggleField<T extends string>(
  fields: readonly T[],
  field: T,
): readonly T[] {
  return fields.includes(field)
    ? fields.filter((candidate) => candidate !== field)
    : [...fields, field];
}

function updateSelection(
  current: SocialActivityFieldSelection,
  group: keyof SocialActivityFieldSelection,
  field: string,
): SocialActivityFieldSelection {
  const next: SocialActivityFieldSelection = group === 'common'
    ? {
        ...current,
        common: toggleField(current.common, field as SocialActivityCommonField),
      }
    : group === 'cardio'
      ? {
          ...current,
          cardio: toggleField(current.cardio, field as SocialActivityCardioField),
        }
      : {
          ...current,
          strength: toggleField(current.strength, field as SocialActivityStrengthField),
        };
  return normalizeSocialActivityFieldSelection(next);
}

interface SharingModeButtonsProps<TMode extends string> {
  readonly modes: readonly TMode[];
  readonly value: TMode;
  readonly labels: Record<TMode, string>;
  readonly onChange: (mode: TMode) => void;
  readonly disabled?: boolean;
}

function SharingModeButtons<TMode extends string>({
  modes,
  value,
  labels,
  onChange,
  disabled = false,
}: SharingModeButtonsProps<TMode>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {modes.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode)}
            disabled={disabled}
            className={active
              ? 'min-h-11 rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
              : 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}
          >
            {labels[mode]}
          </button>
        );
      })}
    </div>
  );
}

interface FieldSelectionEditorProps {
  readonly family?: SocialActivityFamily;
  readonly value: SocialActivityFieldSelection;
  readonly onChange: (value: SocialActivityFieldSelection) => void;
  readonly disabled?: boolean;
}

function FieldSelectionEditor({ family, value, onChange, disabled = false }: FieldSelectionEditorProps) {
  return (
    <div className="space-y-3">
      <FieldGroup
        title="Informations communes"
        fields={SOCIAL_ACTIVITY_COMMON_FIELDS}
        selected={value.common}
        labels={commonFieldLabels}
        onToggle={(field) => onChange(updateSelection(value, 'common', field))}
        disabled={disabled}
      />
      {family !== 'strength' && family !== 'generic' ? (
        <FieldGroup
          title="Cardio et endurance"
          fields={SOCIAL_ACTIVITY_CARDIO_FIELDS}
          selected={value.cardio}
          labels={cardioFieldLabels}
          onToggle={(field) => onChange(updateSelection(value, 'cardio', field))}
          disabled={disabled}
        />
      ) : null}
      {family !== 'cardio' && family !== 'generic' ? (
        <FieldGroup
          title="Musculation"
          fields={SOCIAL_ACTIVITY_STRENGTH_FIELDS}
          selected={value.strength}
          labels={strengthFieldLabels}
          onToggle={(field) => onChange(updateSelection(value, 'strength', field))}
          disabled={disabled}
        />
      ) : null}
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Les notes personnelles et les champs techniques restent toujours privés.
      </p>
    </div>
  );
}

interface SocialActivityGlobalSharingSettingsProps {
  readonly value: SocialActivityGlobalSharingPolicy;
  readonly onChange: (value: SocialActivityGlobalSharingPolicy) => void;
  readonly disabled?: boolean;
}

const globalModes: readonly SocialActivityVisibility[] = [
  'private',
  'summary',
  'detailed',
  'custom',
];

export function SocialActivityGlobalSharingSettings({
  value,
  onChange,
  disabled = false,
}: SocialActivityGlobalSharingSettingsProps) {
  const changeMode = (visibility: SocialActivityVisibility) => {
    onChange(createSocialActivityGlobalSharingPolicy(visibility, value.fields));
  };

  return (
    <div className="space-y-4">
      <SharingModeButtons
        modes={globalModes}
        value={value.visibility}
        labels={SOCIAL_ACTIVITY_VISIBILITY_LABELS}
        onChange={changeMode}
        disabled={disabled}
      />
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        {value.visibility === 'private'
          ? 'Aucun snapshot social n’est publié.'
          : value.visibility === 'summary'
            ? 'Seules les informations générales prévues par le résumé prudent sont publiées.'
            : value.visibility === 'detailed'
              ? 'Le détail standard est publié uniquement aux amis autorisés.'
              : 'Tu choisis précisément les champs autorisés.'}
      </p>
      {value.visibility === 'custom' ? (
        <FieldSelectionEditor
          value={value.fields}
          onChange={(fields) => onChange({ ...value, fields })}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

interface SocialActivityOverrideSettingsProps {
  readonly family: SocialActivityFamily;
  readonly value: SocialActivitySharingOverride;
  readonly onChange: (value: SocialActivitySharingOverride) => void;
}

const overrideModes: readonly SocialActivityOverrideMode[] = [
  'inherit',
  'private',
  'summary',
  'detailed',
  'custom',
];

export function SocialActivityOverrideSettings({
  family,
  value,
  onChange,
}: SocialActivityOverrideSettingsProps) {
  const fields = value.mode === 'custom'
    ? value.fields
    : cloneSocialActivityFieldSelection(DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION);

  return (
    <div className="space-y-4">
      <SharingModeButtons
        modes={overrideModes}
        value={value.mode}
        labels={SOCIAL_ACTIVITY_OVERRIDE_MODE_LABELS}
        onChange={(mode) => onChange(createSocialActivitySharingOverride(mode, fields))}
      />
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        {value.mode === 'inherit'
          ? 'Cette activité suit les réglages globaux.'
          : value.mode === 'private'
            ? 'Cette activité ne sera visible par aucun ami.'
            : value.mode === 'summary'
              ? 'Les amis autorisés verront uniquement le résumé.'
              : value.mode === 'detailed'
                ? 'Le détail standard dépendra aussi de la permission accordée à chaque ami.'
                : 'Seuls les champs cochés seront inclus dans la projection sociale.'}
      </p>
      {value.mode === 'custom' ? (
        <FieldSelectionEditor
          family={family}
          value={fields}
          onChange={(nextFields) => onChange({ mode: 'custom', fields: nextFields })}
        />
      ) : null}
    </div>
  );
}
