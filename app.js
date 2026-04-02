/* ============================================================
   DAD'S HEALTH TRACKER — app.js
   ============================================================ */

// ── Storage ───────────────────────────────────────────────────
const STORAGE_KEY  = 'dadsHealthLog';
const CHEAT_KEY    = 'dadsCheatList';
const APPROVAL_KEY = 'mayaApprovalDate';
const MAYA_PIN     = '4144';

function loadEntries()   { try { return JSON.parse(localStorage.getItem(STORAGE_KEY))  || []; } catch { return []; } }
function loadCheatList() { try { return JSON.parse(localStorage.getItem(CHEAT_KEY))    || []; } catch { return []; } }
function saveEntries(e)  { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); }
function saveCheatList(c){ localStorage.setItem(CHEAT_KEY, JSON.stringify(c)); }

// ── State ─────────────────────────────────────────────────────
let entries   = loadEntries();
let cheatList = loadCheatList();
let selectedMood     = null;
let exerciseVal      = null;
let eatWellVal       = null;
let junkVal          = null;
let weightChart      = null;
let moodChartInst    = null;

// ── DOM ───────────────────────────────────────────────────────
const todayDateEl   = document.getElementById('todayDate');
const timeOfDayEl   = document.getElementById('timeOfDay');
const streakEl      = document.getElementById('streakCount');
const submitBtn     = document.getElementById('submitLog');
const submitMsg     = document.getElementById('submitMsg');
const kmInput       = document.getElementById('kmTime');
const kmHint        = document.getElementById('kmHint');
const moodPicker    = document.getElementById('moodPicker');
const moodLabel     = document.getElementById('moodLabel');
const approvalList  = document.getElementById('approvalList');
const toast         = document.getElementById('toast');
const pendingBanner = document.getElementById('pendingBanner');
const statAvgWeight = document.getElementById('statAvgWeight');
const statApproved  = document.getElementById('statApproved');
const statPending   = document.getElementById('statPending');
const statAvgKm     = document.getElementById('statAvgKm');
const fabCheck      = document.getElementById('fabCheck');
const pinOverlay    = document.getElementById('pinOverlay');
const pinClose      = document.getElementById('pinClose');
const pinSubtitle   = document.getElementById('pinSubtitle');
const pinDots       = document.querySelectorAll('.pin-dot');

// ── Init ──────────────────────────────────────────────────────
function init() {
  setDateHeader();
  setGreeting();
  setupTabs();
  setupToggles();
  setupMoodPicker();
  setupKmHint();
  setupCheatDay();
  renderApprovals();
  updateStats();
  checkStreaks();
  renderCharts();
  checkPendingBanner();
}

// ── Date / Greeting ───────────────────────────────────────────
function setDateHeader() {
  const now  = new Date();
  todayDateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function setGreeting() {
  const h = new Date().getHours();
  timeOfDayEl.textContent = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Tabs ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Hide family view when switching tabs
      document.getElementById('familyView').classList.remove('active');
      fabCheck.classList.remove('family-active');
      fabCheck.innerHTML = '&#10003;';
      if (btn.dataset.tab === 'charts') renderCharts();
    });
  });
}

// ── Toggle buttons (Yes/No) ───────────────────────────────────
function setupToggles() {
  setupToggleGroup('exerciseToggle', v => exerciseVal = v);
  setupToggleGroup('eatWellToggle',  v => eatWellVal  = v);
  setupToggleGroup('junkToggle',     v => junkVal     = v);
}

function setupToggleGroup(id, setter) {
  const group = document.getElementById(id);
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.remove('selected-yes', 'selected-no');
      });
      const val = btn.dataset.val;
      btn.classList.add(val === 'yes' ? 'selected-yes' : 'selected-no');
      setter(val);
    });
  });
}

// ── KM hint (convert min → km/hr) ────────────────────────────
function setupKmHint() {
  kmInput.addEventListener('input', () => {
    const mins = parseFloat(kmInput.value);
    if (mins > 0) {
      const kph = (60 / mins).toFixed(1);
      kmHint.textContent = `That's ${kph} km/hr 🏃`;
    } else {
      kmHint.textContent = '';
    }
  });
}

// ── Mood Picker ───────────────────────────────────────────────
const moodNames = { 1:'Terrible 😞', 2:'Bad 😕', 3:'Okay 😐', 4:'Good 🙂', 5:'Great 😄' };

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

// ── Streak ────────────────────────────────────────────────────
function checkStreaks() {
  const approvedDates = entries
    .filter(e => e.status === 'approved')
    .map(e => e.date)
    .sort((a,b) => b.localeCompare(a));

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);

  for (const dateStr of approvedDates) {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((cursor - d) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = d; }
    else break;
  }
  streakEl.textContent = streak;
}

// ── Pending Banner ────────────────────────────────────────────
function checkPendingBanner() {
  const todayEntry = entries.find(e => e.date === todayKey());
  if (todayEntry && todayEntry.status === 'pending') {
    pendingBanner.style.display = 'block';
  } else {
    pendingBanner.style.display = 'none';
  }
}

// ── Submit Log ────────────────────────────────────────────────
submitBtn.addEventListener('click', () => {
  const weightMorning = parseFloat(document.getElementById('weightMorning').value);
  const kmTime        = parseFloat(kmInput.value);
  const notes         = document.getElementById('notes').value.trim();

  if (!weightMorning && !selectedMood && exerciseVal === null) {
    showToast('⚠️ Please fill in at least one field!');
    return;
  }

  const kmph = kmTime > 0 ? +(60 / kmTime).toFixed(1) : null;

  const today   = todayKey();
  const existing = entries.findIndex(e => e.date === today);

  const entry = {
    date:          today,
    weightMorning: weightMorning || null,
    kmTime:        kmTime        || null,
    kmph:          kmph,
    exercise:      exerciseVal,
    eatWell:       eatWellVal,
    junk:          junkVal,
    mood:          selectedMood  || null,
    notes:         notes         || '',
    status:        'pending',
    submittedAt:   new Date().toISOString(),
  };

  if (existing >= 0) {
    entries[existing] = { ...entries[existing], ...entry, status: 'pending' };
    showToast('📝 Entry updated — pending Maya\'s approval!');
  } else {
    entries.unshift(entry);
    showToast('✅ Logged! Waiting for Maya to approve ⏳');
  }

  saveEntries(entries);
  clearForm();
  renderApprovals();
  updateStats();
  checkStreaks();
  renderCharts();
  checkPendingBanner();
  submitMsg.textContent = '⏳ Pending Maya\'s approval...';
  setTimeout(() => submitMsg.textContent = '', 4000);
});

function clearForm() {
  document.getElementById('weightMorning').value = '';
  kmInput.value = '';
  kmHint.textContent = '';
  document.getElementById('notes').value = '';
  selectedMood = null;
  exerciseVal = eatWellVal = junkVal = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected-yes','selected-no'));
  moodLabel.textContent = 'Tap a face to log your mood';
}

// ── Cheat Day ─────────────────────────────────────────────────
function setupCheatDay() {
  renderCheatList();

  document.getElementById('addCheatFood').addEventListener('click', addCheatFood);
  document.getElementById('cheatFoodInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addCheatFood();
  });
  document.getElementById('clearCheatList').addEventListener('click', () => {
    if (confirm('Clear the whole cheat list? Starting fresh for next week!')) {
      cheatList = [];
      saveCheatList(cheatList);
      renderCheatList();
      showToast('🗑️ Cheat list cleared!');
    }
  });
}

function addCheatFood() {
  const input = document.getElementById('cheatFoodInput');
  const val   = input.value.trim();
  if (!val) return;
  cheatList.push(val);
  saveCheatList(cheatList);
  renderCheatList();
  input.value = '';
  showToast('🍕 Added to cheat list!');
}

function renderCheatList() {
  const ul = document.getElementById('cheatList');
  if (cheatList.length === 0) {
    ul.innerHTML = '<li class="empty-state">No cheat foods added yet — stay strong! 💪</li>';
    return;
  }
  ul.innerHTML = cheatList.map((item, i) => `
    <li class="cheat-item">
      <span class="cheat-item-text">🍕 ${item}</span>
      <button class="cheat-del" onclick="removeCheatItem(${i})">🗑️</button>
    </li>
  `).join('');
}

function removeCheatItem(i) {
  cheatList.splice(i, 1);
  saveCheatList(cheatList);
  renderCheatList();
}

// ── Charts ────────────────────────────────────────────────────
function renderCharts() {
  renderWeightChart();
  renderMoodChart();
}

function renderWeightChart() {
  const canvas  = document.getElementById('weightChart');
  const emptyEl = document.getElementById('weightChartEmpty');
  const data    = [...entries].reverse().filter(e => e.weightMorning).slice(-20);

  if (data.length < 2) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  emptyEl.style.display = 'none';

  const labels = data.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const weights = data.map(e => e.weightMorning);

  if (weightChart) weightChart.destroy();

  weightChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Weight (lbs)',
        data: weights,
        backgroundColor: weights.map((w, i) => {
          if (i === 0) return 'rgba(74,144,217,0.6)';
          return w <= weights[i-1] ? 'rgba(76,175,125,0.7)' : 'rgba(232,115,58,0.7)';
        }),
        borderColor: weights.map((w, i) => {
          if (i === 0) return '#4a90d9';
          return w <= weights[i-1] ? '#4caf7d' : '#e8733a';
        }),
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const i = ctx.dataIndex;
              const w = weights[i];
              if (i === 0) return `${w} lbs`;
              const diff = (w - weights[i-1]).toFixed(1);
              return `${w} lbs (${diff > 0 ? '+' : ''}${diff} lbs)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
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

function renderMoodChart() {
  const canvas  = document.getElementById('moodChart');
  const emptyEl = document.getElementById('moodChartEmpty');
  const data    = [...entries].reverse().filter(e => e.mood || e.kmph).slice(-14);

  if (data.length < 2) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  emptyEl.style.display = 'none';

  const labels   = data.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const moodData = data.map(e => e.mood || null);
  const kmData   = data.map(e => e.kmph || null);

  if (moodChartInst) moodChartInst.destroy();

  moodChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mood (1–5)',
          data: moodData,
          borderColor: '#4caf7d',
          backgroundColor: 'rgba(76,175,125,0.1)',
          pointBackgroundColor: '#4caf7d',
          tension: 0.4, fill: true, pointRadius: 5, spanGaps: true,
          yAxisID: 'yMood',
        },
        {
          label: 'Speed (km/hr)',
          data: kmData,
          borderColor: '#4a90d9',
          backgroundColor: 'rgba(74,144,217,0.1)',
          pointBackgroundColor: '#4a90d9',
          tension: 0.4, fill: true, pointRadius: 5, spanGaps: true,
          yAxisID: 'yKm',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } } },
      scales: {
        yMood: { position: 'left',  min: 0, max: 5,  grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#4caf7d' } },
        yKm:   { position: 'right', min: 0,           grid: { display: false },             ticks: { font: { family: 'Nunito', weight: '700' }, color: '#4a90d9' } },
        x:     { grid: { display: false }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } }
      }
    }
  });
}

// ── Approvals ─────────────────────────────────────────────────
function renderApprovals() {
  if (entries.length === 0) {
    approvalList.innerHTML = '<p class="empty-state">Nothing to review yet!</p>';
    return;
  }

  approvalList.innerHTML = entries.map((e, idx) => {
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const pills = [];
    if (e.weightMorning) pills.push(`⚖️ ${e.weightMorning} lbs`);
    if (e.kmph)          pills.push(`🏃 ${e.kmph} km/hr`);
    if (e.exercise)      pills.push(`💪 Exercise: ${e.exercise}`);
    if (e.eatWell)       pills.push(`🥗 Ate well: ${e.eatWell}`);
    if (e.junk)          pills.push(`🍔 Junk food: ${e.junk}`);
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
      </div>`;
  }).join('');
}

function approveEntry(idx) {
  entries[idx].status = 'approved';
  entries[idx].reviewedAt = new Date().toISOString();
  saveEntries(entries);
  renderApprovals(); updateStats(); checkStreaks(); checkPendingBanner();
  showToast('✅ Approved! Way to go, Dad! 🎉');
}

function rejectEntry(idx) {
  entries[idx].status = 'rejected';
  entries[idx].reviewedAt = new Date().toISOString();
  saveEntries(entries);
  renderApprovals(); updateStats(); checkPendingBanner();
  showToast('❌ Entry flagged.');
}

function resetEntry(idx) {
  entries[idx].status = 'pending';
  delete entries[idx].reviewedAt;
  saveEntries(entries);
  renderApprovals(); updateStats(); checkPendingBanner();
  showToast('↩ Reset to pending.');
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  const withWeight = entries.filter(e => e.weightMorning);
  const withKm     = entries.filter(e => e.kmph);
  const approved   = entries.filter(e => e.status === 'approved').length;
  const pending    = entries.filter(e => e.status === 'pending').length;

  statAvgWeight.textContent = withWeight.length
    ? (withWeight.reduce((s,e) => s + e.weightMorning, 0) / withWeight.length).toFixed(1)
    : '—';
  statAvgKm.textContent = withKm.length
    ? (withKm.reduce((s,e) => s + e.kmph, 0) / withKm.length).toFixed(1)
    : '—';
  statApproved.textContent = approved;
  statPending.textContent  = pending;
}

// ── FAB + PIN ─────────────────────────────────────────────────
let pinEntry    = '';
let fabIsFamily = false;

function alreadyApprovedToday() {
  return localStorage.getItem(APPROVAL_KEY) === todayKey();
}

fabCheck.addEventListener('click', () => {
  if (fabIsFamily) {
    // Switch back to daily view
    document.getElementById('familyView').classList.remove('active');
    document.querySelectorAll('.tab-content').forEach(t => {
      if (t.id === 'tab-daily') t.classList.add('active');
    });
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === 'daily');
    });
    fabIsFamily = false;
    fabCheck.classList.remove('family-active');
    fabCheck.innerHTML = '&#10003;';
    return;
  }

  if (alreadyApprovedToday()) {
    showToast('✅ Already approved today! Great job, Dad!');
    return;
  }
  openPinModal();
});

pinClose.addEventListener('click', closePinModal);
pinOverlay.addEventListener('click', e => { if (e.target === pinOverlay) closePinModal(); });

function openPinModal() {
  pinEntry = '';
  updateDots();
  pinSubtitle.textContent = "Enter your PIN to approve today's entry";
  pinSubtitle.className = 'pin-subtitle';
  pinOverlay.classList.add('show');
}

function closePinModal() {
  pinOverlay.classList.remove('show');
  pinEntry = '';
  updateDots();
}

document.querySelectorAll('.pin-key').forEach(key => {
  key.addEventListener('click', () => {
    const val = key.dataset.val;
    if (val === 'clear')       { pinEntry = ''; }
    else if (val === 'del')    { pinEntry = pinEntry.slice(0, -1); }
    else if (pinEntry.length < 4) { pinEntry += val; }
    updateDots();
    if (pinEntry.length === 4) checkPin();
  });
});

function updateDots() {
  pinDots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinEntry.length);
    dot.classList.remove('error', 'success');
  });
}

function checkPin() {
  if (pinEntry === MAYA_PIN) {
    pinDots.forEach(d => { d.classList.remove('filled'); d.classList.add('success'); });
    pinSubtitle.textContent = '✅ Approved! Great job, Dad! 🎉';
    pinSubtitle.className = 'pin-subtitle success';

    localStorage.setItem(APPROVAL_KEY, todayKey());

    const todayIdx = entries.findIndex(e => e.date === todayKey());
    if (todayIdx >= 0) {
      entries[todayIdx].status = 'approved';
      entries[todayIdx].reviewedAt = new Date().toISOString();
      saveEntries(entries);
      updateStats();
      renderApprovals();
      checkPendingBanner();
    }

    checkStreaks();

    setTimeout(() => {
      closePinModal();
      // Open family view
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById('familyView').classList.add('active');
      fabIsFamily = true;
      fabCheck.classList.add('family-active');
      fabCheck.innerHTML = '&#8592;';
      showToast('🎉 Maya approved! Streak updated!');
    }, 1400);

  } else {
    pinDots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
    pinSubtitle.textContent = 'Wrong PIN, try again!';
    pinSubtitle.className = 'pin-subtitle error';
    setTimeout(() => {
      pinEntry = '';
      updateDots();
      pinSubtitle.textContent = "Enter your PIN to approve today's entry";
      pinSubtitle.className = 'pin-subtitle';
    }, 900);
  }
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
