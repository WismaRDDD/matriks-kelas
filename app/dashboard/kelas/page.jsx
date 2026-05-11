'use client';

import { useEffect, useState, Fragment } from 'react';

export default function KelasPage() {
  const [prodi, setProdi] = useState([]);
  const [matkul, setMatkul] = useState([]);
  const [selectedMatkul, setSelectedMatkul] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [kelasBaru, setKelasBaru] = useState([]);
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
  
  // Filter states
  const [tahunAkademikList, setTahunAkademikList] = useState([]);
  const [selectedTahunAkademik, setSelectedTahunAkademik] = useState('');
  const [kurikulumMasterList, setKurikulumMasterList] = useState([]);
  const [selectedKodeKurikulum, setSelectedKodeKurikulum] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('gasal');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
  const [selectedKurikulumId, setSelectedKurikulumId] = useState('');

  // FETCH
  const fetchProdi = async () => {
    try {
      const res = await fetch('/api/kurikulum-master');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProdi(data);
    } catch (err) {
      showMessage('error', `Error loading prodi: ${err.message}`);
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
      console.log('📊 Data kelas:', data); // Debug: lihat data yang diterima
      setKelasBaru(data);
    } catch (err) {
      console.error('❌ Fetch kelas error:', err);
    }
  };

  const fetchTahunAkademik = async () => {
    try {
      const res = await fetch('/api/tahun-akademik');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTahunAkademikList(data);
    } catch (err) {
      console.error('❌ Fetch tahun akademik error:', err);
    }
  };

  const fetchKurikulumMaster = async (tahunId) => {
    try {
      const res = await fetch('/api/kurikulum-master');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Filter by tahun akademik
      const filtered = tahunId 
        ? data.filter(k => String(k.f_tahun_akademik) === String(tahunId))
        : data;
      setKurikulumMasterList(filtered);
      setSelectedKodeKurikulum('');
      setSelectedTahunAjaran('');
      setSelectedKurikulumId('');
    } catch (err) {
      console.error('❌ Fetch kurikulum master error:', err);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchProdi();
      await fetchKelasBaru();
      await fetchTahunAkademik();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // HANDLER
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
           k.f_kurikulum === selectedKurikulumId
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

  const handleTahunAkademikChange = (tahunId) => {
    setSelectedTahunAkademik(tahunId);
    setSelectedKodeKurikulum('');
    setSelectedTahunAjaran('');
    setSelectedSemester('gasal');
    setSelectedKurikulumId('');
    if (tahunId) {
      fetchKurikulumMaster(tahunId);
    }
  };

  const handleKodeKurikulumChange = (kode) => {
    setSelectedKodeKurikulum(kode);
    setSelectedTahunAjaran('');
    setSelectedSemester('gasal');
    setSelectedKurikulumId('');
    setSelectedMatkul(null);
    setSearchMatkul('');
    setKelasList([]);
    if (kode) {
      // Find kurikulum ID for the selected kode_kurikulum
      const selected = kurikulumMasterList.find(k => k.kode_kurikulum === kode && String(k.f_tahun_akademik) === String(selectedTahunAkademik));
      if (selected) {
        setSelectedKurikulumId(selected.id);
        setSelectedTahunAjaran(String(selected.tahun_ajaran));
        // Fetch matkul dan dosen for selected kurikulum
        fetchMatkul(selected.id);
        fetchDosen(selected.nama_kurikulum);
      }
    }
  };

  const handleSemesterChange = (sem) => {
    // Always keep one semester selected, can only switch between gasal/genap
    if (selectedSemester !== sem) {
      setSelectedSemester(sem);
    }
  };

  const handleSave = async () => {
    if (!selectedKurikulumId || !selectedMatkul) {
      return showMessage('error', 'Lengkapi pilihan Kode Kurikulum dan Mata Kuliah');
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
            f_kurikulum: selectedKurikulumId,
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
    
    // Fetch dosen list untuk dropdown search
    if (dosenList.length === 0) {
      try {
        // Get prodi name dari kelas
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
    setShowDosenDropdown(true); // Keep dropdown open saat user ketik
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
      setEditingDosenSearch('');
      setShowDosenDropdown(false);
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
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
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

  const filteredMatkul = matkul.filter(m => {
    // Filter by search keyword
    const matchKeyword = m.f_kodemk.toLowerCase().includes(searchMatkul.toLowerCase()) ||
      m.f_namamk.toLowerCase().includes(searchMatkul.toLowerCase());
    
    // Filter by semester if tab is 'add' and semester is selected in filter
    if (activeTab === 'add' && selectedSemester) {
      const semesterNumbers = selectedSemester === 'gasal' ? [1, 3, 5, 7] : [2, 4, 6, 8];
      return matchKeyword && semesterNumbers.includes(m.f_semester);
    }
    
    return matchKeyword;
  });

  const getFilteredDataByMasterFilters = () => {
    let filtered = kelasBaru;

    // Filter by tahun akademik
    if (selectedTahunAkademik) {
      filtered = filtered.filter(k => String(k.f_tahun_akademik) === String(selectedTahunAkademik));
    }

    // Filter by kode kurikulum
    if (selectedKodeKurikulum) {
      filtered = filtered.filter(k => k.kode_kurikulum === selectedKodeKurikulum);
    }

    // Filter by semester (gasal/genap)
    if (selectedSemester) {
      if (selectedSemester === 'gasal') {
        filtered = filtered.filter(k => k.f_semester && [1, 3, 5, 7].includes(parseInt(k.f_semester)));
      } else if (selectedSemester === 'genap') {
        filtered = filtered.filter(k => k.f_semester && [2, 4, 6, 8].includes(parseInt(k.f_semester)));
      }
    }

    // Filter by tahun ajaran
    if (selectedTahunAjaran) {
      filtered = filtered.filter(k => String(k.tahun_ajaran) === String(selectedTahunAjaran));
    }

    return filtered;
  };

  const getGroupedFilteredData = () => {
    const grouped = {};
    const filteredData = getFilteredDataByMasterFilters();
  
    filteredData.forEach(k => {
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
    const prodiMap = {};
    prodi.forEach(p => {
      prodiMap[p.id] = p.nama_kurikulum;
    });

    // First apply filters
    let filtered = kelasBaru;

    // Filter by tahun akademik
    if (selectedTahunAkademik) {
      filtered = filtered.filter(k => String(k.f_tahun_akademik) === String(selectedTahunAkademik));
    }

    // Filter by kode kurikulum
    if (selectedKodeKurikulum) {
      filtered = filtered.filter(k => k.kode_kurikulum === selectedKodeKurikulum);
    }

    // Filter by semester (gasal/genap)
    if (selectedSemester) {
      if (selectedSemester === 'gasal') {
        filtered = filtered.filter(k => k.f_semester && [1, 3, 5, 7].includes(parseInt(k.f_semester)));
      } else if (selectedSemester === 'genap') {
        filtered = filtered.filter(k => k.f_semester && [2, 4, 6, 8].includes(parseInt(k.f_semester)));
      }
    }

    // Filter by tahun ajaran
    if (selectedTahunAjaran) {
      filtered = filtered.filter(k => String(k.tahun_ajaran) === String(selectedTahunAjaran));
    }

    // Then apply keyword search
    if (searchKeywordView.trim()) {
      const keyword = searchKeywordView.toLowerCase();
      filtered = filtered.filter(k => {
        const prodiName = prodiMap[k.f_kurikulum] || '';
        
        return (
          k.f_kodemk.toLowerCase().includes(keyword) ||
          k.f_namamk.toLowerCase().includes(keyword) ||
          prodiName.toLowerCase().includes(keyword) ||
          k.nama_kelas.toLowerCase().includes(keyword) ||
          (k.dosen && k.dosen.toLowerCase().includes(keyword)) ||
          (k.f_namapegawai && k.f_namapegawai.toLowerCase().includes(keyword)) ||
          (k.display_name && k.display_name.toLowerCase().includes(keyword)) ||
          (k.f_sks_kurikulum && k.f_sks_kurikulum.toString().includes(keyword)) ||
          (k.f_semester && k.f_semester.toString().includes(keyword))
        );
      });
    }

    // Group filtered data
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

  // UI
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📚 Dashboard KRS Matakuliah</h1>

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
              ➕ Tambah Matakuliah
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: LIHAT KELAS ==================== */}
        {activeTab === 'view' && (
          <div style={styles.tableWrapper}>
            {/* Master Filter: Tahun Akademik */}
            <div style={styles.masterFilter}>
              <label style={styles.filterLabel}>📅 Tahun Akademik:</label>
              <select
                value={selectedTahunAkademik}
                onChange={(e) => handleTahunAkademikChange(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Pilih Tahun Akademik --</option>
                {tahunAkademikList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tahun_akademik}
                  </option>
                ))}
              </select>
            </div>

            {/* Subfilters: Kode Kurikulum, Semester & Tahun Ajaran */}
            {selectedTahunAkademik && (
              <div style={styles.subFilters}>
                <label style={styles.filterLabel}>📖 Kode Kurikulum:</label>
                <select
                  value={selectedKodeKurikulum}
                  onChange={(e) => handleKodeKurikulumChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Pilih Kode Kurikulum --</option>
                  {[...new Set(kurikulumMasterList.map(k => k.kode_kurikulum))].map((kode) => (
                    <option key={kode} value={kode}>
                      {kode}
                    </option>
                  ))}
                </select>

                <label style={styles.filterLabel}>📚 Semester:</label>
                <div style={styles.semesterToggleGroup}>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'gasal' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('gasal')}
                  >
                    Gasal (1,3,5,7)
                  </button>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'genap' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('genap')}
                  >
                    Genap (2,4,6,8)
                  </button>
                </div>

                <label style={styles.filterLabel}>📆 Tahun Ajaran:</label>
                <select
                  value={selectedTahunAjaran}
                  onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                  style={styles.select}
                  disabled={!selectedKodeKurikulum}
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {selectedKodeKurikulum && selectedKurikulumId && (
                    <option value={selectedTahunAjaran || kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_ajaran || ''}>
                      {kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_ajaran || ''}
                    </option>
                  )}
                </select>
              </div>
            )}

            <div style={styles.tableHeader}>
              <h2>📋 Daftar Kelas yang Tersimpan</h2>
              <button
                style={{
                  ...styles.btnPrimary,
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                }}
                onClick={() => fetchKelasBaru()}
              >
                🔍 Refresh Data
              </button>
            </div>

            {/* Check if filters are complete */}
            {!selectedTahunAkademik || !selectedKodeKurikulum || !selectedTahunAjaran ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p>Filter belum lengkap</p>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  Silakan pilih <strong>Tahun Akademik</strong>, <strong>Kode Kurikulum</strong>, dan <strong>Tahun Ajaran</strong> untuk menampilkan daftar kelas
                </p>
              </div>
            ) : (
              <div>
                {/* Search Filter */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={searchKeywordView}
                    onChange={(e) => setSearchKeywordView(e.target.value)}
                    placeholder="🔍 Cari kelas (Program Studi, Kode MK, Nama, Dosen, SKS, Semester...)..."
                    style={{
                      ...styles.select,
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      borderColor: searchKeywordView ? '#667eea' : '#e2e8f0',
                      boxShadow: searchKeywordView ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : 'none',
                    }}
                  />
                  {searchKeywordView && (
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                      Menampilkan hasil untuk: <strong>&quot;{searchKeywordView}&quot;</strong>
                    </p>
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
                        {(searchKeywordView ? getFilteredAndGroupedData() : getGroupedFilteredData()).map((group, idx) => {
                      const prodiName = prodi.find(p => p.id === group.f_kurikulum)?.nama_kurikulum || '-';
                      const groupKey = `${group.f_kurikulum}||${group.f_kodemk}||${group.f_namamk}`;
                      const isExpanded = expandedGroups[groupKey];
                      
                      return (
                        <Fragment key={groupKey}>
                          {/* Header row - Program Studi, Kode MK, Mata Kuliah */}
                          <tr style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRow}>
                            <td style={{ ...styles.td, textAlign: 'center', padding: '1rem 0.5rem' }}>
                              <button
                                style={styles.btnExpand}
                                onClick={() => toggleExpandGroup(groupKey)}
                                title={isExpanded ? 'Sembunyikan kelas' : 'Tampilkan kelas'}
                              >
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

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#f0f7ff' }}>
                              <td colSpan="6" style={{ ...styles.td, padding: '1.5rem' }}>
                                <div style={styles.expandedContent}>
                                  <h3 style={styles.expandedTitle}>📚 Detail Kelas ({group.classes.length})</h3>
                                  
                                  <div style={styles.classesTable}>
                                    <div style={styles.classesTableHeader}>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: '0 0 150px' }}>Kelas</div>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: 1 }}>Dosen</div>
                                      <div style={{ ...styles.classesTableCell, fontWeight: '600', flex: '0 0 120px', textAlign: 'center' }}>Aksi</div>
                                    </div>
                                    

                                    {group.classes
                                      .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
                                      .map((kelas) => (
                                        <Fragment key={kelas.id}>
                                          <div style={styles.classesTableRow}>
                                            <div style={{ ...styles.classesTableCell, flex: '0 0 150px' }}>
                                              <span style={styles.badgeKelas}>{kelas.nama_kelas}</span>
                                            </div>
                                            <div style={{ ...styles.classesTableCell, flex: 1 }}>
                                              {kelas.dosen || <span style={{ color: '#a0aec0' }}>-</span>}
                                            </div>
                                            <div style={{ ...styles.classesTableCell, flex: '0 0 120px', textAlign: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                              <button
                                                style={styles.btnEditSmall}
                                                onClick={() => handleEditKelas(kelas)}
                                                title="Edit dosen kelas"
                                              >
                                                ✏️ Edit
                                              </button>
                                              <button
                                                style={styles.btnDeleteSmall}
                                                onClick={() => handleDeleteClassFromView(kelas.id)}
                                                title="Hapus kelas"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>

                                          {/* Preferences Row */}
                                          {(kelas.prefer_lantai || kelas.prefer_hari || kelas.avoid_hari || kelas.prefer_jam_mulai || kelas.prefer_jam_selesai) && (
                                            <div style={{ ...styles.classesTableRow, backgroundColor: '#fafafa', paddingLeft: '2rem', fontSize: '0.85rem' }}>
                                              <div style={{ ...styles.classesTableCell, flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                                                <div>
                                                  <span style={{ color: '#666', fontWeight: '500' }}>Lantai:</span>
                                                  <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_lantai ? '#2d3748' : '#a0aec0' }}>
                                                    {kelas.prefer_lantai || '—'}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span style={{ color: '#666', fontWeight: '500' }}>Hari:</span>
                                                  <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_hari ? '#2d3748' : '#a0aec0' }}>
                                                    {kelas.prefer_hari || '—'}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span style={{ color: '#666', fontWeight: '500' }}>Hindari:</span>
                                                  <p style={{ margin: '0.25rem 0 0 0', color: kelas.avoid_hari ? '#2d3748' : '#a0aec0' }}>
                                                    {kelas.avoid_hari || '—'}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span style={{ color: '#666', fontWeight: '500' }}>Jam Mulai:</span>
                                                  <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_jam_mulai ? '#2d3748' : '#a0aec0' }}>
                                                    {kelas.prefer_jam_mulai || '—'}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span style={{ color: '#666', fontWeight: '500' }}>Jam Selesai:</span>
                                                  <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_jam_selesai ? '#2d3748' : '#a0aec0' }}>
                                                    {kelas.prefer_jam_selesai || '—'}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </Fragment>
                                      ))}
                                  </div>

                                  {/* Add new class form */}
                                  {addingForGroup === groupKey ? (
                                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
                                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#2d3748' }}>
                                        ➕ Tambah Kelas Baru
                                      </h4>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <input
                                          type="text"
                                          value={newClassData.nama_kelas}
                                          onChange={(e) => setNewClassData({ ...newClassData, nama_kelas: e.target.value.toUpperCase() })}
                                          placeholder="Nama kelas (A, B, C...)"
                                          maxLength="2"
                                          style={{ ...styles.select, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                        />
                                        <input
                                          list="dosen-list-add"
                                          value={newClassData.dosen}
                                          onChange={(e) => setNewClassData({ ...newClassData, dosen: e.target.value })}
                                          placeholder="Dosen (opsional)"
                                          style={{ ...styles.select, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                        />
                                        <datalist id="dosen-list-add">
                                          {dosenList.map((d) => (
                                            <option key={d.id} value={d.f_namapegawai} />
                                          ))}
                                        </datalist>
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                          style={{ ...styles.btnSuccess, padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', marginTop: 0, flex: 1 }}
                                          onClick={() => handleAddClassToGroup({
                                            f_kurikulum: group.f_kurikulum,
                                            f_matkul_id: group.classes[0]?.f_matkul_id,
                                          })}
                                        >
                                          💾 Simpan
                                        </button>
                                        <button
                                          style={{ ...styles.btnSecondary, padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', marginTop: 0, flex: 1 }}
                                          onClick={() => {
                                            setAddingForGroup(null);
                                            setNewClassData({ nama_kelas: '', dosen: '' });
                                          }}
                                        >
                                          ❌ Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      style={{ ...styles.btnPrimary, padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', marginTop: '0.75rem' }}
                                      onClick={() => {
                                        setAddingForGroup(groupKey);
                                        setNewClassData({ nama_kelas: '', dosen: '' });
                                      }}
                                    >
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
                  </div>
                )}

            {/* Kondisi: Tidak ada hasil search */}
            {searchKeywordView && getFilteredAndGroupedData().length === 0 && (
              <div style={{ ...styles.emptyState, padding: '2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                <p style={{ marginBottom: '0.5rem' }}>Tidak ada kelas yang cocok</p>
                <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>Tidak menemukan kelas dengan keyword: <strong>&quot;{searchKeywordView}&quot;</strong></p>
                <button
                  style={{ ...styles.btnPrimary, marginTop: '1rem' }}
                  onClick={() => setSearchKeywordView('')}
                >
                  ❌ Hapus Filter
                </button>
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: KELOLA KELAS ==================== */}
        {activeTab === 'add' && (
          <div style={styles.tableWrapper}>
            {/* Master Filter: Tahun Akademik */}
            <div style={styles.masterFilter}>
              <label style={styles.filterLabel}>📅 Tahun Akademik:</label>
              <select
                value={selectedTahunAkademik}
                onChange={(e) => handleTahunAkademikChange(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Pilih Tahun Akademik --</option>
                {tahunAkademikList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tahun_akademik}
                  </option>
                ))}
              </select>
            </div>

            {/* Subfilters: Kode Kurikulum, Semester & Tahun Ajaran */}
            {selectedTahunAkademik && (
              <div style={styles.subFilters}>
                <label style={styles.filterLabel}>📖 Kode Kurikulum:</label>
                <select
                  value={selectedKodeKurikulum}
                  onChange={(e) => handleKodeKurikulumChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Pilih Kode Kurikulum --</option>
                  {[...new Set(kurikulumMasterList.map(k => k.kode_kurikulum))].map((kode) => (
                    <option key={kode} value={kode}>
                      {kode}
                    </option>
                  ))}
                </select>

                <label style={styles.filterLabel}>📚 Semester:</label>
                <div style={styles.semesterToggleGroup}>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'gasal' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('gasal')}
                  >
                    Gasal (1,3,5,7)
                  </button>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'genap' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('genap')}
                  >
                    Genap (2,4,6,8)
                  </button>
                </div>

                <label style={styles.filterLabel}>📆 Tahun Ajaran:</label>
                <select
                  value={selectedTahunAjaran}
                  onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                  style={styles.select}
                  disabled={!selectedKodeKurikulum}
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {selectedKodeKurikulum && selectedKurikulumId && (
                    <option value={selectedTahunAjaran || kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_ajaran || ''}>
                      {kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_ajaran || ''}
                    </option>
                  )}
                </select>
              </div>
            )}

            {selectedTahunAkademik && selectedKodeKurikulum ? (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1.5rem',
                backgroundColor: '#e6fffa',
                borderLeft: '4px solid #38b2ac',
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#000000',
              }}>
                ℹ️ Menampilkan mata kuliah untuk semester <strong>{selectedSemester === 'gasal' ? 'GASAL (1,3,5,7)' : 'GENAP (2,4,6,8)'}</strong>
              </div>
            ) : (
              <div style={{
                padding: '1rem',
                marginBottom: '1.5rem',
                backgroundColor: '#fef3c7',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '4px',
                color: '#92400e',
              }}>
                ⚠️ Silakan pilih filter <strong>Tahun Akademik</strong> dan <strong>Kode Kurikulum</strong> di atas untuk menambahkan kelas
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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

        {/* ==================== MODAL EDIT KELAS ==================== */}
        {showEditModal && editingKelas && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2>✏️ Edit Kelas</h2>
                <button
                  style={styles.btnClose}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingKelas(null);
                    setEditingDosenSearch('');
                    setShowDosenDropdown(false);
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Nama Kelas:</label>
                  <input
                    type="text"
                    value={editingKelas.nama_kelas || ''}
                    disabled
                    style={{ ...styles.select, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                    (Nama kelas tidak dapat diubah)
                  </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Mata Kuliah:</label>
                  <input
                    type="text"
                    value={editingKelas.f_namamk || ''}
                    disabled
                    style={{ ...styles.select, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <label style={styles.label}>Dosen:</label>
                  <input
                    type="text"
                    value={editingKelas.dosen || ''}
                    onChange={(e) => handleEditDosenChange(e.target.value)}
                    onFocus={() => setShowDosenDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDosenDropdown(false), 200)}
                    placeholder="Ketik atau pilih dosen..."
                    style={styles.select}
                  />
                  
                  {/* Dosen Search Dropdown */}
                  {showDosenDropdown && (
                    <div style={styles.dosenDropdownModal}>
                      {dosenList
                        .filter(d =>
                          d.f_namapegawai.toLowerCase().includes(editingDosenSearch.toLowerCase())
                        )
                        .map((d) => (
                          <div
                            key={d.id}
                            onClick={() => handleSelectDosenFromDropdown(d.f_namapegawai)}
                            style={styles.dosenDropdownItem}
                            title={d.f_namapegawai}
                          >
                            <div style={styles.dosenNameModal}>{d.f_namapegawai}</div>
                            {d.f_title_depan && (
                              <div style={styles.dosenTitleModal}>
                                {d.f_title_depan} {d.f_title_belakang || ''}
                              </div>
                            )}
                          </div>
                        ))}
                      {dosenList.filter(d =>
                        d.f_namapegawai.toLowerCase().includes(editingDosenSearch.toLowerCase())
                      ).length === 0 && (
                        <div style={{ ...styles.dosenDropdownItem, textAlign: 'center', color: '#a0aec0' }}>
                          Tidak ada dosen yang cocok
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Display Name:</label>
                  <input
                    type="text"
                    value={editingKelas.display_name || ''}
                    disabled
                    style={{ ...styles.select, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                    (Display name otomatis ter-regenerate)
                  </p>
                </div>

                {/* Preferences Dosen */}
                {editingKelas.dosen && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bee3f8' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: '#2c5aa0' }}>
                      ⚙️ Preferensi Dosen
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                      <div>
                        <span style={{ color: '#666', fontWeight: '500' }}>Lantai:</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: editingKelas.prefer_lantai ? '#2d3748' : '#a0aec0' }}>
                          {editingKelas.prefer_lantai || '—'}
                        </p>
                      </div>
                      <div>
                        <span style={{ color: '#666', fontWeight: '500' }}>Hari Diinginkan:</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: editingKelas.prefer_hari ? '#2d3748' : '#a0aec0' }}>
                          {editingKelas.prefer_hari || '—'}
                        </p>
                      </div>
                      <div>
                        <span style={{ color: '#666', fontWeight: '500' }}>Hari Dihindari:</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: editingKelas.avoid_hari ? '#2d3748' : '#a0aec0' }}>
                          {editingKelas.avoid_hari || '—'}
                        </p>
                      </div>
                      <div>
                        <span style={{ color: '#666', fontWeight: '500' }}>Jam Mulai:</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: editingKelas.prefer_jam_mulai ? '#2d3748' : '#a0aec0' }}>
                          {editingKelas.prefer_jam_mulai || '—'}
                        </p>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: '#666', fontWeight: '500' }}>Jam Selesai:</span>
                        <p style={{ margin: '0.25rem 0 0 0', color: editingKelas.prefer_jam_selesai ? '#2d3748' : '#a0aec0' }}>
                          {editingKelas.prefer_jam_selesai || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingKelas(null);
                    setEditingDosenSearch('');
                    setShowDosenDropdown(false);
                  }}
                >
                  ❌ Batal
                </button>
                <button
                  style={styles.btnSuccess}
                  onClick={handleSaveEdit}
                >
                  💾 Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
    color: '#ffffff',
    margin: 0,
    letterSpacing: '0.02em',
  },
  titleBreadcrumb: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.72)',
    margin: 0,
  },
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
    display: 'flex',
    alignItems: 'center',
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
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
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

  // ── Tab active/inactive states ────────────────────────────
  activeTab: {
    opacity: 1,
    boxShadow: '0 2px 8px rgba(123,31,162,0.3)',
  },
  inactiveTab: {
    opacity: 0.6,
  },

  // ── Form label ────────────────────────────────────────────
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: '700',
    color: '#000000',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  // ── Select input ──────────────────────────────────────────
  select: {
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    width: '100%',
    transition: 'border-color 0.2s',
    color: '#000000',
    outline: 'none',
  },

  // ── Master filter strip ───────────────────────────────────
  masterFilter: {
    marginBottom: '1.25rem',
    padding: '1.25rem 1.5rem',
    backgroundColor: '#f3e5f5',
    borderRadius: '10px',
    borderLeft: '4px solid #7b1fa2',
  },
  filterLabel: {
    display: 'block',
    marginBottom: '0.6rem',
    fontWeight: '700',
    color: '#4a148c',
    fontSize: '0.875rem',
  },

  // ── Sub-filters grid ──────────────────────────────────────
  subFilters: {
    marginBottom: '1.25rem',
    padding: '1.25rem 1.5rem',
    backgroundColor: '#fafbff',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },

  // ── Semester toggle buttons ───────────────────────────────
  semesterToggleGroup: {
    display: 'flex',
    gap: '0.65rem',
    marginBottom: '0.5rem',
  },
  toggleButton: {
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: '8px',
    border: '2px solid #e8eaf6',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white',
  },
  toggleButtonActive: {
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    borderColor: '#7b1fa2',
    boxShadow: '0 4px 12px rgba(123,31,162,0.35)',
  },
  toggleButtonInactive: {
    backgroundColor: 'white',
    color: '#607d8b',
    borderColor: '#e8eaf6',
  },

  // ── Search / select input ─────────────────────────────────
  selectInput: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    color: '#37474f',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  // ── Dropdown panel ────────────────────────────────────────
  dropdown: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1.5px solid #e8eaf6',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    backgroundColor: 'white',
    position: 'relative',
    zIndex: 10,
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f0f2ff',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'background-color 0.15s',
  },
  dropdownItemActive: {
    backgroundColor: '#f3e5f5',
  },
  dropdownTitle: {
    fontWeight: '700',
    color: '#4527a0',
    fontSize: '0.875rem',
  },
  dropdownSubtitle: {
    fontSize: '0.825rem',
    color: '#546e7a',
    marginTop: '0.2rem',
  },
  dropdownDetail: {
    fontSize: '0.75rem',
    color: '#90a4ae',
    marginTop: '0.2rem',
  },
  dropdownEmpty: {
    padding: '1rem',
    border: '1.5px solid #e8eaf6',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    color: '#90a4ae',
    textAlign: 'center',
    fontSize: '0.875rem',
  },

  // ── Selected item info bar ────────────────────────────────
  selectedInfo: {
    backgroundColor: '#f3e5f5',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #7b1fa2',
    color: '#000000',
  },
  infoBadge: {
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    padding: '0.25rem 0.85rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    letterSpacing: '0.02em',
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
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #00897b, #00695c)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,137,123,0.3)',
    transition: 'opacity 0.2s, transform 0.1s',
    marginTop: '1.5rem',
    width: '100%',
  },
  btnSecondary: {
    padding: '0.65rem 1.25rem',
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
  btnExpand: {
    background: '#ede7f6',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '0.25rem 0.5rem',
    color: '#7b1fa2',
    fontWeight: '700',
    transition: 'background 0.2s',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  btnEditSmall: {
    padding: '0.35rem 0.75rem',
    background: 'linear-gradient(135deg, #00897b, #00695c)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  btnDeleteSmall: {
    padding: '0.35rem 0.6rem',
    background: 'linear-gradient(135deg, #e53935, #b71c1c)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
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
    color: '#37474f',
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
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
    marginBottom: '1.5rem',
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
  td: {
    padding: '0.85rem 1rem',
    color: '#37474f',
    fontSize: '0.875rem',
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
  sksBadge: {
    backgroundColor: '#e0f2f1',
    color: '#004d40',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
  },
  semesterBadge: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
  },
  classBadge: {
    marginLeft: '0.65rem',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '0.15rem 0.65rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeKelas: {
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },

  // ── Expanded kelas sub-table ──────────────────────────────
  expandedContent: {
    padding: '0.75rem',
    backgroundColor: '#fafbff',
  },
  expandedTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#4a148c',
  },
  classesTable: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e8eaf6',
    overflow: 'hidden',
  },
  classesTableHeader: {
    display: 'flex',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    borderBottom: '2px solid #4527a0',
    padding: '0.65rem 1rem',
    gap: '1rem',
  },
  classesTableRow: {
    display: 'flex',
    padding: '0.65rem 1rem',
    borderBottom: '1px solid #f0f2ff',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    transition: 'background-color 0.15s',
  },
  classesTableCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#37474f',
  },
  classNumber: {
    backgroundColor: '#ede7f6',
    color: '#4527a0',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.82rem',
  },

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,10,50,0.55)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '14px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'hidden',
    animation: 'slideUp 0.25s ease-out',
  },
  modalHeader: {
    padding: '1.1rem 1.75rem',
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBody: {
    padding: '1.75rem',
    overflowY: 'auto',
  },
  modalFooter: {
    padding: '1.1rem 1.75rem',
    borderTop: '1px solid #f0f2ff',
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    backgroundColor: '#fafbff',
  },
  btnClose: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: 'white',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    lineHeight: 1,
    transition: 'background 0.2s',
  },

  // ── Dosen dropdown inside modal ───────────────────────────
  dosenDropdownModal: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1.5px solid #e8eaf6',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 20,
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
  },
  dosenDropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f0f2ff',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'background-color 0.15s',
  },
  dosenNameModal: {
    fontWeight: '700',
    color: '#37474f',
    fontSize: '0.875rem',
  },
  dosenTitleModal: {
    fontSize: '0.8rem',
    color: '#90a4ae',
    marginTop: '0.2rem',
  },
};

// ── Global styles (hover, focus, animation) ───────────────
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    button:hover { opacity: 0.88; transform: translateY(-1px); }
    input:focus, select:focus {
      outline: none;
      border-color: #7b1fa2 !important;
      box-shadow: 0 0 0 3px rgba(123,31,162,0.12);
    }
    input:hover, select:hover { border-color: #ce93d8; }
    tr:hover { background-color: #f3e5f5 !important; }
  `;
  document.head.appendChild(styleSheet);
}