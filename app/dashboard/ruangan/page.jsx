'use client';

import { useEffect, useState } from 'react';

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
    // Validations
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏢 Dashboard Ruangan</h1>

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
              ➕ Tambah Ruangan
            </button>
            <button style={styles.btnInfo} onClick={handleDownloadTemplate}>
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
            <h2>📋 Daftar Ruangan</h2>
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
                        <button style={styles.btnIconPrimary} onClick={() => handleEdit(d)} title="Edit">
                          ✏️
                        </button>
                        <button style={styles.btnIconDanger} onClick={() => handleDeleteOne(d.id, d.f_namaruang)} title="Hapus">
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
              <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>
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
    whiteSpace: 'pre-line',
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
  },
  badgeCapacity: {
    backgroundColor: '#fef5e7',
    color: '#c05621',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  badgeId: {
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
    minWidth: '450px',
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
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#4a5568',
    fontSize: '0.875rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.2s',
  },
};