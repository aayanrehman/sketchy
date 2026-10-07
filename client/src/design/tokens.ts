/** JS mirror of tokens.css for code that needs raw values (canvas, confetti, flying points, share card). */
export const color = {
  sky: '#BDE4FF', sky2: '#E3F5FF', grass: '#A9EC84', grass2: '#7ED35C',
  ink: '#2B2540', surface: '#FFFFFF', surface2: '#F3F0FF', text: '#2B2540', textDim: '#5A5478', textMute: '#777194', onInk: '#FFFFFF',
  pink: '#FF7AB0', blue: '#6CC1FF', purple: '#B48BFF', yellow: '#FFD84D', lime: '#BDF26E', orange: '#FFB15C',
  gold: '#FFC83D', gold2: '#FFF1B8', red: '#FF5C5C', green: '#3FD37F', paper: '#FFFDF6',
} as const;

export const confettiPalette = [color.pink, color.blue, color.purple, color.yellow, color.lime, color.orange];

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
