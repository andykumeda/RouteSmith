import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
    units: 'imperial' | 'metric';
    theme: Theme;
    setUnits: (units: 'imperial' | 'metric') => void;
    toggleUnits: () => void;
    setTheme: (theme: Theme) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            units: 'imperial',
            theme: 'system',
            setUnits: (units) => set({ units }),
            toggleUnits: () =>
                set((state) => ({
                    units: state.units === 'imperial' ? 'metric' : 'imperial',
                })),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'trail-nav-settings',
        }
    )
);
