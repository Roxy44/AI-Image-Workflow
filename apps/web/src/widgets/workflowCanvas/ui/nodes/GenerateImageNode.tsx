import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { WorkflowNode } from '@/entities/graph';

import { JobBadge } from './JobBadge';

export function GenerateImageNode({ data }: NodeProps<WorkflowNode>) {
    return (
        <article className='w-56 rounded-xl border border-indigo-500/60 bg-slate-900 p-3 shadow'>
            <Handle type='target' position={Position.Left} id='text' />
            <h3 className='mb-2 text-sm font-semibold'>Generate Image</h3>
            <JobBadge status={data.jobStatus} error={data.error} />
            <Handle type='source' position={Position.Right} id='image' />
        </article>
    );
}
