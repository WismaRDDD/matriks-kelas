'use client';

import { useEffect, useState, Fragment } from 'react';

export default function JadwalPage() {
  // ==================== STATE ====================
  const [ruangan, setRuangan] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Settings
  const [settings, setSettings] = useState({
    jamMulai: '07:10',
    durasiSlot: 50, // menit
    jamIstirahatMulai: '12:00',
    jamIstirahatSelesai: '13:00',
    jamSelesai: '17:10',
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' atau 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    hari: 'Senin',
    ruangan_id: '',
    jam_mulai: '07:10',
    jam_selesai: '08:00',
    isi: '',
  });

  // Drag-drop state
  const [draggedItem, setDraggedItem] = useState(null);

  // Hide/collapse state for each day
  const [collapsedDays, setCollapsedDays] = useState({});

  // Data untuk form
  const [kelasList, setKelasList] = useState([]);
  const [useManualInput, setUseManualInput] = useState(false);

  // ==================== FETCH ====================
  const fetchRuangan = async () => {
    try {
      const res = await fetch('/api/ruangan');
      if (!res.ok) throw new Error('Gagal load ruangan');
      const data = await res.json();
      setRuangan(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, ruangan_id: data[0].id }));
      }
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchJadwal = async () => {
    try {
      const res = await fetch('/api/jadwal');
      if (!res.ok) throw new Error('Gagal load jadwal');
      const data = await res.json();
      setJadwal(data);
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchKelasList = async () => {
    try {
      const res = await fetch('/api/kelas');
      if (!res.ok) throw new Error('Gagal load kelas');
      const data = await res.json();
      setKelasList(data);
    } catch (err) {
      console.error('Error loading kelas:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRuangan();
      await fetchKelasList();
      await fetchJadwal();
      setLoading(false);
    };
    loadData();
  }, []);

  // ==================== HELPER FUNCTIONS ====================
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const generateTimeSlots = () => {
    const slots = [];
    const mulai = timeToMinutes(settings.jamMulai);
    const selesai = timeToMinutes(settings.jamSelesai);
    const istirahatMulai = timeToMinutes(settings.jamIstirahatMulai);
    const istirahatSelesai = timeToMinutes(settings.jamIstirahatSelesai);

    for (let time = mulai; time < selesai; time += settings.durasiSlot) {
      const endTime = time + settings.durasiSlot;
      const isBreak = (time >= istirahatMulai && time < istirahatSelesai) ||
                      (time < istirahatSelesai && endTime > istirahatMulai);
      
      slots.push({
        start: minutesToTime(time),
        end: minutesToTime(Math.min(endTime, selesai)),
        isBreak,
      });
    }

    return slots;
  };

  const getScheduleForCell = (hari, ruanganId, startTime) => {
    return jadwal.find(
      j => j.hari === hari && 
           j.ruangan_id === ruanganId && 
           j.jam_mulai === startTime
    );
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ==================== CRUD HANDLERS ====================
  const openAddModal = (hari, ruanganId, jamMulai) => {
    setModalType('add');
    setEditingId(null);
    setFormData({
      hari,
      ruangan_id: ruanganId,
      jam_mulai: jamMulai,
      jam_selesai: minutesToTime(timeToMinutes(jamMulai) + settings.durasiSlot),
      isi: '',
    });
    setShowModal(true);
  };

  const openEditModal = (entry) => {
    setModalType('edit');
    setEditingId(entry.id);
    setFormData({
      hari: entry.hari,
      ruangan_id: entry.ruangan_id,
      jam_mulai: entry.jam_mulai,
      jam_selesai: entry.jam_selesai,
      isi: entry.isi,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.hari || !formData.ruangan_id || !formData.isi) {
      return showMessage('error', 'Lengkapi semua field');
    }

    try {
      const url = modalType === 'add' ? '/api/jadwal' : '/api/jadwal';
      const method = modalType === 'add' ? 'POST' : 'PUT';
      const body = modalType === 'add' 
        ? formData
        : { ...formData, id: editingId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Gagal simpan jadwal');

      showMessage('success', `Jadwal ${modalType === 'add' ? 'ditambah' : 'diubah'}`);
      setShowModal(false);
      fetchJadwal();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus jadwal ini?')) return;

    try {
      const res = await fetch('/api/jadwal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Gagal hapus jadwal');

      showMessage('success', 'Jadwal dihapus');
      fetchJadwal();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ==================== DRAG-DROP HANDLERS ====================
  const handleDragStart = (e, entry) => {
    setDraggedItem(entry);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetHari, targetRuanganId, targetJamMulai, isBreak) => {
    e.preventDefault();
    
    if (!draggedItem || isBreak) {
      setDraggedItem(null);
      return;
    }

    // Cek apakah target sudah ada jadwal
    const targetEntry = getScheduleForCell(targetHari, targetRuanganId, targetJamMulai);
    if (targetEntry && targetEntry.id !== draggedItem.id) {
      showMessage('error', 'Cell sudah ada jadwal. Hapus dulu atau tarik ke cell kosong.');
      setDraggedItem(null);
      return;
    }

    try {
      // Update dengan data baru
      const moveData = {
        id: draggedItem.id,
        hari: targetHari,
        ruangan_id: targetRuanganId,
        jam_mulai: targetJamMulai,
        jam_selesai: minutesToTime(timeToMinutes(targetJamMulai) + settings.durasiSlot),
        isi: draggedItem.isi,
      };

      const res = await fetch('/api/jadwal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      if (!res.ok) throw new Error('Gagal pindahkan jadwal');

      showMessage('success', 'Jadwal dipindahkan');
      fetchJadwal();
      setDraggedItem(null);
    } catch (err) {
      showMessage('error', err.message);
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleCollapseDay = (dayName) => {
    setCollapsedDays(prev => ({
      ...prev,
      [dayName]: !prev[dayName]
    }));
  };

  // ==================== RENDER ====================
  const timeSlots = generateTimeSlots();
  const hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📅 Dashboard Jadwal</h1>

        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* ==================== SETTINGS PANEL ==================== */}
        <div style={styles.settingsPanel}>
          <h2 style={styles.settingsTitle}>⚙️ Pengaturan Jadwal</h2>
          
          <div style={styles.settingsGrid}>
            <div>
              <label style={styles.label}>Jam Mulai:</label>
              <input
                type="time"
                value={settings.jamMulai}
                onChange={(e) => setSettings({ ...settings, jamMulai: e.target.value })}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Durasi Slot (menit):</label>
              <input
                type="number"
                value={settings.durasiSlot}
                onChange={(e) => setSettings({ ...settings, durasiSlot: parseInt(e.target.value) })}
                style={styles.input}
                min="10"
                max="120"
              />
            </div>

            <div>
              <label style={styles.label}>Jam Istirahat (Mulai):</label>
              <input
                type="time"
                value={settings.jamIstirahatMulai}
                onChange={(e) => setSettings({ ...settings, jamIstirahatMulai: e.target.value })}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Jam Istirahat (Selesai):</label>
              <input
                type="time"
                value={settings.jamIstirahatSelesai}
                onChange={(e) => setSettings({ ...settings, jamIstirahatSelesai: e.target.value })}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Jam Selesai:</label>
              <input
                type="time"
                value={settings.jamSelesai}
                onChange={(e) => setSettings({ ...settings, jamSelesai: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <p style={styles.infoText}>
            ℹ️ Settings akan memperbarui tampilan tabel. Total slots: {timeSlots.length}
          </p>
        </div>

        {/* ==================== SCHEDULE TABLE ==================== */}
        {loading ? (
          <div style={styles.loading}>⏳ Loading...</div>
        ) : (
          <div style={styles.tableWrapper}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={{ ...styles.th, width: '100px' }}>Hari</th>
                    <th style={{ ...styles.th, width: '140px' }}>Ruangan</th>
                    {timeSlots.map((slot, idx) => (
                      <th key={idx} style={styles.thTime}>
                        {slot.start}
                        <br />
                        {slot.end}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hari.map((h, hariIdx) => {
                    // Sort ruangan A-Z berdasarkan nama
                    const sortedRuangan = [...ruangan].sort((a, b) => 
                      a.f_namaruang.localeCompare(b.f_namaruang)
                    );
                    
                    const isCollapsed = collapsedDays[h];
                    const displayRuangan = isCollapsed ? [] : sortedRuangan;

                    return (
                      <Fragment key={h}>
                        {/* Row untuk header hari + tombol hide/show */}
                        <tr key={`header-${h}`} style={styles.tableRow}>
                          {/* Kolom Hari dengan tombol hide/show */}
                          <td
                            style={{
                              ...styles.td,
                              fontWeight: '600',
                              textAlign: 'center',
                              backgroundColor: '#667eea',
                              color: 'white',
                              borderLeft: '3px solid #4c51bf',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <span>{h}</span>
                              <button
                                style={{
                                  background: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.25rem 0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  color: '#667eea',
                                }}
                                onClick={() => toggleCollapseDay(h)}
                                title={isCollapsed ? 'Tampilkan' : 'Sembunyikan'}
                              >
                                {isCollapsed ? '👁️ Tampil' : '👁️‍🗨️ Hide'}
                              </button>
                            </div>
                          </td>

                          {/* Kolom ruangan dan pukul kosong untuk header */}
                          <td style={{ ...styles.td, backgroundColor: '#667eea' }}></td>
                          {timeSlots.map((slot, idx) => (
                            <td
                              key={`${h}-header-${idx}`}
                              style={{
                                ...styles.td,
                                backgroundColor: '#667eea',
                                height: '0',
                                padding: '0',
                                border: 'none',
                              }}
                            ></td>
                          ))}
                        </tr>

                        {/* Rows untuk ruangan */}
                        {displayRuangan.map((r, ruanganIdx) => (
                          <tr
                            key={`${h}-${r.id}`}
                            style={styles.tableRow}
                          >
                            {/* Kolom Hari - kosong untuk baris ruangan */}
                            {ruanganIdx === 0 && (
                              <td
                                style={{
                                  ...styles.td,
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  backgroundColor: '#f0f7ff',
                                  borderLeft: '3px solid #667eea',
                                  visibility: 'hidden',
                                  padding: '0',
                                  height: '0',
                                }}
                                rowSpan={sortedRuangan.length}
                              ></td>
                            )}

                            {/* Kolom Ruangan */}
                            <td
                              style={{
                                ...styles.td,
                                fontWeight: '500',
                                textAlign: 'left',
                                backgroundColor: '#f5f9ff',
                                fontSize: '0.9rem',
                              }}
                            >
                              {r.f_namaruang}
                            </td>

                            {/* Cells untuk setiap pukul */}
                            {timeSlots.map((slot, slotIdx) => {
                              const entry = getScheduleForCell(h, r.id, slot.start);
                              return (
                                <td
                                  key={`${h}-${r.id}-${slot.start}`}
                                  style={{
                                    ...styles.td,
                                    backgroundColor: slot.isBreak ? '#ffe6e6' : 'white',
                                    cursor: slot.isBreak ? 'default' : 'pointer',
                                    opacity: slot.isBreak ? 0.6 : 1,
                                    minHeight: '80px',
                                    verticalAlign: 'top',
                                    padding: '0.5rem',
                                    border: draggedItem && !slot.isBreak ? '2px dashed #667eea' : '1px solid #e2e8f0',
                                  }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, h, r.id, slot.start, slot.isBreak)}
                                >
                                  {slot.isBreak ? (
                                    <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: '500' }}>
                                      ISTIRAHAT
                                    </span>
                                  ) : entry ? (
                                    <div
                                      style={{
                                        ...styles.scheduleCell,
                                        opacity: draggedItem?.id === entry.id ? 0.5 : 1,
                                        cursor: 'grab',
                                      }}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, entry)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <p style={styles.scheduleCellText}>{entry.isi}</p>
                                      <div style={styles.scheduleCellActions}>
                                        <button
                                          style={styles.btnEdit}
                                          onClick={() => openEditModal(entry)}
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          style={styles.btnDelete}
                                          onClick={() => handleDelete(entry.id)}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#cbd5e0' }}>
                                      + Klik
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL ==================== */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {modalType === 'add' ? '➕ Tambah Jadwal' : '✏️ Edit Jadwal'}
            </h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Hari:</label>
              <select
                value={formData.hari}
                onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                style={styles.input}
              >
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Ruangan:</label>
              <select
                value={formData.ruangan_id}
                onChange={(e) => setFormData({ ...formData, ruangan_id: parseInt(e.target.value) })}
                style={styles.input}
              >
                {ruangan.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.f_namaruang}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Jam Mulai:</label>
                <input
                  type="time"
                  value={formData.jam_mulai}
                  onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                  style={styles.input}
                  disabled={modalType === 'edit'}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Jam Selesai:</label>
                <input
                  type="time"
                  value={formData.jam_selesai}
                  onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            {/* ===== PILIHAN: DARI DATABASE ATAU MANUAL ===== */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Isi Jadwal:</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: !useManualInput ? '#667eea' : '#cbd5e0',
                    color: !useManualInput ? 'white' : '#2d3748',
                  }}
                  onClick={() => setUseManualInput(false)}
                >
                  📚 Pilih dari Database
                </button>
                <button
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: useManualInput ? '#667eea' : '#cbd5e0',
                    color: useManualInput ? 'white' : '#2d3748',
                  }}
                  onClick={() => setUseManualInput(true)}
                >
                  ✏️ Input Manual
                </button>
              </div>

              {!useManualInput ? (
                // PILIHAN DARI DATABASE
                <div>
                  {kelasList.length > 0 ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={styles.label}>Pilih Kelas & Dosen:</label>
                      <select
                        value={formData.isi}
                        onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                        style={styles.input}
                      >
                        <option value="">-- Pilih dari daftar --</option>
                        {kelasList.map(k => {
                          const prodiCode = k.kode_kurikulum || '?';
                          const className = k.nama_kelas || '?';
                          const dosenName = k.dosen || 'TBD';
                          const mkName = k.f_namamk || 'Unknown';
                          const displayText = `${mkName} (${className}-${prodiCode}-${dosenName})`;
                          
                          return (
                            <option key={k.id} value={displayText}>
                              {displayText}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                      ℹ️ Tidak ada data kelas. Gunakan input manual atau tambahkan di menu Kelas terlebih dahulu.
                    </p>
                  )}
                </div>
              ) : (
                // INPUT MANUAL
                <div>
                  <label style={styles.label}>Nama Mata Kuliah (Kelas-Program-Dosen):</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pendidikan Agama (2A-SI-Suprima)"
                    value={formData.isi}
                    onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                    style={styles.input}
                  />
                </div>
              )}
            </div>

            <div style={styles.modalButtons}>
              <button
                style={styles.btnCancel}
                onClick={() => {
                  setShowModal(false);
                  setUseManualInput(false);
                }}
              >
                Batal
              </button>
              <button
                style={styles.btnSave}
                onClick={handleSave}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STYLES ====================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
  },
  card: {
    maxWidth: '1600px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    padding: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '1.5rem',
    borderBottom: '3px solid #667eea',
    paddingBottom: '0.5rem',
    display: 'inline-block',
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontWeight: '500',
  },
  messageSuccess: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    border: '1px solid #9ae6b4',
  },
  messageError: {
    backgroundColor: '#fed7d7',
    color: '#742a2a',
    border: '1px solid #fc8181',
  },
  settingsPanel: {
    backgroundColor: '#f7fafc',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    border: '2px solid #e2e8f0',
  },
  settingsTitle: {
    fontSize: '1.2rem',
    marginBottom: '1rem',
    color: '#2d3748',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#4a5568',
    fontSize: '0.9rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
  },
  infoText: {
    fontSize: '0.9rem',
    color: '#667eea',
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#a0aec0',
  },
  tableWrapper: {
    marginTop: '2rem',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeaderRow: {
    backgroundColor: '#667eea',
    color: 'white',
  },
  tableSubHeaderRow: {
    backgroundColor: '#4c51bf',
    color: 'white',
  },
  th: {
    padding: '1rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.9rem',
    borderRight: '1px solid #e2e8f0',
  },
  thTime: {
    padding: '1rem 0.5rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.75rem',
    borderRight: '1px solid #e2e8f0',
    backgroundColor: '#667eea',
    color: 'white',
    lineHeight: '1.3',
  },
  thSmall: {
    padding: '0.75rem 0.5rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.8rem',
    borderRight: '1px solid #cbd5e0',
  },
  tableRow: {
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '1rem',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
  },
  scheduleCell: {
    backgroundColor: '#f0f7ff',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '2px solid #667eea',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  scheduleCellText: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#2d3748',
    lineHeight: '1.3',
  },
  scheduleCellActions: {
    display: 'flex',
    gap: '0.25rem',
    marginTop: 'auto',
  },
  btnEdit: {
    background: 'none',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    color: '#2d3748',
    borderBottom: '2px solid #667eea',
    paddingBottom: '0.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  btnCancel: {
    flex: 1,
    padding: '0.75rem',
    background: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnSave: {
    flex: 1,
    padding: '0.75rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  toggleBtn: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.3s',
  },
};