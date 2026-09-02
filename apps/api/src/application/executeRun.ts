import {
    buildGenerationRequest,
    deriveRunStatus,
    explainUnsatisfied,
    findNode,
    findPreset,
    getReadyWorkerIds,
    incomingEdges,
    structurallyRunnableWorkers,
    type JobSnapshot,
    type WorkflowGraph,
} from '@aiwf/shared';

import type { ImageReader } from '../infra/diskImageReader';
import type { ImageGenerator } from '../infra/imageGenerator';
import type { ResultStore } from '../infra/resultStore';
import type { RunRecord, RunStore } from '../infra/runStore';

export type ExecuteDeps = {
    store: RunStore;
    generator: ImageGenerator;
    results: ResultStore;
    images: ImageReader;
    timeoutMs: number;
};

export async function executeRun(deps: ExecuteDeps, runId: string): Promise<void> {
    const run = deps.store.get(runId);
    if (!run) {
        throw new Error(`Run not found: ${runId}`);
    }

    deps.store.update(runId, { status: 'running' });

    let current = deps.store.get(runId);
    if (!current) {
        return;
    }

    while (true) {
        const readyIds = getReadyWorkerIds(current.graph, current.jobs);
        if (readyIds.length === 0) {
            const waiting = current.jobs.filter((job) => job.status === 'queued' || job.status === 'idle');
            const noneStarted = current.jobs.every((job) => job.status !== 'running' && job.status !== 'success');
            if (waiting.length > 0 && noneStarted) {
                setJobs(
                    deps.store,
                    current,
                    waiting.map((job) => job.nodeId),
                    (job) => {
                        const node = findNode(current.graph, job.nodeId);
                        const error = node
                            ? (explainUnsatisfied(current.graph, node) ?? 'Зависимости не выполнены')
                            : 'Нода отсутствует в графе';
                        return { ...job, status: 'error', error };
                    },
                );
            }
            break;
        }

        setJobs(deps.store, current, readyIds, (job) => ({
            ...job,
            status: 'running',
            error: null,
        }));

        await Promise.all(readyIds.map((nodeId) => executeWorker(deps, runId, nodeId)));
        current = deps.store.get(runId);
        if (!current) {
            return;
        }
    }

    const latest = deps.store.get(runId);
    if (!latest) {
        return;
    }
    deps.store.update(runId, { status: deriveRunStatus(latest.jobs) });
}

export async function retryNode(deps: ExecuteDeps, runId: string, nodeId: string): Promise<RunRecord> {
    const run = deps.store.get(runId);
    if (!run) {
        throw new Error(`Run not found: ${runId}`);
    }

    const job = run.jobs.find((item) => item.nodeId === nodeId);
    if (!job) {
        throw new Error(`Job not found: ${nodeId}`);
    }
    if (job.status !== 'error') {
        throw new Error(`Only failed jobs can be retried, ${nodeId} is ${job.status}`);
    }

    const nextJobs = run.jobs.map((item) =>
        item.nodeId === nodeId ? { ...item, status: 'queued' as const, error: null, resultUrl: null } : item,
    );
    deps.store.update(runId, { jobs: nextJobs, status: 'queued' });
    await executeRun(deps, runId);

    const updated = deps.store.get(runId);
    if (!updated) {
        throw new Error(`Run disappeared: ${runId}`);
    }
    return updated;
}

export function seedRunJobs(graph: WorkflowGraph): JobSnapshot[] {
    return structurallyRunnableWorkers(graph).map((node) => ({
        nodeId: node.id,
        status: 'queued',
        error: null,
        resultUrl: null,
    }));
}

async function executeWorker(deps: ExecuteDeps, runId: string, nodeId: string): Promise<void> {
    const run = deps.store.get(runId);
    if (!run) {
        return;
    }

    const node = findNode(run.graph, nodeId);
    if (!node) {
        patchJob(deps.store, run, nodeId, { status: 'error', error: 'Node missing from graph' });
        return;
    }

    const preset = findPreset(run.presetId);
    if (!preset) {
        patchJob(deps.store, run, nodeId, { status: 'error', error: `Unknown preset: ${run.presetId}` });
        return;
    }

    try {
        const userPrompt = collectUserPrompt(run.graph, nodeId);
        const request = buildGenerationRequest(userPrompt, preset);
        const signal = AbortSignal.timeout(deps.timeoutMs);
        const image =
            node.kind === 'editImage'
                ? await deps.generator.edit(request, await loadSourceImage(deps, run, nodeId), signal)
                : await deps.generator.generate(request, signal);
        const resultUrl = await deps.results.savePng(runId, nodeId, image.bytes);
        patchJob(deps.store, run, nodeId, { status: 'success', error: null, resultUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown generation error';
        patchJob(deps.store, run, nodeId, { status: 'error', error: message, resultUrl: null });
    }
}

function collectUserPrompt(graph: WorkflowGraph, workerId: string): string {
    const texts = incomingEdges(graph, workerId).map((edge) => {
        const source = findNode(graph, edge.source);
        return source?.data.text ?? '';
    });
    return texts.join('\n');
}

async function loadSourceImage(deps: ExecuteDeps, run: RunRecord, workerId: string) {
    const latest = deps.store.get(run.runId) ?? run;
    const url = collectIncomingImageUrl(latest.graph, latest.jobs, workerId);
    if (!url) {
        throw new Error('Edit Image needs an image on the incoming edge');
    }
    return deps.images.read(url);
}

function collectIncomingImageUrl(graph: WorkflowGraph, jobs: JobSnapshot[], workerId: string): string | null {
    const edge = incomingEdges(graph, workerId).find((item) => item.targetPort === 'image');
    if (!edge) {
        return null;
    }
    const source = findNode(graph, edge.source);
    if (!source) {
        return null;
    }
    if (source.kind === 'imageInput') {
        return source.data.imageUrl ?? null;
    }
    const job = jobs.find((item) => item.nodeId === source.id);
    return job?.resultUrl ?? source.data.imageUrl ?? null;
}

function setJobs(store: RunStore, run: RunRecord, nodeIds: string[], update: (job: JobSnapshot) => JobSnapshot): RunRecord {
    const idSet = new Set(nodeIds);
    const jobs = run.jobs.map((job) => (idSet.has(job.nodeId) ? update(job) : job));
    const next = store.update(run.runId, { jobs });
    return next ?? { ...run, jobs };
}

function patchJob(store: RunStore, run: RunRecord, nodeId: string, patch: Partial<JobSnapshot>): void {
    const latest = store.get(run.runId) ?? run;
    const jobs = latest.jobs.map((job) => (job.nodeId === nodeId ? { ...job, ...patch } : job));
    store.update(run.runId, { jobs });
}
