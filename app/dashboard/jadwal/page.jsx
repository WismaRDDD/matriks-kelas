'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { colors, globalStyles } from '../../styles/upnvjTheme';

export default function JadwalPage() {
  const [kelasList, setKelasList] = useState([]);
  const [jadwalData, setJadwalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [presets, setPresets] = useState({
    Normal: {
      jamMulai: '07:10',
      durasiSlot: 50,
      jamIstirahatMulaiSeninKamis: '12:10',
      jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiJumat: '11:20',
      jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '17:10',
    },
    Ramadhan: {
      jamMulai: '08:00',
      durasiSlot: 40,
      jamIstirahatMulaiSeninKamis: '12:10',
      jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiJumat: '11:20',
      jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '17:10',
    },
  });

  const [activePreset, setActivePreset] = useState('Normal');
  const [settings, setSettings] = useState(presets.Normal);
  const [visibleDays, setVisibleDays] = useState({
    Senin: true,
    Selasa: true,
    Rabu: true,
    Kamis: true,
    Jumat: true
  });

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionInputMode, setSessionInputMode] = useState('manual');
  const [selectedRuangan, setSelectedRuangan] = useState('');
  const [selectedHari, setSelectedHari] = useState('Senin');
  const [selectedJamMulai, setSelectedJamMulai] = useState('07:10');
  const [calculatedJamSelesai, setCalculatedJamSelesai] = useState('08:00');
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [ruanganList, setRuanganList] = useState([]);
  const [editingSession, setEditingSession] = useState(null);

  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [autoGenSettings, setAutoGenSettings] = useState({
    fillEmptyOnly: true,
    usePreferences: true
  });

  const tableRef = useRef(null);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/jadwal'),
        fetch('/api/ruangan')
      ]);

      const kelas = await kelasRes.json();
      const jadwal = await jadwalRes.json();
      const ruangan = await ruanganRes.json();

      setKelasList(kelas);
      setRuanganList(ruangan);

      const organizedJadwal = {};
      days.forEach(day => {
        organizedJadwal[day] = {};
      });

      jadwal.forEach(j => {
        if (!organizedJadwal[j.hari]) organizedJadwal[j.hari] = {};
        if (!organizedJadwal[j.hari][j.ruangan_id]) {
          organizedJadwal[j.hari][j.ruangan_id] = [];
        }
        organizedJadwal[j.hari][j.ruangan_id].push(j);
      });

      setJadwalData(organizedJadwal);
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedJamMulai(settings.jamMulai);
  }, [settings.durasiSlot, activePreset]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes) => {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  const getBreakTimes = (hari) => {
    const isJumat = hari === 'Jumat';
    return {
      mulai: isJumat ? settings.jamIstirahatMulaiJumat : settings.jamIstirahatMulaiSeninKamis,
      selesai: isJumat ? settings.jamIstirahatSelesaiJumat : settings.jamIstirahatSelesaiSeninKamis,
    };
  };

  const generateTimeSlots = (hari) => {
    const slots = [];
    const mulai = timeToMinutes(settings.jamMulai);
    const selesai = timeToMinutes(settings.jamSelesai);
    const { mulai: breakMulai, selesai: breakSelesai } = getBreakTimes(hari);
    const breakMulaiMin = timeToMinutes(breakMulai);
    const breakSelesaiMin = timeToMinutes(breakSelesai);

    for (let time = mulai; time < selesai; time += settings.durasiSlot) {
      const endTime = time + settings.durasiSlot;
      const isBreak = (time >= breakMulaiMin && time < breakSelesaiMin) ||
                      (time < breakSelesaiMin && endTime > breakMulaiMin);
      
      slots.push({
        start: minutesToTime(time),
        end: minutesToTime(Math.min(endTime, selesai)),
        isBreak,
      });
    }
    return slots;
  };

  const calculateJamSelesai = (jamMulai, sks) => {
    const startMinutes = timeToMinutes(jamMulai);
    const durationMinutes = (sks || 1) * settings.durasiSlot;
    return minutesToTime(startMinutes + durationMinutes);
  };

  const handleAddSession = async () => {
    if (!selectedRuangan || !sessionInput) {
      showMessage('error', 'Pilih ruangan dan isi sesi');
      return;
    }

    try {
      const ruangan = ruanganList.find(r => r.id === parseInt(selectedRuangan));
      const jamSelesai = calculateJamSelesai(selectedJamMulai, 1);
      
      const jadwalPayload = {
        hari: selectedHari,
        ruangan_id: parseInt(selectedRuangan),
        jam_mulai: selectedJamMulai,
        jam_selesai: jamSelesai,
        display_name: sessionInput,
        nama_ruangan: ruangan?.f_namaruang || ''
      };

      const res = await fetch('/api/jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jadwalPayload)
      });

      if (!res.ok) throw new Error('Gagal menyimpan');
      
      showMessage('success', 'Sesi ditambahkan');
      setShowSessionModal(false);
      setSessionInput('');
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDeleteSession = async (jadwalId) => {
    if (!confirm('Hapus sesi ini?')) return;
    try {
      await fetch('/api/jadwal', { method: 'DELETE', body: JSON.stringify({ id: jadwalId }) });
      showMessage('success', 'Sesi dihapus');
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const exportToXLSX = () => {
    showMessage('success', 'Export ke XLSX');
  };

  const exportToPDF = async () => {
    showMessage('success', 'Export ke PDF');
  };

  const exportToJPG = async () => {
    showMessage('success', 'Export ke JPG');
  };

  if (loading) {
    return (
      <div style={localStyles.loadingContainer}>
        <div style={localStyles.spinner}></div>
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div style={localStyles.container}>
      <div style={localStyles.card}>
        <div style={localStyles.header}>
          <div>
            <h1 style={localStyles.title}>📅 Jadwal Kuliah</h1>
            <p style={localStyles.subtitle}>Kelola jadwal perkuliahan</p>
          </div>
          <div style={localStyles.statsBadge}>
            <span style={localStyles.statsNumber}>
              {Object.values(jadwalData).reduce((total, day) => 
                total + Object.values(day).reduce((sum, arr) => sum + (arr?.length || 0), 0), 0
              )}
            </span>
            <span style={localStyles.statsLabel}>Total Sesi</span>
          </div>
        </div>

        {message.text && (
          <div style={{ ...localStyles.message, ...(message.type === 'success' ? localStyles.messageSuccess : localStyles.messageError) }}>
            {message.text}
          </div>
        )}

        <div style={localStyles.panel}>
          <div style={localStyles.panelSection}>
            <h3 style={localStyles.panelTitle}>🎛️ Preset Jadwal</h3>
            <div style={localStyles.presetGroup}>
              {Object.keys(presets).map((presetName) => (
                <button
                  key={presetName}
                  onClick={() => {
                    setActivePreset(presetName);
                    setSettings(presets[presetName]);
                  }}
                  style={{
                    ...localStyles.presetButton,
                    ...(activePreset === presetName ? localStyles.presetButtonActive : {})
                  }}
                >
                  {presetName}
                </button>
              ))}
            </div>
          </div>

          <div style={localStyles.actionButtons}>
            <button style={localStyles.btnPrimary} onClick={() => setShowSessionModal(true)}>
              + Tambah Sesi
            </button>
            <button style={localStyles.btnPurple} onClick={() => setShowAutoGenModal(true)}>
              ⚡ Generate Otomatis
            </button>
            <button style={localStyles.btnGreen} onClick={exportToXLSX}>📊 Export XLSX</button>
            <button style={localStyles.btnRed} onClick={exportToPDF}>📄 Export PDF</button>
            <button style={localStyles.btnOrange} onClick={exportToJPG}>🖼️ Export JPG</button>
          </div>
        </div>

        <div style={localStyles.visibilityPanel}>
          <h3 style={localStyles.panelTitle}>👁️ Tampilkan Hari</h3>
          <div style={localStyles.dayChecklist}>
            {days.map((day) => (
              <label key={day} style={localStyles.checkboxLabel}>
                <input type="checkbox" checked={visibleDays[day]} onChange={(e) => setVisibleDays({ ...visibleDays, [day]: e.target.checked })} />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={localStyles.tableWrapper}>
          <div ref={tableRef}>
            <h2 style={localStyles.tableTitle}>Matriks Jadwal Kuliah</h2>
            {days.map((day) => {
              if (!visibleDays[day]) return null;
              return (
                <div key={day} style={localStyles.daySection}>
                  <div style={localStyles.dayHeader}>
                    <h3 style={localStyles.dayTitle}>{day}</h3>
                  </div>
                  <div style={localStyles.scrollTable}>
                    <table style={localStyles.table}>
                      <thead>
                        <tr style={localStyles.tableHeaderRow}>
                          <th style={localStyles.thRuangan}>Ruangan</th>
                          <th style={localStyles.thSlot}>Slot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ruanganList.map((ruangan) => (
                          <tr key={ruangan.id}>
                            <td style={localStyles.tdRuangan}>{ruangan.f_namaruang}</td>
                            <td style={localStyles.tdSlot}>
                              <button style={localStyles.addButton}>+</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session Modal */}
      {showSessionModal && (
        <div style={localStyles.modalOverlay} onClick={() => setShowSessionModal(false)}>
          <div style={localStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={localStyles.modalHeader}>
              <h2 style={localStyles.modalTitle}>Tambah Sesi</h2>
              <button style={localStyles.modalClose} onClick={() => setShowSessionModal(false)}>×</button>
            </div>
            <div style={localStyles.modalBody}>
              <div style={localStyles.formGroup}>
                <label style={localStyles.label}>Ruangan</label>
                <select value={selectedRuangan} onChange={(e) => setSelectedRuangan(e.target.value)} style={localStyles.select}>
                  <option value="">Pilih Ruangan</option>
                  {ruanganList.map((r) => (
                    <option key={r.id} value={r.id}>{r.f_namaruang}</option>
                  ))}
                </select>
              </div>
              <div style={localStyles.formGroup}>
                <label style={localStyles.label}>Nama Sesi</label>
                <input type="text" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} style={localStyles.input} />
              </div>
              <div style={localStyles.formGroup}>
                <label style={localStyles.label}>Jam Mulai</label>
                <input type="time" value={selectedJamMulai} onChange={(e) => setSelectedJamMulai(e.target.value)} style={localStyles.input} />
              </div>
            </div>
            <div style={localStyles.modalFooter}>
              <button onClick={() => setShowSessionModal(false)} style={localStyles.btnSecondary}>Batal</button>
              <button onClick={handleAddSession} style={localStyles.btnPrimaryModal}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Gen Modal */}
      {showAutoGenModal && (
        <div style={localStyles.modalOverlay} onClick={() => setShowAutoGenModal(false)}>
          <div style={localStyles.modalContentSmall} onClick={(e) => e.stopPropagation()}>
            <div style={localStyles.modalHeader}>
              <h2 style={localStyles.modalTitle}>Generate Otomatis</h2>
              <button style={localStyles.modalClose} onClick={() => setShowAutoGenModal(false)}>×</button>
            </div>
            <div style={localStyles.modalBody}>
              <label style={localStyles.checkboxLabelLarge}>
                <input type="checkbox" checked={autoGenSettings.fillEmptyOnly} onChange={(e) => setAutoGenSettings({ ...autoGenSettings, fillEmptyOnly: e.target.checked })} />
                <span>Isi kelas yang belum dijadwalkan</span>
              </label>
            </div>
            <div style={localStyles.modalFooter}>
              <button onClick={() => setShowAutoGenModal(false)} style={localStyles.btnSecondary}>Batal</button>
              <button onClick={() => {}} style={localStyles.btnPurpleModal}>Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= STYLES =================
const localStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    padding: '2rem',
  },
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#1A2C3E',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748B',
  },
  statsBadge: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    backgroundColor: '#F8FAFC',
    padding: '0.5rem 1rem',
    borderRadius: '40px',
  },
  statsNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#F47C38',
  },
  statsLabel: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    fontWeight: '500',
  },
  messageSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderLeft: '4px solid #10B981',
  },
  messageError: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderLeft: '4px solid #EF4444',
  },
  panel: {
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  panelSection: {
    marginBottom: '1.5rem',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '1rem',
  },
  presetGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  presetButton: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1E293B',
    cursor: 'pointer',
  },
  presetButtonActive: {
    backgroundColor: '#F47C38',
    borderColor: '#F47C38',
    color: 'white',
  },
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  btnPrimary: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#F47C38',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPurple: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#8B5CF6',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnGreen: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnRed: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnOrange: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#F59E0B',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnPrimaryModal: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#F47C38',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPurpleModal: {
    padding: '0.625rem 1.5rem',
    backgroundColor: '#8B5CF6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  visibilityPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  dayChecklist: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  checkboxLabelLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  tableTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '1.5rem',
  },
  daySection: {
    marginBottom: '2rem',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #F47C38',
  },
  dayTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1A2C3E',
  },
  scrollTable: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px',
  },
  tableHeaderRow: {
    backgroundColor: '#F8FAFC',
  },
  thRuangan: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '1px solid #E2E8F0',
    width: '200px',
  },
  thSlot: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '1px solid #E2E8F0',
  },
  tdRuangan: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tdSlot: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #E2E8F0',
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#F47C38',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalContentSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '400px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #E2E8F0',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1A2C3E',
    margin: 0,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748B',
  },
  modalBody: {
    padding: '1.5rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem 1.5rem',
    borderTop: '1px solid #E2E8F0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'uppercase',
  },
  input: {
    padding: '0.625rem 0.875rem',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    width: '100%',
  },
  select: {
    padding: '0.625rem 0.875rem',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    width: '100%',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E2E8F0',
    borderTopColor: '#F47C38',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    button:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(styleSheet);
}