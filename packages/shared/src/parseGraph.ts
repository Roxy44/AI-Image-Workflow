import { isEdgeCompatible } from './graph';
import { findPreset } from './presets';
import type { GraphEdge, GraphNode, NodeKind, PortType, WorkflowGraph } from './types';

const NODE_KINDS: readonly NodeKind[] = ['prompt', 'imageInput', 'generateImage', 'editImage', 'result'];
const PORTS: readonly PortType[] = ['text', 'image'];

export const WORKFLOW_FILE_KIND = 'aiwf-workflow';
export const WORKFLOW_FILE_VERSION = 1;

export type WorkflowDocument = {
    kind: typeof WORKFLOW_FILE_KIND;
    version: number;
    presetId: string;
    graph: WorkflowGraph;
};

export function parseGraph(value: unknown): WorkflowGraph {
    if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
        throw new Error('graph.nodes and graph.edges are required');
    }

    const nodes = value.nodes.map(parseNode);
    const edges = value.edges.map(parseEdge);
    const graph: WorkflowGraph = { nodes, edges };

    for (const edge of edges) {
        if (!isEdgeCompatible(graph, edge)) {
            throw new Error(`Incompatible edge: ${edge.id}`);
        }
    }

    return graph;
}

export function createWorkflowDocument(presetId: string, graph: WorkflowGraph): WorkflowDocument {
    if (!findPreset(presetId)) {
        throw new Error(`Unknown preset: ${presetId}`);
    }
    return {
        kind: WORKFLOW_FILE_KIND,
        version: WORKFLOW_FILE_VERSION,
        presetId,
        graph: parseGraph(graph),
    };
}

export function parseWorkflowDocument(value: unknown): WorkflowDocument {
    if (!isRecord(value)) {
        throw new Error('Workflow file must be an object');
    }
    if (value.kind !== WORKFLOW_FILE_KIND) {
        throw new Error('Not an AI Image Workflow file');
    }
    if (value.version !== WORKFLOW_FILE_VERSION) {
        throw new Error(`Unsupported workflow file version: ${String(value.version)}`);
    }
    if (typeof value.presetId !== 'string' || value.presetId.length === 0) {
        throw new Error('presetId is required');
    }
    if (!findPreset(value.presetId)) {
        throw new Error(`Unknown preset: ${value.presetId}`);
    }
    return {
        kind: WORKFLOW_FILE_KIND,
        version: WORKFLOW_FILE_VERSION,
        presetId: value.presetId,
        graph: parseGraph(value.graph),
    };
}

function parseNode(value: unknown): GraphNode {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kind !== 'string') {
        throw new Error('Each node needs id and kind');
    }
    if (!isNodeKind(value.kind)) {
        throw new Error(`Unknown node kind: ${value.kind}`);
    }
    const position = parsePosition(value.position);
    const data = isRecord(value.data) ? parseData(value.data) : {};
    return { id: value.id, kind: value.kind, position, data };
}

function parseEdge(value: unknown): GraphEdge {
    if (
        !isRecord(value) ||
        typeof value.id !== 'string' ||
        typeof value.source !== 'string' ||
        typeof value.target !== 'string' ||
        typeof value.sourcePort !== 'string' ||
        typeof value.targetPort !== 'string'
    ) {
        throw new Error('Each edge needs id, source, target, sourcePort, targetPort');
    }
    if (!isPort(value.sourcePort) || !isPort(value.targetPort)) {
        throw new Error(`Invalid ports on edge ${value.id}`);
    }
    return {
        id: value.id,
        source: value.source,
        target: value.target,
        sourcePort: value.sourcePort,
        targetPort: value.targetPort,
    };
}

function parsePosition(value: unknown): { x: number; y: number } {
    if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
        return { x: 0, y: 0 };
    }
    return { x: value.x, y: value.y };
}

function parseData(value: Record<string, unknown>): GraphNode['data'] {
    const data: GraphNode['data'] = {};
    if (typeof value.text === 'string') {
        data.text = value.text;
    }
    if (typeof value.imageUrl === 'string') {
        data.imageUrl = value.imageUrl;
    }
    return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNodeKind(value: string): value is NodeKind {
    return (NODE_KINDS as readonly string[]).includes(value);
}

function isPort(value: string): value is PortType {
    return (PORTS as readonly string[]).includes(value);
}
