import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  iconClassName?: string;
};

export function AdminStatCard({
  title,
  value,
  delta,
  deltaType = 'up',
  icon: Icon,
  iconClassName,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl text-white',
            iconClassName ?? 'bg-violet-500',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {delta && (
          <span
            className={cn(
              'rounded-full px-2 py-1 text-xs font-semibold',
              deltaType === 'up' && 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              deltaType === 'down' && 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
              deltaType === 'neutral' && 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-4xl/none font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
    </article>
  );
}

export function AdminPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm', className)}
    >
      {title && <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-50">{title}</h3>}
      {children}
    </section>
  );
}

export function AdminSectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-5xl/none font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
