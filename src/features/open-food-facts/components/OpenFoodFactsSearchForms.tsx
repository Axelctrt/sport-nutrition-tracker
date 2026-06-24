import { zodResolver } from '@hookform/resolvers/zod';
import { Barcode, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  openFoodFactsBarcodeSearchSchema,
  openFoodFactsTextSearchSchema,
  type OpenFoodFactsBarcodeSearchValues,
  type OpenFoodFactsTextSearchValues,
} from '@/features/open-food-facts/schemas/openFoodFactsSearchSchema';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';

interface OpenFoodFactsSearchFormsProps {
  loading: boolean;
  onTextSearch: (query: string) => Promise<void>;
  onBarcodeSearch: (barcode: string) => Promise<void>;
}

export function OpenFoodFactsSearchForms({
  loading,
  onTextSearch,
  onBarcodeSearch,
}: OpenFoodFactsSearchFormsProps) {
  const textForm = useForm<OpenFoodFactsTextSearchValues>({
    resolver: zodResolver(openFoodFactsTextSearchSchema),
    defaultValues: { query: '' },
  });
  const barcodeForm = useForm<OpenFoodFactsBarcodeSearchValues>({
    resolver: zodResolver(openFoodFactsBarcodeSearchSchema),
    defaultValues: { barcode: '' },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        noValidate
        className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
        onSubmit={textForm.handleSubmit(async (values) => {
          const parsed = openFoodFactsTextSearchSchema.parse(values);
          await onTextSearch(parsed.query);
        })}
      >
        <div className="flex items-center gap-3">
          <Search aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
          <h2 className="font-semibold text-slate-950 dark:text-white">Recherche textuelle</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Lance la recherche avec le bouton. Aucune requête n’est envoyée pendant la saisie.
        </p>
        <div className="mt-4">
        <FormField
          id="off-text-query"
          label="Nom ou marque"
          error={textForm.formState.errors.query?.message}
          required
        >
          <input
            id="off-text-query"
            type="search"
            autoComplete="off"
            className={inputClassName}
            placeholder="Ex. yaourt grec"
            aria-invalid={Boolean(textForm.formState.errors.query)}
            {...textForm.register('query')}
          />
        </FormField>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={loading}>
          <Search aria-hidden="true" className="size-4" />
          Rechercher
        </Button>
      </form>

      <form
        noValidate
        className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
        onSubmit={barcodeForm.handleSubmit(async (values) => {
          const parsed = openFoodFactsBarcodeSearchSchema.parse(values);
          await onBarcodeSearch(parsed.barcode);
        })}
      >
        <div className="flex items-center gap-3">
          <Barcode aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
          <h2 className="font-semibold text-slate-950 dark:text-white">Code-barres</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Le scan caméra reste préparé pour une évolution ultérieure. La saisie manuelle fonctionne dès maintenant.
        </p>
        <div className="mt-4">
        <FormField
          id="off-barcode"
          label="Code-barres"
          error={barcodeForm.formState.errors.barcode?.message}
          required
        >
          <input
            id="off-barcode"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputClassName}
            placeholder="Ex. 3017624010701"
            aria-invalid={Boolean(barcodeForm.formState.errors.barcode)}
            {...barcodeForm.register('barcode')}
          />
        </FormField>
        </div>
        <Button type="submit" variant="secondary" className="mt-4 w-full" disabled={loading}>
          <Barcode aria-hidden="true" className="size-4" />
          Rechercher le code
        </Button>
      </form>
    </div>
  );
}
