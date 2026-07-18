import axios from "axios";

// Proxy endpoint base (assumed to be running on port 3001)
const SIGNAL_URL = `http://${window.location.hostname}:3001/api/webrtc`;

export class WebRTCBridge {
  constructor(role = "host", onStream = null, onMessage = null) {
    this.role = role; // "host" (laptop) or "client" (phone)
    this.onStream = onStream;
    this.onMessage = onMessage;
    this.pc = null;
    this.dataChannel = null;
    this.canvasStream = null;
    this.pollInterval = null;

    this.init();
  }

  async init() {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };
    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      // Simple local WebRTC doesn't strictly need ICE candidate trickle
    };

    if (this.role === "host") {
      // Host creates the data channel for Gyro input
      this.dataChannel = this.pc.createDataChannel("gyro");
      this.setupDataChannel(this.dataChannel);

      // Add Canvas stream once ready
      const canvas = document.querySelector("canvas");
      if (canvas) {
        try {
          this.canvasStream = canvas.captureStream(30); // 30 FPS stream
          this.canvasStream.getTracks().forEach((track) => {
            this.pc.addTrack(track, this.canvasStream);
          });
          console.log("[webrtc] Staged canvas video stream");
        } catch (e) {
          console.warn("[webrtc] Canvas stream capture failed: ", e);
        }
      }

      // Start Host Offer signaling
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await axios.post(`${SIGNAL_URL}/signal`, { role: "host", signal: offer });
      console.log("[webrtc] Sent host offer");

      // Poll for client answer
      this.pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`${SIGNAL_URL}/signal/client`);
          if (res.data.signal) {
            clearInterval(this.pollInterval);
            await this.pc.setRemoteDescription(new RTCSessionDescription(res.data.signal));
            console.log("[webrtc] Connected to phone client!");
          }
        } catch (err) {
          // Silent catch of poll errors when client hasn't loaded yet
        }
      }, 1000);

    } else {
      // Client (Phone) listens for the data channel
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };

      // Listen for incoming canvas streams
      this.pc.ontrack = (event) => {
        console.log("[webrtc] Received host video track");
        if (this.onStream) this.onStream(event.streams[0]);
      };

      // Poll for host offer
      this.pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`${SIGNAL_URL}/signal/host`);
          if (res.data.signal) {
            clearInterval(this.pollInterval);
            await this.pc.setRemoteDescription(new RTCSessionDescription(res.data.signal));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await axios.post(`${SIGNAL_URL}/signal`, { role: "client", signal: answer });
            console.log("[webrtc] Sent client answer");
          }
        } catch (err) {
          // Silent catch of poll errors when host hasn't loaded yet
        }
      }, 1000);
    }
  }

  setupDataChannel(channel) {
    channel.onopen = () => console.log("[webrtc] Data channel open");
    channel.onclose = () => console.log("[webrtc] Data channel closed");
    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this.onMessage) this.onMessage(msg);
      } catch (e) {
        console.warn(e);
      }
    };
  }

  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.pc) this.pc.close();
    console.log("[webrtc] Closed PeerConnection");
  }
}
