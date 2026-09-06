/**
 * Storage sizing.
 *
 * docs/01 §6: "HDD_GB = channels × gb_per_channel_per_day(resolution) ×
 * retention_days, then round up to the next stocked disk size. Publish the
 * formula on the page — it becomes a quotable fact and an AI-citable answer."
 *
 * So the formula is exported as text as well as code, and the page renders both
 * the sentence and the arithmetic that produced this particular disk.
 */
/** The pricing_rules key that governs a given camera resolution. */
export function storageRuleKey(resolutionMp: number): string {
  if (resolutionMp <= 2) return "hdd_gb_per_channel_per_day_2mp";
  if (resolutionMp <= 6) return "hdd_gb_per_channel_per_day_4mp";
  return "hdd_gb_per_channel_per_day_8mp";
}

/**
 * Stocked surveillance drives, by the capacity printed on the box.
 *
 * Decimal GB, as drive manufacturers and every Kenyan listing quote it. A "1 TB"
 * drive formats to about 931 GiB, so this sizing is very slightly optimistic —
 * which is why the output is labelled an indicative estimate and confirmed at
 * survey, and why retention is the first thing to check on a full disk.
 */
export const STOCKED_DISK_SKUS = ["HDD-1TB", "HDD-2TB", "HDD-4TB", "HDD-8TB"] as const;

const DISK_CAPACITY_GB: Record<string, number> = {
  "HDD-1TB": 1000,
  "HDD-2TB": 2000,
  "HDD-4TB": 4000,
  "HDD-8TB": 8000,
};

export const STORAGE_FORMULA_TEXT =
  "storage = cameras × GB per camera per day × days of footage kept";

export type StorageSizing = {
  requiredGb: number;
  gbPerChannelPerDay: number;
  channels: number;
  retentionDays: number;
  /** The disk chosen, and how many of it. */
  sku: string;
  count: number;
  capacityGb: number;
  /** Human sentence for the page, with the real numbers in it. */
  explanation: string;
};

/**
 * Sizes the storage and picks the smallest stocked disk that covers it.
 *
 * Above 8 TB it uses several of the largest disk, and the caller is expected to
 * have chosen a recorder with the bays for them — the 32-channel NVRs carry two
 * and four respectively.
 */
export function sizeStorage(options: {
  channels: number;
  gbPerChannelPerDay: number;
  retentionDays: number;
  /** Published, priced items. Only sku is read. */
  available: { sku: string }[];
}): StorageSizing {
  const { channels, gbPerChannelPerDay, retentionDays, available } = options;

  const requiredGb = Math.ceil(channels * gbPerChannelPerDay * retentionDays);

  const disks = STOCKED_DISK_SKUS.map((sku) => available.find((item) => item.sku === sku))
    .filter((item): item is { sku: string } => item !== undefined)
    .sort((a, b) => DISK_CAPACITY_GB[a.sku] - DISK_CAPACITY_GB[b.sku]);

  if (disks.length === 0) {
    throw new Error("No surveillance drives are published, so storage cannot be sized.");
  }

  const single = disks.find((disk) => DISK_CAPACITY_GB[disk.sku] >= requiredGb);
  const largest = disks[disks.length - 1];

  const chosen = single ?? largest;
  const capacityGb = DISK_CAPACITY_GB[chosen.sku];
  const count = single ? 1 : Math.ceil(requiredGb / capacityGb);

  const disk = `${count > 1 ? `${count} × ` : ""}${capacityGb / 1000} TB`;
  const explanation =
    `${channels} camera${channels === 1 ? "" : "s"} × ${gbPerChannelPerDay} GB a day × ` +
    `${retentionDays} days = ${requiredGb.toLocaleString("en-KE")} GB, so ${disk}.`;

  return {
    requiredGb,
    gbPerChannelPerDay,
    channels,
    retentionDays,
    sku: chosen.sku,
    count,
    capacityGb,
    explanation,
  };
}
