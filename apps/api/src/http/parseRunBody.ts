import { findPreset, parseGraph, type WorkflowGraph } from '@aiwf/shared';

export function parseCreateRunBody(body: unknown): { graph: WorkflowGraph; presetId: string } {
    if (!isRecord(body)) {
        throw new Error('Body must be an object');
    }
    if (typeof body.presetId !== 'string' || body.presetId.length === 0) {
        throw new Error('presetId is required');
    }
    if (!findPreset(body.presetId)) {
        throw new Error(`Unknown preset: ${body.presetId}`);
    }
    return { graph: parseGraph(body.graph), presetId: body.presetId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
