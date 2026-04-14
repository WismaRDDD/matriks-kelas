'use client';

import { useEffect, useState } from 'react';

export default function DosenPage() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  const [form, setForm] = useState({
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

const fetchData = async () => {
  const res = await fetch('/api/dosen');
  const json = await res.json();

  json.sort((a, b) => new Date(a.f_tanggallahir) - new Date(b.f_tanggallahir));

  setData(json);
  setSelectedIds([]); // reset selection
};

  useEffect(() => {
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
  const url = form.id ? `/api/dosen/${form.id}` : '/api/dosen';

  await fetch('/api/dosen', {
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

    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/dosen/import', {
      method: 'POST',
      body: formData,
    });

    alert('Import selesai');
    setFile(null);
    fetchData();
  };

const [selectedIds, setSelectedIds] = useState([]);

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

  await fetch('/api/dosen/delete', {
    method: 'POST',
    body: JSON.stringify({ ids: selectedIds }),
  });

  setSelectedIds([]);
  fetchData();
};

const handleDeleteOne = async (id) => {
  if (!confirm('Hapus data ini?')) return;

  await fetch(`/api/dosen/${id}`, {
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

      // khusus tanggal
      if (sortConfig.key === 'f_tanggallahir') {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

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
        Dashboard Dosen
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
              {form.id ? 'Edit Dosen' : 'Tambah Dosen'}
            </h3>

            <input name="f_nidn" value={form.f_nidn} onChange={handleChange} disabled={!!form.id}/>
            <input name="f_nip" value={form.f_nip} onChange={handleChange} />
            <input name="f_title_depan" value={form.f_title_depan} onChange={handleChange} />
            <input name="f_namapegawai" value={form.f_namapegawai} onChange={handleChange} />
            <input name="f_title_belakang" value={form.f_title_belakang} onChange={handleChange} />
            <input name="f_tempatlahir" value={form.f_tempatlahir} onChange={handleChange} />
            <input 
              type="date" 
              name="f_tanggallahir" 
              value={form.f_tanggallahir} 
              onChange={handleChange} />
            <div>
              <label>Jenis Kelamin:</label>
              <div>
                <label>
                  <input
                    type="radio"
                    name="f_jeniskelamin"
                    value="L"
                    checked={form.f_jeniskelamin === 'L'}
                    onChange={handleChange}
                  />
                  L
                </label>

                <label style={{ marginLeft: 10 }}>
                  <input
                    type="radio"
                    name="f_jeniskelamin"
                    value="P"
                    checked={form.f_jeniskelamin === 'P'}
                    onChange={handleChange}
                  />
                  P
                </label>
              </div>
            </div>
            <input name="f_progdi_id" value={form.f_progdi_id} onChange={handleChange} />

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

  <th style={th} onClick={() => handleSort('f_nidn')}>
    NIDN {renderSortIcon('f_nidn')}
  </th>
  <th style={th} onClick={() => handleSort('f_nip')}>
    NIP {renderSortIcon('f_nip')}
  </th>
  <th style={th} onClick={() => handleSort('f_title_depan')}>
    Gelar Depan {renderSortIcon('f_title_depan')}
  </th>
  <th style={th} onClick={() => handleSort('f_namapegawai')}>
    Nama {renderSortIcon('f_namapegawai')}
  </th>
  <th style={th} onClick={() => handleSort('f_title_belakang')}>
    Gelar Belakang {renderSortIcon('f_title_belakang')}
  </th>
  <th style={th} onClick={() => handleSort('f_tempatlahir')}>
    Tempat Lahir {renderSortIcon('f_tempatlahir')}
  </th>
  <th style={th} onClick={() => handleSort('f_tanggallahir')}>
    Tanggal Lahir {renderSortIcon('f_tanggallahir')}
  </th>
  <th style={th} onClick={() => handleSort('f_jeniskelamin')}>
    JK {renderSortIcon('f_jeniskelamin')}
  </th>
  <th style={th} onClick={() => handleSort('f_progdi_id')}>
    Prodi {renderSortIcon('f_progdi_id')}
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

        <td style={td}>{d.f_nidn}</td>
        <td style={td}>{d.f_nip}</td>
        <td style={td}>{d.f_title_depan}</td>
        <td style={td}>{d.f_namapegawai}</td>
        <td style={td}>{d.f_title_belakang}</td>
        <td style={td}>{d.f_tempatlahir}</td>
        <td style={td}>{formatDateDisplay(d.f_tanggallahir)}</td>
        <td style={td}>{d.f_jeniskelamin}</td>
        <td style={td}>{d.f_progdi_id}</td>

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