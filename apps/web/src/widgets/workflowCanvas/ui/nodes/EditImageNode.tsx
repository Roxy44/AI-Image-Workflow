import { Handle, Position, type NodeProps } from '@xyflow/react';

import { useGraphStore, type WorkflowNode } from '@/entities/graph';

import { JobBadge } from './JobBadge';

export function EditImageNode({ id, data }: NodeProps<WorkflowNode>) {
    const setNodeData = useGraphStore((state) => state.setNodeData);

    return (
        <article className='w-64 rounded-xl border border-amber-500/50 bg-slate-900 p-3 shadow'>
            <Handle type='target' position={Position.Left} id='text' style={{ top: '28%' }} />
            <Handle type='target' position={Position.Left} id='image' style={{ top: '72%' }} />
            <h3 className='mb-2 text-sm font-semibold'>Edit Image</h3>
            <p className='mb-2 text-[10px] leading-4 text-slate-500'>Сверху prompt (необязательно), снизу image</p>
            <textarea
                className='nodrag nowheel mb-2 h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100'
                value={data.text ?? ''}
                placeholder='Инструкция для правки (необязательно)'
                onChange={(event) => setNodeData(id, { text: event.target.value })}
            />
            <JobBadge status={data.jobStatus} error={data.error} />
            <Handle type='source' position={Position.Right} id='image' />
        </article>
    );
}
