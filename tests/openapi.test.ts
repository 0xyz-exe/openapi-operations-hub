import { describe, it, expect } from "vitest";
import { parseAndValidateSpec } from "../src/lib/openapi-parser";
import { compareSpecs } from "../src/lib/openapi-diff";
import { evaluateGovernance } from "../src/lib/governance";

describe("OpenAPI Parser & Validator", () => {
  it("parses valid JSON OpenAPI 3.0 specification", () => {
    const raw = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Petstore", version: "1.0.0" },
      paths: {
        "/pets": {
          get: {
            summary: "List pets",
            responses: { "200": { description: "OK" } }
          }
        }
      }
    });

    const parsed = parseAndValidateSpec(raw);
    expect(parsed.isValid).toBe(true);
    expect(parsed.title).toBe("Petstore");
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.endpointsCount).toBe(1);
    expect(parsed.endpoints[0].method).toBe("GET");
    expect(parsed.endpoints[0].path).toBe("/pets");
  });

  it("parses valid YAML OpenAPI specification", () => {
    const yaml = `
openapi: 3.0.1
info:
  title: YAML API
  version: 2.1.0
paths:
  /users/{id}:
    get:
      summary: Get user
      parameters:
        - name: id
          in: path
          required: true
      responses:
        "200":
          description: User object
`;
    const parsed = parseAndValidateSpec(yaml);
    expect(parsed.isValid).toBe(true);
    expect(parsed.title).toBe("YAML API");
    expect(parsed.format).toBe("yaml");
    expect(parsed.endpointsCount).toBe(1);
    expect(parsed.endpoints[0].parameters[0].name).toBe("id");
  });

  it("flags invalid specifications missing required info fields", () => {
    const invalid = JSON.stringify({
      openapi: "3.0.0",
      info: {}
    });

    const parsed = parseAndValidateSpec(invalid);
    expect(parsed.isValid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});

describe("OpenAPI Diff & Breaking Changes", () => {
  it("flags removed endpoint as breaking change", () => {
    const spec1 = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.0.0" },
      paths: {
        "/items": { get: { summary: "List items", responses: { "200": {} } } },
        "/items/{id}": { delete: { summary: "Delete item", responses: { "204": {} } } }
      }
    });

    const spec2 = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "2.0.0" },
      paths: {
        "/items": { get: { summary: "List items", responses: { "200": {} } } }
      }
    });

    const diff = compareSpecs(spec1, spec2);
    expect(diff.hasBreakingChanges).toBe(true);
    expect(diff.breakingCount).toBe(1);
    expect(diff.items[0].type).toBe("breaking");
    expect(diff.items[0].description).toContain("DELETE /items/{id} was removed");
  });

  it("flags newly added optional parameters as non-breaking", () => {
    const spec1 = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.0.0" },
      paths: {
        "/items": { get: { responses: { "200": {} } } }
      }
    });

    const spec2 = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "API", version: "1.1.0" },
      paths: {
        "/items": {
          get: {
            parameters: [{ name: "filter", in: "query", required: false }],
            responses: { "200": {} }
          }
        }
      }
    });

    const diff = compareSpecs(spec1, spec2);
    expect(diff.hasBreakingChanges).toBe(false);
    expect(diff.nonBreakingCount).toBe(1);
  });
});

describe("API Governance & Quality Scoring", () => {
  it("identifies missing descriptions and insecure servers", () => {
    const spec = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Insecure Service", version: "1.0.0" },
      servers: [{ url: "http://insecure-api.internal" }],
      paths: {
        "/data": {
          get: {
            responses: { "200": { description: "OK" } }
          }
        }
      }
    });

    const parsed = parseAndValidateSpec(spec);
    const report = evaluateGovernance(parsed);

    expect(report.score).toBeLessThan(100);
    const rulesTriggered = report.findings.map((f: any) => f.ruleId);
    expect(rulesTriggered).toContain("RULE_API_DESC");
    expect(rulesTriggered).toContain("RULE_INSECURE_SERVER");
  });
});
