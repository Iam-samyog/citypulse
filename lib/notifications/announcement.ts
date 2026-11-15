
export interface AlertIncident {
  incidentId?: string;
  componentId?: string;
  componentName?: string;
  location?: string;
  district?: string;
  type?: string;
  severity?: string;
  status?: string;
  startedAt?: string;
  affectedDistricts?: string[];
  downstreamAffectedCount?: number;
}

export interface AlertPayload {
  source: "CITYPULSE";
  scope: "citywide";
  city?: string;
  generatedAt?: string;
  summary?: {
    totalPopulation?: number;
    affectedPopulation?: number;
    totalInfrastructureAssets?: number;
    offlineAssets?: number;
    degradedAssets?: number;
    activeIncidentCount?: number;
  };
  incidents: AlertIncident[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function createAnnouncement(payload: AlertPayload): string {
  if (payload.source !== "CITYPULSE" || payload.scope !== "citywide") {
    throw new Error("Only CITYPULSE citywide alerts are supported.");
  }

  if (!payload.incidents?.length) {
    throw new Error("There are no incidents to announce.");
  }

  const city = payload.city || "Ithaca";
  const incidentCount = payload.incidents.length;

  const lines: string[] = [
    `Emergency alert for the city of ${city}.`,
    `CITYPULSE has detected ${incidentCount} active infrastructure ${
      incidentCount === 1 ? "incident" : "incidents"
    }.`,
  ];

  payload.incidents.forEach((incident, index) => {
    const number = index + 1;

    lines.push(
      `Incident ${number}: ${incident.type || "Infrastructure incident"}.`
    );

    if (incident.location || incident.componentName) {
      lines.push(
        `Location: ${incident.location || incident.componentName}.`
      );
    }

    if (incident.district) {
      lines.push(`District: ${incident.district}.`);
    }

    if (incident.severity) {
      lines.push(`Severity: ${incident.severity}.`);
    }

    if (incident.status) {
      lines.push(`Current status: ${incident.status}.`);
    }

    const affectedDistricts = unique(incident.affectedDistricts || []);

    if (affectedDistricts.length) {
      lines.push(
        `Affected districts: ${affectedDistricts.join(", ")}.`
      );
    }

    if (typeof incident.downstreamAffectedCount === "number") {
      lines.push(
        `${incident.downstreamAffectedCount} downstream infrastructure components are affected.`
      );
    }
  });

  const summary = payload.summary;

  if (summary) {
    if (typeof summary.affectedPopulation === "number") {
      lines.push(
        `Approximately ${summary.affectedPopulation.toLocaleString()} residents are affected.`
      );
    } else {
      lines.push("The affected population has not been calculated.");
    }

    if (typeof summary.offlineAssets === "number") {
      lines.push(
        `${summary.offlineAssets} infrastructure assets are offline.`
      );
    }

    if (typeof summary.degradedAssets === "number") {
      lines.push(
        `${summary.degradedAssets} infrastructure assets are degraded.`
      );
    }
  }

  lines.push(
    "Please follow official city instructions and monitor CITYPULSE for further updates."
  );

  return lines.join(" ");
}
