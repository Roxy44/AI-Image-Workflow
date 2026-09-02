type JobBadgeProps = {
    status?: string;
    error?: string | null;
};

const LABELS: Record<string, string> = {
    idle: 'idle',
    queued: 'queued',
    running: 'running',
    success: 'success',
    error: 'error',
};

export function JobBadge({ status, error }: JobBadgeProps) {
    const label = status ? (LABELS[status] ?? status) : 'idle';

    return (
        <div>
            <p className='text-xs uppercase tracking-wide text-slate-400'>{label}</p>
            {error ? <p className='mt-1 text-xs text-red-400'>{error}</p> : null}
        </div>
    );
}
