import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { GeneratedImage } from './imageGenerator';

const BYTES_PER_KIB = 1024;
const MAX_UPLOAD_MIB = 8;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MIB * BYTES_PER_KIB * BYTES_PER_KIB;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const EXT_BY_MIME: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

export function parseDataUrl(dataUrl: string): GeneratedImage {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
        throw new Error('Expected a data:image/...;base64 URL');
    }
    const mimeType = match[1];
    if (!ALLOWED_MIME.has(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType}`);
    }
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length === 0) {
        throw new Error('Empty image');
    }
    if (bytes.length > MAX_UPLOAD_BYTES) {
        throw new Error('Image is too large');
    }
    return { bytes, mimeType: mimeType as GeneratedImage['mimeType'] };
}

export async function saveUpload(uploadsDir: string, image: GeneratedImage): Promise<string> {
    await mkdir(uploadsDir, { recursive: true });
    const ext = EXT_BY_MIME[image.mimeType] ?? 'png';
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(uploadsDir, filename), image.bytes);
    return `/uploads/${filename}`;
}

export { MAX_UPLOAD_BYTES };
