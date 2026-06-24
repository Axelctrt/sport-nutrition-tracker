const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 0);

  return date.getFullYear() === year
    && date.getMonth() === (month ?? 1) - 1
    && date.getDate() === day;
}
