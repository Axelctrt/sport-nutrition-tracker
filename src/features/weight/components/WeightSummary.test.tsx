import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { UserProfile } from '@/domain/models/profile';
import type { WeightEntry } from '@/domain/models/weight';
import { WeightSummary } from '@/features/weight/components/WeightSummary';

const metadata = {
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
};

const profile: UserProfile = {
  ...metadata,
  id: 'profile-1',
  sexForEnergyEquation: 'male',
  ageInformation: { mode: 'age', ageYears: 22, recordedOn: '2026-06-01' },
  heightCm: 177,
  initialWeightKg: 60,
  goal: 'gain',
  targetWeeklyWeightChangePercent: 0.25,
  occupationalActivity: 'sedentary',
  dailyStepGoal: 10_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.9,
};

const entries: WeightEntry[] = [
  { ...metadata, id: 'weight-1', date: '2026-06-10', weightKg: 60 },
  { ...metadata, id: 'weight-2', date: '2026-06-17', weightKg: 61 },
];

afterEach(cleanup);

describe('WeightSummary', () => {
  it('regroupe la dernière pesée, la moyenne et la variation', () => {
    render(<WeightSummary entries={entries} profile={profile} />);

    expect(screen.getByText('Dernière pesée')).toBeInTheDocument();
    expect(screen.getAllByText('61 kg')).toHaveLength(2);
    expect(screen.getByText('+1 kg')).toBeInTheDocument();
    expect(screen.getByText('Moyenne 7 j')).toBeInTheDocument();
    expect(screen.getByText('Écart trajectoire')).toBeInTheDocument();
  });

  it('utilise le poids initial avant la première pesée', () => {
    render(<WeightSummary entries={[]} profile={profile} />);

    expect(screen.getByText('Poids de référence')).toBeInTheDocument();
    expect(screen.getByText('60 kg')).toBeInTheDocument();
    expect(screen.getByText(/Ajoute une première pesée/)).toBeInTheDocument();
  });
});
