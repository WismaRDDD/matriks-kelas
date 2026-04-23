'use client';

import { useEffect, useState } from 'react';
import { colors, globalStyles } from '../../styles/upnvjTheme';

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

  const [editingId, setEditingId] = useState(null);

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
    prefer_lantai: '',
    prefer_hari: '',
    avoid_hari: '',
    prefer_jam_mulai: '',
    prefer_jam_selesai: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
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
      prefer_lantai: '',
      prefer_hari: '',
      avoid_hari: '',
      prefer_jam_mulai: '',
      prefer_jam_selesai: '',
    });
    setEditingId(null);
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
      prefer_lantai: data.prefer_lantai || '',
      prefer_hari: data.prefer_hari || '',
      avoid_hari: data.avoid_hari || '',
      prefer_jam_mulai: data.prefer_jam_mulai || '',
      prefer_jam_selesai: data.prefer_jam_selesai || '',
    });
    setEditingId(data.id);
    setShowForm(true);
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

  const handleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
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

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
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
    return '↓';
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
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>👨‍🏫 Data Dosen</h1>
            <p style={styles.subtitle}>Kelola data dosen dan preferensi jadwal</p>
          </div>
          <div style={styles.statsBadge}>
            <span style={styles.statsNumber}>{data.length}</span>
            <span style={styles.statsLabel}>Total Dosen</span>
          </div>
        </div>

        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✓' : '✗'} {message.text}
          </div>
        )}

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

        {file && (
          <div style={styles.fileInfo}>
            <span>📎 {file.name}</span>
            <div style={styles.fileActions}>
              <button style={styles.btnSmallPrimary} onClick={handleImport} disabled={uploading}>
                {uploading ? '⏳ Mengupload...' : '📤 Upload'}
              </button>
              <button style={styles.btnSmallSecondary} onClick={() => setFile(null)}>Batal</button>
            </div>
          </div>
        )}

        <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => setFile(e.target.files[0])} />

        <div style={styles.tableWrapper}>
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Memuat data dosen...</p>
            </div>
          ) : data.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <p>Belum ada data dosen</p>
              <small>Klik "Dosen Baru" atau import dari Excel untuk memulai</small>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.thCheckbox}>
                      <input type="checkbox" checked={selectedIds.length === sortedData.length && sortedData.length > 0} onChange={handleSelectAll} style={styles.checkbox} />
                    </th>
                    <th style={styles.th} onClick={() => handleSort('prefer_lantai')}>
                      Prefer Lantai {renderSortIcon('prefer_lantai')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('prefer_hari')}>
                      Prefer Hari {renderSortIcon('prefer_hari')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('avoid_hari')}>
                      Avoid Hari {renderSortIcon('avoid_hari')}
                    </th>
                    <th style={styles.thAksi}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((d, index) => (
                    <tr key={d.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                      <td style={styles.tdCheckbox}>
                        <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => handleSelect(d.id)} style={styles.checkbox} />
                      </td>
                      <td style={styles.td}><span style={styles.badgeCode}>{d.f_nidn}</span></td>
                      <td style={styles.td}>{d.f_nip}</td>
                      <td style={styles.td}><strong>{formatNamaLengkap(d)}</strong></td>
                      <td style={styles.td}>{d.f_tempatlahir || '-'}</td>
                      <td style={styles.td}><span style={styles.badgeDate}>{formatDateDisplay(d.f_tanggallahir)}</span></td>
                      <td style={styles.td}>
                        <span style={d.f_jeniskelamin === 'L' ? styles.badgeMale : styles.badgeFemale}>
                          {d.f_jeniskelamin === 'L' ? 'Laki-laki' : d.f_jeniskelamin === 'P' ? 'Perempuan' : '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeProdi}>{d.f_progdi_id || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCode}>{d.prefer_lantai || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <small>{d.prefer_hari ? d.prefer_hari.split(',').join(', ') : '-'}</small>
                      </td>
                      <td style={styles.td}>
                        <small style={{ color: '#e53e3e', fontWeight: '500' }}>{d.avoid_hari || '-'}</small>
                      </td>
                      <td style={styles.tdAksi}>
                        <button style={styles.btnIconEdit} onClick={() => handleEdit(d)} title="Edit">✏️</button>
                        <button style={styles.btnIconDelete} onClick={() => handleDeleteOne(d.id, d.f_namapegawai)} title="Hapus">🗑️</button>
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
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{form.id ? '✏️ Edit Dosen' : '➕ Tambah Dosen'}</h3>
              <button style={styles.modalClose} onClick={() => setShowForm(false)}>×</button>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>NIDN <span style={styles.required}>*</span></label>
                <input style={styles.input} name="f_nidn" value={form.f_nidn} onChange={handleChange} placeholder="10 atau 12 digit angka" disabled={!!form.id} maxLength="12" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>NIP <span style={styles.required}>*</span></label>
                <input style={styles.input} name="f_nip" value={form.f_nip} onChange={handleChange} placeholder="Nomor Induk Pegawai" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Gelar Depan</label>
                <input style={styles.input} name="f_title_depan" value={form.f_title_depan} onChange={handleChange} placeholder="Contoh: Dr., Prof." />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Dosen <span style={styles.required}>*</span></label>
                <input style={styles.input} name="f_namapegawai" value={form.f_namapegawai} onChange={handleChange} placeholder="Nama lengkap" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Gelar Belakang</label>
                <input style={styles.input} name="f_title_belakang" value={form.f_title_belakang} onChange={handleChange} placeholder="Contoh: M.Kom., Ph.D" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tempat Lahir</label>
                <input style={styles.input} name="f_tempatlahir" value={form.f_tempatlahir} onChange={handleChange} placeholder="Kota tempat lahir" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tanggal Lahir</label>
                <input style={styles.input} type="date" name="f_tanggallahir" value={form.f_tanggallahir} onChange={handleChange} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Program Studi</label>
                <input style={styles.input} name="f_progdi_id" value={form.f_progdi_id} onChange={handleChange} placeholder="ID Program Studi" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Jenis Kelamin</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}><input type="radio" name="f_jeniskelamin" value="L" checked={form.f_jeniskelamin === 'L'} onChange={handleChange} /> Laki-laki</label>
                  <label style={styles.radioLabel}><input type="radio" name="f_jeniskelamin" value="P" checked={form.f_jeniskelamin === 'P'} onChange={handleChange} /> Perempuan</label>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Preferensi Lantai</label>
                <input
                  style={styles.input}
                  name="prefer_lantai"
                  value={form.prefer_lantai}
                  onChange={handleChange}
                  placeholder="Contoh: 1, 2, 3"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Preferensi Hari</label>
                <input
                  style={styles.input}
                  name="prefer_hari"
                  value={form.prefer_hari}
                  onChange={handleChange}
                  placeholder="Contoh: Senin,Selasa,Rabu"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Hari yang Dihindari</label>
                <input
                  style={styles.input}
                  name="avoid_hari"
                  value={form.avoid_hari}
                  onChange={handleChange}
                  placeholder="Contoh: Jumat"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Jam Mulai Preferensi</label>
                <input
                  style={styles.input}
                  type="time"
                  name="prefer_jam_mulai"
                  value={form.prefer_jam_mulai}
                  onChange={handleChange}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Jam Selesai Preferensi</label>
                <input
                  style={styles.input}
                  type="time"
                  name="prefer_jam_selesai"
                  value={form.prefer_jam_selesai}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmit}>Simpan</button>
              <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// At the very bottom of page.jsx, replace the existing styles with:

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
  statsBadge: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    backgroundColor: colors.background,
    padding: '0.5rem 1rem',
    borderRadius: '40px',
  },
  statsNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: colors.primary,
  },
  statsLabel: {
    fontSize: '0.75rem',
    color: colors.textLight,
  },
  message: globalStyles.message,
  messageSuccess: globalStyles.messageSuccess,
  messageError: globalStyles.messageError,
  toolbar: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: `1px solid ${colors.border}`,
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  btnPrimary: globalStyles.btnPrimary,
  btnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    backgroundColor: 'transparent',
    color: colors.secondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnDanger: globalStyles.btnDanger,
  btnSecondary: globalStyles.btnSecondary,
  btnSmallPrimary: {
    padding: '0.375rem 0.875rem',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnSmallSecondary: {
    padding: '0.375rem 0.875rem',
    backgroundColor: colors.background,
    color: colors.textLight,
    border: `1px solid ${colors.border}`,
    borderRadius: '20px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  btnIcon: { fontSize: '1rem' },
  fileInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  fileName: { fontSize: '0.875rem', color: colors.text },
  fileActions: { display: 'flex', gap: '0.5rem' },
  tableWrapper: { marginTop: '1rem' },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: colors.textLight,
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: colors.background,
    borderRadius: '16px',
    color: colors.textLight,
  },
  emptyIcon: { fontSize: '3rem', display: 'block', marginBottom: '1rem' },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: `1px solid ${colors.border}`,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: colors.cardBg,
  },
  tableHeaderRow: {
    backgroundColor: colors.background,
    borderBottom: `1px solid ${colors.border}`,
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: colors.text,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
  },
  thCheckbox: { padding: '1rem', width: '40px', textAlign: 'center' },
  thAksi: { padding: '1rem', width: '100px', textAlign: 'center' },
  td: { padding: '1rem', color: colors.text, fontSize: '0.875rem' },
  tdCheckbox: { padding: '1rem', textAlign: 'center' },
  tdAksi: { padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' },
  tableRow: { borderBottom: `1px solid ${colors.border}` },
  tableRowEven: {
    backgroundColor: '#FCFCFD',
    borderBottom: `1px solid ${colors.border}`,
  },
  checkbox: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    accentColor: colors.primary,
  },
  badgeCode: {
    fontFamily: 'monospace',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  badgeDate: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
  },
  badgeMale: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
  },
  badgeFemale: {
    backgroundColor: '#FCE7F3',
    color: '#9D174D',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
  },
  badgeProdi: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
  },
  btnIconEdit: {
    background: 'none',
    border: 'none',
    fontSize: '1.125rem',
    cursor: 'pointer',
    padding: '0.375rem',
    borderRadius: '8px',
    marginRight: '0.5rem',
    color: colors.textLight,
  },
  btnIconDelete: {
    background: 'none',
    border: 'none',
    fontSize: '1.125rem',
    cursor: 'pointer',
    padding: '0.375rem',
    borderRadius: '8px',
    color: colors.textLight,
  },
  modal: {
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
    backgroundColor: colors.cardBg,
    borderRadius: '24px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`,
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: colors.secondary,
    margin: 0,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: colors.textLight,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    padding: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  required: {
    color: colors.danger,
  },
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
};
