import { describe, expect, it } from "vitest";
import { isPrivateIp, SsrfError, ssrfSafeFetchText, stripBrackets } from "./ssrf-fetch";

describe("isPrivateIp", () => {
  it("flags loopback, link-local, private, and multicast v4", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "224.0.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("flags v6 loopback, ULA, link-local, and v4-mapped private", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]) {
      expect(isPrivateIp(ip)).toBe(false);
    }
  });
});

describe("stripBrackets", () => {
  it("removes IPv6 URL brackets", () => {
    expect(stripBrackets("[::1]")).toBe("::1");
    expect(stripBrackets("example.com")).toBe("example.com");
    expect(stripBrackets("127.0.0.1")).toBe("127.0.0.1");
  });
});

describe("ssrfSafeFetchText rejects private targets before connecting", () => {
  it("rejects an IPv4 loopback literal", async () => {
    await expect(ssrfSafeFetchText("http://127.0.0.1/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects a bracketed IPv6 loopback literal (S7)", async () => {
    await expect(ssrfSafeFetchText("http://[::1]/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects the cloud metadata address", async () => {
    await expect(ssrfSafeFetchText("http://169.254.169.254/latest/meta-data")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("rejects localhost by name", async () => {
    await expect(ssrfSafeFetchText("http://localhost:8080/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(ssrfSafeFetchText("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfError);
  });
});
