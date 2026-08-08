import { describe, expect, it } from "vitest";
import { resolveDeviceType } from "./device";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const SMART_TV_UA = "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 Chrome/76.0.3809.146 TV Safari/537.36";

describe("resolveDeviceType", () => {
  it("classifies a mobile user agent", () => {
    expect(resolveDeviceType(IPHONE_UA)).toBe("MOBILE");
  });

  it("classifies a tablet user agent", () => {
    expect(resolveDeviceType(IPAD_UA)).toBe("TABLET");
  });

  it("treats no detected device type as desktop", () => {
    expect(resolveDeviceType(DESKTOP_UA)).toBe("DESKTOP");
  });

  it("treats other detected device types (smart TV, etc.) as unknown", () => {
    expect(resolveDeviceType(SMART_TV_UA)).toBe("UNKNOWN");
  });

  it("treats a missing user agent as unknown", () => {
    expect(resolveDeviceType(undefined)).toBe("UNKNOWN");
  });
});
