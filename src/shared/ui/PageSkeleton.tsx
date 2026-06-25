import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

export type PageSkeletonVariant = 'dashboard' | 'list' | 'form' | 'workout' | 'detail';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  className?: string;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn('rounded-xl bg-slate-200 dark:bg-slate-800', className)} />;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-32" />
            <SkeletonBlock className="mt-4 h-2.5 w-full rounded-full" />
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-5">
        <SkeletonBlock className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    </>
  );
}

function ListSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock className="h-10 min-w-0 flex-1" />
        <SkeletonBlock className="h-10 w-24 shrink-0" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <SkeletonBlock className="h-5 w-2/3" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function FormSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-2 h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-7 flex justify-end gap-3">
        <SkeletonBlock className="h-11 w-28" />
        <SkeletonBlock className="h-11 w-36" />
      </div>
    </Card>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, exerciseIndex) => (
        <Card key={exerciseIndex} className="p-4 sm:p-5">
          <SkeletonBlock className="h-6 w-56 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-40 max-w-full" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }, (_, setIndex) => (
              <SkeletonBlock key={setIndex} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = 'list', className }: PageSkeletonProps) {
  return (
    <div
      className={cn('motion-safe:animate-pulse motion-reduce:animate-none', className)}
      role="status"
      aria-label="Chargement de la page"
      aria-busy="true"
    >
      <div aria-hidden="true">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-3 h-9 w-64 max-w-full" />
        <SkeletonBlock className="mt-3 mb-7 h-4 w-full max-w-xl" />

        {variant === 'dashboard' ? <DashboardSkeleton /> : null}
        {variant === 'list' || variant === 'detail' ? <ListSkeleton /> : null}
        {variant === 'form' ? <FormSkeleton /> : null}
        {variant === 'workout' ? <WorkoutSkeleton /> : null}
      </div>
      <span className="sr-only">Chargement de la page en cours.</span>
    </div>
  );
}
