import { describe, expect, it } from 'vitest';

import { DEMO_PRESET, PHOTO_PRESET, PRESETS } from './presets';
import { buildGenerationRequest } from './requestBuilder';

describe('request builder', () => {
    it('joins preset mainPrompt with the user prompt and keeps references', () => {
        const request = buildGenerationRequest('user scene', DEMO_PRESET);

        expect(request.prompt).toBe(`${DEMO_PRESET.mainPrompt}\nuser scene`);
        expect(request.negativePrompt).toBe(DEMO_PRESET.negativePrompt);
        expect(request.references).toEqual(DEMO_PRESET.references);
        expect(request.references).not.toBe(DEMO_PRESET.references);
    });

    it('uses only the preset when the user prompt is empty', () => {
        const request = buildGenerationRequest('   ', DEMO_PRESET);

        expect(request.prompt).toBe(DEMO_PRESET.mainPrompt);
    });

    it('keeps Premium 3D and Photo as separate presets', () => {
        expect(PRESETS.map((preset) => preset.name)).toEqual(['Premium 3D', 'Photo']);
        expect(buildGenerationRequest('', PHOTO_PRESET).prompt).toBe(PHOTO_PRESET.mainPrompt);
    });
});
