import type { FastifyPluginAsync } from 'fastify';

import { parseDataUrl, saveUpload } from '../infra/uploadStore';

const HTTP_BAD_REQUEST = 400;

type UploadRoutesOpts = {
    uploadsDir: string;
};

export const registerUploadRoutes: FastifyPluginAsync<UploadRoutesOpts> = async (app, opts) => {
    app.post('/uploads', async (request, reply) => {
        try {
            const dataUrl = readDataUrl(request.body);
            const image = parseDataUrl(dataUrl);
            const url = await saveUpload(opts.uploadsDir, image);
            return { url };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid upload';
            return reply.code(HTTP_BAD_REQUEST).send({ error: message });
        }
    });
};

function readDataUrl(body: unknown): string {
    if (typeof body !== 'object' || body === null || !('dataUrl' in body)) {
        throw new Error('dataUrl is required');
    }
    const dataUrl = (body as { dataUrl: unknown }).dataUrl;
    if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
        throw new Error('dataUrl is required');
    }
    return dataUrl;
}
