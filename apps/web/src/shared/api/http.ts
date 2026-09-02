export function apiUrl(path: string): string {
    const base = import.meta.env.VITE_API_URL ?? '';
    return `${base}${path}`;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(apiUrl(path), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
}

export async function uploadImage(dataUrl: string): Promise<{ url: string }> {
    return apiJson('/api/uploads', {
        method: 'POST',
        body: JSON.stringify({ dataUrl }),
    });
}
