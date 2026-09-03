import { apiJson } from '@/shared/api/http';
import type { RunSnapshot, WorkflowGraph } from '@aiwf/shared';

export function createRun(graph: WorkflowGraph, presetId: string): Promise<{ runId: string }> {
    return apiJson('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ graph, presetId }),
    });
}

export function getRun(runId: string): Promise<RunSnapshot> {
    return apiJson(`/api/runs/${runId}`);
}

export function retryRunNode(runId: string, nodeId: string): Promise<RunSnapshot> {
    return apiJson(`/api/runs/${runId}/nodes/${nodeId}/retry`, {
        method: 'POST',
        body: JSON.stringify({}),
    });
}
