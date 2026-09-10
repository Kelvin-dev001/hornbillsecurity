import { asc } from "drizzle-orm";

import { AdminHeading, FormMessage, Panel, inputClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { pricingRules } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { savePricingRulesAction } from "@/lib/admin/settings-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quantity rules" };

/**
 * The constants every bill of materials is a formula over.
 *
 * docs/01 §6: "cable runs, trunking and labour genuinely vary by site. So we do
 * not hardcode them." Change one number here and all seventeen packages and
 * every builder result re-price — which is also why the page says so plainly
 * before the owner starts typing.
 */
export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;

  const rules = await db.select().from(pricingRules).orderBy(asc(pricingRules.sortOrder));

  const groups = new Map<string, typeof rules>();
  for (const rule of rules) {
    const bucket = groups.get(rule.group) ?? [];
    bucket.push(rule);
    groups.set(rule.group, bucket);
  }

  return (
    <>
      <AdminHeading
        title="Quantity rules"
        description="What a bill of materials assumes about a job. Changing one of these re-prices every package and every system somebody builds on the site."
      />

      <FormMessage status={status} />

      <form action={savePricingRulesAction} className="space-y-6">
        {[...groups].map(([group, groupRules]) => (
          <Panel key={group} title={group}>
            <div className="space-y-4">
              {groupRules.map((rule) => (
                <div key={rule.key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
                  <div>
                    <label htmlFor={`rule:${rule.key}`} className="text-sm font-medium text-ink">
                      {rule.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground/70">
                      {rule.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={`rule:${rule.key}`}
                      name={`rule:${rule.key}`}
                      defaultValue={String(Number(rule.value))}
                      inputMode="decimal"
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">{rule.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))}

        <Button type="submit" size="cta">
          Save all rules
        </Button>
      </form>
    </>
  );
}
