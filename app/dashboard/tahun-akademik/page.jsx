'use client';

import { useEffect, useState } from 'react';

// ✅ Fix 3: Moved outside main component to prevent unnecessary re-renders
const SortIndicator = ({ column, sortConfig }) => {
  if (sortConfig.key !== column) return <span> ⇅</span>;
  return sortConfig.direction === 'asc' ? <span> ↑</span> : <span> ↓</span>;
};

export default function TahunAkademikPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: '',
    tahun_awal: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tahun-akademik');

      // ✅ Fix 4: Handle non-JSON responses (e.g. HTML error pages)
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: invalid response format');
      }

      const json = await res.json();

      // ✅ Fix 2: Guard against non-array API responses
      setData(Array.isArray(json) ? json : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Gagal memuat data: ' + error.message);
      setData([]); // ✅ Fix 2: Ensure data is always an array
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
    if (!form.tahun_awal) {
      showMessage('error', 'Tahun awal wajib diisi');
      return;
    }

    if (!/^\d{4}$/.test(String(form.tahun_awal))) {
      showMessage('error', 'Tahun harus berupa angka 4 digit');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = '/api/tahun-akademik';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan data');
      }

      showMessage(
        'success',
        form.id ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan'
      );
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
      tahun_awal: '',
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    if (data.length > 0) {
      // ✅ Fix 1: Use Number() to prevent string concatenation (e.g. "20241" instead of 2025)
      const lastYear = Number(data[0].tahun_awal) + 1;
      setForm({ id: '', tahun_awal: String(lastYear) });
    }
    setShowForm(true);
  };

  const handleEdit = (rowData) => {
    setForm({
      id: rowData.id,
      tahun_awal: String(rowData.tahun_awal),
    });
    setEditingId(rowData.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus?')) return;

    try {
      const res = await fetch(`/api/tahun-akademik/delete?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      showMessage('error', 'Pilih minimal 1 data');
      return;
    }

    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} data?`)) return;

    try {
      const res = await fetch('/api/tahun-akademik/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? data.map((row) => row.id) : []);
  };

  const handleSelectRow = (id, checked) => {
    setSelectedIds(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((selectedId) => selectedId !== id)
    );
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const sorted = [...data];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  };

  return (
    <div style={styles.container}>
      {/* Message Alert */}
      {message.text && (
        <div
          style={{
            ...styles.message,
            ...(message.type === 'error' ? styles.messageError : styles.messageSuccess),
          }}
        >
          {message.text}
        </div>
      )}

      {/* Header & Controls */}
      <div style={styles.header}>
        <h2>📅 Tahun Akademik</h2>
        <div style={styles.controls}>
          <button onClick={handleAddNew} style={styles.btnPrimary}>
            + Tambah Tahun Akademik
          </button>
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} style={styles.btnDanger}>
              🗑️ Hapus ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.formHeader}>
              <h3>{editingId ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik'}</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tahun Awal</label>
              <input
                type="text"
                name="tahun_awal"
                placeholder="Contoh: 2026"
                value={form.tahun_awal}
                onChange={handleChange}
                maxLength="4"
                style={styles.input}
              />
              <small style={styles.hint}>
                Tahun akhir akan otomatis menjadi tahun awal + 1
              </small>
            </div>

            <div style={styles.formActions}>
              <button onClick={handleSubmit} style={styles.btnSubmit}>
                {editingId ? 'Update' : 'Simpan'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={styles.btnCancel}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <p style={styles.loading}>Loading...</p>
        ) : data.length === 0 ? (
          <p style={styles.empty}>Tidak ada data tahun akademik</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={styles.cell} onClick={() => handleSort('tahun_akademik')}>
                  {/* ✅ Fix 3: Pass sortConfig as prop */}
                  Tahun Akademik <SortIndicator column="tahun_akademik" sortConfig={sortConfig} />
                </th>
                <th style={styles.cell}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {getSortedData().map((row) => (
                <tr key={row.id} style={styles.bodyRow}>
                  <td style={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                    />
                  </td>
                  <td style={styles.cell}>{row.tahun_akademik}</td>
                  <td style={styles.cell}>
                    <button onClick={() => handleEdit(row)} style={styles.btnEdit}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(row.id)} style={styles.btnDelete}>
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  message: {
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '500',
    animation: 'slideIn 0.3s ease-out',
  },
  messageError: {
    backgroundColor: '#fee',
    color: '#c33',
    border: '1px solid #fcc',
  },
  messageSuccess: {
    backgroundColor: '#efe',
    color: '#3c3',
    border: '1px solid #cfc',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0',
  },
  controls: {
    display: 'flex',
    gap: '1rem',
  },
  btnPrimary: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  btnDanger: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
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
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    color: '#000000',
  },
  hint: {
    display: 'block',
    marginTop: '0.5rem',
    color: '#666',
    fontSize: '0.875rem',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  btnSubmit: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e2e8f0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e2e8f0',
    color: '#000000',
  },
  bodyRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  cell: {
    padding: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    color: '#000000',
  },
  checkboxCell: {
    padding: '1rem',
    width: '50px',
    textAlign: 'center',
  },
  btnEdit: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    fontSize: '0.875rem',
  },
  btnDelete: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: '#666',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#999',
  },
};