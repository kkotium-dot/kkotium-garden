// Garden navigation labels — TypeScript view over the JSON dictionary.
// All Korean strings live in garden-nav.ko.json (rule #35). This module
// only re-exports the typed shape so callers stay in TS-land.

import raw from "./garden-nav.ko.json";

export type BadgeKey = "sourcing" | "zombie" | "orders" | "draft" | "oos";

export interface GardenNavItem {
  key: string;
  href: string;
  ko: string;
  en: string;
  icon: string;
  badgeKey?: BadgeKey;
}

export interface GardenNavSection {
  key: string;
  label: string;
  items: GardenNavItem[];
}

export interface GardenNavDict {
  brand: { primary: string; secondary: string };
  sections: GardenNavSection[];
  mascot: { ko: string; en: string; note: string };
}

const dict = raw as unknown as GardenNavDict;

export const gardenNav: GardenNavDict = {
  brand: dict.brand,
  sections: dict.sections,
  mascot: dict.mascot,
};
