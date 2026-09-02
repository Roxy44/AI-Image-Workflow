import {
    findPreset,
    isEdgeCompatible,
    type GraphEdge,
    type GraphNode,
    type NodeKind,
    type PortType,
    type WorkflowGraph,
} from '@aiwf/shared';

const NODE_KINDS: readonly NodeKind[] = ['prompt', 'imageInput', 'generateImage', 'editImage', 'result'];
const PORTS: readonly PortType[] = ['text', 'image'];

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

function parseGraph(value: unknown): WorkflowGraph {
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
