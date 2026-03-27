const Colors = {
  dark: {
    // Clean, professional high-tech palette (Obsidian/Linear-inspired)
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    backgroundTertiary: '#121212',
    surface: '#0A0A0A',
    surfaceHover: '#121212',
    // Text
    text: '#FFFFFF', // headings
    textSecondary: '#E0E0E0', // body
    textMuted: '#A0A0A0',
    // Accent: muted blue-cyan for active elements only (no fills/glows)
    accent: 'rgba(0,170,255,0.60)', // #00AAFF @ 60%
    accentLight: 'rgba(0,170,255,0.60)',
    accentGlow: 'transparent',
    cyan: 'rgba(0,170,255,0.60)',
    cyanGlow: 'transparent',
    tint: 'rgba(0,170,255,0.60)',
    tabIconDefault: '#8A8A8A',
    tabIconSelected: 'rgba(0,170,255,0.60)',
    // Borders are neutral; cyan is reserved for focus-only accents
    border: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.14)',
    success: '#FFFFFF',
    error: '#E0E0E0', // keep destructive UI monochrome; use copy instead of red
    warning: '#E0E0E0',
    // Categories stay monochrome (no rainbow)
    cardDecision: 'rgba(0,170,255,0.60)',
    cardPrediction: 'rgba(0,170,255,0.60)',
    cardHabit: 'rgba(0,170,255,0.60)',
    cardCreativity: 'rgba(0,170,255,0.60)',
    cardWellness: 'rgba(0,170,255,0.60)',
    cardProductivity: 'rgba(0,170,255,0.60)',
  },
  light: {
    // Minimal clean light mode (still high-tech)
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#EEEEEE',
    surface: '#FFFFFF',
    surfaceHover: '#F2F2F2',
    text: '#000000',
    textSecondary: '#111111',
    textMuted: '#666666',
    accent: '#008B8B',
    accentLight: '#2AAE0F',
    accentGlow: 'transparent',
    cyan: '#008B8B',
    cyanGlow: 'transparent',
    tint: '#008B8B',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#008B8B',
    border: 'rgba(0, 0, 0, 0.10)',
    borderLight: 'rgba(0, 0, 0, 0.14)',
    success: '#2AAE0F',
    error: '#CC2F26',
    warning: '#B45309',
    cardDecision: '#008B8B',
    cardPrediction: '#008B8B',
    cardHabit: '#2AAE0F',
    cardCreativity: '#008B8B',
    cardWellness: '#2AAE0F',
    cardProductivity: '#008B8B',
  },
};

export default Colors;
