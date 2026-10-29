import { getDb } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { parseAndValidateSpec } from "../src/lib/openapi-parser";
import { evaluateGovernance } from "../src/lib/governance";

async function seed() {
  console.log("Seeding OpenAPI Operations Hub database...");
  const db = getDb();

  // Clean existing sample data (except schema)
  db.exec(`
    DELETE FROM incident_events;
    DELETE FROM monitoring_incidents;
    DELETE FROM monitoring_check_runs;
    DELETE FROM monitoring_checks;
    DELETE FROM quality_findings;
    DELETE FROM api_specification_versions;
    DELETE FROM api_specifications;
    DELETE FROM api_environments;
    DELETE FROM api_services;
    DELETE FROM audit_logs;
  `);

  // Ensure admin user
  const adminCheck = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@apihub.local");
  if (!adminCheck) {
    const hash = bcrypt.hashSync("AdminSecurePassword123!", 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run("usr-admin-01", "admin@apihub.local", hash, "Platform Architect", "admin");
  }

  // Sample Specs
  const paymentsSpec = JSON.stringify({
    openapi: "3.0.3",
    info: {
      title: "Payments & Invoicing Service",
      version: "2.4.0",
      description: "Core financial API processing credit card charges, recurring subscriptions, and customer refunds.",
      contact: { email: "payments-core@company.internal" }
    },
    servers: [
      { url: "https://api.payments.company.com/v2", description: "Production US-East" },
      { url: "https://staging.payments.company.com/v2", description: "Staging sandbox" }
    ],
    paths: {
      "/charges": {
        post: {
          summary: "Create credit card charge",
          description: "Authorizes and captures an arbitrary transaction amount on a customer card.",
          operationId: "createCharge",
          tags: ["Charges"],
          parameters: [
            { name: "Idempotency-Key", in: "header", required: true, description: "Unique UUID to prevent duplicate charges", schema: { type: "string" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "integer", description: "Amount in cents" },
                    currency: { type: "string", description: "3-letter ISO currency code" },
                    customer_id: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Charge created successfully" },
            "400": { description: "Invalid charge parameters" },
            "402": { description: "Card declined by issuing bank" }
          }
        },
        get: {
          summary: "List recent charges",
          operationId: "listCharges",
          tags: ["Charges"],
          parameters: [
            { name: "limit", in: "query", required: false, schema: { type: "integer" } },
            { name: "starting_after", in: "query", required: false, schema: { type: "string" } }
          ],
          responses: {
            "200": { description: "Paginated charges array" },
            "401": { description: "Unauthorized access" }
          }
        }
      },
      "/refunds": {
        post: {
          summary: "Initiate transaction refund",
          operationId: "createRefund",
          tags: ["Refunds"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    charge_id: { type: "string" },
                    amount: { type: "integer" },
                    reason: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Refund initiated" },
            "404": { description: "Target charge not found" }
          }
        }
      }
    }
  }, null, 2);

  const authSpec = JSON.stringify({
    openapi: "3.1.0",
    info: {
      title: "Identity & Session Management API",
      version: "1.8.0",
      description: "OAuth2 authentication, JWT token exchange, and centralized user identity service.",
    },
    servers: [
      { url: "https://auth.company.com/v1", description: "Global Auth Gateway" }
    ],
    paths: {
      "/oauth/token": {
        post: {
          summary: "Exchange OAuth authorization code",
          operationId: "oauthToken",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    grant_type: { type: "string" },
                    client_id: { type: "string" },
                    client_secret: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Bearer token returned" },
            "401": { description: "Invalid client credentials" }
          }
        }
      },
      "/users/me": {
        get: {
          summary: "Get current authenticated profile",
          operationId: "getCurrentUser",
          tags: ["Users"],
          responses: {
            "200": { description: "User account profile object" }
          }
        }
      }
    }
  }, null, 2);

  const ordersSpec = JSON.stringify({
    openapi: "3.0.0",
    info: {
      title: "E-Commerce Orders & Fulfillment API",
      version: "3.1.2",
      description: "Manages shopping baskets, order fulfillment status, and logistics tracking.",
    },
    servers: [
      { url: "https://orders.company.com", description: "Primary Order Cluster" }
    ],
    paths: {
      "/orders": {
        get: {
          summary: "Query customer orders",
          tags: ["Orders"],
          responses: {
            "200": { description: "List of orders" }
          }
        },
        post: {
          summary: "Place new order",
          tags: ["Orders"],
          responses: {
            "201": { description: "Order confirmed" }
          }
        }
      }
    }
  }, null, 2);

  const notifSpec = JSON.stringify({
    openapi: "3.0.0",
    info: {
      title: "Multi-Channel Notification Gateway",
      version: "1.2.0",
      description: "Transactional notifications via Email, SMS, Push, and Webhooks.",
    },
    servers: [
      { url: "https://notifications.company.com", description: "Notification Service" }
    ],
    paths: {
      "/send-sms": {
        post: {
          summary: "Dispatch transactional SMS",
          tags: ["SMS"],
          responses: {
            "202": { description: "SMS Queued" }
          }
        }
      }
    }
  }, null, 2);

  // 1. Insert APIs
  const apisData = [
    {
      id: "api-payments-01",
      slug: "payments-service",
      name: "Payments & Invoicing Service",
      description: "Core financial platform processing customer credit cards, automated subscription billing, and ledger payouts.",
      base_url: "https://api.payments.company.com/v2",
      owner: "Elena Rostova",
      team: "FinTech Platform",
      tags: JSON.stringify(["billing", "pci-dss", "v2", "critical"]),
      lifecycle: "active",
      health_status: "healthy",
      spec: paymentsSpec,
    },
    {
      id: "api-auth-02",
      slug: "identity-service",
      name: "Centralized Identity & Auth Gateway",
      description: "Enterprise OAuth2 and OpenID Connect identity provider handling single sign-on and token validation.",
      base_url: "https://auth.company.com/v1",
      owner: "Marcus Vance",
      team: "Security Architecture",
      tags: JSON.stringify(["security", "oauth2", "jwt"]),
      lifecycle: "active",
      health_status: "healthy",
      spec: authSpec,
    },
    {
      id: "api-orders-03",
      slug: "order-fulfillment",
      name: "Order Processing & Logistics API",
      description: "Omnichannel inventory reservation, order life-cycle tracking, and warehouse shipping dispatch.",
      base_url: "https://orders.company.com",
      owner: "Devon Reed",
      team: "Fulfillment SRE",
      tags: JSON.stringify(["logistics", "fulfillment", "supply-chain"]),
      lifecycle: "active",
      health_status: "degraded",
      spec: ordersSpec,
    },
    {
      id: "api-notif-04",
      slug: "notification-gateway",
      name: "Customer Notifications Engine",
      description: "High-throughput messaging dispatcher for transactional emails, SMS alerts, and mobile push notifications.",
      base_url: "https://notifications.company.com",
      owner: "Aria Thorne",
      team: "Communications",
      tags: JSON.stringify(["comms", "sms", "email"]),
      lifecycle: "active",
      health_status: "unhealthy",
      spec: notifSpec,
    },
  ];

  for (const api of apisData) {
    db.prepare(`
      INSERT INTO api_services (id, slug, name, description, api_type, base_url, owner, team, tags, lifecycle, visibility, health_status)
      VALUES (?, ?, ?, ?, 'REST', ?, ?, ?, ?, ?, 'public', ?)
    `).run(api.id, api.slug, api.name, api.description, api.base_url, api.owner, api.team, api.tags, api.lifecycle, api.health_status);

    db.prepare(`
      INSERT INTO api_environments (id, api_id, name, base_url, is_default)
      VALUES (?, ?, 'Production', ?, 1)
    `).run(`env-${api.id}-prod`, api.id, api.base_url);

    // Parse and register spec
    const parsed = parseAndValidateSpec(api.spec);
    const specId = `spec-${api.id}`;
    db.prepare(`
      INSERT INTO api_specifications (id, api_id, title, version, openapi_version, raw_spec, spec_format, spec_hash, validation_status, endpoints_count)
      VALUES (?, ?, ?, ?, ?, ?, 'json', ?, 'valid', ?)
    `).run(specId, api.id, parsed.title, parsed.version, parsed.openapiVersion, api.spec, parsed.specHash, parsed.endpointsCount);

    db.prepare(`
      INSERT INTO api_specification_versions (id, spec_id, api_id, version, spec_hash, raw_spec, changelog)
      VALUES (?, ?, ?, ?, ?, ?, 'Initial seeded baseline specification')
    `).run(`ver-${api.id}`, specId, api.id, parsed.version, parsed.specHash, api.spec);

    // Governance findings
    const gov = evaluateGovernance(parsed);
    for (const f of gov.findings) {
      db.prepare(`
        INSERT INTO quality_findings (id, spec_id, api_id, rule_id, severity, message, path, remediation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`qf-${Math.random().toString(36).substring(2, 8)}`, specId, api.id, f.ruleId, f.severity, f.message, f.path, f.remediation);
    }
  }

  // 2. Monitoring checks
  const checksData = [
    {
      id: "chk-pay-01",
      api_id: "api-payments-01",
      name: "Payments Health Probe",
      endpoint_url: "https://httpbin.org/status/200",
      interval_seconds: 30,
      current_status: "healthy",
    },
    {
      id: "chk-pay-02",
      api_id: "api-payments-01",
      name: "Charges Ingestion Gateway",
      endpoint_url: "https://httpbin.org/status/200",
      interval_seconds: 60,
      current_status: "healthy",
    },
    {
      id: "chk-auth-01",
      api_id: "api-auth-02",
      name: "OAuth Token Endpoint Ping",
      endpoint_url: "https://httpbin.org/status/200",
      interval_seconds: 45,
      current_status: "healthy",
    },
    {
      id: "chk-order-01",
      api_id: "api-orders-03",
      name: "Order Processing Liveness",
      endpoint_url: "https://httpbin.org/status/200",
      interval_seconds: 60,
      current_status: "degraded",
    },
    {
      id: "chk-notif-01",
      api_id: "api-notif-04",
      name: "SMS Carrier Dispatch Check",
      endpoint_url: "https://httpbin.org/status/503",
      interval_seconds: 30,
      current_status: "unhealthy",
    },
  ];

  for (const c of checksData) {
    db.prepare(`
      INSERT INTO monitoring_checks (id, api_id, name, endpoint_url, method, expected_status, interval_seconds, current_status, last_run_at)
      VALUES (?, ?, ?, ?, 'GET', 200, ?, ?, datetime('now'))
    `).run(c.id, c.api_id, c.name, c.endpoint_url, c.interval_seconds, c.current_status);
  }

  // 3. Telemetry Check Runs (30 past records)
  const runsData = [
    { chk: "chk-pay-01", api: "api-payments-01", code: 200, lat: 45, status: "healthy", err: null, offset: "-50 minutes" },
    { chk: "chk-pay-01", api: "api-payments-01", code: 200, lat: 42, status: "healthy", err: null, offset: "-40 minutes" },
    { chk: "chk-pay-01", api: "api-payments-01", code: 200, lat: 48, status: "healthy", err: null, offset: "-30 minutes" },
    { chk: "chk-pay-01", api: "api-payments-01", code: 200, lat: 44, status: "healthy", err: null, offset: "-20 minutes" },
    { chk: "chk-pay-01", api: "api-payments-01", code: 200, lat: 49, status: "healthy", err: null, offset: "-10 minutes" },
    { chk: "chk-auth-01", api: "api-auth-02", code: 200, lat: 68, status: "healthy", err: null, offset: "-45 minutes" },
    { chk: "chk-auth-01", api: "api-auth-02", code: 200, lat: 72, status: "healthy", err: null, offset: "-35 minutes" },
    { chk: "chk-auth-01", api: "api-auth-02", code: 200, lat: 65, status: "healthy", err: null, offset: "-25 minutes" },
    { chk: "chk-auth-01", api: "api-auth-02", code: 200, lat: 70, status: "healthy", err: null, offset: "-15 minutes" },
    { chk: "chk-order-01", api: "api-orders-03", code: 200, lat: 1850, status: "degraded", err: "High latency detected (>1500ms)", offset: "-25 minutes" },
    { chk: "chk-order-01", api: "api-orders-03", code: 200, lat: 2150, status: "degraded", err: "High latency detected (>2000ms)", offset: "-15 minutes" },
    { chk: "chk-order-01", api: "api-orders-03", code: 200, lat: 1980, status: "degraded", err: "High latency detected (>1500ms)", offset: "-5 minutes" },
    { chk: "chk-notif-01", api: "api-notif-04", code: 503, lat: 340, status: "unhealthy", err: "HTTP Status mismatch: expected 200, got 503", offset: "-18 minutes" },
    { chk: "chk-notif-01", api: "api-notif-04", code: 503, lat: 310, status: "unhealthy", err: "HTTP Status mismatch: expected 200, got 503", offset: "-8 minutes" },
    { chk: "chk-notif-01", api: "api-notif-04", code: 503, lat: 325, status: "unhealthy", err: "HTTP Status mismatch: expected 200, got 503", offset: "-1 minute" },
  ];

  for (const r of runsData) {
    db.prepare(`
      INSERT INTO monitoring_check_runs (id, check_id, api_id, status_code, latency_ms, status, error_message, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `).run(`run-${Math.random().toString(36).substring(2, 8)}`, r.chk, r.api, r.code, r.lat, r.status, r.err, r.offset);
  }

  // 4. Incidents
  const inc1 = "inc-notif-outage-01";
  db.prepare(`
    INSERT INTO monitoring_incidents (id, api_id, check_id, title, severity, status, notes, started_at)
    VALUES (?, 'api-notif-04', 'chk-notif-01', 'Carrier Downstream Outage (HTTP 503 Service Unavailable)', 'critical', 'open', 'Twilio/Vonage carrier upstream gateway returning 503. On-call SRE investigating carrier network status.', datetime('now', '-18 minutes'))
  `).run(inc1);

  db.prepare(`
    INSERT INTO incident_events (id, incident_id, event_type, message, created_at)
    VALUES (?, ?, 'incident_opened', 'Consecutive probe failure threshold reached (HTTP 503).', datetime('now', '-18 minutes'))
  `).run(`evt-1`, inc1);

  db.prepare(`
    INSERT INTO incident_events (id, incident_id, event_type, message, created_at)
    VALUES (?, ?, 'acknowledged', 'Acknowledged by on-call engineer Marcus Vance.', datetime('now', '-12 minutes'))
  `).run(`evt-2`, inc1);

  const inc2 = "inc-auth-resolved-02";
  db.prepare(`
    INSERT INTO monitoring_incidents (id, api_id, check_id, title, severity, status, notes, started_at, acknowledged_at, resolved_at)
    VALUES (?, 'api-auth-02', 'chk-auth-01', 'Auth Token Latency Spike', 'major', 'resolved', 'Resolved by scaling Redis cache replicas.', datetime('now', '-4 hours'), datetime('now', '-3 hours'), datetime('now', '-2 hours'))
  `).run(inc2);

  db.prepare(`
    INSERT INTO incident_events (id, incident_id, event_type, message, created_at)
    VALUES (?, ?, 'incident_resolved', 'Latency dropped back to 68ms. Service recovered.', datetime('now', '-2 hours'))
  `).run(`evt-3`, inc2);

  // 5. Audit logs
  const logs = [
    { email: "admin@apihub.local", action: "login", type: "user", id: "usr-admin-01", meta: { ip: "127.0.0.1", user_agent: "Mozilla/5.0" } },
    { email: "admin@apihub.local", action: "create_api", type: "api_service", id: "api-payments-01", meta: { slug: "payments-service" } },
    { email: "admin@apihub.local", action: "upload_spec", type: "api_specification", id: "spec-api-payments-01", meta: { version: "2.4.0", endpoints: 3 } },
    { email: "admin@apihub.local", action: "create_monitoring_check", type: "monitoring_check", id: "chk-pay-01", meta: { interval: 30 } },
    { email: "admin@apihub.local", action: "create_incident", type: "monitoring_incident", id: inc1, meta: { severity: "critical" } },
  ];

  for (const l of logs) {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, metadata, created_at)
      VALUES (?, 'usr-admin-01', ?, ?, ?, ?, ?, datetime('now', '-30 minutes'))
    `).run(`aud-${Math.random().toString(36).substring(2, 8)}`, l.email, l.action, l.type, l.id, JSON.stringify(l.meta));
  }

  console.log("Seeding complete! 4 APIs, 5 health checks, 15 telemetry runs, 2 incidents, and audit logs seeded.");
}

seed().catch(console.error);
