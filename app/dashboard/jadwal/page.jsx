'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function JadwalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [kelasList, setKelasList] = useState([]);
  const [jadwalData, setJadwalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });

  const [presets] = useState({
    Normal: {
      jamMulai: '07:10', durasiSlot: 50,
      jamIstirahatMulaiSeninKamis: '12:10', jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiSabtu: '12:10', jamIstirahatSelesaiSabtu: '13:00',
      jamIstirahatMulaiJumat: '11:20', jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '18:00',
    },
    Ramadhan: {
      jamMulai: '08:00', durasiSlot: 40,
      jamIstirahatMulaiSeninKamis: '12:10', jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiSabtu: '12:10', jamIstirahatSelesaiSabtu: '13:00',
      jamIstirahatMulaiJumat: '11:20', jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '17:10',
    },
  });

  const [activePreset, setActivePreset] = useState('Normal');
  const [settings, setSettings] = useState(presets.Normal);
  const [visibleDays, setVisibleDays] = useState({ Senin: true, Selasa: true, Rabu: true, Kamis: true, Jumat: true, Sabtu: true });
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
  const [autoGenSettings, setAutoGenSettings] = useState({ fillEmptyOnly: true, usePreferences: true });
  const [showPresetsSection, setShowPresetsSection] = useState(true);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [databasePresets, setDatabasePresets] = useState([]);
  const [presetSaving, setPresetSaving] = useState(false);
  const [tahunAkademikList, setTahunAkademikList] = useState([]);
  const [selectedTahunAkademik, setSelectedTahunAkademik] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Gasal');
  const [showCreateCopyModal, setShowCreateCopyModal] = useState(false);
  const [copyOperationPending, setCopyOperationPending] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [dosenList, setDosenList] = useState([]);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [selectedDosenForPref, setSelectedDosenForPref] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [floorPreferences, setFloorPreferences] = useState({ 1: true, 2: true, 3: true, 4: true });
  const [databasePresetsList, setDatabasePresetsList] = useState([]);

  const tableRef = useRef(null);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const semesters = ['Gasal', 'Genap'];

  // ===== ALL LOGIC UNCHANGED =====
  const fetchData = async () => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes, dosenRes, presetsRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/jadwal'),
        fetch('/api/ruangan'),
        fetch('/api/dosen'),
        fetch('/api/jadwal/presets')
      ]);
      
      if (!kelasRes.ok) {
        const error = await kelasRes.json();
        throw new Error(`Kelas API error: ${error.error || 'Unknown error'}`);
      }
      if (!jadwalRes.ok) {
        const error = await jadwalRes.json();
        throw new Error(`Jadwal API error: ${error.error || 'Unknown error'}`);
      }
      if (!ruanganRes.ok) {
        const error = await ruanganRes.json();
        throw new Error(`Ruangan API error: ${error.error || 'Unknown error'}`);
      }
      
      const kelas = await kelasRes.json();
      const jadwal = await jadwalRes.json();
      const ruangan = await ruanganRes.json();
      const dosen = await dosenRes.json();
      const presets = await presetsRes.json();
      // Deduplicate kelas by id
      const uniqueKelas = Array.from(new Map((Array.isArray(kelas) ? kelas : []).map(k => [k.id, k])).values());
      setKelasList(uniqueKelas);
      setRuanganList(Array.isArray(ruangan) ? ruangan : []);
      setDosenList(Array.isArray(dosen) ? dosen : []);
      setDatabasePresetsList(Array.isArray(presets) ? presets : []);
      const organizedJadwal = {};
      days.forEach((day) => { organizedJadwal[day] = {}; });
      const jadwalArray = Array.isArray(jadwal) ? jadwal : [];
      jadwalArray.forEach((j) => {
        if (!organizedJadwal[j.hari]) organizedJadwal[j.hari] = {};
        if (!organizedJadwal[j.hari][j.ruangan_id]) organizedJadwal[j.hari][j.ruangan_id] = [];
        organizedJadwal[j.hari][j.ruangan_id].push(j);
      });
      setJadwalData(organizedJadwal);
    } catch {
      showMessage('error', 'Error loading data. Please try again.');
      setKelasList([]); setRuanganList([]); setDosenList([]); setDatabasePresetsList([]);
    } finally { setLoading(false); }
  };

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load data only after auth check
  useEffect(() => {
    if (!checking) {
      fetchData();
      fetchTahunAkademik();
      fetchPresets();
    }
  }, [checking]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/preset');
      const data = await res.json();
      setDatabasePresets(Array.isArray(data) ? data : []);
    } catch (error) { console.warn('Gagal fetch presets:', error.message); setDatabasePresets([]); }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) { showMessage('error', 'Nama preset tidak boleh kosong'); return; }
    if (databasePresets.some((p) => p.nama_preset.toLowerCase() === newPresetName.toLowerCase())) { showMessage('error', 'Preset dengan nama ini sudah ada'); return; }
    try {
      setPresetSaving(true);
      const res = await fetch('/api/preset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_preset: newPresetName, jam_mulai: settings.jamMulai, durasiSlot: settings.durasiSlot, jamIstirahatMulaiSeninKamis: settings.jamIstirahatMulaiSeninKamis, jamIstirahatSelesaiSeninKamis: settings.jamIstirahatSelesaiSeninKamis, jamIstirahatMulaiSabtu: settings.jamIstirahatMulaiSabtu, jamIstirahatSelesaiSabtu: settings.jamIstirahatSelesaiSabtu, jamIstirahatMulaiJumat: settings.jamIstirahatMulaiJumat, jamIstirahatSelesaiJumat: settings.jamIstirahatSelesaiJumat, jamSelesai: settings.jamSelesai, is_default: false }) });
      const result = await res.json();
      if (!res.ok) { showMessage('error', result.error || 'Gagal menyimpan preset'); return; }
      showMessage('success', `Preset "${newPresetName}" berhasil disimpan`);
      setNewPresetName(''); setShowSavePresetModal(false); await fetchPresets();
    } catch (err) { showMessage('error', `Error: ${err.message}`); } finally { setPresetSaving(false); }
  };

  const handleDeletePreset = async (presetId, presetName) => {
    if (!confirm(`Hapus preset "${presetName}"?`)) return;
    try {
      const res = await fetch('/api/preset', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: presetId }) });
      const result = await res.json();
      if (!res.ok) { showMessage('error', result.error || 'Gagal menghapus preset'); return; }
      showMessage('success', `Preset "${presetName}" berhasil dihapus`); await fetchPresets();
    } catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const handleUpdatePreset = async () => {
    const currentPreset = databasePresets.find((p) => p.nama_preset === activePreset);
    if (!currentPreset) { showMessage('error', 'Preset harus dipilih dari database untuk diupdate'); return; }
    try {
      const res = await fetch('/api/preset', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentPreset.id, jam_mulai: settings.jamMulai, durasiSlot: settings.durasiSlot, jamIstirahatMulaiSeninKamis: settings.jamIstirahatMulaiSeninKamis, jamIstirahatSelesaiSeninKamis: settings.jamIstirahatSelesaiSeninKamis, jamIstirahatMulaiSabtu: settings.jamIstirahatMulaiSabtu, jamIstirahatSelesaiSabtu: settings.jamIstirahatSelesaiSabtu, jamIstirahatMulaiJumat: settings.jamIstirahatMulaiJumat, jamIstirahatSelesaiJumat: settings.jamIstirahatSelesaiJumat, jamSelesai: settings.jamSelesai }) });
      const result = await res.json();
      if (!res.ok) { showMessage('error', result.error || 'Gagal mengupdate preset'); return; }
      showMessage('success', `Preset "${activePreset}" berhasil diupdate`); await fetchPresets();
    } catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const hasPresetChanges = () => {
    const currentPreset = databasePresets.find((p) => p.nama_preset === activePreset);
    if (!currentPreset) return false;
    return settings.jamMulai !== currentPreset.jam_mulai || settings.durasiSlot !== currentPreset.durasi_slot || settings.jamIstirahatMulaiSeninKamis !== currentPreset.jam_istirahat_mulai_senin_kamis || settings.jamIstirahatSelesaiSeninKamis !== currentPreset.jam_istirahat_selesai_senin_kamis || settings.jamIstirahatMulaiSabtu !== currentPreset.jam_istirahat_mulai_sabtu || settings.jamIstirahatSelesaiSabtu !== currentPreset.jam_istirahat_selesai_sabtu || settings.jamIstirahatMulaiJumat !== currentPreset.jam_istirahat_mulai_jumat || settings.jamIstirahatSelesaiJumat !== currentPreset.jam_istirahat_selesai_jumat || settings.jamSelesai !== currentPreset.jam_selesai;
  };

  const handleCreateJadwalCopy = async () => {
    try {
      setCopyOperationPending(true);
      setCopyMessage('Membuat copy jadwal...');

      // Get all current jadwal IDs - convert semester string to numbers [1,3,5,7] or [2,4,6,8]
      const semesterNumbers = getSemesterNumbers(selectedSemester);
      const jadwalIds = Object.values(jadwalData)
        .flatMap(dayData => Object.values(dayData || {}))
        .flat()
        .filter(j => semesterNumbers.includes(Number(j.semester)))
        .map(j => j.id);

      // Allow copy even if jadwal is empty - removed the check that prevented empty copy
      const res = await fetch('/api/jadwal-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jadwalIds.length > 0 ? jadwalIds : []),
      });

      const result = await res.json();
      if (!res.ok) {
        showMessage('error', result.error || 'Gagal membuat copy jadwal');
        return;
      }

      showMessage('success', `${result.count} jadwal telah dicopy`);
      setCopyMessage(`Berhasil membuat ${result.count} copy jadwal`);
      setTimeout(() => setShowCreateCopyModal(false), 2000);
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    } finally {
      setCopyOperationPending(false);
    }
  };

  const handleSaveJadwalCopyChanges = async () => {
    try {
      setCopyOperationPending(true);
      setCopyMessage('Menyimpan perubahan ke copy...');

      // Get all current jadwal IDs and sync them - convert semester string to numbers
      const semesterNumbers = getSemesterNumbers(selectedSemester);
      const jadwalItems = Object.values(jadwalData)
        .flatMap(dayData => Object.values(dayData || {}))
        .flat()
        .filter(j => semesterNumbers.includes(Number(j.semester)));

      // Update each jadwal_copy with latest data
      for (const jadwal of jadwalItems) {
        await fetch('/api/jadwal-copy', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jadwal_id: jadwal.id,
            // learning_type and learning_time are preserved
          }),
        });
      }

      showMessage('success', `Perubahan jadwal telah disimpan ke copy`);
      setTimeout(() => setShowCreateCopyModal(false), 2000);
    } catch (err) {
      showMessage('error', `Error: ${err.message}`);
    } finally {
      setCopyOperationPending(false);
    }
  };

  const handleEditDosenPreference = async (dosen) => {
    setSelectedDosenForPref(dosen);
    
    // Initialize preferences grid
    const newPreferences = {};
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    days.forEach((day, index) => {
      newPreferences[day] = {};
      databasePresetsList.forEach((preset) => {
        const sessions = generateSessions(preset.jam_mulai, preset.jam_selesai, preset.durasi_slot, preset, day);
        sessions.forEach((session) => {
          // Default: all checked except Saturday
          newPreferences[day][session] = index !== 5;
        });
      });
    });

    // Load existing preferences
    try {
      const res = await fetch(`/api/dosen/preferences?dosenId=${dosen.id}`);
      if (res.ok) {
        const existingPrefs = await res.json();
        if (existingPrefs.length > 0) {
          existingPrefs.forEach((pref) => {
            if (newPreferences[pref.hari]) {
              newPreferences[pref.hari][pref.sesi] = pref.is_available;
            }
          });
          
          // Load floor preferences if exists
          const dosenWithFloors = existingPrefs[0]?.dosen_prefer_lantai;
          if (dosenWithFloors) {
            const floorsArray = dosenWithFloors.split(',').map(f => parseInt(f.trim()));
            setFloorPreferences({ 1: floorsArray.includes(1), 2: floorsArray.includes(2), 3: floorsArray.includes(3), 4: floorsArray.includes(4) });
          } else {
            setFloorPreferences({ 1: true, 2: true, 3: true, 4: true });
          }
        } else {
          setFloorPreferences({ 1: true, 2: true, 3: true, 4: true });
        }
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setFloorPreferences({ 1: true, 2: true, 3: true, 4: true });
    }

    setPreferences(newPreferences);
    setShowPreferenceModal(true);
  };

  const generateSessions = (jamMulai, jamSelesai, durasi, preset, day = 'Senin') => {
    const sessions = [];
    if (!jamMulai || !jamSelesai || !durasi) {
      return sessions;
    }
    
    const durasiNumber = typeof durasi === 'string' ? parseInt(durasi, 10) : durasi;
    let current = jamBulaiToMinutes(jamMulai);
    const end = jamBulaiToMinutes(jamSelesai);
    
    let breakStart = null;
    let breakEnd = null;
    
    if (preset) {
      if (day === 'Jumat') {
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_jumat || '11:20');
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_jumat || '13:30');
      } else if (day === 'Sabtu') {
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_sabtu || '12:10');
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_sabtu || '13:00');
      } else {
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_senin_kamis || '12:10');
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_senin_kamis || '13:00');
      }
    }
    
    while (current < end) {
      const sessionStart = current;
      const sessionEnd = current + durasiNumber;
      
      if (breakStart !== null && breakEnd !== null) {
        if (sessionEnd > breakStart && sessionStart < breakEnd) {
          current = breakEnd;
          continue;
        }
      }
      
      const start = minutesToTime(sessionStart);
      const finish = minutesToTime(sessionEnd);
      sessions.push(`${start}-${finish}`);
      current = sessionEnd;
    }
    return sessions;
  };

  const jamBulaiToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleSaveDosenPreference = async () => {
    try {
      const preferredFloors = Object.keys(floorPreferences)
        .filter(floor => floorPreferences[floor])
        .join(',');
      
      const res = await fetch('/api/dosen/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dosenId: selectedDosenForPref.id,
          preferences,
          preferredFloors: preferredFloors || '1,2,3,4',
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Gagal menyimpan preferensi');
      }

      showMessage('success', `✅ Preferensi ${selectedDosenForPref.f_namapegawai} berhasil disimpan`);
      setShowPreferenceModal(false);
    } catch (err) {
      console.error('Error saving preferences:', err);
      showMessage('error', `❌ ${err.message}`);
    }
  };

  const fetchTahunAkademik = async () => {
    try { const res = await fetch('/api/tahun-akademik'); const data = await res.json(); setTahunAkademikList(Array.isArray(data) ? data : []); }
    catch { showMessage('error', 'Gagal fetch tahun akademik'); setTahunAkademikList([]); }
  };

  const getSemesterNumbers = (semesterLabel) => {
    if (semesterLabel === 'Gasal') return [1, 3, 5, 7, 9];
    if (semesterLabel === 'Genap') return [2, 4, 6, 8, 10];
    return [];
  };

  const getSemesterNumbersForComparison = (selectedSemesterLabel) => {
    return getSemesterNumbers(selectedSemesterLabel);
  };

  const fetchKelasAndJadwalBySemester = async (tahunId, semester) => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes] = await Promise.all([fetch('/api/kelas'), fetch('/api/jadwal'), fetch('/api/ruangan')]);
      if (!kelasRes.ok || !jadwalRes.ok || !ruanganRes.ok) { console.warn('Failed to fetch kelas, jadwal, or ruangan'); return; }
      const kelasRaw = await kelasRes.json(); const jadwalRaw = await jadwalRes.json(); const ruanganRaw = await ruanganRes.json();
      let kelas = Array.isArray(kelasRaw) ? kelasRaw : [];
      let jadwal = Array.isArray(jadwalRaw) ? jadwalRaw : [];
      let ruangan = Array.isArray(ruanganRaw) ? ruanganRaw : [];
      const semesterNumbers = getSemesterNumbers(semester);
      kelas = kelas.filter((k) => { const kSemester = Number(k.f_semester || k.semester || k.matkul_semester || 0); return String(k.f_tahun_akademik) === String(tahunId) && semesterNumbers.includes(kSemester); });
      // Deduplicate kelas by id to prevent React key warnings
      const uniqueKelas = Array.from(new Map(kelas.map(k => [k.id, k])).values());
      const kelasIds = uniqueKelas.map((k) => k.id);
      jadwal = jadwal.filter((j) => kelasIds.includes(j.f_kelas || j.kelas_id));
      setKelasList(uniqueKelas);
      setRuanganList(ruangan);
      const organizedJadwal = {};
      days.forEach((day) => { organizedJadwal[day] = {}; });
      jadwal.forEach((j) => { if (!organizedJadwal[j.hari]) organizedJadwal[j.hari] = {}; if (!organizedJadwal[j.hari][j.ruangan_id]) organizedJadwal[j.hari][j.ruangan_id] = []; organizedJadwal[j.hari][j.ruangan_id].push(j); });
      setJadwalData(organizedJadwal);
    } catch (err) { console.warn('Error fetching filtered data:', err.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (selectedTahunAkademik && selectedSemester) { fetchKelasAndJadwalBySemester(selectedTahunAkademik, selectedSemester); } else { setKelasList([]); setJadwalData({}); } }, [selectedTahunAkademik, selectedSemester]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedJamMulai(settings.jamMulai); setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1)); }, [settings.durasiSlot, activePreset]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };
  const timeToMinutes = (timeStr) => { if (!timeStr) return 0; const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
  const getBreakTimes = (hari) => { const isJumat = hari === 'Jumat'; const isSabtu = hari === 'Sabtu'; return { mulai: isJumat ? settings.jamIstirahatMulaiJumat : isSabtu ? settings.jamIstirahatMulaiSabtu : settings.jamIstirahatMulaiSeninKamis, selesai: isJumat ? settings.jamIstirahatSelesaiJumat : isSabtu ? settings.jamIstirahatSelesaiSabtu : settings.jamIstirahatSelesaiSeninKamis }; };

  const generateTimeSlots = (hari) => {
    const slots = []; const mulai = timeToMinutes(settings.jamMulai); const selesai = timeToMinutes(settings.jamSelesai);
    const { mulai: breakMulai, selesai: breakSelesai } = getBreakTimes(hari);
    const breakMulaiMin = timeToMinutes(breakMulai); const breakSelesaiMin = timeToMinutes(breakSelesai);
    for (let time = mulai; time < selesai; time += settings.durasiSlot) {
      const endTime = time + settings.durasiSlot;
      const isBreak = (time >= breakMulaiMin && time < breakSelesaiMin) || (time < breakSelesaiMin && endTime > breakMulaiMin);
      slots.push({ start: minutesToTime(time), end: minutesToTime(Math.min(endTime, selesai)), isBreak });
    }
    return slots;
  };

  const calculateJamSelesai = (jamMulai, sks) => { const startMinutes = timeToMinutes(jamMulai); const durationMinutes = (sks || 1) * settings.durasiSlot; return minutesToTime(startMinutes + durationMinutes); };
  const isSlotOccupied = (hari, ruanganId, slotStart, slotEnd) => { const dayData = jadwalData[hari] || {}; const sessionsInRuangan = dayData[ruanganId] || []; const slotStartMin = timeToMinutes(slotStart); const slotEndMin = timeToMinutes(slotEnd); const semesterNumbers = getSemesterNumbersForComparison(selectedSemester); return sessionsInRuangan.some((session) => { if (!semesterNumbers.includes(Number(session.semester))) return false; const sessionStart = timeToMinutes(session.jam_mulai); const sessionEnd = timeToMinutes(session.jam_selesai); return sessionStart < slotEndMin && sessionEnd > slotStartMin; }); };
  const findExistingKelasSchedule = (kelasId) => { const semesterNumbers = getSemesterNumbersForComparison(selectedSemester); for (const hari of days) { const dayData = jadwalData[hari] || {}; for (const ruanganId in dayData) { const sessions = dayData[ruanganId]; const found = sessions.find((s) => s.kelas_id === kelasId && semesterNumbers.includes(Number(s.semester))); if (found) return { found: true, hari, jamMulai: found.jam_mulai, jamSelesai: found.jam_selesai, ruangan: ruanganList.find((r) => r.id === parseInt(ruanganId))?.f_namaruang || 'Ruangan tidak diketahui' }; } } return { found: false }; };
  const isSessionCutByBreak = (hari, jamMulai, jamSelesai, sks = 1) => { if (sks < 2) return false; const breakTimes = getBreakTimes(hari); const breakStartMin = timeToMinutes(breakTimes.mulai); const breakEndMin = timeToMinutes(breakTimes.selesai); const sessionStartMin = timeToMinutes(jamMulai); const sessionEndMin = timeToMinutes(jamSelesai); return sessionStartMin < breakEndMin && sessionEndMin > breakStartMin; };
  const findOverlappingSession = (hari, ruanganId, jamMulai, jamSelesai) => { const dayData = jadwalData[hari] || {}; const sessionsInRuangan = dayData[parseInt(ruanganId)] || []; const newStart = timeToMinutes(jamMulai); const newEnd = timeToMinutes(jamSelesai); const semesterNumbers = getSemesterNumbersForComparison(selectedSemester); for (const existingSession of sessionsInRuangan) { if (!semesterNumbers.includes(Number(existingSession.semester))) continue; if (editingSession && existingSession.id === editingSession.id) continue; const existingStart = timeToMinutes(existingSession.jam_mulai); const existingEnd = timeToMinutes(existingSession.jam_selesai); if (newStart < existingEnd && newEnd > existingStart) return { found: true, conflictName: existingSession.display_name, conflictTime: `${existingSession.jam_mulai}-${existingSession.jam_selesai}` }; } return { found: false }; }

  const hasFormData = () => {
    return sessionInput.trim().length > 0 || selectedKelas !== null;
  };

  const resetFormFields = () => {
    setSessionInput('');
    setSelectedKelas(null);
    setSessionInputMode('manual');
    setSelectedJamMulai(settings.jamMulai);
    setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1));
    setEditingSession(null);
  };

  const handleSessionModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (hasFormData()) {
        if (window.confirm('⚠️ Form memiliki data yang belum disimpan. Tutup tanpa menyimpan?')) {
          resetFormFields();
          setShowSessionModal(false);
        }
      } else {
        setShowSessionModal(false);
      }
    }
  };

  const handleSetDefaultPreset = async (presetId) => {
    try {
      const res = await fetch('/api/preset', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: presetId, set_as_default: true }) 
      });
      const result = await res.json();
      if (!res.ok) { showMessage('error', result.error || 'Gagal mengatur default preset'); return; }
      showMessage('success', 'Preset berhasil ditetapkan sebagai default');
      await fetchPresets();
    } catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const handleAddSession = async () => {
    if (!selectedRuangan || !sessionInput) { showMessage('error', 'Pilih ruangan dan isi sesi'); return; }
    try {
      const ruangan = ruanganList.find((r) => r.id === parseInt(selectedRuangan));
      let displayName = ''; let sks = 1; let kelasId = null; let dosenId = null;
      if (sessionInputMode === 'import') {
        const kelas = kelasList.find((k) => k.id === parseInt(sessionInput));
        if (!kelas) { showMessage('error', 'Kelas tidak ditemukan'); return; }
        displayName = kelas.display_name || kelas.nama_kelas; sks = kelas.sks || kelas.f_sks_kurikulum || 1; kelasId = kelas.id;
        
        // Try to find dosen_id from kelas.dosen field (could be NIDN or dosen name)
        if (kelas.dosen) {
          try {
            // First, try to match as NIDN
            const dosenRes = await fetch(`/api/dosen?nidn=${kelas.dosen}`);
            if (dosenRes.ok) {
              const dosenList = await dosenRes.json();
              if (Array.isArray(dosenList) && dosenList.length > 0) {
                dosenId = dosenList[0].id;
              }
            }
          } catch (err) {
            console.warn('Could not find dosen by NIDN:', kelas.dosen);
          }
        }
        if (!editingSession) { const existingSchedule = findExistingKelasSchedule(kelasId); if (existingSchedule.found) { showMessage('error', `Kelas "${displayName}" sudah dijadwalkan pada ${existingSchedule.hari} pukul ${existingSchedule.jamMulai}-${existingSchedule.jamSelesai} di ruangan ${existingSchedule.ruangan}`); return; } }
      } else { displayName = sessionInput; sks = 1; }
      const jamSelesai = calculateJamSelesai(selectedJamMulai, sks);
      const dayData = jadwalData[selectedHari] || {}; const sessionsInRuangan = dayData[parseInt(selectedRuangan)] || [];
      const newStart = timeToMinutes(selectedJamMulai); const newEnd = timeToMinutes(jamSelesai);
      const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
      for (const existingSession of sessionsInRuangan) { if (!semesterNumbers.includes(Number(existingSession.semester))) continue; if (editingSession && existingSession.id === editingSession.id) continue; const existingStart = timeToMinutes(existingSession.jam_mulai); const existingEnd = timeToMinutes(existingSession.jam_selesai); if (newStart < existingEnd && newEnd > existingStart) { showMessage('error', `Jadwal bentrok dengan: ${existingSession.display_name} (${existingSession.jam_mulai}-${existingSession.jam_selesai})`); return; } }
      if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, jamSelesai, sks)) { const breakTimes = getBreakTimes(selectedHari); showMessage('error', `Kelas dengan ${sks} SKS tidak boleh terpotong jam istirahat (${breakTimes.mulai}-${breakTimes.selesai})`); return; }
      const jadwalPayload = { kelas_id: kelasId, hari: selectedHari, ruangan_id: parseInt(selectedRuangan), jam_mulai: selectedJamMulai, jam_selesai: jamSelesai, display_name: displayName, nama_ruangan: ruangan?.f_namaruang || '', semester: selectedSemester, ...(dosenId && { dosen_id: dosenId }) };
      const endpoint = editingSession ? { method: 'PUT', body: { id: editingSession.id, ...jadwalPayload } } : { method: 'POST', body: jadwalPayload };
      const res = await fetch('/api/jadwal', { method: endpoint.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(endpoint.body) });
      if (!res.ok) { const err = await res.json(); showMessage('error', err.error || 'Gagal menyimpan sesi'); return; }
      showMessage('success', editingSession ? 'Sesi diupdate' : 'Sesi ditambahkan');
      setSessionInput(''); setEditingSession(null); setShowSessionModal(false); await fetchData();
    } catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const handleDeleteSession = async (jadwalId) => {
    if (!confirm('Hapus sesi ini?')) return;
    try { const res = await fetch('/api/jadwal', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: jadwalId }) }); if (!res.ok) throw new Error('Gagal menghapus'); showMessage('success', 'Sesi dihapus'); await fetchData(); }
    catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const generateScheduleAuto = async () => {
    try {
      const dosenRes = await fetch('/api/dosen'); const dosenRaw = await dosenRes.json(); const dosenList = Array.isArray(dosenRaw) ? dosenRaw : [];
      const dosenWithLevel = dosenList.map((d) => { let level = 0; if (d.prefer_hari) level += 3; if (d.prefer_jam_mulai) level += 2; if (d.prefer_lantai) level += 1; return { ...d, preferenceLevel: level }; });
      dosenWithLevel.sort((a, b) => b.preferenceLevel - a.preferenceLevel);
      const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
      const emptyKelas = kelasList.filter((k) => { const hasSchedule = days.some((day) => jadwalData[day] && Object.values(jadwalData[day]).some((arr) => arr.some((j) => j.kelas_id === k.id && semesterNumbers.includes(Number(j.semester))))); return !hasSchedule; });
      let generated = 0;
      for (const kelas of emptyKelas) {
        const preferredDosen = dosenWithLevel[generated % Math.max(dosenWithLevel.length, 1)];
        const hari = autoGenSettings.usePreferences && preferredDosen?.prefer_hari ? preferredDosen.prefer_hari.split(',')[0].trim() : days[generated % 5];
        let ruangan = ruanganList[generated % Math.max(ruanganList.length, 1)];
        if (autoGenSettings.usePreferences && preferredDosen?.prefer_lantai) { const preferredRuangan = ruanganList.find((r) => r.f_lantai === parseInt(preferredDosen.prefer_lantai)); ruangan = preferredRuangan || ruangan; }
        if (!ruangan) continue;
        const jadwalPayload = { kelas_id: kelas.id, hari, ruangan_id: ruangan.id, jam_mulai: preferredDosen?.prefer_jam_mulai || '07:00', jam_selesai: preferredDosen?.prefer_jam_selesai || '12:00', dosen_id: preferredDosen?.id, display_name: kelas.display_name || kelas.nama_kelas, semester: selectedSemester };
        const res = await fetch('/api/jadwal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jadwalPayload) });
        if (res.ok) generated++;
      }
      showMessage('success', `${generated} sesi berhasil dibuat otomatis`); setShowAutoGenModal(false); await fetchData();
    } catch (err) { showMessage('error', `Error generating schedule: ${err.message}`); }
  };

  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();
    days.forEach((day) => {
      if (!visibleDays[day]) return;
      const timeSlots = generateTimeSlots(day); const dayData = jadwalData[day] || {}; const wsData = [];
      wsData.push([`JADWAL KULIAH - ${day} (${selectedSemester})`]); wsData.push([`Preset: ${activePreset}`]); wsData.push([]);
      const headerRow = ['Ruangan']; timeSlots.forEach((slot) => headerRow.push(`${slot.start}-${slot.end}`)); wsData.push(headerRow);
      const sortedRuangan = [...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || ''));
      const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
      sortedRuangan.forEach((ruangan) => {
        const row = [ruangan.f_namaruang]; const sessions = (dayData[ruangan.id] || []).filter((s) => semesterNumbers.includes(Number(s.semester)));
        timeSlots.forEach((slot) => { const occupyingSession = sessions.find((s) => { const sessionStartMin = timeToMinutes(s.jam_mulai); const sessionEndMin = timeToMinutes(s.jam_selesai); const slotStartMin = timeToMinutes(slot.start); const slotEndMin = timeToMinutes(slot.end); return sessionStartMin < slotEndMin && sessionEndMin > slotStartMin; }); if (occupyingSession) row.push(occupyingSession.display_name); else if (slot.isBreak) row.push('ISTIRAHAT'); else row.push(''); });
        wsData.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!cols'] = [{ wch: 20 }, ...timeSlots.map(() => ({ wch: 14 }))];
      XLSX.utils.book_append_sheet(wb, ws, day);
    });
    XLSX.writeFile(wb, `jadwal_kuliah_${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showMessage('success', 'Jadwal diexport ke XLSX');
  };

  // ===== SHARED INLINE STYLES =====
  const s = {
    page: { minHeight: '100vh', backgroundColor: '#f4f6fb', fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif" },
    inner: { maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' },
    // Header
    titleBar: { background: 'linear-gradient(135deg,#c2185b 0%,#7b1fa2 60%,#4527a0 100%)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    titleText: { fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 },
    titleSub: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', margin: 0 },
    // Cards
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem', overflow: 'hidden' },
    cardHeader: { background: 'linear-gradient(135deg,#c2185b 0%,#7b1fa2 60%,#4527a0 100%)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardHeaderText: { fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 },
    cardBody: { padding: '1.5rem' },
    // Alerts
    alertSuccess: { padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', fontWeight: 500, fontSize: '0.875rem', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' },
    alertError: { padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', fontWeight: 500, fontSize: '0.875rem', backgroundColor: '#fce4ec', color: '#b71c1c', border: '1px solid #ef9a9a' },
    // Inputs
    input: { width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e8eaf6', fontSize: '0.875rem', color: '#37474f', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white' },
    inputDisabled: { width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e8eaf6', fontSize: '0.875rem', color: '#37474f', boxSizing: 'border-box', backgroundColor: '#f8f9fe' },
    select: { width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e8eaf6', fontSize: '0.875rem', color: '#37474f', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white', cursor: 'pointer' },
    // Labels
    label: { display: 'block', fontWeight: 600, fontSize: '0.78rem', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' },
    // Buttons
    btnPrimary: { padding: '0.55rem 1.2rem', background: 'linear-gradient(135deg,#7b1fa2,#4527a0)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(123,31,162,0.3)' },
    btnSuccess: { padding: '0.55rem 1.2rem', background: 'linear-gradient(135deg,#00897b,#00695c)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,137,123,0.3)' },
    btnPurple: { padding: '0.55rem 1.2rem', background: 'linear-gradient(135deg,#7b1fa2,#4527a0)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(123,31,162,0.3)' },
    btnAmber: { padding: '0.55rem 1.2rem', background: 'linear-gradient(135deg,#f57f17,#e65100)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(245,127,23,0.3)' },
    btnGray: { padding: '0.55rem 1.2rem', backgroundColor: '#eceff1', color: '#455a64', border: '1px solid #cfd8dc', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
    btnGrayDisabled: { padding: '0.55rem 1.2rem', backgroundColor: '#eceff1', color: '#b0bec5', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'not-allowed' },
    btnSavePreset: { padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
    btnPresetActive: { padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg,#7b1fa2,#4527a0)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(123,31,162,0.4)', fontSize: '0.875rem' },
    btnPresetInactive: { padding: '0.5rem 1.25rem', backgroundColor: '#f8f9fe', color: '#546e7a', border: '1px solid #e8eaf6', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' },
    btnClose: { backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.1rem', cursor: 'pointer', borderRadius: '6px', padding: '0.2rem 0.6rem', lineHeight: 1 },
    // Filter strips
    filterStrip: { padding: '1rem 1.25rem', backgroundColor: '#f3e5f5', borderRadius: '10px', borderLeft: '4px solid #7b1fa2', marginBottom: '1.25rem' },
    subFilterStrip: { padding: '1rem 1.25rem', backgroundColor: '#fafbff', borderRadius: '10px', border: '1px solid #e8eaf6', marginBottom: '1.25rem' },
    // Modal
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(30,10,50,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modalBox: { backgroundColor: 'white', borderRadius: '14px', maxWidth: '480px', width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' },
    modalHeader: { background: 'linear-gradient(135deg,#c2185b 0%,#7b1fa2 60%,#4527a0 100%)', padding: '1.1rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 },
    modalBody: { padding: '1.5rem' },
    modalFooter: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f0f2ff' },
    // Info/warning boxes
    infoBlue: { padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#e8eaf6', border: '1px solid #c5cae9', fontSize: '0.8rem', color: '#283593', marginTop: '0.75rem' },
    warnYellow: { padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#fff8e1', border: '1px solid #ffe082', fontSize: '0.8rem', color: '#5d4037', marginTop: '0.75rem' },
    errRed: { padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#fce4ec', border: '1px solid #ef9a9a', fontSize: '0.8rem', color: '#b71c1c', marginTop: '0.75rem' },
    // Day section
    dayBadge: { backgroundColor: '#ede7f6', color: '#4527a0', padding: '0.2rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 },
    // Table cells
    cellBreak: { backgroundColor: '#ef9a9a', textAlign: 'center', padding: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#b71c1c', position: 'relative', border: '1px solid #e57373' },
    cellOccupied: { backgroundColor: '#e8f5e9', padding: '0.25rem', fontSize: '0.72rem', position: 'relative', border: '1px solid #c8e6c9', cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' },
    cellEmpty: { backgroundColor: 'white', padding: '0.25rem', border: '1px solid #f0f2ff', textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' },
    cellBtnEdit: { fontSize: '0.65rem', backgroundColor: '#7b1fa2', color: 'white', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: 'pointer', marginRight: '0.2rem' },
    cellBtnDel: { fontSize: '0.65rem', backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: 'pointer' },
    cellAddBtn: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#7b1fa2', fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer' },
    // Checkbox day toggle
    dayToggleCard: { backgroundColor: '#fafbff', borderRadius: '10px', border: '1px solid #e8eaf6', padding: '1rem 1.5rem', marginBottom: '1.5rem' },
    // Preset info
    presetInfoBox: { backgroundColor: '#e8eaf6', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#283593' },
    // Popup modal styling
    popupBox: {
      background: 'white',
      borderRadius: '14px',
      width: '360px',
      maxWidth: '90vw',
      boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
      overflow: 'hidden',
      padding: '2rem',
      textAlign: 'center',
    },
    popupTitle: {
      fontSize: '2.5rem',
      margin: '0 0 1rem 0',
      lineHeight: 1,
    },
    popupText: {
      fontSize: '0.95rem',
      color: '#37474f',
      margin: '0 0 1.5rem 0',
      lineHeight: '1.5',
      whiteSpace: 'pre-line',
    },
    popupBtn: {
      padding: '0.6rem 1.5rem',
      background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    },
  };

  if (checking) return (
    <div style={s.page}>
      <div style={{ ...s.titleBar, marginBottom: '2rem' }}>
        <h1 style={s.titleText}>📅 Jadwal Kuliah</h1>
      </div>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#7b1fa2', fontWeight: 600 }}>⏳ Checking authentication...</div>
    </div>
  );

  if (loading) return (
    <div style={s.page}>
      <div style={{ ...s.titleBar, marginBottom: '2rem' }}>
        <h1 style={s.titleText}>📅 Jadwal Kuliah</h1>
      </div>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#7b1fa2', fontWeight: 600 }}>⏳ Memuat data...</div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <div>
          <h1 style={s.titleText}>📅 Jadwal Kuliah</h1>
          <p style={s.titleSub}>Kelola jadwal kuliah dengan mudah</p>
        </div>
      </div>

      <div style={s.inner}>
        {/* ── Spacer ── */}
        <div style={{ height: '1.5rem' }} />

        {/* ── Message Popup ── */}
        {messagePopup.show && (
          <div style={s.overlay} onClick={closeMessagePopup}>
            <div style={s.popupBox} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.popupTitle}>{messagePopup.type === 'success' ? '✅' : '❌'}</h2>
              <p style={s.popupText}>{messagePopup.text}</p>
              <button style={s.popupBtn} onClick={closeMessagePopup}>Tutup</button>
            </div>
          </div>
        )}

        {/* ── Filter Section ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardHeaderText}>🔍 Filter Jadwal</h3>
          </div>
          <div style={s.cardBody}>
            <div style={s.filterStrip}>
              <label style={s.label}>📅 Tahun Akademik</label>
              <select value={selectedTahunAkademik} onChange={(e) => setSelectedTahunAkademik(e.target.value)} style={s.select}>
                <option value="">-- Pilih Tahun Akademik --</option>
                {tahunAkademikList.map((t) => <option key={t.id} value={t.id}>{t.tahun_akademik}</option>)}
              </select>
            </div>
            {selectedTahunAkademik && (
              <div style={s.subFilterStrip}>
                <label style={s.label}>📚 Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={s.select}>
                  {semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Control Panel ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setShowPresetsSection(!showPresetsSection)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>
                {showPresetsSection ? '▼' : '▶'}
              </button>
              <h3 style={s.cardHeaderText}>🎛️ Jadwal Copy (untuk Dosen)</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowCreateCopyModal(true)} style={s.btnSavePreset}>📋 Buat Copy Jadwal</button>
              <button onClick={handleSaveJadwalCopyChanges} style={s.btnSavePreset}>💾 Save Perubahan</button>
              {dosenList.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button 
                    onClick={() => {
                      setSelectedDosenForPref(dosenList[0]);
                      handleEditDosenPreference(dosenList[0]);
                    }}
                    style={{ ...s.btnSavePreset, backgroundColor: 'rgba(100, 200, 150, 0.3)' }}
                    title="Pilih dosen untuk edit preferensi"
                  >
                    👥 Kelola Preferensi Dosen
                  </button>
                  {dosenList.length > 1 && (
                    <select
                      onChange={(e) => {
                        const dosen = dosenList.find(d => d.id === parseInt(e.target.value));
                        if (dosen) {
                          setSelectedDosenForPref(dosen);
                          handleEditDosenPreference(dosen);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        opacity: '0',
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Pilih dosen</option>
                      {dosenList.map(d => (
                        <option key={d.id} value={d.id}>{d.f_namapegawai}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={s.cardBody}>
            {showPresetsSection && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Template Preset</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {Object.keys(presets).map((presetName) => (
                    <button key={presetName} onClick={() => { setActivePreset(presetName); setSettings(presets[presetName]); showMessage('success', `Preset ${presetName} diterapkan`); }}
                      style={activePreset === presetName ? s.btnPresetActive : s.btnPresetInactive}>{presetName}</button>
                  ))}
                </div>
                {databasePresets.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Preset Tersimpan</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                      {databasePresets.map((preset) => (
                        <div key={preset.id} style={{ position: 'relative', display: 'inline-block' }}>
                          <button onClick={() => { setActivePreset(preset.nama_preset); setSettings({ jamMulai: preset.jam_mulai, durasiSlot: preset.durasi_slot, jamIstirahatMulaiSeninKamis: preset.jam_istirahat_mulai_senin_kamis, jamIstirahatSelesaiSeninKamis: preset.jam_istirahat_selesai_senin_kamis, jamIstirahatMulaiSabtu: preset.jam_istirahat_mulai_sabtu, jamIstirahatSelesaiSabtu: preset.jam_istirahat_selesai_sabtu, jamIstirahatMulaiJumat: preset.jam_istirahat_mulai_jumat, jamIstirahatSelesaiJumat: preset.jam_istirahat_selesai_jumat, jamSelesai: preset.jam_selesai }); showMessage('success', `Preset ${preset.nama_preset} diterapkan`); }}
                            style={activePreset === preset.nama_preset ? s.btnPresetActive : s.btnPresetInactive}>{preset.nama_preset} {preset.is_default ? '⭐' : ''}</button>
                          <div style={{ position: 'absolute', top: '-8px', right: '-8px', display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleSetDefaultPreset(preset.id)}
                              title={preset.is_default ? 'Sudah default' : 'Jadikan default'}
                              style={{ background: preset.is_default ? '#ffc107' : '#b0bec5', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              ⭐
                            </button>
                            {!preset.is_default && (
                              <button onClick={() => handleDeletePreset(preset.id, preset.nama_preset)}
                                style={{ background: '#e53935', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {showPresetsSection && <div style={{ borderTop: '1px solid #f0f2ff', marginBottom: '1.5rem' }} />}

            {/* Settings grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Jam Mulai', type: 'time', val: settings.jamMulai, key: 'jamMulai' },
                { label: 'Durasi per Slot (menit)', type: 'number', val: settings.durasiSlot, key: 'durasiSlot' },
                { label: 'Jam Selesai', type: 'time', val: settings.jamSelesai, key: 'jamSelesai' },
              ].map(({ label, type, val, key }) => (
                <div key={key}>
                  <label style={s.label}>{label}</label>
                  <input type={type} value={val} min={type === 'number' ? 10 : undefined} max={type === 'number' ? 120 : undefined}
                    onChange={(e) => setSettings({ ...settings, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value })} style={s.input} />
                </div>
              ))}
              {[
                { label: 'Istirahat Senin-Kamis', mulai: 'jamIstirahatMulaiSeninKamis', selesai: 'jamIstirahatSelesaiSeninKamis' },
                { label: 'Istirahat Sabtu', mulai: 'jamIstirahatMulaiSabtu', selesai: 'jamIstirahatSelesaiSabtu' },
                { label: 'Istirahat Jumat', mulai: 'jamIstirahatMulaiJumat', selesai: 'jamIstirahatSelesaiJumat' },
              ].map(({ label, mulai, selesai }) => (
                <div key={label}>
                  <label style={s.label}>{label}</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="time" value={settings[mulai]} onChange={(e) => setSettings({ ...settings, [mulai]: e.target.value })} style={{ ...s.input, flex: 1 }} />
                    <span style={{ color: '#90a4ae' }}>–</span>
                    <input type="time" value={settings[selesai]} onChange={(e) => setSettings({ ...settings, [selesai]: e.target.value })} style={{ ...s.input, flex: 1 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <button onClick={() => setShowAutoGenModal(true)} style={s.btnPurple}>⚡ Generate Otomatis</button>
              <button onClick={exportToXLSX} style={s.btnSuccess}>📊 Export XLSX</button>
              <button onClick={() => setShowSavePresetModal(true)} style={s.btnPrimary}>💾 Simpan Preset Baru</button>
              <button onClick={handleUpdatePreset} style={s.btnAmber} title={`Simpan perubahan ke preset "${activePreset}"`}>💾 Simpan Perubahan</button>
            </div>
          </div>
        </div>

        {/* ── Day Visibility ── */}
        <div style={s.dayToggleCard}>
          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Tampilkan / Sembunyikan Hari</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {days.map((day) => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#37474f', fontWeight: 500 }}>
                <input type="checkbox" checked={visibleDays[day]} onChange={(e) => setVisibleDays({ ...visibleDays, [day]: e.target.checked })} style={{ accentColor: '#7b1fa2', width: '16px', height: '16px' }} />
                {day}
              </label>
            ))}
          </div>
        </div>

        {/* ── Schedule Matrix ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardHeaderText}>📋 Matriks Jadwal Kuliah</h3>
          </div>
          <div ref={tableRef} style={s.cardBody}>
            {days.map((day) => {
              if (!visibleDays[day]) return null;
              const dayData = jadwalData[day] || {};
              const timeSlots = generateTimeSlots(day);
              const totalSesi = Object.values(dayData).flat().length;

              return (
                <div key={day} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#4a148c', margin: 0 }}>{day}</h3>
                    <span style={s.dayBadge}>{totalSesi} sesi</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#7b1fa2 0%,#4527a0 100%)' }}>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '0.78rem', width: '120px', border: '1px solid rgba(255,255,255,0.15)' }}>Ruangan</th>
                          {timeSlots.map((slot, idx) => (
                            <th key={idx} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', color: slot.isBreak ? '#b71c1c' : 'white', fontWeight: slot.isBreak ? 700 : 600, fontSize: '0.68rem', width: '80px', backgroundColor: slot.isBreak ? '#ffcdd2' : 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}>
                              <div>{slot.start}</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>–</div><div>{slot.end}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((ruangan) => (
                          <tr key={ruangan.id} style={{ borderBottom: '1px solid #f0f2ff' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: '#37474f', backgroundColor: '#fafbff', border: '1px solid #f0f2ff', verticalAlign: 'middle' }}>
                              {ruangan.f_namaruang}
                            </td>
                            {timeSlots.map((slot, idx) => {
                              const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
                              const sessions = (dayData[ruangan.id] || []).filter((s) => semesterNumbers.includes(Number(s.semester)));
                              const sessionInSlot = sessions.find((s) => s.jam_mulai === slot.start && s.jam_selesai === slot.end);
                              const isOccupied = isSlotOccupied(day, ruangan.id, slot.start, slot.end);
                              const occupyingSession = sessions.find((s) => { const ss = timeToMinutes(s.jam_mulai); const se = timeToMinutes(s.jam_selesai); const ts = timeToMinutes(slot.start); const te = timeToMinutes(slot.end); return ss < te && se > ts; });

                              const openEditModal = (session) => {
                                setEditingSession(session); setSelectedHari(day); setSelectedRuangan(ruangan.id);
                                setSelectedJamMulai(session.jam_mulai); setCalculatedJamSelesai(session.jam_selesai);
                                if (session.kelas_id) { const kelas = kelasList.find((k) => k.id === session.kelas_id); setSelectedKelas(kelas); setSessionInputMode('import'); setSessionInput(session.kelas_id.toString()); }
                                else { setSessionInputMode('manual'); setSessionInput(session.display_name); }
                                setShowSessionModal(true);
                              };

                              if (slot.isBreak) return (
                                <td key={idx} style={s.cellBreak}>ISTIRAHAT</td>
                              );
                              if (sessionInSlot) return (
                                <td key={idx} style={s.cellOccupied}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', height: '100%', justifyContent: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>{sessionInSlot.display_name}</span>
                                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                                      <button onClick={() => openEditModal(sessionInSlot)} style={s.cellBtnEdit}>Edit</button>
                                      <button onClick={() => handleDeleteSession(sessionInSlot.id)} style={s.cellBtnDel}>Hapus</button>
                                    </div>
                                  </div>
                                </td>
                              );
                              if (isOccupied && occupyingSession) return (
                                <td key={idx} style={{ ...s.cellOccupied, backgroundColor: '#f3e5f5', border: '1px solid #e1bee7' }} onClick={() => openEditModal(occupyingSession)}>
                                  <span style={{ fontSize: '0.65rem', color: '#7b1fa2', fontStyle: 'italic', opacity: 0.75 }}>({occupyingSession.display_name})</span>
                                </td>
                              );
                              return (
                                <td key={idx} style={s.cellEmpty}>
                                  <button onClick={() => { setSelectedHari(day); setSelectedRuangan(ruangan.id); setSelectedJamMulai(slot.start); setCalculatedJamSelesai(calculateJamSelesai(slot.start, 1)); setSessionInput(''); setSelectedKelas(null); setEditingSession(null); setShowSessionModal(true); }} style={s.cellAddBtn} title="Tambah sesi">+</button>
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

      {/* ── Session Modal ── */}
      {showSessionModal && (
        <div style={s.overlay} onClick={handleSessionModalOverlayClick}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editingSession ? '✏️ Edit Sesi' : '➕ Tambah Sesi'}</h2>
              <button style={s.btnClose} onClick={() => { resetFormFields(); setShowSessionModal(false); }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={s.label}>Hari</label>
                  <input type="text" value={selectedHari} disabled style={s.inputDisabled} />
                </div>
                <div>
                  <label style={s.label}>Ruangan</label>
                  <select value={selectedRuangan} onChange={(e) => setSelectedRuangan(e.target.value)} style={s.select}>
                    <option value="">Pilih Ruangan</option>
                    {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((r) => <option key={r.id} value={r.id}>{r.f_namaruang}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Mode Input</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['manual', 'import'].map((mode) => (
                      <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', color: '#37474f', fontWeight: sessionInputMode === mode ? 700 : 400 }}>
                        <input type="radio" value={mode} checked={sessionInputMode === mode} onChange={(e) => setSessionInputMode(e.target.value)} style={{ accentColor: '#7b1fa2' }} />
                        {mode === 'manual' ? 'Manual' : 'Import dari Kelas'}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={s.label}>Jam Mulai</label>
                  <input type="time" value={selectedJamMulai} onChange={(e) => { setSelectedJamMulai(e.target.value); const sks = selectedKelas?.sks || selectedKelas?.f_sks_kurikulum || 1; setCalculatedJamSelesai(calculateJamSelesai(e.target.value, sks)); }} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Jam Selesai (Otomatis)</label>
                  <input type="time" value={calculatedJamSelesai} disabled style={s.inputDisabled} />
                  {selectedKelas && <small style={{ fontSize: '0.75rem', color: '#7b1fa2', marginTop: '0.25rem', display: 'block' }}>📊 {selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1} SKS × {settings.durasiSlot} menit</small>}
                  {selectedKelas && (() => { const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1; if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks)) { const bt = getBreakTimes(selectedHari); return <div style={s.errRed}><strong>❌ Jadwal Tidak Valid</strong><br />Kelas {sks} SKS tidak boleh terpotong istirahat <strong>{bt.mulai}–{bt.selesai}</strong></div>; } return null; })()}
                </div>
                <div>
                  <label style={s.label}>{sessionInputMode === 'manual' ? 'Nama Sesi' : 'Pilih Kelas'}</label>
                  {sessionInputMode === 'manual' ? (
                    <input type="text" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} placeholder="Contoh: Algoritma & Struktur Data" style={s.input} />
                  ) : (
                    <>
                      {kelasList.length > 0 ? (
                        <select value={sessionInput} onChange={(e) => { setSessionInput(e.target.value); const kelas = kelasList.find((k) => k.id === parseInt(e.target.value)); if (kelas) { setSelectedKelas(kelas); setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, kelas.sks || kelas.f_sks_kurikulum || 1)); } else { setSelectedKelas(null); setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, 1)); } }} style={s.select}>
                          <option value="">Pilih Kelas</option>
                          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.display_name || k.nama_kelas} (SKS: {k.sks || k.f_sks_kurikulum})</option>)}
                        </select>
                      ) : (
                        <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e8eaf6', fontSize: '0.875rem', color: '#c4403d', backgroundColor: '#fce4ec' }}>
                          <strong>❌ Tidak ada kelas</strong><br />
                          <small>Pastikan sudah memilih tahun akademik dan semester</small>
                        </div>
                      )}
                      {selectedKelas && !editingSession && (() => { const es = findExistingKelasSchedule(selectedKelas.id); return es.found ? <div style={s.warnYellow}><strong>⚠️ Sudah dijadwalkan</strong><br />{es.hari} pukul {es.jamMulai}–{es.jamSelesai} di {es.ruangan}</div> : null; })()}
                    </>
                  )}
                </div>
                {selectedRuangan && (() => { const ov = findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai); return ov.found ? <div style={s.errRed}><strong>❌ Waktu Bentrok</strong><br />Sudah dipakai oleh <strong>{ov.conflictName}</strong> pukul <strong>{ov.conflictTime}</strong></div> : null; })()}
              </div>
              {(() => {
                const isDuplicate = sessionInputMode === 'import' && selectedKelas && !editingSession && findExistingKelasSchedule(selectedKelas.id).found;
                const sks = selectedKelas?.sks || selectedKelas?.f_sks_kurikulum || 1;
                const isCutByBreak = selectedKelas && sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks);
                const isOverlap = selectedRuangan && findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai).found;
                const isDisabled = isDuplicate || isCutByBreak || isOverlap;
                return (
                  <div style={s.modalFooter}>
                    <button onClick={() => { resetFormFields(); setShowSessionModal(false); }} style={s.btnGray}>Batal</button>
                    <button onClick={handleAddSession} disabled={isDisabled} style={isDisabled ? s.btnGrayDisabled : s.btnPrimary}>{editingSession ? 'Update' : 'Simpan'}</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-Gen Modal ── */}
      {showAutoGenModal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>⚡ Generate Jadwal Otomatis</h2>
              <button style={s.btnClose} onClick={() => setShowAutoGenModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {[{ key: 'fillEmptyOnly', label: 'Isi hanya kelas yang belum dijadwalkan' }, { key: 'usePreferences', label: 'Gunakan preferensi dosen' }].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#37474f' }}>
                    <input type="checkbox" checked={autoGenSettings[key]} onChange={(e) => setAutoGenSettings({ ...autoGenSettings, [key]: e.target.checked })} style={{ accentColor: '#7b1fa2' }} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={s.infoBlue}>Sistem akan membuat jadwal berdasarkan preferensi dosen dan ketersediaan ruangan.</div>
              <div style={s.modalFooter}>
                <button onClick={() => setShowAutoGenModal(false)} style={s.btnGray}>Batal</button>
                <button onClick={generateScheduleAuto} style={s.btnPurple}>Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Preset Modal ── */}
      {showSavePresetModal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>� Simpan Preset Baru</h2>
              <button style={s.btnClose} onClick={() => { setShowSavePresetModal(false); setNewPresetName(''); }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nama Preset</label>
              <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Contoh: Preset Pagi, Preset Sore" onKeyPress={(e) => { if (e.key === 'Enter') handleSavePreset(); }} style={s.input} />
              <div style={s.presetInfoBox}>
                <strong>Konfigurasi yang akan disimpan:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', lineHeight: 1.8 }}>
                  <li>Jam Mulai: <code>{settings.jamMulai}</code></li>
                  <li>Durasi Slot: <code>{settings.durasiSlot} menit</code></li>
                  <li>Jam Selesai: <code>{settings.jamSelesai}</code></li>
                  <li>Istirahat Senin-Kamis: <code>{settings.jamIstirahatMulaiSeninKamis} - {settings.jamIstirahatSelesaiSeninKamis}</code></li>
                  <li>Istirahat Sabtu: <code>{settings.jamIstirahatMulaiSabtu} - {settings.jamIstirahatSelesaiSabtu}</code></li>
                  <li>Istirahat Jumat: <code>{settings.jamIstirahatMulaiJumat} - {settings.jamIstirahatSelesaiJumat}</code></li>
                </ul>
              </div>
              <div style={s.modalFooter}>
                <button onClick={() => { setShowSavePresetModal(false); setNewPresetName(''); }} disabled={presetSaving} style={presetSaving ? s.btnGrayDisabled : s.btnGray}>Batal</button>
                <button onClick={handleSavePreset} disabled={presetSaving || !newPresetName.trim()} style={presetSaving || !newPresetName.trim() ? s.btnGrayDisabled : s.btnPrimary}>{presetSaving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Jadwal Copy Modal ── */}
      {showCreateCopyModal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>📋 Jadwal Copy untuk Dosen</h2>
              <button style={s.btnClose} onClick={() => { setShowCreateCopyModal(false); setCopyMessage(''); }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.presetInfoBox}>
                <strong>Fitur Jadwal Copy</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', lineHeight: 1.8 }}>
                  <li><strong>Buat Copy Jadwal:</strong> Membuat snapshot jadwal saat ini untuk dosen</li>
                  <li><strong>Save Perubahan:</strong> Menyinkronkan perubahan jadwal ke copy</li>
                  <li>Dosen akan melihat copy di dashboard mereka dengan pilihan Daring/Luring</li>
                </ul>
              </div>
              {copyMessage && (
                <div style={{ padding: '0.75rem 1rem', background: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.875rem', marginTop: '1rem' }}>
                  ✓ {copyMessage}
                </div>
              )}
              <div style={s.modalFooter}>
                <button onClick={() => { setShowCreateCopyModal(false); setCopyMessage(''); }} disabled={copyOperationPending} style={copyOperationPending ? s.btnGrayDisabled : s.btnGray}>
                  Tutup
                </button>
                <button onClick={handleCreateJadwalCopy} disabled={copyOperationPending} style={copyOperationPending ? s.btnGrayDisabled : s.btnPrimary}>
                  {copyOperationPending ? 'Memproses...' : '📋 Buat Copy Jadwal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferensi Dosen Modal ── */}
      {showPreferenceModal && selectedDosenForPref && (
        <div style={s.overlay} onClick={() => setShowPreferenceModal(false)}>
          <div style={{ ...s.modalBox, maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>📅 Preferensi {selectedDosenForPref.f_namapegawai}</h2>
              <button style={s.btnClose} onClick={() => setShowPreferenceModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {databasePresetsList.length > 0 && databasePresetsList[0]?.jam_mulai ? (
                <>
                  <div style={s.presetInfoBox}>
                    <strong>📋 Preset Aktif:</strong> {databasePresetsList[0].nama_preset || 'Default'}
                    <br />
                    <small>
                      ({databasePresetsList[0].jam_mulai} - {databasePresetsList[0].jam_selesai}, Durasi: {databasePresetsList[0].durasi_slot} menit)
                    </small>
                  </div>

                  {/* Floor Preferences Section */}
                  <div style={{...s.presetInfoBox, marginTop: '1rem'}}>
                    <strong>🏢 Preferensi Lantai:</strong>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4].map((floor) => (
                        <label key={floor} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#37474f', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={floorPreferences[floor] || false}
                            onChange={(e) => setFloorPreferences({ ...floorPreferences, [floor]: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7b1fa2' }}
                          />
                          Lantai {floor}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', marginBottom: '1rem' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#7b1fa2 0%,#4527a0 100%)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: '0.78rem', minWidth: '80px', border: '1px solid #e8eaf6' }}>
                            <input
                              type="checkbox"
                              checked={(() => {
                                const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                let total = 0, checked = 0;
                                days.forEach((day) => {
                                  Object.keys(preferences[day] || {}).forEach((session) => {
                                    total++;
                                    if (preferences[day][session]) checked++;
                                  });
                                });
                                return total > 0 && checked === total;
                              })()}
                              onChange={() => {
                                setPreferences((prev) => {
                                  const updated = { ...prev };
                                  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                  let total = 0, checked = 0;
                                  days.forEach((day) => {
                                    Object.keys(updated[day] || {}).forEach((session) => {
                                      total++;
                                      if (updated[day][session]) checked++;
                                    });
                                  });
                                  const allChecked = total > 0 && checked === total;
                                  const newValue = !allChecked;
                                  days.forEach((day) => {
                                    Object.keys(updated[day] || {}).forEach((session) => {
                                      updated[day][session] = newValue;
                                    });
                                  });
                                  return updated;
                                });
                              }}
                              style={{ accentColor: '#7b1fa2', cursor: 'pointer' }}
                              title="Pilih Semua"
                            />
                          </th>
                          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
                            <th key={day} style={{ padding: '0.75rem', textAlign: 'center', color: 'white', fontWeight: 700, fontSize: '0.78rem', minWidth: '100px', border: '1px solid #e8eaf6' }}>
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(preferences['Senin'] || {}).map((session) => (
                          <tr key={session} style={{ borderBottom: '1px solid #f0f2ff' }}>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', backgroundColor: '#fafbff', border: '1px solid #f0f2ff', minWidth: '80px' }}>
                              {session}
                            </td>
                            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
                              <td key={`${day}-${session}`} style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #f0f2ff', backgroundColor: preferences[day]?.[session] ? '#e8f5e9' : 'white' }}>
                                <input
                                  type="checkbox"
                                  checked={preferences[day]?.[session] || false}
                                  onChange={(e) => {
                                    setPreferences({
                                      ...preferences,
                                      [day]: {
                                        ...preferences[day],
                                        [session]: e.target.checked
                                      }
                                    });
                                  }}
                                  style={{ accentColor: '#7b1fa2', cursor: 'pointer', width: '18px', height: '18px' }}
                                  title={`${day} jam ${session}`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={s.presetInfoBox}>
                    <small>✅ = Tersedia | ☐ = Tidak tersedia | Default: Semua hari tersedia kecuali Sabtu</small>
                  </div>
                </>
              ) : (
                <div style={s.errRed}>
                  <strong>⚠️ Belum ada preset jadwal</strong>
                  <br />
                  <small>Silakan buat preset terlebih dahulu di bagian Jadwal Copy</small>
                </div>
              )}

              <div style={s.modalFooter}>
                <button
                  onClick={() => setShowPreferenceModal(false)}
                  style={s.btnGray}
                >
                  ❌ Batal
                </button>
                <button
                  onClick={handleSaveDosenPreference}
                  disabled={databasePresetsList.length === 0}
                  style={databasePresetsList.length === 0 ? s.btnGrayDisabled : s.btnPrimary}
                >
                  💾 Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}