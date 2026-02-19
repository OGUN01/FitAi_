/**
 * GS1 barcode prefix to country name mapping.
 * Covers major markets worldwide.
 */
const GS1_PREFIX_MAP: Record<string, string> = {
  // USA & Canada
  "000": "USA",
  "001": "USA",
  "002": "USA",
  "003": "USA",
  "004": "USA",
  "005": "USA",
  "006": "USA",
  "007": "USA",
  "008": "USA",
  "009": "USA",
  "010": "USA",
  "011": "USA",
  "012": "USA",
  "013": "USA",
  "014": "USA",
  "015": "USA",
  "016": "USA",
  "017": "USA",
  "018": "USA",
  "019": "USA",
  "020": "USA",
  "021": "USA",
  "022": "USA",
  "023": "USA",
  "024": "USA",
  "025": "USA",
  "026": "USA",
  "027": "USA",
  "028": "USA",
  "029": "USA",
  "030": "USA",
  "031": "USA",
  "032": "USA",
  "033": "USA",
  "034": "USA",
  "035": "USA",
  "036": "USA",
  "037": "USA",
  "038": "USA",
  "039": "USA",
  "040": "USA",
  "041": "USA",
  "042": "USA",
  "043": "USA",
  "044": "USA",
  "045": "USA",
  "046": "USA",
  "047": "USA",
  "048": "USA",
  "049": "USA",
  "050": "USA",
  "051": "USA",
  "052": "USA",
  "053": "USA",
  "054": "USA",
  "055": "USA",
  "056": "USA",
  "057": "USA",
  "058": "USA",
  "059": "USA",
  "060": "USA",
  "061": "USA",
  "062": "USA",
  "063": "USA",
  "064": "USA",
  "065": "USA",
  "066": "USA",
  "067": "USA",
  "068": "USA",
  "069": "USA",
  "070": "USA",
  "071": "USA",
  "072": "USA",
  "073": "USA",
  "074": "USA",
  "075": "USA",
  "076": "USA",
  "077": "USA",
  "078": "USA",
  "079": "USA",
  "080": "USA",
  "081": "USA",
  "082": "USA",
  "083": "USA",
  "084": "USA",
  "085": "USA",
  "086": "USA",
  "087": "USA",
  "088": "USA",
  "089": "USA",
  "090": "USA",
  "091": "USA",
  "092": "USA",
  "093": "USA",
  "094": "USA",
  "095": "USA",
  "096": "USA",
  "097": "USA",
  "098": "USA",
  "099": "USA",
  "100": "USA",
  "101": "USA",
  "102": "USA",
  "103": "USA",
  "104": "USA",
  "105": "USA",
  "106": "USA",
  "107": "USA",
  "108": "USA",
  "109": "USA",
  "110": "USA",
  "111": "USA",
  "112": "USA",
  "113": "USA",
  "114": "USA",
  "115": "USA",
  "116": "USA",
  "117": "USA",
  "118": "USA",
  "119": "USA",
  "120": "USA",
  "121": "USA",
  "122": "USA",
  "123": "USA",
  "124": "USA",
  "125": "USA",
  "126": "USA",
  "127": "USA",
  "128": "USA",
  "129": "USA",
  "130": "USA",
  "131": "USA",
  "132": "USA",
  "133": "USA",
  "134": "USA",
  "135": "USA",
  "136": "USA",
  "137": "USA",
  "138": "USA",
  "139": "USA",
  // France
  "300": "France",
  "301": "France",
  "302": "France",
  "303": "France",
  "304": "France",
  "305": "France",
  "306": "France",
  "307": "France",
  "308": "France",
  "309": "France",
  "310": "France",
  "311": "France",
  "312": "France",
  "313": "France",
  "314": "France",
  "315": "France",
  "316": "France",
  "317": "France",
  "318": "France",
  "319": "France",
  "320": "France",
  "321": "France",
  "322": "France",
  "323": "France",
  "324": "France",
  "325": "France",
  "326": "France",
  "327": "France",
  "328": "France",
  "329": "France",
  "330": "France",
  "331": "France",
  "332": "France",
  "333": "France",
  "334": "France",
  "335": "France",
  "336": "France",
  "337": "France",
  "338": "France",
  "339": "France",
  "340": "France",
  "341": "France",
  "342": "France",
  "343": "France",
  "344": "France",
  "345": "France",
  "346": "France",
  "347": "France",
  "348": "France",
  "349": "France",
  "350": "France",
  "351": "France",
  "352": "France",
  "353": "France",
  "354": "France",
  "355": "France",
  "356": "France",
  "357": "France",
  "358": "France",
  "359": "France",
  "360": "France",
  "361": "France",
  "362": "France",
  "363": "France",
  "364": "France",
  "365": "France",
  "366": "France",
  "367": "France",
  "368": "France",
  "369": "France",
  "370": "France",
  "371": "France",
  "372": "France",
  "373": "France",
  "374": "France",
  "375": "France",
  "376": "France",
  "377": "France",
  "378": "France",
  "379": "France",
  // Germany
  "400": "Germany",
  "401": "Germany",
  "402": "Germany",
  "403": "Germany",
  "404": "Germany",
  "405": "Germany",
  "406": "Germany",
  "407": "Germany",
  "408": "Germany",
  "409": "Germany",
  "410": "Germany",
  "411": "Germany",
  "412": "Germany",
  "413": "Germany",
  "414": "Germany",
  "415": "Germany",
  "416": "Germany",
  "417": "Germany",
  "418": "Germany",
  "419": "Germany",
  "420": "Germany",
  "421": "Germany",
  "422": "Germany",
  "423": "Germany",
  "424": "Germany",
  "425": "Germany",
  "426": "Germany",
  "427": "Germany",
  "428": "Germany",
  "429": "Germany",
  "430": "Germany",
  "431": "Germany",
  "432": "Germany",
  "433": "Germany",
  "434": "Germany",
  "435": "Germany",
  "436": "Germany",
  "437": "Germany",
  "438": "Germany",
  "439": "Germany",
  "440": "Germany",
  // Japan
  "450": "Japan",
  "451": "Japan",
  "452": "Japan",
  "453": "Japan",
  "454": "Japan",
  "455": "Japan",
  "456": "Japan",
  "457": "Japan",
  "458": "Japan",
  "459": "Japan",
  "490": "Japan",
  "491": "Japan",
  "492": "Japan",
  "493": "Japan",
  "494": "Japan",
  "495": "Japan",
  "496": "Japan",
  "497": "Japan",
  "498": "Japan",
  "499": "Japan",
  // UK
  "500": "UK",
  "501": "UK",
  "502": "UK",
  "503": "UK",
  "504": "UK",
  "505": "UK",
  "506": "UK",
  "507": "UK",
  "508": "UK",
  "509": "UK",
  // Taiwan
  "471": "Taiwan",
  // Philippines
  "480": "Philippines",
  "481": "Philippines",
  "482": "Philippines",
  "483": "Philippines",
  "484": "Philippines",
  "485": "Philippines",
  "486": "Philippines",
  "487": "Philippines",
  "488": "Philippines",
  "489": "Philippines",
  // China
  "690": "China",
  "691": "China",
  "692": "China",
  "693": "China",
  "694": "China",
  "695": "China",
  "696": "China",
  "697": "China",
  "698": "China",
  "699": "China",
  // Saudi Arabia
  "628": "Saudi Arabia",
  // UAE
  "629": "UAE",
  // India
  "890": "India",
  // South Korea
  "880": "South Korea",
  // Brazil
  "789": "Brazil",
  "790": "Brazil",
  // Australia
  "930": "Australia",
  "931": "Australia",
  "932": "Australia",
  "933": "Australia",
  "934": "Australia",
  "935": "Australia",
  "936": "Australia",
  "937": "Australia",
  "938": "Australia",
  "939": "Australia",
  // New Zealand
  "940": "New Zealand",
  "941": "New Zealand",
  "942": "New Zealand",
  "943": "New Zealand",
  "944": "New Zealand",
  "945": "New Zealand",
  "946": "New Zealand",
  "947": "New Zealand",
  "948": "New Zealand",
  "949": "New Zealand",
  // Thailand
  "885": "Thailand",
  // Indonesia
  "899": "Indonesia",
  // Israel
  "729": "Israel",
  // South Africa
  "600": "South Africa",
  "601": "South Africa",
};

/** Product barcode types that should be scanned (iOS and Android formats) */
const PRODUCT_BARCODE_TYPES = new Set([
  // Standard names
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "upca",
  "upce",
  // iOS format (org.gs1.*)
  "org.gs1.EAN-13",
  "org.gs1.EAN-8",
  "org.gs1.UPC-A",
  "org.gs1.UPC-E",
  // Android numeric codes (BarcodeFormat)
  "32", // EAN-13
  "64", // EAN-8
  "16", // UPC-A
  "512", // UPC-E
]);

/** Non-product barcode types to reject */
const NON_PRODUCT_TYPES = new Set([
  "qr",
  "QR",
  "qrcode",
  "org.iso.QRCode",
  "code128",
  "code_128",
  "CODE_128",
  "org.iso.Code128",
  "pdf417",
  "PDF417",
  "org.iso.PDF417",
  "datamatrix",
  "data_matrix",
  "org.iso.DataMatrix",
  "aztec",
  "AZTEC",
  "org.iso.Aztec",
  "code39",
  "CODE_39",
  "org.iso.Code39",
  "code93",
  "CODE_93",
  "itf14",
  "ITF14",
  "256", // Android QR
  "1", // Android Code128
]);

/** ISO 3166-1 alpha-2 country code mapping */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  India: "IN",
  "United States": "US",
  USA: "US",
  "United States of America": "US",
  "United Kingdom": "GB",
  UK: "GB",
  "Great Britain": "GB",
  England: "GB",
  Germany: "DE",
  Deutschland: "DE",
  France: "FR",
  Japan: "JP",
  China: "CN",
  "South Korea": "KR",
  Korea: "KR",
  Australia: "AU",
  "New Zealand": "NZ",
  Brazil: "BR",
  Canada: "CA",
  "Saudi Arabia": "SA",
  UAE: "AE",
  "United Arab Emirates": "AE",
  Taiwan: "TW",
  Philippines: "PH",
  Thailand: "TH",
  Indonesia: "ID",
  Israel: "IL",
  "South Africa": "ZA",
  Mexico: "MX",
  Italy: "IT",
  Spain: "ES",
  Netherlands: "NL",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Poland: "PL",
  Russia: "RU",
  Singapore: "SG",
  Malaysia: "MY",
  Pakistan: "PK",
  Bangladesh: "BD",
  Nigeria: "NG",
  Egypt: "EG",
};

/**
 * Returns the country name for a given barcode based on its GS1 prefix.
 * @param barcode - The barcode string (EAN-13, UPC-A, etc.)
 * @returns Country name like "India", "USA", "Germany", or "Unknown"
 */
export function getCountryFromBarcode(barcode: string): string {
  if (!barcode || barcode.length < 3) return "Unknown";
  const prefix = barcode.substring(0, 3);
  return GS1_PREFIX_MAP[prefix] ?? "Unknown";
}

/**
 * Normalizes a barcode to standard EAN-13 format.
 * - Validates that barcode is numeric
 * - Zero-pads 12-digit UPC-A barcodes to 13 digits
 * - Returns null for invalid barcodes
 */
export function normalizeBarcode(barcode: string): string | null {
  if (!barcode || typeof barcode !== "string") return null;
  if (!/^\d+$/.test(barcode)) return null; // must be all digits

  const len = barcode.length;

  // UPC-A: 12 digits → zero-pad to EAN-13
  if (len === 12) return "0" + barcode;

  // EAN-13: 13 digits — valid as-is
  if (len === 13) return barcode;

  // EAN-8: 8 digits — valid as-is
  if (len === 8) return barcode;

  // UPC-E: 6 digits — valid as-is
  if (len === 6) return barcode;

  // ITF-14: 14 digits — valid as-is
  if (len === 14) return barcode;

  // Anything else is invalid
  return null;
}

/**
 * Returns true if the barcode type string represents a product barcode
 * (EAN-13, EAN-8, UPC-A, UPC-E). Returns false for QR, Code128, etc.
 * Handles both iOS (org.gs1.*) and Android (numeric) formats.
 */
export function isProductBarcode(type: string): boolean {
  if (!type) return false;

  // Explicit non-product check first
  if (NON_PRODUCT_TYPES.has(type)) return false;

  // Explicit product type check
  if (PRODUCT_BARCODE_TYPES.has(type)) return true;

  // Fuzzy match for common EAN/UPC patterns
  const lower = type.toLowerCase();
  if (lower.includes("ean") || lower.includes("upc")) return true;

  return false;
}

/**
 * Maps a country name (as stored in user profile) to its ISO 3166-1 alpha-2 code.
 * @param name - Country name like "India", "United States", "USA"
 * @returns ISO code like "IN", "US", or "XX" for unknown
 */
export function normalizeCountryName(name: string): string {
  if (!name) return "XX";
  return COUNTRY_NAME_TO_ISO[name] ?? "XX";
}
