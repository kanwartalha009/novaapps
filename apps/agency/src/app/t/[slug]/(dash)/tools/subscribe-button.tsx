"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { subscribeTool } from "@/lib/actions";
import { PrimaryButton } from "@/components/overlay";

interface PlanLite { id: string; name: string; model: string; baseAmount: number; trialDays: number }

/** Self-serve subscribe — starts a trial on the tool's premium (or first paid) plan (P6). */
export function SubscribeButton({ toolId, plans }: { toolId: string; plans: PlanLite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const plan = plans.find((p) => p.model === "PREMIUM") ?? plans.find((p) => p.baseAmount > 0) ?? plans[0];
  if (!plan) return <span className="text-sm text-zinc-400">No plan available</span>;

  function go() {
    start(async () => {
      const res = await subscribeTool(toolId, plan!.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Started ${plan!.trialDays || 7}-day trial — ${plan!.name}`);
      router.refresh();
    });
  }

  return (
    <PrimaryButton onClick={go} disabled={pending}>
      {pending ? "Starting…" : plan.trialDays > 0 ? `Start ${plan.trialDays}-day trial` : `Subscribe — ${plan.name}`}
    </PrimaryButton>
  );
}
