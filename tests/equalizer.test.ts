import { describe, expect, it } from "bun:test";
import {
  EQ_BANDS,
  EQ_PRESETS,
  clampGain,
  detectPreset,
  getPresetById,
  formatGainDb,
  isEqFlat,
  MIN_GAIN_DB,
  MAX_GAIN_DB,
} from "../src/lib/audio/equalizer";

describe("Audio Equalizer Configuration & Presets", () => {
  it("defines exactly 5 standard frequency bands", () => {
    expect(EQ_BANDS).toHaveLength(5);
    expect(EQ_BANDS[0].frequency).toBe(60);
    expect(EQ_BANDS[1].frequency).toBe(250);
    expect(EQ_BANDS[2].frequency).toBe(1000);
    expect(EQ_BANDS[3].frequency).toBe(4000);
    expect(EQ_BANDS[4].frequency).toBe(16000);

    expect(EQ_BANDS[0].type).toBe("lowshelf");
    expect(EQ_BANDS[1].type).toBe("peaking");
    expect(EQ_BANDS[2].type).toBe("peaking");
    expect(EQ_BANDS[3].type).toBe("peaking");
    expect(EQ_BANDS[4].type).toBe("highshelf");
  });

  it("includes all standard presets with valid 5-band gain vectors", () => {
    expect(EQ_PRESETS.length).toBeGreaterThanOrEqual(6);

    EQ_PRESETS.forEach((preset) => {
      expect(preset.gains).toHaveLength(5);
      preset.gains.forEach((gain) => {
        expect(gain).toBeGreaterThanOrEqual(MIN_GAIN_DB);
        expect(gain).toBeLessThanOrEqual(MAX_GAIN_DB);
      });
    });
  });

  it("correctly clamps gains within [-12, +12] dB bounds", () => {
    expect(clampGain(0)).toBe(0);
    expect(clampGain(15)).toBe(12);
    expect(clampGain(-20)).toBe(-12);
    expect(clampGain(6.4)).toBe(6);
    expect(clampGain(NaN)).toBe(0);
  });

  it("formats dB strings with correct signs and units", () => {
    expect(formatGainDb(6)).toBe("+6 dB");
    expect(formatGainDb(0)).toBe("0 dB");
    expect(formatGainDb(-4)).toBe("-4 dB");
    expect(formatGainDb(18)).toBe("+12 dB");
  });

  it("detects presets from gain arrays and handles custom curves", () => {
    const flat = getPresetById("flat");
    expect(flat).toBeDefined();
    expect(detectPreset(flat!.gains)).toBe("flat");

    const bass = getPresetById("bass-boost");
    expect(bass).toBeDefined();
    expect(detectPreset(bass!.gains)).toBe("bass-boost");

    const customGains = [2, 3, -1, 5, 0];
    expect(detectPreset(customGains)).toBe("custom");
  });

  it("detects whether an EQ curve is completely flat", () => {
    expect(isEqFlat([0, 0, 0, 0, 0])).toBe(true);
    expect(isEqFlat([1, 0, 0, 0, 0])).toBe(false);
    expect(isEqFlat([0, 0, -2, 0, 0])).toBe(false);
  });
});
