import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 3001;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_GENERATE_URL = 'https://fal.run/fal-ai/flux/schnell';
const DEFAULT_EDIT_URL = 'https://fal.run/fal-ai/flux/dev/image-to-image';
const here = path.dirname(fileURLToPath(import.meta.url));

export type ImageProviderName = 'mock' | 'live';

export type ApiConfig = {
    host: string;
    port: number;
    webOrigin: string;
    imageProvider: ImageProviderName;
    imageApiUrl: string;
    imageEditApiUrl: string;
    imageApiKey: string | null;
    aiTimeoutMs: number;
    publicDir: string;
    resultsDir: string;
    uploadsDir: string;
};

export function loadEnvFiles(env: NodeJS.ProcessEnv = process.env): void {
    const candidates = [
        path.join(process.cwd(), '.env'),
        path.join(here, '../../.env'),
        path.join(here, '../../../.env'),
    ];
    const seen = new Set<string>();
    for (const filePath of candidates) {
        const resolved = path.resolve(filePath);
        if (seen.has(resolved) || !existsSync(resolved)) {
            continue;
        }
        seen.add(resolved);
        applyDotenv(readFileSync(resolved, 'utf8'), env);
    }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
    const portRaw = env.API_PORT ?? String(DEFAULT_PORT);
    const port = Number.parseInt(portRaw, 10);
    if (Number.isNaN(port)) {
        throw new Error(`API_PORT must be a number, got: ${portRaw}`);
    }

    const timeoutRaw = env.AI_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS);
    const aiTimeoutMs = Number.parseInt(timeoutRaw, 10);
    if (Number.isNaN(aiTimeoutMs) || aiTimeoutMs <= 0) {
        throw new Error(`AI_TIMEOUT_MS must be a positive number, got: ${timeoutRaw}`);
    }

    const provider = env.IMAGE_PROVIDER ?? 'mock';
    if (provider !== 'mock' && provider !== 'live') {
        throw new Error(`IMAGE_PROVIDER must be mock or live, got: ${provider}`);
    }

    const imageApiKey = firstNonEmpty(env.IMAGE_API_KEY, env.FAL_KEY);
    if (provider === 'live' && !imageApiKey) {
        throw new Error('IMAGE_PROVIDER=live requires IMAGE_API_KEY or FAL_KEY');
    }

    return {
        host: env.API_HOST ?? '127.0.0.1',
        port,
        webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
        imageProvider: provider,
        imageApiUrl: env.IMAGE_API_URL ?? DEFAULT_GENERATE_URL,
        imageEditApiUrl: env.IMAGE_EDIT_API_URL ?? DEFAULT_EDIT_URL,
        imageApiKey,
        aiTimeoutMs,
        publicDir: env.API_PUBLIC_DIR ?? path.join(here, '../public/references'),
        resultsDir: env.API_RESULTS_DIR ?? path.join(here, '../storage/results'),
        uploadsDir: env.API_UPLOADS_DIR ?? path.join(here, '../storage/uploads'),
    };
}

function firstNonEmpty(...values: Array<string | undefined>): string | null {
    for (const value of values) {
        const trimmed = value?.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return null;
}

function applyDotenv(text: string, env: NodeJS.ProcessEnv): void {
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith('#')) {
            continue;
        }
        const exportPrefix = 'export ';
        const assignment = line.startsWith(exportPrefix) ? line.slice(exportPrefix.length).trim() : line;
        const separator = assignment.indexOf('=');
        if (separator <= 0) {
            continue;
        }
        const key = assignment.slice(0, separator).trim();
        if (!key || env[key] !== undefined) {
            continue;
        }
        env[key] = unquote(assignment.slice(separator + 1).trim());
    }
}

function unquote(value: string): string {
    if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
        return value.slice(1, -1);
    }
    return value;
}
