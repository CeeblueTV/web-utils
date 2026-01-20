/**
 * Copyright 2024 Ceeblue B.V.
 * This file is part of https://github.com/CeeblueTV/web-utils which is released under GNU Affero General Public License.
 * See file LICENSE or go to https://spdx.org/licenses/AGPL-3.0-or-later.html for full license details.
 */
import { Cmcd, CmcdStreamingFormat } from '@svta/common-media-library';
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
     * Converts players stats to Cmcd format
     */
    toCmcd(trackId: number, prevStats?: PlayerStats): Cmcd {
        const sfByProtocol = {
            dash: 'd',
            hls: 'h',
            smooth: 's'
        };

        const sf = this.protocol?.toLowerCase()
            ? sfByProtocol[this.protocol?.toLowerCase() as keyof typeof sfByProtocol]
            : undefined;

        const cmcd: Cmcd = {
            bl: this.bufferAmount,
            bs: (this.stallCount ?? 0) - (prevStats?.stallCount ?? 0) > 0,
            br: (this.audioTrackBandwidth ?? 0) + (this.videoTrackBandwidth ?? 0),
            mtp: this.recvByteRate,
            pr: this.playbackRate ?? this.playbackSpeed,
            sf: sf as CmcdStreamingFormat | undefined,
            su: this.waitingData
        };
        if (trackId === this.videoTrackId) {
            cmcd.br = this.videoTrackBandwidth ?? 0;
        } else if (trackId === this.audioTrackId) {
            cmcd.br = this.audioTrackBandwidth ?? 0;
        }
        return cmcd;
    }
}
