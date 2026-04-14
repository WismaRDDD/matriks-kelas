'use client';

import { useEffect, useState } from 'react';

export default function KurikulumPage() {
  const [kurikulumList, setKurikulumList] = useState([]);
  const [selectedKurikulum, setSelectedKurikulum] = useState('');
  const [matkul, setMatkul] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [file, setFile] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  const [showForm, setShowForm] = useState(false);
  const [showMatkulForm, setShowMatkulForm] = useState(false);

  const [form, setForm] = useState({
    nama_kurikulum: '',
    tahun_ajaran: '',
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
    const res = await fetch('/api/kurikulum-master');
    setKurikulumList(await res.json());
  };

  const fetchMatkul = async (id) => {
    if (!id) return;
    const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
    setMatkul(await res.json());
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchKurikulum();
  }, []);

  useEffect(() => {
    fetchMatkul(selectedKurikulum);
  }, [selectedKurikulum]);

  // ================= TAMBAH KURIKULUM =================
  const handleSubmit = async () => {
    if (!form.nama_kurikulum) return alert('Nama wajib');
    if (!/^\d{4}$/.test(form.tahun_ajaran)) {
      return alert('Tahun harus 4 digit');
    }

    const res = await fetch('/api/kurikulum-master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const result = await res.json();
    if (!res.ok) return alert(result.error || 'Gagal');

    setShowForm(false);
    setForm({ nama_kurikulum: '', tahun_ajaran: '' });
    fetchKurikulum();
  };

  // ================= TAMBAH MATKUL =================
  const handleSubmitMatkul = async () => {
    if (!selectedKurikulum) return alert('Pilih kurikulum');

    const res = await fetch('/api/kurikulum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...matkulForm,
        f_kurikulum: selectedKurikulum, // ✅ sesuai DB kamu
      }),
    });

    const result = await res.json();
    if (!res.ok) return alert(result.error || 'Gagal tambah');

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
  };

  // ================= IMPORT =================
  const handleImport = async () => {
    if (!file || !selectedKurikulum) {
      return alert('Pilih kurikulum & file');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kurikulum_id', selectedKurikulum);

    await fetch('/api/kurikulum/import', {
      method: 'POST',
      body: formData,
    });

    alert('Import berhasil');
    setFile(null);
    fetchMatkul(selectedKurikulum);
  };

  // ================= DELETE =================
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return alert('Pilih data');
    if (!confirm('Hapus data?')) return;

    await fetch('/api/kurikulum/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });

    fetchMatkul(selectedKurikulum);
  };

  const handleDeleteOne = async (id) => {
    if (!confirm('Hapus data?')) return;

    await fetch(`/api/kurikulum/${id}`, {
      method: 'DELETE',
    });

    fetchMatkul(selectedKurikulum);
  };

  // ================= CHECKBOX =================
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
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
    if (sortConfig.key !== key) return '⇅';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '⇅';
  };

  // ================= UI =================
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>
        Dashboard Kurikulum
      </h1>

      {/* TOOLBAR */}
      <div style={{ margin: '20px 0', display: 'flex', gap: 10 }}>
        <button style={btnPrimary} onClick={() => setShowForm(true)}>
          + Kurikulum
        </button>

        <select
          value={selectedKurikulum}
          onChange={(e) => setSelectedKurikulum(e.target.value)}
        >
          <option value="">Pilih Kurikulum</option>
          {kurikulumList.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama_kurikulum} - {k.tahun_ajaran}
            </option>
          ))}
        </select>

        <button
          style={btnPrimary}
          disabled={!selectedKurikulum}
          onClick={() => setShowMatkulForm(true)}
        >
          + Matkul
        </button>

        <button
          style={btnSuccess}
          onClick={() => document.getElementById('fileInput').click()}
        >
          Import
        </button>

        <button style={btnDanger} onClick={handleDeleteSelected}>
          Hapus
        </button>

        <input
          id="fileInput"
          type="file"
          hidden
          onChange={(e) => setFile(e.target.files[0])}
        />

        {file && (
          <>
            <span>{file.name}</span>
            <button style={btnPrimary} onClick={handleImport}>
              Upload
            </button>
          </>
        )}
      </div>

      {/* TABLE */}
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>
              <input type="checkbox" onChange={handleSelectAll} />
            </th>
            {['f_kodemk', 'f_namamk', 'f_sks_kurikulum', 'f_semester'].map((col) => (
              <th key={col} onClick={() => handleSort(col)}>
                {col} {renderSortIcon(col)}
              </th>
            ))}
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody>
          {sortedData.map((m) => (
            <tr key={m.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => handleSelect(m.id)}
                />
              </td>
              <td>{m.f_kodemk}</td>
              <td>{m.f_namamk}</td>
              <td>{m.f_sks_kurikulum}</td>
              <td>{m.f_semester}</td>
              <td>
                <button onClick={() => handleDeleteOne(m.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* STYLE */
const btnPrimary = { padding: 8, background: '#007bff', color: '#fff' };
const btnSuccess = { padding: 8, background: '#28a745', color: '#fff' };
const btnDanger = { padding: 8, background: '#dc3545', color: '#fff' };