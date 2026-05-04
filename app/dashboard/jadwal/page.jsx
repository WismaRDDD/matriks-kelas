'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { colors, globalStyles } from '@/app/styles/upnvjTheme';

export default function JadwalPage() {
  // ===== STATE MANAGEMENT =====
  const [kelasList, setKelasList] = useState([]);
  const [jadwalData, setJadwalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Time presets
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

  // Session input
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionInputMode, setSessionInputMode] = useState('manual'); // 'manual' or 'import'
  const [selectedRuangan, setSelectedRuangan] = useState('');
  const [selectedHari, setSelectedHari] = useState('Senin');
  const [selectedJamMulai, setSelectedJamMulai] = useState('07:10');
  const [calculatedJamSelesai, setCalculatedJamSelesai] = useState('08:00');
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [ruanganList, setRuanganList] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  // Auto-generation
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [autoGenSettings, setAutoGenSettings] = useState({
    fillEmptyOnly: true,
    usePreferences: true
  });

  const tableRef = useRef(null);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  // ===== FETCH DATA =====
  const fetchData = async () => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/jadwal'),
        fetch('/api/ruangan')
      ]);

      if (!kelasRes.ok || !jadwalRes.ok || !ruanganRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const kelas = await kelasRes.json();
      const jadwal = await jadwalRes.json();
      const ruangan = await ruanganRes.json();

      setKelasList(kelas);
      setRuanganList(ruangan);

      // Organize jadwal by day and ruangan
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
      showMessage('error', `Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update jam_mulai when preset changes
  useEffect(() => {
    setSelectedJamMulai(settings.jamMulai);
    setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1));
  }, [settings.durasiSlot, activePreset]);

  // ===== UTILITIES =====
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
    const endMinutes = startMinutes + durationMinutes;
    return minutesToTime(endMinutes);
  };

  const isSlotOccupied = (hari, ruanganId, slotStart, slotEnd) => {
    const dayData = jadwalData[hari] || {};
    const sessionsInRuangan = dayData[ruanganId] || [];
    
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);

    // Cek apakah slot ini termasuk dalam jadwal yang sudah ada
    return sessionsInRuangan.some(session => {
      const sessionStart = timeToMinutes(session.jam_mulai);
      const sessionEnd = timeToMinutes(session.jam_selesai);
      
      // Slot overlaps dengan session jika:
      // session start < slot end DAN session end > slot start
      return sessionStart < slotEndMin && sessionEnd > slotStartMin;
    });
  };

  const findExistingKelasSchedule = (kelasId) => {
    // Cari apakah kelas sudah dijadwalkan di hari/jam lain
    for (const hari of days) {
      const dayData = jadwalData[hari] || {};
      for (const ruanganId in dayData) {
        const sessions = dayData[ruanganId];
        const found = sessions.find(s => s.kelas_id === kelasId);
        if (found) {
          return {
            found: true,
            hari,
            jamMulai: found.jam_mulai,
            jamSelesai: found.jam_selesai,
            ruangan: ruanganList.find(r => r.id === parseInt(ruanganId))?.f_namaruang || 'Ruangan tidak diketahui'
          };
        }
      }
    }
    return { found: false };
  };

  const isSessionCutByBreak = (hari, jamMulai, jamSelesai, sks = 1) => {
    // Kelas dengan SKS < 2 tidak perlu pengecekan
    if (sks < 2) return false;

    // Dapatkan jam istirahat untuk hari tersebut
    const breakTimes = getBreakTimes(hari);
    const breakStartMin = timeToMinutes(breakTimes.mulai);
    const breakEndMin = timeToMinutes(breakTimes.selesai);

    // Konversi jam mulai dan selesai ke menit
    const sessionStartMin = timeToMinutes(jamMulai);
    const sessionEndMin = timeToMinutes(jamSelesai);

    // Cek apakah session overlap dengan jam istirahat
    // Overlap terjadi jika: sessionStart < breakEnd DAN sessionEnd > breakStart
    return sessionStartMin < breakEndMin && sessionEndMin > breakStartMin;
  };

  // ===== SESSION MANAGEMENT =====
  const handleAddSession = async () => {
    if (!selectedRuangan || !sessionInput) {
      showMessage('error', 'Pilih ruangan dan isi sesi');
      return;
    }

    try {
      const ruangan = ruanganList.find(r => r.id === parseInt(selectedRuangan));
      
      let displayName = '';
      let sks = 1;
      let kelasId = null;

      if (sessionInputMode === 'import') {
        const kelas = kelasList.find(k => k.id === parseInt(sessionInput));
        if (!kelas) {
          showMessage('error', 'Kelas tidak ditemukan');
          return;
        }
        displayName = kelas.display_name || kelas.nama_kelas;
        sks = kelas.sks || kelas.f_sks_kurikulum || 1;
        kelasId = kelas.id;

        // ===== CEK APAKAH KELAS SUDAH DITAMBAHKAN =====
        if (!editingSession) { // Hanya cek jika mode add, bukan edit
          const existingSchedule = findExistingKelasSchedule(kelasId);
          if (existingSchedule.found) {
            showMessage('error', 
              `Kelas "${displayName}" sudah dijadwalkan pada ${existingSchedule.hari} pukul ${existingSchedule.jamMulai}-${existingSchedule.jamSelesai} di ruangan ${existingSchedule.ruangan}`
            );
            return;
          }
        }
      } else {
        displayName = sessionInput;
        sks = 1;
      }

      const jamSelesai = calculateJamSelesai(selectedJamMulai, sks);

      // ===== VALIDASI KONFLIK DI FRONTEND =====
      const dayData = jadwalData[selectedHari] || {};
      const sessionsInRuangan = dayData[parseInt(selectedRuangan)] || [];
      
      const newStart = timeToMinutes(selectedJamMulai);
      const newEnd = timeToMinutes(jamSelesai);

      // Cek apakah ada jadwal yang bentrok (exclude jadwal yang sedang diedit)
      for (const existingSession of sessionsInRuangan) {
        if (editingSession && existingSession.id === editingSession.id) {
          continue; // Skip jadwal yang sedang diedit
        }
        
        const existingStart = timeToMinutes(existingSession.jam_mulai);
        const existingEnd = timeToMinutes(existingSession.jam_selesai);
        
        if (newStart < existingEnd && newEnd > existingStart) {
          showMessage('error', `Jadwal bentrok dengan: ${existingSession.display_name} (${existingSession.jam_mulai}-${existingSession.jam_selesai})`);
          return;
        }
      }

      // ===== VALIDASI KELAS 2+ SKS TIDAK BOLEH TERPOTONG JAM ISTIRAHAT =====
      if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, jamSelesai, sks)) {
        const breakTimes = getBreakTimes(selectedHari);
        showMessage('error', 
          `Kelas dengan ${sks} SKS tidak boleh terpotong jam istirahat (${breakTimes.mulai}-${breakTimes.selesai})`
        );
        return;
      }

      const jadwalPayload = {
        kelas_id: kelasId,
        hari: selectedHari,
        ruangan_id: parseInt(selectedRuangan),
        jam_mulai: selectedJamMulai,
        jam_selesai: jamSelesai,
        display_name: displayName,
        nama_ruangan: ruangan?.f_namaruang || ''
      };

      const endpoint = editingSession
        ? { method: 'PUT', body: { id: editingSession.id, ...jadwalPayload } }
        : { method: 'POST', body: jadwalPayload };

      const res = await fetch('/api/jadwal', {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.body)
      });

      if (!res.ok) {
        const err = await res.json();
        showMessage('error', err.error || 'Gagal menyimpan sesi');
        return;
      }

      showMessage('success', editingSession ? 'Sesi diupdate' : 'Sesi ditambahkan');
      setSessionInput('');
      setEditingSession(null);
      setShowSessionModal(false);
      await fetchData();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    }
  };

  const handleDeleteSession = async (jadwalId) => {
    if (!confirm('Hapus sesi ini?')) return;

    try {
      const res = await fetch('/api/jadwal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jadwalId })
      });

      if (!res.ok) throw new Error('Gagal menghapus');
      showMessage('success', 'Sesi dihapus');
      await fetchData();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    }
  };

  // ===== AUTO-GENERATION =====
  const generateScheduleAuto = async () => {
    try {
      // Ambil data dosen dengan preferences
      const dosenRes = await fetch('/api/dosen');
      const dosenList = await dosenRes.json();

      // Hitung preference level untuk setiap dosen
      const dosenWithLevel = dosenList.map(d => {
        let level = 0;
        if (d.prefer_hari) level += 3;
        if (d.prefer_jam_mulai) level += 2;
        if (d.prefer_lantai) level += 1;
        return { ...d, preferenceLevel: level };
      });

      // Sort by preference level (tertinggi dulu)
      dosenWithLevel.sort((a, b) => b.preferenceLevel - a.preferenceLevel);

      // Generate sesi untuk setiap kelas yang belum dijadwalkan
      const emptyKelas = kelasList.filter(k => {
        const hasSchedule = days.some(day =>
          jadwalData[day] && Object.values(jadwalData[day]).some(arr =>
            arr.some(j => j.kelas_id === k.id)
          )
        );
        return !hasSchedule;
      });

      let generated = 0;
      for (const kelas of emptyKelas) {
        // Cari dosen yang sesuai preferensi
        const preferredDosen = dosenWithLevel[generated % dosenWithLevel.length];
        const hari = autoGenSettings.usePreferences && preferredDosen.prefer_hari
          ? preferredDosen.prefer_hari.split(',')[0].trim()
          : days[generated % 5];

        // Pilih ruangan (dengan preferensi lantai jika ada)
        let ruangan = ruanganList[generated % ruanganList.length];
        if (autoGenSettings.usePreferences && preferredDosen.prefer_lantai) {
          const preferredRuangan = ruanganList.find(
            r => r.f_lantai === parseInt(preferredDosen.prefer_lantai)
          );
          ruangan = preferredRuangan || ruangan;
        }

        const jadwalPayload = {
          kelas_id: kelas.id,
          hari: hari,
          ruangan_id: ruangan.id,
          jam_mulai: preferredDosen.prefer_jam_mulai || '07:00',
          jam_selesai: preferredDosen.prefer_jam_selesai || '12:00',
          dosen_id: preferredDosen.id,
          display_name: kelas.display_name || kelas.nama_kelas
        };

        const res = await fetch('/api/jadwal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jadwalPayload)
        });

        if (res.ok) generated++;
      }

      showMessage('success', `${generated} sesi berhasil dibuat otomatis`);
      setShowAutoGenModal(false);
      await fetchData();
    } catch (err) {
      showMessage('error', `Error generating schedule: ${err.message}`);
    }
  };

  // ===== EXPORT FUNCTIONS =====
  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();

    days.forEach((day) => {
      if (!visibleDays[day]) return;

      const timeSlots = generateTimeSlots(day);
      const dayData = jadwalData[day] || {};
      
      const wsData = [];
      
      // Title
      wsData.push([`JADWAL KULIAH - ${day}`]);
      wsData.push([`Preset: ${activePreset}`]);
      wsData.push([]);
      
      // Header row
      const headerRow = ['Ruangan'];
      timeSlots.forEach(slot => {
        headerRow.push(`${slot.start}-${slot.end}`);
      });
      wsData.push(headerRow);
      
      // Data rows (sorted by ruangan name A-Z)
      const sortedRuangan = [...ruanganList].sort((a, b) => 
        (a.f_namaruang || '').localeCompare(b.f_namaruang || '')
      );
      
      sortedRuangan.forEach(ruangan => {
        const row = [ruangan.f_namaruang];
        const sessions = dayData[ruangan.id] || [];
        
        timeSlots.forEach(slot => {
          // Find session yang ocuppy slot ini (bisa multi-slot)
          const occupyingSession = sessions.find(s => {
            const sessionStartMin = timeToMinutes(s.jam_mulai);
            const sessionEndMin = timeToMinutes(s.jam_selesai);
            const slotStartMin = timeToMinutes(slot.start);
            const slotEndMin = timeToMinutes(slot.end);
            return sessionStartMin < slotEndMin && sessionEndMin > slotStartMin;
          });
          
          if (occupyingSession) {
            row.push(occupyingSession.display_name);
          } else if (slot.isBreak) {
            row.push('ISTIRAHAT');
          } else {
            row.push('');
          }
        });
        
        wsData.push(row);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [{ wch: 20 }, ...timeSlots.map(() => ({ wch: 14 }))];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, day);
    });

    XLSX.writeFile(wb, `jadwal_kuliah_${new Date().toISOString().split('T')[0]}.xlsx`);
    showMessage('success', 'Jadwal diexport ke XLSX');
  };

  const exportToPDF = async () => {
    try {
      const element = tableRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`jadwal_kuliah_${new Date().toISOString().split('T')[0]}.pdf`);
      showMessage('success', 'Jadwal diexport ke PDF');
    } catch (err) {
      showMessage('error', `Error exporting PDF: ${err.message}`);
    }
  };

  const exportToJPG = async () => {
    try {
      const element = tableRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.download = `jadwal_kuliah_${new Date().toISOString().split('T')[0]}.jpg`;
      link.click();
      showMessage('success', 'Jadwal diexport ke JPG');
    } catch (err) {
      showMessage('error', `Error exporting JPG: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const styles = {
    container: globalStyles.container,
    card: globalStyles.card,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    title: globalStyles.title,
    subtitle: globalStyles.subtitle,
    message: globalStyles.message,
    messageSuccess: globalStyles.messageSuccess,
    messageError: globalStyles.messageError,
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📅 Jadwal Kuliah</h1>
            <p style={styles.subtitle}>Kelola jadwal kuliah dengan mudah</p>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            style={{
              ...styles.message,
              ...(message.type === 'success' ? styles.messageSuccess : styles.messageError),
            }}
          >
            {message.type === 'success' ? '✓' : '✗'} {message.text}
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎛️ Preset Jadwal</h3>
            <div className="flex flex-wrap gap-3">
              {Object.keys(presets).map((presetName) => (
                <button
                  key={presetName}
                  onClick={() => {
                    setActivePreset(presetName);
                    setSettings(presets[presetName]);
                    showMessage('success', `Preset ${presetName} diterapkan`);
                  }}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activePreset === presetName
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {presetName}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Jam Mulai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Mulai
              </label>
              <input
                type="time"
                value={settings.jamMulai}
                onChange={(e) =>
                  setSettings({ ...settings, jamMulai: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Durasi Slot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durasi per Slot (menit)
              </label>
              <input
                type="number"
                value={settings.durasiSlot}
                onChange={(e) =>
                  setSettings({ ...settings, durasiSlot: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="10"
                max="120"
              />
            </div>

            {/* Jam Istirahat Senin-Kamis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Istirahat Senin-Kamis
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={settings.jamIstirahatMulaiSeninKamis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatMulaiSeninKamis: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <span className="flex items-center">-</span>
                <input
                  type="time"
                  value={settings.jamIstirahatSelesaiSeninKamis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatSelesaiSeninKamis: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Jam Istirahat Jumat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Istirahat Jumat
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={settings.jamIstirahatMulaiJumat}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatMulaiJumat: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <span className="flex items-center">-</span>
                <input
                  type="time"
                  value={settings.jamIstirahatSelesaiJumat}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatSelesaiJumat: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Jam Selesai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Selesai
              </label>
              <input
                type="time"
                value={settings.jamSelesai}
                onChange={(e) =>
                  setSettings({ ...settings, jamSelesai: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowSessionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Tambah Sesi
            </button>
            <button
              onClick={() => setShowAutoGenModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ⚡ Generate Otomatis
            </button>
            <button
              onClick={exportToXLSX}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📊 Export XLSX
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              📄 Export PDF
            </button>
            <button
              onClick={exportToJPG}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              🖼️ Export JPG
            </button>
          </div>
        </div>

        {/* Day Visibility Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Tampilkan/Sembunyikan Hari</h3>
          <div className="flex flex-wrap gap-3">
            {days.map((day) => (
              <label key={day} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleDays[day]}
                  onChange={(e) =>
                    setVisibleDays({ ...visibleDays, [day]: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-gray-700">{day}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Jadwal Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div ref={tableRef} className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Matriks Jadwal Kuliah</h2>

            {days.map((day) => {
              if (!visibleDays[day]) return null;

              const dayData = jadwalData[day] || {};
              const timeSlots = generateTimeSlots(day);

              return (
                <div key={day} className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{day}</h3>
                    <span className="text-sm text-gray-500">
                      {Object.values(dayData).flat().length} sesi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 table-fixed">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left w-32">Ruangan</th>
                          {timeSlots.map((slot, idx) => (
                            <th
                              key={idx}
                              className={`border border-gray-300 px-2 py-2 text-center text-xs w-24 h-20 ${
                                slot.isBreak ? 'bg-yellow-100' : 'bg-blue-50'
                              }`}
                            >
                              <div>{slot.start}</div>
                              <div className="text-xs">-</div>
                              <div>{slot.end}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((ruangan) => (
                          <tr key={ruangan.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium w-32">
                              {ruangan.f_namaruang}
                            </td>
                            {timeSlots.map((slot, idx) => {
                              const sessions = dayData[ruangan.id] || [];
                              const sessionInSlot = sessions.find(
                                (s) =>
                                  s.jam_mulai === slot.start &&
                                  s.jam_selesai === slot.end
                              );
                              
                              // Check if slot is occupied by any session (including multi-slot sessions)
                              const isOccupied = isSlotOccupied(day, ruangan.id, slot.start, slot.end);
                              const occupyingSession = sessions.find(
                                (s) => {
                                  const sessionStart = timeToMinutes(s.jam_mulai);
                                  const sessionEnd = timeToMinutes(s.jam_selesai);
                                  const slotStart = timeToMinutes(slot.start);
                                  const slotEnd = timeToMinutes(slot.end);
                                  return sessionStart < slotEnd && sessionEnd > slotStart;
                                }
                              );

                              return (
                                <td
                                  key={idx}
                                  className={`border border-gray-300 px-2 py-2 text-center text-xs h-24 w-24 relative ${
                                    slot.isBreak
                                      ? 'bg-yellow-50'
                                      : isOccupied
                                        ? 'bg-green-100'
                                        : 'bg-white hover:bg-blue-50'
                                  }`}
                                  onDragOver={slot.isBreak || isOccupied ? undefined : (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                  onDrop={slot.isBreak || isOccupied ? undefined : (e) => {
                                    e.preventDefault();
                                    if (draggedItem) {
                                      setDraggedItem(null);
                                    }
                                  }}
                                >
                                  {slot.isBreak ? (
                                    <div className="text-yellow-700 font-semibold">ISTIRAHAT</div>
                                  ) : sessionInSlot ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-1 group">
                                      <div className="font-semibold text-gray-900 text-xs mb-1 text-center break-words">
                                        {sessionInSlot.display_name}
                                      </div>
                                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => {
                                            setEditingSession(sessionInSlot);
                                            setSessionInput(
                                              sessionInputMode === 'import' 
                                                ? sessionInSlot.kelas_id?.toString() 
                                                : sessionInSlot.display_name
                                            );
                                            setSelectedHari(day);
                                            setSelectedRuangan(ruangan.id);
                                            setSelectedJamMulai(sessionInSlot.jam_mulai);
                                            setCalculatedJamSelesai(sessionInSlot.jam_selesai);
                                            if (sessionInSlot.kelas_id) {
                                              const kelas = kelasList.find(k => k.id === sessionInSlot.kelas_id);
                                              setSelectedKelas(kelas);
                                              setSessionInputMode('import');
                                              setSessionInput(sessionInSlot.kelas_id.toString());
                                            } else {
                                              setSessionInputMode('manual');
                                            }
                                            setShowSessionModal(true);
                                          }}
                                          className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600"
                                          title="Edit sesi ini"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSession(sessionInSlot.id)}
                                          className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600"
                                          title="Hapus sesi ini"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  ) : isOccupied && occupyingSession ? (
                                    <div 
                                      className="w-full h-full flex flex-col items-center justify-center p-1 text-gray-500 text-xs group cursor-pointer hover:bg-green-200"
                                      onClick={() => {
                                        setEditingSession(occupyingSession);
                                        setSessionInput(
                                          occupyingSession.kelas_id?.toString() || occupyingSession.display_name
                                        );
                                        setSelectedHari(day);
                                        setSelectedRuangan(ruangan.id);
                                        setSelectedJamMulai(occupyingSession.jam_mulai);
                                        setCalculatedJamSelesai(occupyingSession.jam_selesai);
                                        if (occupyingSession.kelas_id) {
                                          const kelas = kelasList.find(k => k.id === occupyingSession.kelas_id);
                                          setSelectedKelas(kelas);
                                          setSessionInputMode('import');
                                          setSessionInput(occupyingSession.kelas_id.toString());
                                        } else {
                                          setSessionInputMode('manual');
                                        }
                                        setShowSessionModal(true);
                                      }}
                                      title="Klik untuk edit sesi ini"
                                    >
                                      <span className="italic opacity-70">({occupyingSession.display_name})</span>
                                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSession(occupyingSession);
                                            setSessionInput(
                                              occupyingSession.kelas_id?.toString() || occupyingSession.display_name
                                            );
                                            setSelectedHari(day);
                                            setSelectedRuangan(ruangan.id);
                                            setSelectedJamMulai(occupyingSession.jam_mulai);
                                            setCalculatedJamSelesai(occupyingSession.jam_selesai);
                                            if (occupyingSession.kelas_id) {
                                              const kelas = kelasList.find(k => k.id === occupyingSession.kelas_id);
                                              setSelectedKelas(kelas);
                                              setSessionInputMode('import');
                                              setSessionInput(occupyingSession.kelas_id.toString());
                                            } else {
                                              setSessionInputMode('manual');
                                            }
                                            setShowSessionModal(true);
                                          }}
                                          className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600"
                                          title="Edit sesi ini"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(occupyingSession.id);
                                          }}
                                          className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600"
                                          title="Hapus sesi ini"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedHari(day);
                                        setSelectedRuangan(ruangan.id);
                                        setSelectedJamMulai(slot.start);
                                        setCalculatedJamSelesai(calculateJamSelesai(slot.start, 1));
                                        setSessionInput('');
                                        setSelectedKelas(null);
                                        setEditingSession(null);
                                        setShowSessionModal(true);
                                      }}
                                      className="w-full h-full flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded text-lg font-bold transition-all"
                                      title="Tambah sesi ke slot ini"
                                    >
                                      +
                                    </button>
                                  )}
                                </td>
                              );
                            })}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingSession ? 'Edit Sesi' : 'Tambah Sesi'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hari</label>
                <input
                  type="text"
                  value={selectedHari}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ruangan</label>
                <select
                  value={selectedRuangan}
                  onChange={(e) => setSelectedRuangan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Pilih Ruangan</option>
                  {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.f_namaruang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mode Input</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="manual"
                      checked={sessionInputMode === 'manual'}
                      onChange={(e) => setSessionInputMode(e.target.value)}
                    />
                    Manual
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="import"
                      checked={sessionInputMode === 'import'}
                      onChange={(e) => setSessionInputMode(e.target.value)}
                    />
                    Import dari Kelas
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                {/* Jam Mulai */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Jam Mulai</label>
                  {selectedRuangan && selectedHari ? (
                    <select
                      value={selectedJamMulai}
                      onChange={(e) => {
                        setSelectedJamMulai(e.target.value);
                        if (selectedKelas) {
                          const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                          setCalculatedJamSelesai(calculateJamSelesai(e.target.value, sks));
                        } else {
                          setCalculatedJamSelesai(calculateJamSelesai(e.target.value, 1));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Pilih Jam</option>
                      {generateTimeSlots(selectedHari).map((slot, idx) => {
                        const isOccupied = isSlotOccupied(selectedHari, parseInt(selectedRuangan), slot.start, slot.end);
                        const isBreak = slot.isBreak;
                        if (isOccupied || isBreak) return null;
                        return (
                          <option key={idx} value={slot.start}>
                            {slot.start} - {slot.end}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="time"
                      value={selectedJamMulai}
                      onChange={(e) => {
                        setSelectedJamMulai(e.target.value);
                        if (selectedKelas) {
                          const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                          setCalculatedJamSelesai(calculateJamSelesai(e.target.value, sks));
                        } else {
                          setCalculatedJamSelesai(calculateJamSelesai(e.target.value, 1));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Pilih ruangan & hari terlebih dahulu"
                    />
                  )}
                </div>

                {/* Jam Selesai */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Jam Selesai (Otomatis)
                  </label>
                  <input
                    type="time"
                    value={calculatedJamSelesai}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg"
                  />

                  {selectedKelas && (
                    <small className="text-gray-600 text-xs mt-1 block">
                      📊 {selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1} SKS × {settings.durasiSlot} menit
                    </small>
                  )}
                </div>
              </div>

              {/* WARNING jika kelas 2+ SKS terpotong jam istirahat */}
              {selectedKelas && (() => {
                const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks)) {
                  const breakTimes = getBreakTimes(selectedHari);
                  return (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">❌ Jadwal Tidak Valid</p>
                      <p className="text-xs text-red-700">
                        Kelas dengan <strong>{sks} SKS</strong> tidak boleh terpotong jam istirahat 
                        <br />
                        <strong>{breakTimes.mulai}-{breakTimes.selesai}</strong>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-sm font-medium mb-2">
                  {sessionInputMode === 'manual' ? 'Nama Sesi' : 'Pilih Kelas'}
                </label>
                {sessionInputMode === 'manual' ? (
                  <input
                    type="text"
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    placeholder="Contoh: Algoritma & Struktur Data"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <>
                    <select
                      value={sessionInput}
                      onChange={(e) => {
                        setSessionInput(e.target.value);
                        const kelas = kelasList.find(k => k.id === parseInt(e.target.value));
                        if (kelas) {
                          setSelectedKelas(kelas);
                          const sks = kelas.sks || kelas.f_sks_kurikulum || 1;
                          setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, sks));
                        } else {
                          setSelectedKelas(null);
                          setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, 1));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.display_name || k.nama_kelas} (SKS: {k.sks || k.f_sks_kurikulum})
                        </option>
                      ))}
                    </select>
                    
                    {/* Info jika kelas sudah ditambahkan */}
                    {selectedKelas && !editingSession && (() => {
                      const existingSchedule = findExistingKelasSchedule(selectedKelas.id);
                      return existingSchedule.found ? (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Kelas sudah dijadwalkan</p>
                          <p className="text-xs text-yellow-700">
                            <strong>{existingSchedule.hari}</strong> pukul <strong>{existingSchedule.jamMulai}-{existingSchedule.jamSelesai}</strong>
                            <br />
                            di ruangan <strong>{existingSchedule.ruangan}</strong>
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSessionModal(false);
                  setSessionInput('');
                  setEditingSession(null);
                  setSelectedKelas(null);
                  setSessionInputMode('manual');
                  setSelectedJamMulai(settings.jamMulai);
                  setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1));
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleAddSession}
                disabled={
                  (() => {
                    // Cek duplikasi kelas
                    const isDuplicate = sessionInputMode === 'import' && 
                      selectedKelas && 
                      !editingSession && 
                      findExistingKelasSchedule(selectedKelas.id).found;
                    
                    // Cek jam istirahat terpotong
                    const isCutByBreak = selectedKelas && (() => {
                      const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                      return sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks);
                    })();
                    
                    return isDuplicate || isCutByBreak;
                  })()
                }
                className={`flex-1 px-4 py-2 rounded-lg ${
                  (() => {
                    // Cek duplikasi kelas
                    const isDuplicate = sessionInputMode === 'import' && 
                      selectedKelas && 
                      !editingSession && 
                      findExistingKelasSchedule(selectedKelas.id).found;
                    
                    // Cek jam istirahat terpotong
                    const isCutByBreak = selectedKelas && (() => {
                      const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                      return sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks);
                    })();
                    
                    if (isDuplicate || isCutByBreak) {
                      return 'bg-gray-400 text-gray-600 cursor-not-allowed';
                    }
                    return 'bg-blue-600 text-white hover:bg-blue-700';
                  })()
                }`}
                title={
                  (() => {
                    // Cek duplikasi kelas
                    const isDuplicate = sessionInputMode === 'import' && 
                      selectedKelas && 
                      !editingSession && 
                      findExistingKelasSchedule(selectedKelas.id).found;
                    
                    // Cek jam istirahat terpotong
                    const isCutByBreak = selectedKelas && (() => {
                      const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                      return sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks);
                    })();
                    
                    if (isDuplicate) return 'Kelas ini sudah ditambahkan sebelumnya';
                    if (isCutByBreak) return 'Kelas tidak boleh terpotong jam istirahat';
                    return '';
                  })()
                }
              >
                {editingSession ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Generation Modal */}
      {showAutoGenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Generate Jadwal Otomatis</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoGenSettings.fillEmptyOnly}
                  onChange={(e) =>
                    setAutoGenSettings({
                      ...autoGenSettings,
                      fillEmptyOnly: e.target.checked
                    })
                  }
                />
                <span>Isi hanya kelas yang belum dijadwalkan</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoGenSettings.usePreferences}
                  onChange={(e) =>
                    setAutoGenSettings({
                      ...autoGenSettings,
                      usePreferences: e.target.checked
                    })
                  }
                />
                <span>Gunakan preferensi dosen</span>
              </label>

              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                Sistem akan membuat jadwal berdasarkan preferensi dosen dan
                ketersediaan ruangan.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAutoGenModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={generateScheduleAuto}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
