import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { GeneratedImage } from './imageGenerator';
import { parseDataUrl } from './uploadStore';

export type ImageReader = {
    read: (url: string) => Promise<GeneratedImage>;
};

type ImageDirs = {
    uploadsDir: string;
    resultsDir: string;
    referencesDir: string;
};

const MIME_BY_EXT: Record<string, GeneratedImage['mimeType']> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export function createDiskImageReader(dirs: ImageDirs): ImageReader {
    return {
        async read(url) {
            if (url.startsWith('data:')) {
                return parseDataUrl(url);
            }
            const filePath = resolveLocalPath(url, dirs);
            const bytes = await readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            return { bytes, mimeType: MIME_BY_EXT[ext] ?? 'image/png' };
        },
    };
}

function resolveLocalPath(url: string, dirs: ImageDirs): string {
    const pathname = url.split('?')[0] ?? url;
    const mapping: Array<[string, string]> = [
        ['/uploads/', dirs.uploadsDir],
        ['/results/', dirs.resultsDir],
        ['/references/', dirs.referencesDir],
    ];
    for (const [prefix, dir] of mapping) {
        if (pathname.startsWith(prefix)) {
            const name = pathname.slice(prefix.length);
            if (!isSafeFileName(name)) {
                throw new Error(`Invalid image path: ${url}`);
            }
            return path.join(dir, name);
        }
    }
    throw new Error(`Image is not readable from this host: ${url}`);
}

function isSafeFileName(name: string): boolean {
    return name.length > 0 && !name.includes('/') && !name.includes('\\') && !name.includes('..');
}
