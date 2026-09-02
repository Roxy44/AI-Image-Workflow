import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import { createLiveImageGenerator } from './liveImageGenerator';
import { MOCK_PNG } from './mockImageGenerator';

const PNG_DATA_URI = `data:image/png;base64,${MOCK_PNG.toString('base64')}`;

describe('createLiveImageGenerator', () => {
    it('posts the composed prompt to Fal generate and returns PNG bytes', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const generator = createLiveImageGenerator(liveConfig(), {
            fetchImpl: async (url, init) => {
                calls.push({ url: String(url), init: init ?? {} });
                return jsonResponse({ images: [{ url: PNG_DATA_URI, content_type: 'image/png' }] });
            },
        });

        const image = await generator.generate(
            { prompt: 'a red cube', negativePrompt: 'blur', references: [] },
            new AbortController().signal,
        );

        expect(calls).toHaveLength(1);
        expect(calls[0]?.url).toBe('https://fal.run/fal-ai/flux/schnell');
        expect(authHeader(calls[0])).toBe('Key test-key');
        expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
            prompt: 'a red cube\nAvoid: blur',
            output_format: 'png',
            sync_mode: true,
        });
        expect(image.mimeType).toBe('image/png');
        expect(image.bytes.equals(MOCK_PNG)).toBe(true);
    });

    it('sends the source image as a data URI to the Fal edit endpoint', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const generator = createLiveImageGenerator(liveConfig(), {
            fetchImpl: async (url, init) => {
                calls.push({ url: String(url), init: init ?? {} });
                return jsonResponse({ images: [{ url: PNG_DATA_URI }] });
            },
        });

        await generator.edit(
            { prompt: 'make it night', negativePrompt: '', references: [] },
            { bytes: MOCK_PNG, mimeType: 'image/png' },
            new AbortController().signal,
        );

        expect(calls[0]?.url).toBe('https://fal.run/fal-ai/flux/dev/image-to-image');
        expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
            prompt: 'make it night',
            image_url: PNG_DATA_URI,
        });
    });

    it('downloads an https image URL when Fal does not return a data URI', async () => {
        const generator = createLiveImageGenerator(liveConfig(), {
            fetchImpl: async (url) => {
                if (String(url) === 'https://fal.media/result.png') {
                    return new Response(MOCK_PNG, {
                        status: 200,
                        headers: { 'Content-Type': 'image/png' },
                    });
                }
                return jsonResponse({ images: [{ url: 'https://fal.media/result.png' }] });
            },
        });

        const image = await generator.generate(
            { prompt: 'cube', negativePrompt: '', references: [] },
            new AbortController().signal,
        );

        expect(image.bytes.equals(MOCK_PNG)).toBe(true);
    });

    it('surfaces Fal error text without leaking the API key', async () => {
        const generator = createLiveImageGenerator(liveConfig(), {
            fetchImpl: async () => jsonResponse({ detail: 'Unauthorized' }, 401),
        });

        await expect(
            generator.generate({ prompt: 'cube', negativePrompt: '', references: [] }, new AbortController().signal),
        ).rejects.toThrow('Fal image API failed (401): Unauthorized');
    });
});

function liveConfig(): ApiConfig {
    return {
        host: '127.0.0.1',
        port: 3001,
        webOrigin: 'http://localhost:5173',
        imageProvider: 'live',
        imageApiUrl: 'https://fal.run/fal-ai/flux/schnell',
        imageEditApiUrl: 'https://fal.run/fal-ai/flux/dev/image-to-image',
        imageApiKey: 'test-key',
        aiTimeoutMs: 60_000,
        publicDir: '/tmp/public',
        resultsDir: '/tmp/results',
        uploadsDir: '/tmp/uploads',
    };
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function authHeader(call: { init: RequestInit } | undefined): string | null {
    const headers = new Headers(call?.init.headers);
    return headers.get('Authorization');
}
