// --- CONFIGURATION ---
const SERVER_URL = "https://walkie-talkie-server-9yu3.onrender.com";
const CHANNELS = ["General", "Project Alpha", "Emergency", "Music Room"];
const STORAGE_KEY = 'walkie_talkie_channels'; // NEW: Key for localStorage

// --- DOM ELEMENTS ---
const statusTextElement = document.getElementById('status-text');
const statusLightElement = document.getElementById('status-light');
const channelsListElement = document.getElementById('channels-list');

// --- STATE ---
const socket = io(SERVER_URL);
let mediaRecorder;
let audioChunks = [];

// --- INITIALIZATION ---
function initialize() {
    populateChannels();
    setupSocketListeners();
    initializeMediaRecorder();
}

// MODIFIED: This function now restores the saved state
function populateChannels() {
    const savedChannels = getSavedChannels(); // NEW: Get saved state
    CHANNELS.forEach(channel => {
        const isChecked = savedChannels.includes(channel); // NEW: Check if this channel was saved
        const item = document.createElement('li');
        item.className = 'channel-item';
        if (isChecked) {
            item.classList.add('active'); // NEW: Set active class if saved
        }
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
// MODIFIED: This function now joins the saved channels on connect
function setupSocketListeners() {
    socket.on('connect', () => {
        statusTextElement.textContent = 'Connected';
        statusLightElement.className = 'status-light connected';
        // NEW: Join previously saved channels upon connecting
        const savedChannels = getSavedChannels();
        savedChannels.forEach(channel => {
            socket.emit('join-channel', channel);
        });
    });

    socket.on('disconnect', () => {
        statusTextElement.textContent = 'Disconnected';
        statusLightElement.className = 'status-light disconnected';
    });

    socket.on('audio-message-from-server', (channel, audioChunk) => {
        const audioBlob = new Blob([audioChunk]);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        
        const channelItem = document.getElementById(`channel-${channel}`);
        channelItem.classList.add('receiving');
        statusLightElement.classList.add('receiving');
        
        audio.onended = () => {
            channelItem.classList.remove('receiving');
            statusLightElement.classList.remove('receiving');
        };
    });
}

// --- MEDIA RECORDER LOGIC (No changes here) ---
async function initializeMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    } catch (error) {
        console.error("Error accessing microphone:", error);
        statusTextElement.textContent = 'Microphone access denied.';
    }
}

// --- EVENT LISTENERS (No changes here) ---
function setupActionListeners() {
    channelsListElement.addEventListener('change', (event) => {
        if (event.target.classList.contains('channel-toggle')) {
            handleChannelToggle(event.target);
        }
    });
    // ... all other listeners remain the same
    channelsListElement.addEventListener('mousedown', (event) => {
        const button = event.target.closest('.talk-button');
        if (button) startRecording(button);
    });
    channelsListElement.addEventListener('mouseup', (event) => {
        const button = event.target.closest('.talk-button');
        if (button) stopRecording(button);
    });
    channelsListElement.addEventListener('touchstart', (e) => {
         const button = e.target.closest('.talk-button');
         if(button) { e.preventDefault(); startRecording(button); }
    });
    channelsListElement.addEventListener('touchend', (e) => {
        const button = e.target.closest('.talk-button');
        if(button) stopRecording(button);
    });
}

// MODIFIED: This function now saves the state to localStorage
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
    }
    saveActiveChannels(); // NEW: Save the state whenever a toggle changes
}

// --- RECORDING FUNCTIONS (No changes here) ---
function startRecording(button) {
    if (!mediaRecorder || button.disabled) return;
    const channel = button.dataset.channel;
    mediaRecorder.onstop = () => { 
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        socket.emit('audio-message', channel, audioBlob);
        audioChunks = [];
    };
    mediaRecorder.start();
    button.classList.add('recording');
    button.querySelector('i').className = 'fa-solid fa-record-vinyl';
}
function stopRecording(button) {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.stop();
    button.classList.remove('recording');
    button.querySelector('i').className = 'fa-solid fa-microphone';
}


// --- NEW HELPER FUNCTIONS FOR LOCAL STORAGE ---
function saveActiveChannels() {
    const activeChannels = [];
    const toggles = document.querySelectorAll('.channel-toggle:checked');
    toggles.forEach(toggle => {
        activeChannels.push(toggle.dataset.channel);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeChannels));
}

function getSavedChannels() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

// --- START THE APP ---
initialize();
