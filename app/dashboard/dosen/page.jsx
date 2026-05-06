'use client';

import { useEffect, useState } from 'react';

export default function DosenPage() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  const [showPreferenceForm, setShowPreferenceForm] = useState(false);
  const [presets, setPresets] = useState([]);
  const [preferences, setPreferences] = useState({});

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

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dosen');
      const json = await res.json();

      json.sort((a, b) => new Date(a.f_tanggallahir) - new Date(b.f_tanggallahir));

      setData(json);
      setSelectedIds([]);
    } catch {
      showMessage('error', 'Gagal memuat data dosen');
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
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  const handleEditPreference = async (data) => {
    setForm({ id: data.id, f_namapegawai: data.f_namapegawai });
    
    // Initialize preferences grid - default all checked except Saturday (day 5)
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const newPreferences = {};
    days.forEach((day, index) => {
      newPreferences[day] = {};
      presets.forEach((preset) => {
        // Generate sessions for this specific day (considering break times)
        const sessions = generateSessions(preset.jam_mulai, preset.jam_selesai, preset.durasi_slot, preset, day);
        sessions.forEach((session) => {
          // Default: all checked except Saturday
          newPreferences[day][session] = index !== 5;
        });
      });
    });

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
        }
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    }

    setPreferences(newPreferences);
    setShowPreferenceForm(true);
  };

  const handleSelectAllSessionsForDay = (day) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[day]) updated[day] = {};
      const sessionsInDay = Object.keys(updated[day]);
      
      // Check if all sessions for this day are checked
      const allSessionsChecked = sessionsInDay.length > 0 && sessionsInDay.every((s) => updated[day][s]);
      
      // Toggle: if all checked, uncheck all; otherwise check all
      const newValue = !allSessionsChecked;
      sessionsInDay.forEach((session) => {
        updated[day][session] = newValue;
      });
      return updated;
    });
  };

  const handleSelectAllDaysForSession = (session) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      // Check if all days for this session are checked
      const allDaysChecked = days.every((day) => updated[day]?.[session]);
      
      // Toggle: if all checked, uncheck all; otherwise check all
      const newValue = !allDaysChecked;
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
      
      // Toggle: if all checked, uncheck all; otherwise check all
      const allChecked = totalItems > 0 && checkedItems === totalItems;
      const newValue = !allChecked;
      days.forEach((day) => {
        Object.keys(updated[day] || {}).forEach((session) => {
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
      const res = await fetch('/api/dosen/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dosenId: form.id,
          preferences,
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

      const summary = result.summary || result;
      const errorList = result.errors ? result.errors.slice(0, 5).join('\n') : '';
      
      let message = `✅ Import selesai: ${summary.success} sukses, ${summary.failed} gagal, ${summary.duplicated || 0} duplikat`;
      if (errorList) {
        message += `\n\n⚠️ Beberapa error:\n${errorList}`;
        if (result.errors.length > 5) {
          message += `\n... dan ${result.errors.length - 5} error lainnya`;
        }
      }
      
      showMessage('success', message);
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (error) {
      showMessage('error', `❌ ${error.message}`);
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

        {/* Message Display */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={handleAddNew}>
              ➕ Tambah Dosen
            </button>
            <button style={styles.btnSuccess} onClick={downloadTemplate}>
              📥 Template Excel
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
            <h2>📋 Daftar Dosen</h2>
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
            <h3 style={styles.modalTitle}>📅 Preferensi Dosen - {form.f_namapegawai}</h3>

            {presets.length > 0 && presets[0]?.jam_mulai ? (
              <>
                <div style={styles.presetInfo}>
                  <strong>📋 Preset:</strong> {presets[0].nama_preset || 'Default'}
                  <span style={styles.presetDetails}>
                    ({presets[0].jam_mulai} - {presets[0].jam_selesai}, Durasi: {presets[0].durasi_slot} menit)
                  </span>
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
                                  onChange={() => handleSelectAllDaysForSession(session)}
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
                        const sessionsInDay = Object.keys(preferences[day] || {});
                        const allSessionsChecked = sessionsInDay.length > 0 && sessionsInDay.every((session) => preferences[day][session]);
                        return (
                          <tr key={day}>
                            <td style={styles.preferenceCell}>
                              <input
                                type="checkbox"
                                checked={allSessionsChecked}
                                onChange={() => handleSelectAllSessionsForDay(day)}
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

// ================= STYLES =================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
  },
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    padding: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '2rem',
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
  toolbar: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f7f9fc',
    borderRadius: '12px',
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '0.5rem 1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  btnSuccess: {
    padding: '0.5rem 1rem',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  btnDanger: {
    padding: '0.5rem 1rem',
    background: '#f56565',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  btnSecondary: {
    padding: '0.5rem 1rem',
    background: '#a0aec0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  fileInfo: {
    backgroundColor: '#edf2f7',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tableWrapper: {
    marginTop: '1.5rem',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    padding: '0 0.5rem',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#4a5568',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    color: '#a0aec0',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#718096',
    fontSize: '1.1rem',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeaderRow: {
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none',
  },
  thCheckbox: {
    padding: '1rem',
    width: '40px',
    textAlign: 'center',
  },
  thAksi: {
    padding: '1rem',
    width: '100px',
    textAlign: 'center',
  },
  td: {
    padding: '1rem',
    color: '#2d3748',
  },
  tdCheckbox: {
    padding: '1rem',
    textAlign: 'center',
  },
  tdAksi: {
    padding: '1rem',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e2e8f0',
  },
  checkbox: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  badgeCode: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-block',
    fontFamily: 'monospace',
  },
  badgeDate: {
    backgroundColor: '#fef5e7',
    color: '#c05621',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  badgeMale: {
    backgroundColor: '#bee3f8',
    color: '#2c5282',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  badgeFemale: {
    backgroundColor: '#fed7e2',
    color: '#97266d',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  badgeProdi: {
    backgroundColor: '#e6fffa',
    color: '#234e52',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  btnIconPrimary: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    marginRight: '0.5rem',
  },
  btnIconDanger: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  btnIconInfo: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    marginRight: '0.5rem',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    minWidth: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    color: '#333',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontWeight: '500',
    color: '#4a5568',
    fontSize: '0.875rem',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s',
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
    padding: '0.5rem 0',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  preferenceGrid: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
  },
  preferenceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  preferenceHeaderCell: {
    padding: '0.75rem 0.5rem',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    color: '#000000',
  },
  preferenceRowHeader: {
    padding: '0.75rem 1rem',
    fontWeight: '600',
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    minWidth: '80px',
    color: '#000000',
  },
  preferenceCell: {
    padding: '0.5rem',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  presetInfo: {
    backgroundColor: '#edf2f7',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    color: '#000000',
    borderLeft: '4px solid #667eea',
  },
  presetDetails: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#000000',
    marginTop: '0.25rem',
  },
  presetLegend: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    color: '#000000',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
  },
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
  },
};