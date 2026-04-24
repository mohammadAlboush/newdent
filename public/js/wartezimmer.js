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
  const audioStatus = document.getElementById('audioStatus');
  const gongAudio = document.getElementById('gongAudio');

  let audioCtx = null;
  let isActivated = false;
  let clearTimer = null;

  function formatRoom(room) {
    return /^\d+$/.test(String(room)) ? `Zimmer ${room}` : String(room);
  }

  function markAudioReady(ready) {
    if (ready) {
      audioStatus.classList.add('ready');
      audioStatus.querySelector('.audio-status-icon').textContent = '🔊';
      audioStatus.querySelector('.audio-status-text').textContent = 'Ton aktiv';
      audioStatus.title = 'Ton aktiv';
    } else {
      audioStatus.classList.remove('ready');
      audioStatus.querySelector('.audio-status-icon').textContent = '🔇';
      audioStatus.querySelector('.audio-status-text').textContent = 'Ton inaktiv – Seite anklicken';
      audioStatus.title = 'Ton inaktiv – Seite einmal anklicken';
    }
  }

  function activate() {
    if (isActivated) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Silent unlock for iOS/Safari/TV browsers
      const unlock = audioCtx.createBufferSource();
      unlock.buffer = audioCtx.createBuffer(1, 1, 22050);
      unlock.connect(audioCtx.destination);
      unlock.start(0);
    } catch (e) {
      console.warn('WebAudio nicht verfügbar:', e);
    }

    // Unlock HTML5 audio by priming a silent play()
    if (gongAudio) {
      const originalVolume = gongAudio.volume;
      gongAudio.volume = 0;
      gongAudio.play().then(() => {
        gongAudio.pause();
        gongAudio.currentTime = 0;
        gongAudio.volume = originalVolume;
      }).catch(() => {
        gongAudio.volume = originalVolume;
      });
    }

    overlay.classList.add('hidden');
    isActivated = true;
    markAudioReady(true);

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // Activate on overlay click OR any interaction anywhere on the page
  overlay.addEventListener('click', activate);
  document.addEventListener('click', activate, { capture: true });
  document.addEventListener('touchstart', activate, { capture: true, passive: true });
  document.addEventListener('keydown', activate, { capture: true });

  // Keep audio context alive — browsers may suspend after inactivity
  function wakeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', wakeAudio);
  window.addEventListener('focus', wakeAudio);
  setInterval(wakeAudio, 20000);

  function playViaWebAudio() {
    if (!audioCtx || audioCtx.state !== 'running') return false;
    try {
      for (let i = 0; i < 3; i++) {
        const offset = i * 1.0;
        const now = audioCtx.currentTime + offset;
        playTone(523.25, now, 0.3);
        playTone(659.25, now + 0.3, 0.3);
      }
      return true;
    } catch (e) {
      console.warn('WebAudio-Playback fehlgeschlagen:', e);
      return false;
    }
  }

  function playViaHtmlAudio() {
    if (!gongAudio) return false;
    try {
      gongAudio.currentTime = 0;
      gongAudio.volume = 1.0;
      const p = gongAudio.play();
      if (p && p.catch) p.catch(err => console.warn('HTML-Audio-Playback verweigert:', err));
      return true;
    } catch (e) {
      console.warn('HTML-Audio-Playback fehlgeschlagen:', e);
      return false;
    }
  }

  function playTripleChime() {
    if (!isActivated) return;

    const attempt = () => {
      if (playViaWebAudio()) return;
      playViaHtmlAudio();
    };

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(attempt).catch(attempt);
    } else {
      attempt();
    }
  }

  function playTone(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.7, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  socket.on('patient:display', ({ name, room }) => {
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
      patientLabel.textContent = 'Bitte ins Behandlungszimmer kommen:';
      patientRoom.textContent = formatRoom(room);
      patientRoom.style.display = '';
    } else {
      patientLabel.textContent = 'Bitte ins Behandlungszimmer kommen:';
      patientRoom.textContent = '';
      patientRoom.style.display = 'none';
    }

    void patientDisplay.offsetWidth;
    patientDisplay.classList.add('active');

    playTripleChime();

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

  socket.on('patient:clear', () => {
    clearDisplay();
  });

  socket.on('queue:update', ({ currentPatient, currentRoom }) => {
    if (currentPatient) {
      idleDisplay.classList.add('hidden');
      patientDisplay.classList.remove('fade-out');
      patientDisplay.classList.add('active');
      patientName.textContent = currentPatient;
      if (currentRoom) {
        patientLabel.textContent = 'Bitte ins Behandlungszimmer kommen:';
        patientRoom.textContent = formatRoom(currentRoom);
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
    clockEl.textContent = `${date} — ${time} Uhr`;
  }

  updateClock();
  setInterval(updateClock, 10000);
})();
