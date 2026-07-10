"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { billingService } from "@/services/api/platform-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => billingService.get(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => billingService.checkout(planId),
    onSuccess: (res) => {
      if (res.data.redirect_url) {
        window.open(res.data.redirect_url, "_blank");
      } else {
        toast.success("Plan updated");
      }
    },
  });

  const billing = data?.data;
  const currentSlug = billing?.current_plan.slug ?? "free";

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription and usage" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {billing?.plans.map((plan) => (
            <Card key={plan.id} className={currentSlug === plan.slug ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {currentSlug === plan.slug && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    ${plan.price_monthly}
                  </span>
                  /month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {(plan.features ?? []).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                {currentSlug !== plan.slug && (
                  <Button
                    className="w-full"
                    variant={plan.slug === "pro" ? "default" : "outline"}
                    onClick={() => checkoutMutation.mutate(plan.id)}
                    disabled={checkoutMutation.isPending}
                  >
                    {plan.price_monthly === 0 ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
