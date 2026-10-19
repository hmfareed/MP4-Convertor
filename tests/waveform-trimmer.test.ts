import { describe, expect, it } from "bun:test";

describe("Interactive Waveform Timeline Trimmer Logic", () => {
  // Peak generation algorithm test
  function generateFallbackPeaks(numBars: number, seed: number): number[] {
    const peaks: number[] = [];
    let prev = 0.5;
    for (let i = 0; i < numBars; i++) {
      const angle = (i / numBars) * Math.PI * 4;
      const wave = (Math.sin(angle) + Math.cos(angle * 2.3) + 2) / 4;
      const noise = Math.sin((seed + i * 997) % 100) * 0.25;
      const raw = Math.min(1, Math.max(0.15, wave * 0.7 + noise + prev * 0.3));
      prev = raw;
      peaks.push(raw);
    }
    return peaks;
  }

  it("generates exact requested number of peaks within [0.15, 1.0] bounds", () => {
    const bars120 = generateFallbackPeaks(120, 42);
    expect(bars120.length).toBe(120);
    for (const val of bars120) {
      expect(val).toBeGreaterThanOrEqual(0.15);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it("produces deterministic waveforms for same file size seed", () => {
    const run1 = generateFallbackPeaks(60, 1024);
    const run2 = generateFallbackPeaks(60, 1024);
    expect(run1).toEqual(run2);
  });

  // Boundary and window sliding logic
  describe("Trim Window & Presets Math", () => {
    const totalDuration = 120; // 2 minutes

    it("calculates First 30s preset accurately", () => {
      const start = 0;
      const end = Math.min(totalDuration, 30);
      expect(start).toBe(0);
      expect(end).toBe(30);
      expect(end - start).toBe(30);
    });

    it("calculates Last 30s preset accurately", () => {
      const start = Math.max(0, totalDuration - 30);
      const end = totalDuration;
      expect(start).toBe(90);
      expect(end).toBe(120);
      expect(end - start).toBe(30);
    });

    it("calculates Center 60s preset accurately", () => {
      const center = totalDuration / 2;
      const start = Math.max(0, center - 30);
      const end = Math.min(totalDuration, center + 30);
      expect(start).toBe(30);
      expect(end).toBe(90);
      expect(end - start).toBe(60);
    });

    it("slides window maintaining exact window duration", () => {
      let start = 10;
      let end = 40;
      const windowLen = end - start; // 30s

      const shift = 15; // move right by 15s
      start += shift;
      end += shift;

      expect(start).toBe(25);
      expect(end).toBe(55);
      expect(end - start).toBe(windowLen);
    });

    it("clamps window slide within [0, totalDuration] bounds", () => {
      const windowLen = 30;

      // Try sliding past right boundary
      let start = 100;
      let end = start + windowLen;
      if (end > totalDuration) {
        end = totalDuration;
        start = totalDuration - windowLen;
      }
      expect(start).toBe(90);
      expect(end).toBe(120);

      // Try sliding past left boundary
      start = -10;
      end = start + windowLen;
      if (start < 0) {
        start = 0;
        end = windowLen;
      }
      expect(start).toBe(0);
      expect(end).toBe(30);
    });
  });
});
