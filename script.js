let socket;
let mediaRecorder;
let username;
let channel;
let userId = 'user-' + Math.random().toString(36).substring(2, 9);

// Replace this with your deployed backend WebSocket URL
const SERVER_URL = 'wss://your-backend.onrender.com';

function joinChannel() {
  username = document.getElementById('username').value;
  channel = document.getElementById('channel').value;

  if (!username || !channel) {
    alert('Enter your name and channel');
    return;
  }

  socket = new WebSocket(SERVER_URL);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', channel, username, userId }));
    document.getElementById('currentChannel').innerText = `Connected to #${channel}`;
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'audio' && data.userId !== userId) {
      const audio = new Audio(data.audio);
      audio.play();
    }

    if (data.type === 'userList') {
      const ul = document.getElementById('userList');
      ul.innerHTML = '';
      data.users.forEach(user => {
        const li = document.createElement('li');
        li.innerText = user.username;
        ul.appendChild(li);
      });
    }
  };

  socket.onclose = () => {
    console.log('Disconnected');
  };
}

function leaveChannel() {
  if (socket) {
    socket.send(JSON.stringify({ type: 'leave', channel, userId }));
    socket.close();
    document.getElementById('userList').innerHTML = '';
    document.getElementById('currentChannel').innerText = '';
  }
}

function startTalking() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1];
        socket.send(JSON.stringify({
          type: 'audio',
          audio: `data:audio/webm;base64,${base64Audio}`,
          channel,
          userId
        }));
      };
      reader.readAsDataURL(e.data);
    };
    mediaRecorder.start(500);
  });
}

function stopTalking() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}
