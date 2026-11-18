import type { Driver } from "zwave-js";

/**
 * Maintenance (report flood) finding types.
 *
 * These mirror the payloads emitted by the `zwave-js` driver's report-flood
 * monitor. The server forwards them verbatim, so the shapes must stay in
 * sync with the driver's `ReportFloodMonitor` types. The payloads contain no
 * home ID, security keys or log data.
 */

/** One writable suggestion for one configuration parameter */
export interface MaintenanceSuggestionRow {
  /** The configuration parameter number */
  parameter: number;
  /** The `$purpose` the parameter is tagged with, e.g. `reporting_threshold.power` */
  purpose: string;
  kind: "threshold" | "interval";
  /** Unit of the parameter value, as given in the config file */
  unit?: string;
  /** Current value, if known. `undefined` means the driver must send a Get first. */
  currentValue?: number;
  defaultValue: number;
  /** The value that should be written */
  proposedValue: number;
  minValue: number;
  maxValue: number;
  /** Whether the current value is still the factory default */
  stillAtFactoryDefault?: boolean;
  /** If set, this row must not be written, and the reason is shown to the user */
  refusedReason?: string;
  /** Whether the row needs a (single) Configuration Get before it can be applied */
  needsGet?: boolean;
}

/** Per-node part of a maintenance finding */
export interface MaintenanceNodeFinding {
  /** The node's ID */
  nodeId: number;
  /** The node's inbound rate over the trailing 60 min */
  hourlyRate: number;
  /** The node's share of the total inbound traffic, 0..1 */
  shareOfInbound: number;
  /**
   * Whether the device config contains parameters tagged with a reporting
   * `$purpose`. If not, the finding contains no numbers for this node.
   */
  hasTaggedParams: boolean;
  /** Shown when the config file has no tagged reporting parameters */
  untaggedNote?: string;
  /** Suggested configuration changes for this node. */
  suggestionRows: MaintenanceSuggestionRow[];
}

export type MaintenanceFindingSeverity = "warning" | "error";

export type MaintenanceFindingKind = "loud-network" | "jammed";

export type MaintenanceVerificationState =
  | "rejected"
  | "verifying"
  | "verified (provisional)"
  | "inconclusive (idle)"
  | "not stored"
  | "stored, no effect"
  | "unconfirmed"
  | "regressed"
  | "verified";

export interface MaintenanceVerification {
  nodeId: number;
  state: MaintenanceVerificationState;
  /** Human-readable text describing the verification progress */
  message: string;
  /** Hourly rate directly before the suggested change was applied */
  preWriteRate: number;
  /** When the change was applied */
  appliedAt: number;
  /** How many retries are left after a `not stored` verdict */
  retriesLeft: number;
  /** Whether the cache-bypassing Get returned the new value */
  getResult?: "old" | "new" | "no answer";
}

export interface MaintenanceFinding {
  /** Stable identifier of this finding */
  id: string;
  kind: MaintenanceFindingKind;
  severity: MaintenanceFindingSeverity;
  /** Human-readable description of why this finding was raised */
  reason: string;
  /** The nodes that are responsible for the finding */
  nodes: MaintenanceNodeFinding[];
  /** Verification state per node, after `applyMaintenanceSuggestion` */
  verification: MaintenanceVerification[];
  createdAt: number;
  updatedAt: number;
}

/** The driver events that carry a maintenance finding (schema version >= 53) */
export const maintenanceFindingEvents = [
  "maintenance finding",
  "maintenance finding updated",
  "maintenance finding resolved",
] as const;

export type MaintenanceFindingEvent = (typeof maintenanceFindingEvents)[number];

/** Schema version that introduced the maintenance finding events and state */
export const maintenanceFindingsSchemaVersion = 53;

/**
 * Returns the driver's active maintenance findings. Drivers that do not
 * (yet) support the report-flood monitor report no findings.
 */
export function getMaintenanceFindings(
  driver: Driver,
): readonly MaintenanceFinding[] {
  const impl = driver as Driver & {
    getMaintenanceFindings?: () => readonly MaintenanceFinding[];
  };
  if (typeof impl.getMaintenanceFindings !== "function") return [];
  return impl.getMaintenanceFindings() ?? [];
}

/**
 * Applies the suggested configuration changes for one node of a
 * maintenance finding. This is the only write path - the server never
 * applies a suggestion on its own.
 */
export async function applyMaintenanceSuggestion(
  driver: Driver,
  findingId: string,
  nodeId: number,
): Promise<MaintenanceVerification> {
  const impl = driver as Driver & {
    applyMaintenanceSuggestion?: (
      findingId: string,
      nodeId: number,
    ) => Promise<MaintenanceVerification>;
  };
  if (typeof impl.applyMaintenanceSuggestion !== "function") {
    throw new Error(
      "The connected driver version does not support maintenance findings",
    );
  }
  return impl.applyMaintenanceSuggestion(findingId, nodeId);
}
