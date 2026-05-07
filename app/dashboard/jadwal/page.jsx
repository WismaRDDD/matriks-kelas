'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
      jamIstirahatMulaiSabtu: '12:10',
      jamIstirahatSelesaiSabtu: '13:00',
      jamIstirahatMulaiJumat: '11:20',
      jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '18:00',
    },
    Ramadhan: {
      jamMulai: '08:00',
      durasiSlot: 40,
      jamIstirahatMulaiSeninKamis: '12:10',
      jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiSabtu: '12:10',
      jamIstirahatSelesaiSabtu: '13:00',
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
    Jumat: true,
    Sabtu: true
  });

  // Session input
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionInputMode, setSessionInputMode] = useState('import'); // 'manual' or 'import'
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

  // Preset management
  const [showPresetsSection, setShowPresetsSection] = useState(true);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [databasePresets, setDatabasePresets] = useState([]);
  const [presetSaving, setPresetSaving] = useState(false);

  // Filter states
  const [tahunAkademikList, setTahunAkademikList] = useState([]);
  const [selectedTahunAkademik, setSelectedTahunAkademik] = useState('');
  const [kurikulumList, setKurikulumList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('Gasal');

  const tableRef = useRef(null);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const semesters = ['Gasal', 'Genap'];

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
    fetchTahunAkademik();
    fetchPresets();
  }, []);

  // Fetch presets dari database dan set default preset
  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/preset');
      const data = await res.json();
      setDatabasePresets(data);
      
      // Cari preset yang marked as default
      const defaultPreset = data.find(p => p.is_default);
      if (defaultPreset) {
        setActivePreset(defaultPreset.nama_preset);
        setSettings({
          jamMulai: defaultPreset.jam_mulai,
          durasiSlot: defaultPreset.durasi_slot,
          jamIstirahatMulaiSeninKamis: defaultPreset.jam_istirahat_mulai_senin_kamis,
          jamIstirahatSelesaiSeninKamis: defaultPreset.jam_istirahat_selesai_senin_kamis,
          jamIstirahatMulaiSabtu: defaultPreset.jam_istirahat_mulai_sabtu,
          jamIstirahatSelesaiSabtu: defaultPreset.jam_istirahat_selesai_sabtu,
          jamIstirahatMulaiJumat: defaultPreset.jam_istirahat_mulai_jumat,
          jamIstirahatSelesaiJumat: defaultPreset.jam_istirahat_selesai_jumat,
          jamSelesai: defaultPreset.jam_selesai,
        });
      }
    } catch (error) {
      console.warn('Gagal fetch presets dari database:', error.message);
    }
  };

  // Simpan preset baru ke database
  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      showMessage('error', 'Nama preset tidak boleh kosong');
      return;
    }

    if (databasePresets.some(p => p.nama_preset.toLowerCase() === newPresetName.toLowerCase())) {
      showMessage('error', 'Preset dengan nama ini sudah ada');
      return;
    }

    try {
      setPresetSaving(true);
      const res = await fetch('/api/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_preset: newPresetName,
          jam_mulai: settings.jamMulai,
          durasiSlot: settings.durasiSlot,
          jamIstirahatMulaiSeninKamis: settings.jamIstirahatMulaiSeninKamis,
          jamIstirahatSelesaiSeninKamis: settings.jamIstirahatSelesaiSeninKamis,
          jamIstirahatMulaiSabtu: settings.jamIstirahatMulaiSabtu,
          jamIstirahatSelesaiSabtu: settings.jamIstirahatSelesaiSabtu,
          jamIstirahatMulaiJumat: settings.jamIstirahatMulaiJumat,
          jamIstirahatSelesaiJumat: settings.jamIstirahatSelesaiJumat,
          jamSelesai: settings.jamSelesai,
          is_default: true,
        })
      });

      const result = await res.json();

      if (!res.ok) {
        showMessage('error', result.error || 'Gagal menyimpan preset');
        return;
      }

      showMessage('success', `Preset "${newPresetName}" berhasil disimpan dan menjadi preset default`);
      setNewPresetName('');
      setShowSavePresetModal(false);
      await fetchPresets();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    } finally {
      setPresetSaving(false);
    }
  };

  // Delete preset dari database
  const handleDeletePreset = async (presetId, presetName) => {
    if (!confirm(`Hapus preset "${presetName}"?`)) return;

    try {
      const res = await fetch('/api/preset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: presetId })
      });

      const result = await res.json();

      if (!res.ok) {
        showMessage('error', result.error || 'Gagal menghapus preset');
        return;
      }

      showMessage('success', `Preset "${presetName}" berhasil dihapus`);
      await fetchPresets();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    }
  };

  // Set preset sebagai default
  const handleSetAsDefault = async (presetId, presetName) => {
    try {
      const res = await fetch('/api/preset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: presetId,
          set_as_default: true
        })
      });

      const result = await res.json();

      if (!res.ok) {
        showMessage('error', result.error || 'Gagal mengubah default preset');
        return;
      }

      showMessage('success', `Preset "${presetName}" menjadi preset default`);
      await fetchPresets();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    }
  };

  // Update perubahan preset ke database
  const handleUpdatePreset = async () => {
    const currentPreset = databasePresets.find(p => p.nama_preset === activePreset);
    
    if (!currentPreset) {
      showMessage('error', 'Preset harus dipilih dari database untuk diupdate');
      return;
    }

    try {
      const res = await fetch('/api/preset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPreset.id,
          jam_mulai: settings.jamMulai,
          durasiSlot: settings.durasiSlot,
          jamIstirahatMulaiSeninKamis: settings.jamIstirahatMulaiSeninKamis,
          jamIstirahatSelesaiSeninKamis: settings.jamIstirahatSelesaiSeninKamis,
          jamIstirahatMulaiSabtu: settings.jamIstirahatMulaiSabtu,
          jamIstirahatSelesaiSabtu: settings.jamIstirahatSelesaiSabtu,
          jamIstirahatMulaiJumat: settings.jamIstirahatMulaiJumat,
          jamIstirahatSelesaiJumat: settings.jamIstirahatSelesaiJumat,
          jamSelesai: settings.jamSelesai,
        })
      });

      const result = await res.json();

      if (!res.ok) {
        showMessage('error', result.error || 'Gagal mengupdate preset');
        return;
      }

      showMessage('success', `Preset "${activePreset}" berhasil diupdate`);
      await fetchPresets();
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    }
  };

  // Check jika ada perubahan pada preset yang sedang aktif
  const hasPresetChanges = () => {
    const currentPreset = databasePresets.find(p => p.nama_preset === activePreset);
    
    if (!currentPreset) return false;

    return (
      settings.jamMulai !== currentPreset.jam_mulai ||
      settings.durasiSlot !== currentPreset.durasi_slot ||
      settings.jamIstirahatMulaiSeninKamis !== currentPreset.jam_istirahat_mulai_senin_kamis ||
      settings.jamIstirahatSelesaiSeninKamis !== currentPreset.jam_istirahat_selesai_senin_kamis ||
      settings.jamIstirahatMulaiSabtu !== currentPreset.jam_istirahat_mulai_sabtu ||
      settings.jamIstirahatSelesaiSabtu !== currentPreset.jam_istirahat_selesai_sabtu ||
      settings.jamIstirahatMulaiJumat !== currentPreset.jam_istirahat_mulai_jumat ||
      settings.jamIstirahatSelesaiJumat !== currentPreset.jam_istirahat_selesai_jumat ||
      settings.jamSelesai !== currentPreset.jam_selesai
    );
  };

  // Fetch tahun akademik
  const fetchTahunAkademik = async () => {
    try {
      const res = await fetch('/api/tahun-akademik');
      const data = await res.json();
      setTahunAkademikList(data);
    } catch (error) {
      showMessage('error', 'Gagal fetch tahun akademik');
    }
  };

  // Fetch kurikulum berdasarkan tahun akademik
  const fetchKurikulum = async (tahunId) => {
    if (!tahunId) {
      setKurikulumList([]);
      return;
    }
    try {
      const res = await fetch('/api/kurikulum-master');
      const data = await res.json();
      const filtered = data.filter((k) => String(k.f_tahun_akademik) === String(tahunId));
      setKurikulumList(filtered);
    } catch (error) {
      showMessage('error', 'Gagal fetch kurikulum data');
    }
  };

  // Helper function to convert Gasal/Genap to semester numbers
  const getSemesterNumbers = (semesterLabel) => {
    // Gasal (odd): 1, 3, 5, 7, 9, ...
    // Genap (even): 2, 4, 6, 8, 10, ...
    if (semesterLabel === 'Gasal') {
      return [1, 3, 5, 7, 9];
    } else if (semesterLabel === 'Genap') {
      return [2, 4, 6, 8, 10];
    }
    return [];
  };

  // Fetch kelas dan jadwal berdasarkan semester dari semua kurikulum
  const fetchKelasAndJadwalBySemester = async (tahunId, semester) => {
    try {
      setLoading(true);
      // Fetch all kelas and jadwal
      const [kelasRes, jadwalRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/jadwal')
      ]);

      if (!kelasRes.ok || !jadwalRes.ok) {
        console.warn('Failed to fetch kelas and jadwal');
        return;
      }

      let kelas = await kelasRes.json();
      let jadwal = await jadwalRes.json();

      // Convert semester label (Gasal/Genap) to numbers
      const semesterNumbers = getSemesterNumbers(semester);

      // Filter kelas by kurikulum that has the selected tahun akademik and semester
      kelas = kelas.filter(k => {
        const kurikulum = kurikulumList.find(ku => ku.id === k.f_kurikulum);
        const kSemester = Number(k.semester);
        return kurikulum && 
               String(kurikulum.f_tahun_akademik) === String(tahunId) && 
               semesterNumbers.includes(kSemester);
      });

      // Filter jadwal to only include kelas from filtered list
      const kelasIds = kelas.map(k => k.id);
      jadwal = jadwal.filter(j => kelasIds.includes(j.f_kelas));

      setKelasList(kelas);

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
      console.warn('Error fetching filtered data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle tahun akademik change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchKurikulum(selectedTahunAkademik);
    setSelectedSemester('Gasal');
  }, [selectedTahunAkademik]);

  // Fetch kelas dan jadwal ketika semester dipilih
  useEffect(() => {
    if (selectedTahunAkademik && selectedSemester) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchKelasAndJadwalBySemester(selectedTahunAkademik, selectedSemester);
    } else {
      setKelasList([]);
      setJadwalData({});
    }
  }, [selectedTahunAkademik, selectedSemester]);

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
    const isSabtu = hari === 'Sabtu';
    return {
      mulai: isJumat ? settings.jamIstirahatMulaiJumat : (isSabtu ? settings.jamIstirahatMulaiSabtu : settings.jamIstirahatMulaiSeninKamis),
      selesai: isJumat ? settings.jamIstirahatSelesaiJumat : (isSabtu ? settings.jamIstirahatSelesaiSabtu : settings.jamIstirahatSelesaiSeninKamis),
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

  // Check untuk overlapping sessions dengan kelas yang sudah ada
  const findOverlappingSession = (hari, ruanganId, jamMulai, jamSelesai) => {
    const dayData = jadwalData[hari] || {};
    const sessionsInRuangan = dayData[parseInt(ruanganId)] || [];
    
    const newStart = timeToMinutes(jamMulai);
    const newEnd = timeToMinutes(jamSelesai);

    for (const existingSession of sessionsInRuangan) {
      // Skip if editing same session
      if (editingSession && existingSession.id === editingSession.id) continue;
      
      const existingStart = timeToMinutes(existingSession.jam_mulai);
      const existingEnd = timeToMinutes(existingSession.jam_selesai);
      
      // Overlap terjadi jika: newStart < existingEnd DAN newEnd > existingStart
      if (newStart < existingEnd && newEnd > existingStart) {
        return {
          found: true,
          conflictName: existingSession.display_name,
          conflictTime: `${existingSession.jam_mulai}-${existingSession.jam_selesai}`
        };
      }
    }
    
    return { found: false };
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
      const dosenMap = {};
      dosenList.forEach(d => {
        let level = 0;
        if (d.prefer_hari) level += 3;
        if (d.prefer_jam_mulai) level += 2;
        if (d.prefer_lantai) level += 1;
        dosenMap[d.id] = { ...d, preferenceLevel: level };
      });

      // Ambil kelas yang belum dijadwalkan
      const emptyKelas = kelasList.filter(k => {
        const hasSchedule = days.some(day =>
          jadwalData[day] && Object.values(jadwalData[day]).some(arr =>
            arr.some(j => j.kelas_id === k.id)
          )
        );
        return !hasSchedule;
      });

      // Tambah preference level ke setiap kelas berdasarkan dosennya
      const kelasWithPreference = emptyKelas.map(k => {
        const dosen = k.f_dosen ? dosenMap[k.f_dosen] : null;
        return {
          ...k,
          preferenceLevel: dosen ? dosen.preferenceLevel : 0,
          dosenData: dosen
        };
      });

      // Sort: priority dosen dengan preference tinggi dulu, baru kelas tanpa preference
      kelasWithPreference.sort((a, b) => b.preferenceLevel - a.preferenceLevel);

      let generated = 0;
      let skipped = 0;

      // Function untuk schedule kelas dengan try-all combinations
      const scheduleKelas = async (kelas, dosenData) => {
        const sks = kelas.sks || kelas.f_sks_kurikulum || 1;

        // Jika ada preferensi dosen, coba kombinasi yang sesuai preferensi dulu
        let hariList = days;
        let ruanganList_ = ruanganList;
        let jamMulaiList = [];

        // Generate semua slot waktu
        let allTimeSlots = [];
        let currentMinutes = timeToMinutes(settings.jamMulai);
        const endMinutes = timeToMinutes(settings.jamSelesai);
        const slotDuration = settings.durasiSlot || 60;
        
        while (currentMinutes < endMinutes) {
          allTimeSlots.push(minutesToTime(currentMinutes));
          currentMinutes += slotDuration;
        }

        if (dosenData && autoGenSettings.usePreferences) {
          // Prioritas hari sesuai preferensi
          if (dosenData.prefer_hari) {
            const preferredHari = dosenData.prefer_hari.split(',').map(h => h.trim());
            hariList = [
              ...preferredHari.filter(h => days.includes(h)),
              ...days.filter(h => !preferredHari.includes(h))
            ];
          }

          // Prioritas ruangan sesuai lantai
          if (dosenData.prefer_lantai) {
            const preferredLantai = parseInt(dosenData.prefer_lantai);
            ruanganList_ = [
              ...ruanganList.filter(r => r.f_lantai === preferredLantai),
              ...ruanganList.filter(r => r.f_lantai !== preferredLantai)
            ];
          }

          // Prioritas jam sesuai preferensi
          if (dosenData.prefer_jam_mulai) {
            jamMulaiList = [
              dosenData.prefer_jam_mulai,
              ...allTimeSlots.filter(t => t !== dosenData.prefer_jam_mulai)
            ];
          } else {
            jamMulaiList = allTimeSlots;
          }
        } else {
          // Jika tidak ada dosen/preferensi, gunakan semua slot
          jamMulaiList = allTimeSlots;
        }

        // Try-all combinations untuk menemukan slot yang cocok
        for (const hari of hariList) {
          for (const jamMulai of jamMulaiList) {
            const jamSelesai = calculateJamSelesai(jamMulai, sks);

            // Skip jika jam selesai melebihi jam kerja
            if (timeToMinutes(jamSelesai) > timeToMinutes(settings.jamSelesai)) {
              continue;
            }

            for (const ruangan of ruanganList_) {
              // VALIDASI: Cek break time
              if (sks >= 2 && isSessionCutByBreak(hari, jamMulai, jamSelesai, sks)) {
                continue;
              }

              // VALIDASI: Cek overlap
              const dayData = jadwalData[hari] || {};
              const sessionsInRuangan = dayData[ruangan.id] || [];
              const newStart = timeToMinutes(jamMulai);
              const newEnd = timeToMinutes(jamSelesai);

              let hasOverlap = false;
              for (const existingSession of sessionsInRuangan) {
                const existingStart = timeToMinutes(existingSession.jam_mulai);
                const existingEnd = timeToMinutes(existingSession.jam_selesai);
                if (newStart < existingEnd && newEnd > existingStart) {
                  hasOverlap = true;
                  break;
                }
              }

              if (hasOverlap) continue;

              // ===== SEMUA VALIDASI PASSED - TAMBAH SESI =====
              const selectedDosen = dosenData || dosenList[generated % dosenList.length];
              const jadwalPayload = {
                kelas_id: kelas.id,
                hari: hari,
                ruangan_id: ruangan.id,
                jam_mulai: jamMulai,
                jam_selesai: jamSelesai,
                dosen_id: selectedDosen.id,
                display_name: kelas.display_name || kelas.nama_kelas
              };

              const res = await fetch('/api/jadwal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jadwalPayload)
              });

              if (res.ok) {
                // Update jadwalData
                if (!jadwalData[hari]) jadwalData[hari] = {};
                if (!jadwalData[hari][ruangan.id]) jadwalData[hari][ruangan.id] = [];
                jadwalData[hari][ruangan.id].push({
                  id: Math.random(),
                  kelas_id: kelas.id,
                  jam_mulai: jamMulai,
                  jam_selesai: jamSelesai,
                  display_name: jadwalPayload.display_name
                });
                return true; // Success
              }
            }
          }
        }

        return false; // Failed
      };

      // Generate dengan urutan prioritas: preference dulu, baru random
      for (const kelas of kelasWithPreference) {
        const success = await scheduleKelas(kelas, kelas.dosenData);
        if (success) {
          generated++;
        } else {
          skipped++;
        }
      }

      const message = `${generated} sesi berhasil dibuat otomatis${skipped > 0 ? ` (${skipped} kelas tidak bisa dijadwalkan)` : ''}`;
      showMessage('success', message);
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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Jadwal Kuliah</h1>
          <p className="text-gray-600">Kelola jadwal kuliah dengan mudah</p>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* Master Filter: Tahun Akademik */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Tahun Akademik
            </label>
            <select
              value={selectedTahunAkademik}
              onChange={(e) => setSelectedTahunAkademik(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
            >
              <option value="">-- Pilih Tahun Akademik --</option>
              {tahunAkademikList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun_akademik}
                </option>
              ))}
            </select>
          </div>

          {/* Subfilters: Kode Kurikulum, Semester, Tahun Ajaran */}
          {selectedTahunAkademik && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* Preset Header dengan Collapse/Expand */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPresetsSection(!showPresetsSection)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title={showPresetsSection ? 'Sembunyikan' : 'Tampilkan'}
              >
                <span className="text-xl">
                  {showPresetsSection ? '▼' : '▶'}
                </span>
              </button>
              <h3 className="text-lg font-semibold text-gray-900">🎛️ Preset Jadwal</h3>
            </div>
            <button
              onClick={() => setShowSavePresetModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              💾 Simpan Preset
            </button>
          </div>

          {/* Preset Section (Collapsible) */}
          {showPresetsSection && (
            <div className="space-y-4">
              {/* Default Presets */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Template Preset</p>
                <div className="flex flex-wrap gap-3 mb-4">
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

              {/* Database Presets */}
              {databasePresets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Preset Tersimpan</p>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {databasePresets.map((preset) => (
                      <div key={preset.id} className="relative group">
                        <button
                          onClick={() => {
                            setActivePreset(preset.nama_preset);
                            setSettings({
                              jamMulai: preset.jam_mulai,
                              durasiSlot: preset.durasi_slot,
                              jamIstirahatMulaiSeninKamis: preset.jam_istirahat_mulai_senin_kamis,
                              jamIstirahatSelesaiSeninKamis: preset.jam_istirahat_selesai_senin_kamis,
                              jamIstirahatMulaiSabtu: preset.jam_istirahat_mulai_sabtu,
                              jamIstirahatSelesaiSabtu: preset.jam_istirahat_selesai_sabtu,
                              jamIstirahatMulaiJumat: preset.jam_istirahat_mulai_jumat,
                              jamIstirahatSelesaiJumat: preset.jam_istirahat_selesai_jumat,
                              jamSelesai: preset.jam_selesai,
                            });
                            showMessage('success', `Preset ${preset.nama_preset} diterapkan`);
                          }}
                          className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            activePreset === preset.nama_preset
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          {preset.nama_preset}
                          {preset.is_default && <span className="ml-2 text-xs">⭐</span>}
                        </button>
                        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!preset.is_default && (
                            <button
                              onClick={() => handleSetAsDefault(preset.id, preset.nama_preset)}
                              className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-yellow-600"
                              title="Jadikan preset ini default"
                            >
                              ★
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePreset(preset.id, preset.nama_preset)}
                            className={`rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ${
                              preset.is_default 
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                            title={preset.is_default ? 'Tidak bisa hapus preset default' : 'Hapus preset'}
                            disabled={preset.is_default}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Divider */}
          {showPresetsSection && <div className="border-t border-gray-200 mb-6 mt-6" />}

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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
            </div>

            {/* Jam Istirahat Sabtu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Istirahat Sabtu
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={settings.jamIstirahatMulaiSabtu}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatMulaiSabtu: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
                <span className="flex items-center">-</span>
                <input
                  type="time"
                  value={settings.jamIstirahatSelesaiSabtu}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jamIstirahatSelesaiSabtu: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
              />
            </div>

            <div></div>
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
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
            
            {/* Save Preset Changes Button - hanya tampil jika ada perubahan */}
            {hasPresetChanges() && (
              <button
                onClick={handleUpdatePreset}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                title={`Simpan perubahan ke preset "${activePreset}"`}
              >
                💾 Simpan Perubahan
              </button>
            )}
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
                    <h3 className="text-lg font-semibold text-black">{day}</h3>
                    <span className="text-sm text-black">
                      {Object.values(dayData).flat().length} sesi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 table-fixed">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left w-32 text-black">Ruangan</th>
                          {timeSlots.map((slot, idx) => (
                            <th
                              key={idx}
                              className={`border border-gray-300 px-2 py-2 text-center text-xs w-24 h-20 text-black ${
                                slot.isBreak ? 'bg-red-400' : 'bg-blue-50'
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
                            <td className="border border-gray-300 px-4 py-2 font-medium w-32 text-black">
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
                                      ? 'bg-red-300'
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
                                    <div className="text-black font-semibold">ISTIRAHAT</div>
                                  ) : sessionInSlot ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-1 group">
                                      <div className="font-semibold text-black text-xs mb-1 text-center break-words">
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
                                      className="w-full h-full flex flex-col items-center justify-center p-1 text-black text-xs group cursor-pointer hover:bg-green-200"
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
            <h2 className="text-xl font-bold mb-4 text-black">
              {editingSession ? 'Edit Sesi' : 'Tambah Sesi'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Hari</label>
                <input
                  type="text"
                  value={selectedHari}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Ruangan</label>
                <select
                  value={selectedRuangan}
                  onChange={(e) => setSelectedRuangan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="" className="text-black">Pilih Ruangan</option>
                  {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((r) => (
                    <option key={r.id} value={r.id} className="text-black">
                      {r.f_namaruang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Mode Input</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-black">
                    <input
                      type="radio"
                      value="manual"
                      checked={sessionInputMode === 'manual'}
                      onChange={(e) => setSessionInputMode(e.target.value)}
                    />
                    Manual
                  </label>
                  <label className="flex items-center gap-2 text-black">
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

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Jam Mulai</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Jam Selesai (Otomatis)</label>
                <input
                  type="time"
                  value={calculatedJamSelesai}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg text-black"
                />
                {selectedKelas && (
                  <small className="text-black text-xs mt-1 block">
                    📊 {selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1} SKS × {settings.durasiSlot} menit
                  </small>
                )}
                
                {/* Warning jika kelas 2+ SKS terpotong jam istirahat */}
                {selectedKelas && (() => {
                  const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1;
                  if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks)) {
                    const breakTimes = getBreakTimes(selectedHari);
                    return (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-black mb-1">❌ Jadwal Tidak Valid</p>
                        <p className="text-xs text-black">
                          Kelas dengan <strong>{sks} SKS</strong> tidak boleh terpotong jam istirahat 
                          <br />
                          <strong>{breakTimes.mulai}-{breakTimes.selesai}</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">
                  {sessionInputMode === 'manual' ? 'Nama Sesi' : 'Pilih Kelas'}
                </label>
                {sessionInputMode === 'manual' ? (
                  <input
                    type="text"
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    placeholder="Contoh: Algoritma & Struktur Data"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                    >
                      <option value="" className="text-black">Pilih Kelas</option>
                      {kelasList.length > 0 ? (
                        kelasList.map((k) => (
                          <option key={k.id} value={k.id} className="text-black">
                            {k.display_name || k.nama_kelas} (SKS: {k.sks || k.f_sks_kurikulum})
                          </option>
                        ))
                      ) : (
                        <option disabled className="text-gray-500">Tidak ada kelas tersedia</option>
                      )}
                    </select>
                    
                    {kelasList.length === 0 && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-black">ℹ️ Tidak ada kelas untuk semester ini. Pastikan sudah memilih tahun akademik dan semester.</p>
                      </div>
                    )}
                    {/* Info jika kelas sudah ditambahkan */}
                    {selectedKelas && !editingSession && (() => {
                      const existingSchedule = findExistingKelasSchedule(selectedKelas.id);
                      return existingSchedule.found ? (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-black mb-1">⚠️ Kelas sudah dijadwalkan</p>
                          <p className="text-xs text-black">
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

              {/* Warning jika ada overlap dengan jadwal yang sudah ada */}
              {selectedRuangan && (() => {
                const overlap = findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai);
                return overlap.found ? (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-black mb-1">❌ Waktu Bentrok</p>
                    <p className="text-xs text-black">
                      Waktu ini sudah dipakai oleh <strong>{overlap.conflictName}</strong> pada pukul <strong>{overlap.conflictTime}</strong>
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSessionModal(false);
                  setSessionInput('');
                  setEditingSession(null);
                  setSelectedKelas(null);
                  setSessionInputMode('import');
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
                    
                    // Cek overlap dengan jadwal yang sudah ada
                    const isOverlap = selectedRuangan && findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai).found;
                    
                    return isDuplicate || isCutByBreak || isOverlap;
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
                    
                    // Cek overlap dengan jadwal yang sudah ada
                    const isOverlap = selectedRuangan && findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai).found;
                    
                    if (isDuplicate || isCutByBreak || isOverlap) {
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
                    
                    // Cek overlap dengan jadwal yang sudah ada
                    const isOverlap = selectedRuangan && findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai).found;
                    
                    if (isDuplicate) return 'Kelas ini sudah ditambahkan sebelumnya';
                    if (isCutByBreak) return 'Kelas tidak boleh terpotong jam istirahat';
                    if (isOverlap) return 'Waktu sudah dipakai oleh kelas lain';
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

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">💾 Simpan Preset Baru</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Preset</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Contoh: Preset Pagi, Preset Sore"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePreset();
                    }
                  }}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Konfigurasi yang akan disimpan:</strong>
                </p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                  <li>Jam Mulai: <span className="font-mono">{settings.jamMulai}</span></li>
                  <li>Durasi Slot: <span className="font-mono">{settings.durasiSlot} menit</span></li>
                  <li>Jam Selesai: <span className="font-mono">{settings.jamSelesai}</span></li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSavePresetModal(false);
                  setNewPresetName('');
                }}
                disabled={presetSaving}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSavePreset}
                disabled={presetSaving || !newPresetName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {presetSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
