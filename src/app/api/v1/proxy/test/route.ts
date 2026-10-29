import { NextRequest, NextResponse } from "next/server";
import { validateTargetUrl } from "@/lib/ssrf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, method = "GET", headers = {}, body: reqBody } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // SSRF Validation
    const ssrf = await validateTargetUrl(url);
    if (!ssrf.allowed) {
      return NextResponse.json(
        { error: `Target URL blocked by security policy: ${ssrf.reason}` },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const sanitizedHeaders: Record<string, string> = {
      "User-Agent": "OpenAPI-Operations-Hub-Console/1.0",
    };

    // Filter incoming headers (skip dangerous hop-by-hop headers)
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (!["host", "connection", "keep-alive"].includes(lower) && typeof v === "string") {
        sanitizedHeaders[k] = v;
      }
    }

    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: sanitizedHeaders,
        body: ["POST", "PUT", "PATCH"].includes(method.toUpperCase()) && reqBody ? JSON.stringify(reqBody) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      const respText = await response.text();

      let parsedData: any = respText;
      try {
        parsedData = JSON.parse(respText);
      } catch {
        // keep text
      }

      // Redact sensitive response headers
      const respHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (["set-cookie", "authorization", "x-api-key"].includes(lowerKey)) {
          respHeaders[key] = "[REDACTED]";
        } else {
          respHeaders[key] = val;
        }
      });

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        headers: respHeaders,
        data: parsedData,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        status: 0,
        statusText: fetchErr.name === "AbortError" ? "Request Timed Out (10s)" : (fetchErr.message || "Network Error"),
        latencyMs: Date.now() - startTime,
        headers: {},
        data: null,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Proxy test execution failed" }, { status: 500 });
  }
}
