import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'slate';

const toneClasses: Record<Tone, string> = {
  blue: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
  amber:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
  violet:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200',
  slate:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
};

const iconToneClasses: Record<Tone, string> = {
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
};

export function MentorPanel({
  id,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  id?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-xl border border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50',
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>}
            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  );
}

export function MentorMetricCard({
  title,
  value,
  icon: Icon,
  tone = 'blue',
  meta,
  className,
  iconClassName,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  meta?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <article
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{value}</p>
          {meta && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{meta}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconToneClasses[tone], iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

export function MentorPageHeader({
  title,
  description,
  eyebrow = 'Mentor workspace',
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}

export function MentorStatusBadge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function MentorFilterChip({
  active,
  count,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  count?: number;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
        active
          ? 'border-sky-600 bg-sky-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {typeof count === 'number' && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[11px]', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
          {count}
        </span>
      )}
    </button>
  );
}

export function MentorEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-950',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function MentorInfoBanner({
  icon: Icon,
  title,
  description,
  tone = 'blue',
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border p-4', toneClasses[tone], className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconToneClasses[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            {description && <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
