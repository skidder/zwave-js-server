import type { Driver, ZWaveOptions } from "zwave-js";
import { EventEmitter } from "events";
import { LogConfig } from "@zwave-js/core";
import type {
  MaintenanceFinding,
  MaintenanceVerification,
} from "../lib/maintenance.js";

class MockController extends EventEmitter {
  homeId = 1;
  nodes = new Map();
}

class MockDriver extends EventEmitter {
  public controller = new MockController();

  public ready = true;

  public allNodesReady = true;

  public configVersion = "0.0.0-mock";

  public statisticsEnabled = true;

  private logConfig: Partial<LogConfig> = {
    enabled: true,
    level: "debug",
    transports: [],
  };

  async start() {
    this.emit("driver ready");
  }

  public getLogConfig(): Partial<LogConfig> {
    return {
      ...this.logConfig,
      transports: [...(this.logConfig.transports ?? [])],
    };
  }

  public updateLogConfig(config: Partial<LogConfig>) {
    this.logConfig = {
      ...this.logConfig,
      ...config,
    };
  }

  public updateUserAgent(
    _additionalUserAgentComponents?: Record<string, string> | null,
  ) {}

  public updateOptions(_options: Partial<ZWaveOptions>) {}

  // Maintenance (report flood) findings, schema version >= 53
  public maintenanceFindings: MaintenanceFinding[] = [];
  /** Applied suggestions, recorded for test assertions */
  public appliedSuggestions: { findingId: string; nodeId: number }[] = [];

  public getMaintenanceFindings(): readonly MaintenanceFinding[] {
    return this.maintenanceFindings;
  }

  public async applyMaintenanceSuggestion(
    findingId: string,
    nodeId: number,
  ): Promise<MaintenanceVerification> {
    this.appliedSuggestions.push({ findingId, nodeId });
    return {
      nodeId,
      state: "verifying",
      message: "Checking traffic…",
      preWriteRate: 900,
      appliedAt: 1000,
      retriesLeft: 1,
    };
  }

  async destroy() {}
}

export const createMockDriver = () => new MockDriver() as unknown as Driver;
