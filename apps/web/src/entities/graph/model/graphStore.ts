import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';

import {
    canConnectKinds,
    canConnectPorts,
    createMandatoryBranchingGraph,
    type JobSnapshot,
    type NodeKind,
    type PortType,
} from '@aiwf/shared';

import { toFlowEdges, toFlowNodes, toWorkflowGraph } from './serialize';
import type { WorkflowEdge, WorkflowNode, WorkflowNodeData } from './types';

type GraphState = {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    presetId: string;
    onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
    onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
    onConnect: (connection: Connection) => void;
    setPresetId: (presetId: string) => void;
    setNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
    addNode: (kind: NodeKind) => void;
    applyJobResults: (jobs: JobSnapshot[]) => void;
    graphPayload: () => ReturnType<typeof toWorkflowGraph>;
};

const NODE_SPAWN_X = 120;
const NODE_SPAWN_Y = 80;
const NODE_SPAWN_GAP = 24;
const ID_SLICE = 8;

const initial = createMandatoryBranchingGraph();

export const useGraphStore = create<GraphState>((set, get) => ({
    nodes: toFlowNodes(initial),
    edges: toFlowEdges(initial),
    presetId: 'preset-demo',
    onNodesChange(changes) {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
    },
    onEdgesChange(changes) {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },
    onConnect(connection) {
        if (!isValidGraphConnection(get().nodes, connection)) {
            return;
        }
        set({
            edges: addEdge({ ...connection, id: `${connection.source}->${connection.target}` }, get().edges),
        });
    },
    setPresetId(presetId) {
        set({ presetId });
    },
    setNodeData(nodeId, data) {
        set({
            nodes: get().nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)),
        });
    },
    addNode(kind) {
        const id = `${kind}-${crypto.randomUUID().slice(0, ID_SLICE)}`;
        const offset = get().nodes.length;
        const node: WorkflowNode = {
            id,
            type: kind,
            position: { x: NODE_SPAWN_X + offset * NODE_SPAWN_GAP, y: NODE_SPAWN_Y + offset * NODE_SPAWN_GAP },
            data: kind === 'prompt' ? { text: '' } : {},
        };
        set({ nodes: [...get().nodes, node] });
    },
    applyJobResults(jobs) {
        const byId = new Map(jobs.map((job) => [job.nodeId, job]));
        set({
            nodes: get().nodes.map((node) => {
                const job = byId.get(node.id);
                if (!job) {
                    return node;
                }
                return {
                    ...node,
                    data: {
                        ...node.data,
                        jobStatus: job.status,
                        error: job.error,
                        resultUrl: job.resultUrl,
                        imageUrl: job.resultUrl ?? node.data.imageUrl,
                    },
                };
            }),
        });
    },
    graphPayload() {
        return toWorkflowGraph(get().nodes, get().edges);
    },
}));

export function isValidGraphConnection(
    nodes: WorkflowNode[],
    connection: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null },
): boolean {
    const sourcePort = connection.sourceHandle as PortType | null;
    const targetPort = connection.targetHandle as PortType | null;
    if (!connection.source || !connection.target || !sourcePort || !targetPort) {
        return false;
    }
    if (!canConnectPorts(sourcePort, targetPort)) {
        return false;
    }
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    if (!source?.type || !target?.type) {
        return false;
    }
    return canConnectKinds(source.type, target.type);
}
