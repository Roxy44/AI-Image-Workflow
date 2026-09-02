import type { GenerationRequest } from '@aiwf/shared';

import type { ApiConfig } from '../config';
import type { GeneratedImage, ImageGenerator } from './imageGenerator';

const HTTP_OK = 200;
const ERROR_BODY_PREVIEW = 240;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export type LiveImageGeneratorDeps = {
    fetchImpl?: typeof fetch;
};

export function createLiveImageGenerator(config: ApiConfig, deps: LiveImageGeneratorDeps = {}): ImageGenerator {
    const apiKey = config.imageApiKey;
    if (!apiKey) {
        throw new Error('Live image API is not configured. Set IMAGE_API_KEY or FAL_KEY, or use IMAGE_PROVIDER=mock.');
    }

    const fetchImpl = deps.fetchImpl ?? fetch;

    return {
        generate(request, signal) {
            return runFal(fetchImpl, {
                url: config.imageApiUrl,
                apiKey,
                body: {
                    prompt: composePrompt(request),
                    num_images: 1,
                    output_format: 'png',
                    image_size: 'square_hd',
                    sync_mode: true,
                },
                signal,
            });
        },
        edit(request, source, signal) {
            return runFal(fetchImpl, {
                url: config.imageEditApiUrl,
                apiKey,
                body: {
                    prompt: composePrompt(request),
                    image_url: toDataUri(source),
                    num_images: 1,
                    output_format: 'png',
                    sync_mode: true,
                },
                signal,
            });
        },
    };
}

function composePrompt(request: GenerationRequest): string {
    const prompt = request.prompt.trim();
    const negative = request.negativePrompt.trim();
    if (negative.length === 0) {
        return prompt;
    }
    return `${prompt}\nAvoid: ${negative}`;
}

function toDataUri(image: GeneratedImage): string {
    return `data:${image.mimeType};base64,${image.bytes.toString('base64')}`;
}

type FalCall = {
    url: string;
    apiKey: string;
    body: Record<string, unknown>;
    signal: AbortSignal;
};

async function runFal(fetchImpl: typeof fetch, call: FalCall): Promise<GeneratedImage> {
    const response = await fetchImpl(call.url, {
        method: 'POST',
        headers: {
            Authorization: `Key ${call.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(call.body),
        signal: call.signal,
    });
    const payload = await readBody(response);
    if (response.status !== HTTP_OK) {
        throw new Error(formatFalError(response.status, payload));
    }
    const imageUrl = firstImageUrl(payload);
    if (imageUrl.startsWith('data:')) {
        return parseImageDataUri(imageUrl);
    }
    return downloadImage(fetchImpl, imageUrl, call.signal);
}

async function downloadImage(fetchImpl: typeof fetch, url: string, signal: AbortSignal): Promise<GeneratedImage> {
    const response = await fetchImpl(url, { signal });
    if (response.status !== HTTP_OK) {
        throw new Error(`Fal image download failed (${response.status})`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const mimeType = mimeFromHeader(response.headers.get('content-type'));
    if (!ALLOWED_MIME.has(mimeType)) {
        throw new Error(`Unsupported Fal image type: ${mimeType}`);
    }
    return { bytes, mimeType: mimeType as GeneratedImage['mimeType'] };
}

function firstImageUrl(payload: unknown): string {
    if (!isRecord(payload) || !Array.isArray(payload.images) || payload.images.length === 0) {
        throw new Error('Fal image API returned no images');
    }
    const first = payload.images[0];
    if (!isRecord(first) || typeof first.url !== 'string' || first.url.length === 0) {
        throw new Error('Fal image API returned an image without a url');
    }
    return first.url;
}

function parseImageDataUri(dataUrl: string): GeneratedImage {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match || !match[1] || !match[2]) {
        throw new Error('Fal image API returned an invalid data URI');
    }
    const mimeType = match[1];
    if (!ALLOWED_MIME.has(mimeType)) {
        throw new Error(`Unsupported Fal image type: ${mimeType}`);
    }
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length === 0) {
        throw new Error('Fal image API returned an empty image');
    }
    return { bytes, mimeType: mimeType as GeneratedImage['mimeType'] };
}

function mimeFromHeader(header: string | null): string {
    const raw = header?.split(';')[0]?.trim().toLowerCase() ?? 'image/png';
    return raw === 'image/jpg' ? 'image/jpeg' : raw;
}

async function readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) {
        return null;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        const preview = text.slice(0, ERROR_BODY_PREVIEW);
        throw new Error(`Fal image API returned non-JSON (${response.status}): ${preview}`);
    }
}

function formatFalError(status: number, payload: unknown): string {
    return `Fal image API failed (${status}): ${extractErrorMessage(payload)}`;
}

function extractErrorMessage(payload: unknown): string {
    if (typeof payload === 'string' && payload.length > 0) {
        return payload;
    }
    if (!isRecord(payload)) {
        return 'Unknown error';
    }
    if (typeof payload.detail === 'string') {
        return payload.detail;
    }
    if (Array.isArray(payload.detail)) {
        const parts = payload.detail.map((item) => {
            if (typeof item === 'string') {
                return item;
            }
            if (isRecord(item) && typeof item.msg === 'string') {
                return item.msg;
            }
            return '';
        });
        const joined = parts.filter((part) => part.length > 0).join('; ');
        if (joined.length > 0) {
            return joined;
        }
    }
    if (typeof payload.message === 'string') {
        return payload.message;
    }
    if (isRecord(payload.error) && typeof payload.error.message === 'string') {
        return payload.error.message;
    }
    return 'Unknown error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
