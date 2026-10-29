/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import * as CML from '@svta/common-media-library';
import { PlayerStats } from './PlayerStats';
import * as Util from '../Util';

describe('PlayerStats', () => {
    describe('recvByteRate', () => {
        it('should sum the audio, video and data byte rates when not set', () => {
            const stats = new PlayerStats();
            stats.audioByteRate = 7500;
            stats.videoByteRate = 187500;
            stats.dataByteRate = 500;
            expect(stats.recvByteRate).toBe(195500);
        });

        it('should count a missing byte rate as 0', () => {
            const stats = new PlayerStats();
            stats.videoByteRate = 187500;
            expect(stats.recvByteRate).toBe(187500);
        });

        it('should count a missing video byte rate as 0', () => {
            const stats = new PlayerStats();
            stats.audioByteRate = 7500;
            stats.dataByteRate = 500;
            expect(stats.recvByteRate).toBe(8000);
        });

        it('should be undefined when no byte rate is known', () => {
            expect(new PlayerStats().recvByteRate).toBeUndefined();
        });

        it('should return the value set, and the sum again once unset', () => {
            const stats = new PlayerStats();
            stats.audioByteRate = 7500;
            stats.videoByteRate = 187500;
            stats.recvByteRate = 200000; // measured on the wire, with the container overhead
            expect(stats.recvByteRate).toBe(200000);
            stats.recvByteRate = 0;
            expect(stats.recvByteRate).toBe(0);
            stats.recvByteRate = undefined;
            expect(stats.recvByteRate).toBe(195000);
        });
    });

    describe('serialization', () => {
        it('should put recvByteRate in JSON, set or summed, and no internal key', () => {
            const stats = new PlayerStats();
            stats.audioByteRate = 7500;
            stats.videoByteRate = 187500;
            expect(JSON.parse(JSON.stringify(stats))).toEqual({
                audioByteRate: 7500,
                videoByteRate: 187500,
                recvByteRate: 195000
            });
            stats.recvByteRate = 200000;
            const json = JSON.parse(JSON.stringify(stats));
            expect(json.recvByteRate).toBe(200000);
            expect(Object.keys(json).filter(key => key.startsWith('_'))).toEqual([]);
        });

        it('should leave recvByteRate out of JSON when no byte rate is known', () => {
            expect(JSON.parse(JSON.stringify(new PlayerStats()))).toEqual({});
        });

        it('should show recvByteRate in the logs (Util.stringify), and no internal key', () => {
            const stats = new PlayerStats();
            stats.videoByteRate = 187500;
            stats.recvByteRate = 190000;
            const text = Util.stringify(stats);
            expect(text).toContain('recvByteRate');
            expect(text).toContain('190000');
            expect(text).not.toContain('_recv');
        });
    });

    describe('toCmcd', () => {
        it('should generate a CMCD payload for the video track', () => {
            const stats = new PlayerStats();
            stats.protocol = 'HLS';
            stats.bufferAmount = 1000;
            stats.playbackRate = 1.5;
            stats.audioByteRate = 7500; // 60 kbps
            stats.videoByteRate = 187500; // 1500 kbps
            stats.buffering = true;
            stats.stallCount = 3;
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 187500; // 1500 kbps
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 8000; // 64 kbps

            const prev = new PlayerStats();
            prev.stallCount = 2;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1], prev);

            expect(cmcd).toMatchObject({
                ot: CML.CmcdObjectType.VIDEO,
                st: CML.CmcdStreamType.LIVE,
                cid: Util.hash(url.pathname),
                br: 1500,
                bs: true,
                bl: 1000,
                mtp: 1560,
                pr: 1.5,
                sf: 'h',
                su: true
            });
            // 1000 ms of buffer drains in 666.67 ms at 1.5x
            expect(cmcd.dl).toBeCloseTo(1000 / 1.5);
        });

        it('should set mtp from dataByteRate when audio and video byte rates are missing', () => {
            const stats = new PlayerStats();
            stats.dataByteRate = 64000; // 512 kbps

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [99]);

            expect(cmcd.mtp).toBe(512);
        });

        it('should select the correct object type and bitrate for audio track', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 12000; // 96 kbps
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 225000; // 1800 kbps

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [2]);

            expect(cmcd.ot).toBe(CML.CmcdObjectType.AUDIO);
            expect(cmcd.br).toBe(96);
        });

        it('should use MUXED object type and combined bitrate when audio and video tracks are both selected', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 12000; // 96 kbps
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 225000; // 1800 kbps

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1, 2]);

            expect(cmcd.ot).toBe(CML.CmcdObjectType.MUXED);
            expect(cmcd.br).toBe(96 + 1800);
        });

        it('should sum bitrates and use OTHER object type when trackId does not match', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.audioTrackBandwidth = 12000; // 96 kbps
            stats.videoTrackId = 1;
            stats.videoTrackBandwidth = 225000; // 1800 kbps

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [99]);

            expect(cmcd.ot).toBe(CML.CmcdObjectType.OTHER);
            expect(cmcd.br).toBe(96 + 1800);
        });

        it('should set br to 0 when the selected track has no bandwidth', () => {
            const stats = new PlayerStats();
            stats.audioTrackId = 2;
            stats.videoTrackId = 1;

            const url = new URL('https://example.com/live/chunk.ts');

            const audio = stats.toCmcd(url, [2]);
            expect(audio.ot).toBe(CML.CmcdObjectType.AUDIO);
            expect(audio.br).toBe(0);

            const video = stats.toCmcd(url, [1]);
            expect(video.ot).toBe(CML.CmcdObjectType.VIDEO);
            expect(video.br).toBe(0);
        });

        it('should prefer playbackRate over playbackSpeed and round pr to 2 decimals', () => {
            const stats = new PlayerStats();
            stats.playbackSpeed = 1.0;
            stats.playbackRate = 1.234;
            stats.bufferAmount = 1000;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1]);

            expect(cmcd.pr).toBe(1.23);
            expect(cmcd.dl).toBeCloseTo(1000 / 1.234);
        });

        it('should fall back to playbackSpeed when playbackRate is missing', () => {
            const stats = new PlayerStats();
            stats.playbackSpeed = 2;
            stats.bufferAmount = 500;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1]);

            expect(cmcd.pr).toBe(2);
            expect(cmcd.dl).toBe(250);
        });

        it('should not set dl when playback is stopped', () => {
            const stats = new PlayerStats();
            stats.playbackSpeed = 0;
            stats.bufferAmount = 500;

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1]);

            expect(cmcd).not.toHaveProperty('dl');
        });

        it('should map streaming format by protocol and default to "o" for unknown protocol', () => {
            const url = new URL('https://example.com/live/chunk.ts');

            const dash = new PlayerStats();
            dash.protocol = 'DASH';
            expect(dash.toCmcd(url, [1]).sf).toBe('d');

            const smooth = new PlayerStats();
            smooth.protocol = 'smooth';
            expect(smooth.toCmcd(url, [1]).sf).toBe('s');

            const unknown = new PlayerStats();
            unknown.protocol = 'WRTS';
            expect(unknown.toCmcd(url, [1]).sf).toBe('o');
        });

        it('should not set optional fields when their source values are undefined', () => {
            const stats = new PlayerStats();
            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1]);

            expect(cmcd).toMatchObject({
                st: CML.CmcdStreamType.LIVE,
                cid: Util.hash(url.pathname)
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

            const url = new URL('https://example.com/live/chunk.ts');
            const cmcd = stats.toCmcd(url, [1], prev);

            expect(cmcd.bs).toBe(false);
        });

        it('should count every stall as new without previous stats', () => {
            const stats = new PlayerStats();
            stats.stallCount = 1;
            expect(stats.toCmcd(new URL('https://example.com/live/chunk.ts'), [1]).bs).toBe(true);
        });
    });
});
