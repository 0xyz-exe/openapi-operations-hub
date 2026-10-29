import { describe, it, expect } from "vitest";
import { validateTargetUrl } from "../src/lib/ssrf";

describe("SSRF Security Guard", () => {
  it("blocks localhost and loopback IPv4 addresses", async () => {
    const res1 = await validateTargetUrl("http://localhost:8080/metrics");
    expect(res1.allowed).toBe(false);
    expect(res1.reason).toContain("blocked");

    const res2 = await validateTargetUrl("http://127.0.0.1/admin");
    expect(res2.allowed).toBe(false);
    expect(res2.reason).toContain("blocked");

    const res3 = await validateTargetUrl("http://127.255.255.1/api");
    expect(res3.allowed).toBe(false);
  });

  it("blocks RFC 1918 private network addresses", async () => {
    const res10 = await validateTargetUrl("http://10.0.0.5/secrets");
    expect(res10.allowed).toBe(false);
    expect(res10.reason).toContain("reserved/private");

    const res172 = await validateTargetUrl("https://172.16.50.1/internal");
    expect(res172.allowed).toBe(false);

    const res192 = await validateTargetUrl("http://192.168.1.100/config");
    expect(res192.allowed).toBe(false);
  });

  it("blocks cloud instance metadata endpoint", async () => {
    const res = await validateTargetUrl("http://169.254.169.254/latest/meta-data/");
    expect(res.allowed).toBe(false);
  });

  it("blocks non-http protocols (file, gopher, ftp)", async () => {
    const resFile = await validateTargetUrl("file:///etc/passwd");
    expect(resFile.allowed).toBe(false);
    expect(resFile.reason).toContain("Disallowed protocol");

    const resFtp = await validateTargetUrl("ftp://ftp.example.com/file");
    expect(resFtp.allowed).toBe(false);
  });

  it("allows standard public HTTPS domains", async () => {
    const res = await validateTargetUrl("https://example.com");
    expect(res.allowed).toBe(true);
  });
});
