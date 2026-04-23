'use client';

import { useEffect, useState } from 'react';
import { colors, globalStyles } from '../../styles/upnvjTheme';

export default function RuanganPage() {
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

  const [form, setForm] = useState({
    id: '',
    f_ruang_id: '',
    f_koderuang: '',
    f_namaruang: '',
    f_kapasitas_kuliah: '',
    f_alamatruang: '',
    lantai: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ruangan');
      const json = await res.json();
      setData(json);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Form Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.f_koderuang) {
      showMessage('error', 'Kode ruangan wajib diisi');
      return;
    }
    if (!form.f_namaruang) {
      showMessage('error', 'Nama ruangan wajib diisi');
      return;
    }
    if (form.f_kapasitas_kuliah && !/^\d+$/.test(form.f_kapasitas_kuliah)) {
      showMessage('error', 'Kapasitas harus berupa angka');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/ruangan/${form.id}` : '/api/ruangan';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Gagal menyimpan data');

      showMessage('success', form.id ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan');
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
      f_ruang_id: '',
      f_koderuang: '',
      f_namaruang: '',
      f_kapasitas_kuliah: '',
      f_alamatruang: '',
      lantai: '',
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/ruangan/template');
      if (!res.ok) throw new Error('Gagal download template');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_ruangan.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleEdit = (data) => {
    setForm({
      id: data.id,
      f_ruang_id: data.f_ruang_id || '',
      f_koderuang: data.f_koderuang || '',
      f_namaruang: data.f_namaruang || '',
      f_kapasitas_kuliah: data.f_kapasitas_kuliah || '',
      f_alamatruang: data.f_alamatruang || '',
      lantai: data.lantai || '',
    });
    setEditingId(data.id);
    setShowForm(true);
  };

  // Import Handlers
  const handleImport = async () => {
    if (!file) {
      showMessage('error', 'Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/ruangan/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Import gagal');

      const result = await res.json();
      
      // Build detailed message
      let messageText = '📊 Hasil Import:\n';
      if (result.success) messageText += `✅ Sukses: ${result.success}\n`;
      if (result.duplicate) messageText += `⚠️ Duplikat: ${result.duplicate}\n`;
      if (result.failed) messageText += `❌ Gagal: ${result.failed}`;

      showMessage('success', messageText);
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

    if (!confirm(`Hapus ${selectedIds.length} data yang dipilih?`)) return;

    try {
      const res = await fetch('/api/ruangan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', `${selectedIds.length} data berhasil dihapus`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus ruangan "${nama}"?`)) return;

    try {
      const res = await fetch(`/api/ruangan/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // Sort Function
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  // MOVED THIS AFTER data IS DEFINED - This is the fix!
  const sortedData = [...data];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

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
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🏢 Dashboard Ruangan</h1>
            <p style={styles.subtitle}>Kelola data ruangan perkuliahan</p>
          </div>
          <div style={styles.statsBadge}>
            <span style={styles.statsNumber}>{data.length}</span>
            <span style={styles.statsLabel}>Total Ruangan</span>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError), whiteSpace: 'pre-line' }}>
            {message.type === 'success' ? '✓' : '✗'} {message.text}
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={handleAddNew}>
              <span style={styles.btnIcon}>+</span> Tambah Ruangan
            </button>
            <button style={styles.btnInfo} onClick={handleDownloadTemplate}>
              📥 Download Template
            </button>
            <button style={styles.btnSuccess} onClick={() => document.getElementById('fileInput').click()}>
              📂 Import Excel
            </button>
            <button style={styles.btnOutline} onClick={() => document.getElementById('fileInput').click()}>
              <span style={styles.btnIcon}>📂</span> Import Excel
            </button>
            {selectedIds.length > 0 && (
              <button style={styles.btnDanger} onClick={handleDeleteSelected}>
                <span style={styles.btnIcon}>🗑️</span> Hapus ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        {file && (
          <div style={styles.fileInfo}>
            <span style={styles.fileName}>📎 {file.name}</span>
            <div style={styles.fileActions}>
              <button style={styles.btnSmallPrimary} onClick={handleImport} disabled={uploading}>
                {uploading ? '⏳ Mengupload...' : '📤 Upload'}
              </button>
              <button style={styles.btnSmallSecondary} onClick={() => setFile(null)}>
                Batal
              </button>
            </div>
          </div>
        )}

        <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => setFile(e.target.files[0])} />

        {/* Table Section */}
        <div style={styles.tableWrapper}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>📋 Daftar Ruangan</h2>
            <span style={styles.badge}>Total: {data.length} ruangan</span>
          </div>

          {loading ? (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Memuat data ruangan...</p>
            </div>
          ) : data.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>Belum ada data ruangan</p>
              <small>Klik "Tambah Ruangan" atau import dari Excel</small>
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
                    <th style={styles.th} onClick={() => handleSort('f_ruang_id')}>
                      ID Ruang {renderSortIcon('f_ruang_id')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_koderuang')}>
                      Kode Ruang {renderSortIcon('f_koderuang')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_namaruang')}>
                      Nama Ruang {renderSortIcon('f_namaruang')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_kapasitas_kuliah')}>
                      Kapasitas {renderSortIcon('f_kapasitas_kuliah')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('lantai')}>
                      Lantai {renderSortIcon('lantai')}
                    </th>
                    <th style={styles.th}>Alamat</th>
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
                        <span style={styles.badgeId}>{d.f_ruang_id || '-'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCode}>{d.f_koderuang}</span>
                      </td>
                      <td style={styles.td}>
                        <strong>{d.f_namaruang}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCapacity}>👥 {d.f_kapasitas_kuliah || '-'} orang</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCapacity}>🏢 Lantai {d.lantai || '-'}</span>
                      </td>
                      <td style={styles.td}>{d.f_alamatruang || '-'}</td>
                      <td style={styles.tdAksi}>
                        <button style={styles.btnIconEdit} onClick={() => handleEdit(d)} title="Edit">
                          ✏️
                        </button>
                        <button style={styles.btnIconDelete} onClick={() => handleDeleteOne(d.id, d.f_namaruang)} title="Hapus">
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
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {form.id ? '✏️ Edit Ruangan' : '➕ Tambah Ruangan'}
            </h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Kode Ruangan *</label>
              <input
                style={styles.input}
                name="f_koderuang"
                value={form.f_koderuang}
                onChange={handleChange}
                placeholder="Contoh: R-101"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nama Ruangan *</label>
              <input
                style={styles.input}
                name="f_namaruang"
                value={form.f_namaruang}
                onChange={handleChange}
                placeholder="Contoh: Ruang Kelas A"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Kapasitas</label>
              <input
                style={styles.input}
                name="f_kapasitas_kuliah"
                value={form.f_kapasitas_kuliah}
                onChange={handleChange}
                placeholder="Jumlah kapasitas (angka)"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Lantai</label>
              <input
                style={styles.input}
                name="lantai"
                value={form.lantai}
                onChange={handleChange}
                placeholder="Nomor lantai"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ID Ruang</label>
              <input
                style={styles.input}
                name="f_ruang_id"
                value={form.f_ruang_id}
                onChange={handleChange}
                placeholder="ID ruangan"
              />
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Kode Ruangan <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  name="f_koderuang"
                  value={form.f_koderuang}
                  onChange={handleChange}
                  placeholder="Contoh: R-101"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Ruangan <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  name="f_namaruang"
                  value={form.f_namaruang}
                  onChange={handleChange}
                  placeholder="Contoh: Ruang Kelas A"
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Kapasitas</label>
                  <input
                    style={styles.input}
                    name="f_kapasitas_kuliah"
                    value={form.f_kapasitas_kuliah}
                    onChange={handleChange}
                    placeholder="Jumlah kapasitas"
                    type="number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lantai</label>
                  <input
                    style={styles.input}
                    name="lantai"
                    value={form.lantai}
                    onChange={handleChange}
                    placeholder="Nomor lantai"
                    type="number"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ID Ruang</label>
                <input
                  style={styles.input}
                  name="f_ruang_id"
                  value={form.f_ruang_id}
                  onChange={handleChange}
                  placeholder="ID ruangan"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Alamat</label>
                <textarea
                  style={styles.textarea}
                  name="f_alamatruang"
                  value={form.f_alamatruang}
                  onChange={handleChange}
                  placeholder="Alamat atau lokasi ruangan"
                  rows="3"
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                Batal
              </button>
              <button style={styles.btnPrimary} onClick={handleSubmit}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= UPNVJ THEME STYLES =================
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
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontWeight: '500',
    whiteSpace: 'pre-line',
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
  btnInfo: {
    padding: '0.5rem 1rem',
    background: '#4299e1',
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
  
  tableWrapper: { marginTop: '1.5rem' },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.background,
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.textLight,
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: colors.background,
    borderRadius: '16px',
    color: colors.textLight,
  },
  emptyIcon: { fontSize: '3rem', display: 'block', marginBottom: '1rem' },
  
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
  badgeCapacity: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    display: 'inline-block',
  },
  floorBadge: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    display: 'inline-block',
  },
  badgeId: {
    backgroundColor: '#FCE7F3',
    color: '#9D174D',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    display: 'inline-block',
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
  
  // Modal Styles
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
    backgroundColor: colors.cardBg,
    borderRadius: '24px',
    width: '90%',
    maxWidth: '500px',
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
  modalBody: {
    padding: '1.5rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
  },
  
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    marginBottom: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  label: globalStyles.label,
  required: {
    color: colors.danger,
  },
  input: globalStyles.input,
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s',
  },
};

// Add keyframes for spinner animation
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
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px rgba(244, 124, 56, 0.1);
    }
  `;
  document.head.appendChild(styleSheet);
}