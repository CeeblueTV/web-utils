/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { Type, Params, buildURL, defineMediaExt } from './Connect';

describe('Connect', () => {
    describe('defineMediaExt', () => {
        it('should set correct media extension for HESP', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.HESP, params);
            expect(params.mediaExt).toBe('mp4');
        });

        it('should set correct media extension for WEBRTC', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.WEBRTC, params);
            expect(params.mediaExt).toBe('rtp');
        });

        it('should set correct media extension for WebRTS with URL path', () => {
            const params: Params = { endPoint: 'https://example.com/stream.flv', streamName: 'test' };
            defineMediaExt(Type.WRTS, params);
            expect(params.mediaExt).toBe('flv');
        });

        it('should set default rts extension for WebRTS without URL path', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.WRTS, params);
            expect(params.mediaExt).toBe('rts');
        });

        it('should set default rts extension for WebRTS with JSON manifest', () => {
            const params: Params = { endPoint: 'https://example.com/manifest.json', streamName: 'test' };
            defineMediaExt(Type.WRTS, params);
            expect(params.mediaExt).toBe('rts');
        });

        it('should set media extension to MP4 (from URL extension or ext= param)', () => {
            const params: Params = { endPoint: 'https://example.com/media.mp4' };
            defineMediaExt(Type.WRTS, params);
            expect(params.mediaExt).toBe('mp4');

            params.endPoint = 'https://example.com/media.rts?ext=mp4';
            params.mediaExt = undefined; // important: force recompute
            defineMediaExt(Type.WRTS, params);
            expect(params.mediaExt).toBe('mp4');
        });

        it('should set correct media extension for META', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.META, params);
            expect(params.mediaExt).toBe('js');
        });

        it('should set correct media extension for DATA', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.DATA, params);
            expect(params.mediaExt).toBe('json');
        });

        it('should handle unknown type gracefully', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt('UNKNOWN' as Type, params);
            expect(params.mediaExt).toBe('');
        });

        it('should remove dot prefix from media extension', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test', mediaExt: '.mp4' };
            defineMediaExt(Type.HESP, params);
            expect(params.mediaExt).toBe('mp4');
        });

        it('should default to mp4 for DIRECT_STREAMING when mediaExt cannot be determined', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            defineMediaExt(Type.DIRECT_STREAMING, params);
            expect(params.mediaExt).toBe('mp4');
        });

        it('should keep and normalize provided mediaExt for DIRECT_STREAMING', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test', mediaExt: '.FLV' };
            defineMediaExt(Type.DIRECT_STREAMING, params);
            expect(params.mediaExt).toBe('flv');
        });
    });

    describe('buildURL', () => {
        it('should build correct HESP URL', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.HESP, params);
            expect(url.toString()).toBe('wss://example.com/hesp/test/index.json');
        });

        it('should build correct WEBRTC URL', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.WEBRTC, params);
            expect(url.toString()).toBe('wss://example.com/webrtc/test');
        });

        it('should build correct WebRTS URL', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.WRTS, params);
            expect(url.toString()).toBe('wss://example.com/wrts/test.rts');
        });

        it('should build correct DIRECT_STREAMING URL (default mp4)', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.DIRECT_STREAMING, params);
            expect(url.toString()).toBe('wss://example.com/live/test.mp4');
        });

        it('should build correct DIRECT_STREAMING URL using mediaExt', () => {
            const params: Params = { endPoint: 'example.com', mediaExt: 'flv', streamName: 'test' };
            const url = buildURL(Type.DIRECT_STREAMING, params);
            expect(url.toString()).toBe('wss://example.com/live/test.flv');
        });

        it('should build correct META URL', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.META, params);
            expect(url.toString()).toBe('wss://example.com/json_test.js');
        });

        it('should build correct DATA URL', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.DATA, params);
            expect(url.toString()).toBe('wss://example.com/test.json');
        });

        it('should include access token in URL', () => {
            const params: Params = {
                endPoint: 'example.com',
                streamName: 'test',
                accessToken: 'token123'
            };
            const url = buildURL(Type.HESP, params);
            expect(url.searchParams.get('id')).toBe('token123');
        });

        it('should include custom query parameters', () => {
            const params: Params = {
                endPoint: 'example.com',
                streamName: 'test',
                query: new URLSearchParams({ key: 'value' })
            };
            const url = buildURL(Type.HESP, params);
            expect(url.searchParams.get('key')).toBe('value');
        });

        it('should append correct query parameters', () => {
            const params: Params = {
                endPoint: 'example.com?existing=param',
                streamName: 'test',
                query: new URLSearchParams({ key: 'value' })
            };

            const url = buildURL(Type.HESP, params);
            expect(url.searchParams.get('existing')).toBe('param');
            expect(url.searchParams.get('key')).toBe('value');
        });

        it('should preserve existing URL path', () => {
            const params: Params = {
                endPoint: 'https://example.com/custom/path',
                streamName: 'test'
            };
            const url = buildURL(Type.HESP, params);
            expect(url.pathname).toBe('/custom/path');
        });

        it('should handle different protocols', () => {
            const params: Params = { endPoint: 'example.com', streamName: 'test' };
            const url = buildURL(Type.HESP, params, 'ws');
            expect(url.protocol).toBe('ws:');
        });

        it('should handle URLs with existing query parameters', () => {
            const params: Params = {
                endPoint: 'https://example.com?existing=param',
                streamName: 'test',
                accessToken: 'token123'
            };
            const url = buildURL(Type.HESP, params);
            expect(url.searchParams.get('existing')).toBe('param');
            // accessToken
            expect(url.searchParams.get('id')).toBe('token123');
        });

        it('Should throw an error if the URL is invalid', () => {
            const params: Params = {
                endPoint: 'not a valid url',
                streamName: 'test'
            };
            expect(() => buildURL(Type.HESP, params)).toThrow(Error);
        });
    });
});
