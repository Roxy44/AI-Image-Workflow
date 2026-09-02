import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { WorkflowNode } from '@/entities/graph';

import { JobBadge } from './JobBadge';

export function EditImageNode({ data }: NodeProps<WorkflowNode>) {
    return (
        <article className='w-56 rounded-xl border border-amber-500/50 bg-slate-900 p-3 shadow'>
            <Handle type='target' position={Position.Left} id='image' />
            <h3 className='mb-2 text-sm font-semibold'>Edit Image</h3>
            <JobBadge status={data.jobStatus} error={data.error} />
            <Handle type='source' position={Position.Right} id='image' />
        </article>
    );
}
