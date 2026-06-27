import type { EnduranceTemplate } from '@/domain/models/activity';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { createEntityId } from '@/shared/utils/entities';

export type EnduranceTemplateDraft = Omit<EnduranceTemplate, 'id'>;

export interface EnduranceTemplateDependencies {
  settings: Pick<SettingsRepository, 'get' | 'update'>;
  createId: () => string;
}

const defaultDependencies: EnduranceTemplateDependencies = {
  settings: repositories.settings,
  createId: createEntityId,
};

export async function listEnduranceTemplates(
  dependencies: EnduranceTemplateDependencies = defaultDependencies,
): Promise<EnduranceTemplate[]> {
  const settings = await dependencies.settings.get();
  return [...(settings.enduranceTemplates ?? [])];
}

export async function saveEnduranceTemplate(
  draft: EnduranceTemplateDraft,
  templateId?: string,
  dependencies: EnduranceTemplateDependencies = defaultDependencies,
): Promise<EnduranceTemplate> {
  const settings = await dependencies.settings.get();
  const current = settings.enduranceTemplates ?? [];
  const normalizedName = draft.name.trim();
  if (!normalizedName) throw new Error('Le nom du modèle est obligatoire.');

  const duplicate = current.find((template) => (
    template.id !== templateId
    && template.name.trim().toLocaleLowerCase('fr-FR') === normalizedName.toLocaleLowerCase('fr-FR')
  ));
  if (duplicate) throw new Error('Un modèle d’endurance porte déjà ce nom.');

  const saved: EnduranceTemplate = {
    ...draft,
    name: normalizedName,
    id: templateId ?? dependencies.createId(),
  };
  const next = templateId
    ? current.map((template) => (template.id === templateId ? saved : template))
    : [...current, saved];

  await dependencies.settings.update({
    enduranceTemplates: next,
    enduranceTemplatesVersion: 1,
  });
  return saved;
}

export async function deleteEnduranceTemplate(
  templateId: string,
  dependencies: EnduranceTemplateDependencies = defaultDependencies,
): Promise<void> {
  const settings = await dependencies.settings.get();
  await dependencies.settings.update({
    enduranceTemplates: (settings.enduranceTemplates ?? []).filter((template) => template.id !== templateId),
    enduranceTemplatesVersion: 1,
  });
}

export async function duplicateEnduranceTemplate(
  templateId: string,
  dependencies: EnduranceTemplateDependencies = defaultDependencies,
): Promise<EnduranceTemplate> {
  const settings = await dependencies.settings.get();
  const source = (settings.enduranceTemplates ?? []).find((template) => template.id === templateId);
  if (!source) throw new Error('Ce modèle est introuvable.');

  return saveEnduranceTemplate(
    { ...source, name: `${source.name} — copie` },
    undefined,
    dependencies,
  );
}
