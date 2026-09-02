import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useGraphStore } from '@/entities/graph';

import { createRun, getRun, retryRunNode } from '../api/runsApi';

const POLL_INTERVAL_MS = 1000;

export function useWorkflowRun() {
    const graphPayload = useGraphStore((state) => state.graphPayload);
    const presetId = useGraphStore((state) => state.presetId);
    const applyJobResults = useGraphStore((state) => state.applyJobResults);

    const start = useMutation({
        mutationFn: () => createRun(graphPayload(), presetId),
    });

    const runId = start.data?.runId ?? null;

    const runQuery = useQuery({
        queryKey: ['run', runId],
        queryFn: () => getRun(runId as string),
        enabled: Boolean(runId),
        refetchIntervalInBackground: true,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') {
                return false;
            }
            return POLL_INTERVAL_MS;
        },
    });

    useEffect(() => {
        if (runQuery.data) {
            applyJobResults(runQuery.data.jobs);
        }
    }, [applyJobResults, runQuery.data]);

    const retry = useMutation({
        mutationFn: (nodeId: string) => {
            if (!runId) {
                throw new Error('Сначала запустите workflow');
            }
            return retryRunNode(runId, nodeId);
        },
        onSuccess: (data) => {
            applyJobResults(data.jobs);
        },
    });

    return {
        start: () => start.mutate(),
        isStarting: start.isPending,
        startError: start.error,
        run: runQuery.data,
        retry: (nodeId: string) => retry.mutate(nodeId),
    };
}
