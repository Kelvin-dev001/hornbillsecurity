import {
  PROPERTY_TYPES,
  SITE_LOCATIONS,
  type CctvAnswers,
  type PropertyType,
  type SiteLocation,
} from "@/lib/pricing/cctv";
import type { BuilderOverrides } from "./builder";
import type { RawSearchParams } from "./search-params";

/**
 * The builder's whole state, in the URL.
 *
 * Every answer and every swap is a query parameter, so the page is a plain
 * server component: the bill of materials is in the initial HTML on every
 * variation, it works with JavaScript off, and any configuration can be pasted
 * into WhatsApp as a link. docs/03 §0 — a client-rendered price table does not
 * exist as far as an answer engine is concerned.
 *
 * Values that are not recognised fall back to the default rather than erroring,
 * so a hand-edited or crawler-invented URL still renders a sensible system.
 */

/** docs/01 §6 rounds the defaults to a system most Mombasa homes actually buy. */
export const BUILDER_DEFAULTS: CctvAnswers = {
  propertyType: "home",
  cameras: 4,
  outdoorCameras: 4,
  technology: "analog",
  colourAtNight: true,
  retentionDays: 14,
  location: "mombasa",
};

export const RETENTION_CHOICES = [7, 14, 21, 30, 60] as const;
export const CAMERA_CHOICES = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32] as const;
export const CABLE_CHOICES = [20, 30, 45, 60] as const;

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  home: "House",
  apartment: "Apartment",
  shop: "Shop or duka",
  office: "Office",
  warehouse: "Warehouse",
  school: "School",
  estate: "Estate",
  farm: "Farm or site",
};

export const LOCATION_LABELS: Record<SiteLocation, string> = {
  mombasa: "Mombasa Island",
  coast: "Coast — Nyali, Bamburi, Mtwapa, Diani, Kilifi",
  upcountry: "Upcountry or elsewhere",
};

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function parseBuilderAnswers(params: RawSearchParams): CctvAnswers {
  const propertyType = single(params.property);
  const technology = single(params.tech);
  const location = single(params.where);

  const cameras = clampInt(single(params.cameras), BUILDER_DEFAULTS.cameras, 1, 32);

  return {
    propertyType: (PROPERTY_TYPES as readonly string[]).includes(propertyType ?? "")
      ? (propertyType as PropertyType)
      : BUILDER_DEFAULTS.propertyType,
    cameras,
    outdoorCameras: clampInt(single(params.outdoor), cameras, 0, cameras),
    technology: technology === "ip" ? "ip" : technology === "analog" ? "analog" : BUILDER_DEFAULTS.technology,
    colourAtNight: single(params.colour) === undefined
      ? BUILDER_DEFAULTS.colourAtNight
      : single(params.colour) !== "no",
    retentionDays: clampInt(single(params.days), BUILDER_DEFAULTS.retentionDays, 1, 90),
    location: (SITE_LOCATIONS as readonly string[]).includes(location ?? "")
      ? (location as SiteLocation)
      : BUILDER_DEFAULTS.location,
    coastSpec: single(params.coast) === "yes",
  };
}

export function parseBuilderOverrides(params: RawSearchParams): BuilderOverrides {
  const cable = single(params.cable);
  return {
    cameraSku: single(params.camera),
    storageSku: single(params.storage),
    cablePerCamera: cable ? clampInt(cable, 30, 5, 200) : undefined,
  };
}

/** The parameter names, so a link builder cannot misspell one. */
export type BuilderParamName =
  | "property"
  | "cameras"
  | "outdoor"
  | "tech"
  | "colour"
  | "days"
  | "where"
  | "coast"
  | "camera"
  | "storage"
  | "cable";

/**
 * A link to the same page with one answer changed.
 *
 * Swapping the technology drops the camera override, because an analog model is
 * not a choice on an IP system and carrying it over would silently price the
 * wrong camera.
 */
export function builderHref(
  current: RawSearchParams,
  change: Partial<Record<BuilderParamName, string | number | undefined>>,
): string {
  const params = new URLSearchParams();

  const names: BuilderParamName[] = [
    "property",
    "cameras",
    "outdoor",
    "tech",
    "colour",
    "days",
    "where",
    "coast",
    "camera",
    "storage",
    "cable",
  ];

  for (const name of names) {
    const existing = single(current[name]);
    if (existing !== undefined) params.set(name, existing);
  }

  for (const [name, value] of Object.entries(change)) {
    if (value === undefined || value === "") params.delete(name);
    else params.set(name, String(value));
  }

  if (change.tech !== undefined) {
    params.delete("camera");
    params.delete("storage");
  }
  if (change.cameras !== undefined || change.days !== undefined) {
    params.delete("storage");
    params.delete("outdoor");
  }

  const query = params.toString();
  return query ? `/build/cctv?${query}` : "/build/cctv";
}
