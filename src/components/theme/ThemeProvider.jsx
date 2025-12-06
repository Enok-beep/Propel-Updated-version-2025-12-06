import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

// 9 Curated Palettes from project_timepage_3
export const palettes = [
  {
    id: "arctic",
    name: "Arctic",
    variants: {
      light: { bg: "#F5F7F9", color: "#191e22", accent: "#2a454c", subtle: "#637281", card: "#FFFFFF", border: "#E6E6E6" },
      dark:  { bg: "#0A0B0F", color: "#E8E9EA", accent: "#4A6B72", subtle: "#8FA0B0", card: "#171717", border: "#2A2A2A" },
    },
  },
  {
    id: "azure",
    name: "Azure",
    variants: {
      light: { bg: "#EAF2F8", color: "#1c2b36", accent: "#2D6E9D", subtle: "#6C8597", card: "#FFFFFF", border: "#D4E4EF" },
      dark:  { bg: "#0B1016", color: "#E4E9EE", accent: "#4B8FBF", subtle: "#99AABB", card: "#151B22", border: "#253040" },
    },
  },
  {
    id: "indigo",
    name: "Indigo",
    variants: {
      light: { bg: "#EEF0FA", color: "#1f2430", accent: "#434A9F", subtle: "#6B6F9C", card: "#FFFFFF", border: "#DDDFF2" },
      dark:  { bg: "#0B0C16", color: "#E6E7F4", accent: "#6B73D9", subtle: "#9AA0CF", card: "#14152A", border: "#2A2C45" },
    },
  },
  {
    id: "scarlet",
    name: "Scarlet",
    variants: {
      light: { bg: "#FFF1F1", color: "#23191b", accent: "#B23B3B", subtle: "#8C5C5C", card: "#FFFFFF", border: "#F0D4D4" },
      dark:  { bg: "#180C0C", color: "#F1D9D9", accent: "#D45A5A", subtle: "#B88F8F", card: "#201414", border: "#3A2020" },
    },
  },
  {
    id: "mandarin",
    name: "Mandarin",
    variants: {
      light: { bg: "#FFF6EC", color: "#271f17", accent: "#D77E3E", subtle: "#9B6C4F", card: "#FFFFFF", border: "#F0DCC8" },
      dark:  { bg: "#120E09", color: "#F2E1CF", accent: "#F29B59", subtle: "#C89B7A", card: "#1A1510", border: "#352A1F" },
    },
  },
  {
    id: "mint",
    name: "Mint",
    variants: {
      light: { bg: "#ECF8F3", color: "#14201b", accent: "#3AA483", subtle: "#628A7C", card: "#FFFFFF", border: "#C8E8DC" },
      dark:  { bg: "#08120E", color: "#D8EFE6", accent: "#56C2A0", subtle: "#8BB5A7", card: "#101A15", border: "#1F352A" },
    },
  },
  {
    id: "forest",
    name: "Forest",
    variants: {
      light: { bg: "#F3F6F4", color: "#172017", accent: "#355A3C", subtle: "#6A7A6D", card: "#FFFFFF", border: "#D4DED6" },
      dark:  { bg: "#0A0F0B", color: "#E4EAE5", accent: "#4C7A56", subtle: "#94A59A", card: "#131A14", border: "#253028" },
    },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    variants: {
      light: { bg: "#F2F3F5", color: "#202226", accent: "#2C2F36", subtle: "#6E7480", card: "#FFFFFF", border: "#E0E2E6" },
      dark:  { bg: "#0A0B0E", color: "#E6E7EA", accent: "#4A4E57", subtle: "#9AA0AA", card: "#151618", border: "#2A2C30" },
    },
  },
  {
    id: "sand",
    name: "Sand",
    variants: {
      light: { bg: "#FAF7F2", color: "#2b2620", accent: "#B8A07A", subtle: "#8B8072", card: "#FFFFFF", border: "#E8E0D4" },
      dark:  { bg: "#14110C", color: "#EEE8DF", accent: "#D1B994", subtle: "#B4A795", card: "#1C1814", border: "#35302A" },
    },
  },
  {
    id: "navy",
    name: "Navy",
    variants: {
      light: { bg: "#EDF2F7", color: "#1A2942", accent: "#2563EB", subtle: "#6B7C92", card: "#FAFCFE", border: "#D8E2ED" },
      dark:  { bg: "#0F1B32", color: "#E8F0F9", accent: "#60A5FA", subtle: "#A8BADA", card: "#1E3A5F", border: "#2E4A6F" },
    },
  },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [paletteId, setPaletteId] = useState('arctic');
  const [mode, setMode] = useState('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await base44.entities.UserPreferences.list();
        if (prefs.length > 0) {
          setPaletteId(prefs[0].theme_id || 'arctic');
          setMode(prefs[0].mode || 'dark');
        }
      } catch (e) {
        console.log('No preferences yet');
      }
      setIsLoaded(true);
    };
    loadPrefs();
  }, []);

  // Detect system preference
  useEffect(() => {
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setMode(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);

  const palette = useMemo(() => 
    palettes.find(p => p.id === paletteId) || palettes[0], 
    [paletteId]
  );

  const effectiveMode = useMemo(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode]);

  const tokens = useMemo(() => palette.variants[effectiveMode], [palette, effectiveMode]);

  // Apply theme CSS variables to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--background', tokens.bg);
    root.style.setProperty('--foreground', tokens.color);
    root.style.setProperty('--card', tokens.card);
    root.style.setProperty('--card-foreground', tokens.color);
    root.style.setProperty('--primary', tokens.accent);
    root.style.setProperty('--primary-foreground', tokens.bg);
    root.style.setProperty('--muted', tokens.card);
    root.style.setProperty('--muted-foreground', tokens.subtle);
    root.style.setProperty('--accent', tokens.accent);
    root.style.setProperty('--border', tokens.border);

    root.classList.remove('light', 'dark');
    root.classList.add(effectiveMode);

    document.body.style.backgroundColor = tokens.bg;
    document.body.style.color = tokens.color;
  }, [tokens, effectiveMode]);

  const updateTheme = async (newPaletteId, newMode) => {
    setPaletteId(newPaletteId);
    if (newMode) setMode(newMode);
    
    try {
      const prefs = await base44.entities.UserPreferences.list();
      if (prefs.length > 0) {
        await base44.entities.UserPreferences.update(prefs[0].id, {
          theme_id: newPaletteId,
          mode: newMode || mode
        });
      } else {
        await base44.entities.UserPreferences.create({
          theme_id: newPaletteId,
          mode: newMode || mode
        });
      }
    } catch (e) {
      console.log('Failed to save preferences');
    }
  };

  const value = {
    palette,
    paletteId,
    mode,
    effectiveMode,
    tokens,
    palettes,
    setPalette: (id) => updateTheme(id, mode),
    setMode: (m) => updateTheme(paletteId, m),
    isLoaded
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeProvider;