import { canConnectKinds, canConnectPorts, NODE_PORTS } from './ports';
import type { GraphEdge, GraphNode, NodeKind, PortType, WorkflowGraph } from './types';

const PROMPT_X = 80;
const BRANCH_X = 420;
const RESULT_X = 760;
const BRANCH_TOP_Y = 80;
const BRANCH_BOTTOM_Y = 340;
const PROMPT_Y = 210;

export function createMandatoryBranchingGraph(): WorkflowGraph {
    const nodes: GraphNode[] = [
        { id: 'prompt', kind: 'prompt', position: { x: PROMPT_X, y: PROMPT_Y }, data: { text: '' } },
        { id: 'generate-a', kind: 'generateImage', position: { x: BRANCH_X, y: BRANCH_TOP_Y }, data: {} },
        { id: 'generate-b', kind: 'generateImage', position: { x: BRANCH_X, y: BRANCH_BOTTOM_Y }, data: {} },
        { id: 'result-a', kind: 'result', position: { x: RESULT_X, y: BRANCH_TOP_Y }, data: {} },
        { id: 'result-b', kind: 'result', position: { x: RESULT_X, y: BRANCH_BOTTOM_Y }, data: {} },
    ];

    const edges: GraphEdge[] = [
        edge('prompt', 'generate-a', 'text'),
        edge('prompt', 'generate-b', 'text'),
        edge('generate-a', 'result-a', 'image'),
        edge('generate-b', 'result-b', 'image'),
    ];

    return { nodes, edges };
}

export function createEditScenarioGraph(): WorkflowGraph {
    const nodes: GraphNode[] = [
        { id: 'image-in', kind: 'imageInput', position: { x: PROMPT_X, y: PROMPT_Y }, data: {} },
        { id: 'edit-1', kind: 'editImage', position: { x: BRANCH_X, y: PROMPT_Y }, data: {} },
        { id: 'result-edit', kind: 'result', position: { x: RESULT_X, y: PROMPT_Y }, data: {} },
    ];
    const edges: GraphEdge[] = [edge('image-in', 'edit-1', 'image'), edge('edit-1', 'result-edit', 'image')];
    return { nodes, edges };
}

export function findNode(graph: WorkflowGraph, nodeId: string): GraphNode | undefined {
    return graph.nodes.find((node) => node.id === nodeId);
}

export function incomingEdges(graph: WorkflowGraph, nodeId: string): GraphEdge[] {
    return graph.edges.filter((item) => item.target === nodeId);
}

export function isEdgeCompatible(graph: WorkflowGraph, edge: GraphEdge): boolean {
    const source = findNode(graph, edge.source);
    const target = findNode(graph, edge.target);
    if (!source || !target) {
        return false;
    }
    if (!canConnectPorts(edge.sourcePort, edge.targetPort)) {
        return false;
    }
    const kindsOk = canConnectKinds(source.kind, target.kind);
    const portsOk = hasPort(source.kind, 'output', edge.sourcePort) && hasPort(target.kind, 'input', edge.targetPort);
    return kindsOk && portsOk;
}

function hasPort(kind: NodeKind, side: 'input' | 'output', port: PortType): boolean {
    const spec = NODE_PORTS[kind];
    const list = side === 'input' ? spec.inputs : spec.outputs;
    return list.includes(port);
}

function edge(source: string, target: string, port: PortType): GraphEdge {
    return {
        id: `${source}->${target}:${port}`,
        source,
        target,
        sourcePort: port,
        targetPort: port,
    };
}
