import { zodResolver } from '@hookform/resolvers/zod';
import { Barcode, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

type SearchMode = 'text' | 'barcode';

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
  const [mode, setMode] = useState<SearchMode>('text');
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const textForm = useForm<OpenFoodFactsTextSearchValues>({
    resolver: zodResolver(openFoodFactsTextSearchSchema),
    defaultValues: { query: '' },
  });
  const barcodeForm = useForm<OpenFoodFactsBarcodeSearchValues>({
    resolver: zodResolver(openFoodFactsBarcodeSearchSchema),
    defaultValues: { barcode: '' },
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (mode === 'text') textInputRef.current?.focus();
      else barcodeInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const textRegistration = textForm.register('query');
  const barcodeRegistration = barcodeForm.register('barcode');

  return (
    <div>
      <div className="grid grid-cols-2 gap-2" aria-label="Type de recherche">
        <Button
          type="button"
          variant={mode === 'text' ? 'primary' : 'secondary'}
          aria-pressed={mode === 'text'}
          onClick={() => setMode('text')}
        >
          <Search aria-hidden="true" className="size-4" />
          Nom ou marque
        </Button>
        <Button
          type="button"
          variant={mode === 'barcode' ? 'primary' : 'secondary'}
          aria-pressed={mode === 'barcode'}
          onClick={() => setMode('barcode')}
        >
          <Barcode aria-hidden="true" className="size-4" />
          Code-barres
        </Button>
      </div>

      {mode === 'text' ? (
        <form
          noValidate
          className="mt-5"
          onSubmit={textForm.handleSubmit(async (values) => {
            const parsed = openFoodFactsTextSearchSchema.parse(values);
            await onTextSearch(parsed.query);
          })}
        >
          <FormField
            id="off-text-query"
            label="Nom ou marque"
            description="La requête est envoyée uniquement lorsque tu appuies sur Rechercher."
            error={textForm.formState.errors.query?.message}
            required
          >
            <input
              id="off-text-query"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              className={inputClassName}
              placeholder="Ex. yaourt grec"
              aria-invalid={Boolean(textForm.formState.errors.query)}
              {...textRegistration}
              ref={(element) => {
                textRegistration.ref(element);
                textInputRef.current = element;
              }}
            />
          </FormField>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={loading}>
            <Search aria-hidden="true" className="size-4" />
            {loading ? 'Recherche en cours…' : 'Rechercher'}
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="mt-5"
          onSubmit={barcodeForm.handleSubmit(async (values) => {
            const parsed = openFoodFactsBarcodeSearchSchema.parse(values);
            await onBarcodeSearch(parsed.barcode);
          })}
        >
          <FormField
            id="off-barcode"
            label="Code-barres"
            description="Saisis les chiffres imprimés sous le code-barres du produit."
            error={barcodeForm.formState.errors.barcode?.message}
            required
          >
            <input
              id="off-barcode"
              type="text"
              inputMode="numeric"
              enterKeyHint="search"
              autoComplete="off"
              className={`${inputClassName} font-mono`}
              placeholder="Ex. 3017624010701"
              aria-invalid={Boolean(barcodeForm.formState.errors.barcode)}
              {...barcodeRegistration}
              ref={(element) => {
                barcodeRegistration.ref(element);
                barcodeInputRef.current = element;
              }}
            />
          </FormField>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={loading}>
            <Barcode aria-hidden="true" className="size-4" />
            {loading ? 'Recherche en cours…' : 'Rechercher le code'}
          </Button>
        </form>
      )}
    </div>
  );
}
