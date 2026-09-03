import { findNode, followImageProducer, incomingEdges } from './graph';
import { isWorkerKind, NODE_PORTS } from './ports';
import type { GraphNode, JobSnapshot, JobStatus, RunStatus, WorkflowGraph } from './types';

const TERMINAL_OK: JobStatus = 'success';

export function structurallyRunnableWorkers(graph: WorkflowGraph): GraphNode[] {
    return graph.nodes.filter((node) => isWorkerKind(node.kind) && hasRequiredInputsWired(graph, node));
}

export function getReadyWorkerIds(graph: WorkflowGraph, jobs: JobSnapshot[]): string[] {
    const byId = new Map(jobs.map((job) => [job.nodeId, job]));

    return structurallyRunnableWorkers(graph)
        .filter((node) => {
            const job = byId.get(node.id);
            const status = job?.status ?? 'idle';
            if (status === 'running' || status === 'success' || status === 'error') {
                return false;
            }
            return dependenciesSatisfied(graph, node, byId);
        })
        .map((node) => node.id);
}

export function deriveRunStatus(jobs: JobSnapshot[]): RunStatus {
    if (jobs.length === 0) {
        return 'queued';
    }
    if (jobs.some((job) => job.status === 'error')) {
        return 'failed';
    }
    if (jobs.some((job) => job.status === 'running')) {
        return 'running';
    }
    if (jobs.every((job) => job.status === 'success')) {
        return 'completed';
    }
    return 'queued';
}

export function dependenciesSatisfied(graph: WorkflowGraph, node: GraphNode, jobs: Map<string, JobSnapshot>): boolean {
    return explainUnsatisfied(graph, node, jobs) === null;
}

export function explainUnsatisfied(
    graph: WorkflowGraph,
    node: GraphNode,
    jobs: Map<string, JobSnapshot> = new Map(),
): string | null {
    const required = NODE_PORTS[node.kind].inputs;
    const incoming = incomingEdges(graph, node.id);

    for (const port of required) {
        if (!incoming.some((edge) => edge.targetPort === port)) {
            return port === 'text' ? 'Заполните и подключите Prompt' : 'Подключите входящее изображение';
        }
    }

    if (incoming.length === 0) {
        return 'Нет входящего соединения';
    }

    for (const edge of incoming) {
        const source = findNode(graph, edge.source);
        if (!source) {
            return 'Источник связи не найден';
        }
        if (source.kind === 'prompt' && !source.data.text?.trim() && NODE_PORTS[node.kind].inputs.includes(edge.targetPort)) {
            return 'Заполните текст в Prompt';
        }

        const producer = followImageProducer(graph, source.id);
        if (!producer) {
            return source.kind === 'result' ? 'Подключите изображение к Result' : 'Источник связи не найден';
        }
        if (producer.kind === 'imageInput' && !producer.data.imageUrl) {
            return 'Загрузите изображение в Image Input';
        }
        if (isWorkerKind(producer.kind) && jobs.get(producer.id)?.status !== TERMINAL_OK) {
            return 'Сначала должна успешно выполниться предыдущая нода';
        }
        if (!isWorkerKind(producer.kind) && producer.kind !== 'prompt' && producer.kind !== 'imageInput') {
            return 'Зависимости не выполнены';
        }
    }

    return null;
}

function hasRequiredInputsWired(graph: WorkflowGraph, node: GraphNode): boolean {
    const required = NODE_PORTS[node.kind].inputs;
    const incoming = incomingEdges(graph, node.id);
    return required.every((port) => incoming.some((edge) => edge.targetPort === port));
}
