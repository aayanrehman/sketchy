/** JS mirror of tokens.css for code that needs raw values (canvas, confetti, flying points). */
export const color = {
  ink: '#0B0A1F', ink2: '#151338', surface: '#1E1B4B', surface2: '#2B2768', text: '#FFFFFF', textDim: '#C9C5F0', textMute: '#9A95D6',
  magenta: '#FF3D8A', cyan: '#22E4FF', lime: '#C6FF3D', violet: '#8B5CF6', gold: '#FFC83D', gold2: '#FFF1B8',
  red: '#FF4D4D', green: '#3DFF9C', paper: '#FFF9EF',
} as const;

export const confettiPalette = [color.magenta, color.cyan, color.lime, color.violet, color.gold, '#FFFFFF'];

/** Drawing palette: 6 colorblind-safe (Okabe-Ito) base colors, plus unlockables by level. */
export const INK_COLORS = ['#111111', '#0072B2', '#E69F00', '#56B4E9', '#009E73', '#D55E00'];
export const UNLOCK_COLORS: { level: number; color: string; name: string }[] = [
  { level: 2, color: '#CC79A7', name: 'Orchid' },
  { level: 3, color: '#F0E442', name: 'Lemon' },
  { level: 5, color: '#7B3FE4', name: 'Grape' },
  { level: 7, color: '#8B4513', name: 'Cocoa' },
];
export const BRUSH_SIZES = [6, 16];
export const CANVAS_SIZE = 512;
