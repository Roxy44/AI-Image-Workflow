import { describe, expect, it } from 'vitest';

import { canConnectKinds, canConnectPorts } from './ports';

describe('typed ports', () => {
    it('allows text to text and image to image', () => {
        expect(canConnectPorts('text', 'text')).toBe(true);
        expect(canConnectPorts('image', 'image')).toBe(true);
    });

    it('blocks mismatched port types', () => {
        expect(canConnectPorts('text', 'image')).toBe(false);
        expect(canConnectPorts('image', 'text')).toBe(false);
    });

    it('blocks prompt from feeding a result node', () => {
        expect(canConnectKinds('prompt', 'result')).toBe(false);
    });

    it('allows prompt to generate and generate to result', () => {
        expect(canConnectKinds('prompt', 'generateImage')).toBe(true);
        expect(canConnectKinds('generateImage', 'result')).toBe(true);
    });

    it('allows an optional prompt and a previous image into edit', () => {
        expect(canConnectKinds('prompt', 'editImage')).toBe(true);
        expect(canConnectKinds('imageInput', 'editImage')).toBe(true);
        expect(canConnectKinds('generateImage', 'editImage')).toBe(true);
        expect(canConnectKinds('editImage', 'editImage')).toBe(true);
        expect(canConnectKinds('result', 'editImage')).toBe(true);
        expect(canConnectKinds('result', 'result')).toBe(true);
    });
});
