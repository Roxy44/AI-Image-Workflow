import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';

import { executeRun, retryNode, seedRunJobs, type ExecuteDeps } from '../application/executeRun';
import { parseCreateRunBody } from './parseRunBody';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

type RunRoutesOpts = {
    executeDeps: ExecuteDeps;
};

export const registerRunRoutes: FastifyPluginAsync<RunRoutesOpts> = async (app, opts) => {
    const { executeDeps } = opts;

    app.post('/runs', async (request, reply) => {
        try {
            const { graph, presetId } = parseCreateRunBody(request.body);
            const runId = randomUUID();
            executeDeps.store.create({
                runId,
                graph,
                presetId,
                status: 'queued',
                jobs: seedRunJobs(graph),
            });
            void executeRun(executeDeps, runId).catch((error: unknown) => {
                request.log.error({ err: error, runId }, 'run execution failed');
            });
            return { runId };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid run payload';
            return reply.code(HTTP_BAD_REQUEST).send({ error: message });
        }
    });

    app.get('/runs/:runId', async (request, reply) => {
        const { runId } = request.params as { runId: string };
        const run = executeDeps.store.get(runId);
        if (!run) {
            return reply.code(HTTP_NOT_FOUND).send({ error: 'Run not found' });
        }
        return {
            runId: run.runId,
            status: run.status,
            jobs: run.jobs,
        };
    });

    app.post('/runs/:runId/nodes/:nodeId/retry', async (request, reply) => {
        const { runId, nodeId } = request.params as { runId: string; nodeId: string };
        try {
            const run = await retryNode(executeDeps, runId, nodeId);
            return {
                runId: run.runId,
                status: run.status,
                jobs: run.jobs,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Retry failed';
            const notFound = message.startsWith('Run not found') || message.startsWith('Job not found');
            return reply.code(notFound ? HTTP_NOT_FOUND : HTTP_BAD_REQUEST).send({ error: message });
        }
    });
};
