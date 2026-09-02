import { Handle, Position, type NodeProps } from '@xyflow/react';

import { useGraphStore, type WorkflowNode } from '@/entities/graph';

export function ResultNode({ id, data }: NodeProps<WorkflowNode>) {
    const edges = useGraphStore((state) => state.edges);
    const nodes = useGraphStore((state) => state.nodes);
    const incoming = edges.find((edge) => edge.target === id);
    const source = nodes.find((node) => node.id === incoming?.source);
    const src = data.resultUrl ?? data.imageUrl ?? source?.data.resultUrl ?? source?.data.imageUrl;

    return (
        <article className='w-56 rounded-xl border border-emerald-500/50 bg-slate-900 p-3 shadow'>
            <Handle type='target' position={Position.Left} id='image' />
            <h3 className='mb-2 text-sm font-semibold'>Result</h3>
            {src ? (
                <img src={src} alt='Результат генерации' className='max-h-32 w-full rounded object-cover' />
            ) : (
                <p className='text-xs text-slate-400'>Ждём изображение</p>
            )}
        </article>
    );
}
