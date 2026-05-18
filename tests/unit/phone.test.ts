import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  formatBrazilianPhone,
  isValidBrazilianPhone,
  extractPossibleWhatsApp,
  toWhatsAppJid,
} from "../../src/utils/phone.js";

describe("normalizePhone", () => {
  it("removes all non-digit characters", () => {
    expect(normalizePhone("+55 (11) 99999-9999")).toBe("5511999999999");
    expect(normalizePhone("(11) 3000-1234")).toBe("1130001234");
    expect(normalizePhone("11987654321")).toBe("11987654321");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});

describe("isValidBrazilianPhone", () => {
  it("accepts standard cell phones (11 digits without country code)", () => {
    expect(isValidBrazilianPhone("11987654321")).toBe(true);
  });

  it("accepts landlines (10 digits without country code)", () => {
    expect(isValidBrazilianPhone("1130001234")).toBe(true);
  });

  it("accepts cell phones with country code (13 digits)", () => {
    expect(isValidBrazilianPhone("5511987654321")).toBe(true);
  });

  it("accepts landlines with country code (12 digits)", () => {
    expect(isValidBrazilianPhone("551130001234")).toBe(true);
  });

  it("rejects too-short numbers", () => {
    expect(isValidBrazilianPhone("11987")).toBe(false);
  });

  it("rejects too-long numbers", () => {
    expect(isValidBrazilianPhone("551198765432100")).toBe(false);
  });
});

describe("formatBrazilianPhone", () => {
  it("formats 13-digit number (with country code, cell)", () => {
    const result = formatBrazilianPhone("5511987654321");
    expect(result).toBe("+55 (11) 98765-4321");
  });

  it("formats 11-digit cell phone", () => {
    const result = formatBrazilianPhone("11987654321");
    expect(result).toBe("(11) 98765-4321");
  });

  it("formats 10-digit landline", () => {
    const result = formatBrazilianPhone("1130001234");
    expect(result).toBe("(11) 3000-1234");
  });

  it("returns raw input when format is unrecognized", () => {
    const raw = "12345";
    expect(formatBrazilianPhone(raw)).toBe(raw);
  });
});

describe("extractPossibleWhatsApp", () => {
  it("returns digits for a valid cell phone (9 as 3rd local digit)", () => {
    expect(extractPossibleWhatsApp("11987654321")).toBe("11987654321");
  });

  it("returns null for landline numbers", () => {
    expect(extractPossibleWhatsApp("1130001234")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractPossibleWhatsApp(null)).toBeNull();
  });

  it("returns null for invalid length", () => {
    expect(extractPossibleWhatsApp("12345")).toBeNull();
  });
});

describe("toWhatsAppJid", () => {
  it("adds country code and appends @s.whatsapp.net", () => {
    expect(toWhatsAppJid("11987654321")).toBe("5511987654321@s.whatsapp.net");
  });

  it("does not double-add country code", () => {
    expect(toWhatsAppJid("5511987654321")).toBe("5511987654321@s.whatsapp.net");
  });
});
