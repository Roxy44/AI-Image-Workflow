import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 3001;
const DEFAULT_TIMEOUT_MS = 180_000;
const here = path.dirname(fileURLToPath(import.meta.url));

export type ImageProviderName = 'mock' | 'cloudflare';

const PROVIDERS: readonly ImageProviderName[] = ['mock', 'cloudflare'];

export type ApiConfig = {
    host: string;
    port: number;
    webOrigin: string;
    imageProvider: ImageProviderName;
    cloudflareAccountId: string | null;
    cloudflareApiToken: string | null;
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
    if (!isProvider(provider)) {
        throw new Error(`IMAGE_PROVIDER must be mock or cloudflare, got: ${provider}`);
    }

    const cloudflareAccountId = optionalEnv(env.CLOUDFLARE_ACCOUNT_ID);
    const cloudflareApiToken = optionalEnv(env.CLOUDFLARE_API_TOKEN);
    if (provider === 'cloudflare' && (!cloudflareAccountId || !cloudflareApiToken)) {
        throw new Error('IMAGE_PROVIDER=cloudflare requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
    }

    return {
        host: env.API_HOST ?? '127.0.0.1',
        port,
        webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
        imageProvider: provider,
        cloudflareAccountId,
        cloudflareApiToken,
        aiTimeoutMs,
        publicDir: env.API_PUBLIC_DIR ?? path.join(here, '../public/references'),
        resultsDir: env.API_RESULTS_DIR ?? path.join(here, '../storage/results'),
        uploadsDir: env.API_UPLOADS_DIR ?? path.join(here, '../storage/uploads'),
    };
}

function isProvider(value: string): value is ImageProviderName {
    return (PROVIDERS as readonly string[]).includes(value);
}

function optionalEnv(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
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
