// Browser-only — do NOT import this file from server.ts or any file included
// by tsconfig.server.json.

export type OnIceCandidateCallback = (candidate: RTCIceCandidateInit) => void;
export type OnDataChannelCallback = (channel: RTCDataChannel) => void;
export type OnConnectionStateChangeCallback = (state: RTCPeerConnectionState) => void;

/**
 * A lightweight wrapper around RTCPeerConnection that handles:
 * - Offer / answer creation
 * - ICE candidate gathering and application
 * - DataChannel events
 * - Connection state monitoring
 */
export class PeerConnection {
  private pc: RTCPeerConnection;

  constructor(
    iceServers: RTCIceServer[],
    onIceCandidate: OnIceCandidateCallback,
    onDataChannel: OnDataChannelCallback,
    onConnectionStateChange: OnConnectionStateChangeCallback,
  ) {
    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate.toJSON());
      }
    };

    this.pc.ondatachannel = (event) => {
      onDataChannel(event.channel);
    };

    this.pc.onconnectionstatechange = () => {
      onConnectionStateChange(this.pc.connectionState);
    };
  }

  /**
   * Create an SDP offer (used by the initiating side — typically the PC).
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Accept an SDP offer and create an answer (used by the joining side — phone).
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Apply a remote SDP description (answer received by the PC side).
   */
  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  /**
   * Add a remote ICE candidate received via the signaling channel.
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Create a named DataChannel (called by the initiating side).
   */
  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
    return this.pc.createDataChannel(label, options);
  }

  /**
   * Close the peer connection and release resources.
   */
  close(): void {
    this.pc.close();
  }

  /** Expose the underlying RTCPeerConnection for advanced use. */
  get native(): RTCPeerConnection {
    return this.pc;
  }
}
