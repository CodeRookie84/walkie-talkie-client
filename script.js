// This is your live Render server URL
const SERVER_URL = "https://walkie-talkie-server-9yu3.onrender.com";

// Get the HTML elements we want to update
const statusElement = document.getElementById('status');
const serverMessageElement = document.getElementById('server-message');

// Connect to the server
const socket = io(SERVER_URL);

// --- Listen for events from the server ---
socket.on('connect', () => {
    statusElement.textContent = 'Connected!';
    // Send a 'hello' message to the server once connected
    socket.emit('hello', 'Hi server, this is the client!');
});

socket.on('response', (data) => {
    // Received the response from our server
    serverMessageElement.textContent = data;
});

socket.on('disconnect', () => {
    statusElement.textContent = 'Disconnected';
});
