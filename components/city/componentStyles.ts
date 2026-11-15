import type {
  ComponentCategory,
  ComponentStatus,
  DependencyType,
} from "@/types/infrastructure";

export const STATUS_COLOR: Record<ComponentStatus, string> = {
  operational: "#3FA7D6",
  backup: "#9B6FD1",
  degraded: "#E0A030",
  offline: "#D9482B",
};

export const STATUS_LABEL: Record<ComponentStatus, string> = {
  operational: "Operational",
  backup: "On backup",
  degraded: "Degraded",
  offline: "Offline",
};

export const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  electrical: "Electrical",
  water: "Water",
  transit: "Transit",
  comms: "Communications",
  hospital: "Hospital",
  emergency: "Emergency services",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as ComponentCategory[];

export const DEPENDENCY_LABEL: Record<DependencyType, string> = {
  power_supply: "Power",
  water_supply: "Water",
  data_link: "Data link",
  control_signal: "Control signal",
  road_access: "Road access",
};

export const DEPENDENCY_COLOR: Record<DependencyType, string> = {
  power_supply: "#F6C85F",
  water_supply: "#57C7E3",
  data_link: "#B79AE0",
  control_signal: "#EF8A62",
  road_access: "#9FC46B",
};
