export type InfrastructureCategory =
  | "electricity"
  | "water"
  | "transportation"
  | "communication"
  | "hospital"
  | "emergency"
  | "residential"
  | "commercial";

export type OperationalStatus =
  | "operational"
  | "degraded"
  | "at_risk"
  | "failed"
  | "repairing"
  | "restored";

export type Criticality = "low" | "medium" | "high" | "critical";

export interface GeoPosition {
  x: number;
  y: number;
  z: number;
}

export interface InfrastructureComponent {
  componentId: string;
  name: string;
  category: InfrastructureCategory;
  location: GeoPosition;
  district: string;
  capacity: number;
  currentCapacity: number;
  requiredInputCapacity: number;
  backupCapacity: number;
  operationalThreshold: number;
  operationalStatus: OperationalStatus;
  criticality: Criticality;
  connectedComponentIds: string[];
  recoveryRequirements?: string[];
}

export type DependencyType =
  | "power_supply"
  | "water_supply"
  | "data_link"
  | "road_access"
  | "control_signal";

export interface InfrastructureDependency {
  sourceComponentId: string;
  targetComponentId: string;
  dependencyType: DependencyType;
  requiredCapacity: number;
  dependencyStrength: number; // 0..1, how critical the link is
  hasBackup: boolean;
}
