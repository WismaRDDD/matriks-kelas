'use client';

import { useEffect, useState } from 'react';

export default function DosenPage() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });
  const [importStats, setImportStats] = useState({ show: false, success: 0, duplicate: 0, failed: 0 });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  const [showPreferenceForm, setShowPreferenceForm] = useState(false);
  const [presets, setPresets] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [floorPreferences, setFloorPreferences] = useState({ 1: true, 2: true, 3: true, 4: true });

  const [form, setForm] = useState({
    id: '',
    f_nidn: '',
    f_nip: '',
    f_title_depan: '',
    f_namapegawai: '',
    f_title_belakang: '',
    f_tempatlahir: '',
    f_tanggallahir: '',
    f_jeniskelamin: '',
    f_progdi_id: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const defaultDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const defaultFloorPreference = { 1: true, 2: true, 3: true, 4: true };

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dosen');
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        const apiError = payload?.error || `HTTP ${res.status}`;
        throw new Error(apiError);
      }

      const safeData = Array.isArray(payload) ? payload : [];
      safeData.sort((a, b) => new Date(a.f_tanggallahir) - new Date(b.f_tanggallahir));

      setData(safeData);
      setSelectedIds([]);
    } catch (error) {
      setData([]);
      showMessage('error', `Gagal memuat data dosen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Presets
  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/jadwal/presets');
      if (!res.ok) {
        throw new Error(`Failed to fetch presets: ${res.status}`);
      }
      const data = await res.json();
      setPresets(data);
    } catch (err) {
      console.error('Error fetching presets:', err);
      setPresets([]);
    }
  };

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };

  const closeImportStats = () => {
    setImportStats({ show: false, success: 0, duplicate: 0, failed: 0 });
  };

  // Form Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    // Validations
    if (!form.f_nidn) {
      showMessage('error', 'NIDN wajib diisi');
      return;
    }
    if (!/^\d+$/.test(form.f_nidn)) {
      showMessage('error', 'NIDN harus berupa angka');
      return;
    }
    if (form.f_nidn.length !== 10 && form.f_nidn.length !== 12) {
      showMessage('error', 'NIDN harus 10 atau 12 digit');
      return;
    }

    if (!form.f_nip) {
      showMessage('error', 'NIP wajib diisi');
      return;
    }
    if (!/^\d+$/.test(form.f_nip)) {
      showMessage('error', 'NIP harus berupa angka');
      return;
    }

    if (!form.f_namapegawai) {
      showMessage('error', 'Nama dosen wajib diisi');
      return;
    }

    // Tanggal validation
    if (form.f_tanggallahir) {
      const date = new Date(form.f_tanggallahir);
      if (isNaN(date.getTime())) {
        showMessage('error', 'Tanggal lahir tidak valid');
        return;
      }
      
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year < 1950 || year > currentYear) {
        showMessage('error', 'Tahun lahir tidak valid');
        return;
      }
    }

    // Jenis kelamin validation
    if (form.f_jeniskelamin && !['L', 'P'].includes(form.f_jeniskelamin)) {
      showMessage('error', 'Jenis kelamin harus L atau P');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = '/api/dosen';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Gagal menyimpan data');

      showMessage('success', form.id ? 'Data dosen berhasil diupdate' : 'Data dosen berhasil ditambahkan');
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      f_nidn: '',
      f_nip: '',
      f_title_depan: '',
      f_namapegawai: '',
      f_title_belakang: '',
      f_tempatlahir: '',
      f_tanggallahir: '',
      f_jeniskelamin: '',
      f_progdi_id: '',
    });
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (data) => {
    setForm({
      id: data.id,
      f_nidn: data.f_nidn || '',
      f_nip: data.f_nip || '',
      f_title_depan: data.f_title_depan || '',
      f_namapegawai: data.f_namapegawai || '',
      f_title_belakang: data.f_title_belakang || '',
      f_tempatlahir: data.f_tempatlahir || '',
      f_tanggallahir: data.f_tanggallahir ? new Date(data.f_tanggallahir).toISOString().split('T')[0] : '',
      f_jeniskelamin: data.f_jeniskelamin || '',
      f_progdi_id: data.f_progdi_id || '',
    });
    setShowForm(true);
  };

  const buildDefaultPreferences = () => {
    const newPreferences = {};

    defaultDays.forEach((day, index) => {
      newPreferences[day] = {};

      const activePreset = presets[0];
      if (!activePreset?.jam_mulai || !activePreset?.jam_selesai || !activePreset?.durasi_slot) {
        return;
      }

      const sessions = generateSessions(
        activePreset.jam_mulai,
        activePreset.jam_selesai,
        activePreset.durasi_slot,
        activePreset,
        day,
      );

      sessions.forEach((session) => {
        newPreferences[day][session] = index !== 5;
      });
    });

    return newPreferences;
  };

  const isDefaultPreferenceState = () => {
    const defaultPreferences = buildDefaultPreferences();
    const hasSameSessions = defaultDays.every((day) =>
      Object.keys(defaultPreferences[day] || {}).every((session) => preferences[day]?.[session] === defaultPreferences[day][session])
    );

    const hasSameFloors = Object.keys(defaultFloorPreference).every((floor) => floorPreferences[floor] === defaultFloorPreference[floor]);

    return hasSameSessions && hasSameFloors;
  };

  const handleResetPreferences = () => {
    const resetPreferences = buildDefaultPreferences();
    setPreferences(resetPreferences);
    setFloorPreferences({ ...defaultFloorPreference });
    showMessage('success', 'Preferensi berhasil dikembalikan ke default');
  };

  const handleEditPreference = async (data) => {
    setForm({ id: data.id, f_namapegawai: data.f_namapegawai });

    const newPreferences = buildDefaultPreferences();

    // Load existing preferences
    try {
      const res = await fetch(`/api/dosen/preferences?dosenId=${data.id}`);
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
            setFloorPreferences({ ...defaultFloorPreference });
          }
        } else {
          setFloorPreferences({ ...defaultFloorPreference });
        }
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setFloorPreferences({ ...defaultFloorPreference });
    }

    setPreferences(newPreferences);
    setShowPreferenceForm(true);
  };

  const handleSelectAllSessionsForDay = (day, sessions) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[day]) updated[day] = {};
      
      // Check if ALL sessions for this day are checked
      const allSessionsChecked = sessions.length > 0 && sessions.every((session) => updated[day]?.[session]);
      
      // Explicit logic: uncheck ONLY if all are checked, otherwise check all
      const newValue = allSessionsChecked ? false : true;
      sessions.forEach((session) => {
        updated[day][session] = newValue;
      });
      return updated;
    });
  };

  const handleSelectAllDaysForSession = (session, days) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      
      // Check if ALL days for this session are checked
      const allDaysChecked = days.every((day) => updated[day]?.[session]);
      
      // Explicit logic: uncheck ONLY if all are checked, otherwise check all
      const newValue = allDaysChecked ? false : true;
      days.forEach((day) => {
        if (!updated[day]) updated[day] = {};
        updated[day][session] = newValue;
      });
      return updated;
    });
  };

  const handleSelectAllPreferences = () => {
    setPreferences((prev) => {
      const updated = { ...prev };
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      // Count total and checked items
      let totalItems = 0;
      let checkedItems = 0;
      days.forEach((day) => {
        Object.keys(updated[day] || {}).forEach((session) => {
          totalItems++;
          if (updated[day][session]) checkedItems++;
        });
      });
      
      // Explicit logic: uncheck ONLY if all are checked, otherwise check all
      const allChecked = totalItems > 0 && checkedItems === totalItems;
      const newValue = allChecked ? false : true;
      days.forEach((day) => {
        if (!updated[day]) updated[day] = {};
        // Get all sessions for this day
        const sessions = Object.keys(updated[day]);
        sessions.forEach((session) => {
          updated[day][session] = newValue;
        });
      });
      return updated;
    });
  };

  const generateSessions = (jamMulai, jamSelesai, durasi, preset, day = 'Senin') => {
    const sessions = [];
    if (!jamMulai || !jamSelesai || !durasi) {
      return sessions;
    }
    
    const durasiNumber = typeof durasi === 'string' ? parseInt(durasi, 10) : durasi;
    let current = jamBulaiToMinutes(jamMulai);
    const end = jamBulaiToMinutes(jamSelesai);
    
    // Get break times based on day
    let breakStart = null;
    let breakEnd = null;
    
    if (preset) {
      if (day === 'Jumat') {
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_jumat);
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_jumat);
      } else if (day === 'Sabtu') {
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_sabtu);
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_sabtu);
      } else {
        // Senin - Kamis
        breakStart = jamBulaiToMinutes(preset.jam_istirahat_mulai_senin_kamis);
        breakEnd = jamBulaiToMinutes(preset.jam_istirahat_selesai_senin_kamis);
      }
    }
    
    while (current < end) {
      const sessionStart = current;
      const sessionEnd = current + durasiNumber;
      
      // Skip this session if it overlaps with break time
      if (breakStart !== null && breakEnd !== null) {
        if (sessionEnd > breakStart && sessionStart < breakEnd) {
          // Session overlaps with break, skip to after break
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

  const handleSavePreference = async () => {
    try {
      const preferredFloors = Object.keys(floorPreferences)
        .filter(floor => floorPreferences[floor])
        .join(',');
      
      const res = await fetch('/api/dosen/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dosenId: form.id,
          preferences,
          preferredFloors: preferredFloors || '1,2,3,4',
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Gagal menyimpan preferensi');
      }

      showMessage('success', '✅ Preferensi dosen berhasil disimpan');
      setShowPreferenceForm(false);
    } catch (err) {
      console.error('Error saving preferences:', err);
      showMessage('error', `❌ ${err.message}`);
    }
  };

  // Import Handlers
  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/dosen/import');
      
      if (!res.ok) {
        throw new Error('Download template gagal');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-dosen.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showMessage('success', '✅ Template berhasil diunduh');
    } catch (error) {
      showMessage('error', `❌ ${error.message}`);
    }
  };

  // Import Data Handler
  const handleImport = async () => {
    if (!file) {
      showMessage('error', 'Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/dosen/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Import gagal');
      }

      // Tampilkan statistik import
      const summary = result.summary || result;
      setImportStats({
        show: true,
        success: summary.success || 0,
        duplicate: summary.duplicated || summary.duplicate || 0,
        failed: summary.failed || 0,
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete Handlers
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sortedData.length && sortedData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedData.map((d) => d.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      showMessage('error', 'Pilih data yang akan dihapus');
      return;
    }

    if (!confirm(`Hapus ${selectedIds.length} data dosen yang dipilih?`)) return;

    try {
      const res = await fetch('/api/dosen/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');

      showMessage('success', `${selectedIds.length} data dosen berhasil dihapus`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus dosen "${nama}"?`)) return;

    try {
      const res = await fetch('/api/dosen/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');

      showMessage('success', 'Data dosen berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // Helper Functions
  function formatDateDisplay(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatNamaLengkap(dosen) {
    let nama = '';
    if (dosen.f_title_depan) nama += dosen.f_title_depan + ' ';
    nama += dosen.f_namapegawai;
    if (dosen.f_title_belakang) nama += ', ' + dosen.f_title_belakang;
    return nama;
  }

  // Sort Function
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...data];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'f_tanggallahir') {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕️';
  };

  // Add hover styles on client side only
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      button:hover {
        opacity: 0.85;
        transform: translateY(-1px);
      }
      
      input:hover, select:hover, textarea:hover {
        border-color: #667eea;
      }
      
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      tr:hover {
        background-color: #f7fafc !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>👨‍🏫 Dashboard Dosen</h1>

        {/* Message Display - REMOVED, replaced with modal */}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={handleAddNew}>
              ➕ Tambah Dosen
            </button>
            <button style={styles.btnSuccess} onClick={downloadTemplate}>
              📥 Download Template
            </button>
            <button style={styles.btnSuccess} onClick={() => document.getElementById('fileInput').click()}>
              📂 Import Excel
            </button>
            <button style={styles.btnDanger} onClick={handleDeleteSelected}>
              🗑️ Hapus ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* File Upload Section */}
        {file && (
          <div style={styles.fileInfo}>
            <span>📎 {file.name}</span>
            <button style={styles.btnSuccess} onClick={handleImport} disabled={uploading}>
              {uploading ? '⏳ Mengupload...' : '📤 Upload'}
            </button>
            <button style={styles.btnSecondary} onClick={() => setFile(null)}>
              ❌ Batal
            </button>
          </div>
        )}

        <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => setFile(e.target.files[0])} />

        {/* Table Section */}
        <div style={styles.tableWrapper}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>📋 Daftar Dosen</h2>
            <span style={styles.badge}>Total: {data.length} dosen</span>
          </div>

          {loading ? (
            <div style={styles.loading}>⏳ Memuat data...</div>
          ) : data.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>Belum ada data dosen</p>
              <small>Klik &quot;Tambah Dosen&quot; atau import dari Excel</small>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.thCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                        onChange={handleSelectAll}
                        style={styles.checkbox}
                      />
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_nidn')}>
                      NIDN {renderSortIcon('f_nidn')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_nip')}>
                      NIP {renderSortIcon('f_nip')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_namapegawai')}>
                      Nama Lengkap {renderSortIcon('f_namapegawai')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_tempatlahir')}>
                      Tempat Lahir {renderSortIcon('f_tempatlahir')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_tanggallahir')}>
                      Tanggal Lahir {renderSortIcon('f_tanggallahir')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_jeniskelamin')}>
                      JK {renderSortIcon('f_jeniskelamin')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_progdi_id')}>
                      Prodi ID {renderSortIcon('f_progdi_id')}
                    </th>
                    <th style={styles.thAksi}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((d, index) => (
                    <tr key={d.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                      <td style={styles.tdCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => handleSelect(d.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCode}>{d.f_nidn}</span>
                      </td>
                      <td style={styles.td}>{d.f_nip}</td>
                      <td style={styles.td}>
                        <strong>{formatNamaLengkap(d)}</strong>
                      </td>
                      <td style={styles.td}>{d.f_tempatlahir || '-'}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeDate}>{formatDateDisplay(d.f_tanggallahir)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={d.f_jeniskelamin === 'L' ? styles.badgeMale : styles.badgeFemale}>
                          {d.f_jeniskelamin === 'L' ? '♂ Laki-laki' : d.f_jeniskelamin === 'P' ? '♀ Perempuan' : '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeProdi}>{d.f_progdi_id || '-'}</span>
                      </td>
                      <td style={styles.tdAksi}>
                        <button style={styles.btnIconPrimary} onClick={() => handleEdit(d)} title="Edit Biodata">
                          ✏️
                        </button>
                        <button style={styles.btnIconInfo} onClick={() => handleEditPreference(d)} title="Edit Preferensi">
                          📅
                        </button>
                        <button style={styles.btnIconDanger} onClick={() => handleDeleteOne(d.id, d.f_namapegawai)} title="Hapus">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pesan Popup */}
      {messagePopup.show && (
        <div style={styles.modal} onClick={closeMessagePopup}>
          <div
            style={{
              ...styles.modalContentSmall,
              ...(messagePopup.type === 'success' ? styles.popupSuccess : styles.popupError),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.popupIcon}>
              {messagePopup.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={styles.popupText}>{messagePopup.text}</p>
            <button style={styles.btnClose} onClick={closeMessagePopup}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Import Stats */}
      {importStats.show && (
        <div style={styles.modal} onClick={closeImportStats}>
          <div
            style={styles.modalContentSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.popupTitle}>📊 Hasil Import</h3>
            <div style={styles.statsContainer}>
              <div style={{ ...styles.statBox, ...styles.statSuccess }}>
                <div style={styles.statNumber}>{importStats.success}</div>
                <div style={styles.statLabel}>Berhasil</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statWarning }}>
                <div style={styles.statNumber}>{importStats.duplicate}</div>
                <div style={styles.statLabel}>Duplikat</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statError }}>
                <div style={styles.statNumber}>{importStats.failed}</div>
                <div style={styles.statLabel}>Gagal</div>
              </div>
            </div>
            <button style={styles.btnClose} onClick={closeImportStats}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {form.id ? '✏️ Edit Biodata Dosen' : '➕ Tambah Dosen'}
            </h3>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>NIDN *</label>
                <input
                  style={styles.input}
                  name="f_nidn"
                  value={form.f_nidn}
                  onChange={handleChange}
                  placeholder="10 atau 12 digit angka"
                  disabled={!!form.id}
                  maxLength="12"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>NIP *</label>
                <input
                  style={styles.input}
                  name="f_nip"
                  value={form.f_nip}
                  onChange={handleChange}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Gelar Depan</label>
                <input
                  style={styles.input}
                  name="f_title_depan"
                  value={form.f_title_depan}
                  onChange={handleChange}
                  placeholder="Contoh: Dr., Prof."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Dosen *</label>
                <input
                  style={styles.input}
                  name="f_namapegawai"
                  value={form.f_namapegawai}
                  onChange={handleChange}
                  placeholder="Nama lengkap"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Gelar Belakang</label>
                <input
                  style={styles.input}
                  name="f_title_belakang"
                  value={form.f_title_belakang}
                  onChange={handleChange}
                  placeholder="Contoh: M.Kom., Ph.D"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tempat Lahir</label>
                <input
                  style={styles.input}
                  name="f_tempatlahir"
                  value={form.f_tempatlahir}
                  onChange={handleChange}
                  placeholder="Kota tempat lahir"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tanggal Lahir</label>
                <input
                  style={styles.input}
                  type="date"
                  name="f_tanggallahir"
                  value={form.f_tanggallahir}
                  onChange={handleChange}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Program Studi ID</label>
                <input
                  style={styles.input}
                  name="f_progdi_id"
                  value={form.f_progdi_id}
                  onChange={handleChange}
                  placeholder="ID Program Studi"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Jenis Kelamin</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="f_jeniskelamin"
                      value="L"
                      checked={form.f_jeniskelamin === 'L'}
                      onChange={handleChange}
                    />
                    <span>♂ Laki-laki</span>
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="f_jeniskelamin"
                      value="P"
                      checked={form.f_jeniskelamin === 'P'}
                      onChange={handleChange}
                    />
                    <span>♀ Perempuan</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmit}>
                💾 Simpan
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                ❌ Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preferensi Dosen */}
      {showPreferenceForm && (
        <div style={styles.modal} onClick={() => setShowPreferenceForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitleRow}>
              <h3 style={styles.modalTitle}>📅 Preferensi Dosen - {form.f_namapegawai}</h3>
              <span style={isDefaultPreferenceState() ? styles.statusBadgeDefault : styles.statusBadgeCustom}>
                {isDefaultPreferenceState() ? 'Default' : 'Custom'}
              </span>
            </div>

            {presets.length > 0 && presets[0]?.jam_mulai ? (
              <>
                <div style={styles.presetInfo}>
                  <strong>📋 Preset:</strong> {presets[0].nama_preset || 'Default'}
                  <span style={styles.presetDetails}>
                    ({presets[0].jam_mulai} - {presets[0].jam_selesai}, Durasi: {presets[0].durasi_slot} menit)
                  </span>
                </div>

                {/* Floor Preferences Section */}
                <div style={{...styles.presetInfo, marginTop: '1rem'}}>
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

                <div style={styles.preferenceGrid}>
                  <table style={styles.preferenceTable}>
                    <thead>
                      <tr>
                        <th style={styles.preferenceHeaderCell}>
                          <input
                            type="checkbox"
                            checked={(() => {
                              const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                              return days.every((day) =>
                                Object.keys(preferences[day] || {}).every((session) => preferences[day][session])
                              );
                            })()}
                            onChange={handleSelectAllPreferences}
                            style={styles.checkbox}
                            title="Pilih semua"
                          />
                        </th>
                        <th style={styles.preferenceHeaderCell}>Hari</th>
                        {(() => {
                          const sessions = generateSessions(presets[0].jam_mulai, presets[0].jam_selesai, presets[0].durasi_slot, presets[0], 'Senin');
                          return sessions.map((session) => (
                            <th key={session} style={styles.preferenceHeaderCell}>
                              <div style={styles.sessionHeaderDiv}>
                                <span>{session}</span>
                                <input
                                  type="checkbox"
                                  checked={(() => {
                                    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                    const dayCount = days.length;
                                    const checkedCount = days.filter((day) => preferences[day]?.[session]).length;
                                    return dayCount > 0 && checkedCount === dayCount;
                                  })()}
                                  onChange={() => handleSelectAllDaysForSession(session, ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'])}
                                  style={styles.checkboxSmall}
                                  title={`Pilih semua hari untuk ${session}`}
                                />
                              </div>
                            </th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
                        const sessions = generateSessions(presets[0].jam_mulai, presets[0].jam_selesai, presets[0].durasi_slot, presets[0], day);
                        const allSessionsChecked = sessions.length > 0 && sessions.every((session) => preferences[day]?.[session]);
                        return (
                          <tr key={day}>
                            <td style={styles.preferenceCell}>
                              <input
                                type="checkbox"
                                checked={allSessionsChecked}
                                onChange={() => handleSelectAllSessionsForDay(day, sessions)}
                                style={styles.checkbox}
                                title={`Pilih semua sesi untuk ${day}`}
                              />
                            </td>
                            <td style={styles.preferenceRowHeader}>{day}</td>
                            {sessions.map((session) => (
                              <td key={session} style={styles.preferenceCell}>
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
                                  style={styles.checkbox}
                                  title={`${day} jam ${session}`}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={styles.presetLegend}>
                  <small>✅ = Tersedia | ❌ = Tidak tersedia | Default: Semua hari tersedia kecuali Sabtu</small>
                </div>
              </>
            ) : (
              <div style={styles.emptyState}>
                <p>⚠️ Belum ada preset jadwal. Silakan buat preset terlebih dahulu di menu Jadwal.</p>
              </div>
            )}

            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={handleResetPreferences}>
                ↺ Reset ke Default
              </button>
              <button style={styles.btnPrimary} onClick={handleSavePreference} disabled={presets.length === 0}>
                💾 Simpan
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowPreferenceForm(false)}>
                ❌ Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const styles = {

  // ── Page shell ────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    background: '#f4f6fb',           // light blue-grey page bg (like Moodle body)
    padding: '2rem',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  },

  // ── Top card / header banner ──────────────────────────────
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },

  // Page-level title bar (mimics the LeADS gradient header)
  titleBar: {
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    padding: '1.25rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#000000',
    margin: 0,
    letterSpacing: '0.02em',
  },

  titleBreadcrumb: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.75)',
    margin: 0,
  },

  // Inner content padding
  cardBody: {
    padding: '2rem',
  },

  // ── Alert messages ─────────────────────────────────────────
  message: {
    padding: '0.9rem 1.25rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontWeight: '500',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  messageSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #a5d6a7',
  },
  messageError: {
    backgroundColor: '#fce4ec',
    color: '#b71c1c',
    border: '1px solid #ef9a9a',
  },

  // ── Toolbar ────────────────────────────────────────────────
  toolbar: {
    marginBottom: '1.5rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#f8f9fe',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // ── Buttons (LeADS palette) ────────────────────────────────
  btnPrimary: {
    padding: '0.55rem 1.2rem',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(123,31,162,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnSuccess: {
    padding: '0.55rem 1.2rem',
    background: 'linear-gradient(135deg, #00897b, #00695c)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,137,123,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnDanger: {
    padding: '0.55rem 1.2rem',
    background: 'linear-gradient(135deg, #e53935, #b71c1c)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(229,57,53,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnSecondary: {
    padding: '0.55rem 1.2rem',
    background: '#eceff1',
    color: '#455a64',
    border: '1px solid #cfd8dc',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnInfo: {
    padding: '0.55rem 1.2rem',
    background: 'linear-gradient(135deg, #1e88e5, #1565c0)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(30,136,229,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },

  // ── File info strip ────────────────────────────────────────
  fileInfo: {
    backgroundColor: '#e8eaf6',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    border: '1px solid #c5cae9',
    fontSize: '0.875rem',
    color: '#283593',
    fontWeight: '500',
  },

  // ── Table section ──────────────────────────────────────────
  tableWrapper: {
    marginTop: '1.5rem',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    padding: '0 0.25rem',
  },
  tableTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#37474f',
    margin: 0,
  },
  badge: {
    backgroundColor: '#e8eaf6',
    color: '#3949ab',
    padding: '0.25rem 0.85rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },

  // ── Empty / loading states ─────────────────────────────────
  emptyState: {
    textAlign: 'center',
    padding: '3.5rem 2rem',
    backgroundColor: '#fafbff',
    borderRadius: '12px',
    color: '#90a4ae',
    border: '2px dashed #e8eaf6',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#7b1fa2',
    fontSize: '1rem',
    fontWeight: '500',
  },

  // ── Table ──────────────────────────────────────────────────
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeaderRow: {
    background: 'linear-gradient(135deg, #7b1fa2 0%, #4527a0 100%)',
  },
  th: {
    padding: '0.9rem 1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#ffffff',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  thCheckbox: {
    padding: '0.9rem 1rem',
    width: '44px',
    textAlign: 'center',
    color: '#ffffff',
  },
  thAksi: {
    padding: '0.9rem 1rem',
    width: '110px',
    textAlign: 'center',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  td: {
    padding: '0.85rem 1rem',
    color: '#37474f',
    fontSize: '0.875rem',
    verticalAlign: 'middle',
  },
  tdCheckbox: {
    padding: '0.85rem 1rem',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  tdAksi: {
    padding: '0.85rem 1rem',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  tableRow: {
    borderBottom: '1px solid #f0f2ff',
    transition: 'background-color 0.15s',
  },
  tableRowEven: {
    backgroundColor: '#fafbff',
    borderBottom: '1px solid #f0f2ff',
  },
  checkbox: {
    cursor: 'pointer',
    width: '17px',
    height: '17px',
    accentColor: '#7b1fa2',
  },

  // ── Data badges ────────────────────────────────────────────
  badgeCode: {
    backgroundColor: '#ede7f6',
    color: '#4527a0',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
    fontFamily: 'monospace',
    letterSpacing: '0.03em',
  },
  badgeDate: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
  },
  badgeMale: {
    backgroundColor: '#e3f2fd',
    color: '#0d47a1',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeFemale: {
    backgroundColor: '#fce4ec',
    color: '#880e4f',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeProdi: {
    backgroundColor: '#e0f2f1',
    color: '#004d40',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
  },

  // ── Row action icon-buttons ────────────────────────────────
  btnIconPrimary: {
    background: '#ede7f6',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.35rem 0.6rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    marginRight: '0.4rem',
    color: '#4527a0',
  },
  btnIconDanger: {
    background: '#fce4ec',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.35rem 0.6rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    color: '#b71c1c',
  },
  btnIconInfo: {
    background: '#e3f2fd',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.35rem 0.6rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    marginRight: '0.4rem',
    color: '#0d47a1',
  },

  // ── Modal overlay + content ────────────────────────────────
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(30,10,50,0.55)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '14px',
    minWidth: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  // Coloured modal header bar (same gradient as titleBar)
  modalHeader: {
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    padding: '1.1rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#000000',
    margin: 0,
  },
  statusBadgeDefault: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #a5d6a7',
  },
  statusBadgeCustom: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #ffcc80',
  },
  modalCloseBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '1.2rem',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    lineHeight: 1,
  },
  modalBody: {
    padding: '1.75rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f0f2ff',
  },

  // ── Form grid inside modal ─────────────────────────────────
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.9rem',
    color: '#37474f',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    // focus via JS: border-color #7b1fa2, box-shadow 0 0 0 3px rgba(123,31,162,0.15)
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
    padding: '0.4rem 0',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#37474f',
    fontWeight: '500',
  },

  // ── Preference / session grid ──────────────────────────────
  preferenceGrid: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
  },
  preferenceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
  },
  preferenceHeaderCell: {
    padding: '0.65rem 0.5rem',
    textAlign: 'center',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: '0.78rem',
    letterSpacing: '0.03em',
  },
  preferenceRowHeader: {
    padding: '0.65rem 1rem',
    fontWeight: '700',
    backgroundColor: '#f3e5f5',
    border: '1px solid #e8eaf6',
    minWidth: '80px',
    color: '#4a148c',
    fontSize: '0.82rem',
  },
  preferenceCell: {
    padding: '0.5rem',
    textAlign: 'center',
    border: '1px solid #f0f2ff',
  },

  // ── Info / preset info block ───────────────────────────────
  presetInfo: {
    backgroundColor: '#f3e5f5',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: '#4a148c',
    borderLeft: '4px solid #7b1fa2',
    fontWeight: '500',
  },
  presetDetails: {
    display: 'block',
    fontSize: '0.82rem',
    color: '#6a1b9a',
    marginTop: '0.3rem',
    fontWeight: '400',
  },
  presetLegend: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fafbff',
    borderRadius: '8px',
    color: '#546e7a',
    textAlign: 'center',
    borderTop: '1px solid #e8eaf6',
    fontSize: '0.82rem',
  },

  // ── Session header div (for schedule cells) ────────────────
  sessionHeaderDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  checkboxSmall: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: '#7b1fa2',
  },

  // ── Popup Modal ────────────────────────────────────────────
  modalContentSmall: {
    background: 'white',
    borderRadius: '14px',
    minWidth: '350px',
    maxWidth: '85vw',
    padding: '2rem',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    textAlign: 'center',
  },
  popupIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  popupText: {
    color: '#000000',
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  popupTitle: {
    color: '#000000',
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    margin: 0,
  },
  popupSuccess: {
    backgroundColor: '#e8f5e9',
    borderLeft: '4px solid #4caf50',
  },
  popupError: {
    backgroundColor: '#fce4ec',
    borderLeft: '4px solid #e53935',
  },
  btnClose: {
    padding: '0.6rem 1.5rem',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(123,31,162,0.3)',
    transition: 'opacity 0.2s',
  },

  // ── Import Stats ───────────────────────────────────────────
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statBox: {
    padding: '1.5rem 1rem',
    borderRadius: '10px',
    textAlign: 'center',
  },
  statSuccess: {
    backgroundColor: '#e8f5e9',
  },
  statWarning: {
    backgroundColor: '#fff3e0',
  },
  statError: {
    backgroundColor: '#fce4ec',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#000000',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
};
