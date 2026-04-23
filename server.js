const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const REZEPTION_USER = process.env.REZEPTION_USER || 'rezeption';
const REZEPTION_PASSWORD = process.env.REZEPTION_PASSWORD || 'bitte-aendern';
const WARTEZIMMER_SECRET = process.env.WARTEZIMMER_SECRET || 'bitte-aendern';

if (REZEPTION_PASSWORD === 'bitte-aendern' || WARTEZIMMER_SECRET === 'bitte-aendern') {
  console.warn('\n⚠️  WARNUNG: Standard-Zugangsdaten aktiv!');
  console.warn('   Bitte REZEPTION_PASSWORD und WARTEZIMMER_SECRET als Umgebungsvariablen setzen.\n');
}

let currentPatient = null;
let currentRoom = null;
let patientQueue = [];
let clearTimer = null;

const AUTO_CLEAR_MS = 60000;

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

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

function isValidAdmin(creds) {
  return creds && creds.user === REZEPTION_USER && creds.pass === REZEPTION_PASSWORD;
}

function basicAuth(req, res, next) {
  const creds = parseBasicAuth(req.headers.authorization);
  if (isValidAdmin(creds)) return next();
  res.set('WWW-Authenticate', 'Basic realm="NEW DENT Rezeption"');
  res.status(401).send('Authentifizierung erforderlich');
}

// Block direct .html file access — HTML pages must go through protected routes
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) return res.status(404).send('Not found');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.status(200).send('NEW DENT Wartezimmer läuft.');
});

app.get('/rezeption', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rezeption.html'));
});

app.get('/wartezimmer/:secret', (req, res) => {
  if (req.params.secret !== WARTEZIMMER_SECRET) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'wartezimmer.html'));
});

// Socket.IO auth: admin (Basic Auth header) OR display (secret via auth payload)
io.use((socket, next) => {
  const creds = parseBasicAuth(socket.handshake.headers.authorization);
  if (isValidAdmin(creds)) {
    socket.isAdmin = true;
    return next();
  }
  const displaySecret = socket.handshake.auth && socket.handshake.auth.displaySecret;
  if (displaySecret === WARTEZIMMER_SECRET) {
    socket.isAdmin = false;
    return next();
  }
  next(new Error('Unauthorized'));
});

io.on('connection', (socket) => {
  console.log(`Client verbunden: ${socket.id} (${socket.isAdmin ? 'admin' : 'display'})`);

  socket.emit('queue:update', { currentPatient, currentRoom, patientQueue });

  socket.on('patient:call', ({ name, room }) => {
    if (!socket.isAdmin) return;
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
    if (!socket.isAdmin) return;
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
    if (!socket.isAdmin) return;
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

server.listen(PORT, '0.0.0.0', () => {
  const lanIP = getLanIP();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       NEW DENT Wartezimmer-Aufrufsystem          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Rezeption:    http://${lanIP}:${PORT}/rezeption`);
  console.log(`║  Wartezimmer:  http://${lanIP}:${PORT}/wartezimmer/${WARTEZIMMER_SECRET}`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nFEHLER: Port ${PORT} ist bereits belegt!`);
    console.error(`Bitte anderen Port verwenden: set PORT=3001 && node server.js\n`);
    process.exit(1);
  }
  throw err;
});

process.on('SIGINT', () => {
  console.log('\nServer wird heruntergefahren...');
  io.close();
  server.close(() => {
    console.log('Server beendet.');
    process.exit(0);
  });
});
