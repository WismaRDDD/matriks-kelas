'use client';

import { useEffect, useState } from 'react';

export default function KurikulumPage() {
  const [kurikulumList, setKurikulumList] = useState([]);
  const [selectedKurikulum, setSelectedKurikulum] = useState('');
  const [matkul, setMatkul] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [file, setFile] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [showMatkulForm, setShowMatkulForm] = useState(false);
  const [form, setForm] = useState({ nama_kurikulum: '', tahun_ajaran: '' });
  const [matkulForm, setMatkulForm] = useState({
    f_kodemk: '',
    f_namamk: '',
    f_sks_kurikulum: '',
    f_semester: '',
    f_namakelompok: '',
    f_singkatan: '',
    f_statusaktifmk: '',
  });

  // ================= FETCH =================
  const fetchKurikulum = async () => {
    try {
      const res = await fetch('/api/kurikulum-master');
      const data = await res.json();
      setKurikulumList(data);
    } catch (error) {
      showMessage('error', 'Failed to fetch kurikulum data');
    }
  };

  const fetchMatkul = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
      const data = await res.json();
      setMatkul(data);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Failed to fetch mata kuliah data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKurikulum();
  }, []);

  useEffect(() => {
    fetchMatkul(selectedKurikulum);
  }, [selectedKurikulum]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ================= TAMBAH KURIKULUM =================
  const handleSubmit = async () => {
    if (!form.nama_kurikulum) {
      showMessage('error', 'Nama kurikulum wajib diisi');
      return;
    }
    if (!/^\d{4}$/.test(form.tahun_ajaran)) {
      showMessage('error', 'Tahun ajaran harus 4 digit (contoh: 2024)');
      return;
    }

    try {
      const res = await fetch('/api/kurikulum-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal');

      showMessage('success', 'Kurikulum berhasil ditambahkan');
      setShowForm(false);
      setForm({ nama_kurikulum: '', tahun_ajaran: '' });
      fetchKurikulum();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= TAMBAH MATKUL =================
  const handleSubmitMatkul = async () => {
    if (!selectedKurikulum) {
      showMessage('error', 'Pilih kurikulum terlebih dahulu');
      return;
    }

    try {
      const res = await fetch('/api/kurikulum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matkulForm,
          f_kurikulum: selectedKurikulum,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal');

      showMessage('success', 'Mata kuliah berhasil ditambahkan');
      setShowMatkulForm(false);
      setMatkulForm({
        f_kodemk: '',
        f_namamk: '',
        f_sks_kurikulum: '',
        f_semester: '',
        f_namakelompok: '',
        f_singkatan: '',
        f_statusaktifmk: '',
      });
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= IMPORT =================
  const handleImport = async () => {
    if (!file || !selectedKurikulum) {
      showMessage('error', 'Pilih kurikulum dan file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kurikulum_id', selectedKurikulum);

    setUploading(true);
    try {
      const res = await fetch('/api/kurikulum/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Import gagal');
      
      showMessage('success', 'Import berhasil');
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // ================= DELETE =================
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) {
      showMessage('error', 'Pilih data yang akan dihapus');
      return;
    }
    if (!confirm(`Hapus ${selectedIds.length} data?`)) return;

    try {
      const res = await fetch('/api/kurikulum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal hapus');
      
      showMessage('success', `${selectedIds.length} data berhasil dihapus`);
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus "${nama}"?`)) return;

    try {
      const res = await fetch(`/api/kurikulum/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal hapus');
      
      showMessage('success', 'Mata kuliah berhasil dihapus');
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= CHECKBOX =================
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sortedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedData.map((d) => d.id));
    }
  };

  // ================= SORT =================
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...matkul];
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
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // ================= UI =================
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📚 Dashboard Kurikulum</h1>

        {/* Message Display */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={() => setShowForm(true)}>
              ➕ Tambah Kurikulum
            </button>
            
            <select
              value={selectedKurikulum}
              onChange={(e) => setSelectedKurikulum(e.target.value)}
              style={styles.select}
            >
              <option value="">📖 Pilih Kurikulum</option>
              {kurikulumList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kurikulum} ({k.tahun_ajaran})
                </option>
              ))}
            </select>

            <button
              style={selectedKurikulum ? styles.btnPrimary : styles.btnDisabled}
              disabled={!selectedKurikulum}
              onClick={() => setShowMatkulForm(true)}
            >
              ➕ Tambah Mata Kuliah
            </button>
          </div>

          <div style={styles.toolbarRight}>
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
            <button 
              style={styles.btnSecondary} 
              onClick={() => setFile(null)}
            >
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
            <h2>📋 Daftar Mata Kuliah</h2>
            {selectedKurikulum && (
              <span style={styles.badge}>
                Total: {matkul.length} mata kuliah
              </span>
            )}
          </div>

          {!selectedKurikulum ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📖</span>
              <p>Pilih kurikulum terlebih dahulu</p>
            </div>
          ) : loading ? (
            <div style={styles.loading}>⏳ Memuat data...</div>
          ) : matkul.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>Belum ada mata kuliah</p>
              <small>Klik "Tambah Mata Kuliah" atau import dari Excel</small>
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
                    <th style={styles.th} onClick={() => handleSort('f_kodemk')}>
                      Kode MK {renderSortIcon('f_kodemk')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_namamk')}>
                      Nama Mata Kuliah {renderSortIcon('f_namamk')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_sks_kurikulum')}>
                      SKS {renderSortIcon('f_sks_kurikulum')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('f_semester')}>
                      Semester {renderSortIcon('f_semester')}
                    </th>
                    <th style={styles.th}>Kelompok</th>
                    <th style={styles.thAksi}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((m, index) => (
                    <tr key={m.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                      <td style={styles.tdCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(m.id)}
                          onChange={() => handleSelect(m.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeCode}>{m.f_kodemk}</span>
                      </td>
                      <td style={styles.td}>{m.f_namamk}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeSks}>{m.f_sks_kurikulum} SKS</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeSemester}>Semester {m.f_semester}</span>
                      </td>
                      <td style={styles.td}>{m.f_namakelompok || '-'}</td>
                      <td style={styles.tdAksi}>
                        <button
                          style={styles.btnIconDanger}
                          onClick={() => handleDeleteOne(m.id, m.f_namamk)}
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

      {/* Modal Tambah Kurikulum */}
      {showForm && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Tambah Kurikulum</h3>
            <input
              style={styles.input}
              placeholder="Nama Kurikulum"
              value={form.nama_kurikulum}
              onChange={(e) => setForm({ ...form, nama_kurikulum: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Tahun Ajaran (contoh: 2024)"
              value={form.tahun_ajaran}
              onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
            />
            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmit}>
                Simpan
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Mata Kuliah */}
      {showMatkulForm && (
        <div style={styles.modal} onClick={() => setShowMatkulForm(false)}>
          <div style={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Tambah Mata Kuliah</h3>
            <div style={styles.formGrid}>
              <input
                style={styles.input}
                placeholder="Kode MK *"
                value={matkulForm.f_kodemk}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_kodemk: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Nama MK *"
                value={matkulForm.f_namamk}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_namamk: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="SKS *"
                value={matkulForm.f_sks_kurikulum}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_sks_kurikulum: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Semester *"
                value={matkulForm.f_semester}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_semester: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Nama Kelompok"
                value={matkulForm.f_namakelompok}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_namakelompok: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Singkatan"
                value={matkulForm.f_singkatan}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_singkatan: e.target.value })}
              />
              <select
                style={styles.input}
                value={matkulForm.f_statusaktifmk}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_statusaktifmk: e.target.value })}
              >
                <option value="">Status Aktif</option>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmitMatkul}>
                Simpan
              </button>
              <button style={styles.btnSecondary} onClick={() => setShowMatkulForm(false)}>
                Batal
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
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
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
  toolbarRight: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  select: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    cursor: 'pointer',
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
  btnDisabled: {
    padding: '0.5rem 1rem',
    background: '#cbd5e0',
    color: '#718096',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'not-allowed',
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
  },
  thAksi: {
    padding: '1rem',
    width: '80px',
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
  badgeSks: {
    backgroundColor: '#fef5e7',
    color: '#c05621',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
  },
  badgeSemester: {
    backgroundColor: '#e6fffa',
    color: '#234e52',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    display: 'inline-block',
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
    minWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalContentLarge: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    minWidth: '600px',
    maxWidth: '90vw',
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
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
};