export async function downloadResultImage(src: string, nodeId: string): Promise<void> {
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error('Не удалось скачать изображение');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromSrc(src, nodeId);
    link.click();
    URL.revokeObjectURL(url);
}

function filenameFromSrc(src: string, nodeId: string): string {
    const path = src.split('?')[0] ?? src;
    const last = path.split('/').pop();
    if (last && last.includes('.') && !last.startsWith('data:')) {
        return last;
    }
    return `result-${nodeId}.png`;
}
