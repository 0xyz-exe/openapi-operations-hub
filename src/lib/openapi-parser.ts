import YAML from "yaml";
import crypto from "node:crypto";

export interface ParsedEndpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  operationId?: string;
  tags: string[];
  parameters: Array<{
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema?: Record<string, unknown>;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses: Record<string, {
    description?: string;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  }>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface ParsedOpenApiSpec {
  title: string;
  version: string;
  openapiVersion: string;
  description: string;
  servers: Array<{ url: string; description?: string }>;
  endpoints: ParsedEndpoint[];
  endpointsCount: number;
  specHash: string;
  format: "json" | "yaml";
  isValid: boolean;
  errors: string[];
  rawObject: Record<string, unknown>;
}

export function parseAndValidateSpec(rawText: string): ParsedOpenApiSpec {
  const errors: string[] = [];
  let rawObj: any = null;
  let format: "json" | "yaml" = "json";

  const cleanText = rawText.trim();
  const specHash = crypto.createHash("sha256").update(cleanText).digest("hex");

  // Attempt JSON parse first
  try {
    rawObj = JSON.parse(cleanText);
    format = "json";
  } catch {
    // Fallback to YAML parse
    try {
      rawObj = YAML.parse(cleanText);
      format = "yaml";
    } catch (yamlErr: any) {
      errors.push(`Failed to parse specification as JSON or YAML: ${yamlErr.message}`);
      return {
        title: "Unknown Specification",
        version: "0.0.0",
        openapiVersion: "unknown",
        description: "",
        servers: [],
        endpoints: [],
        endpointsCount: 0,
        specHash,
        format: "yaml",
        isValid: false,
        errors,
        rawObject: {},
      };
    }
  }

  if (!rawObj || typeof rawObj !== "object") {
    errors.push("Specification root must be an object");
    return {
      title: "Unknown Specification",
      version: "0.0.0",
      openapiVersion: "unknown",
      description: "",
      servers: [],
      endpoints: [],
      endpointsCount: 0,
      specHash,
      format,
      isValid: false,
      errors,
      rawObject: {},
    };
  }

  const openapiVersion = rawObj.openapi || rawObj.swagger || "unknown";
  if (!rawObj.openapi && !rawObj.swagger) {
    errors.push("Missing 'openapi' or 'swagger' version identifier");
  }

  const info = rawObj.info || {};
  const title = typeof info.title === "string" ? info.title : "Untitled API";
  const version = typeof info.version === "string" ? info.version : "1.0.0";
  const description = typeof info.description === "string" ? info.description : "";

  if (!info.title) errors.push("Missing required field: info.title");
  if (!info.version) errors.push("Missing required field: info.version");

  const paths = rawObj.paths || {};
  if (typeof paths !== "object") {
    errors.push("Missing or invalid 'paths' object");
  }

  const servers = Array.isArray(rawObj.servers)
    ? rawObj.servers.map((s: any) => ({
        url: typeof s.url === "string" ? s.url : "",
        description: typeof s.description === "string" ? s.description : "",
      }))
    : [];

  const endpoints: ParsedEndpoint[] = [];
  const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const method of HTTP_METHODS) {
      const op = (pathItem as any)[method];
      if (!op || typeof op !== "object") continue;

      const endpoint: ParsedEndpoint = {
        method: method.toUpperCase(),
        path: pathKey,
        summary: op.summary || "",
        description: op.description || "",
        operationId: op.operationId,
        tags: Array.isArray(op.tags) ? op.tags : [],
        parameters: Array.isArray(op.parameters) ? op.parameters : [],
        requestBody: op.requestBody,
        responses: op.responses || {},
        deprecated: Boolean(op.deprecated),
        security: op.security,
      };

      endpoints.push(endpoint);
    }
  }

  return {
    title,
    version,
    openapiVersion,
    description,
    servers,
    endpoints,
    endpointsCount: endpoints.length,
    specHash,
    format,
    isValid: errors.length === 0,
    errors,
    rawObject: rawObj,
  };
}
