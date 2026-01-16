// media.js
// Smart media permission handling

let localStream = null;

async function startLocalMedia() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const hasMic = devices.some(d => d.kind === "audioinput");
    const hasCamera = devices.some(d => d.kind === "videoinput");

    if (!hasMic) {
      alert("No microphone found on this system");
      return;
    }

    // Build constraints dynamically
    const constraints = {
      audio: true,
      video: hasCamera
    };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    const status = document.getElementById("status");

    if (hasCamera) {
      const videoElement = document.getElementById("localVideo");
      videoElement.srcObject = localStream;
      status.innerText = "Microphone and camera active";
    } else {
      // status.innerText = "Microphone active (no camera detected)";
    }

    console.log("Media stream started", constraints);

  } catch (error) {
    console.error("Media error:", error);
    alert("Media error: " + error.message);
}

}


let isMuted = false;

function toggleMute() {
    if (!localStream) {
        console.log("No local stream yet");
        return;
    }

    const audioTracks = localStream.getAudioTracks();

    if (audioTracks.length === 0) {
        console.log("No audio track found");
        return;
    }

    audioTracks[0].enabled = isMuted;
    isMuted = !isMuted;

    document.getElementById("muteBtn").innerText = isMuted ? "Unmute" : "Mute";

    console.log("Mic muted:", isMuted);
}


function leaveCall() {
    console.log("Leaving call...");

    // 1. Close WebRTC connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // 2. Stop all local media tracks (release mic)
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // 3. Disconnect socket
    if (socket && socket.connected) {
        socket.disconnect();
    }

    // Optional UI feedback
    alert("You left the call");
}
