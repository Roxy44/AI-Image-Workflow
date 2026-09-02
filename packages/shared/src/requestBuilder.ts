import type { GenerationRequest, Preset } from './types';

export function buildGenerationRequest(userPrompt: string, preset: Preset): GenerationRequest {
    const trimmedUser = userPrompt.trim();
    const prompt = [preset.mainPrompt.trim(), trimmedUser].filter((part) => part.length > 0).join('\n');

    return {
        prompt,
        negativePrompt: preset.negativePrompt,
        references: [...preset.references],
    };
}
