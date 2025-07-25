// walkie-talkie-client-main/script.js

// --- CONFIGURATION ---
const SERVER_URL = "https://walkie-talkie-server-9yu3.onrender.com";
const CHANNELS = ["General", "Project Alpha", "Emergency", "Music Room"];
const STORAGE_KEY = 'walkie_talkie_channels';

// --- DOM ELEMENTS & STATE ---
const statusTextElement = document.getElementById('status-text');
const statusLightElement = document.getElementById('status-light');
const channelsListElement = document.getElementById('channels-list');
const socket = io(SERVER_URL);
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let activeRecordingButton = null;

// --- INITIALIZATION ---
function initialize() {
    populateChannels();
    setupSocketListeners();
    initializeMediaRecorder();
}

function populateChannels() {
    const savedChannels = getSavedChannels();
    CHANNELS.forEach(channel => {
        const isChecked = savedChannels.includes(channel);
        const item = document.createElement('li');
        item.className = 'channel-item';
        if (isChecked) item.classList.add('active');
        item.id = `channel-${channel}`;
        item.innerHTML = `
            <span class="channel-name">${channel}</span>
            <label class="switch">
                <input type="checkbox" class="channel-toggle" data-channel="${channel}" ${isChecked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
            <button class="talk-button" data-channel="${channel}" ${!isChecked ? 'disabled' : ''}>
                <i class="fa-solid fa-microphone"></i>
            </button>
        `;
        channelsListElement.appendChild(item);
    });
    setupActionListeners();
}

// --- SOCKET.IO LISTENERS ---
function setupSocketListeners() {
    socket.on('connect', () => {
        statusTextElement.textContent = 'Connected';
        statusLightElement.className = 'status-light connected';
        getSavedChannels().forEach(channel => socket.emit('join-channel', channel));
    });

    socket.on('disconnect', (reason) => {
        statusTextElement.textContent = 'Disconnected';
        statusLightElement.className = 'status-light disconnected';
        if (isRecording) stopRecording(); 
    });

    socket.on('audio-message-from-server', (data) => {
        // **THE FIX:** Check senderId to prevent playing our own audio (echo)
        if (data.senderId === socket.id) {
            return; // This is our own message, so ignore it.
        }
        
        const audioBlob = new Blob([data.audioChunk]);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        const channelItem = document.getElementById(`channel-${data.channel}`);
        if (channelItem) { // Check if the element exists
            channelItem.classList.add('receiving');
            statusLightElement.classList.add('receiving');
            audio.onended = () => {
                channelItem.classList.remove('receiving');
                // Only remove receiving from status light if no other audio is playing
                if (!document.querySelector('.channel-item.receiving')) {
                    statusLightElement.classList.remove('receiving');
                }
            };
        }
    });
}


// --- MEDIA RECORDER LOGIC ---
async function initializeMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);

        mediaRecorder.onstop = () => {
            if (!activeRecordingButton) return;
            const channel = activeRecordingButton.dataset.channel;
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            socket.emit('audio-message', {
                channel: channel,
                audioChunk: audioBlob
            });

            audioChunks = [];
        };
    } catch (error) {
        console.error("Error accessing microphone:", error);
        statusTextElement.textContent = 'Microphone access denied.';
    }
}


// --- EVENT LISTENERS AND HELPERS ---
function setupActionListeners() {
    channelsListElement.addEventListener('change', e => {
        if (e.target.classList.contains('channel-toggle')) handleChannelToggle(e.target);
    });
    channelsListElement.addEventListener('mousedown', e => {
        const button = e.target.closest('.talk-button');
        if (button) startRecording(button);
    });
    channelsListElement.addEventListener('touchstart', e => {
         const button = e.target.closest('.talk-button');
         if(button) { e.preventDefault(); startRecording(button); }
    });
    window.addEventListener('mouseup', stopRecording);
    window.addEventListener('touchend', stopRecording);
}

function handleChannelToggle(toggle) {
    const channel = toggle.dataset.channel;
    const channelItem = toggle.closest('.channel-item');
    const talkButton = channelItem.querySelector('.talk-button');
    if (toggle.checked) {
        socket.emit('join-channel', channel);
        talkButton.disabled = false;
        channelItem.classList.add('active');
    } else {
        socket.emit('leave-channel', channel);
        talkButton.disabled = true;
        channelItem.classList.remove('active');
        if (isRecording && activeRecordingButton === talkButton) {
            stopRecording();
        }
    }
    saveActiveChannels();
}

function startRecording(button) {
    if (isRecording || !mediaRecorder || button.disabled) return;
    isRecording = true;
    activeRecordingButton = button;
    mediaRecorder.start();
    button.classList.add('recording');
    button.querySelector('i').className = 'fa-solid fa-record-vinyl';
}

function stopRecording() {
    if (!isRecording) return;
    if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
    if (activeRecordingButton) {
        activeRecordingButton.classList.remove('recording');
        activeRecordingButton.querySelector('i').className = 'fa-solid fa-microphone';
    }
    isRecording = false;
    activeRecordingButton = null;
}

function saveActiveChannels() {
    const activeChannels = Array.from(document.querySelectorAll('.channel-toggle:checked'))
                                .map(toggle => toggle.dataset.channel);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeChannels));
}

function getSavedChannels() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

initialize();```


