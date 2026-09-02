import { describe, expect, it } from 'vitest';

import { loadConfig, loadEnvFiles } from './config';

describe('loadConfig', () => {
    it('keeps mock as the default provider', () => {
        const config = loadConfig({
            API_HOST: '127.0.0.1',
            API_PORT: '3001',
        });

        expect(config.imageProvider).toBe('mock');
        expect(config.imageApiKey).toBeNull();
        expect(config.imageApiUrl).toBe('https://fal.run/fal-ai/flux/schnell');
        expect(config.imageEditApiUrl).toBe('https://fal.run/fal-ai/flux/dev/image-to-image');
    });

    it('accepts live when IMAGE_API_KEY is set', () => {
        const config = loadConfig({
            IMAGE_PROVIDER: 'live',
            IMAGE_API_KEY: 'fal-key',
        });

        expect(config.imageProvider).toBe('live');
        expect(config.imageApiKey).toBe('fal-key');
    });

    it('uses FAL_KEY when IMAGE_API_KEY is empty', () => {
        const config = loadConfig({
            IMAGE_PROVIDER: 'live',
            FAL_KEY: 'from-fal-env',
        });

        expect(config.imageApiKey).toBe('from-fal-env');
    });

    it('rejects live without a key', () => {
        expect(() => loadConfig({ IMAGE_PROVIDER: 'live' })).toThrow(/IMAGE_API_KEY or FAL_KEY/);
    });
});

describe('loadEnvFiles', () => {
    it('does not override variables that are already set', () => {
        const env: NodeJS.ProcessEnv = { IMAGE_PROVIDER: 'mock' };

        loadEnvFiles(env);

        expect(env.IMAGE_PROVIDER).toBe('mock');
    });
});
