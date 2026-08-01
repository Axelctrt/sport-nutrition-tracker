import { lazy, Suspense } from 'react';

import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const ProgressionWithPhotosPage = lazy(() =>
  import('@/features/progress-photos/pages/ProgressionWithPhotosPage').then((module) => ({
    default: module.ProgressionWithPhotosPage,
  })),
);

const ProgressPhotosPage = lazy(() =>
  import('@/features/progress-photos/pages/ProgressPhotosPage').then((module) => ({
    default: module.ProgressPhotosPage,
  })),
);

const ProgressPhotoComparePage = lazy(() =>
  import('@/features/progress-photos/pages/ProgressPhotoComparePage').then((module) => ({
    default: module.ProgressPhotoComparePage,
  })),
);

export function LazyProgressionWithPhotosPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <ProgressionWithPhotosPage />
    </Suspense>
  );
}

export function LazyProgressPhotosPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <ProgressPhotosPage />
    </Suspense>
  );
}

export function LazyProgressPhotoComparePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <ProgressPhotoComparePage />
    </Suspense>
  );
}
