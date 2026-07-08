import { useEffect, useMemo, useState } from 'react';

import type { FriendActivityPermissionLevel } from '@/domain/friends/friendship';
import {
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
  cloneSocialActivityFieldSelection,
  normalizeSocialActivityFieldSelection,
  type SocialActivityCardioField,
  type SocialActivityCommonField,
  type SocialActivityFieldSelection,
  type SocialActivityStrengthField,
} from '@/domain/friends/socialActivitySharingPolicy';

interface SharingOption<TField extends string> {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly fields: readonly TField[];
}

const strengthOptions: readonly SharingOption<SocialActivityStrengthField>[] = [
  {
    id: 'exercises',
    label: 'Exercices',
    fields: ['sessionName', 'muscleGroups', 'exerciseCount', 'exercises'],
  },
  {
    id: 'sets',
    label: 'Séries et répétitions',
    fields: ['sets', 'repetitions'],
  },
  {
    id: 'loads',
    label: 'Charges',
    fields: ['loads', 'bodyweight'],
  },
  {
    id: 'rest',
    label: 'Repos',
    fields: ['restTimes'],
  },
  {
    id: 'rpe',
    label: 'RPE des séries',
    hint: 'Visible uniquement lorsqu’il est renseigné.',
    fields: ['rpe'],
  },
  {
    id: 'volume',
    label: 'Volume total',
    fields: ['volume'],
  },
];

const cardioOptions: readonly SharingOption<SocialActivityCardioField | SocialActivityCommonField>[] = [
  { id: 'distance', label: 'Distance', fields: ['distance'] },
  { id: 'pace', label: 'Allure ou rythme', fields: ['pace'] },
  { id: 'speed', label: 'Vitesse', fields: ['speed'] },
  { id: 'elevation', label: 'Dénivelé', fields: ['elevation'] },
  {
    id: 'calories',
    label: 'Calories',
    hint: 'Visibles uniquement lorsqu’elles sont calculées.',
    fields: ['calories'],
  },
  { id: 'heartRate', label: 'Fréquence cardiaque', fields: ['heartRate'] },
  { id: 'cadence', label: 'Cadence', fields: ['cadence'] },
  {
    id: 'intervals',
    label: 'Tours et intervalles',
    fields: ['intervals', 'laps', 'segments'],
  },
];

const mandatoryCommonFields: readonly SocialActivityCommonField[] = [
  'activityType',
  'title',
  'date',
  'duration',
];

function selectionHasFields(
  selection: SocialActivityFieldSelection,
  fields: readonly string[],
): boolean {
  return fields.some((field) => (
    selection.common.includes(field as SocialActivityCommonField)
    || selection.cardio.includes(field as SocialActivityCardioField)
    || selection.strength.includes(field as SocialActivityStrengthField)
  ));
}

function removeFields<T extends string>(source: readonly T[], fields: readonly string[]): readonly T[] {
  const removed = new Set(fields);
  return source.filter((field) => !removed.has(field));
}

function addFields<T extends string>(source: readonly T[], fields: readonly T[]): readonly T[] {
  return [...new Set([...source, ...fields])];
}

const configurableCommonFields: readonly SocialActivityCommonField[] = [
  ...mandatoryCommonFields,
  'calories',
];
const configurableCardioFields = cardioOptions.flatMap((option) => option.fields)
  .filter((field): field is SocialActivityCardioField => field !== 'calories');
const configurableStrengthFields = strengthOptions.flatMap((option) => option.fields);

function keepSupportedFields<T extends string>(
  fields: readonly T[],
  supported: readonly T[],
): readonly T[] {
  const supportedSet = new Set<string>(supported);
  return fields.filter((field) => supportedSet.has(field));
}

function ensureMandatoryCommonFields(
  selection: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  return normalizeSocialActivityFieldSelection({
    common: addFields(
      keepSupportedFields(selection.common, configurableCommonFields),
      mandatoryCommonFields,
    ),
    cardio: keepSupportedFields(selection.cardio, configurableCardioFields),
    strength: keepSupportedFields(selection.strength, configurableStrengthFields),
  });
}

function toggleStrengthOption(
  selection: SocialActivityFieldSelection,
  option: SharingOption<SocialActivityStrengthField>,
): SocialActivityFieldSelection {
  const enabled = selectionHasFields(selection, option.fields);
  let strength = enabled
    ? removeFields(selection.strength, option.fields)
    : addFields(selection.strength, option.fields);

  if (enabled && option.id === 'exercises') {
    strength = [];
  } else if (enabled && option.id === 'sets') {
    strength = removeFields(strength, ['loads', 'bodyweight', 'restTimes', 'rpe']);
  } else if (!enabled && ['sets', 'loads', 'rest', 'rpe'].includes(option.id)) {
    strength = addFields(strength, strengthOptions[0]!.fields);
  }

  if (!enabled && ['loads', 'rest', 'rpe'].includes(option.id)) {
    strength = addFields(strength, strengthOptions[1]!.fields);
  }

  return ensureMandatoryCommonFields({ ...selection, strength });
}

function toggleCardioOption(
  selection: SocialActivityFieldSelection,
  option: SharingOption<SocialActivityCardioField | SocialActivityCommonField>,
): SocialActivityFieldSelection {
  const enabled = selectionHasFields(selection, option.fields);
  const commonFields = option.fields.filter((field): field is SocialActivityCommonField => field === 'calories');
  const cardioFields = option.fields.filter((field): field is SocialActivityCardioField => field !== 'calories');
  let cardio = enabled
    ? removeFields(selection.cardio, cardioFields)
    : addFields(selection.cardio, cardioFields);

  if (!enabled && (option.id === 'pace' || option.id === 'speed')) {
    cardio = addFields(cardio, ['distance']);
  }

  return ensureMandatoryCommonFields({
    ...selection,
    common: enabled
      ? removeFields(selection.common, commonFields)
      : addFields(selection.common, commonFields),
    cardio,
  });
}

function countEnabledOptions(
  selection: SocialActivityFieldSelection,
  options: readonly SharingOption<string>[],
): number {
  return options.filter((option) => selectionHasFields(selection, option.fields)).length;
}

interface CompactFieldGroupProps<TField extends string> {
  readonly title: string;
  readonly options: readonly SharingOption<TField>[];
  readonly selection: SocialActivityFieldSelection;
  readonly onToggle: (option: SharingOption<TField>) => void;
  readonly disabled?: boolean;
}

function CompactFieldGroup<TField extends string>({
  title,
  options,
  selection,
  onToggle,
  disabled = false,
}: CompactFieldGroupProps<TField>) {
  const selectedCount = countEnabledOptions(selection, options);

  return (
    <details className="rounded-xl border border-slate-200 dark:border-slate-800">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {selectedCount}/{options.length}
        </span>
      </summary>
      <div className="grid gap-1 border-t border-slate-200 p-2 dark:border-slate-800">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-950"
          >
            <input
              type="checkbox"
              checked={selectionHasFields(selection, option.fields)}
              onChange={() => onToggle(option)}
              disabled={disabled}
              className="size-4 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              {option.hint ? (
                <span className="block text-xs leading-4 text-slate-500 dark:text-slate-400">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

interface SocialActivityFriendSharingSettingsProps {
  readonly friendDisplayName: string;
  readonly sharingLevel: FriendActivityPermissionLevel;
  readonly value: SocialActivityFieldSelection;
  readonly onSharingLevelChange: (value: FriendActivityPermissionLevel) => void;
  readonly onSaveFields: (value: SocialActivityFieldSelection) => void;
  readonly disabled?: boolean;
}

const sharingModes: readonly {
  readonly value: FriendActivityPermissionLevel;
  readonly label: string;
}[] = [
  { value: 'none', label: 'Aucun' },
  { value: 'summary', label: 'Résumé' },
  { value: 'detailed', label: 'Personnalisé' },
];

export function SocialActivityFriendSharingSettings({
  friendDisplayName,
  sharingLevel,
  value,
  onSharingLevelChange,
  onSaveFields,
  disabled = false,
}: SocialActivityFriendSharingSettingsProps) {
  const sourceSelection = useMemo(
    () => ensureMandatoryCommonFields(value),
    [value],
  );
  const sourceSignature = JSON.stringify(sourceSelection);
  const [draft, setDraft] = useState(() => cloneSocialActivityFieldSelection(sourceSelection));

  useEffect(() => {
    const nextSelection = JSON.parse(sourceSignature) as SocialActivityFieldSelection;
    setDraft(cloneSocialActivityFieldSelection(nextSelection));
  }, [sourceSignature]);

  const draftSignature = JSON.stringify(draft);
  const changed = draftSignature !== sourceSignature;
  const selectedCategoryCount = countEnabledOptions(draft, strengthOptions)
    + countEnabledOptions(draft, cardioOptions);
  const modeLabel = sharingModes.find((mode) => mode.value === sharingLevel)?.label ?? 'Résumé';

  return (
    <details
      name="sportpilot-friend-sharing"
      className="rounded-xl border border-slate-200 dark:border-slate-800"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Partage : {modeLabel}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            Ce que {friendDisplayName} peut voir
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-brand-700 dark:text-brand-300">Gérer</span>
      </summary>

      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="grid grid-cols-3 gap-1.5" aria-label={`Partage avec ${friendDisplayName}`}>
          {sharingModes.map((mode) => {
            const active = sharingLevel === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSharingLevelChange(mode.value)}
                disabled={disabled}
                className={active
                  ? 'min-h-10 rounded-lg bg-brand-700 px-2 py-2 text-xs font-semibold text-white disabled:opacity-60'
                  : 'min-h-10 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {sharingLevel === 'none' ? (
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Aucune activité ne sera visible par {friendDisplayName}.
          </p>
        ) : sharingLevel === 'summary' ? (
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {friendDisplayName} verra uniquement les informations essentielles de chaque activité.
          </p>
        ) : (
          <>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Résumé + {selectedCategoryCount} information{selectedCategoryCount > 1 ? 's' : ''} autorisée{selectedCategoryCount > 1 ? 's' : ''}.
            </p>
            <div className="grid gap-2">
              <CompactFieldGroup
                title="Musculation"
                options={strengthOptions}
                selection={draft}
                onToggle={(option) => setDraft(toggleStrengthOption(draft, option))}
                disabled={disabled}
              />
              <CompactFieldGroup
                title="Cardio"
                options={cardioOptions}
                selection={draft}
                onToggle={(option) => setDraft(toggleCardioOption(draft, option))}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDraft(ensureMandatoryCommonFields(
                  cloneSocialActivityFieldSelection(DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION),
                ))}
                disabled={disabled}
                className="min-h-10 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 disabled:opacity-60 dark:text-slate-300"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => onSaveFields(ensureMandatoryCommonFields(draft))}
                disabled={disabled || !changed}
                className="min-h-10 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
