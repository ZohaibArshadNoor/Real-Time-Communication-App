// app.js
// One to one WebRTC audio call using Socket.io signaling

let callState = "idle";
// idle | joining | in-call

const socket = io("http://localhost:5000");
const ROOM_ID = "test-room";

let peerConnection = null;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Start media first, then join room
// window.addEventListener("load", async () => {
//   if (callState !== "idle") return;

//   callState = "joining";
//   await startLocalMedia();
//   socket.emit("join-room", ROOM_ID);
// });

// When second user joins, first user creates offer
socket.on("user-joined", async () => {
  createPeerConnection();

  callState = "in-call";
  console.log("State:", callState);
updateUIState();


  // Add local audio tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("webrtc-offer", {
    roomId: ROOM_ID,
    offer,
  });
});

// When offer is received, second user answers
socket.on("webrtc-offer", async (offer) => {
  createPeerConnection();

  callState = "in-call";
  console.log("State:", callState);
updateUIState();


  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("webrtc-answer", {
    roomId: ROOM_ID,
    answer,
  });
});

// Handle remote user leaving
socket.on("user-left", (socketId) => {
  console.log("Remote user left:", socketId);
  handleRemoteLeave();
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
        candidate: event.candidate,
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

function handleRemoteLeave() {
  console.log("Remote user left");

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  callState = "idle";
  console.log("State:", callState);
updateUIState();


  document.querySelectorAll("audio, video").forEach((el) => {
    el.srcObject = null;
    el.remove();
  });

  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.innerText = "Waiting for another user...";
  }
}

async function startCall() {
  if (callState !== "idle") {
    console.log("Call already active or joining");
    return;
  }

  callState = "joining";
  console.log("Starting call");
updateUIState();

  await startLocalMedia();
  socket.emit("join-room", ROOM_ID);
}

document.getElementById("joinBtn").onclick = startCall;
document.getElementById("leaveBtn").onclick = leaveCall;

function updateUIState() {
  const status = document.getElementById("callStatus");

  if (!status) return;

  if (callState === "idle") {
    status.innerText = "Idle. Click Join to start.";
  } else if (callState === "joining") {
    status.innerText = "Waiting for another user...";
  } else if (callState === "in-call") {
    status.innerText = "In call";
  }
}

updateUIState();