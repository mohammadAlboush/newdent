(() => {
  const socket = io();

  const patientInput = document.getElementById('patientInput');
  const roomSelect = document.getElementById('roomSelect');
  const callBtn = document.getElementById('callBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const currentPatientEl = document.getElementById('currentPatient');
  const currentPatientName = document.getElementById('currentPatientName');
  const queueList = document.getElementById('queueList');

  // Connection status
  socket.on('connect', () => {
    statusDot.classList.add('connected');
    statusText.textContent = 'Verbunden';
  });

  socket.on('disconnect', () => {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Wartezimmer nicht verbunden';
  });

  // Call patient
  function callPatient() {
    const name = patientInput.value.trim();
    if (!name) return;
    const room = roomSelect.value || null;
    socket.emit('patient:call', { name, room });
    patientInput.value = '';
    patientInput.focus();
  }

  callBtn.addEventListener('click', callPatient);
  patientInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') callPatient();
  });

  // Queue update
  socket.on('queue:update', ({ currentPatient, patientQueue }) => {
    // Current patient display
    if (currentPatient) {
      currentPatientEl.style.display = 'block';
      currentPatientName.textContent = currentPatient;
    } else {
      currentPatientEl.style.display = 'none';
    }

    // Queue list
    if (patientQueue.length === 0) {
      queueList.innerHTML = '<li class="empty-queue">Keine Patienten in der Warteschlange</li>';
      return;
    }

    queueList.innerHTML = patientQueue.map(name => `
      <li class="queue-item">
        <span class="queue-item-name">${escapeHtml(name)}</span>
        <div class="queue-item-actions">
          <button class="btn-recall" data-name="${escapeAttr(name)}">Erneut aufrufen</button>
          <button class="btn-remove" data-name="${escapeAttr(name)}">Entfernen</button>
        </div>
      </li>
    `).join('');
  });

  // Delegate button clicks
  queueList.addEventListener('click', (e) => {
    const btn = e.target;
    const name = btn.dataset.name;
    if (!name) return;

    if (btn.classList.contains('btn-recall')) {
      const room = roomSelect.value || null;
      socket.emit('patient:recall', { name, room });
    } else if (btn.classList.contains('btn-remove')) {
      socket.emit('patient:remove', name);
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
