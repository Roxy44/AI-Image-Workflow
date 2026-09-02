import type { GraphEdge, GraphNode, NodeKind, PortType, WorkflowGraph } from '@aiwf/shared';

import type { WorkflowEdge, WorkflowNode } from './types';

export function toFlowNodes(graph: WorkflowGraph): WorkflowNode[] {
    return graph.nodes.map((node) => ({
        id: node.id,
        type: node.kind,
        position: node.position,
        data: { ...node.data },
    }));
}

export function toFlowEdges(graph: WorkflowGraph): WorkflowEdge[] {
    return graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourcePort,
        targetHandle: edge.targetPort,
    }));
}

export function toWorkflowGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph {
    const graphNodes: GraphNode[] = nodes.map((node) => ({
        id: node.id,
        kind: (node.type ?? 'prompt') as NodeKind,
        position: node.position,
        data: {
            text: node.data.text,
            imageUrl: node.data.imageUrl,
        },
    }));

    const graphEdges: GraphEdge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourcePort: (edge.sourceHandle ?? 'text') as PortType,
        targetPort: (edge.targetHandle ?? 'text') as PortType,
    }));

    return { nodes: graphNodes, edges: graphEdges };
}
