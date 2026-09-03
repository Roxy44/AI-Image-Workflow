import { describe, expect, it } from 'vitest';

import { loadConfig, loadEnvFiles } from './config';

describe('loadConfig', () => {
    it('keeps mock as the default provider', () => {
        const config = loadConfig({
            API_HOST: '127.0.0.1',
            API_PORT: '3001',
        });

        expect(config.imageProvider).toBe('mock');
        expect(config.cloudflareAccountId).toBeNull();
        expect(config.cloudflareApiToken).toBeNull();
    });

    it('accepts cloudflare when account id and token are set', () => {
        const config = loadConfig({
            IMAGE_PROVIDER: 'cloudflare',
            CLOUDFLARE_ACCOUNT_ID: 'acct',
            CLOUDFLARE_API_TOKEN: 'token',
        });

        expect(config.imageProvider).toBe('cloudflare');
        expect(config.cloudflareAccountId).toBe('acct');
        expect(config.cloudflareApiToken).toBe('token');
    });

    it('rejects cloudflare without account credentials', () => {
        expect(() => loadConfig({ IMAGE_PROVIDER: 'cloudflare' })).toThrow(
            /CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN/,
        );
    });

    it('rejects unknown providers', () => {
        expect(() => loadConfig({ IMAGE_PROVIDER: 'live' })).toThrow(/mock or cloudflare/);
    });
});

describe('loadEnvFiles', () => {
    it('does not override variables that are already set', () => {
        const env: NodeJS.ProcessEnv = { IMAGE_PROVIDER: 'mock' };

        loadEnvFiles(env);

        expect(env.IMAGE_PROVIDER).toBe('mock');
    });
});
