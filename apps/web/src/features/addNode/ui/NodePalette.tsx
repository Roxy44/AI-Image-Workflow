import type { NodeKind } from '@aiwf/shared';

import { useGraphStore } from '@/entities/graph';

const KINDS: Array<{ kind: NodeKind; label: string }> = [
    { kind: 'prompt', label: 'Prompt' },
    { kind: 'imageInput', label: 'Image Input' },
    { kind: 'generateImage', label: 'Generate' },
    { kind: 'editImage', label: 'Edit' },
    { kind: 'result', label: 'Result' },
];

export function NodePalette() {
    const addNode = useGraphStore((state) => state.addNode);

    return (
        <div className='flex flex-wrap gap-2'>
            {KINDS.map((item) => (
                <button
                    key={item.kind}
                    type='button'
                    onClick={() => addNode(item.kind)}
                    className='rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800'
                >
                    + {item.label}
                </button>
            ))}
        </div>
    );
}
