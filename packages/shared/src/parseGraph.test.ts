import { describe, expect, it } from 'vitest';

import { createMandatoryBranchingGraph } from './graph';
import { createWorkflowDocument, parseWorkflowDocument, WORKFLOW_FILE_KIND, WORKFLOW_FILE_VERSION } from './parseGraph';

describe('workflow document', () => {
    it('round-trips a branching graph with the selected preset', () => {
        const graph = createMandatoryBranchingGraph();
        const prompt = graph.nodes.find((node) => node.id === 'prompt');
        if (!prompt) {
            throw new Error('missing prompt');
        }
        prompt.data.text = 'a red cube';

        const parsed = parseWorkflowDocument(createWorkflowDocument('preset-photo', graph));

        expect(parsed.kind).toBe(WORKFLOW_FILE_KIND);
        expect(parsed.version).toBe(WORKFLOW_FILE_VERSION);
        expect(parsed.presetId).toBe('preset-photo');
        expect(parsed.graph.nodes[0]?.data.text).toBe('a red cube');
        expect(parsed.graph.edges).toHaveLength(graph.edges.length);
    });

    it('rejects a random json object', () => {
        expect(() => parseWorkflowDocument({ nodes: [] })).toThrow(/Not an AI Image Workflow file/);
    });

    it('rejects an unknown preset', () => {
        const doc = createWorkflowDocument('preset-demo', createMandatoryBranchingGraph());
        expect(() => parseWorkflowDocument({ ...doc, presetId: 'nope' })).toThrow(/Unknown preset/);
    });

    it('rejects an incompatible edge', () => {
        const graph = createMandatoryBranchingGraph();
        graph.edges.push({
            id: 'prompt->result-a:text',
            source: 'prompt',
            target: 'result-a',
            sourcePort: 'text',
            targetPort: 'image',
        });

        expect(() => createWorkflowDocument('preset-demo', graph)).toThrow(/Incompatible edge/);
    });
});
