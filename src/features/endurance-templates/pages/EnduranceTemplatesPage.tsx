import { zodResolver } from '@hookform/resolvers/zod';
import { CopyPlus, Pencil, Play, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  deleteEnduranceTemplate,
  duplicateEnduranceTemplate,
  listEnduranceTemplates,
  saveEnduranceTemplate,
  type EnduranceTemplateDraft,
} from '@/application/activities/enduranceTemplateService';
import { routePaths } from '@/app/routePaths';
import type { EnduranceTemplate } from '@/domain/models/activity';
import {
  activityTypeLabels,
  bikeTypeLabels,
  cyclingEnvironmentLabels,
  intensityLabels,
  runningSessionLabels,
  strokeLabels,
  swimmingSessionLabels,
  terrainLabels,
} from '@/features/activities/utils/activityLabels';
import {
  enduranceTemplateSchema,
  type EnduranceTemplateFormValues,
} from '@/features/endurance-templates/schemas/enduranceTemplateSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const optionalNumberRegistration = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
} as const;
const numberRegistration = { valueAsNumber: true } as const;

function initialValues(): EnduranceTemplateFormValues {
  return {
    name: '',
    activityType: 'running',
    durationMinutes: 45,
    intensity: 'moderate',
    notes: '',
    intervalDetails: '',
    runningSessionType: 'easy',
    swimmingSessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceKm: 7,
    distanceMeters: undefined,
    averageCadenceSpm: 170,
    elevationGainMeters: undefined,
    terrainType: 'road',
    poolLengthMeters: undefined,
    cyclingMet: 6.8,
    bikeType: 'road',
    cyclingEnvironment: 'outdoor',
  };
}

function templateToValues(template: EnduranceTemplate): EnduranceTemplateFormValues {
  return {
    ...initialValues(),
    name: template.name,
    activityType: template.activityType,
    durationMinutes: template.durationMinutes,
    intensity: template.intensity,
    notes: template.notes ?? '',
    intervalDetails: template.intervalDetails ?? '',
    runningSessionType: template.runningSessionType ?? 'easy',
    swimmingSessionType: template.swimmingSessionType ?? 'endurance',
    mainStroke: template.mainStroke ?? 'freestyle',
    distanceKm: template.distanceKm,
    distanceMeters: template.distanceMeters,
    averageCadenceSpm: template.averageCadenceSpm,
    elevationGainMeters: template.elevationGainMeters,
    terrainType: template.terrainType ?? 'road',
    poolLengthMeters: template.poolLengthMeters,
    cyclingMet: template.cyclingMet ?? 6.8,
    bikeType: template.bikeType ?? 'road',
    cyclingEnvironment: template.cyclingEnvironment ?? 'outdoor',
  };
}

function valuesToDraft(values: EnduranceTemplateFormValues): EnduranceTemplateDraft {
  const text = (value: string) => value.trim() || undefined;
  const notes = text(values.notes);
  const intervalDetails = text(values.intervalDetails);
  const common = {
    name: values.name,
    activityType: values.activityType,
    durationMinutes: values.durationMinutes,
    intensity: values.intensity,
    ...(notes === undefined ? {} : { notes }),
    ...(intervalDetails === undefined ? {} : { intervalDetails }),
  } as const;

  if (values.activityType === 'running') {
    return {
      ...common,
      activityType: 'running',
      runningSessionType: values.runningSessionType,
      ...(values.distanceKm === undefined ? {} : { distanceKm: values.distanceKm }),
      ...(values.averageCadenceSpm === undefined ? {} : { averageCadenceSpm: values.averageCadenceSpm }),
      ...(values.elevationGainMeters === undefined ? {} : { elevationGainMeters: values.elevationGainMeters }),
      terrainType: values.terrainType,
    };
  }
  if (values.activityType === 'swimming') {
    return {
      ...common,
      activityType: 'swimming',
      swimmingSessionType: values.swimmingSessionType,
      mainStroke: values.mainStroke,
      ...(values.distanceMeters === undefined ? {} : { distanceMeters: values.distanceMeters }),
      ...(values.poolLengthMeters === undefined ? {} : { poolLengthMeters: values.poolLengthMeters as 25 | 50 }),
    };
  }
  return {
    ...common,
    activityType: 'cycling',
    ...(values.distanceKm === undefined ? {} : { distanceKm: values.distanceKm }),
    ...(values.elevationGainMeters === undefined ? {} : { elevationGainMeters: values.elevationGainMeters }),
    ...(values.cyclingMet === undefined ? {} : { cyclingMet: values.cyclingMet }),
    bikeType: values.bikeType,
    cyclingEnvironment: values.cyclingEnvironment,
  };
}

function startPath(template: EnduranceTemplate): string {
  const base = template.activityType === 'running'
    ? routePaths.addRunningActivity
    : template.activityType === 'swimming'
      ? routePaths.addSwimmingActivity
      : routePaths.addOtherActivity;
  return `${base}?templateId=${encodeURIComponent(template.id)}`;
}

export function EnduranceTemplatesPage() {
  const [templates, setTemplates] = useState<EnduranceTemplate[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<EnduranceTemplate>();
  const form = useForm<EnduranceTemplateFormValues>({
    resolver: zodResolver(enduranceTemplateSchema),
    defaultValues: initialValues(),
  });
  const activityType = form.watch('activityType');

  const load = async () => {
    try {
      setTemplates(await listEnduranceTemplates());
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Les modèles ne peuvent pas être chargés.');
      setStatus('error');
    }
  };

  useEffect(() => { void load(); }, []);

  const editingTemplate = useMemo(
    () => templates.find((template) => template.id === editingId),
    [editingId, templates],
  );

  const resetEditor = () => {
    setEditingId(undefined);
    form.reset(initialValues());
  };

  const submit = async (values: EnduranceTemplateFormValues) => {
    setErrorMessage(undefined);
    try {
      await saveEnduranceTemplate(valuesToDraft(values), editingId);
      await load();
      resetEditor();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Le modèle ne peut pas être enregistré.');
    }
  };

  if (status === 'loading') return <PageSkeleton variant="list" />;

  return (
    <section className="min-w-0" aria-labelledby="endurance-templates-title">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Endurance</p>
      <h1 id="endurance-templates-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Modèles d’endurance</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Préremplis une course, une natation ou une sortie vélo sans automatiser ton programme.</p>

      {errorMessage ? <InlineNotice className="mt-4" tone="error" title="Opération impossible">{errorMessage}</InlineNotice> : null}

      <Card className="mt-5 p-4 sm:p-5">
        <h2 className="font-semibold text-slate-950 dark:text-white">{editingTemplate ? `Modifier : ${editingTemplate.name}` : 'Nouveau modèle'}</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
          <div className="sm:col-span-2"><FormField id="template-name" label="Nom" error={form.formState.errors.name?.message} required><input id="template-name" className={inputClassName} {...form.register('name')} /></FormField></div>
          <FormField id="template-type" label="Sport" error={form.formState.errors.activityType?.message} required><select id="template-type" className={inputClassName} {...form.register('activityType')}><option value="running">Course</option><option value="swimming">Natation</option><option value="cycling">Vélo</option></select></FormField>
          <FormField id="template-duration" label="Durée (min)" error={form.formState.errors.durationMinutes?.message} required><input id="template-duration" type="number" min="1" max="1440" className={inputClassName} {...form.register('durationMinutes', numberRegistration)} /></FormField>
          <FormField id="template-intensity" label="Intensité" error={form.formState.errors.intensity?.message}><select id="template-intensity" className={inputClassName} {...form.register('intensity')}>{Object.entries(intensityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>

          {activityType === 'running' ? <>
            <FormField id="template-running-type" label="Type de séance"><select id="template-running-type" className={inputClassName} {...form.register('runningSessionType')}>{Object.entries(runningSessionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormField id="template-distance-km" label="Distance (km)"><input id="template-distance-km" type="number" min="0.1" step="0.1" className={inputClassName} {...form.register('distanceKm', optionalNumberRegistration)} /></FormField>
            <FormField id="template-cadence" label="Cadence (pas/min)"><input id="template-cadence" type="number" min="50" max="300" className={inputClassName} {...form.register('averageCadenceSpm', optionalNumberRegistration)} /></FormField>
            <FormField id="template-terrain" label="Terrain"><select id="template-terrain" className={inputClassName} {...form.register('terrainType')}>{Object.entries(terrainLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
          </> : null}

          {activityType === 'swimming' ? <>
            <FormField id="template-swim-type" label="Type de séance"><select id="template-swim-type" className={inputClassName} {...form.register('swimmingSessionType')}>{Object.entries(swimmingSessionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormField id="template-stroke" label="Nage"><select id="template-stroke" className={inputClassName} {...form.register('mainStroke')}>{Object.entries(strokeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormField id="template-distance-m" label="Distance (m)"><input id="template-distance-m" type="number" min="25" step="25" className={inputClassName} {...form.register('distanceMeters', optionalNumberRegistration)} /></FormField>
            <FormField id="template-pool" label="Bassin"><select id="template-pool" className={inputClassName} {...form.register('poolLengthMeters', optionalNumberRegistration)}><option value="">Non renseigné</option><option value="25">25 m</option><option value="50">50 m</option></select></FormField>
          </> : null}

          {activityType === 'cycling' ? <>
            <FormField id="template-cycle-distance" label="Distance (km)"><input id="template-cycle-distance" type="number" min="0.1" step="0.1" className={inputClassName} {...form.register('distanceKm', optionalNumberRegistration)} /></FormField>
            <FormField id="template-cycle-met" label="Valeur MET"><input id="template-cycle-met" type="number" min="1" max="25" step="0.1" className={inputClassName} {...form.register('cyclingMet', optionalNumberRegistration)} /></FormField>
            <FormField id="template-bike-type" label="Type de vélo"><select id="template-bike-type" className={inputClassName} {...form.register('bikeType')}>{Object.entries(bikeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
            <FormField id="template-cycle-env" label="Environnement"><select id="template-cycle-env" className={inputClassName} {...form.register('cyclingEnvironment')}>{Object.entries(cyclingEnvironmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
          </> : null}

          {activityType !== 'swimming' ? <FormField id="template-elevation" label="Dénivelé positif (m)" description="Facultatif"><input id="template-elevation" type="number" min="0" step="1" className={inputClassName} {...form.register('elevationGainMeters', optionalNumberRegistration)} /></FormField> : null}
          <div className="sm:col-span-2"><FormField id="template-intervals" label="Intervalles ou blocs" description="Facultatif"><textarea id="template-intervals" rows={2} className={inputClassName} {...form.register('intervalDetails')} /></FormField></div>
          <div className="sm:col-span-2"><FormField id="template-notes" label="Notes" description="Facultatif"><textarea id="template-notes" rows={2} className={inputClassName} {...form.register('notes')} /></FormField></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit"><Save className="size-4" />{editingId ? 'Enregistrer' : 'Créer le modèle'}</Button>
            {editingId ? <Button type="button" variant="secondary" onClick={resetEditor}>Annuler</Button> : null}
          </div>
        </form>
      </Card>

      <div className="mt-5">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Mes modèles</h2>
        {templates.length === 0 ? <EmptyState className="mt-3" icon={Plus} title="Aucun modèle" description="Crée un modèle simple pour préremplir tes prochaines activités." /> : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-slate-950 dark:text-white">{template.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activityTypeLabels[template.activityType]} · {template.durationMinutes} min · {intensityLabels[template.intensity]}</p></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Link to={startPath(template)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800"><Play className="size-4" />Utiliser</Link>
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(template.id); form.reset(templateToValues(template)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil className="size-4" />Modifier</Button>
                  <Button size="sm" variant="secondary" onClick={() => void duplicateEnduranceTemplate(template.id).then(load).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Duplication impossible.'))}><CopyPlus className="size-4" />Dupliquer</Button>
                  <Button size="sm" variant="dangerGhost" onClick={() => setDeleteTarget(template)}><Trash2 className="size-4" />Supprimer</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Supprimer ce modèle ?"
        description={deleteTarget ? `« ${deleteTarget.name} » sera supprimé. Les activités déjà enregistrées ne seront pas modifiées.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteEnduranceTemplate(deleteTarget.id).then(async () => {
            setDeleteTarget(undefined);
            await load();
          }).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Suppression impossible.'));
        }}
      />
    </section>
  );
}
