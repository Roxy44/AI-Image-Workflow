import { mkdir } from 'node:fs/promises';

import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import { registerPresetRoutes } from './http/presetsRoutes';
import { registerRunRoutes } from './http/runsRoutes';
import { registerUploadRoutes } from './http/uploadsRoutes';
import { createDiskImageReader } from './infra/diskImageReader';
import { createCloudflareImageGenerator } from './infra/cloudflareImageGenerator';
import { createMockImageGenerator } from './infra/mockImageGenerator';
import { createFileResultStore } from './infra/resultStore';
import { createMemoryRunStore } from './infra/runStore';
import type { ApiConfig } from './config';
import type { ExecuteDeps } from './application/executeRun';
import type { ImageGenerator } from './infra/imageGenerator';

export async function buildApp(config: ApiConfig) {
    const app = Fastify({ logger: true });
    const store = createMemoryRunStore();
    const generator = createGenerator(config);
    const results = createFileResultStore(config.resultsDir);
    const images = createDiskImageReader({
        uploadsDir: config.uploadsDir,
        resultsDir: config.resultsDir,
        referencesDir: config.publicDir,
    });
    const executeDeps: ExecuteDeps = {
        store,
        generator,
        results,
        images,
        timeoutMs: config.aiTimeoutMs,
    };

    await mkdir(config.resultsDir, { recursive: true });
    await mkdir(config.uploadsDir, { recursive: true });
    await mkdir(config.publicDir, { recursive: true });

    await app.register(cors, { origin: config.webOrigin });
    await app.register(fastifyStatic, {
        root: config.publicDir,
        prefix: '/references/',
        decorateReply: false,
    });
    await app.register(fastifyStatic, {
        root: config.resultsDir,
        prefix: '/results/',
        decorateReply: false,
    });
    await app.register(fastifyStatic, {
        root: config.uploadsDir,
        prefix: '/uploads/',
        decorateReply: false,
    });

    app.get('/health', async () => ({ ok: true }));
    await app.register(registerPresetRoutes, { prefix: '/api' });
    await app.register(registerUploadRoutes, { prefix: '/api', uploadsDir: config.uploadsDir });
    await app.register(registerRunRoutes, { prefix: '/api', executeDeps });

    return app;
}

function createGenerator(config: ApiConfig): ImageGenerator {
    if (config.imageProvider === 'cloudflare') {
        return createCloudflareImageGenerator(config);
    }
    return createMockImageGenerator();
}
