import type { ProgressPhotoView } from '@/domain/models/progressPhoto';

export const progressPhotoViewLabels: Record<ProgressPhotoView, string> = {
  front: 'Face',
  left: 'Profil gauche',
  right: 'Profil droit',
  back: 'Dos',
  free: 'Libre',
};

export function formatProgressPhotoDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(parsed);
}

export function formatProgressPhotoSize(bytes: number): string {
  if (!(bytes > 0)) return '0 octet';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
