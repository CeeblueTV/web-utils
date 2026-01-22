/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { PlayerStats } from './PlayerStats';
import * as CML from '@svta/common-media-library';

describe('PlayerStats', () => {
    const TEST_URL = new URL('https://example.com/streams/manifest.m3u8');
    const SESSION_ID = 'test-session-123';

    describe('toCmcd', () => {
        it('should map basic static and simple fields correctly', () => {
            const stats = new PlayerStats();
            stats.bufferAmount = 1500;
            stats.recvByteRate = 5000;
            stats.waitingData = true;

            const cmcd = stats.toCmcd(TEST_URL, 0);

            expect(cmcd.v).toBe(1);
            expect(cmcd.st).toBe(CML.CmcdStreamType.LIVE);
            expect(cmcd.bl).toBe(1500);
            expect(cmcd.mtp).toBe(5000);
            expect(cmcd.su).toBe(true);
        });

        it('should extract content ID (cid) from URL', () => {
            const stats = new PlayerStats();
            const cmcd = stats.toCmcd(TEST_URL, 0);
            expect(cmcd.cid).toBe('manifest.m3u8');
        });

        it('should include session ID (sid) when provided', () => {
            const stats = new PlayerStats();
            const cmcd = stats.toCmcd(TEST_URL, 0, undefined, SESSION_ID);
            expect(cmcd.sid).toBe(SESSION_ID);
        });

        describe('Bitrate (br)', () => {
            it('should return only video bandwidth if trackId matches videoTrackId', () => {
                const stats = new PlayerStats();
                stats.videoTrackId = 1;
                stats.videoTrackBandwidth = 2000;
                stats.audioTrackBandwidth = 128;

                const cmcd = stats.toCmcd(TEST_URL, 1);
                expect(cmcd.br).toBe(2000);
            });

            it('should return only audio bandwidth if trackId matches audioTrackId', () => {
                const stats = new PlayerStats();
                stats.audioTrackId = 2;
                stats.videoTrackBandwidth = 2000;
                stats.audioTrackBandwidth = 128;

                const cmcd = stats.toCmcd(TEST_URL, 2);
                expect(cmcd.br).toBe(128);
            });

            it('should return sum of bandwidths if trackId matches neither', () => {
                const stats = new PlayerStats();
                stats.videoTrackBandwidth = 2000;
                stats.audioTrackBandwidth = 128;

                const cmcd = stats.toCmcd(TEST_URL, 999);
                expect(cmcd.br).toBe(2128);
            });
        });

        describe('Streaming Format (sf)', () => {
            it('should map known protocols correctly', () => {
                const stats = new PlayerStats();

                stats.protocol = 'DASH';
                expect(stats.toCmcd(TEST_URL, 0).sf).toBe('d');

                stats.protocol = 'HLS';
                expect(stats.toCmcd(TEST_URL, 0).sf).toBe('h');

                stats.protocol = 'SMOOTH';
                expect(stats.toCmcd(TEST_URL, 0).sf).toBe('s');
            });

            it('should return "o" for unknown protocols and undefined for missing protocol', () => {
                const stats = new PlayerStats();

                stats.protocol = 'WEBRTC';
                expect(stats.toCmcd(TEST_URL, 0).sf).toBe('o');

                stats.protocol = undefined;
                expect(stats.toCmcd(TEST_URL, 0).sf).toBeUndefined();
            });
        });

        describe('Object Type (ot)', () => {
            it('should determine ot based on trackId', () => {
                const stats = new PlayerStats();
                stats.audioTrackId = 100;
                stats.videoTrackId = 200;

                expect(stats.toCmcd(TEST_URL, 100).ot).toBe(CML.CmcdObjectType.AUDIO);
                expect(stats.toCmcd(TEST_URL, 200).ot).toBe(CML.CmcdObjectType.VIDEO);
                expect(stats.toCmcd(TEST_URL, 999).ot).toBe(CML.CmcdObjectType.OTHER);
            });
        });

        describe('Playback Rate (pr) and Deadline (dl)', () => {
            it('should round playbackRate to 2 decimals', () => {
                const stats = new PlayerStats();
                stats.playbackRate = 1.2555;
                expect(stats.toCmcd(TEST_URL, 0).pr).toBe(1.26);
            });

            it('should fallback to playbackSpeed for pr', () => {
                const stats = new PlayerStats();
                stats.playbackRate = undefined;
                stats.playbackSpeed = 1.5;
                expect(stats.toCmcd(TEST_URL, 0).pr).toBe(1.5);
            });

            it('should calculate deadline (dl) correctly', () => {
                const stats = new PlayerStats();
                stats.bufferAmount = 2000;
                stats.playbackRate = 2;
                // dl = bufferAmount * playbackRate
                expect(stats.toCmcd(TEST_URL, 0).dl).toBe(4000);
            });
        });

        describe('Buffer Starvation (bs)', () => {
            it('should be true if stallCount has increased since prevStats', () => {
                const current = new PlayerStats();
                const prev = new PlayerStats();

                current.stallCount = 5;
                prev.stallCount = 4;
                expect(current.toCmcd(TEST_URL, 0, prev).bs).toBe(true);

                current.stallCount = 5;
                prev.stallCount = 5;
                expect(current.toCmcd(TEST_URL, 0, prev).bs).toBe(false);
            });

            it('should handle missing stallCount in prevStats', () => {
                const current = new PlayerStats();
                current.stallCount = 1;
                expect(current.toCmcd(TEST_URL, 0).bs).toBe(true);
            });
        });
    });
});
