import {
  getCountryFromBarcode,
  isProductBarcode,
  matchesPackagedFoodBarcodeType,
  normalizeBarcode,
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
});

describe("normalizeBarcode", () => {
  it("zero-pads 12-digit UPC-A to 13 digits", () =>
    expect(normalizeBarcode("012345678905")).toBe("0012345678905"));
  it("leaves 13-digit EAN-13 unchanged", () =>
    expect(normalizeBarcode("8901234567890")).toBe("8901234567890"));
  it("leaves 8-digit EAN-8 unchanged", () =>
    expect(normalizeBarcode("12345670")).toBe("12345670"));
  it("leaves 6-digit UPC-E unchanged", () =>
    expect(normalizeBarcode("123456")).toBe("123456"));
  it("trims whitespace before validation", () =>
    expect(normalizeBarcode(" 012345678905 ")).toBe("0012345678905"));
  it("returns null for empty string", () =>
    expect(normalizeBarcode("")).toBeNull());
  it("returns null for non-numeric string", () =>
    expect(normalizeBarcode("ABC")).toBeNull());
  it("returns null for unsupported numeric lengths", () =>
    expect(normalizeBarcode("12345678901234")).toBeNull());
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

describe("matchesPackagedFoodBarcodeType", () => {
  it("matches EAN-13 barcode types to 13-digit values", () =>
    expect(matchesPackagedFoodBarcodeType("ean13", "3017620422003")).toBe(
      true,
    ));
  it("matches UPC-A barcode types to 12-digit values", () =>
    expect(matchesPackagedFoodBarcodeType("upc_a", "012345678905")).toBe(
      true,
    ));
  it("matches UPC-E barcode types to 6-digit values", () =>
    expect(matchesPackagedFoodBarcodeType("upc_e", "123456")).toBe(true));
  it("rejects mismatched symbology and length pairs", () =>
    expect(matchesPackagedFoodBarcodeType("ean13", "12345670")).toBe(false));
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
