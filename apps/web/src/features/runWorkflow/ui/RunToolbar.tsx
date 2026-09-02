import { useGraphStore } from '@/entities/graph';

import { useWorkflowRun } from '../model/useWorkflowRun';

export function RunToolbar() {
    const { start, isStarting, startError, run, retry } = useWorkflowRun();
    const nodes = useGraphStore((state) => state.nodes);
    const failed = nodes.filter((node) => node.data.jobStatus === 'error');

    return (
        <div className='flex flex-wrap items-center gap-3'>
            <button
                type='button'
                onClick={() => start()}
                disabled={isStarting}
                className='rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
            >
                {isStarting ? 'Запуск…' : 'Запустить'}
            </button>
            {run ? <span className='text-sm text-slate-300'>Run: {run.status}</span> : null}
            {failed.map((node) => (
                <button
                    key={node.id}
                    type='button'
                    onClick={() => retry(node.id)}
                    className='rounded-lg border border-red-400 px-3 py-1 text-xs text-red-200'
                >
                    Повторить {node.id}
                </button>
            ))}
            {startError ? <span className='text-sm text-red-400'>{startError.message}</span> : null}
        </div>
    );
}
