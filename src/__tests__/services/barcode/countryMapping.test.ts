import {
  getCountryFromBarcode,
  normalizeBarcode,
  isProductBarcode,
  normalizeCountryName,
} from "@/utils/countryMapping";

describe("getCountryFromBarcode", () => {
  it("returns India for 890 prefix", () =>
    expect(getCountryFromBarcode("8901234567890")).toBe("India"));
  it("returns USA for 001 prefix", () =>
    expect(getCountryFromBarcode("0012345678905")).toBe("USA"));
  it("returns Germany for 400 prefix", () =>
    expect(getCountryFromBarcode("4006381333931")).toBe("Germany"));
  it("returns France for 301 prefix", () =>
    expect(getCountryFromBarcode("3017620422003")).toBe("France"));
  it("returns UK for 500 prefix", () =>
    expect(getCountryFromBarcode("5000159407236")).toBe("UK"));
  it("returns Japan for 490 prefix", () =>
    expect(getCountryFromBarcode("4901234567894")).toBe("Japan"));
  it("returns Unknown for too-short barcode", () =>
    expect(getCountryFromBarcode("69")).toBe("Unknown"));
  it("returns Australia for 930 prefix", () =>
    expect(getCountryFromBarcode("9300675000012")).toBe("Australia"));
  it("returns Brazil for 789 prefix", () =>
    expect(getCountryFromBarcode("7891234567890")).toBe("Brazil"));
});

describe("normalizeBarcode", () => {
  it("zero-pads 12-digit UPC-A to 13 digits", () =>
    expect(normalizeBarcode("012345678905")).toBe("0012345678905"));
  it("leaves 13-digit EAN-13 unchanged", () =>
    expect(normalizeBarcode("8901234567890")).toBe("8901234567890"));
  it("returns null for empty string", () =>
    expect(normalizeBarcode("")).toBeNull());
  it("returns null for non-numeric string", () =>
    expect(normalizeBarcode("ABC")).toBeNull());
  it("returns null for too-short barcode", () =>
    expect(normalizeBarcode("123")).toBeNull());
  it("handles 8-digit EAN-8", () =>
    expect(normalizeBarcode("12345670")).toBe("12345670"));
});

describe("isProductBarcode", () => {
  it("returns true for ean13", () =>
    expect(isProductBarcode("ean13")).toBe(true));
  it("returns true for iOS EAN-13 format", () =>
    expect(isProductBarcode("org.gs1.EAN-13")).toBe(true));
  it("returns true for Android numeric 32 (EAN-13)", () =>
    expect(isProductBarcode("32")).toBe(true));
  it("returns true for upc_a", () =>
    expect(isProductBarcode("upc_a")).toBe(true));
  it("returns false for qr", () => expect(isProductBarcode("qr")).toBe(false));
  it("returns false for org.iso.Code128", () =>
    expect(isProductBarcode("org.iso.Code128")).toBe(false));
  it("returns false for pdf417", () =>
    expect(isProductBarcode("pdf417")).toBe(false));
});

describe("normalizeCountryName", () => {
  it("maps India to IN", () =>
    expect(normalizeCountryName("India")).toBe("IN"));
  it("maps United States to US", () =>
    expect(normalizeCountryName("United States")).toBe("US"));
  it("maps USA to US", () => expect(normalizeCountryName("USA")).toBe("US"));
  it("returns XX for unknown country", () =>
    expect(normalizeCountryName("Narnia")).toBe("XX"));
});
