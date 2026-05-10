export interface HeatColorConfig {
  old: string;
  new: string;
}

export function interpolateColor(ratio: number, colorOld: string, colorNew: string): string {
  const oldRgb = hexToRgb(colorOld);
  const newRgb = hexToRgb(colorNew);

  const r = Math.round(oldRgb.r + (newRgb.r - oldRgb.r) * ratio);
  const g = Math.round(oldRgb.g + (newRgb.g - oldRgb.g) * ratio);
  const b = Math.round(oldRgb.b + (newRgb.b - oldRgb.b) * ratio);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function computeHeatRatio(timestamp: number, minTime: number, maxTime: number): number {
  if (maxTime === minTime) {
    return 0.5;
  }
  return (timestamp - minTime) / (maxTime - minTime);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }

  return { r, g, b };
}

function toHex(n: number): string {
  const hex = Math.max(0, Math.min(255, n)).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}
