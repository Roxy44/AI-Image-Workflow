import { Background, Controls, MiniMap, ReactFlow, type NodeTypes } from '@xyflow/react';

import { isValidGraphConnection, useGraphStore } from '@/entities/graph';

import { EditImageNode } from './nodes/EditImageNode';
import { GenerateImageNode } from './nodes/GenerateImageNode';
import { ImageInputNode } from './nodes/ImageInputNode';
import { PromptNode } from './nodes/PromptNode';
import { ResultNode } from './nodes/ResultNode';

const nodeTypes: NodeTypes = {
    prompt: PromptNode,
    imageInput: ImageInputNode,
    generateImage: GenerateImageNode,
    editImage: EditImageNode,
    result: ResultNode,
};

export function WorkflowCanvas() {
    const nodes = useGraphStore((state) => state.nodes);
    const edges = useGraphStore((state) => state.edges);
    const onNodesChange = useGraphStore((state) => state.onNodesChange);
    const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
    const onConnect = useGraphStore((state) => state.onConnect);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            isValidConnection={(connection) => isValidGraphConnection(nodes, connection)}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
        >
            <Background />
            <Controls />
            <MiniMap />
        </ReactFlow>
    );
}
