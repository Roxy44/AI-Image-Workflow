import type { GeneratedImage, ImageGenerator } from './imageGenerator';

const MOCK_DELAY_MS = 400;

export const MOCK_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

export const MOCK_EDIT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

export function createMockImageGenerator(delayMs = MOCK_DELAY_MS): ImageGenerator {
    return {
        async generate(_request, signal): Promise<GeneratedImage> {
            await sleep(delayMs, signal);
            return { bytes: MOCK_PNG, mimeType: 'image/png' };
        },
        async edit(_request, _source, signal): Promise<GeneratedImage> {
            await sleep(delayMs, signal);
            return { bytes: MOCK_EDIT_PNG, mimeType: 'image/png' };
        },
    };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new Error('Generation timed out'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                reject(new Error('Generation timed out'));
            },
            { once: true },
        );
    });
}
