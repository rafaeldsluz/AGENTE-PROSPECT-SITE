import { describe, it, expect, vi } from "vitest";

// Mock the DeepSeek client so the AI path is never called in unit tests
vi.mock("../../src/utils/deepseek-client.js", () => ({
  deepseekChat: vi.fn().mockRejectedValue(new Error("AI not available in tests")),
  deepseekClient: { chat: vi.fn() },
}));

// Mock withRetry to call fn() once with no delays so tests are fast
vi.mock("../../src/utils/retry.js", () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
}));

// Mock the logger so tests are silent
vi.mock("../../src/utils/logger.js", () => ({
  createModuleLogger: () => ({
    info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

// Mock config so env vars are not required
vi.mock("../../src/config/index.js", () => ({
  config: {
    deepseek: { apiKey: "test-key" },
    app: { logLevel: "silent", isDev: false },
  },
}));

import { NicheClassifier } from "../../src/modules/ai/niche-classifier.js";

const classifier = new NicheClassifier();

describe("NicheClassifier — keyword path", () => {
  async function classifyKeywords(category: string, name = "") {
    // These will resolve via keywords (confidence >= 0.85) without calling AI
    return classifier.classify(name, category);
  }

  it("classifies oficina by keyword", async () => {
    const r = await classifyKeywords("oficina mecânica");
    expect(r.niche).toBe("oficina");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies clinica by keyword", async () => {
    const r = await classifyKeywords("clínica médica");
    expect(r.niche).toBe("clinica");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies restaurante by keyword", async () => {
    const r = await classifyKeywords("restaurante e pizzaria");
    expect(r.niche).toBe("restaurante");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies academia by keyword", async () => {
    const r = await classifyKeywords("academia de ginástica");
    expect(r.niche).toBe("academia");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies imoveis by keyword", async () => {
    const r = await classifyKeywords("imobiliária centro");
    expect(r.niche).toBe("imoveis");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies estetica by keyword", async () => {
    const r = await classifyKeywords("salão de beleza");
    expect(r.niche).toBe("estetica");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies loja by keyword", async () => {
    const r = await classifyKeywords("pet shop e loja de animais");
    expect(r.niche).toBe("loja");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies servicos by keyword", async () => {
    const r = await classifyKeywords("dedetizadora e controle de pragas");
    expect(r.niche).toBe("servicos");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("uses company name as fallback for classification", async () => {
    const r = await classifier.classify("Auto Center Silva", "");
    expect(r.niche).toBe("oficina");
  });

  it("throws when keywords don't match and AI is unavailable", async () => {
    // When no keyword matches (confidence < 0.85), the classifier falls through to AI.
    // With AI mocked to throw, the error propagates — callers must handle it.
    await expect(
      classifier.classify("Unknown Business XYZ", "xyzxyz empresa desconhecida")
    ).rejects.toThrow("AI not available in tests");
  });
});
