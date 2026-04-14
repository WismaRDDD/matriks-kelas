'use client';

import { useEffect, useState } from 'react';

<<<<<<< HEAD
export default function Page() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);

  const fetchData = async () => {
    const res = await fetch('/api/ruangan');
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async () => {
=======
export default function RuanganPage() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
  });

const [selectedIds, setSelectedIds] = useState([]);


useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/ruangan');
    const json = await res.json();

    json.sort((a, b) => new Date(a.f_tanggallahir) - new Date(b.f_tanggallahir));

    setData(json);
    setSelectedIds([]); // reset selection
  };

  fetchData();
}, []);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async () => {
    if (!/^\d+$/.test(form.f_nidn)) {
    return alert('NIDN harus angka');
  }

  if (!/^\d+$/.test(form.f_nip)) {
    return alert('NIP harus angka');
  }

  // VALIDASI TANGGAL
  const date = new Date(form.f_tanggallahir);

  if (isNaN(date.getTime())) {
    return alert('Tanggal tidak valid');
  }

  const month = date.getMonth() + 1;
  if (month > 12) {
    return alert('Bulan tidak boleh lebih dari 12');
  }

  // VALIDASI JK
  if (!['L', 'P'].includes(form.f_jeniskelamin)) {
    return alert('Jenis kelamin harus L atau P');
  }

    // REQUEST
  const method = form.id ? 'PUT' : 'POST';
  const url = form.id ? `/api/ruangan/${form.id}` : '/api/ruangan';

  await fetch('/api/ruangan', {
    method,
    headers: {
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify(form),
  });

  setShowForm(false);
    setForm({
    f_nidn: '',
    f_nip: '',
    f_title_depan: '',
    f_namapegawai: '',
    f_title_belakang: '',
    f_tempatlahir: '',
    f_tanggallahir: '',
    f_jeniskelamin: '',
    f_progdi_id: '',
  });

  setEditingId(null);
  fetchData();
};

  const handleImport = async () => {
    if (!file) return alert('Pilih file dulu');

>>>>>>> recovery
    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/ruangan/import', {
      method: 'POST',
      body: formData,
    });

<<<<<<< HEAD
    fetchData();
  };

  return (
    <div>
      <h1>Ruangan</h1>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Import</button>

      <table border="1">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Kapasitas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td>{d.f_koderuang}</td>
              <td>{d.f_namaruang}</td>
              <td>{d.f_kapasitas_kuliah}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
=======
    alert('Import selesai');
    setFile(null);
    fetchData();
  };

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

const handleDeleteSelected = async () => {
  if (selectedIds.length === 0) return alert('Pilih data dulu');

  if (!confirm('Hapus data terpilih?')) return;

  await fetch('/api/ruangan/delete', {
    method: 'POST',
    body: JSON.stringify({ ids: selectedIds }),
  });

  setSelectedIds([]);
  fetchData();
};

const handleDeleteOne = async (id) => {
  if (!confirm('Hapus data ini?')) return;

  await fetch(`/api/ruangan/${id}`, {
    method: 'DELETE',
  });

  fetchData();
};

  function formatDateDisplay(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-US');
  }

  // SORT FUNCTION (3 MODE)
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  // EDIT DATA
  const [editingId, setEditingId] = useState(null);

  const handleEdit = (data) => {
    setForm({
      ...data,
      f_tanggallahir: data.f_tanggallahir
        ? new Date(data.f_tanggallahir).toISOString().split('T')[0]
        : '',
    });

  setEditingId(data.id);
  setShowForm(true);
  };

  // SORT DATA
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
    if (sortConfig.key !== key) return '⇅';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '⇅';
  };
  
  // RESET DATA
  const handleAddNew = () => {
    setForm({
      f_nidn: '',
      f_nip: '',
      f_title_depan: '',
      f_namapegawai: '',
      f_title_belakang: '',
      f_tempatlahir: '',
      f_tanggallahir: '',
      f_jeniskelamin: '',
      f_progdi_id: '',
    });

    setShowForm(true);
  };

  // TABEL UTAMA
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>
        Dashboard Ruangan
      </h1>

      {/* TOOLBAR */}
      <div style={{ margin: '20px 0', display: 'flex', gap: 10 }}>
        <button style={btnPrimary} onClick={handleAddNew}>
          + Tambah Data
        </button>

        <button
          style={btnSuccess}
          onClick={() => document.getElementById('fileInput').click()}
        >
          Import Excel
        </button>

        <button style={btnDanger} onClick={handleDeleteSelected}>
          Hapus Terpilih
        </button>

        <input
          id="fileInput"
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files[0])}
        />

        {file && (
          <>
            <span>✔ {file.name}</span>
            <button style={btnPrimary} onClick={handleImport}>
              Upload
            </button>
          </>
        )}
      </div>

      {showForm && (
        <div style={modal}>
          <div style={modalContent}>
            <h3>  
              {form.id ? 'Edit Ruangan' : 'Tambah Ruangan'}
            </h3>

            <input name="f_ruang_id" value={form.f_ruang_id} onChange={handleChange} />
            <input name="f_koderuang" value={form.f_koderuang} onChange={handleChange} />
            <input name="f_namaruang" value={form.f_namaruang} onChange={handleChange} />
            <input name="f_kapasitas_kuliah" value={form.f_kapasitas_kuliah} onChange={handleChange} />
            <input name="f_alamatruang" value={form.f_alamatruang} onChange={handleChange} />

            <div style={{ marginTop: 10 }}>
              <button style={btnPrimary} onClick={handleSubmit}>
                Simpan
              </button>
              <button style={btnDanger} onClick={() => setShowForm(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div style={{ overflowX: 'auto', border: '1px solid #ccc', borderRadius: 8 }}>
        <table style={{ minWidth: '1400px', width: '100%', borderCollapse: 'collapse' }}>
<tr>
  {/* CHECKBOX */}
  <th style={th}>
    <input
      type="checkbox"
      onChange={handleSelectAll}
      checked={
        selectedIds.length === sortedData.length &&
        sortedData.length > 0
      }
    />
  </th>

  <th style={th} onClick={() => handleSort('f_ruang_id')}>
    ID Ruang {renderSortIcon('f_ruang_id')}
  </th>
  <th style={th} onClick={() => handleSort('f_koderuang')}>
    Kode Ruang {renderSortIcon('f_koderuang')}
  </th>
  <th style={th} onClick={() => handleSort('f_namaruang')}>
    Nama Ruang {renderSortIcon('f_namaruang')}
  </th>
  <th style={th} onClick={() => handleSort('f_kapasitas_kuliah')}>
    Kapasitas Kuliah {renderSortIcon('f_kapasitas_kuliah')}
  </th>
  <th style={th} onClick={() => handleSort('f_alamatruang')}>
    Alamat Ruang {renderSortIcon('f_alamatruang')}
  </th>

  {/* AKSI */}
  <th style={th}>Aksi</th>
</tr>

<tbody>
  {sortedData.length > 0 ? (
    sortedData.map((d) => (
      <tr 
      key={d.id}
        style={{
          background: editingId === d.id ? '#fff3cd' : 'transparent',
        }}
      >
        {/* CHECKBOX */}
        <td style={td}>
          <input
            type="checkbox"
            checked={selectedIds.includes(d.id)}
            onChange={() => handleSelect(d.id)}
          />
        </td>

        <td style={td}>{d.f_ruang_id}</td>
        <td style={td}>{d.f_koderuang}</td>
        <td style={td}>{d.f_namaruang}</td>
        <td style={td}>{d.f_kapasitas_kuliah}</td>
        <td style={td}>{d.f_alamatruang}</td>

        {/* AKSI */}
        <td style={td}>
          <button
            style={btnPrimary}
            onClick={() => handleEdit(d)}
          >
            Edit
          </button>

          <button
            style={btnDanger}
            onClick={() => handleDeleteOne(d.id)}
          >
            Hapus
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="11" style={{ textAlign: 'center', padding: 20 }}>
        Loading...
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>
    </div>
  );
}

/* STYLE */
const th = { padding: '10px', borderBottom: '2px solid #ddd', cursor: 'pointer' };
const td = { padding: '8px', borderBottom: '1px solid #eee' };

const btnPrimary = {
  padding: '8px 12px',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const btnSuccess = {
  padding: '8px 12px',
  background: '#28a745',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
};

const btnDanger = {
  padding: '6px 10px',
  background: '#dc3545',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const modal = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const modalContent = {
  background: '#fff',
  padding: 20,
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 300,
};
>>>>>>> recovery
