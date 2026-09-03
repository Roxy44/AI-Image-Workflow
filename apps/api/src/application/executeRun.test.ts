import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createEditScenarioGraph, createMandatoryBranchingGraph, DEMO_PRESET } from '@aiwf/shared';
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
            async edit(request, source) {
                expect(request.prompt).toBe(DEMO_PRESET.mainPrompt);
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

    it('edits the image that arrived through a result node', async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'aiwf-'));
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt');
        }
        prompt.data.text = 'a red cube';
        graph.nodes.push({
            id: 'edit-from-a',
            kind: 'editImage',
            position: { x: 1100, y: 80 },
            data: { text: 'make it night' },
        });
        graph.edges.push({
            id: 'result-a->edit-from-a:image',
            source: 'result-a',
            target: 'edit-from-a',
            sourcePort: 'image',
            targetPort: 'image',
        });

        const readUrls: string[] = [];
        const generator: ImageGenerator = {
            async generate() {
                return { bytes: MOCK_PNG, mimeType: 'image/png' };
            },
            async edit(request, source) {
                expect(request.prompt).toContain('make it night');
                expect(source.bytes.equals(MOCK_PNG)).toBe(true);
                return { bytes: MOCK_PNG, mimeType: 'image/png' };
            },
        };

        const store = createMemoryRunStore();
        store.create({
            runId: 'run-result-edit',
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
                        readUrls.push(url);
                        return { bytes: MOCK_PNG, mimeType: 'image/png' };
                    },
                },
                timeoutMs: 5_000,
            },
            'run-result-edit',
        );

        const run = store.get('run-result-edit');
        expect(run?.status).toBe('completed');
        expect(readUrls.some((url) => url.startsWith('/results/'))).toBe(true);
        expect(run?.jobs.find((job) => job.nodeId === 'edit-from-a')?.status).toBe('success');
    });

    it('sends the edit node instruction with the preset', async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'aiwf-'));
        const graph = createEditScenarioGraph();
        const input = graph.nodes.find((node) => node.id === 'image-in');
        const edit = graph.nodes.find((node) => node.id === 'edit-1');
        if (!input || !edit) {
            throw new Error('missing edit scenario nodes');
        }
        input.data.imageUrl = '/uploads/source.png';
        edit.data.text = 'make it night';

        const generator: ImageGenerator = {
            async generate() {
                throw new Error('generate should not run in this test');
            },
            async edit(request) {
                expect(request.prompt).toBe(`${DEMO_PRESET.mainPrompt}\nmake it night`);
                return { bytes: MOCK_PNG, mimeType: 'image/png' };
            },
        };

        const store = createMemoryRunStore();
        store.create({
            runId: 'run-edit-prompt',
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
                        return { bytes: MOCK_PNG, mimeType: 'image/png' };
                    },
                },
                timeoutMs: 5_000,
            },
            'run-edit-prompt',
        );

        const run = store.get('run-edit-prompt');
        expect(run?.status).toBe('completed');
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
