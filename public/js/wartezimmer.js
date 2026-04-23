(() => {
  const displaySecret = window.location.pathname.split('/').filter(Boolean).pop();
  const socket = io({ auth: { displaySecret } });

  const overlay = document.getElementById('overlay');
  const idleDisplay = document.getElementById('idleDisplay');
  const patientDisplay = document.getElementById('patientDisplay');
  const patientName = document.getElementById('patientName');
  const patientLabel = document.getElementById('patientLabel');
  const patientRoom = document.getElementById('patientRoom');
  const clockEl = document.getElementById('clock');

  let audioCtx = null;
  let isActivated = false;
  let clearTimer = null;

  // Activation overlay — required for audio autoplay policy
  overlay.addEventListener('click', () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    overlay.classList.add('hidden');
    isActivated = true;

    // Try fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  // Triple chime: plays the two-tone gong 3 times with pauses
  function playTripleChime() {
    if (!audioCtx) return;

    for (let i = 0; i < 3; i++) {
      const offset = i * 1.0; // 1 second between each gong
      const now = audioCtx.currentTime + offset;
      playTone(523.25, now, 0.3);       // C5
      playTone(659.25, now + 0.3, 0.3); // E5
    }
  }

  function playTone(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Display patient name
  socket.on('patient:display', ({ name, room }) => {
    // Fade out current if visible
    if (patientDisplay.classList.contains('active')) {
      patientDisplay.classList.add('fade-out');
      setTimeout(() => showPatient(name, room), 300);
    } else {
      showPatient(name, room);
    }
  });

  function showPatient(name, room) {
    idleDisplay.classList.add('hidden');
    patientDisplay.classList.remove('active', 'fade-out');

    patientName.textContent = name;

    if (room) {
      patientLabel.textContent = 'Bitte in Behandlungszimmer kommen:';
      patientRoom.textContent = `Zimmer ${room}`;
      patientRoom.style.display = '';
    } else {
      patientLabel.textContent = 'Bitte ins Behandlungszimmer kommen:';
      patientRoom.textContent = '';
      patientRoom.style.display = 'none';
    }

    // Force reflow for animation restart
    void patientDisplay.offsetWidth;
    patientDisplay.classList.add('active');

    playTripleChime();

    // Auto-clear after 1 minute (client-side visual backup)
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      clearDisplay();
    }, 60000);
  }

  function clearDisplay() {
    if (clearTimer) clearTimeout(clearTimer);
    patientDisplay.classList.add('fade-out');
    setTimeout(() => {
      patientDisplay.classList.remove('active', 'fade-out');
      patientName.textContent = '';
      idleDisplay.classList.remove('hidden');
    }, 300);
  }

  // Clear display
  socket.on('patient:clear', () => {
    clearDisplay();
  });

  // Sync state on connect/reconnect
  socket.on('queue:update', ({ currentPatient, currentRoom }) => {
    if (currentPatient) {
      idleDisplay.classList.add('hidden');
      patientDisplay.classList.remove('fade-out');
      patientDisplay.classList.add('active');
      patientName.textContent = currentPatient;
      if (currentRoom) {
        patientLabel.textContent = 'Bitte in Behandlungszimmer kommen:';
        patientRoom.textContent = `Zimmer ${currentRoom}`;
        patientRoom.style.display = '';
      } else {
        patientLabel.textContent = 'Bitte ins Behandlungszimmer kommen:';
        patientRoom.textContent = '';
        patientRoom.style.display = 'none';
      }
    } else if (!patientDisplay.classList.contains('active') || patientName.textContent === '') {
      patientDisplay.classList.remove('active', 'fade-out');
      idleDisplay.classList.remove('hidden');
    }
  });

  // Live clock
  function updateClock() {
    const now = new Date();
    const date = now.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const time = now.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    clockEl.textContent = `${date} \u2014 ${time} Uhr`;
  }

  updateClock();
  setInterval(updateClock, 10000);
})();
