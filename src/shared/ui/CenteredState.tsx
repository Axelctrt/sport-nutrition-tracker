import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface CenteredStateProps {
  title: string;
  description: string;
  tone?: 'loading' | 'error';
}

export function CenteredState({
  title,
  description,
  tone = 'loading',
}: CenteredStateProps) {
  const Icon = tone === 'loading' ? LoaderCircle : CircleAlert;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md p-6 text-center" role={tone === 'error' ? 'alert' : 'status'}>
        <Icon
          aria-hidden="true"
          className={`mx-auto size-8 ${
            tone === 'loading'
              ? 'animate-spin text-brand-700 dark:text-brand-300'
              : 'text-red-700 dark:text-red-300'
          }`}
        />
        <h1 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-2 leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </Card>
    </main>
  );
}
