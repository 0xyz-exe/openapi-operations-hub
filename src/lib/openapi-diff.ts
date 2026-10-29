import { parseAndValidateSpec, ParsedOpenApiSpec } from "./openapi-parser";

export type ChangeType = "breaking" | "potentially_breaking" | "non_breaking";

export interface DiffItem {
  type: ChangeType;
  category: "endpoint" | "parameter" | "schema" | "security" | "deprecation";
  action: "added" | "removed" | "modified";
  path: string;
  method?: string;
  description: string;
}

export interface SpecDiffResult {
  hasBreakingChanges: boolean;
  totalChanges: number;
  breakingCount: number;
  potentiallyBreakingCount: number;
  nonBreakingCount: number;
  items: DiffItem[];
}

export function compareSpecs(oldSpecRaw: string, newSpecRaw: string): SpecDiffResult {
  const oldParsed = parseAndValidateSpec(oldSpecRaw);
  const newParsed = parseAndValidateSpec(newSpecRaw);

  const items: DiffItem[] = [];

  const oldEndpointsMap = new Map<string, (typeof oldParsed.endpoints)[0]>();
  for (const ep of oldParsed.endpoints) {
    oldEndpointsMap.set(`${ep.method} ${ep.path}`, ep);
  }

  const newEndpointsMap = new Map<string, (typeof newParsed.endpoints)[0]>();
  for (const ep of newParsed.endpoints) {
    newEndpointsMap.set(`${ep.method} ${ep.path}`, ep);
  }

  // 1. Check removed endpoints (Breaking)
  for (const [key, oldEp] of oldEndpointsMap.entries()) {
    if (!newEndpointsMap.has(key)) {
      items.push({
        type: "breaking",
        category: "endpoint",
        action: "removed",
        path: oldEp.path,
        method: oldEp.method,
        description: `Endpoint ${oldEp.method} ${oldEp.path} was removed.`,
      });
    }
  }

  // 2. Check added endpoints (Non-breaking)
  for (const [key, newEp] of newEndpointsMap.entries()) {
    if (!oldEndpointsMap.has(key)) {
      items.push({
        type: "non_breaking",
        category: "endpoint",
        action: "added",
        path: newEp.path,
        method: newEp.method,
        description: `New endpoint ${newEp.method} ${newEp.path} added.`,
      });
    }
  }

  // 3. Check modified endpoints (parameters, deprecations, responses)
  for (const [key, oldEp] of oldEndpointsMap.entries()) {
    const newEp = newEndpointsMap.get(key);
    if (!newEp) continue;

    // Check deprecation
    if (!oldEp.deprecated && newEp.deprecated) {
      items.push({
        type: "potentially_breaking",
        category: "deprecation",
        action: "modified",
        path: newEp.path,
        method: newEp.method,
        description: `Endpoint ${newEp.method} ${newEp.path} was marked as deprecated.`,
      });
    }

    // Check parameters
    const oldParams = new Map(oldEp.parameters.map((p) => [p.name, p]));
    const newParams = new Map(newEp.parameters.map((p) => [p.name, p]));

    // Added parameter
    for (const [pName, newParam] of newParams.entries()) {
      if (!oldParams.has(pName)) {
        if (newParam.required) {
          items.push({
            type: "breaking",
            category: "parameter",
            action: "added",
            path: newEp.path,
            method: newEp.method,
            description: `New required parameter '${pName}' in ${newParam.in} added to ${newEp.method} ${newEp.path}.`,
          });
        } else {
          items.push({
            type: "non_breaking",
            category: "parameter",
            action: "added",
            path: newEp.path,
            method: newEp.method,
            description: `Optional parameter '${pName}' in ${newParam.in} added to ${newEp.method} ${newEp.path}.`,
          });
        }
      }
    }

    // Removed parameter
    for (const [pName, oldParam] of oldParams.entries()) {
      if (!newParams.has(pName)) {
        items.push({
          type: "potentially_breaking",
          category: "parameter",
          action: "removed",
          path: newEp.path,
          method: newEp.method,
          description: `Parameter '${pName}' in ${oldParam.in} removed from ${newEp.method} ${newEp.path}.`,
        });
      }
    }

    // Check response status codes
    const oldRespCodes = Object.keys(oldEp.responses || {});
    const newRespCodes = Object.keys(newEp.responses || {});

    for (const code of oldRespCodes) {
      if (!newRespCodes.includes(code)) {
        items.push({
          type: "breaking",
          category: "schema",
          action: "removed",
          path: newEp.path,
          method: newEp.method,
          description: `Response code ${code} removed from ${newEp.method} ${newEp.path}.`,
        });
      }
    }
  }

  const breakingCount = items.filter((i) => i.type === "breaking").length;
  const potentiallyBreakingCount = items.filter((i) => i.type === "potentially_breaking").length;
  const nonBreakingCount = items.filter((i) => i.type === "non_breaking").length;

  return {
    hasBreakingChanges: breakingCount > 0,
    totalChanges: items.length,
    breakingCount,
    potentiallyBreakingCount,
    nonBreakingCount,
    items,
  };
}
