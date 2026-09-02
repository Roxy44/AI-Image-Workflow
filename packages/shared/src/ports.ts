import type { NodeKind, PortType } from './types';

export type NodePorts = {
    inputs: PortType[];
    outputs: PortType[];
};

export const NODE_PORTS: Record<NodeKind, NodePorts> = {
    prompt: { inputs: [], outputs: ['text'] },
    imageInput: { inputs: [], outputs: ['image'] },
    generateImage: { inputs: ['text'], outputs: ['image'] },
    editImage: { inputs: ['image'], outputs: ['image'] },
    result: { inputs: ['image'], outputs: [] },
};

export const WORKER_KINDS: readonly NodeKind[] = ['generateImage', 'editImage'];

export function isWorkerKind(kind: NodeKind): boolean {
    return WORKER_KINDS.includes(kind);
}

export function canConnectPorts(sourcePort: PortType, targetPort: PortType): boolean {
    return sourcePort === targetPort;
}

export function canConnectKinds(sourceKind: NodeKind, targetKind: NodeKind): boolean {
    const outputs = NODE_PORTS[sourceKind].outputs;
    const inputs = NODE_PORTS[targetKind].inputs;
    return outputs.some((output) => inputs.includes(output));
}
