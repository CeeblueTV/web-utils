/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import * as CML from '@svta/common-media-library';
import { PlayerStats } from './PlayerStats';

describe('PlayerStats', () => {
    describe('toCmcd', () => {
        it('should generate a CMCD payload for the video track', () => {
            const stats = new PlayerStats();
            stats.protocol = 'HLS';
            stats.bufferAmount = 1000;
            stats.playbackRate = 1.5;
            stats.recvByteRate = 50_000;
            stats.waitingData = true;
            stats.stallCount = 3;
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 1500;
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 64;

            const prev = new PlayerStats();
            prev.stallCount = 2;

            const url = new URL('https://example.com/live/manifest.m3u8?token=abc');
            const cmcd = stats.toCmcd(url, 1, prev);

            expect(cmcd).toMatchObject({
                v: 1,
                ot: CML.CmcdObjectType.VIDEO,
                st: CML.CmcdStreamType.LIVE,
                cid: 'manifest.m3u8',
                dl: 1500,
                br: 1500,
                bs: true,
                bl: 1000,
                mtp: 50_000,
                pr: 1.5,
                sf: 'h',
                su: true
            });
        });

        it('should select the correct object type and bitrate for audio track', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 96;
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 1800;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, 2);

            expect(cmcd.ot).toBe(CML.CmcdObjectType.AUDIO);
            expect(cmcd.br).toBe(96);
        });

        it('should sum bitrates and use OTHER object type when trackId does not match', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 96;
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 1800;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, 99);

            expect(cmcd.ot).toBe(CML.CmcdObjectType.OTHER);
            expect(cmcd.br).toBe(96 + 1800);
        });

        it('should prefer playbackRate over playbackSpeed and round pr to 2 decimals', () => {
            const stats = new PlayerStats();
            stats.playbackSpeed = 1.0;
            stats.playbackRate = 1.234;
            stats.bufferAmount = 1000;

            const url = new URL('https://example.com/v/seg.ts');
            const cmcd = stats.toCmcd(url, 1);

            expect(cmcd.pr).toBe(1.23);
            expect(cmcd.dl).toBe(1234);
        });

        it('should fall back to playbackSpeed when playbackRate is missing', () => {
            const stats = new PlayerStats();
            stats.playbackSpeed = 2;
            stats.bufferAmount = 500;

            const url = new URL('https://example.com/v/seg.ts');
            const cmcd = stats.toCmcd(url, 1);

            expect(cmcd.pr).toBe(2);
            expect(cmcd.dl).toBe(1000);
        });

        it('should map streaming format by protocol and default to "o" for unknown protocol', () => {
            const url = new URL('https://example.com/live/manifest.mpd');

            const dash = new PlayerStats();
            dash.protocol = 'DASH';
            expect(dash.toCmcd(url, 1).sf).toBe('d');

            const smooth = new PlayerStats();
            smooth.protocol = 'smooth';
            expect(smooth.toCmcd(url, 1).sf).toBe('s');

            const unknown = new PlayerStats();
            unknown.protocol = 'WRTS';
            expect(unknown.toCmcd(url, 1).sf).toBe('o');
        });

        it('should not set optional fields when their source values are undefined', () => {
            const stats = new PlayerStats();
            const url = new URL('https://example.com/live/seg.ts');
            const cmcd = stats.toCmcd(url, 1);

            expect(cmcd).toMatchObject({
                v: 1,
                st: CML.CmcdStreamType.LIVE,
                cid: 'seg.ts'
            });
            expect(cmcd).not.toHaveProperty('sf');
            expect(cmcd).not.toHaveProperty('su');
            expect(cmcd).not.toHaveProperty('pr');
            expect(cmcd).not.toHaveProperty('dl');
            expect(cmcd).not.toHaveProperty('bl');
            expect(cmcd).not.toHaveProperty('mtp');
            expect(cmcd).not.toHaveProperty('bs');
        });

        it('should set bs based on stallCount delta (since last reset)', () => {
            const stats = new PlayerStats();
            stats.stallCount = 5;
            const prev = new PlayerStats();
            prev.stallCount = 5;

            const url = new URL('https://example.com/live/seg.ts');
            const cmcd = stats.toCmcd(url, 1, prev);

            expect(cmcd.bs).toBe(false);
        });
    });
});
