// ========================================
// DOM Elements
// ========================================
const eventsList = document.getElementById('list_events');
const btnAddEvent = document.getElementById('btn_add_event');

const evtNama = document.getElementById('evt_nama');
const evtHari = document.getElementById('evt_hari');
const evtTanggal = document.getElementById('evt_tanggal');
const evtPukul = document.getElementById('evt_pukul');

const eventDetail = document.getElementById('event-detail');
const detailHeader = document.getElementById('detail_header');
const backToEvents = document.getElementById('back_to_events');

const pNama = document.getElementById('p_nama');
const pJabatan = document.getElementById('p_jabatan');
const pHp = document.getElementById('p_hp');
const pInstansi = document.getElementById('p_instansi');
const pGender = document.getElementById('p_gender');
const pTandaCanvas = document.getElementById('p_tanda_canvas');
const btnAddParticipant = document.getElementById('btn_add_participant');

const participantsBody = document.getElementById('participants_body');
const searchInput = document.getElementById('search');
const btnSearch = document.getElementById('btn_search');

const employeeTableBody = document.getElementById('employeeTableBody');
const btnCancelEmployee = document.getElementById('btn_cancel_employee');
const btnSaveEmployee = document.getElementById('btn_save_employee');
const newEmpNama = document.getElementById('new_emp_nama');
const newEmpJabatan = document.getElementById('new_emp_jabatan');
const newEmpHp = document.getElementById('new_emp_hp');
const newEmpInstansi = document.getElementById('new_emp_instansi');
const newEmpGender = document.getElementById('new_emp_gender');
const employeeSelect = document.getElementById('employeeSelect');
const empTandaCanvas = document.getElementById('emp_tanda_canvas');

const btnToggleTheme = document.getElementById('btn_toggle_theme');
const btnPrint = document.getElementById('btn_print');

// ========================================
// Global Variables
// ========================================
let currentEventId = null;
let allParticipantsCache = [];

let employees = [];

// ========================================
// Utility Functions
// ========================================
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

function clearEmployeeForm() {
  newEmpNama.value = '';
  newEmpJabatan.value = '';
  newEmpHp.value = '';
  const ctx = empTandaCanvas.getContext('2d');
  ctx.clearRect(0, 0, empTandaCanvas.width, empTandaCanvas.height);
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  const section = document.getElementById(id);
  if (section) section.classList.add('active');

  if (id === 'employee-list-section') renderEmployees();
  else if (id === 'employee-add-section') clearEmployeeForm();
}

// ========================================
// Employees
// ========================================
function renderEmployees() {
  employeeTableBody.innerHTML = '';
  employeeSelect.innerHTML = '<option value="">-- Pilih Karyawan --</option>';

  employees.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td>${escapeHtml(emp.nama)}</td>
    <td>${escapeHtml(emp.jabatan)}</td>
    <td>${escapeHtml(emp.hp)}</td>
    <td>${escapeHtml(emp.instansi || '')}</td>
    <td>${escapeHtml(emp.gender || '')}</td>
    <td style="text-align:center;">
      ${emp.tanda ? `<img src="${emp.tanda}" style="max-width:100px; max-height:60px;">` : 'Tidak ada'}
    </td>
    <td style="text-align:center;">
      <button data-id="${emp.id}" class="red-button" title="Hapus">
        <img src="delete.png" alt="Hapus" style="max-width:20px; max-height:20px;">
      </button>
    </td>
  `;
    employeeTableBody.appendChild(tr);
  });

  employeeTableBody.querySelectorAll('button.red-button').forEach(btn => {
    btn.addEventListener('click', e => deleteEmployee(e.currentTarget.dataset.id));
  });

  employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = emp.nama;
    employeeSelect.appendChild(opt);
  });
}

function subscribeEmployees() {
  db.collection('employees').orderBy('createdAt', 'desc').onSnapshot(snap => {
    employees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEmployees();
  }, err => console.error('Gagal subscribe employees:', err));
}


async function deleteEmployee(docId) {
  if (!docId || !confirm('Yakin ingin menghapus karyawan ini?')) return;
  try {
    await db.collection('employees').doc(docId).delete();
  } catch (err) {
    console.error(err);
    alert('Gagal menghapus karyawan.');
  }
}


// ========================================
// Employee Events
// ========================================
btnCancelEmployee.addEventListener('click', () => {
  clearEmployeeForm();
  showSection('create-event');
});

btnSaveEmployee.addEventListener('click', async () => {
  const nama = newEmpNama.value.trim();
  const jabatan = newEmpJabatan.value.trim();
  const hp = newEmpHp.value.trim();
  const instansi = newEmpInstansi.value.trim();
  const gender = newEmpGender.value;
  const tanda = empTandaCanvas.toDataURL();

  if (!nama || !jabatan || !hp || !instansi || !gender) return alert('Lengkapi semua data karyawan.');

  try {
    await db.collection('employees').add({
      nama, jabatan, hp, instansi, gender, tanda: tanda || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      namaLower: nama.toLowerCase()
    });

    clearEmployeeForm();
    alert('Karyawan berhasil ditambahkan!');
    showSection('employee-list-section');
  } catch (err) {
    console.error(err);
    alert('Gagal menambahkan karyawan.');
  }
});


employeeSelect.addEventListener('change', async function () {
  if (!currentEventId) {
    alert('Buka acara terlebih dahulu.');
    this.value = "";
    return;
  }

  const emp = employees.find(e => e.id === this.value);
  if (!emp) return;

  try {
    const snap = await db.collection('events').doc(currentEventId)
      .collection('participants').orderBy('nomor', 'desc').limit(1).get();

    let nextNomor = snap.empty ? 1 : (snap.docs[0].data().nomor || 0) + 1;

    await db.collection('events').doc(currentEventId).collection('participants').add({
      nomor: nextNomor, nama: emp.nama, jabatan: emp.jabatan, instansi: emp.instansi, gender: emp.gender,
      hp: emp.hp, tanda: emp.tanda || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    loadParticipants(currentEventId);
  } catch (err) {
    console.error(err);
    alert('Gagal menambahkan peserta.');
  }
  this.value = "";
});

// ========================================
// Events
// ========================================
btnAddEvent.addEventListener('click', async () => {
  const nama = evtNama.value.trim();
  const hari = evtHari.value.trim();
  const tanggal = evtTanggal.value;
  const pukul = evtPukul.value.trim();
  const instansi = pInstansi.value.trim();
  const gender = pGender.value;

  if (!nama || !tanggal) return alert('Lengkapi data acara terlebih dahulu');

  try {
    await db.collection('events').add({
      nama, hari, tanggal, pukul,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    evtNama.value = evtHari.value = evtTanggal.value = evtPukul.value = '';
    alert('Acara berhasil ditambahkan!');
    loadEvents();
    showSection('events-list');
  } catch (err) {
    console.error(err);
    alert('Gagal menambah acara');
  }
});

async function loadEvents() {
  eventsList.innerHTML = '<li>Memuat...</li>';
  try {
    const snap = await db.collection('events').orderBy('tanggal', 'desc').get();
    eventsList.innerHTML = snap.empty ? '<li>Belum ada acara.</li>' : '';

    snap.forEach(doc => {
      const data = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(data.nama)}</strong><br/>
          ${escapeHtml(data.hari || '')} ${data.tanggal || ''} ${escapeHtml(data.pukul || '')}
        </div>
        <div>
          <button data-id="${doc.id}" class="btn-open green-button">Buka</button>
          <button data-id="${doc.id}" class="btn-delete red-button">Hapus</button>
        </div>
      `;
      eventsList.appendChild(li);

      li.querySelector('.btn-open').addEventListener('click', () => openEvent(doc.id, data));
      li.querySelector('.btn-delete').addEventListener('click', () => deleteEvent(doc.id));
    });
  } catch (err) {
    console.error(err);
    eventsList.innerHTML = '<li>Gagal memuat acara.</li>';
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Yakin ingin menghapus acara ini beserta semua pesertanya?')) return;
  try {
    const participantsSnap = await db.collection('events').doc(eventId).collection('participants').get();
    const batch = db.batch();
    participantsSnap.forEach(part => batch.delete(part.ref));
    await batch.commit();
    await db.collection('events').doc(eventId).delete();
    alert('Acara berhasil dihapus.');
    loadEvents();
  } catch (err) {
    console.error(err);
    alert('Gagal menghapus acara.');
  }
}

async function openEvent(eventId, data) {
  currentEventId = eventId;
  showSection('event-detail');
  detailHeader.innerHTML = `
    <h2>${escapeHtml(data.nama)}</h2>
    <p>${escapeHtml(data.hari || '')} ${data.tanggal || ''} ${escapeHtml(data.pukul || '')}</p>
  `;
  loadParticipants(eventId);
}

backToEvents.addEventListener('click', () => {
  showSection('events-list');
  currentEventId = null;
  participantsBody.innerHTML = '';
  allParticipantsCache = [];
});

// ========================================
// Participants
// ========================================
btnAddParticipant.addEventListener('click', async () => {
  if (!currentEventId) return alert('Pilih acara terlebih dahulu.');

  const nama = pNama.value.trim();
  const jabatan = pJabatan.value.trim();
  const hp = pHp.value.trim();
  const instansi = pInstansi.value.trim();
  const gender = pGender.value;
  const tanda = pTandaCanvas.toDataURL();

  if (!nama) return alert('Isi Nama peserta');

  try {
    const snap = await db.collection('events').doc(currentEventId)
      .collection('participants').orderBy('nomor', 'desc').limit(1).get();

    let nextNomor = snap.empty ? 1 : (snap.docs[0].data().nomor || 0) + 1;

    await db.collection('events').doc(currentEventId).collection('participants').add({
      nomor: nextNomor, nama, jabatan, hp, instansi, gender, tanda,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    pNama.value = '';
    pJabatan.value = '';
    pHp.value = '';
    pInstansi.value = '';
    pGender.value = '';

    pNama.value = pJabatan.value = pHp.value = pInstansi.value = pGender.value = '';
    const ctx = pTandaCanvas.getContext('2d');
    ctx.clearRect(0, 0, pTandaCanvas.width, pTandaCanvas.height);

    loadParticipants(currentEventId);
  }
  catch (err) {
    console.error(err);
    alert('Gagal menambah peserta');
  }
});

async function loadParticipants(eventId) {
  participantsBody.innerHTML = '<tr><td colspan="6">Memuat peserta...</td></tr>';
  try {
    const snap = await db.collection('events').doc(eventId).collection('participants').orderBy('nomor').get();
    allParticipantsCache = [];
    participantsBody.innerHTML = snap.empty ? '<tr><td colspan="6">Belum ada peserta.</td></tr>' : '';

    snap.forEach(doc => {
      const d = doc.data();
      allParticipantsCache.push({ id: doc.id, ...d });
    });
    renderParticipants(allParticipantsCache);
  } catch (err) {
    console.error(err);
    participantsBody.innerHTML = '<tr><td colspan="6">Gagal memuat peserta.</td></tr>';
  }
}

function renderParticipants(arr) {
  participantsBody.innerHTML = '';
  arr.sort((a, b) => a.nomor - b.nomor);

  if (arr.length === 0) return participantsBody.innerHTML = '<tr><td colspan="6">Belum ada peserta.</td></tr>';

  arr.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td style="text-align:center;">${p.nomor}</td>
    <td>${escapeHtml(p.nama)}</td>
    <td>${escapeHtml(p.jabatan)}</td>
    <td>${escapeHtml(p.hp)}</td>
    <td>${escapeHtml(p.instansi || '')}</td>
    <td>${escapeHtml(p.gender || '')}</td>
    <td style="text-align:center;">
      ${p.tanda ? `<img src="${p.tanda}" style="max-width:100px; max-height:60px;">` : 'Tidak ada'}
    </td>
    <td style="text-align:center;">
      <button data-id="${p.id}" class="red-button"><img src="delete.png" style="width: 25px; height: 25px;"></button>
    </td>
  `;
  
    participantsBody.appendChild(tr);
  });

  participantsBody.querySelectorAll('button.red-button').forEach(btn => {
    btn.addEventListener('click', e => deleteParticipant(e.currentTarget.dataset.id));
  });
}

async function deleteParticipant(participantId) {
  if (!currentEventId || !confirm('Yakin hapus peserta ini?')) return;
  try {
    await db.collection('events').doc(currentEventId).collection('participants').doc(participantId).delete();
    loadParticipants(currentEventId);
  } catch (err) {
    console.error(err);
    alert('Gagal menghapus peserta.');
  }
}

// ========================================
// Search Participants
// ========================================
function doSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderParticipants(allParticipantsCache);
  const filtered = allParticipantsCache.filter(p => (p.nama || '').toLowerCase().includes(q));
  renderParticipants(filtered);
}

btnSearch.addEventListener('click', doSearch);
searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });

// ========================================
// Print Participants
// ========================================
btnPrint.addEventListener('click', () => {
  if (!currentEventId) return alert('Tidak ada acara yang dibuka.');

  const headerHTML = detailHeader.innerHTML;
  const tableClone = document.getElementById('participants_table').cloneNode(true);

  const headerRow = tableClone.querySelector('thead tr');
  if (headerRow?.lastElementChild) headerRow.removeChild(headerRow.lastElementChild);
  tableClone.querySelectorAll('tbody tr').forEach(row => row.lastElementChild?.remove());

  const w = window.open('', '', 'width=900,height=650');
  w.document.write(`
    <html><head><title>Daftar Peserta</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        img { max-width: 100px; max-height: 60px; display: block; margin: auto; }
      </style></head><body>
      <div class="event-header">${headerHTML}</div>
      ${tableClone.outerHTML}
    </body></html>`);
  w.document.close();
  w.print();
});

// ========================================
// Signature Pad
// ========================================
function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  let drawing = false;

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    // fallback untuk mouse
    return { x: (e.offsetX !== undefined ? e.offsetX : e.clientX - rect.left),
             y: (e.offsetY !== undefined ? e.offsetY : e.clientY - rect.top) };
  }

  function start(e) {
    drawing = true;
    const c = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    e.preventDefault();
  }

  function draw(e) {
    if (!drawing) return;
    const c = getCoords(e);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    e.preventDefault();
  }

  function stop() { drawing = false; }

  // Event listeners
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stop);

  // bersihkan canvas awal
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  return canvas;
}


// ========================================
// Theme Toggle
// ========================================
function initThemeToggle() {
  if (!btnToggleTheme) return;

  function updateThemeButton() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
      btnToggleTheme.textContent = '☀️ Mode Terang';
      btnToggleTheme.classList.replace('black-button', 'white-button');
    } else {
      btnToggleTheme.textContent = '🌙 Mode Gelap';
      btnToggleTheme.classList.replace('white-button', 'black-button');
    }
  }

  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  updateThemeButton();

  btnToggleTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeButton();
  });
}

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initSignaturePad('emp_tanda_canvas');
  initSignaturePad('p_tanda_canvas');
  initThemeToggle();
  showSection('create-event');
  loadEvents();
  subscribeEmployees();

  // === Clear tanda tangan karyawan ===
  const clearEmpBtn = document.getElementById('clear-emp-signature');
  if (clearEmpBtn) {
    clearEmpBtn.addEventListener('click', () => {
      const ctx = empTandaCanvas.getContext('2d');
      ctx.clearRect(0, 0, empTandaCanvas.width, empTandaCanvas.height);
    });
  }

  // === Clear tanda tangan peserta ===
  const clearPBtn = document.getElementById('clear-p-signature');
  if (clearPBtn) {
    clearPBtn.addEventListener('click', () => {
      const ctx = pTandaCanvas.getContext('2d');
      ctx.clearRect(0, 0, pTandaCanvas.width, pTandaCanvas.height);
    });
  }
});



