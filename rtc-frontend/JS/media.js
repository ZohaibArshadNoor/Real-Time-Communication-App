// media.js
// Smart media permission handling (safe + future proof)

let localStream = null;
let isMuted = false;

async function startLocalMedia() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const hasMic = devices.some((d) => d.kind === "audioinput");
    const hasCamera = devices.some((d) => d.kind === "videoinput");

    if (!hasMic) {
      alert("No microphone found on this system");
      return;
    }

    const constraints = {
      audio: true,
      video: hasCamera,
    };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    // ---- SAFE STATUS UPDATE ----
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.innerText = hasCamera
        ? "Microphone and camera active"
        : "Microphone active (no camera detected)";
    }

    // ---- SAFE VIDEO ATTACH ----
    if (hasCamera) {
      const videoElement = document.getElementById("localVideo");
      if (videoElement) {
        videoElement.srcObject = localStream;
        videoElement.muted = true; // avoid echo
        videoElement.play();
      }
    }

    console.log("Media stream started with constraints:", constraints);
  } catch (error) {
    console.error("Media error:", error);
    alert("Media error: " + error.message);
  }
}

function toggleMute() {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) return;

  audioTracks[0].enabled = isMuted;
  isMuted = !isMuted;

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.innerText = isMuted ? "Unmute" : "Mute";
  }

  console.log("Mic muted:", isMuted);
}

function leaveCall() {
  console.log("Leaving call");

  // 1. Close peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  // 2. STOP ALL MEDIA ALWAYS
  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
    });
    localStream = null;
  }

  // 3. Notify server (if connected)
  if (socket && socket.connected) {
    socket.emit("leave-room", ROOM_ID);
  }

  // 4. Reset state
  callState = "idle";
  updateUIState();

  console.log("Media stopped, state idle");
}
