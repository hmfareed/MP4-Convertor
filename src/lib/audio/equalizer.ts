export type BiquadFilterType = "lowshelf" | "peaking" | "highshelf";

export interface EqBand {
  frequency: number;
  type: BiquadFilterType;
  label: string;
  sublabel: string;
  q?: number;
}

export interface EqPreset {
  id: string;
  name: string;
  description: string;
  gains: [number, number, number, number, number];
}

export const MIN_GAIN_DB = -12;
export const MAX_GAIN_DB = 12;

export const EQ_BANDS: EqBand[] = [
  { frequency: 60, type: "lowshelf", label: "60 Hz", sublabel: "Sub Bass" },
  { frequency: 250, type: "peaking", label: "250 Hz", sublabel: "Bass / Warmth", q: 1.0 },
  { frequency: 1000, type: "peaking", label: "1 kHz", sublabel: "Mids / Body", q: 1.0 },
  { frequency: 4000, type: "peaking", label: "4 kHz", sublabel: "Presence", q: 1.0 },
  { frequency: 16000, type: "highshelf", label: "16 kHz", sublabel: "Air / Treble" },
];

export const EQ_PRESETS: EqPreset[] = [
  {
    id: "flat",
    name: "Flat",
    description: "Neutral studio response with zero coloration",
    gains: [0, 0, 0, 0, 0],
  },
  {
    id: "bass-boost",
    name: "Bass Boost",
    description: "Heavy low-end boost for kick drums and deep bass lines",
    gains: [7, 4, 0, 0, -1],
  },
  {
    id: "vocal",
    name: "Vocal Clarity",
    description: "Boosts presence and cuts muddy low frequencies for clear speech",
    gains: [-3, -1, 3, 6, 2],
  },
  {
    id: "podcast",
    name: "Podcast",
    description: "Optimized for speech intelligibility, eliminates rumble",
    gains: [-4, 2, 4, 3, -2],
  },
  {
    id: "lofi",
    name: "Lo-Fi Warmth",
    description: "Cozy vintage profile with rolled-off treble and warm low-mids",
    gains: [-2, 5, 2, -3, -8],
  },
  {
    id: "treble",
    name: "Crisp Treble",
    description: "Adds sparkling highs and shimmer to vocals and cymbals",
    gains: [-2, 0, 1, 4, 7],
  },
  {
    id: "electronic",
    name: "Electronic / Club",
    description: "V-shaped EQ with energetic bass punch and sizzling high-end",
    gains: [6, 3, -1, 3, 5],
  },
];

export function clampGain(gain: number): number {
  if (isNaN(gain)) return 0;
  return Math.max(MIN_GAIN_DB, Math.min(MAX_GAIN_DB, Math.round(gain)));
}

export function detectPreset(gains: number[]): string {
  if (!gains || gains.length !== 5) return "custom";

  const match = EQ_PRESETS.find((preset) =>
    preset.gains.every((g, idx) => g === gains[idx])
  );

  return match ? match.id : "custom";
}

export function getPresetById(id: string): EqPreset | undefined {
  return EQ_PRESETS.find((p) => p.id === id);
}

export function formatGainDb(gain: number): string {
  const clamped = clampGain(gain);
  if (clamped > 0) return `+${clamped} dB`;
  if (clamped < 0) return `${clamped} dB`;
  return "0 dB";
}

export function isEqFlat(gains: number[]): boolean {
  return gains.every((g) => g === 0);
}
