/* ============================================================
   DAD'S HEALTH TRACKER — app.js
   ============================================================ */

// ── Storage helpers ──────────────────────────────────────────
const STORAGE_KEY = 'dadsHealthLog';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveData(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ── State ─────────────────────────────────────────────────────
let entries = loadData();
let selectedMood = null;
let moodChart = null;

// ── DOM refs ──────────────────────────────────────────────────
const dadView       = document.getElementById('dadView');
const familyView    = document.getElementById('familyView');
const todayDateEl   = document.getElementById('todayDate');
const timeOfDayEl   = document.getElementById('timeOfDay');
const streakEl      = document.getElementById('streakCount');
const approvalList  = document.getElementById('approvalList');
const submitBtn     = document.getElementById('submitLog');
const submitMsg     = document.getElementById('submitMsg');
const calorieInput  = document.getElementById('calories');
const calorieBar    = document.getElementById('calorieBar');
const calorieLabel  = document.getElementById('calorieLabel');
const toast         = document.getElementById('toast');
const moodPicker    = document.getElementById('moodPicker');
const moodLabel     = document.getElementById('moodLabel');
const chartEmpty    = document.getElementById('chartEmpty');

// Stats
const statAvgCal    = document.getElementById('statAvgCal');
const statAvgWeight = document.getElementById('statAvgWeight');
const statApproved  = document.getElementById('statApproved');
const statPending   = document.getElementById('statPending');

// ── Init ──────────────────────────────────────────────────────
function init() {
  setDateHeader();
  setGreeting();
  setupMoodPicker();
  renderApprovals();
  updateStats();
  checkStreaks();
  renderChart();
}

// ── Date & Greeting ───────────────────────────────────────────
function setDateHeader() {
  const now = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  todayDateEl.textContent = now.toLocaleDateString('en-US', opts);
}

function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  timeOfDayEl.textContent = greet;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Streak ────────────────────────────────────────────────────
function checkStreaks() {
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);

  for (const e of sorted) {
    const d = new Date(e.date + 'T00:00:00');
    const diff = Math.round((cursor - d) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else break;
  }
  streakEl.textContent = streak;
}

// ── Calorie Bar ───────────────────────────────────────────────
const CALORIE_GOAL = 2000;

calorieInput.addEventListener('input', () => {
  const val = parseInt(calorieInput.value) || 0;
  const pct = Math.min((val / CALORIE_GOAL) * 100, 100);
  calorieBar.style.width = pct + '%';

  if (val === 0) {
    calorieBar.style.background = 'transparent';
    calorieLabel.textContent = '';
  } else if (val < 1400) {
    calorieBar.style.background = '#4a90d9';
    calorieLabel.textContent = `${val} kcal — Under goal`;
  } else if (val <= 2200) {
    calorieBar.style.background = '#4caf7d';
    calorieLabel.textContent = `${val} kcal — On track 🎯`;
  } else {
    calorieBar.style.background = '#e85454';
    calorieLabel.textContent = `${val} kcal — Over goal (${val - CALORIE_GOAL} extra)`;
  }
});

// ── Submit log ────────────────────────────────────────────────
submitBtn.addEventListener('click', () => {
  const weightMorning = parseFloat(document.getElementById('weightMorning').value);
  const weightNight   = parseFloat(document.getElementById('weightNight').value);
  const calories      = parseInt(document.getElementById('calories').value);
  const notes         = document.getElementById('notes').value.trim();

  if (!calories && !weightMorning && !weightNight) {
    showToast('⚠️ Please fill in at least one field!');
    return;
  }

  const today = todayKey();
  const existing = entries.findIndex(e => e.date === today);

  const entry = {
    date: today,
    weightMorning: weightMorning || null,
    weightNight:   weightNight   || null,
    calories:      calories      || null,
    mood:          selectedMood  || null,
    notes:         notes         || '',
    status:        'pending',
    submittedAt:   new Date().toISOString(),
  };

  if (existing >= 0) {
    entries[existing] = { ...entries[existing], ...entry, status: 'pending' };
    showToast('📝 Entry updated!');
  } else {
    entries.unshift(entry);
    showToast('✅ Entry logged! Family notified.');
  }

  saveData(entries);
  clearForm();
  renderApprovals();
  updateStats();
  checkStreaks();
  renderChart();
  submitMsg.textContent = '✅ Submitted! Waiting for family review...';
  setTimeout(() => submitMsg.textContent = '', 4000);
});

function clearForm() {
  document.getElementById('weightMorning').value = '';
  document.getElementById('weightNight').value   = '';
  document.getElementById('calories').value      = '';
  document.getElementById('notes').value         = '';
  calorieBar.style.width = '0%';
  calorieLabel.textContent = '';
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  moodLabel.textContent = 'Tap a face to log your mood';
}

// ── Mood Picker ───────────────────────────────────────────────
const moodNames = { 1: 'Terrible 😞', 2: 'Bad 😕', 3: 'Okay 😐', 4: 'Good 🙂', 5: 'Great 😄' };

function setupMoodPicker() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMood = parseInt(btn.dataset.mood);
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      moodLabel.textContent = `Feeling: ${moodNames[selectedMood]}`;
    });
  });
}

// ── Chart ─────────────────────────────────────────────────────
function renderChart() {
  const canvas = document.getElementById('moodChart');
  const withData = [...entries].reverse().filter(e => e.mood || e.calories).slice(-14);

  if (withData.length === 0) {
    canvas.style.display = 'none';
    chartEmpty.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  chartEmpty.style.display = 'none';

  const labels  = withData.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const calData  = withData.map(e => e.calories ? +(e.calories / 100).toFixed(1) : null);
  const moodData = withData.map(e => e.mood || null);

  if (moodChart) moodChart.destroy();

  moodChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories (÷100)',
          data: calData,
          borderColor: '#e8733a',
          backgroundColor: 'rgba(232,115,58,0.12)',
          pointBackgroundColor: '#e8733a',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          spanGaps: true,
        },
        {
          label: 'Mood (1–5)',
          data: moodData,
          borderColor: '#4caf7d',
          backgroundColor: 'rgba(76,175,125,0.12)',
          pointBackgroundColor: '#4caf7d',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          spanGaps: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' }
        }
      }
    }
  });
}

// ── Render Approvals (Family View) ────────────────────────────
function renderApprovals() {
  if (entries.length === 0) {
    approvalList.innerHTML = '<p class="empty-state">Nothing to review yet!</p>';
    return;
  }

  approvalList.innerHTML = entries.map((e, idx) => {
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const pills = [];
    if (e.calories)      pills.push(`🍽️ ${e.calories} kcal`);
    if (e.weightMorning) pills.push(`🌅 Morning: ${e.weightMorning} lbs`);
    if (e.weightNight)   pills.push(`🌙 Night: ${e.weightNight} lbs`);
    if (e.mood)          pills.push(`${['','😞','😕','😐','🙂','😄'][e.mood]} Mood: ${['','Terrible','Bad','Okay','Good','Great'][e.mood]}`);

    const statusChip = `<span class="status-chip ${e.status}">${e.status}</span>`;

    const actions = e.status === 'pending'
      ? `<div class="approval-actions">
           <button class="btn btn-approve" onclick="approveEntry(${idx})">✅ Approve</button>
           <button class="btn btn-reject"  onclick="rejectEntry(${idx})">❌ Reject</button>
         </div>`
      : `<div class="approval-actions">
           <button class="btn btn-ghost" style="font-size:0.78rem;padding:6px 12px" onclick="resetEntry(${idx})">↩ Reset</button>
         </div>`;

    return `
      <div class="approval-item ${e.status}">
        <div class="approval-header">
          <span class="approval-date">📅 ${dateStr}</span>
          ${statusChip}
        </div>
        <div class="approval-body">
          ${pills.map(p => `<span class="stat-pill">${p}</span>`).join('')}
          ${e.notes ? `<p class="notes-text">📝 "${e.notes}"</p>` : ''}
          ${actions}
        </div>
      </div>
    `;
  }).join('');
}

// ── Approve / Reject ──────────────────────────────────────────
function approveEntry(idx) {
  entries[idx].status = 'approved';
  entries[idx].reviewedAt = new Date().toISOString();
  saveData(entries);
  renderApprovals();
  updateStats();
  showToast('✅ Entry approved! Way to go, Dad!');
}

function rejectEntry(idx) {
  entries[idx].status = 'rejected';
  entries[idx].reviewedAt = new Date().toISOString();
  saveData(entries);
  renderApprovals();
  updateStats();
  showToast('❌ Entry flagged. Consider a chat with Dad.');
}

function resetEntry(idx) {
  entries[idx].status = 'pending';
  delete entries[idx].reviewedAt;
  saveData(entries);
  renderApprovals();
  updateStats();
  showToast('↩ Status reset to pending.');
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  const withCal    = entries.filter(e => e.calories);
  const withWeight = entries.filter(e => e.weightMorning);
  const approved   = entries.filter(e => e.status === 'approved').length;
  const pending    = entries.filter(e => e.status === 'pending').length;

  statAvgCal.textContent    = withCal.length
    ? Math.round(withCal.reduce((s,e) => s + e.calories, 0) / withCal.length)
    : '—';
  statAvgWeight.textContent = withWeight.length
    ? (withWeight.reduce((s,e) => s + e.weightMorning, 0) / withWeight.length).toFixed(1)
    : '—';
  statApproved.textContent  = approved;
  statPending.textContent   = pending;
}



// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Run ───────────────────────────────────────────────────────
init();
