import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { useGraphStore, type WorkflowNode } from '@/entities/graph';

import { downloadResultImage } from './downloadResultImage';

export function ResultNode({ id, data }: NodeProps<WorkflowNode>) {
    const edges = useGraphStore((state) => state.edges);
    const nodes = useGraphStore((state) => state.nodes);
    const incoming = edges.find((edge) => edge.target === id);
    const source = nodes.find((node) => node.id === incoming?.source);
    const src = data.resultUrl ?? data.imageUrl ?? source?.data.resultUrl ?? source?.data.imageUrl;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSave(): Promise<void> {
        if (!src) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await downloadResultImage(src, id);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Не удалось сохранить изображение');
        } finally {
            setBusy(false);
        }
    }

    return (
        <article className='w-56 rounded-xl border border-emerald-500/50 bg-slate-900 p-3 shadow'>
            <Handle type='target' position={Position.Left} id='image' />
            <h3 className='mb-2 text-sm font-semibold'>Result</h3>
            {src ? (
                <>
                    <img src={src} alt='Результат генерации' className='max-h-32 w-full rounded object-cover' />
                    <button
                        type='button'
                        disabled={busy}
                        className='nodrag mt-2 w-full rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50'
                        onClick={() => void onSave()}
                    >
                        {busy ? 'Saving...' : 'Download'}
                    </button>
                </>
            ) : (
                <p className='text-xs text-slate-400'>Ждём изображение</p>
            )}
            {error ? <p className='mt-1 text-xs text-red-400'>{error}</p> : null}
            <Handle type='source' position={Position.Right} id='image' />
        </article>
    );
}
