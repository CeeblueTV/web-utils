/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect, vi } from 'vitest';
import { Type, Params, buildURL, createMediaKeySystemConfigurations, defineMediaExt } from './Connect';

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

        it('should decode the stream name derived from the URL path', () => {
            for (const endPoint of ['https://h/wrts/out%2Bx.rts', 'https://h/wrts/out+x']) {
                const params: Params = { endPoint };
                const url = buildURL(Type.WRTS, params, 'https');
                expect(params.streamName).toBe('out+x');
                expect(url.toString()).toBe(endPoint);
            }
        });

        it('should keep an encoded slash or dot in the derived stream name', () => {
            const params: Params = { endPoint: 'https://h/wrts/a%2Fb%2Ec.rts' };
            buildURL(Type.WRTS, params, 'https');
            expect(params.streamName).toBe('a/b.c');
        });

        it('should keep a malformed escape in the derived stream name', () => {
            const params: Params = { endPoint: 'https://h/wrts/bad%E0%A4%A' };
            const url = buildURL(Type.WRTS, params, 'https');
            expect(params.streamName).toBe('bad%E0%A4%A');
            expect(url.toString()).toBe('https://h/wrts/bad%E0%A4%A');
        });

        it('should not touch a given stream name', () => {
            const params: Params = { endPoint: 'https://h/wrts/out%2Bx.rts', streamName: 'out%2By' };
            const url = buildURL(Type.WRTS, params, 'https');
            expect(params.streamName).toBe('out%2By');
            expect(url.toString()).toBe('https://h/wrts/out%2Bx.rts');
        });

        it('should keep a decoded or an already encoded stream name as is in the path', () => {
            for (const streamName of [
                'out+12423351-d0a2-4f0f-98a0-015b73f934f2',
                'out%2B12423351-d0a2-4f0f-98a0-015b73f934f2'
            ]) {
                const params: Params = { endPoint: 'example.com', streamName };
                const url = buildURL(Type.WRTS, params);
                expect(url.toString()).toBe('wss://example.com/wrts/' + streamName + '.rts');
                expect(params.streamName).toBe(streamName);
            }
        });

        it('should keep a slash of the stream name as a path separator', () => {
            const url = buildURL(Type.WRTS, {
                endPoint: 'example.com',
                streamName: 'out+12423351-d0a2-4f0f-98a0-015b73f934f2/1-3'
            });
            expect(url.toString()).toBe('wss://example.com/wrts/out+12423351-d0a2-4f0f-98a0-015b73f934f2/1-3.rts');
        });

        it('should derive back the stream name from the built URL', () => {
            for (const type of [Type.HESP, Type.WEBRTC, Type.WRTS, Type.DIRECT_STREAMING, Type.DATA]) {
                const streamName = 'out+12423351-d0a2-4f0f-98a0-015b73f934f2';
                const params: Params = { endPoint: buildURL(type, { endPoint: 'example.com', streamName }).toString() };
                buildURL(type, params);
                expect(params.streamName).toBe(streamName);
            }
        });

        it('should warn and build the path with an empty stream name', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const url = buildURL(Type.HESP, { endPoint: 'example.com' });
            expect(url.toString()).toBe('wss://example.com/hesp//index.json');
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
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

    describe('createMediaKeySystemConfigurations', () => {
        it('should build the cartesian product of content types and robustness values', () => {
            const configurations = createMediaKeySystemConfigurations({
                audioContentTypes: ['audio/mp4; codecs="mp4a.40.2"'],
                videoContentTypes: ['video/mp4; codecs="avc1.640028"', 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
                audioRobustness: ['SW_SECURE_CRYPTO', 'HW_SECURE_CRYPTO'],
                videoRobustness: ['SW_SECURE_DECODE', 'HW_SECURE_DECODE']
            });

            expect(configurations).toHaveLength(8);
            expect(configurations[0]).toEqual({
                audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }],
                videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.640028"', robustness: 'SW_SECURE_DECODE' }]
            });
            expect(configurations[7]).toEqual({
                audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'HW_SECURE_CRYPTO' }],
                videoCapabilities: [
                    { contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"', robustness: 'HW_SECURE_DECODE' }
                ]
            });
        });

        it('should omit empty robustness values', () => {
            const configurations = createMediaKeySystemConfigurations({
                audioContentTypes: 'audio/mp4; codecs="mp4a.40.2"',
                videoContentTypes: 'video/mp4; codecs="avc1.640028"'
            });

            expect(configurations).toEqual([
                {
                    audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
                    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.640028"' }]
                }
            ]);
        });

        it('should preserve unresolved audio capabilities without duplicating video-only configurations', () => {
            const configurations = createMediaKeySystemConfigurations({
                videoContentTypes: 'video/mp4; codecs="avc1.640028"',
                audioRobustness: ['SW_SECURE_CRYPTO', 'HW_SECURE_CRYPTO'],
                videoRobustness: ['SW_SECURE_DECODE', 'HW_SECURE_DECODE']
            });

            expect(configurations).toEqual([
                {
                    audioCapabilities: [{ robustness: 'SW_SECURE_CRYPTO' }, { robustness: 'HW_SECURE_CRYPTO' }],
                    videoCapabilities: [
                        { contentType: 'video/mp4; codecs="avc1.640028"', robustness: 'SW_SECURE_DECODE' }
                    ]
                },
                {
                    audioCapabilities: [{ robustness: 'SW_SECURE_CRYPTO' }, { robustness: 'HW_SECURE_CRYPTO' }],
                    videoCapabilities: [
                        { contentType: 'video/mp4; codecs="avc1.640028"', robustness: 'HW_SECURE_DECODE' }
                    ]
                }
            ]);
        });

        it('should preserve unresolved video capabilities without duplicating audio-only configurations', () => {
            const configurations = createMediaKeySystemConfigurations({
                audioContentTypes: 'audio/mp4; codecs="mp4a.40.2"',
                audioRobustness: ['SW_SECURE_CRYPTO', 'HW_SECURE_CRYPTO'],
                videoRobustness: ['SW_SECURE_DECODE', 'HW_SECURE_DECODE']
            });

            expect(configurations).toEqual([
                {
                    audioCapabilities: [
                        { contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }
                    ],
                    videoCapabilities: [{ robustness: 'SW_SECURE_DECODE' }, { robustness: 'HW_SECURE_DECODE' }]
                },
                {
                    audioCapabilities: [
                        { contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'HW_SECURE_CRYPTO' }
                    ],
                    videoCapabilities: [{ robustness: 'SW_SECURE_DECODE' }, { robustness: 'HW_SECURE_DECODE' }]
                }
            ]);
        });

        it('should create unresolved capability templates from robustness-only inputs', () => {
            const configurations = createMediaKeySystemConfigurations({
                audioRobustness: ['A1', 'A2'],
                videoRobustness: ['V1', 'V2']
            });

            expect(configurations).toEqual([
                {
                    audioCapabilities: [{ robustness: 'A1' }, { robustness: 'A2' }],
                    videoCapabilities: [{ robustness: 'V1' }, { robustness: 'V2' }]
                }
            ]);
        });

        it('should keep the base configuration on each generated entry', () => {
            const configurations = createMediaKeySystemConfigurations({
                audioContentTypes: 'audio/mp4; codecs="mp4a.40.2"',
                baseConfiguration: {
                    initDataTypes: ['cenc'],
                    distinctiveIdentifier: 'optional',
                    persistentState: 'optional',
                    sessionTypes: ['temporary']
                }
            });

            expect(configurations).toEqual([
                {
                    initDataTypes: ['cenc'],
                    distinctiveIdentifier: 'optional',
                    persistentState: 'optional',
                    sessionTypes: ['temporary'],
                    audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }]
                }
            ]);
        });

        it('should return the base configuration when no template inputs are provided', () => {
            const configurations = createMediaKeySystemConfigurations({
                baseConfiguration: {
                    persistentState: 'optional'
                }
            });

            expect(configurations).toEqual([{ persistentState: 'optional' }]);
        });
    });
});
