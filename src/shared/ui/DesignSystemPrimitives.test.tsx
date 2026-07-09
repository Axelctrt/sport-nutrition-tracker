import { Activity, Flame, UserRound } from 'lucide-react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ChoiceCard, ChoiceCardGroup } from '@/shared/ui/ChoiceCard';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { FormField } from '@/shared/ui/FormField';
import { IconAction } from '@/shared/ui/IconAction';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { MetricCard } from '@/shared/ui/MetricCard';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { BodyText, PageTitle, SecondaryText, SectionTitle } from '@/shared/ui/Typography';
import { WheelPicker } from '@/shared/ui/WheelPicker';

describe('fondations du design system', () => {
  it('normalise les actions, cartes et niveaux typographiques', () => {
    render(
      <>
        <PageTitle title="Accueil" description="Votre journée" />
        <SectionTitle title="Aujourd’hui" />
        <BodyText>Texte principal</BodyText>
        <SecondaryText>Texte secondaire</SecondaryText>
        <Card variant="muted" padding="md">Contenu</Card>
        <Button loading loadingLabel="Enregistrement">Enregistrer</Button>
        <IconAction icon={Activity} label="Ajouter une activité" />
      </>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByText('Texte principal')).toHaveClass('text-base');
    expect(screen.getByText('Texte secondaire')).toHaveClass('text-sm');
    expect(screen.getByText('Contenu')).toHaveClass('bg-slate-50/90');
    expect(screen.getByRole('button', { name: 'Enregistrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enregistrement' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Ajouter une activité' })).toHaveAttribute('title', 'Ajouter une activité');
  });

  it('fournit des cartes de choix reposant sur des radios natives', () => {
    const onSelect = vi.fn();
    render(
      <ChoiceCardGroup label="Sexe">
        <ChoiceCard
          name="sex"
          value="male"
          title="Masculin"
          description="Profil masculin"
          icon={UserRound}
          selected
          onSelect={onSelect}
        />
        <ChoiceCard
          name="sex"
          value="female"
          title="Féminin"
          selected={false}
          onSelect={onSelect}
        />
      </ChoiceCardGroup>,
    );

    expect(screen.getByRole('group', { name: 'Sexe' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Masculin' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Féminin' }));
    expect(onSelect).toHaveBeenCalledWith('female');
  });

  it('expose correctement descriptions et erreurs aux champs', () => {
    render(
      <FormField
        id="weight"
        label="Poids"
        description="Votre poids actuel"
        error="Valeur obligatoire"
        required
      >
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: /Poids.*obligatoire/i });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'weight-description weight-error');
  });

  it('rend les métriques, aides et avertissements sans transmettre le sens par la couleur seule', () => {
    render(
      <>
        <MetricCard label="Calories restantes" value="1 420" unit="kcal" icon={Flame} tone="warning" />
        <ContextHelp><p>Cette donnée personnalise les estimations.</p></ContextHelp>
        <InlineNotice tone="warning" title="Vérification nécessaire">Contrôlez la valeur.</InlineNotice>
      </>,
    );

    expect(screen.getByText('Calories restantes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pourquoi cette information ?'));
    expect(screen.getByText('Cette donnée personnalise les estimations.')).toBeVisible();
    expect(screen.getByText('Vérification nécessaire')).toBeInTheDocument();
  });

  it('gère le clavier du contrôle segmenté', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Densité"
        value="comfortable"
        onChange={onChange}
        items={[
          { value: 'comfortable', label: 'Confortable' },
          { value: 'compact', label: 'Compact' },
        ]}
      />,
    );

    const comfortable = screen.getByRole('radio', { name: 'Confortable' });
    comfortable.focus();
    fireEvent.keyDown(comfortable, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith('compact');
    expect(screen.getByRole('radio', { name: 'Compact' })).toHaveFocus();
  });

  it('utilise le sélecteur natif pour bénéficier de la roue iOS', () => {
    const onChange = vi.fn();
    render(
      <WheelPicker
        label="Objectif de pas"
        value="7500"
        onChange={onChange}
        options={[
          { value: '5000', label: '5 000' },
          { value: '7500', label: '7 500' },
          { value: '10000', label: '10 000' },
        ]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Objectif de pas' }), {
      target: { value: '10000' },
    });
    expect(onChange).toHaveBeenCalledWith('10000');

    fireEvent.click(screen.getByRole('button', { name: 'Diminuer objectif de pas' }));
    expect(onChange).toHaveBeenCalledWith('5000');
  });
});
