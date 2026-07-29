export function formatGoalValue(
  value: number,
  unit: string,
): string {
  const maximumFractionDigits = unit === 'km' ? 1 : 2;

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits,
  }).format(value)} ${unit}`;
}
