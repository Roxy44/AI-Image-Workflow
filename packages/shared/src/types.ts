export type PortType = 'text' | 'image';

export type NodeKind = 'prompt' | 'imageInput' | 'generateImage' | 'editImage' | 'result';

export type JobStatus = 'idle' | 'queued' | 'running' | 'success' | 'error';

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type NodePosition = {
    x: number;
    y: number;
};

export type GraphNode = {
    id: string;
    kind: NodeKind;
    position: NodePosition;
    data: NodeData;
};

export type NodeData = {
    text?: string;
    imageUrl?: string;
};

export type GraphEdge = {
    id: string;
    source: string;
    target: string;
    sourcePort: PortType;
    targetPort: PortType;
};

export type WorkflowGraph = {
    nodes: GraphNode[];
    edges: GraphEdge[];
};

export type Preset = {
    id: string;
    name: string;
    mainPrompt: string;
    negativePrompt: string;
    references: string[];
};

export type GenerationRequest = {
    prompt: string;
    negativePrompt: string;
    references: string[];
};

export type JobSnapshot = {
    nodeId: string;
    status: JobStatus;
    error: string | null;
    resultUrl: string | null;
};

export type RunSnapshot = {
    runId: string;
    status: RunStatus;
    jobs: JobSnapshot[];
};
