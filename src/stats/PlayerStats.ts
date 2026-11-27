/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as CML from '@svta/common-media-library';
import { Loggable } from '../Log';
import * as Util from '../Util';

/**
 * Collects variable names for player statistics metrics across different projects (e.g., wrts, webrtc).
 * Variables remain undefined if they are not present in the stats for the current project
 * (for example, 'latency' is undefined for webrtc).
 * Includes the toCmcd() method to convert stats into a CMCD payload.
 */
export class PlayerStats extends Loggable {
    protocol?: string; // protocol: HLS, DASH, WRTS, HESP, SMOOTH
    currentTime?: number; // current time in ms
    buffering?: boolean; // true on startup or when rebuffering after a stall

    bufferAmount?: number; // buffer amount in ms
    latency?: number; // latency in ms
    rtt?: number; // round trip time in ms
    jitter?: number; // jitter of reception RFC3550

    skippedVideo?: number; // video skipped in ms since the beginning of the session
    skippedAudio?: number; // audio skipped in ms since the beginning of the session

    playbackSpeed?: number;
    playbackRate?: number;

    audioByteRate?: number; // current audio Bps
    videoByteRate?: number; // current video Bps
    dataByteRate?: number; // current data Bps
    recvByteRate?: number; // current received Bps measured by a source, see getRecvByteRate

    videoTrackId?: number; // video track selected
    videoTrackBandwidth?: number; // video bandwidth currently playing, in Bps
    audioTrackId?: number; // audio track selected
    audioTrackBandwidth?: number; // audio bandwidth currently playing, in Bps

    videoPerSecond?: number; // frame video per second, fps
    audioPerSecond?: number; // sample audio per second

    // following parameters are counters

    lostPacketCount?: number; // network packets lost
    nackCount?: number; // current estimated Negative Acknowledgement count

    stallCount?: number;

    /**
     * Computes the current received Bps: {@link recvByteRate} when a source measured it, else the sum of the audio,
     * video and data byte rates
     * @returns the received Bps, undefined when neither {@link recvByteRate} nor any of the byte rates is known
     */
    getRecvByteRate(): number | undefined {
        // If recvByteRate is set, return it
        if (this.recvByteRate != null) {
            return this.recvByteRate;
        }
        // If none of the byte rates are known, return undefined
        if (this.audioByteRate == null && this.videoByteRate == null && this.dataByteRate == null) {
            return undefined;
        }
        // Otherwise, return the sum of the known byte rates
        return (this.audioByteRate ?? 0) + (this.videoByteRate ?? 0) + (this.dataByteRate ?? 0);
    }

    /**
     * Converts the current {@link PlayerStats} snapshot into a CMCD (Common Media Client Data) payload.
     * @param url - The full URL of the media object.
     * @param trackIds -Track Id to generate the CMCD payload, keep empty to relate an CMCD OTHER object.
     * @param prevStats - Optional previous {@link PlayerStats} snapshot to calculate deltas for incremental metrics since their last reset.
     * @returns A {@link CML.Cmcd} object representing the CMCD payload.
     */
    toCmcd(url: URL, trackIds: Array<number>, prevStats?: PlayerStats): CML.Cmcd {
        const cmcd: CML.Cmcd = {};
        // Determine playback rate to use, preferring 'playbackRate' if available, otherwise falling back to 'playbackSpeed'
        const playBack = this.playbackRate ?? this.playbackSpeed;

        let hasVideo = false;
        let hasAudio = false;
        for (const trackId of trackIds) {
            if (trackId === this.audioTrackId) {
                hasAudio = true;
            } else if (trackId === this.videoTrackId) {
                hasVideo = true;
            }
        }

        // Determine object type and set 'br' (bitrate in kbps): use audio, video, or sum of both depending on selected tracks
        cmcd.br = Util.toKbps((this.audioTrackBandwidth ?? 0) + (this.videoTrackBandwidth ?? 0));
        if (hasAudio) {
            if (hasVideo) {
                cmcd.ot = CML.CmcdObjectType.MUXED;
            } else {
                // just audio
                cmcd.ot = CML.CmcdObjectType.AUDIO;
                cmcd.br = Util.toKbps(this.audioTrackBandwidth ?? 0);
            }
        } else if (hasVideo) {
            // just video
            cmcd.ot = CML.CmcdObjectType.VIDEO;
            cmcd.br = Util.toKbps(this.videoTrackBandwidth ?? 0);
        } else {
            cmcd.ot = CML.CmcdObjectType.OTHER;
        }

        cmcd.st = CML.CmcdStreamType.LIVE; // Stream Type
        cmcd.cid = Util.hash(url.pathname); // Content ID
        if (this.bufferAmount != null && playBack) {
            // Deadline: time before buffer underrun, the buffer drains faster when playing faster
            cmcd.dl = this.bufferAmount / playBack;
        }

        if (this.stallCount != null) {
            cmcd.bs = this.stallCount - (prevStats?.stallCount ?? 0) > 0; // Buffer Starvation
        }
        if (this.bufferAmount != null) {
            cmcd.bl = this.bufferAmount; // Buffer Length
        }
        const recvByteRate = this.getRecvByteRate();
        if (recvByteRate != null) {
            // Measured mtp CMCD throughput in kbps
            cmcd.mtp = Util.toKbps(recvByteRate);
        }
        if (playBack != null) {
            cmcd.pr = Number(playBack.toFixed(2)); // Playback Rate
        }
        // sf defaults to other ("o") if protocol is not in the map, otherwise undefined if protocol is undefined
        const sfByProtocol = {
            dash: 'd',
            hls: 'h',
            smooth: 's'
        };
        const proto = this.protocol?.toLowerCase();
        if (proto != null) {
            cmcd.sf = (sfByProtocol[proto as keyof typeof sfByProtocol] ?? 'o') as CML.CmcdStreamingFormat; // Streaming Format
        }
        if (this.buffering != null) {
            cmcd.su = this.buffering; // Startup
        }
        return cmcd;
    }
}
