import { describe, expect, it } from 'vitest';

import { createEditScenarioGraph, createMandatoryBranchingGraph } from './graph';
import { getReadyWorkerIds, explainUnsatisfied } from './scheduler';
import type { JobSnapshot } from './types';

describe('graph scheduler', () => {
    it('does not start generate nodes without prompt text', () => {
        const graph = createMandatoryBranchingGraph();

        const ready = getReadyWorkerIds(graph, []);

        expect(ready).toEqual([]);
    });

    it('marks both generate branches ready at the same time', () => {
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt node');
        }
        prompt.data.text = 'a red cube';

        const ready = getReadyWorkerIds(graph, queuedJobs(['generate-a', 'generate-b']));

        expect(ready.sort()).toEqual(['generate-a', 'generate-b']);
    });

    it('does not restart a successful generate while the sibling is still queued', () => {
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt node');
        }
        prompt.data.text = 'a red cube';

        const jobs: JobSnapshot[] = [
            { nodeId: 'generate-a', status: 'success', error: null, resultUrl: '/results/a.png' },
            { nodeId: 'generate-b', status: 'queued', error: null, resultUrl: null },
        ];

        expect(getReadyWorkerIds(graph, jobs)).toEqual(['generate-b']);
    });

    it('starts edit when Image Input has an image url', () => {
        const graph = createEditScenarioGraph();
        const input = graph.nodes.find((node) => node.id === 'image-in');
        if (!input) {
            throw new Error('missing image input');
        }
        input.data.imageUrl = '/uploads/source.png';

        expect(getReadyWorkerIds(graph, queuedJobs(['edit-1']))).toEqual(['edit-1']);
    });

    it('starts edit when a connected prompt is empty', () => {
        const graph = createEditScenarioGraph();
        const input = graph.nodes.find((node) => node.id === 'image-in');
        if (!input) {
            throw new Error('missing image input');
        }
        input.data.imageUrl = '/uploads/source.png';
        graph.nodes.push({
            id: 'prompt-edit',
            kind: 'prompt',
            position: { x: 0, y: 0 },
            data: { text: '' },
        });
        graph.edges.push({
            id: 'prompt-edit->edit-1:text',
            source: 'prompt-edit',
            target: 'edit-1',
            sourcePort: 'text',
            targetPort: 'text',
        });

        expect(getReadyWorkerIds(graph, queuedJobs(['edit-1']))).toEqual(['edit-1']);
    });

    it('does not start edit without an uploaded image', () => {
        const graph = createEditScenarioGraph();

        expect(getReadyWorkerIds(graph, queuedJobs(['edit-1']))).toEqual([]);
    });

    it('starts edit from a result after the producer generate succeeds', () => {
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt node');
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

        expect(getReadyWorkerIds(graph, queuedJobs(['generate-a', 'generate-b', 'edit-from-a'])).sort()).toEqual([
            'generate-a',
            'generate-b',
        ]);

        const jobs: JobSnapshot[] = [
            { nodeId: 'generate-a', status: 'success', error: null, resultUrl: '/results/a.png' },
            { nodeId: 'generate-b', status: 'queued', error: null, resultUrl: null },
            { nodeId: 'edit-from-a', status: 'queued', error: null, resultUrl: null },
        ];

        expect(getReadyWorkerIds(graph, jobs).sort()).toEqual(['edit-from-a', 'generate-b']);
    });

    it('explains an empty prompt instead of a generic dependency error', () => {
        const graph = createMandatoryBranchingGraph();
        const generate = graph.nodes.find((node) => node.id === 'generate-a');
        if (!generate) {
            throw new Error('missing generate');
        }

        expect(explainUnsatisfied(graph, generate)).toBe('Заполните текст в Prompt');
    });
});

function queuedJobs(nodeIds: string[]): JobSnapshot[] {
    return nodeIds.map((nodeId) => ({
        nodeId,
        status: 'queued',
        error: null,
        resultUrl: null,
    }));
}
