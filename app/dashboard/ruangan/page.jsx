'use client';

import { useEffect, useState } from 'react';

export default function RuanganPage() {
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

  // ✅ Fix 2: Safe JSON parser — checks content-type before parsing
  const safeJson = async (res) => {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server error: invalid response format');
    }
    return res.json();
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ruangan');
      const json = await safeJson(res);
      // ✅ Fix 1: Guard against non-array API responses
      setData(Array.isArray(json) ? json : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Gagal memuat data: ' + error.message);
      setData([]); // ✅ Fix 1: Ensure data is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      if (!res.ok) {
        const errData = await safeJson(res);
        throw new Error(errData.error || 'Gagal menyimpan data');
      }

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

  // ✅ Fix 3: Renamed parameter from 'data' to 'rowData' to avoid shadowing the state variable
  const handleEdit = (rowData) => {
    setForm({
      id: rowData.id,
      f_ruang_id: rowData.f_ruang_id || '',
      f_koderuang: rowData.f_koderuang || '',
      f_namaruang: rowData.f_namaruang || '',
      f_kapasitas_kuliah: rowData.f_kapasitas_kuliah || '',
      f_alamatruang: rowData.f_alamatruang || '',
      lantai: rowData.lantai || '',
    });
    setEditingId(rowData.id);
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

      const result = await safeJson(res);

      setImportStats({
        show: true,
        success: result.success || 0,
        duplicate: result.duplicate || 0,
        failed: result.failed || 0,
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
      // ✅ Fix 5: Reset file state on failed import so user can retry
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
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
      const res = await fetch('/api/ruangan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
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
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...data];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      return sortConfig.direction === 'asc'
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕️';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏢 Dashboard Ruangan</h1>

        {/* Message Display */}
        {messagePopup.show && (
          <div style={styles.modal} onClick={closeMessagePopup}>
            <div style={styles.modalContentSmall} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.popupTitle}>{messagePopup.type === 'success' ? '✅' : '❌'}</h2>
              <p style={styles.popupText}>{messagePopup.text}</p>
              <button style={styles.btnClose} onClick={closeMessagePopup}>Tutup</button>
            </div>
          </div>
        )}

        {/* Import Stats Modal */}
        {importStats.show && (
          <div style={styles.modal} onClick={closeImportStats}>
            <div style={styles.modalContentSmall} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.popupTitle}>📊 Hasil Import</h2>
              <div style={styles.statsContainer}>
                <div style={styles.statBox}>
                  <div style={styles.statNumber}>{importStats.success}</div>
                  <div style={styles.statLabel}>Sukses</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNumber}>{importStats.duplicate}</div>
                  <div style={styles.statLabel}>Duplikat</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statNumber}>{importStats.failed}</div>
                  <div style={styles.statLabel}>Gagal</div>
                </div>
              </div>
              <button style={styles.btnClose} onClick={closeImportStats}>Tutup</button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={handleAddNew}>
              ➕ Tambah Ruangan
            </button>
            <button style={styles.btnInfo} onClick={handleDownloadTemplate}>
              📥 Download Template
            </button>
            <button
              style={styles.btnSuccess}
              onClick={() => document.getElementById('fileInput').click()}
            >
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
            <button
              style={styles.btnSuccess}
              onClick={handleImport}
              disabled={uploading}
            >
              {uploading ? '⏳ Mengupload...' : '📤 Upload'}
            </button>
            <button style={styles.btnSecondary} onClick={() => setFile(null)}>
              ❌ Batal
            </button>
          </div>
        )}

        <input
          id="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => setFile(e.target.files[0])}
        />

        {/* Table Section */}
        <div style={styles.tableWrapper}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>📋 Daftar Ruangan</h2>
            <span style={styles.badge}>Total: {data.length} ruangan</span>
          </div>

          {loading ? (
            <div style={styles.loading}>⏳ Memuat data...</div>
          ) : data.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>Belum ada data ruangan</p>
              <small>Klik &quot;Tambah Ruangan&quot; atau import dari Excel</small>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.thCheckbox}>
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === sortedData.length &&
                          sortedData.length > 0
                        }
                        onChange={handleSelectAll}
                        style={styles.checkbox}
                      />
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
                    <tr
                      key={d.id}
                      style={index % 2 === 0 ? styles.tableRowEven : styles.tableRow}
                    >
                      <td style={styles.tdCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => handleSelect(d.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCode}>{d.f_koderuang}</span>
                      </td>
                      <td style={styles.td}>
                        <strong>{d.f_namaruang}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCapacity}>
                          👥 {d.f_kapasitas_kuliah || '-'} orang
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCapacity}>{d.lantai || '-'}</span>
                      </td>
                      <td style={styles.td}>{d.f_alamatruang || '-'}</td>
                      <td style={styles.tdAksi}>
                        <button
                          style={styles.btnIconPrimary}
                          onClick={() => handleEdit(d)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.btnIconDanger}
                          onClick={() => handleDeleteOne(d.id, d.f_namaruang)}
                          title="Hapus"
                        >
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

            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmit}>
                💾 Simpan
              </button>
              <button
                style={styles.btnSecondary}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
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
    background: '#f4f6fb',
    padding: '2rem',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  },

  // ── Main white card ───────────────────────────────────────
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.09)',
    overflow: 'hidden',
  },

  // ── Gradient title bar ────────────────────────────────────
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
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.72)',
    margin: 0,
  },

  // Inner body padding
  cardBody: {
    padding: '2rem',
  },

  // ── Alert messages ────────────────────────────────────────
  message: {
    padding: '0.9rem 1.25rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontWeight: '500',
    fontSize: '0.875rem',
    whiteSpace: 'pre-line',
    display: 'flex',
    alignItems: 'flex-start',
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

  // ── Toolbar ───────────────────────────────────────────────
  toolbar: {
    marginBottom: '1.5rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#f8f9fe',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // ── Buttons ───────────────────────────────────────────────
  btnPrimary: {
    padding: '0.55rem 1.2rem',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(123,31,162,0.3)',
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
    boxShadow: '0 2px 6px rgba(0,137,123,0.3)',
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
    boxShadow: '0 2px 6px rgba(229,57,53,0.3)',
    transition: 'opacity 0.2s, transform 0.1s',
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
    boxShadow: '0 2px 6px rgba(30,136,229,0.3)',
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

  // ── File info strip ───────────────────────────────────────
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
    fontWeight: '500',
    color: '#283593',
  },

  // ── Table section ─────────────────────────────────────────
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
    backgroundColor: '#ede7f6',
    color: '#4527a0',
    padding: '0.25rem 0.85rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },

  // ── Empty / loading states ────────────────────────────────
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

  // ── Table ─────────────────────────────────────────────────
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
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '0.78rem',
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
    fontSize: '0.78rem',
    fontWeight: '700',
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

  // ── Data badges ───────────────────────────────────────────
  badgeCode: {
    backgroundColor: '#ede7f6',
    color: '#4527a0',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
    letterSpacing: '0.03em',
  },
  badgeCapacity: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeId: {
    backgroundColor: '#e0f2f1',
    color: '#004d40',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },

  // ── Row action icon-buttons ───────────────────────────────
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

  // ── Popup modal styling ───────────────────────────────────
  modalContentSmall: {
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
  statsContainer: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    justifyContent: 'center',
  },
  statBox: {
    flex: '1',
    minWidth: '80px',
    padding: '1rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
  },
  statNumber: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1565c0',
    marginBottom: '0.3rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  btnClose: {
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

  // ── Modal overlay ─────────────────────────────────────────
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
    minWidth: '460px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },

  // Gradient header bar inside modal
  modalHeader: {
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    padding: '1.1rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '1.1rem',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    lineHeight: 1,
  },
  modalBody: {
    padding: '1.75rem',
    overflowY: 'auto',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f0f2ff',
  },

  // ── Form elements ─────────────────────────────────────────
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: '700',
    color: '#4a5568',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    color: '#37474f',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    color: '#37474f',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
};