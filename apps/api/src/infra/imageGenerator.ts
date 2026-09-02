import type { GenerationRequest } from '@aiwf/shared';

export type GeneratedImage = {
    bytes: Buffer;
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
};

export type ImageGenerator = {
    generate: (request: GenerationRequest, signal: AbortSignal) => Promise<GeneratedImage>;
    edit: (request: GenerationRequest, source: GeneratedImage, signal: AbortSignal) => Promise<GeneratedImage>;
};
