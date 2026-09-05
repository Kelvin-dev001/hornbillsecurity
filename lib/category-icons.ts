import {
  BatteryCharging,
  Boxes,
  Cable,
  Camera,
  Cctv,
  ClipboardCheck,
  DoorOpen,
  Fence,
  Fingerprint,
  Flame,
  Fuel,
  GraduationCap,
  HardDrive,
  House,
  type LucideIcon,
  MapPin,
  MonitorPlay,
  MonitorSpeaker,
  Move,
  Network,
  ParkingMeter,
  Plug,
  Radio,
  ScanSearch,
  Server,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * `categories.icon` holds a lucide icon name as a string, so the owner can
 * change it from admin. Resolving it needs an explicit map: lucide-react has no
 * safe dynamic lookup that survives tree-shaking, and importing the whole icon
 * set to index it would put every icon in the bundle.
 *
 * An unknown name falls back to a generic box rather than throwing — a bad icon
 * is a cosmetic problem, and a category page that 500s is not.
 */
const ICONS: Record<string, LucideIcon> = {
  "battery-charging": BatteryCharging,
  cable: Cable,
  camera: Camera,
  cctv: Cctv,
  "clipboard-check": ClipboardCheck,
  "door-open": DoorOpen,
  fence: Fence,
  fingerprint: Fingerprint,
  flame: Flame,
  fuel: Fuel,
  "graduation-cap": GraduationCap,
  "hard-drive": HardDrive,
  house: House,
  "map-pin": MapPin,
  "monitor-play": MonitorPlay,
  "monitor-speaker": MonitorSpeaker,
  move: Move,
  network: Network,
  "parking-meter": ParkingMeter,
  plug: Plug,
  radio: Radio,
  "scan-search": ScanSearch,
  server: Server,
  sun: Sun,
  wrench: Wrench,
  zap: Zap,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Boxes;
}
