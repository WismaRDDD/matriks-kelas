'use client';

import { useEffect, useState } from 'react';

export default function KelasPage() {
  const [prodi, setProdi] = useState([]);
  const [selectedProdi, setSelectedProdi] = useState('');
  const [matkul, setMatkul] = useState([]);
  const [selectedMatkul, setSelectedMatkul] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [kelasBaru, setKelasBaru] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('view');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchMatkul, setSearchMatkul] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // FETCH
  const fetchProdi = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kurikulum-master');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProdi(data);
    } catch (err) {
      showMessage('error', `Error loading prodi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatkul = async (id) => {
    try {
      const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatkul(data);
    } catch (err) {
      showMessage('error', `Error loading matkul: ${err.message}`);
    }
  };

  const fetchDosen = async (namaProdi) => {
    try {
      const res = await fetch(`/api/dosen?prodi=${encodeURIComponent(namaProdi)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDosenList(data);
    } catch (err) {
      console.error('❌ Fetch dosen error:', err);
    }
  };

  const fetchKelasBaru = async () => {
    try {
      const res = await fetch('/api/kelas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKelasBaru(data);
    } catch (err) {
      console.error('❌ Fetch kelas error:', err);
    }
  };

  useEffect(() => {
    fetchProdi();
    fetchKelasBaru();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // HANDLER
  const handleProdi = (id) => {
    if (!id) return;
    setSelectedProdi(id);
    const selected = prodi.find(p => p.id == id);
    if (selected) {
      fetchMatkul(id);
      fetchDosen(selected.nama_kurikulum);
    }
    setSelectedMatkul(null);
    setSearchMatkul('');
    setKelasList([]);
  };

  const handleMatkul = (id) => {
    if (!id) {
      setKelasList([]);
      setSelectedMatkul(null);
      return;
    }
    
    const mk = matkul.find(m => m.id == id);
    setSelectedMatkul(mk);
    setSearchMatkul(`${mk.f_kodemk} - ${mk.f_namamk}`);
    setShowDropdown(false);

    const existingClasses = kelasBaru.filter(
      k => k.f_matkul_id === mk.id && 
           k.f_kurikulum === parseInt(selectedProdi)
    );

    const formattedClasses = existingClasses.map(k => ({
      id: k.id,
      nama: k.nama_kelas,
      dosen: k.dosen || '',
      isExisting: true,
    }));

    setKelasList(formattedClasses);
  };

  const getNextClassName = () => {
    if (kelasList.length === 0) return 'A';
    const maxCode = Math.max(...kelasList.map(k => k.nama.charCodeAt(0)), 64);
    const nextCode = maxCode + 1;
    return nextCode > 90 ? 'Z' : String.fromCharCode(nextCode);
  };

  const tambahKelas = () => {
    const nextName = getNextClassName();
    setKelasList([...kelasList, { nama: nextName, dosen: '', isExisting: false }]);
  };

  const hapusKelas = (index) => {
    setKelasList(kelasList.filter((_, i) => i !== index));
  };

  const handleDosen = (index, val) => {
    const updated = [...kelasList];
    updated[index].dosen = val;
    setKelasList(updated);
  };

  const handleSave = async () => {
    if (!selectedProdi || !selectedMatkul) {
      return showMessage('error', 'Lengkapi pilihan Prodi dan Mata Kuliah');
    }

    try {
      const newClasses = kelasList.filter(k => !k.isExisting);
      const existingClasses = kelasList.filter(k => k.isExisting);

      // POST kelas baru
      if (newClasses.length > 0) {
        const res = await fetch('/api/kelas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            f_kurikulum: selectedProdi,
            f_matkul_id: selectedMatkul.id,
            kelasList: newClasses,
          }),
        });

        if (!res.ok) throw new Error('Gagal simpan kelas baru');
      }

      // PUT update kelas yang sudah ada (jika dosen berubah)
      for (const kelas of existingClasses) {
        const res = await fetch('/api/kelas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: kelas.id,
            dosen: kelas.dosen,
          }),
        });

        if (!res.ok) throw new Error(`Gagal update kelas ${kelas.nama}`);
      }

      showMessage('success', 'Berhasil simpan kelas');
      await fetchKelasBaru();
      setKelasList([]);
      setSelectedMatkul(null);
      setSelectedProdi('');
      setSearchMatkul('');
      setActiveTab('view');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDeleteKelas = async (index) => {
    const kelas = kelasList[index];

    if (kelas.isExisting) {
      if (!confirm('Hapus kelas ini secara permanen?')) return;

      try {
        const res = await fetch('/api/kelas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: kelas.id }),
        });

        if (!res.ok) throw new Error('Gagal hapus');
        showMessage('success', 'Kelas berhasil dihapus');
        await fetchKelasBaru();
        setKelasList(kelasList.filter((_, i) => i !== index));
      } catch (err) {
        showMessage('error', err.message);
      }
    } else {
      hapusKelas(index);
    }
  };

  // SORT
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedKelasBaru = [...kelasBaru];
  if (sortConfig.key) {
    sortedKelasBaru.sort((a, b) => {
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

  const filteredMatkul = matkul.filter(m =>
    m.f_kodemk.toLowerCase().includes(searchMatkul.toLowerCase()) ||
    m.f_namamk.toLowerCase().includes(searchMatkul.toLowerCase())
  );

  // UI
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📚 Dashboard Kelas</h1>

        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button
              style={{
                ...styles.btnPrimary,
                ...(activeTab === 'view' ? styles.activeTab : styles.inactiveTab),
              }}
              onClick={() => setActiveTab('view')}
            >
              📋 Lihat Data Kelas
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                ...(activeTab === 'add' ? styles.activeTab : styles.inactiveTab),
              }}
              onClick={() => setActiveTab('add')}
            >
              ➕ Kelola Kelas
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: LIHAT KELAS ==================== */}
        {activeTab === 'view' && (
          <div style={styles.tableWrapper}>
            <div style={styles.tableHeader}>
              <h2>📋 Daftar Kelas yang Tersimpan</h2>
              {kelasBaru.length > 0 && (
                <span style={styles.badge}>Total: {kelasBaru.length} kelas</span>
              )}
            </div>

            {kelasBaru.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p>Belum ada kelas yang tersimpan</p>
                <button 
                  style={styles.btnPrimary}
                  onClick={() => setActiveTab('add')}
                >
                  ➕ Buat Kelas
                </button>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th} onClick={() => handleSort('f_kurikulum')}>
                        Program Studi {renderSortIcon('f_kurikulum')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_kodemk')}>
                        Kode MK {renderSortIcon('f_kodemk')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namamk')}>
                        Mata Kuliah {renderSortIcon('f_namamk')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('nama_kelas')}>
                        Kelas {renderSortIcon('nama_kelas')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('dosen')}>
                        Dosen {renderSortIcon('dosen')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedKelasBaru.map((k, idx) => {
                      const prodiName = prodi.find(p => p.id === k.f_kurikulum)?.nama_kurikulum || '-';
                      return (
                        <tr key={k.id} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                          <td style={styles.td}>{prodiName}</td>
                          <td style={styles.td}>
                            <span style={styles.badgeCode}>{k.f_kodemk}</span>
                          </td>
                          <td style={styles.td}>{k.f_namamk}</td>
                          <td style={styles.td}>
                            <span style={styles.badgeKelas}>{k.nama_kelas}</span>
                          </td>
                          <td style={styles.td}>{k.dosen || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: KELOLA KELAS ==================== */}
        {activeTab === 'add' && (
          <div style={styles.tableWrapper}>
            <h2>➕ Kelola Kelas</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={styles.label}>
                  Program Studi/Kurikulum:
                </label>
                <select 
                  onChange={(e) => handleProdi(e.target.value)}
                  value={selectedProdi}
                  style={styles.select}
                  disabled={loading}
                >
                  <option value="">
                    {loading ? '⏳ Loading...' : '📖 Pilih Kurikulum'}
                  </option>
                  {prodi.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama_kurikulum} ({p.tahun_ajaran})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  Mata Kuliah:
                </label>
                <input
                  type="text"
                  placeholder="Cari kode atau nama MK..."
                  value={searchMatkul}
                  onChange={(e) => {
                    setSearchMatkul(e.target.value);
                    setShowDropdown(true);
                    if (e.target.value === '') {
                      setSelectedMatkul(null);
                      setKelasList([]);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={styles.select}
                />
                
                {/* Dropdown hasil filter */}
                {showDropdown && searchMatkul && filteredMatkul.length > 0 && (
                  <div style={styles.dropdown}>
                    {filteredMatkul.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleMatkul(m.id)}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedMatkul?.id === m.id ? styles.dropdownItemActive : {}),
                        }}
                      >
                        <div style={styles.dropdownTitle}>{m.f_kodemk}</div>
                        <div style={styles.dropdownSubtitle}>{m.f_namamk}</div>
                        <div style={styles.dropdownDetail}>SKS: {m.f_sks_kurikulum} | Semester: {m.f_semester}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showDropdown && searchMatkul && filteredMatkul.length === 0 && (
                  <div style={styles.dropdownEmpty}>
                    Tidak ada mata kuliah yang cocok
                  </div>
                )}
              </div>
            </div>

            {selectedMatkul && (
              <div style={styles.selectedInfo}>
                <p><strong>📖 Mata Kuliah:</strong> {selectedMatkul.f_namamk}</p>
                <p><strong>🔢 Kode:</strong> {selectedMatkul.f_kodemk}</p>
                <p><strong>📊 SKS:</strong> {selectedMatkul.f_sks_kurikulum}</p>
                <p><strong>📅 Semester:</strong> {selectedMatkul.f_semester}</p>
              </div>
            )}

            {selectedMatkul && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <button 
                    style={styles.btnPrimary}
                    onClick={tambahKelas}
                  >
                    ➕ Tambah Kelas ({getNextClassName()})
                  </button>
                </div>

                {kelasList.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📭</span>
                    <p>Belum ada kelas. Klik &quot;➕ Tambah Kelas&quot; untuk menambahkan.</p>
                  </div>
                ) : (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.th}>Kelas</th>
                          <th style={styles.th}>Dosen</th>
                          <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kelasList.map((k, idx) => (
                          <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                            <td style={styles.td}>
                              <span style={styles.badgeKelas}>{k.nama}</span>
                            </td>
                            <td style={styles.td}>
                              <input
                                list={`dosen-list-${idx}`}
                                value={k.dosen}
                                onChange={(e) => handleDosen(idx, e.target.value)}
                                placeholder="Ketik atau pilih dosen..."
                                style={styles.selectInput}
                              />
                              <datalist id={`dosen-list-${idx}`}>
                                {dosenList.map((d) => (
                                  <option key={d.id} value={d.f_namapegawai} />
                                ))}
                              </datalist>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                style={styles.btnIconDanger}
                                onClick={() => handleDeleteKelas(idx)}
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

                {kelasList.length > 0 && (
                  <button onClick={handleSave} style={styles.btnSuccess}>
                    💾 Simpan Semua Kelas
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
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
  activeTab: {
    opacity: 1,
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  inactiveTab: {
    opacity: 0.6,
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#4a5568',
  },
  select: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  selectInput: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s',
  },
  dropdown: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1px solid #cbd5e0',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    backgroundColor: 'white',
    position: 'relative',
    zIndex: 10,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'background-color 0.2s',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f7ff',
  },
  dropdownTitle: {
    fontWeight: '600',
    color: '#4338ca',
    fontSize: '0.9rem',
  },
  dropdownSubtitle: {
    fontSize: '0.875rem',
    color: '#4a5568',
    marginTop: '0.25rem',
  },
  dropdownDetail: {
    fontSize: '0.75rem',
    color: '#a0aec0',
    marginTop: '0.25rem',
  },
  dropdownEmpty: {
    padding: '1rem',
    border: '1px solid #cbd5e0',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    color: '#a0aec0',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  selectedInfo: {
    backgroundColor: '#f0f7ff',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #667eea',
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
    padding: '0.75rem 1.5rem',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '1.5rem',
    width: '100%',
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
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '1.5rem',
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
  td: {
    padding: '1rem',
    color: '#2d3748',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e2e8f0',
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
  badgeKelas: {
    backgroundColor: '#fef5e7',
    color: '#c05621',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
    display: 'inline-block',
  },
};

// Add global hover styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    button:hover { opacity: 0.85; transform: translateY(-1px); }
    input:hover, select:hover { border-color: #667eea; }
    input:focus, select:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    tr:hover { background-color: #f7fafc !important; }
    .dropdown-item:hover { background-color: #f7fafc; }
  `;
  document.head.appendChild(styleSheet);
}