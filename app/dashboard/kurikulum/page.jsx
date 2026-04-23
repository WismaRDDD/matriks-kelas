'use client';

import { useEffect, useState } from 'react';
import { colors, globalStyles } from '../../styles/upnvjTheme';

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
  const [form, setForm] = useState({ 
    kode_kurikulum: '', 
    nama_kurikulum: '', 
    tahun_ajaran: '' 
  });  
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
    if (!form.kode_kurikulum) {
      showMessage('error', 'Kode kurikulum wajib diisi');
      return;
    }
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
      setForm({ kode_kurikulum: '', nama_kurikulum: '', tahun_ajaran: '' });
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

  // ================= DOWNLOAD TEMPLATE =================
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/kurikulum/template');
      if (!res.ok) throw new Error('Gagal download template');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_kurikulum.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
      return { key: null, direction: null };
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
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📚 Dashboard Kurikulum</h1>
            <p style={styles.subtitle}>Kelola data kurikulum dan mata kuliah</p>
          </div>
          <div style={styles.statsBadge}>
            <span style={styles.statsNumber}>{kurikulumList.length}</span>
            <span style={styles.statsLabel}>Kurikulum</span>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✓' : '✗'} {message.text}
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={() => setShowForm(true)}>
              <span style={styles.btnIcon}>+</span> Tambah Kurikulum
            </button>
            
            <select
              value={selectedKurikulum}
              onChange={(e) => setSelectedKurikulum(e.target.value)}
              style={styles.select}
            >
              <option value="">📖 Pilih Kurikulum</option>
              {kurikulumList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kode_kurikulum} ({k.tahun_ajaran})
                </option>
              ))}
            </select>

            <button
              style={selectedKurikulum ? styles.btnPrimary : styles.btnDisabled}
              disabled={!selectedKurikulum}
              onClick={() => setShowMatkulForm(true)}
            >
              <span style={styles.btnIcon}>+</span> Tambah Mata Kuliah
            </button>
          </div>

          <div style={styles.toolbarRight}>
            <button
              style={styles.btnInfo}
              onClick={handleDownloadTemplate}
            >
              📥 Download Template
            </button>
            
            <button
              style={styles.btnSuccess}
              onClick={() => document.getElementById('fileInput').click()}
            >
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
            <h2 style={styles.sectionTitle}>📋 Daftar Mata Kuliah</h2>
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
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Memuat data mata kuliah...</p>
            </div>
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
                        <span style={styles.sksBadge}>{m.f_sks_kurikulum} SKS</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.semesterBadge}>Semester {m.f_semester}</span>
                      </td>
                      <td style={styles.td}>{m.f_namakelompok || '-'}</td>
                      <td style={styles.tdAksi}>
                        <button
                          style={styles.btnIconDelete}
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
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Tambah Kurikulum</h3>
              <button style={styles.modalClose} onClick={() => setShowForm(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Kode Kurikulum <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="Contoh: TI-2024"
                  value={form.kode_kurikulum}
                  onChange={(e) => setForm({ ...form, kode_kurikulum: e.target.value })}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Kurikulum <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="Contoh: Teknik Informatika 2024"
                  value={form.nama_kurikulum}
                  onChange={(e) => setForm({ ...form, nama_kurikulum: e.target.value })}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Tahun Ajaran <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="Contoh: 2024"
                  value={form.tahun_ajaran}
                  onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
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

      {/* Modal Tambah Mata Kuliah */}
      {showMatkulForm && (
        <div style={styles.modalOverlay} onClick={() => setShowMatkulForm(false)}>
          <div style={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Tambah Mata Kuliah</h3>
              <button style={styles.modalClose} onClick={() => setShowMatkulForm(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Kode MK <span style={styles.required}>*</span></label>
                  <input
                    style={styles.input}
                    placeholder="Kode Mata Kuliah"
                    value={matkulForm.f_kodemk}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_kodemk: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama MK <span style={styles.required}>*</span></label>
                  <input
                    style={styles.input}
                    placeholder="Nama Mata Kuliah"
                    value={matkulForm.f_namamk}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_namamk: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>SKS <span style={styles.required}>*</span></label>
                  <input
                    style={styles.input}
                    placeholder="Jumlah SKS"
                    value={matkulForm.f_sks_kurikulum}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_sks_kurikulum: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Semester <span style={styles.required}>*</span></label>
                  <input
                    style={styles.input}
                    placeholder="Semester (1-8)"
                    value={matkulForm.f_semester}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_semester: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama Kelompok</label>
                  <input
                    style={styles.input}
                    placeholder="Kelompok Mata Kuliah"
                    value={matkulForm.f_namakelompok}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_namakelompok: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Singkatan</label>
                  <input
                    style={styles.input}
                    placeholder="Singkatan"
                    value={matkulForm.f_singkatan}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_singkatan: e.target.value })}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status Aktif</label>
                  <select
                    style={styles.select}
                    value={matkulForm.f_statusaktifmk}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_statusaktifmk: e.target.value })}
                  >
                    <option value="">Pilih Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowMatkulForm(false)}>
                Batal
              </button>
              <button style={styles.btnPrimary} onClick={handleSubmitMatkul}>
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
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: `1px solid ${colors.border}`,
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  toolbarRight: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  
  select: {
    padding: '0.625rem 1rem',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    fontSize: '0.875rem',
    backgroundColor: colors.cardBg,
    cursor: 'pointer',
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
  btnDisabled: {
    padding: '0.625rem 1.25rem',
    backgroundColor: colors.border,
    color: colors.textLight,
    border: 'none',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
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
  btnDanger: {
    padding: '0.5rem 1rem',
    background: '#f56565',
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
  thCheckbox: { padding: '1rem', width: '40px' },
  thAksi: { padding: '1rem', width: '80px', textAlign: 'center' },
  td: { padding: '1rem', color: colors.text, fontSize: '0.875rem' },
  tdCheckbox: { padding: '1rem', textAlign: 'center' },
  tdAksi: { padding: '1rem', textAlign: 'center' },
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
  sksBadge: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  semesterBadge: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
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
    maxWidth: '450px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalContentLarge: {
    backgroundColor: colors.cardBg,
    borderRadius: '24px',
    width: '90%',
    maxWidth: '750px',
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
    input:focus, select:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px rgba(244, 124, 56, 0.1);
    }
  `;
  document.head.appendChild(styleSheet);
}