import { useGraphStore } from '@/entities/graph';
import { PRESETS } from '@/entities/preset';

export function PresetSelect() {
    const presetId = useGraphStore((state) => state.presetId);
    const setPresetId = useGraphStore((state) => state.setPresetId);

    return (
        <label className='flex items-center gap-2 text-sm'>
            Preset
            <select
                className='rounded-md border border-slate-600 bg-slate-900 px-2 py-1'
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
            >
                {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                        {preset.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
