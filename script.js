let ws;
let channel = '';
let mediaRecorder;

function log(msg) {
  const logDiv = document.getElementById('log');
  logDiv.innerHTML += `<div>${msg}</div>`;
}

function joinChannel() {
  channel = document.getElementById('channel').value.trim();
  if (!channel) return alert('Enter a channel name.');

  ws = new WebSocket('wss://walkie-talkie-server-9yu3.onrender.com');
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', channel }));
    log(`✅ Joined channel: ${channel}`);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'audio') {
      const audio = new Audio(URL.createObjectURL(new Blob([new Uint8Array(data.blob)])));
      audio.play();
    }
  };

  ws.onclose = () => log('❌ Disconnected');
  ws.onerror = () => log('⚠️ Connection error');
}

async function startSending() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Join a channel first.');
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
      e.data.arrayBuffer().then(buf => {
        ws.send(JSON.stringify({
          type: 'audio',
          channel,
          blob: Array.from(new Uint8Array(buf))
        }));
      });
    }
  };

  mediaRecorder.start(250); // record in chunks
  document.getElementById('startBtn').innerText = '🛑 Stop';
  document.getElementById('startBtn').onclick = stopSending;
}

function stopSending() {
  mediaRecorder.stop();
  document.getElementById('startBtn').innerText = '🎙️ Hold to Talk';
  document.getElementById('startBtn').onclick = startSending;
}
