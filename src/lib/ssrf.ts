import dns from "node:dns/promises";
import net from "node:net";

export interface SSRFValidationResult {
  allowed: boolean;
  reason?: string;
  resolvedIp?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // Broadcast / Multicast 224.0.0.0/4 and 255.255.255.255
  if (parts[0] >= 224) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  // Unique local addresses (fc00::/7)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // Link-local addresses (fe80::/10)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:")) {
    const v4part = normalized.replace("::ffff:", "");
    return isPrivateIPv4(v4part);
  }
  return false;
}

export async function validateTargetUrl(urlString: string): Promise<SSRFValidationResult> {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { allowed: false, reason: `Disallowed protocol: ${url.protocol}. Only http and https are permitted.` };
    }

    const hostname = url.hostname.toLowerCase();

    // Check optional administrative allowed hosts whitelist
    const allowedEnv = process.env.ALLOWED_INTERNAL_HOSTS;
    if (allowedEnv) {
      const allowedHosts = allowedEnv.split(",").map((h) => h.trim().toLowerCase());
      if (allowedHosts.includes(hostname)) {
        return { allowed: true };
      }
    }

    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { allowed: false, reason: `Target hostname ${hostname} is blocked.` };
    }

    // Direct IP address validation
    if (net.isIPv4(hostname)) {
      if (isPrivateIPv4(hostname)) {
        return { allowed: false, reason: `Target IPv4 ${hostname} is in a reserved/private range.` };
      }
      return { allowed: true, resolvedIp: hostname };
    }

    if (net.isIPv6(hostname)) {
      if (isPrivateIPv6(hostname)) {
        return { allowed: false, reason: `Target IPv6 ${hostname} is in a reserved/private range.` };
      }
      return { allowed: true, resolvedIp: hostname };
    }

    // Resolve DNS
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { allowed: false, reason: `Unable to resolve DNS for ${hostname}` };
    }

    for (const record of addresses) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return { allowed: false, reason: `Resolved IP ${record.address} is in a private/restricted network range.` };
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return { allowed: false, reason: `Resolved IP ${record.address} is in a private/restricted network range.` };
      }
    }

    return { allowed: true, resolvedIp: addresses[0].address };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { allowed: false, reason: `Invalid URL or DNS resolution error: ${msg}` };
  }
}
