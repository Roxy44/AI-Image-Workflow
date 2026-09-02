import type { JobSnapshot, RunSnapshot, WorkflowGraph } from '@aiwf/shared';

export type RunRecord = {
    runId: string;
    graph: WorkflowGraph;
    presetId: string;
    status: RunSnapshot['status'];
    jobs: JobSnapshot[];
};

export type RunStore = {
    create: (record: RunRecord) => void;
    get: (runId: string) => RunRecord | undefined;
    update: (runId: string, patch: Partial<Pick<RunRecord, 'status' | 'jobs' | 'graph'>>) => RunRecord | undefined;
};

export function createMemoryRunStore(): RunStore {
    const runs = new Map<string, RunRecord>();

    return {
        create(record) {
            runs.set(record.runId, record);
        },
        get(runId) {
            return runs.get(runId);
        },
        update(runId, patch) {
            const current = runs.get(runId);
            if (!current) {
                return undefined;
            }
            const next = { ...current, ...patch };
            runs.set(runId, next);
            return next;
        },
    };
}
