import type { NodeKind } from '@aiwf/shared';
import type { Edge, Node } from '@xyflow/react';

export type WorkflowNodeData = {
    text?: string;
    imageUrl?: string;
    jobStatus?: string;
    error?: string | null;
    resultUrl?: string | null;
};

export type WorkflowNode = Node<WorkflowNodeData, NodeKind>;
export type WorkflowEdge = Edge;
