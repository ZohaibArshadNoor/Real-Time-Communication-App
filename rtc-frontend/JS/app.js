// app.js
// One to one WebRTC audio call using Socket.io signaling

const socket = io("http://localhost:5000");
const ROOM_ID = "test-room";

let peerConnection = null;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

// Start media first, then join room
window.addEventListener("load", async () => {
  await startLocalMedia();
  socket.emit("join-room", ROOM_ID);
});

// When second user joins, first user creates offer
socket.on("user-joined", async () => {
  createPeerConnection();

  // Add local audio tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("webrtc-offer", {
    roomId: ROOM_ID,
    offer
  });
});

// When offer is received, second user answers
socket.on("webrtc-offer", async (offer) => {
  createPeerConnection();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("webrtc-answer", {
    roomId: ROOM_ID,
    answer
  });
});

// First user receives answer
socket.on("webrtc-answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

// ICE candidates exchange
socket.on("webrtc-ice-candidate", async (candidate) => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(candidate);
  }
});

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc-ice-candidate", {
        roomId: ROOM_ID,
        candidate: event.candidate
      });
    }
  };

  // Receive remote audio
  peerConnection.ontrack = (event) => {
    const remoteAudio = document.createElement("audio");
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    document.body.appendChild(remoteAudio);
  };
}
