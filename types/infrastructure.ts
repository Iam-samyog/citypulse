export type ComponentCategory =
  | "electrical"
  | "water"
  | "transit"
  | "comms"
  | "hospital"
  | "emergency";

/**
 * operational: fully supplied by its upstream dependencies.
 * backup:      fully supplied, but only because local backup is in use.
 * degraded:    partially supplied (service level 50–90%).
 * offline:     failed outright, or supplied below 50%.
 */
export type ComponentStatus = "operational" | "degraded" | "offline" | "backup";

export type Criticality = 1 | 2 | 3 | 4 | 5;

export type DependencyType =
  | "power_supply"
  | "water_supply"
  | "data_link"
  | "control_signal"
  | "road_access";

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface InfrastructureComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  district: string;
  coordinates: Coordinates;
  /** Most service this component can deliver downstream, in capacity units. */
  maxCapacity: number;
  /** Capacity currently being drawn from it under normal operation. */
  currentLoad: number;
  /** Local reserve (generator, battery, cistern) that can stand in for a lost dependency. */
  backupCapacityRemaining: number;
  status: ComponentStatus;
  criticality: Criticality;
}

/** Directed edge: `targetId` depends on `sourceId`. */
export interface InfrastructureDependency {
  id: string;
  sourceId: string;
  targetId: string;
  dependencyType: DependencyType;
  /** Capacity this edge delivers to the target under normal operation. */
  requiredCapacity: number;
  /** True when the target may cover a shortfall on this edge from its own backup reserve. */
  hasBackup: boolean;
}

export interface District {
  name: string;
  population: number;
  character: string;
  center: Coordinates;
}
