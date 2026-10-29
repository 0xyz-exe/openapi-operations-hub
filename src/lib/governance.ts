import { ParsedOpenApiSpec } from "./openapi-parser";

export interface GovernanceFinding {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  path: string;
  remediation: string;
}

export interface GovernanceReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: GovernanceFinding[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    total: number;
  };
}

export function evaluateGovernance(spec: ParsedOpenApiSpec): GovernanceReport {
  const findings: GovernanceFinding[] = [];

  // 1. API level checks
  if (!spec.description || spec.description.trim().length < 10) {
    findings.push({
      ruleId: "RULE_API_DESC",
      severity: "warning",
      message: "API description is missing or too brief (< 10 chars).",
      path: "info.description",
      remediation: "Add a detailed overview of the API capabilities in info.description.",
    });
  }

  // Check servers for insecure HTTP
  for (const s of spec.servers) {
    if (s.url && s.url.startsWith("http://") && !s.url.includes("localhost")) {
      findings.push({
        ruleId: "RULE_INSECURE_SERVER",
        severity: "error",
        message: `Insecure HTTP server URL detected: ${s.url}`,
        path: `servers[${s.url}]`,
        remediation: "Configure TLS/HTTPS endpoints for production API servers.",
      });
    }
  }

  // 2. Endpoint level checks
  for (const ep of spec.endpoints) {
    const epPath = `${ep.method} ${ep.path}`;

    if (!ep.summary || ep.summary.trim() === "") {
      findings.push({
        ruleId: "RULE_OP_SUMMARY",
        severity: "warning",
        message: `Endpoint ${epPath} is missing a summary.`,
        path: epPath,
        remediation: "Add a concise summary explaining what this operation does.",
      });
    }

    if (!ep.description || ep.description.trim() === "") {
      findings.push({
        ruleId: "RULE_OP_DESC",
        severity: "info",
        message: `Endpoint ${epPath} has no detailed description.`,
        path: epPath,
        remediation: "Add an in-depth description detailing parameters and edge cases.",
      });
    }

    if (!ep.operationId) {
      findings.push({
        ruleId: "RULE_OP_ID",
        severity: "info",
        message: `Endpoint ${epPath} is missing an operationId.`,
        path: epPath,
        remediation: "Add a unique camelCase operationId (e.g. getUserById) to support client SDK generators.",
      });
    }

    if (!ep.tags || ep.tags.length === 0) {
      findings.push({
        ruleId: "RULE_TAGS",
        severity: "info",
        message: `Endpoint ${epPath} has no tags assigned.`,
        path: epPath,
        remediation: "Group endpoints logically with tags (e.g., 'Users', 'Auth', 'Billing').",
      });
    }

    // Response checks
    const respCodes = Object.keys(ep.responses || {});
    const hasSuccess = respCodes.some((code) => code.startsWith("2") || code === "default");
    const hasError = respCodes.some((code) => code.startsWith("4") || code.startsWith("5"));

    if (!hasSuccess) {
      findings.push({
        ruleId: "RULE_OP_RESP",
        severity: "error",
        message: `Endpoint ${epPath} lacks a 2xx success response schema.`,
        path: `${epPath}.responses`,
        remediation: "Define at least one successful HTTP status code response (e.g., 200, 201, 204).",
      });
    }

    if (!hasError) {
      findings.push({
        ruleId: "RULE_ERR_RESP",
        severity: "warning",
        message: `Endpoint ${epPath} does not define standard error responses (4xx/5xx).`,
        path: `${epPath}.responses`,
        remediation: "Document common error responses such as 400 Bad Request, 401 Unauthorized, or 404 Not Found.",
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const infos = findings.filter((f) => f.severity === "info").length;

  let score = 100 - errors * 10 - warnings * 3 - infos * 1;
  if (score < 0) score = 0;

  let grade: GovernanceReport["grade"] = "A";
  if (score < 60) grade = "F";
  else if (score < 70) grade = "D";
  else if (score < 80) grade = "C";
  else if (score < 90) grade = "B";

  return {
    score,
    grade,
    findings,
    summary: {
      errors,
      warnings,
      infos,
      total: findings.length,
    },
  };
}
