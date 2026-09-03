import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import { createCloudflareImageGenerator } from './cloudflareImageGenerator';
import { MOCK_PNG } from './mockImageGenerator';

describe('createCloudflareImageGenerator', () => {
    it('posts JSON to flux-1-schnell and decodes the result image', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            fetchImpl: async (url, init) => {
                calls.push({ url: String(url), init: init ?? {} });
                return jsonResponse({
                    success: true,
                    result: { image: MOCK_PNG.toString('base64') },
                });
            },
        });

        const image = await generator.generate(
            { prompt: 'a red cube', negativePrompt: 'blur', references: [] },
            new AbortController().signal,
        );

        expect(calls).toHaveLength(1);
        expect(calls[0]?.url).toContain('/accounts/acct/ai/run/@cf/black-forest-labs/flux-1-schnell');
        expect(authHeader(calls[0])).toBe('Bearer cf-token');
        expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
            prompt: 'a red cube\nAvoid: blur',
            steps: 4,
        });
        expect(image.bytes.equals(MOCK_PNG)).toBe(true);
        expect(image.mimeType).toBe('image/png');
    });

    it('sends the source image as multipart input_image_0 for edit', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            fetchImpl: async (url, init) => {
                calls.push({ url: String(url), init: init ?? {} });
                return jsonResponse({
                    success: true,
                    result: { image: MOCK_PNG.toString('base64') },
                });
            },
        });

        await generator.edit(
            { prompt: 'make it night', negativePrompt: '', references: [] },
            { bytes: MOCK_PNG, mimeType: 'image/png' },
            new AbortController().signal,
        );

        expect(calls[0]?.url).toContain('/ai/run/@cf/black-forest-labs/flux-2-dev');
        expect(calls[0]?.init.body).toBeInstanceOf(FormData);
        const form = calls[0]?.init.body as FormData;
        expect(form.get('prompt')).toBe('make it night');
        expect(form.get('input_image_0')).toBeInstanceOf(Blob);
    });

    it('surfaces Cloudflare error text without leaking the token', async () => {
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            fetchImpl: async () =>
                jsonResponse(
                    {
                        success: false,
                        errors: [{ message: 'Authentication error' }],
                    },
                    403,
                ),
        });

        await expect(
            generator.generate({ prompt: 'cube', negativePrompt: '', references: [] }, new AbortController().signal),
        ).rejects.toThrow('Cloudflare Workers AI failed (403): Authentication error');
    });

    it('retries a 429 capacity error once and then succeeds', async () => {
        let calls = 0;
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            retryDelayMs: 0,
            fetchImpl: async () => {
                calls += 1;
                if (calls === 1) {
                    return jsonResponse(
                        {
                            success: false,
                            errors: [{ message: 'Capacity temporarily exceeded' }],
                        },
                        429,
                    );
                }
                return jsonResponse({
                    success: true,
                    result: { image: MOCK_PNG.toString('base64') },
                });
            },
        });

        const image = await generator.generate(
            { prompt: 'cube', negativePrompt: '', references: [] },
            new AbortController().signal,
        );

        expect(calls).toBe(2);
        expect(image.bytes.equals(MOCK_PNG)).toBe(true);
    });

    it('asks to retry after Cloudflare stays at capacity', async () => {
        let calls = 0;
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            retryDelayMs: 0,
            fetchImpl: async () => {
                calls += 1;
                return jsonResponse(
                    {
                        success: false,
                        errors: [{ message: 'Capacity temporarily exceeded' }],
                    },
                    429,
                );
            },
        });

        await expect(
            generator.generate({ prompt: 'cube', negativePrompt: '', references: [] }, new AbortController().signal),
        ).rejects.toThrow('Cloudflare сейчас перегружен. Подожди несколько секунд и нажми «Повторить».');
        expect(calls).toBe(2);
    });

    it('does not retry a daily neuron quota error', async () => {
        let calls = 0;
        const generator = createCloudflareImageGenerator(cloudflareConfig(), {
            retryDelayMs: 0,
            fetchImpl: async () => {
                calls += 1;
                return jsonResponse(
                    {
                        success: false,
                        errors: [
                            {
                                code: 3036,
                                message: 'You have used up your daily free allocation of 10,000 neurons.',
                            },
                        ],
                    },
                    429,
                );
            },
        });

        await expect(
            generator.generate({ prompt: 'cube', negativePrompt: '', references: [] }, new AbortController().signal),
        ).rejects.toThrow(/Дневной бесплатный лимит Cloudflare/);
        expect(calls).toBe(1);
    });
});

function cloudflareConfig(): ApiConfig {
    return {
        host: '127.0.0.1',
        port: 3001,
        webOrigin: 'http://localhost:5173',
        imageProvider: 'cloudflare',
        cloudflareAccountId: 'acct',
        cloudflareApiToken: 'cf-token',
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
