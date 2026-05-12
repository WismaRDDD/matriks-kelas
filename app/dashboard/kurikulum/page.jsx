'use client';

import { useEffect, useState } from 'react';

export default function KurikulumPage() {
  const [tahunAkademikList, setTahunAkademikList] = useState([]);
  const [selectedTahunAkademik, setSelectedTahunAkademik] = useState('');
  const [kurikulumList, setKurikulumList] = useState([]);
  const [selectedKodeKurikulum, setSelectedKodeKurikulum] = useState('');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
  const [selectedKurikulum, setSelectedKurikulum] = useState('');
  const [matkul, setMatkul] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [file, setFile] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });
  const [importStats, setImportStats] = useState({ show: false, success: 0, duplicate: 0, failed: 0 });
  const [showForm, setShowForm] = useState(false);
  const [showMatkulForm, setShowMatkulForm] = useState(false);
  const [form, setForm] = useState({
    kode_kurikulum: '',
    nama_kurikulum: '',
    tahun_ajaran: '',
    f_tahun_akademik: '',
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

  // ================= HELPERS =================

  // ✅ Fix 3: Safe JSON parser — checks content-type before parsing
  const safeJson = async (res) => {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server error: invalid response format');
    }
    return res.json();
  };

  // ================= FETCH =================
  const fetchTahunAkademik = async () => {
    try {
      const res = await fetch('/api/tahun-akademik');
      const data = await safeJson(res);
      // ✅ Fix 2: Guard against non-array responses
      setTahunAkademikList(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('error', 'Gagal fetch tahun akademik: ' + error.message);
    }
  };

  const fetchKurikulum = async (tahunId) => {
    if (!tahunId) {
      setKurikulumList([]);
      return;
    }
    try {
      const res = await fetch('/api/kurikulum-master');
      const data = await safeJson(res);
      // ✅ Fix 2: Guard against non-array before calling .filter()
      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter(
        (k) => String(k.f_tahun_akademik) === String(tahunId)
      );
      setKurikulumList(filtered);
    } catch (error) {
      showMessage('error', 'Gagal fetch kurikulum data: ' + error.message);
    }
  };

  const fetchMatkul = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
      const data = await safeJson(res);
      // ✅ Fix 2: Guard against non-array before spread/sort
      setMatkul(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Failed to fetch mata kuliah data: ' + error.message);
      setMatkul([]); // ✅ Fix 2: Ensure matkul is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTahunAkademik();
  }, []);

  useEffect(() => {
    fetchKurikulum(selectedTahunAkademik);
    setSelectedKodeKurikulum('');
    setSelectedTahunAjaran('');
    setSelectedKurikulum('');
  }, [selectedTahunAkademik]);

  useEffect(() => {
    if (selectedKodeKurikulum && selectedTahunAjaran) {
      const kurikulum = kurikulumList.find(
        (k) =>
          k.kode_kurikulum === selectedKodeKurikulum &&
          String(k.tahun_ajaran) === selectedTahunAjaran
      );
      if (kurikulum) setSelectedKurikulum(kurikulum.id);
    } else {
      setSelectedKurikulum('');
    }
  }, [selectedKodeKurikulum, selectedTahunAjaran, kurikulumList]);

  useEffect(() => {
    fetchMatkul(selectedKurikulum);
  }, [selectedKurikulum]);

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };

  const closeImportStats = () => {
    setImportStats({ show: false, success: 0, duplicate: 0, failed: 0 });
  };

  // ================= TAMBAH KURIKULUM =================
  const handleSubmit = async () => {
    if (!form.f_tahun_akademik) {
      showMessage('error', 'Tahun akademik wajib dipilih');
      return;
    }
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

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Gagal');

      showMessage('success', 'Kurikulum berhasil ditambahkan');
      setShowForm(false);
      setForm({ kode_kurikulum: '', nama_kurikulum: '', tahun_ajaran: '', f_tahun_akademik: '' });
      fetchKurikulum(selectedTahunAkademik);
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
        body: JSON.stringify({ ...matkulForm, f_kurikulum: selectedKurikulum }),
      });

      const result = await safeJson(res);
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

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Import gagal');

      // Tampilkan statistik import
      setImportStats({
        show: true,
        success: result.success || 0,
        duplicate: result.duplicate || 0,
        failed: result.failed || 0,
      });
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
      // ✅ Fix 5: Reset selectedIds after successful bulk delete
      setSelectedIds([]);
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus "${nama}"?`)) return;

    try {
      const res = await fetch('/api/kurikulum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Gagal hapus');

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

        {/* Message Display - REMOVED, replaced with modal */}

        {/* Master Filter: Tahun Akademik */}
        <div style={styles.masterFilter}>
          <label style={styles.filterLabel}>📅 Tahun Akademik:</label>
          <select
            value={selectedTahunAkademik}
            onChange={(e) => setSelectedTahunAkademik(e.target.value)}
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

        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button style={styles.btnPrimary} onClick={() => setShowForm(true)}>
              ➕ Tambah Kurikulum
            </button>
          </div>
        </div>
        
        {/* Subfilters: Kode Kurikulum & Tahun Ajaran */}
        {selectedTahunAkademik && (
          <div style={styles.subFilters}>
            <label style={styles.filterLabel}>📖 Kode Kurikulum:</label>
            <select
              value={selectedKodeKurikulum}
              onChange={(e) => setSelectedKodeKurikulum(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Pilih Kode Kurikulum --</option>
              {[...new Set(kurikulumList.map((k) => k.kode_kurikulum))].map((kode) => (
                <option key={kode} value={kode}>
                  {kode}
                </option>
              ))}
            </select>

            <label style={styles.filterLabel}>📆 Tahun Ajaran:</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {[
                ...new Set(
                  kurikulumList
                    .filter((k) => !selectedKodeKurikulum || k.kode_kurikulum === selectedKodeKurikulum)
                    .map((k) => k.tahun_ajaran)
                ),
              ].map((tahun) => (
                <option key={tahun} value={tahun}>
                  {tahun}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button
              style={selectedKurikulum ? styles.btnPrimary : styles.btnDisabled}
              disabled={!selectedKurikulum}
              onClick={() => setShowMatkulForm(true)}
            >
              ➕ Tambah Mata Kuliah
            </button>
          </div>

          <div style={styles.toolbarRight}>
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
            <span style={styles.fileNameSpan}>📎 {file.name}</span>
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
          {/* ✅ Fix 1: Separate styles for the wrapper div and h2 heading */}
          <div style={styles.tableHeaderRow_}>
            <h2 style={styles.tableTitle}>📋 Daftar Mata Kuliah</h2>
            {selectedKurikulum && (
              <span style={styles.badge}>Total: {matkul.length} mata kuliah</span>
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
              <small>Klik &quot;Tambah Mata Kuliah&quot; atau import dari Excel</small>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRowEl}>
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
                    <th style={styles.th} onClick={() => handleSort('f_namakelompok')}>
                      Kelompok {renderSortIcon('f_namakelompok')}
                    </th>
                    <th style={styles.thAksi}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((m, index) => (
                    <tr
                      key={m.id}
                      style={index % 2 === 0 ? styles.tableRowEven : styles.tableRow}
                    >
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

      {/* Modal Pesan Popup */}
      {messagePopup.show && (
        <div style={styles.modal} onClick={closeMessagePopup}>
          <div
            style={{
              ...styles.modalContentSmall,
              ...(messagePopup.type === 'success' ? styles.popupSuccess : styles.popupError),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.popupIcon}>
              {messagePopup.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={styles.popupText}>{messagePopup.text}</p>
            <button style={styles.btnClose} onClick={closeMessagePopup}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Import Stats */}
      {importStats.show && (
        <div style={styles.modal} onClick={closeImportStats}>
          <div
            style={styles.modalContentSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.popupTitle}>📊 Hasil Import</h3>
            <div style={styles.statsContainer}>
              <div style={{ ...styles.statBox, ...styles.statSuccess }}>
                <div style={styles.statNumber}>{importStats.success}</div>
                <div style={styles.statLabel}>Berhasil</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statWarning }}>
                <div style={styles.statNumber}>{importStats.duplicate}</div>
                <div style={styles.statLabel}>Duplikat</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statError }}>
                <div style={styles.statNumber}>{importStats.failed}</div>
                <div style={styles.statLabel}>Gagal</div>
              </div>
            </div>
            <button style={styles.btnClose} onClick={closeImportStats}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah Kurikulum */}
      {showForm && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Tambah Kurikulum</h3>

            <label style={styles.formLabel}>Tahun Akademik *</label>
            <select
              style={styles.input}
              value={form.f_tahun_akademik}
              onChange={(e) => setForm({ ...form, f_tahun_akademik: e.target.value })}
            >
              <option value="">-- Pilih Tahun Akademik --</option>
              {tahunAkademikList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun_akademik}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              placeholder="Kode Kurikulum *"
              value={form.kode_kurikulum}
              onChange={(e) =>
                setForm({ ...form, kode_kurikulum: e.target.value.replace(/\s/g, '') })
              }
            />

            <input
              style={styles.input}
              placeholder="Nama Kurikulum *"
              value={form.nama_kurikulum}
              onChange={(e) => setForm({ ...form, nama_kurikulum: e.target.value })}
            />

            <input
              style={styles.input}
              placeholder="Tahun Ajaran (contoh: 2024)"
              value={form.tahun_ajaran}
              onChange={(e) =>
                setForm({ ...form, tahun_ajaran: e.target.value.replace(/[^0-9]/g, '') })
              }
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
            {/* ✅ Fix 4: Added boxSizing via inputGrid style to prevent overflow */}
            <div style={styles.formGrid}>
              <input
                style={styles.inputGrid}
                placeholder="Kode MK *"
                value={matkulForm.f_kodemk}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_kodemk: e.target.value })}
              />
              <input
                style={styles.inputGrid}
                placeholder="Nama MK *"
                value={matkulForm.f_namamk}
                onChange={(e) => setMatkulForm({ ...matkulForm, f_namamk: e.target.value })}
              />
              <input
                style={styles.inputGrid}
                placeholder="SKS *"
                value={matkulForm.f_sks_kurikulum}
                onChange={(e) =>
                  setMatkulForm({ ...matkulForm, f_sks_kurikulum: e.target.value })
                }
              />
              <input
                style={styles.inputGrid}
                placeholder="Semester *"
                value={matkulForm.f_semester}
                onChange={(e) =>
                  setMatkulForm({ ...matkulForm, f_semester: e.target.value })
                }
              />
              <input
                style={styles.inputGrid}
                placeholder="Nama Kelompok"
                value={matkulForm.f_namakelompok}
                onChange={(e) =>
                  setMatkulForm({ ...matkulForm, f_namakelompok: e.target.value })
                }
              />
              <input
                style={styles.inputGrid}
                placeholder="Singkatan"
                value={matkulForm.f_singkatan}
                onChange={(e) =>
                  setMatkulForm({ ...matkulForm, f_singkatan: e.target.value })
                }
              />
              <select
                style={styles.inputGrid}
                value={matkulForm.f_statusaktifmk}
                onChange={(e) =>
                  setMatkulForm({ ...matkulForm, f_statusaktifmk: e.target.value })
                }
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

  // ── Gradient title bar (LeADS top-nav style) ──────────────
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

  // ── Filter strips ─────────────────────────────────────────
  masterFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
    padding: '0.9rem 1.25rem',
    backgroundColor: '#f3e5f5',
    borderRadius: '10px',
    border: '2px solid #ce93d8',
  },

  subFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
    padding: '0.9rem 1.25rem',
    backgroundColor: '#f8f9fe',
    borderRadius: '10px',
    border: '1px solid #e8eaf6',
  },

  filterLabel: {
    fontWeight: '700',
    color: '#4a148c',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
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
  toolbarRight: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // ── Select input ──────────────────────────────────────────
  select: {
    padding: '0.55rem 1rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: '#37474f',
    fontWeight: '500',
    outline: 'none',
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
  btnDisabled: {
    padding: '0.55rem 1.2rem',
    background: '#eceff1',
    color: '#b0bec5',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'not-allowed',
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
  fileNameSpan: {
    color: '#283593',
    fontWeight: '600',
  },

  // ── Table section ─────────────────────────────────────────
  tableWrapper: {
    marginTop: '1.5rem',
  },
  tableHeaderRow_: {
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
  tableHeaderRowEl: {
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
    color: '#ffffff',
    textAlign: 'center',
  },
  thAksi: {
    padding: '0.9rem 1rem',
    width: '80px',
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
  badgeSks: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeSemester: {
    backgroundColor: '#e0f2f1',
    color: '#004d40',
    padding: '0.2rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },

  // ── Row action button ─────────────────────────────────────
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

  // ── Small modal ───────────────────────────────────────────
  modalContent: {
    background: 'white',
    borderRadius: '14px',
    minWidth: '420px',
    maxWidth: '90vw',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },

  // ── Large modal ───────────────────────────────────────────
  modalContentLarge: {
    background: 'white',
    borderRadius: '14px',
    minWidth: '620px',
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
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    border: '1.5px solid #e8eaf6',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    color: '#37474f',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputGrid: {
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
  formLabel: {
    display: 'block',
    fontWeight: '700',
    marginBottom: '0.4rem',
    color: '#4a5568',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },

  // ── Popup Modal ────────────────────────────────────────────
  modalContentSmall: {
    background: 'white',
    borderRadius: '14px',
    minWidth: '350px',
    maxWidth: '85vw',
    padding: '2rem',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    textAlign: 'center',
  },
  popupIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  popupText: {
    color: '#000000',
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  popupTitle: {
    color: '#000000',
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    margin: 0,
  },
  popupSuccess: {
    backgroundColor: '#e8f5e9',
    borderLeft: '4px solid #4caf50',
  },
  popupError: {
    backgroundColor: '#fce4ec',
    borderLeft: '4px solid #e53935',
  },
  btnClose: {
    padding: '0.6rem 1.5rem',
    background: 'linear-gradient(135deg, #7b1fa2, #4527a0)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(123,31,162,0.3)',
    transition: 'opacity 0.2s',
  },

  // ── Import Stats ───────────────────────────────────────────
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statBox: {
    padding: '1.5rem 1rem',
    borderRadius: '10px',
    textAlign: 'center',
  },
  statSuccess: {
    backgroundColor: '#e8f5e9',
  },
  statWarning: {
    backgroundColor: '#fff3e0',
  },
  statError: {
    backgroundColor: '#fce4ec',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#000000',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
};