/* ============================================================
   DAD'S HEALTH TRACKER — app.js (Firebase version)
   ============================================================ */

import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc,
         addDoc, updateDoc, deleteDoc,
         onSnapshot, query, orderBy }             from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase config ───────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyA-KhK496DwMlRaaoJeQQTJ_ccaj35bLSE",
  authDomain:        "k-prep-82247.firebaseapp.com",
  projectId:         "k-prep-82247",
  storageBucket:     "k-prep-82247.firebasestorage.app",
  messagingSenderId: "530183123780",
  appId:             "1:530183123780:web:b96db076c51015f670dd11",
  measurementId:     "G-775WQCV5B1"
};

const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);

// ── Firestore collections ─────────────────────────────────────
const entriesCol   = collection(db, "entries");
const cheatCol     = collection(db, "cheatList");

// ── Local state (kept in sync with Firestore) ─────────────────
let entries   = [];
let cheatList = [];

// ── Constants ─────────────────────────────────────────────────
const MAYA_PIN     = '4144';
const APPROVAL_KEY = 'mayaApprovalDate';

// ── Chart instances ───────────────────────────────────────────
let weightChartInst = null;
let moodChartInst   = null;

// ── Form state ────────────────────────────────────────────────
let selectedMood = null;
let exerciseVal  = null;
let eatWellVal   = null;
let junkVal      = null;
let fabIsFamily  = false;
let pinEntry     = '';

// ── DOM refs ──────────────────────────────────────────────────
const todayDateEl   = document.getElementById('todayDate');
const timeOfDayEl   = document.getElementById('timeOfDay');
const streakEl      = document.getElementById('streakCount');
const submitBtn     = document.getElementById('submitLog');
const submitWeightOnly = document.getElementById('submitWeightOnly');
const weightMsg     = document.getElementById('weightMsg');
const submitMsg     = document.getElementById('submitMsg');
const kmInput       = document.getElementById('kmTime');
const kmHint        = document.getElementById('kmHint');
const moodLabel     = document.getElementById('moodLabel');
const approvalList  = document.getElementById('approvalList');
const toast         = document.getElementById('toast');
const syncIndicator = document.getElementById('syncIndicator');
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
  setupFab();
  setupPinModal();
  setupSubmit();
  setupWeightOnly();
  fetchGogginsQuote();
  listenToEntries();
  listenToCheatList();
}

// ── Date / Greeting ───────────────────────────────────────────
function setDateHeader() {
  todayDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function setGreeting() {
  const h = new Date().getHours();
  timeOfDayEl.textContent = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Real-time Firestore listeners ─────────────────────────────
function listenToEntries() {
  const q = query(entriesCol, orderBy("date", "desc"));
  onSnapshot(q, snapshot => {
    entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderApprovals();
    updateStats();
    checkStreaks();
    checkPendingBanner();
    renderCharts();
  });
}

function listenToCheatList() {
  onSnapshot(cheatCol, snapshot => {
    cheatList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCheatList();
  });
}

// ── Sync indicator ────────────────────────────────────────────
let syncTimer;
function showSync() {
  syncIndicator.classList.add('show');
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncIndicator.classList.remove('show'), 2000);
}

// ── Tabs ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById('familyView').classList.remove('active');
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      fabIsFamily = false;
      fabCheck.classList.remove('family-active');
      fabCheck.innerHTML = '&#10003;';
      if (btn.dataset.tab === 'charts') renderCharts();
    });
  });
}

// ── Toggles ───────────────────────────────────────────────────
function setupToggles() {
  setupToggleGroup('exerciseToggle', v => exerciseVal = v);
  setupToggleGroup('eatWellToggle',  v => eatWellVal  = v);
  setupToggleGroup('junkToggle',     v => junkVal     = v);
}

function setupToggleGroup(id, setter) {
  const group = document.getElementById(id);
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected-yes','selected-no'));
      btn.classList.add(btn.dataset.val === 'yes' ? 'selected-yes' : 'selected-no');
      setter(btn.dataset.val);
    });
  });
}

// ── KM hint ───────────────────────────────────────────────────
function setupKmHint() {
  kmInput.addEventListener('input', () => {
    const mins = parseFloat(kmInput.value);
    kmHint.textContent = mins > 0 ? `That's ${(60 / mins).toFixed(1)} km/hr 🏃` : '';
  });
}

// ── Mood picker ───────────────────────────────────────────────
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

// ── Submit ────────────────────────────────────────────────────
function setupSubmit() {
  submitBtn.addEventListener('click', async () => {
    const weightMorning = parseFloat(document.getElementById('weightMorning').value);
    const kmTime        = parseFloat(kmInput.value);
    const notes         = document.getElementById('notes').value.trim();

    if (!weightMorning && !selectedMood && exerciseVal === null && !document.getElementById("kmTime").value) {
      showToast('⚠️ Please fill in at least one field!');
      return;
    }

    const today    = todayKey();
    const kmph     = kmTime > 0 ? +(60 / kmTime).toFixed(1) : null;
    const existing = entries.find(e => e.date === today);

    const entry = {
      date:          today,
      weightMorning: weightMorning || null,
      kmTime:        kmTime        || null,
      kmph,
      exercise:      exerciseVal,
      eatWell:       eatWellVal,
      junk:          junkVal,
      mood:          selectedMood  || null,
      notes:         notes         || '',
      status:        'pending',
      submittedAt:   new Date().toISOString(),
    };

    showSync();

    try {
      if (existing) {
        await updateDoc(doc(db, "entries", existing.id), entry);
        showToast('📝 Entry updated — pending Maya\'s approval!');
      } else {
        await addDoc(entriesCol, entry);
        showToast('✅ Logged! Waiting for Maya to approve ⏳');
      }
      clearForm();
      submitMsg.textContent = '⏳ Pending Maya\'s approval...';
      setTimeout(() => submitMsg.textContent = '', 4000);
    } catch (err) {
      showToast('❌ Error saving. Check your connection.');
      console.error(err);
    }
  });
}

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

// ── Weight Only Submit ────────────────────────────────────────
function setupWeightOnly() {
  submitWeightOnly.addEventListener('click', async () => {
    const weightMorning = parseFloat(document.getElementById('weightMorning').value);
    if (!weightMorning) {
      showToast('⚠️ Please enter your morning weight!');
      return;
    }

    const today    = todayKey();
    const existing = entries.find(e => e.date === today);

    showSync();
    try {
      if (existing) {
        // Update just the weight on existing entry
        await updateDoc(doc(db, "entries", existing.id), {
          weightMorning,
          submittedAt: new Date().toISOString(),
          status: existing.status === 'approved' ? 'approved' : 'pending',
        });
        showToast('⚖️ Weight updated!');
      } else {
        // Create a new entry with just the weight
        await addDoc(entriesCol, {
          date:          today,
          weightMorning,
          kmTime:        null,
          kmph:          null,
          exercise:      null,
          eatWell:       null,
          junk:          null,
          mood:          null,
          notes:         '',
          status:        'pending',
          submittedAt:   new Date().toISOString(),
        });
        showToast('🌅 Morning weight logged!');
      }
      document.getElementById('weightMorning').value = '';
      weightMsg.textContent = '✅ Weight saved! Fill in the rest later.';
      setTimeout(() => weightMsg.textContent = '', 4000);
    } catch (err) {
      showToast('❌ Error saving. Check your connection.');
      console.error(err);
    }
  });
}

// ── Pending banner ────────────────────────────────────────────
function checkPendingBanner() {
  const todayEntry = entries.find(e => e.date === todayKey());
  pendingBanner.style.display = (todayEntry && todayEntry.status === 'pending') ? 'block' : 'none';
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

// ── Cheat Day ─────────────────────────────────────────────────
function setupCheatDay() {
  document.getElementById('addCheatFood').addEventListener('click', addCheatFood);
  document.getElementById('cheatFoodInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addCheatFood();
  });
  document.getElementById('clearCheatList').addEventListener('click', async () => {
    if (!confirm('Clear the whole cheat list? Starting fresh for next week!')) return;
    showSync();
    for (const item of cheatList) {
      await deleteDoc(doc(db, "cheatList", item.id));
    }
    showToast('🗑️ Cheat list cleared!');
  });
}

async function addCheatFood() {
  const input = document.getElementById('cheatFoodInput');
  const val   = input.value.trim();
  if (!val) return;
  showSync();
  await addDoc(cheatCol, { text: val, addedAt: new Date().toISOString() });
  input.value = '';
  showToast('🍕 Added to cheat list!');
}

function renderCheatList() {
  const ul = document.getElementById('cheatList');
  if (cheatList.length === 0) {
    ul.innerHTML = '<li class="empty-state">No cheat foods added yet — stay strong! 💪</li>';
    return;
  }
  ul.innerHTML = cheatList.map(item => `
    <li class="cheat-item">
      <span class="cheat-item-text">🍕 ${item.text}</span>
      <button class="cheat-del" onclick="removeCheatItem('${item.id}')">🗑️</button>
    </li>
  `).join('');
}

window.removeCheatItem = async (id) => {
  showSync();
  await deleteDoc(doc(db, "cheatList", id));
};

// ── Approvals ─────────────────────────────────────────────────
function renderApprovals() {
  if (entries.length === 0) {
    approvalList.innerHTML = '<p class="empty-state">Nothing to review yet!</p>';
    return;
  }

  approvalList.innerHTML = entries.map(e => {
    const d       = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const pills = [];
    if (e.weightMorning) pills.push(`⚖️ ${e.weightMorning} lbs`);
    if (e.kmph)          pills.push(`🏃 ${e.kmph} km/hr`);
    if (e.exercise)      pills.push(`💪 Exercise: ${e.exercise}`);
    if (e.eatWell)       pills.push(`🥗 Ate well: ${e.eatWell}`);
    if (e.junk)          pills.push(`🍔 Junk: ${e.junk}`);
    if (e.mood)          pills.push(`${['','😞','😕','😐','🙂','😄'][e.mood]} Mood: ${['','Terrible','Bad','Okay','Good','Great'][e.mood]}`);

    const statusChip = `<span class="status-chip ${e.status}">${e.status}</span>`;
    const actions = e.status === 'pending'
      ? `<div class="approval-actions">
           <button class="btn btn-approve" onclick="approveEntry('${e.id}')">✅ Approve</button>
           <button class="btn btn-reject"  onclick="rejectEntry('${e.id}')">❌ Reject</button>
         </div>`
      : `<div class="approval-actions">
           <button class="btn btn-ghost" style="font-size:0.78rem;padding:6px 12px" onclick="resetEntry('${e.id}')">↩ Reset</button>
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

window.approveEntry = async (id) => {
  showSync();
  await updateDoc(doc(db, "entries", id), { status: 'approved', reviewedAt: new Date().toISOString() });
  showToast('✅ Approved! Way to go, Dad! 🎉');
};

window.rejectEntry = async (id) => {
  showSync();
  await updateDoc(doc(db, "entries", id), { status: 'rejected', reviewedAt: new Date().toISOString() });
  showToast('❌ Entry flagged.');
};

window.resetEntry = async (id) => {
  showSync();
  await updateDoc(doc(db, "entries", id), { status: 'pending', reviewedAt: null });
  showToast('↩ Reset to pending.');
};

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
  const withWeight = entries.filter(e => e.weightMorning);
  const withKm     = entries.filter(e => e.kmph);
  statAvgWeight.textContent = withWeight.length
    ? (withWeight.reduce((s,e) => s + e.weightMorning, 0) / withWeight.length).toFixed(1) : '—';
  statAvgKm.textContent = withKm.length
    ? (withKm.reduce((s,e) => s + e.kmph, 0) / withKm.length).toFixed(1) : '—';
  statApproved.textContent = entries.filter(e => e.status === 'approved').length;
  statPending.textContent  = entries.filter(e => e.status === 'pending').length;
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
    canvas.style.display = 'none'; emptyEl.style.display = 'block'; return;
  }
  canvas.style.display = 'block'; emptyEl.style.display = 'none';

  const labels  = data.map(e => new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const weights = data.map(e => e.weightMorning);

  if (weightChartInst) weightChartInst.destroy();

  weightChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Weight (lbs)',
        data: weights,
        backgroundColor: weights.map((w,i) => i === 0 ? 'rgba(74,144,217,0.6)' : w <= weights[i-1] ? 'rgba(76,175,125,0.7)' : 'rgba(232,115,58,0.7)'),
        borderColor:     weights.map((w,i) => i === 0 ? '#4a90d9'              : w <= weights[i-1] ? '#4caf7d'              : '#e8733a'),
        borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => {
          const i = ctx.dataIndex, w = weights[i];
          if (i === 0) return `${w} lbs`;
          const diff = (w - weights[i-1]).toFixed(1);
          return `${w} lbs (${diff > 0 ? '+' : ''}${diff} lbs)`;
        }}}
      },
      scales: {
        y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } },
        x: { grid: { display: false }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } }
      }
    }
  });
}

function renderMoodChart() {
  const canvas  = document.getElementById('moodChart');
  const emptyEl = document.getElementById('moodChartEmpty');
  const data    = [...entries].reverse().filter(e => e.mood || e.kmph).slice(-14);

  if (data.length < 2) {
    canvas.style.display = 'none'; emptyEl.style.display = 'block'; return;
  }
  canvas.style.display = 'block'; emptyEl.style.display = 'none';

  const labels   = data.map(e => new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const moodData = data.map(e => e.mood   || null);
  const kmData   = data.map(e => e.kmph   || null);

  if (moodChartInst) moodChartInst.destroy();

  moodChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Mood (1–5)', data: moodData, borderColor: '#4caf7d', backgroundColor: 'rgba(76,175,125,0.1)', pointBackgroundColor: '#4caf7d', tension: 0.4, fill: true, pointRadius: 5, spanGaps: true, yAxisID: 'yMood' },
        { label: 'Speed (km/hr)', data: kmData, borderColor: '#4a90d9', backgroundColor: 'rgba(74,144,217,0.1)', pointBackgroundColor: '#4a90d9', tension: 0.4, fill: true, pointRadius: 5, spanGaps: true, yAxisID: 'yKm' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } } },
      scales: {
        yMood: { position: 'left',  min: 0, max: 5, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#4caf7d' } },
        yKm:   { position: 'right', min: 0,          grid: { display: false },             ticks: { font: { family: 'Nunito', weight: '700' }, color: '#4a90d9' } },
        x:     { grid: { display: false }, ticks: { font: { family: 'Nunito', weight: '700' }, color: '#8a7a65' } }
      }
    }
  });
}

// ── FAB ───────────────────────────────────────────────────────
function setupFab() {
  fabCheck.addEventListener('click', () => {
    if (fabIsFamily) {
      document.getElementById('familyView').classList.remove('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-daily').classList.add('active');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'daily'));
      fabIsFamily = false;
      fabCheck.classList.remove('family-active');
      fabCheck.innerHTML = '&#10003;';
      return;
    }
    if (localStorage.getItem(APPROVAL_KEY) === todayKey()) {
      showToast('✅ Already approved today! Great job, Dad!');
      return;
    }
    openPinModal();
  });
}

// ── PIN modal ─────────────────────────────────────────────────
function setupPinModal() {
  pinClose.addEventListener('click', closePinModal);
  pinOverlay.addEventListener('click', e => { if (e.target === pinOverlay) closePinModal(); });

  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
      const val = key.dataset.val;
      if (val === 'clear')           pinEntry = '';
      else if (val === 'del')        pinEntry = pinEntry.slice(0, -1);
      else if (pinEntry.length < 4)  pinEntry += val;
      updateDots();
      if (pinEntry.length === 4) checkPin();
    });
  });
}

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

function updateDots() {
  pinDots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinEntry.length);
    dot.classList.remove('error', 'success');
  });
}

async function checkPin() {
  if (pinEntry === MAYA_PIN) {
    pinDots.forEach(d => { d.classList.remove('filled'); d.classList.add('success'); });
    pinSubtitle.textContent = '✅ Approved! Great job, Dad! 🎉';
    pinSubtitle.className = 'pin-subtitle success';

    localStorage.setItem(APPROVAL_KEY, todayKey());

    const todayEntry = entries.find(e => e.date === todayKey());
    if (todayEntry) {
      showSync();
      await updateDoc(doc(db, "entries", todayEntry.id), {
        status: 'approved',
        reviewedAt: new Date().toISOString()
      });
    }

    setTimeout(() => {
      closePinModal();
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

// ── Daily Goggins Quote ───────────────────────────────────────
async function fetchGogginsQuote() {
  const quoteEl = document.getElementById('gogginsQuote');
  const QUOTE_KEY      = 'gogginsQuote';
  const QUOTE_DATE_KEY = 'gogginsQuoteDate';

  // Reuse today's quote if already fetched
  const savedDate  = localStorage.getItem(QUOTE_DATE_KEY);
  const savedQuote = localStorage.getItem(QUOTE_KEY);
  if (savedDate === todayKey() && savedQuote) {
    quoteEl.textContent = savedQuote;
    return;
  }

  quoteEl.classList.add('loading');
  quoteEl.textContent = 'Loading your motivation...';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Generate one short, powerful motivational quote in the raw, no-excuses style of David Goggins. 
It should be intense, direct, and push someone to get up and work hard on their health and fitness. 
Make it feel personal and visceral — like he's talking directly to you. 
Keep it under 3 sentences. Do not use quotation marks. Do not include his name. Just the quote itself.
Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} so make it feel relevant to the day.`
        }]
      })
    });

    const data = await response.json();
    const quote = data.content?.[0]?.text?.trim();

    if (quote) {
      quoteEl.classList.remove('loading');
      quoteEl.textContent = quote;
      localStorage.setItem(QUOTE_KEY, quote);
      localStorage.setItem(QUOTE_DATE_KEY, todayKey());
    } else {
      throw new Error('No quote returned');
    }
  } catch (err) {
    quoteEl.classList.remove('loading');
    quoteEl.textContent = "You are not who you think you are. You are capable of so much more — now get up and prove it.";
    console.error('Quote fetch failed:', err);
  }
}

// ── Run ───────────────────────────────────────────────────────
init();
