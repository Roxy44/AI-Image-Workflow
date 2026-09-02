import { EditorPage } from '@/pages/editorPage';

import { AppProviders } from './providers';

export function App() {
    return (
        <AppProviders>
            <EditorPage />
        </AppProviders>
    );
}
