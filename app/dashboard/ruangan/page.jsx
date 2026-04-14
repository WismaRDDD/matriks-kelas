'use client';

import { useEffect, useState } from 'react';

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
    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/ruangan/import', {
      method: 'POST',
      body: formData,
    });

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