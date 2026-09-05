/**
 * The quantity and labour constants from docs/01 §6.
 *
 * docs/01 is explicit that these are "industry-typical starting points, not
 * claims about any particular job", and that the owner tunes them in admin
 * against a few real past quotes. Every BOM quantity in Sprint 2 is a formula
 * over these keys, so tuning one number re-prices every package at once.
 *
 * vat_rate is deliberately absent: site_settings.vat_rate owns it. Two editable
 * copies of the VAT rate is how a quotation ends up disagreeing with an invoice.
 */
import type { NewPricingRule } from "../schema";

export const pricingRuleSeed: NewPricingRule[] = [
  {
    key: "cable_m_per_camera_residential",
    value: "30",
    unit: "m",
    label: "Cable per camera, residential",
    description:
      "Metres of cable assumed for one camera run on a house. Tune this against a few completed jobs before trusting it on a large quote.",
    group: "Cable and containment",
    sortOrder: 10,
  },
  {
    key: "cable_m_per_camera_commercial",
    value: "45",
    unit: "m",
    label: "Cable per camera, commercial",
    description:
      "Metres of cable assumed for one camera run on a commercial site, where runs are longer and routes less direct.",
    group: "Cable and containment",
    sortOrder: 20,
  },
  {
    key: "cable_wastage_factor",
    value: "1.15",
    unit: "x",
    label: "Cable wastage factor",
    description:
      "Slack for drops, re-runs and termination. 1.15 adds 15% to the measured run.",
    group: "Cable and containment",
    sortOrder: 30,
  },
  {
    key: "trunking_m_per_camera",
    value: "12",
    unit: "m",
    label: "Trunking per camera",
    description: "Metres of containment per camera. Trunking is sold in 2 m lengths.",
    group: "Cable and containment",
    sortOrder: 40,
  },
  {
    key: "junction_box_per_camera",
    value: "1",
    unit: "each",
    label: "Junction boxes per camera",
    description: "Adapter or junction box at each camera position.",
    group: "Components",
    sortOrder: 50,
  },
  {
    key: "balun_pairs_per_analog_camera",
    value: "1",
    unit: "pair",
    label: "Balun pairs per analog camera",
    description: "Video baluns, one pair per analog camera where cable is UTP rather than coax.",
    group: "Components",
    sortOrder: 60,
  },
  {
    key: "connectors_per_camera",
    value: "4",
    unit: "each",
    label: "Connectors per camera",
    description: "BNC and DC connectors, both ends of the run.",
    group: "Components",
    sortOrder: 70,
  },
  {
    key: "cameras_per_psu_12v_10a",
    value: "8",
    unit: "cameras",
    label: "Cameras per 12V 10A power supply",
    description: "How many analog cameras one boxed power supply carries.",
    group: "Components",
    sortOrder: 80,
  },
  {
    key: "poe_ports_headroom",
    value: "1.25",
    unit: "x",
    label: "PoE port headroom",
    description:
      "Switch sizing multiplier for IP systems, so the switch is not full on the day it is installed.",
    group: "Components",
    sortOrder: 90,
  },
  {
    key: "hdd_gb_per_channel_per_day_2mp",
    value: "12",
    unit: "GB",
    label: "Storage per 2MP channel per day",
    description:
      "Gigabytes one 2MP camera writes in a day. Storage = channels x this x retention days, rounded up to the next stocked disk.",
    group: "Storage",
    sortOrder: 100,
  },
  {
    key: "hdd_gb_per_channel_per_day_4mp",
    value: "22",
    unit: "GB",
    label: "Storage per 4MP channel per day",
    description: "Gigabytes one 4MP camera writes in a day.",
    group: "Storage",
    sortOrder: 110,
  },
  {
    key: "hdd_gb_per_channel_per_day_8mp",
    value: "45",
    unit: "GB",
    label: "Storage per 8MP channel per day",
    description: "Gigabytes one 8MP camera writes in a day.",
    group: "Storage",
    sortOrder: 120,
  },
  {
    key: "labour_per_camera_point",
    value: "3000",
    unit: "KES",
    label: "Labour per camera point",
    description:
      "Installation, termination, aiming and configuration for one camera. Within the published Kenyan range of 2,500 to 5,000.",
    group: "Labour",
    sortOrder: 130,
  },
  {
    key: "labour_per_data_point",
    value: "4500",
    unit: "KES",
    label: "Labour per data point",
    description: "One structured cabling outlet, terminated and tested.",
    group: "Labour",
    sortOrder: 140,
  },
  {
    key: "labour_per_access_door",
    value: "8000",
    unit: "KES",
    label: "Labour per access-control door",
    description: "Reader, lock, power and controller wiring for one door.",
    group: "Labour",
    sortOrder: 150,
  },
  {
    key: "labour_per_fence_metre",
    value: "300",
    unit: "KES",
    label: "Labour per fence metre",
    description: "Electric fence installation, per metre of perimeter.",
    group: "Labour",
    sortOrder: 160,
  },
  {
    key: "travel_fee_coast",
    value: "0",
    unit: "KES",
    label: "Travel, coast",
    description: "No travel charge inside Mombasa, Kilifi and Kwale.",
    group: "Travel",
    sortOrder: 170,
  },
  {
    key: "travel_fee_nairobi",
    value: "0",
    unit: "KES",
    label: "Travel, Nairobi",
    description: "Nairobi is served on request only and is not marketed (CLAUDE.md 1).",
    group: "Travel",
    sortOrder: 180,
  },
  {
    key: "travel_fee_upcountry",
    value: "5000",
    unit: "KES",
    label: "Travel, upcountry",
    description: "Outside the home counties.",
    group: "Travel",
    sortOrder: 190,
  },
];
