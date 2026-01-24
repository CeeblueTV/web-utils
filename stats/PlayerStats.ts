/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */

import * as CML from '@svta/common-media-library';

/**
 * Collects variable names for player statistics metrics across different projects (e.g., wrts, webrtc).
 * Variables remain undefined if they are not present in the stats for the current project
 * (for example, 'latency' is undefined for webrtc).
 * Includes the toCmcd() method to convert stats into a CMCD payload.
 */
export class PlayerStats {
    protocol?: string; // protocol: HLS, DASH, WRTS, HESP, SMOOTH
    currentTime?: number; // current time in ms
    waitingData?: boolean;

    bufferAmount?: number; // buffer amount in ms
    latency?: number; // latency in ms
    rtt?: number; // round trip time in ms
    jitter?: number; // jitter of reception RFC3550

    playbackSpeed?: number;
    playbackRate?: number;

    recvByteRate?: number; // Bps in reception
    sendByteRate?: number; // Bps in sending

    videoTrackId?: number; // video track selected
    videoTrackBandwidth?: number; // video bandwidth currently playing
    audioTrackId?: number; // audio track selected
    audioTrackBandwidth?: number; // audio bandwidth currently playing

    videoPerSecond?: number; // frame video per second, fps
    audioPerSecond?: number; // sample audio per second

    // following parameters are counters
    skippedVideoCount?: number; // frame video skipped
    skippedAudioCount?: number; // sample audio skipped

    lostPacketCount?: number; // network packets lost
    nackCount?: number; // current estimated Negative Acknowledgement count

    stallCount?: number;

    /**
     * Converts the current {@link PlayerStats} snapshot into a CMCD (Common Media Client Data) payload.
     * @param url - The full URL of the media object.
     * @param trackId - The track ID for which to generate the CMCD payload.
     * @param prevStats - Optional previous {@link PlayerStats} snapshot to calculate deltas for incremental metrics since their last reset.
     * @param sessionID - Optional session ID to include in the CMCD payload.
     * @returns A {@link CML.Cmcd} object representing the CMCD payload.
     */
    toCmcd(url: URL, trackId: number, prevStats?: PlayerStats, sessionID?: string, short = false): CML.Cmcd {
        // br is computed to be only for video, or only audio track, or sum of both depending of if trackId matches either audio or video track IDs
        let br: number;
        if (trackId === this.videoTrackId) {
            br = this.videoTrackBandwidth ?? 0;
        } else if (trackId === this.audioTrackId) {
            br = this.audioTrackBandwidth ?? 0;
        } else {
            br = (this.audioTrackBandwidth ?? 0) + (this.videoTrackBandwidth ?? 0);
        }

        // sf defaults to other ("o") if protocol is not in the map, otherwise undefined if protocol is undefined
        const sfByProtocol = {
            dash: 'd',
            hls: 'h',
            smooth: 's'
        };
        const proto = this.protocol?.toLowerCase();
        const sf = proto ? sfByProtocol[proto as keyof typeof sfByProtocol] ?? 'o' : undefined;

        let ot: CML.CmcdObjectType;
        if (trackId === this.audioTrackId) {
            ot = CML.CmcdObjectType.AUDIO;
        } else if (trackId === this.videoTrackId) {
            ot = CML.CmcdObjectType.VIDEO;
        } else {
            ot = CML.CmcdObjectType.OTHER;
        }

        const playBack = this.playbackRate ?? this.playbackSpeed;
        const pr = playBack ? Number(playBack.toFixed(2)) : undefined;
        const cmcd: CML.Cmcd = {
            ...(!short
                ? {
                      v: 1, // CMCD Version
                      ot: ot, // Object Type
                      st: CML.CmcdStreamType.LIVE, // Stream Type
                      cid: url.pathname.split('/').pop(), // Content ID
                      ...(this.bufferAmount !== undefined && playBack !== undefined
                          ? { dl: this.bufferAmount * playBack }
                          : {}) // Deadline
                  }
                : {}),
            br: br, // Encoded Bitrate
            ...(this.stallCount !== undefined ? { bs: this.stallCount - (prevStats?.stallCount ?? 0) > 0 } : {}), // Buffer Starvation
            ...(this.bufferAmount !== undefined ? { bl: this.bufferAmount } : {}), // Buffer Length
            ...(this.recvByteRate !== undefined ? { mtp: this.recvByteRate } : {}), // Measured mtp CMCD throughput
            ...(pr !== undefined ? { pr: pr } : {}), // Playback Rate
            ...(sf !== undefined ? { sf: sf as CML.CmcdStreamingFormat } : {}), // Streaming Format
            ...(this.waitingData !== undefined ? { su: this.waitingData } : {}), // Startup
            ...(sessionID !== undefined ? { sid: sessionID } : {}) // Session ID
        };
        return cmcd;
    }
}
