import { NodePalette } from '@/features/addNode';
import { RunToolbar } from '@/features/runWorkflow';
import { PresetSelect } from '@/features/selectPreset';
import { WorkflowCanvas } from '@/widgets/workflowCanvas';

export function EditorPage() {
    return (
        <div className='flex h-full flex-col'>
            <header className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-4 py-3'>
                <div>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>AI Image Workflow</p>
                    <h1 className='text-lg font-semibold'>Редактор графа</h1>
                </div>
                <div className='flex flex-wrap items-center gap-4'>
                    <NodePalette />
                    <PresetSelect />
                    <RunToolbar />
                </div>
            </header>
            <main className='min-h-0 flex-1'>
                <WorkflowCanvas />
            </main>
        </div>
    );
}
