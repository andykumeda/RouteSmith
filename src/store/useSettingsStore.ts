import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    units: 'imperial' | 'metric';
    setUnits: (units: 'imperial' | 'metric') => void;
    toggleUnits: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            units: 'imperial',
            setUnits: (units) => set({ units }),
            toggleUnits: () =>
                set((state) => ({
                    units: state.units === 'imperial' ? 'metric' : 'imperial',
                })),
        }),
        {
            name: 'trail-nav-settings',
        }
    )
);
