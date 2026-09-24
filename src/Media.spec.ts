/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Type, Codec, MAX_GOP_DURATION, typeToString, screenResolution, overScreenSize } from './Media';

describe('Media', () => {
    it('exposes the media vocabulary constants', () => {
        expect(MAX_GOP_DURATION).toBe(10000);
        expect(Type.DATA).toBe(0);
        expect(Type.AUDIO).toBe(1);
        expect(Type.VIDEO).toBe(2);
        expect(Codec.UNKNOWN).toBe('');
        expect(Codec.H264).toBe('H264');
        expect(Codec.OPUS).toBe('OPUS');
    });

    describe('typeToString', () => {
        it('maps each known type to its name', () => {
            expect(typeToString(Type.AUDIO)).toBe('audio');
            expect(typeToString(Type.VIDEO)).toBe('video');
            expect(typeToString(Type.DATA)).toBe('data');
        });
        it('falls back to "unknown" for an unmapped value', () => {
            expect(typeToString(99 as Type)).toBe('unknown');
        });
    });

    describe('overScreenSize', () => {
        it('is true only when the resolution exceeds the screen on both axes', () => {
            expect(overScreenSize({ width: 1920, height: 1080 }, { width: 1280, height: 720 })).toBe(true);
            expect(overScreenSize({ width: 1280, height: 720 }, { width: 1920, height: 1080 })).toBe(false);
            // wider but not taller → not over on both axes
            expect(overScreenSize({ width: 3000, height: 500 }, { width: 1920, height: 1080 })).toBe(false);
        });
        it('is falsy when no screen is provided', () => {
            expect(overScreenSize({ width: 1920, height: 1080 })).toBeFalsy();
        });
    });

    describe('screenResolution', () => {
        const realScreen = Object.getOwnPropertyDescriptor(window, 'screen');
        const realRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
        const setScreen = (value: unknown) => Object.defineProperty(window, 'screen', { configurable: true, value });
        const setRatio = (value: unknown) =>
            Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value });

        afterEach(() => {
            if (realScreen) {
                Object.defineProperty(window, 'screen', realScreen);
            }
            if (realRatio) {
                Object.defineProperty(window, 'devicePixelRatio', realRatio);
            }
        });

        it('scales landscape dimensions by the device pixel ratio', () => {
            setScreen({ width: 1280, height: 720 });
            setRatio(2);
            expect(screenResolution()).toEqual({ width: 2560, height: 1440 });
        });

        it('swaps axes for a portrait screen so it reports the max fullscreen ability', () => {
            setScreen({ width: 1080, height: 1920 });
            setRatio(1);
            expect(screenResolution()).toEqual({ width: 1920, height: 1080 });
        });

        it('defaults the ratio to 1 when devicePixelRatio is absent', () => {
            setScreen({ width: 800, height: 600 });
            setRatio(0);
            expect(screenResolution()).toEqual({ width: 800, height: 600 });
        });

        it('returns undefined when there is no screen', () => {
            setScreen(undefined);
            expect(screenResolution()).toBeUndefined();
        });
    });
});
