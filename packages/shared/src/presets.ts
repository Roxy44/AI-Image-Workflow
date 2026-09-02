import type { Preset } from './types';

export const DEMO_PRESET: Preset = {
    id: 'preset-demo',
    name: 'Premium 3D',
    mainPrompt: 'premium minimal 3D visual...',
    negativePrompt: 'clutter, noisy background...',
    references: ['/references/ref-1.png', '/references/ref-2.png'],
};

export const PHOTO_PRESET: Preset = {
    id: 'preset-photo',
    name: 'Photo',
    mainPrompt: 'photorealistic natural light photograph...',
    negativePrompt: 'illustration, cgi, painting, cartoon...',
    references: ['/references/ref-1.png', '/references/ref-2.png'],
};

export const PRESETS: Preset[] = [DEMO_PRESET, PHOTO_PRESET];

export function findPreset(presetId: string): Preset | undefined {
    return PRESETS.find((preset) => preset.id === presetId);
}
