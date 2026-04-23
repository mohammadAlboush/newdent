const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// In-memory state
let currentPatient = null;
let currentRoom = null;
let patientQueue = [];
let clearTimer = null;

const AUTO_CLEAR_MS = 60000; // 1 Minute

function startClearTimer() {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    currentPatient = null;
    currentRoom = null;
    io.emit('patient:clear');
    io.emit('queue:update', { currentPatient, currentRoom, patientQueue });
    console.log('Anzeige automatisch geleert (1 Min.)');
  }, AUTO_CLEAR_MS);
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/rezeption', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rezeption.html'));
});

app.get('/wartezimmer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wartezimmer.html'));
});

app.get('/', (req, res) => {
  res.redirect('/rezeption');
});

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Client verbunden: ${socket.id}`);

  // Send current state to newly connected client
  socket.emit('queue:update', { currentPatient, currentRoom, patientQueue });

  socket.on('patient:call', ({ name, room }) => {
    if (!name || !name.trim()) return;
    name = name.trim();
    room = room || null;
    currentPatient = name;
    currentRoom = room;
    if (!patientQueue.includes(name)) {
      patientQueue.push(name);
    }
    io.emit('patient:display', { name, room });
    io.emit('queue:update', { currentPatient, currentRoom, patientQueue });
    startClearTimer();
    console.log(`Patient aufgerufen: ${name}${room ? ' → Zimmer ' + room : ''}`);
  });

  socket.on('patient:recall', ({ name, room }) => {
    if (!name || !name.trim()) return;
    name = name.trim();
    room = room || currentRoom;
    currentPatient = name;
    currentRoom = room;
    io.emit('patient:display', { name, room });
    io.emit('queue:update', { currentPatient, currentRoom, patientQueue });
    startClearTimer();
    console.log(`Patient erneut aufgerufen: ${name}${room ? ' → Zimmer ' + room : ''}`);
  });

  socket.on('patient:remove', (name) => {
    if (!name || !name.trim()) return;
    name = name.trim();
    patientQueue = patientQueue.filter(p => p !== name);
    if (currentPatient === name) {
      currentPatient = null;
      currentRoom = null;
      if (clearTimer) clearTimeout(clearTimer);
      io.emit('patient:clear');
    }
    io.emit('queue:update', { currentPatient, currentRoom, patientQueue });
    console.log(`Patient entfernt: ${name}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client getrennt: ${socket.id}`);
  });
});

// Get LAN IP address
function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const lanIP = getLanIP();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       NEW DENT Wartezimmer-Aufrufsystem          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Rezeption:    http://${lanIP}:${PORT}/rezeption`);
  console.log(`║  Wartezimmer:  http://${lanIP}:${PORT}/wartezimmer`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

// Error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nFEHLER: Port ${PORT} ist bereits belegt!`);
    console.error(`Bitte anderen Port verwenden: set PORT=3001 && node server.js\n`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer wird heruntergefahren...');
  io.close();
  server.close(() => {
    console.log('Server beendet.');
    process.exit(0);
  });
});
