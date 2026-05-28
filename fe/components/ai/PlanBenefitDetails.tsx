'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getPlanBenefitGroups } from '@/lib/ai-plan-benefits';
import type { AiPlanCatalogItem } from '@/lib/ai-billing.service';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

type PlanBenefitDetailsProps = {
  plan: AiPlanCatalogItem;
  className?: string;
};

export function PlanBenefitDetails({ plan, className }: PlanBenefitDetailsProps) {
  const groups = getPlanBenefitGroups(plan);
  if (groups.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('w-full text-xs', className)}>
          Xem chi tiết gói
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết gói {plan.name}</DialogTitle>
          <DialogDescription>
            Các quyền lợi và giới hạn đang áp dụng cho gói này.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.title} className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
