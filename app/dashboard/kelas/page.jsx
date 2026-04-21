'use client';

import { useEffect, useState, Fragment } from 'react';
import { colors, globalStyles } from '../../styles/upnvjTheme';

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
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState(null);
  const [editingDosenSearch, setEditingDosenSearch] = useState('');
  const [showDosenDropdown, setShowDosenDropdown] = useState(false);
  const [addingForGroup, setAddingForGroup] = useState(null);
  const [newClassData, setNewClassData] = useState({ nama_kelas: '', dosen: '' });
  const [searchKeywordView, setSearchKeywordView] = useState('');

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
    (async () => {
      await fetchProdi();
      await fetchKelasBaru();
    })();
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

  const handleEditKelas = async (kelas) => {
    setEditingKelas({ ...kelas });
    setEditingDosenSearch('');
    setShowDosenDropdown(false);
    
    if (dosenList.length === 0) {
      try {
        const prodiName = prodi.find(p => p.id === kelas.f_kurikulum)?.nama_kurikulum;
        if (prodiName) {
          await fetchDosen(prodiName);
        }
      } catch (err) {
        console.error('Error fetch dosen:', err);
      }
    }
    setShowEditModal(true);
  };

  const handleEditDosenChange = (val) => {
    setEditingKelas({ ...editingKelas, dosen: val });
    setEditingDosenSearch(val);
    setShowDosenDropdown(true);
  };

  const handleSelectDosenFromDropdown = (dosenName) => {
    setEditingKelas({ ...editingKelas, dosen: dosenName });
    setEditingDosenSearch('');
    setShowDosenDropdown(false);
  };

  const handleSaveEdit = async () => {
    if (!editingKelas || !editingKelas.id) return;

    try {
      const res = await fetch('/api/kelas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingKelas.id,
          dosen: editingKelas.dosen || null,
        }),
      });
      if (!res.ok) throw new Error('Gagal update kelas');
      showMessage('success', 'Kelas berhasil diupdate');
      await fetchKelasBaru();
      setShowEditModal(false);
      setEditingKelas(null);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleAddClassToGroup = async (groupData) => {
    if (!newClassData.nama_kelas.trim()) {
      showMessage('error', 'Nama kelas tidak boleh kosong');
      return;
    }

    try {
      const res = await fetch('/api/kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          f_kurikulum: groupData.f_kurikulum,
          f_matkul_id: groupData.f_matkul_id,
          kelasList: [{
            nama: newClassData.nama_kelas,
            dosen: newClassData.dosen || null,
          }],
        }),
      });
      if (!res.ok) throw new Error('Gagal tambah kelas');
      showMessage('success', 'Kelas berhasil ditambahkan');
      await fetchKelasBaru();
      setAddingForGroup(null);
      setNewClassData({ nama_kelas: '', dosen: '' });
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDeleteClassFromView = async (kelasId) => {
    if (!confirm('Hapus kelas ini secara permanen?')) return;
    try {
      const res = await fetch('/api/kelas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kelasId }),
      });
      if (!res.ok) throw new Error('Gagal hapus');
      showMessage('success', 'Kelas berhasil dihapus');
      await fetchKelasBaru();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const toggleExpandGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // SORT
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
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
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
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

  const getGroupedData = () => {
    const grouped = {};
    sortedKelasBaru.forEach(k => {
      const key = `${k.f_kurikulum}||${k.f_kodemk}||${k.f_namamk}`;
      if (!grouped[key]) {
        grouped[key] = {
          f_kurikulum: k.f_kurikulum,
          f_kodemk: k.f_kodemk,
          f_namamk: k.f_namamk,
          f_sks_kurikulum: k.f_sks_kurikulum || '-',
          f_semester: k.f_semester || '-',
          classes: []
        };
      }
      grouped[key].classes.push(k);
    });
    return Object.values(grouped);
  };

  const getFilteredAndGroupedData = () => {
    if (!searchKeywordView.trim()) return getGroupedData();

    const keyword = searchKeywordView.toLowerCase();
    const prodiMap = {};
    prodi.forEach(p => { prodiMap[p.id] = p.nama_kurikulum; });

    const filtered = sortedKelasBaru.filter(k => {
      const prodiName = prodiMap[k.f_kurikulum] || '';
      return (
        k.f_kodemk.toLowerCase().includes(keyword) ||
        k.f_namamk.toLowerCase().includes(keyword) ||
        prodiName.toLowerCase().includes(keyword) ||
        k.nama_kelas.toLowerCase().includes(keyword) ||
        (k.dosen && k.dosen.toLowerCase().includes(keyword))
      );
    });

    const grouped = {};
    filtered.forEach(k => {
      const key = `${k.f_kurikulum}||${k.f_kodemk}||${k.f_namamk}`;
      if (!grouped[key]) {
        grouped[key] = {
          f_kurikulum: k.f_kurikulum,
          f_kodemk: k.f_kodemk,
          f_namamk: k.f_namamk,
          f_sks_kurikulum: k.f_sks_kurikulum || '-',
          f_semester: k.f_semester || '-',
          classes: []
        };
      }
      grouped[key].classes.push(k);
    });
    return Object.values(grouped);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📚 Dashboard Kelas</h1>
            <p style={styles.subtitle}>Kelola data kelas dan dosen pengajar</p>
          </div>
          <div style={styles.statsBadge}>
            <span style={styles.statsNumber}>{kelasBaru.length}</span>
            <span style={styles.statsLabel}>Total Kelas</span>
          </div>
        </div>

        {message.text && (
          <div style={{ ...styles.message, ...(message.type === 'success' ? styles.messageSuccess : styles.messageError) }}>
            {message.type === 'success' ? '✓' : '✗'} {message.text}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === 'view' ? styles.tabActive : styles.tabInactive),
              }}
              onClick={() => setActiveTab('view')}
            >
              📋 Lihat Data Kelas
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === 'add' ? styles.tabActive : styles.tabInactive),
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
              <h2 style={styles.sectionTitle}>📋 Daftar Kelas yang Tersimpan</h2>
            </div>

            {/* Search Filter */}
            {kelasBaru.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  value={searchKeywordView}
                  onChange={(e) => setSearchKeywordView(e.target.value)}
                  placeholder="🔍 Cari kelas (Program Studi, Kode MK, Nama, Dosen...)"
                  style={styles.searchInput}
                />
                {searchKeywordView && (
                  <p style={styles.searchInfo}>
                    Menampilkan hasil untuk: <strong>"{searchKeywordView}"</strong>
                  </p>
                )}
              </div>
            )}

            {kelasBaru.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p>Belum ada kelas yang tersimpan</p>
                <button style={styles.btnPrimary} onClick={() => setActiveTab('add')}>
                  ➕ Buat Kelas
                </button>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={{ ...styles.th, width: '50px' }}></th>
                      <th style={styles.th} onClick={() => handleSort('f_kurikulum')}>
                        Program Studi {renderSortIcon('f_kurikulum')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_kodemk')}>
                        Kode MK {renderSortIcon('f_kodemk')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namamk')}>
                        Mata Kuliah {renderSortIcon('f_namamk')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_sks_kurikulum')}>
                        SKS {renderSortIcon('f_sks_kurikulum')}
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_semester')}>
                        Semester {renderSortIcon('f_semester')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(searchKeywordView ? getFilteredAndGroupedData() : getGroupedData()).map((group, idx) => {
                      const prodiName = prodi.find(p => p.id === group.f_kurikulum)?.nama_kurikulum || '-';
                      const groupKey = `${group.f_kurikulum}||${group.f_kodemk}||${group.f_namamk}`;
                      const isExpanded = expandedGroups[groupKey];
                      
                      return (
                        <Fragment key={groupKey}>
                          <tr style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                            <td style={{ ...styles.td, textAlign: 'center', padding: '1rem 0.5rem' }}>
                              <button style={styles.btnExpand} onClick={() => toggleExpandGroup(groupKey)}>
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>
                            <td style={styles.td}>{prodiName}</td>
                            <td style={styles.td}>
                              <span style={styles.badgeCode}>{group.f_kodemk}</span>
                            </td>
                            <td style={styles.td}>
                              {group.f_namamk}
                              <span style={styles.classBadge}>{group.classes.length} kelas</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.sksBadge}>{group.f_sks_kurikulum}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.semesterBadge}>Semester {group.f_semester}</span>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr style={{ backgroundColor: colors.primaryLight }}>
                              <td colSpan="6" style={{ ...styles.td, padding: '1.5rem' }}>
                                <div style={styles.expandedContent}>
                                  <h3 style={styles.expandedTitle}>📚 Detail Kelas ({group.classes.length})</h3>
                                  
                                  <div style={styles.classesTable}>
                                    <div style={styles.classesTableHeader}>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: '0 0 150px' }}>Kelas</div>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: 1 }}>Dosen</div>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: '0 0 120px', textAlign: 'center' }}>Aksi</div>
                                    </div>

                                    {group.classes.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas)).map((kelas) => (
                                      <Fragment key={kelas.id}>
                                        <div style={styles.classesTableRow}>
                                          <div style={{ ...styles.classesTableCell, flex: '0 0 150px' }}>
                                            <span style={styles.badgeKelas}>{kelas.nama_kelas}</span>
                                          </div>
                                          <div style={{ ...styles.classesTableCell, flex: 1 }}>
                                            {kelas.dosen || <span style={{ color: colors.textLight }}>-</span>}
                                          </div>
                                          <div style={{ ...styles.classesTableCell, flex: '0 0 120px', textAlign: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button style={styles.btnEditSmall} onClick={() => handleEditKelas(kelas)}>✏️ Edit</button>
                                            <button style={styles.btnDeleteSmall} onClick={() => handleDeleteClassFromView(kelas.id)}>🗑️</button>
                                          </div>
                                        </div>
                                      </Fragment>
                                    ))}
                                  </div>

                                  {addingForGroup === groupKey ? (
                                    <div style={styles.addClassForm}>
                                      <h4 style={styles.addClassTitle}>➕ Tambah Kelas Baru</h4>
                                      <div style={styles.addClassInputs}>
                                        <input
                                          type="text"
                                          value={newClassData.nama_kelas}
                                          onChange={(e) => setNewClassData({ ...newClassData, nama_kelas: e.target.value.toUpperCase() })}
                                          placeholder="Nama kelas (A, B, C...)"
                                          maxLength="2"
                                          style={styles.inputSmall}
                                        />
                                        <input
                                          list="dosen-list-add"
                                          value={newClassData.dosen}
                                          onChange={(e) => setNewClassData({ ...newClassData, dosen: e.target.value })}
                                          placeholder="Dosen (opsional)"
                                          style={styles.inputSmall}
                                        />
                                        <datalist id="dosen-list-add">
                                          {dosenList.map((d) => (<option key={d.id} value={d.f_namapegawai} />))}
                                        </datalist>
                                      </div>
                                      <div style={styles.addClassActions}>
                                        <button style={styles.btnSuccessSmall} onClick={() => handleAddClassToGroup({
                                          f_kurikulum: group.f_kurikulum,
                                          f_matkul_id: group.classes[0]?.f_matkul_id,
                                        })}>💾 Simpan</button>
                                        <button style={styles.btnSecondarySmall} onClick={() => { setAddingForGroup(null); setNewClassData({ nama_kelas: '', dosen: '' }); }}>❌ Batal</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button style={styles.btnPrimarySmall} onClick={() => { setAddingForGroup(groupKey); setNewClassData({ nama_kelas: '', dosen: '' }); }}>
                                      ➕ Tambah Kelas
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {searchKeywordView && getFilteredAndGroupedData().length === 0 && (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                    <p>Tidak ada kelas yang cocok dengan keyword: <strong>"{searchKeywordView}"</strong></p>
                    <button style={styles.btnPrimary} onClick={() => setSearchKeywordView('')}>❌ Hapus Filter</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: KELOLA KELAS ==================== */}
        {activeTab === 'add' && (
          <div style={styles.tableWrapper}>
            <h2 style={styles.sectionTitle}>➕ Kelola Kelas</h2>

            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Program Studi/Kurikulum:</label>
                <select onChange={(e) => handleProdi(e.target.value)} value={selectedProdi} style={styles.select} disabled={loading}>
                  <option value="">{loading ? '⏳ Loading...' : '📖 Pilih Kurikulum'}</option>
                  {prodi.map(p => (<option key={p.id} value={p.id}>{p.nama_kurikulum} ({p.tahun_ajaran})</option>))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Mata Kuliah:</label>
                <input
                  type="text"
                  placeholder="Cari kode atau nama MK..."
                  value={searchMatkul}
                  onChange={(e) => { setSearchMatkul(e.target.value); setShowDropdown(true); if (e.target.value === '') { setSelectedMatkul(null); setKelasList([]); } }}
                  onFocus={() => setShowDropdown(true)}
                  style={styles.select}
                />
                
                {showDropdown && searchMatkul && filteredMatkul.length > 0 && (
                  <div style={styles.dropdown}>
                    {filteredMatkul.map(m => (
                      <div key={m.id} onClick={() => handleMatkul(m.id)} style={{ ...styles.dropdownItem, ...(selectedMatkul?.id === m.id ? styles.dropdownItemActive : {}) }}>
                        <div style={styles.dropdownTitle}>{m.f_kodemk}</div>
                        <div style={styles.dropdownSubtitle}>{m.f_namamk}</div>
                        <div style={styles.dropdownDetail}>SKS: {m.f_sks_kurikulum} | Semester: {m.f_semester}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedMatkul && (
              <div style={styles.selectedInfo}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <p><strong>📖 Mata Kuliah:</strong> {selectedMatkul.f_namamk}</p>
                    <p><strong>🔢 Kode:</strong> {selectedMatkul.f_kodemk}</p>
                  </div>
                  <div>
                    <p><strong>📊 SKS:</strong> <span style={styles.infoBadge}>{selectedMatkul.f_sks_kurikulum} SKS</span></p>
                    <p><strong>📅 Semester:</strong> <span style={styles.infoBadge}>Semester {selectedMatkul.f_semester}</span></p>
                  </div>
                </div>
              </div>
            )}

            {selectedMatkul && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <button style={styles.btnPrimary} onClick={tambahKelas}>➕ Tambah Kelas ({getNextClassName()})</button>
                </div>

                {kelasList.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📭</span>
                    <p>Belum ada kelas. Klik "➕ Tambah Kelas" untuk menambahkan.</p>
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
                            <td style={styles.td}><span style={styles.badgeKelas}>{k.nama}</span></td>
                            <td style={styles.td}>
                              <input list={`dosen-list-${idx}`} value={k.dosen} onChange={(e) => handleDosen(idx, e.target.value)} placeholder="Ketik atau pilih dosen..." style={styles.input} />
                              <datalist id={`dosen-list-${idx}`}>
                                {dosenList.map((d) => (<option key={d.id} value={d.f_namapegawai} />))}
                              </datalist>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button style={styles.btnIconDanger} onClick={() => handleDeleteKelas(idx)} title="Hapus">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {kelasList.length > 0 && (
                  <button onClick={handleSave} style={styles.btnSuccess}>💾 Simpan Semua Kelas</button>
                )}
              </>
            )}
          </div>
        )}

        {/* MODAL EDIT KELAS */}
        {showEditModal && editingKelas && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>✏️ Edit Kelas</h2>
                <button style={styles.modalClose} onClick={() => { setShowEditModal(false); setEditingKelas(null); }}>✕</button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama Kelas:</label>
                  <input type="text" value={editingKelas.nama_kelas || ''} disabled style={styles.inputDisabled} />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mata Kuliah:</label>
                  <input type="text" value={editingKelas.f_namamk || ''} disabled style={styles.inputDisabled} />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Dosen:</label>
                  <input
                    type="text"
                    value={editingKelas.dosen || ''}
                    onChange={(e) => handleEditDosenChange(e.target.value)}
                    onFocus={() => setShowDosenDropdown(true)}
                    placeholder="Ketik atau pilih dosen..."
                    style={styles.input}
                  />
                  
                  {showDosenDropdown && (
                    <div style={styles.dosenDropdownModal}>
                      {dosenList.filter(d => d.f_namapegawai.toLowerCase().includes(editingDosenSearch.toLowerCase())).map((d) => (
                        <div key={d.id} onClick={() => handleSelectDosenFromDropdown(d.f_namapegawai)} style={styles.dosenDropdownItem}>
                          <div style={styles.dosenNameModal}>{d.f_namapegawai}</div>
                          {d.f_title_depan && <div style={styles.dosenTitleModal}>{d.f_title_depan} {d.f_title_belakang || ''}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.btnSecondary} onClick={() => { setShowEditModal(false); setEditingKelas(null); }}>❌ Batal</button>
                <button style={styles.btnPrimary} onClick={handleSaveEdit}>💾 Simpan Perubahan</button>
              </div>
            </div>
          </div>
        )}
      </div>
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
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: `1px solid ${colors.border}`,
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  tabButton: {
    padding: '0.625rem 1.25rem',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: 'white',
  },
  tabInactive: {
    backgroundColor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
  },
  
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '1rem',
  },
  
  label: globalStyles.label,
  select: globalStyles.input,
  input: globalStyles.input,
  inputDisabled: {
    ...globalStyles.input,
    backgroundColor: colors.background,
    cursor: 'not-allowed',
  },
  inputSmall: {
    padding: '0.5rem 0.75rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    fontSize: '0.875rem',
    width: '100%',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
  },
  searchInfo: {
    fontSize: '0.85rem',
    color: colors.textLight,
    marginTop: '0.5rem',
  },
  
  btnPrimary: globalStyles.btnPrimary,
  btnSuccess: {
    padding: '0.75rem 1.5rem',
    backgroundColor: colors.success,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1.5rem',
  },
  btnPrimarySmall: {
    padding: '0.4rem 0.8rem',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.75rem',
  },
  btnSuccessSmall: {
    padding: '0.4rem 0.8rem',
    backgroundColor: colors.success,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    flex: 1,
  },
  btnSecondarySmall: {
    padding: '0.4rem 0.8rem',
    backgroundColor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    flex: 1,
  },
  btnSecondary: globalStyles.btnSecondary,
  btnIconDanger: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    color: colors.danger,
  },
  btnExpand: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem 0.5rem',
    color: colors.primary,
    fontWeight: '600',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  btnEditSmall: {
    padding: '0.3rem 0.6rem',
    backgroundColor: colors.success,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '0.25rem',
  },
  btnDeleteSmall: {
    padding: '0.3rem 0.5rem',
    backgroundColor: colors.danger,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  tableWrapper: { marginTop: '1.5rem' },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  td: {
    padding: '1rem',
    color: colors.text,
    fontSize: '0.875rem',
  },
  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },
  tableRowEven: {
    backgroundColor: '#FCFCFD',
    borderBottom: `1px solid ${colors.border}`,
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: colors.background,
    borderRadius: '16px',
    color: colors.textLight,
  },
  emptyIcon: { fontSize: '3rem', display: 'block', marginBottom: '1rem' },
  
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
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  classBadge: {
    marginLeft: '0.75rem',
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
  badgeKelas: {
    backgroundColor: colors.primary,
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  infoBadge: {
    backgroundColor: colors.primary,
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500',
    display: 'inline-block',
  },
  
  selectedInfo: {
    backgroundColor: colors.primaryLight,
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    borderLeft: `4px solid ${colors.primary}`,
  },
  
  dropdown: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    backgroundColor: colors.cardBg,
    marginTop: '0.25rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownTitle: { fontWeight: '600', color: colors.primary, fontSize: '0.9rem' },
  dropdownSubtitle: { fontSize: '0.875rem', color: colors.text, marginTop: '0.25rem' },
  dropdownDetail: { fontSize: '0.75rem', color: colors.textLight, marginTop: '0.25rem' },
  
  expandedContent: { padding: '0.5rem' },
  expandedTitle: { margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: colors.text },
  
  classesTable: {
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },
  classesTableHeader: {
    display: 'flex',
    backgroundColor: colors.background,
    borderBottom: `2px solid ${colors.border}`,
    padding: '0.75rem 1rem',
    gap: '1rem',
  },
  classesTableRow: {
    display: 'flex',
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${colors.border}`,
    alignItems: 'center',
    gap: '1rem',
  },
  classesTableCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: colors.text,
  },
  
  addClassForm: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: colors.primaryLight,
    borderRadius: '12px',
  },
  addClassTitle: { margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: colors.text },
  addClassInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  addClassActions: { display: 'flex', gap: '0.5rem' },
  
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.cardBg,
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`,
  },
  modalTitle: { fontSize: '1.125rem', fontWeight: '600', color: colors.secondary, margin: 0 },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: colors.textLight,
  },
  modalBody: { padding: '1.5rem' },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    padding: '1rem 1.5rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
  },
  
  dosenDropdownModal: {
    position: 'absolute',
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 20,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    width: 'calc(100% - 3rem)',
  },
  dosenDropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dosenNameModal: { fontWeight: '600', color: colors.text, fontSize: '0.9rem' },
  dosenTitleModal: { fontSize: '0.8rem', color: colors.textLight, marginTop: '0.25rem' },
};

// Add global hover styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    button:hover { opacity: 0.9; transform: translateY(-1px); }
    button:active { transform: translateY(0); }
    input:focus, select:focus { outline: none; border-color: ${colors.primary}; box-shadow: 0 0 0 3px rgba(244, 124, 56, 0.1); }
    .dropdown-item:hover { background-color: ${colors.primaryLight}; }
  `;
  document.head.appendChild(styleSheet);
}