import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { useGraphStore, type WorkflowNode } from '@/entities/graph';
import { uploadImage } from '@/shared/api/http';

export function ImageInputNode({ id, data }: NodeProps<WorkflowNode>) {
    const setNodeData = useGraphStore((state) => state.setNodeData);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onFile(file: File): Promise<void> {
        setBusy(true);
        setError(null);
        try {
            const dataUrl = await readAsDataUrl(file);
            const { url } = await uploadImage(dataUrl);
            setNodeData(id, { imageUrl: url });
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Не удалось загрузить файл');
        } finally {
            setBusy(false);
        }
    }

    return (
        <article className='w-56 rounded-xl border border-slate-600 bg-slate-900 p-3 shadow'>
            <h3 className='mb-2 text-sm font-semibold'>Image Input</h3>
            <input
                type='file'
                accept='image/*'
                disabled={busy}
                className='block w-full text-xs'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        void onFile(file);
                    }
                }}
            />
            {busy ? <p className='mt-2 text-xs text-slate-400'>Загрузка…</p> : null}
            {error ? <p className='mt-2 text-xs text-red-400'>{error}</p> : null}
            {data.imageUrl ? (
                <img src={data.imageUrl} alt='Загруженное изображение' className='mt-2 max-h-24 rounded' />
            ) : null}
            <Handle type='source' position={Position.Right} id='image' />
        </article>
    );
}

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }
            reject(new Error('FileReader returned no data URL'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
