/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import { describe, it, expect } from 'vitest';
import { SDP } from './SDP';

describe('SDP', () => {
    const sampleSDP = `v=0
o=- 1699450751193623 0 IN IP4 0.0.0.0
s=-
t=0 0
a=ice-lite
a=group:BUNDLE 0 1
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9
a=sendonly
a=setup:passive
a=fingerprint:sha-256 51:36:ED:78:A4:9F:25:8C:39:9A:0E:A0:B4:9B:6E:04:37:FF:AD:96:93:71:43:88:2C:0B:0F:AB:6F:9A:52:B8
a=ice-ufrag:fa37
a=ice-pwd:JncCHryDsbzayy4cBWDxS2
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 nack
a=mid:0
a=fmtp:111 minptime=10;useinbandfec=1
a=candidate:1 1 udp 2130706431 89.105.221.108 56643 typ host
a=end-of-candidates
m=video 9 UDP/TLS/RTP/SAVPF 106
c=IN IP4 0.0.0.0
a=rtcp:9
a=sendonly
a=setup:passive
a=fingerprint:sha-256 51:36:ED:78:A4:9F:25:8C:39:9A:0E:A0:B4:9B:6E:04:37:FF:AD:96:93:71:43:88:2C:0B:0F:AB:6F:9A:52:B8
a=ice-ufrag:fa37
a=ice-pwd:JncCHryDsbzayy4cBWDxS2
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:106 H264/90000
a=rtcp-fb:106 nack
a=rtcp-fb:106 goog-remb
a=mid:1
a=fmtp:106 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1
a=candidate:1 1 udp 2130706431 89.105.221.108 56643 typ host
a=end-of-candidates`;

    describe('fromString', () => {
        it('should parse SDP string to object', () => {
            const sdp = SDP.fromString(sampleSDP);
            expect(sdp).toBeInstanceOf(Array);
            expect(sdp.length).toBe(2);
            console.log(sdp[0]);
            expect(sdp[0].m).toBe('audio 9 UDP/TLS/RTP/SAVPF 111');
            expect(sdp[0].c).toBe('IN IP4 0.0.0.0');
            expect(sdp[0].sendonly).toBe('');
            expect(sdp[0].setup).toBe('passive');
            expect(sdp[0]['ice-ufrag']).toBe('fa37');
            expect(sdp[0]['ice-pwd']).toBe('JncCHryDsbzayy4cBWDxS2');
            expect(sdp[0].rtpmap).toBe('111 opus/48000/2');

            expect(sdp[1].m).toBe('video 9 UDP/TLS/RTP/SAVPF 106');
            expect(sdp[1].c).toBe('IN IP4 0.0.0.0');
            expect(sdp[1].sendonly).toBe('');
            expect(sdp[1].setup).toBe('passive');
            expect(sdp[1]['ice-ufrag']).toBe('fa37');
            expect(sdp[1]['ice-pwd']).toBe('JncCHryDsbzayy4cBWDxS2');
            expect(sdp[1].rtpmap).toBe('106 H264/90000');
        });

        it('should handle empty SDP', () => {
            const sdp = SDP.fromString('');
            expect(sdp).toBeInstanceOf(Array);
            expect(sdp.length).toBe(0);
        });

        it('should handle whitespace', () => {
            const sdp = SDP.fromString('v=0\n\ns=-\n\n');
            expect(sdp).toBeInstanceOf(Array);
            expect(sdp.length).toBe(0);
            expect(sdp.v).toBe('0');
            expect(sdp.s).toBe('-');
        });

        it('should handle already parsed SDP', () => {
            const parsed = SDP.fromString(sampleSDP);
            const sdp = SDP.fromString(parsed);
            expect(sdp).toBe(parsed);
        });
    });

    describe('toString', () => {
        it('should handle empty SDP object', () => {
            const sdp = SDP.toString([]);
            expect(sdp).toBe('');
        });

        //      it('should handle already serialized SDP', () => {
        //          const sdp = SDP.toString(sampleSDP);
        //          expect(sdp).toBe(sampleSDP);
        //      });

        it('should handle missing optional fields', () => {
            const sdp = SDP.toString({ v: '0', s: '-' });
            expect(sdp).toBe('v=0\ns=-\n');
        });
    });

    describe('addAttribute', () => {
        it('should add new attribute', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test:value');
            expect(sdp[0].test).toBe('value');
        });

        it('should add attribute without value', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test');
            expect(sdp[0].test).toBe('');
        });

        it('should handle duplicate attributes', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test:value1');
            SDP.addAttribute(sdp[0], 'test:value2');
            expect(sdp[0].test).toEqual(['value1', 'value2']);
        });
    });

    describe('removeAttribute', () => {
        it('should remove attribute with value', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test:value');
            SDP.removeAttribute(sdp[0], 'test');
            expect(sdp[0].test).toBeUndefined();
        });

        it('should remove attribute without value', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test');
            SDP.removeAttribute(sdp[0], 'test');
            expect(sdp[0].test).toBeUndefined();
        });

        it('should remove single value from array', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.addAttribute(sdp[0], 'test:value1');
            SDP.addAttribute(sdp[0], 'test:value2');
            SDP.removeAttribute(sdp[0], 'test');
            expect(sdp[0].test).toBeUndefined();
        });

        it('should handle non-existent attribute', () => {
            const sdp = SDP.fromString(sampleSDP);
            SDP.removeAttribute(sdp[0], 'test:value');
            expect(sdp[0].test).toBeUndefined();
        });
    });

    describe('parseAttribute', () => {
        it('should parse attribute with value', () => {
            const result = SDP.parseAttribute('test:value');
            expect(result).toEqual({ key: 'test', value: 'value' });
        });

        it('should parse attribute without value', () => {
            const result = SDP.parseAttribute('test');
            expect(result).toEqual({ key: 'test', value: undefined });
        });
    });

    describe('media sections', () => {
        it('should parse media sections correctly', () => {
            const sdp = SDP.fromString(sampleSDP);
            expect(sdp[0].m).toBe('audio 9 UDP/TLS/RTP/SAVPF 111');
            expect(sdp[1].m).toBe('video 9 UDP/TLS/RTP/SAVPF 106');
        });

        it('should copy fingerprint to media sections', () => {
            const sdp = SDP.fromString(sampleSDP);
            expect(sdp[0].fingerprint).toBe(sdp[0].fingerprint);
            expect(sdp[1].fingerprint).toBe(sdp[0].fingerprint);
        });

        it('should handle multiple rtcp-fb attributes', () => {
            const sdp = SDP.fromString(sampleSDP);
            expect(sdp[1]['rtcp-fb']).toEqual(['106 nack', '106 goog-remb']);
        });
    });
});
