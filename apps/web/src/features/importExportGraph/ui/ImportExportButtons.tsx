import { useRef, useState } from 'react';

import { createWorkflowDocument, parseWorkflowDocument } from '@aiwf/shared';

import { useGraphStore } from '@/entities/graph';

const EXPORT_NAME = 'ai-image-workflow.json';
const BUTTON_CLASS = 'rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800';

export function ImportExportButtons() {
    const fileRef = useRef<HTMLInputElement>(null);
    const graphPayload = useGraphStore((state) => state.graphPayload);
    const presetId = useGraphStore((state) => state.presetId);
    const loadGraph = useGraphStore((state) => state.loadGraph);
    const [error, setError] = useState<string | null>(null);

    function onExport(): void {
        try {
            const json = JSON.stringify(createWorkflowDocument(presetId, graphPayload()), null, 2);
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = EXPORT_NAME;
            link.click();
            URL.revokeObjectURL(url);
            setError(null);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Не удалось экспортировать граф');
        }
    }

    async function onImport(file: File): Promise<void> {
        try {
            const doc = parseWorkflowDocument(JSON.parse(await file.text()) as unknown);
            loadGraph(doc.graph, doc.presetId);
            setError(null);
        } catch (caught) {
            if (caught instanceof SyntaxError) {
                setError('Файл не похож на сохранённый граф');
                return;
            }
            setError(caught instanceof Error ? caught.message : 'Не удалось импортировать файл');
        }
    }

    return (
        <div className='flex flex-wrap items-center gap-2'>
            <input
                ref={fileRef}
                type='file'
                accept='application/json,.json'
                className='sr-only'
                aria-label='Импорт графа'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) {
                        void onImport(file);
                    }
                }}
            />
            <button type='button' className={BUTTON_CLASS} onClick={() => fileRef.current?.click()}>
                Import
            </button>
            <button type='button' className={BUTTON_CLASS} onClick={onExport}>
                Export
            </button>
            {error ? (
                <p className='text-xs text-red-400' role='alert'>
                    {error}
                </p>
            ) : null}
        </div>
    );
}
