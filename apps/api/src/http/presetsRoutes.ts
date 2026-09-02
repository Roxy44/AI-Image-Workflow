import { PRESETS } from '@aiwf/shared';
import type { FastifyPluginAsync } from 'fastify';

export const registerPresetRoutes: FastifyPluginAsync = async (app) => {
    app.get('/presets', async () => ({ presets: PRESETS }));
};
