import type { NodeKind, PortType } from './types';

export type NodePorts = {
    inputs: PortType[];
    optionalInputs: PortType[];
    outputs: PortType[];
};

export const NODE_PORTS: Record<NodeKind, NodePorts> = {
    prompt: { inputs: [], optionalInputs: [], outputs: ['text'] },
    imageInput: { inputs: [], optionalInputs: [], outputs: ['image'] },
    generateImage: { inputs: ['text'], optionalInputs: [], outputs: ['image'] },
    editImage: { inputs: ['image'], optionalInputs: ['text'], outputs: ['image'] },
    result: { inputs: ['image'], optionalInputs: [], outputs: ['image'] },
};

export function inputPorts(kind: NodeKind): PortType[] {
    const spec = NODE_PORTS[kind];
    return [...spec.inputs, ...spec.optionalInputs];
}

export const WORKER_KINDS: readonly NodeKind[] = ['generateImage', 'editImage'];

export function isWorkerKind(kind: NodeKind): boolean {
    return WORKER_KINDS.includes(kind);
}

export function canConnectPorts(sourcePort: PortType, targetPort: PortType): boolean {
    return sourcePort === targetPort;
}

export function canConnectKinds(sourceKind: NodeKind, targetKind: NodeKind): boolean {
    const outputs = NODE_PORTS[sourceKind].outputs;
    const inputs = inputPorts(targetKind);
    return outputs.some((output) => inputs.includes(output));
}
