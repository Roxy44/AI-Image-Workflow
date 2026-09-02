import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ResultStore = {
    savePng: (runId: string, nodeId: string, bytes: Buffer) => Promise<string>;
};

export function createFileResultStore(resultsDir: string): ResultStore {
    return {
        async savePng(runId, nodeId, bytes) {
            await mkdir(resultsDir, { recursive: true });
            const filename = `${runId}-${sanitize(nodeId)}.png`;
            await writeFile(path.join(resultsDir, filename), bytes);
            return `/results/${filename}`;
        },
    };
}

function sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}
