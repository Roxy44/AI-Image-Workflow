import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createEditScenarioGraph, createMandatoryBranchingGraph } from '@aiwf/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { executeRun, seedRunJobs } from './executeRun';
import type { ImageGenerator } from '../infra/imageGenerator';
import { MOCK_PNG } from '../infra/mockImageGenerator';
import { createFileResultStore } from '../infra/resultStore';
import { createMemoryRunStore } from '../infra/runStore';

const DELAY_MS = 40;

describe('executeRun', () => {
    let tempDir = '';

    afterEach(async () => {
        if (tempDir) {
            await rm(tempDir, { recursive: true, force: true });
            tempDir = '';
        }
    });

    it('runs independent generate nodes concurrently', async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'aiwf-'));
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt');
        }
        prompt.data.text = 'a red cube';

        let inflight = 0;
        let maxInflight = 0;
        const generator: ImageGenerator = {
            async generate(_request, signal) {
                inflight += 1;
                maxInflight = Math.max(maxInflight, inflight);
                await sleep(DELAY_MS, signal);
                inflight -= 1;
                return { bytes: MOCK_PNG, mimeType: 'image/png' };
            },
            async edit() {
                throw new Error('edit should not run in this test');
            },
        };

        const store = createMemoryRunStore();
        store.create({
            runId: 'run-1',
            graph,
            presetId: 'preset-demo',
            status: 'queued',
            jobs: seedRunJobs(graph),
        });

        await executeRun(
            {
                store,
                generator,
                results: createFileResultStore(tempDir),
                images: {
                    async read() {
                        throw new Error('read should not run in this test');
                    },
                },
                timeoutMs: 5_000,
            },
            'run-1',
        );

        const run = store.get('run-1');
        expect(maxInflight).toBe(2);
        expect(run?.status).toBe('completed');
        expect(run?.jobs.every((job) => job.status === 'success')).toBe(true);
    });

    it('edits an image from Image Input', async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'aiwf-'));
        const graph = createEditScenarioGraph();
        const input = graph.nodes.find((node) => node.id === 'image-in');
        if (!input) {
            throw new Error('missing image input');
        }
        input.data.imageUrl = '/uploads/source.png';

        const generator: ImageGenerator = {
            async generate() {
                throw new Error('generate should not run in this test');
            },
            async edit(_request, source) {
                expect(source.bytes.equals(MOCK_PNG)).toBe(true);
                return { bytes: MOCK_PNG, mimeType: 'image/png' };
            },
        };

        const store = createMemoryRunStore();
        store.create({
            runId: 'run-edit',
            graph,
            presetId: 'preset-demo',
            status: 'queued',
            jobs: seedRunJobs(graph),
        });

        await executeRun(
            {
                store,
                generator,
                results: createFileResultStore(tempDir),
                images: {
                    async read(url) {
                        expect(url).toBe('/uploads/source.png');
                        return { bytes: MOCK_PNG, mimeType: 'image/png' };
                    },
                },
                timeoutMs: 5_000,
            },
            'run-edit',
        );

        const run = store.get('run-edit');
        expect(run?.status).toBe('completed');
        expect(run?.jobs[0]?.status).toBe('success');
    });

    it('fails generate jobs when the prompt is empty', async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'aiwf-'));
        const graph = createMandatoryBranchingGraph();
        const store = createMemoryRunStore();
        store.create({
            runId: 'run-empty',
            graph,
            presetId: 'preset-demo',
            status: 'queued',
            jobs: seedRunJobs(graph),
        });

        await executeRun(
            {
                store,
                generator: {
                    async generate() {
                        throw new Error('generate should not run');
                    },
                    async edit() {
                        throw new Error('edit should not run');
                    },
                },
                results: createFileResultStore(tempDir),
                images: {
                    async read() {
                        throw new Error('read should not run');
                    },
                },
                timeoutMs: 5_000,
            },
            'run-empty',
        );

        const run = store.get('run-empty');
        expect(run?.status).toBe('failed');
        expect(run?.jobs.every((job) => job.error === 'Заполните текст в Prompt')).toBe(true);
    });
});

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new Error('aborted'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                reject(new Error('aborted'));
            },
            { once: true },
        );
    });
}
