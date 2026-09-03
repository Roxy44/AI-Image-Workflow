import type { GenerationRequest } from '@aiwf/shared';

import type { ApiConfig } from '../config';
import type { GeneratedImage, ImageGenerator } from './imageGenerator';

const HTTP_OK = 200;
const HTTP_TOO_MANY = 429;
const GENERATE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const EDIT_MODEL = '@cf/black-forest-labs/flux-2-dev';
const GENERATE_STEPS = 4;
const EDIT_STEPS = 8;
const EDIT_SIZE = 512;
const ERROR_BODY_PREVIEW = 240;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const CAPACITY_RETRY_LIMIT = 1;
const CAPACITY_RETRY_DELAY_MS = 2_000;
const ACCOUNT_LIMITED_CODE = 3036;
const CAPACITY_USER_MESSAGE = 'Cloudflare сейчас перегружен. Подожди несколько секунд и нажми «Повторить».';
const QUOTA_USER_MESSAGE =
    'Дневной бесплатный лимит Cloudflare исчерпан (10 000 neurons). Он не восстановится, пока не наступит 00:00 UTC.';

export type CloudflareImageGeneratorDeps = {
    fetchImpl?: typeof fetch;
    retryDelayMs?: number;
};

export function createCloudflareImageGenerator(config: ApiConfig, deps: CloudflareImageGeneratorDeps = {}): ImageGenerator {
    const accountId = config.cloudflareAccountId;
    const token = config.cloudflareApiToken;
    if (!accountId || !token) {
        throw new Error(
            'Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, or use IMAGE_PROVIDER=mock.',
        );
    }

    const fetchImpl = deps.fetchImpl ?? fetch;
    const retryDelayMs = deps.retryDelayMs ?? CAPACITY_RETRY_DELAY_MS;
    const generateUrl = runUrl(accountId, GENERATE_MODEL);
    const editUrl = runUrl(accountId, EDIT_MODEL);

    return {
        generate(request, signal) {
            return runJson(fetchImpl, {
                url: generateUrl,
                token,
                body: { prompt: composePrompt(request), steps: GENERATE_STEPS },
                signal,
                retryDelayMs,
            });
        },
        async edit(request, source, signal) {
            const form = new FormData();
            form.append('prompt', composePrompt(request));
            form.append('steps', String(EDIT_STEPS));
            form.append('width', String(EDIT_SIZE));
            form.append('height', String(EDIT_SIZE));
            form.append('input_image_0', new Blob([new Uint8Array(source.bytes)], { type: source.mimeType }), 'source.png');
            return runMultipart(fetchImpl, { url: editUrl, token, form, signal, retryDelayMs });
        },
    };
}

function runUrl(accountId: string, model: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

function composePrompt(request: GenerationRequest): string {
    const prompt = request.prompt.trim();
    const negative = request.negativePrompt.trim();
    if (negative.length === 0) {
        return prompt;
    }
    return `${prompt}\nAvoid: ${negative}`;
}

type JsonCall = {
    url: string;
    token: string;
    body: Record<string, unknown>;
    signal: AbortSignal;
    retryDelayMs: number;
};

type MultipartCall = {
    url: string;
    token: string;
    form: FormData;
    signal: AbortSignal;
    retryDelayMs: number;
};

async function runJson(fetchImpl: typeof fetch, call: JsonCall): Promise<GeneratedImage> {
    return withCapacityRetry(call.signal, call.retryDelayMs, () =>
        fetchImpl(call.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${call.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(call.body),
            signal: call.signal,
        }).then(parseCloudflareImage),
    );
}

async function runMultipart(fetchImpl: typeof fetch, call: MultipartCall): Promise<GeneratedImage> {
    return withCapacityRetry(call.signal, call.retryDelayMs, () =>
        fetchImpl(call.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${call.token}`,
            },
            body: call.form,
            signal: call.signal,
        }).then(parseCloudflareImage),
    );
}

async function withCapacityRetry(
    signal: AbortSignal,
    retryDelayMs: number,
    run: () => Promise<GeneratedImage>,
): Promise<GeneratedImage> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= CAPACITY_RETRY_LIMIT; attempt += 1) {
        try {
            return await run();
        } catch (error) {
            lastError = error;
            if (!isCapacityError(error) || attempt === CAPACITY_RETRY_LIMIT) {
                throw error;
            }
            await sleep(retryDelayMs, signal);
        }
    }
    throw lastError;
}

function isCapacityError(error: unknown): boolean {
    return error instanceof Error && error.message === CAPACITY_USER_MESSAGE;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new Error('Generation timed out'));
            return;
        }
        if (ms <= 0) {
            resolve();
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

async function parseCloudflareImage(response: Response): Promise<GeneratedImage> {
    const payload = await readBody(response);
    if (response.status === HTTP_TOO_MANY) {
        throw new Error(isNeuronQuota(payload) ? QUOTA_USER_MESSAGE : CAPACITY_USER_MESSAGE);
    }
    if (response.status !== HTTP_OK || !isSuccess(payload)) {
        throw new Error(`Cloudflare Workers AI failed (${response.status}): ${extractErrorMessage(payload)}`);
    }
    const encoded = extractImageBase64(payload);
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0) {
        throw new Error('Cloudflare Workers AI returned an empty image');
    }
    return { bytes, mimeType: detectMime(bytes) };
}

function isSuccess(payload: unknown): boolean {
    if (!isRecord(payload)) {
        return false;
    }
    return payload.success === true || payload.success === undefined;
}

function extractImageBase64(payload: unknown): string {
    if (!isRecord(payload)) {
        throw new Error('Cloudflare Workers AI returned no image');
    }
    if (typeof payload.image === 'string' && payload.image.length > 0) {
        return stripDataUri(payload.image);
    }
    if (typeof payload.result === 'string' && payload.result.length > 0) {
        return stripDataUri(payload.result);
    }
    if (isRecord(payload.result) && typeof payload.result.image === 'string' && payload.result.image.length > 0) {
        return stripDataUri(payload.result.image);
    }
    throw new Error('Cloudflare Workers AI returned no image');
}

function stripDataUri(value: string): string {
    const marker = ';base64,';
    const index = value.indexOf(marker);
    if (value.startsWith('data:') && index >= 0) {
        return value.slice(index + marker.length);
    }
    return value;
}

function detectMime(bytes: Buffer): GeneratedImage['mimeType'] {
    if (
        bytes.length >= PNG_MAGIC.length &&
        PNG_MAGIC.every((part, index) => bytes[index] === part)
    ) {
        return 'image/png';
    }
    return 'image/jpeg';
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
        throw new Error(`Cloudflare Workers AI returned non-JSON (${response.status}): ${preview}`);
    }
}

function isNeuronQuota(payload: unknown): boolean {
    if (errorCodes(payload).includes(ACCOUNT_LIMITED_CODE)) {
        return true;
    }
    const message = extractErrorMessage(payload).toLowerCase();
    return message.includes('daily free') || message.includes('10,000 neurons');
}

function errorCodes(payload: unknown): number[] {
    if (!isRecord(payload) || !Array.isArray(payload.errors)) {
        return [];
    }
    return payload.errors.flatMap((item) => {
        if (isRecord(item) && typeof item.code === 'number') {
            return [item.code];
        }
        return [];
    });
}

function extractErrorMessage(payload: unknown): string {
    if (typeof payload === 'string' && payload.length > 0) {
        return payload;
    }
    if (!isRecord(payload)) {
        return 'Unknown error';
    }
    if (Array.isArray(payload.errors)) {
        const parts = payload.errors.map((item) => {
            if (isRecord(item) && typeof item.message === 'string') {
                return item.message;
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
    return 'Unknown error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
