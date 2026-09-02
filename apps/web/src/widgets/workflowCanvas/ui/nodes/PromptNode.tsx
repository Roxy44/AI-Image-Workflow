import { Handle, Position, type NodeProps } from '@xyflow/react';

import { useGraphStore, type WorkflowNode } from '@/entities/graph';

export function PromptNode({ id, data }: NodeProps<WorkflowNode>) {
    const setNodeData = useGraphStore((state) => state.setNodeData);

    return (
        <article className='w-64 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow'>
            <h3 className='mb-2 text-sm font-semibold'>Prompt</h3>
            <textarea
                className='h-24 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100'
                value={data.text ?? ''}
                placeholder='Опишите изображение'
                onChange={(event) => setNodeData(id, { text: event.target.value })}
            />
            <Handle type='source' position={Position.Right} id='text' />
        </article>
    );
}
