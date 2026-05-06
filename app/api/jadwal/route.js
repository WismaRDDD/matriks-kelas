import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET semua jadwal dengan join ke tabel kelas, kurikulum, dosen, dan ruangan
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kurikulumId = searchParams.get('kurikulum_id');

    let query = knex('jadwal')
      .leftJoin('kelas', 'jadwal.kelas_id', 'kelas.id')
      .leftJoin('kurikulum', 'jadwal.kurikulum_id', 'kurikulum.id')
      .leftJoin('dosen', 'jadwal.dosen_id', 'dosen.id')
      .leftJoin('ruangan', 'jadwal.ruangan_id', 'ruangan.id')
      .select(
        'jadwal.id',
        'jadwal.kelas_id',
        'jadwal.dosen_id',
        'jadwal.kurikulum_id',
        'jadwal.hari',
        'jadwal.ruangan_id',
        'jadwal.jam_mulai',
        'jadwal.jam_selesai',
        'jadwal.display_name',
        'jadwal.nama_mk',
        'jadwal.kode_mk',
        'jadwal.nama_dosen',
        'jadwal.nama_ruangan',
        'jadwal.semester',
        'jadwal.sks',
        'jadwal.lantai',
        'jadwal.created_at',
        'jadwal.updated_at'
      );

    // Filter berdasarkan kurikulum_id jika diberikan
    if (kurikulumId) {
      query = query.where('jadwal.kurikulum_id', parseInt(kurikulumId));
    }

    const data = await query
      .orderBy('jadwal.hari', 'asc')
      .orderBy('jadwal.jam_mulai', 'asc');
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('GET jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST simpan jadwal baru
export async function POST(req) {
  try {
    const body = await req.json();
    
    console.log('📝 Received POST data:', body);
    
    // Validasi required fields
    const requiredFields = ['kelas_id', 'hari', 'ruangan_id', 'jam_mulai', 'jam_selesai'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Field ${field} diperlukan` },
          { status: 400 }
        );
      }
    }
    
    // Ambil data kelas lengkap
    const kelasData = await knex('kelas')
      .where('kelas.id', body.kelas_id)
      .first();
    
    if (!kelasData) {
      return NextResponse.json(
        { error: 'Data kelas tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Ambil data kurikulum jika ada
    const kurikulumData = kelasData.f_matkul_id 
      ? await knex('kurikulum')
          .where('kurikulum.id', kelasData.f_matkul_id)
          .first()
      : null;
    
    // Ambil data dosen jika dosen_id disediakan
    const dosenData = body.dosen_id
      ? await knex('dosen')
          .where('dosen.id', body.dosen_id)
          .first()
      : null;
    
    // Ambil data ruangan lengkap termasuk lantai
    const ruanganData = await knex('ruangan')
      .where('ruangan.id', body.ruangan_id)
      .first();
    
    if (!ruanganData) {
      return NextResponse.json(
        { error: 'Data ruangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah sudah ada jadwal yang bentrok
    const existingJadwal = await knex('jadwal')
      .where({
        hari: body.hari,
        ruangan_id: parseInt(body.ruangan_id)
      })
      .select('*');
    
    // Cek bentrok waktu
    let isConflict = false;
    let conflictingJadwal = null;
    
    const newStart = timeToMinutes(body.jam_mulai);
    const newEnd = timeToMinutes(body.jam_selesai);
    
    for (const jadwal of existingJadwal) {
      const existingStart = timeToMinutes(jadwal.jam_mulai);
      const existingEnd = timeToMinutes(jadwal.jam_selesai);
      
      if (newStart < existingEnd && newEnd > existingStart) {
        isConflict = true;
        conflictingJadwal = jadwal;
        break;
      }
    }
    
    if (isConflict) {
      console.log('❌ Conflict detected with:', conflictingJadwal);
      return NextResponse.json(
        { error: `Jadwal bentrok: ${conflictingJadwal.display_name} sudah dijadwalkan pada jam tersebut` },
        { status: 409 }
      );
    }
    
    // Siapkan data untuk insert dengan semua field dari tabel jadwal
    const insertData = {
      kelas_id: body.kelas_id,
      dosen_id: body.dosen_id || null,
      kurikulum_id: body.kurikulum_id || kelasData.f_matkul_id || null,
      hari: body.hari,
      ruangan_id: parseInt(body.ruangan_id),
      jam_mulai: body.jam_mulai,
      jam_selesai: body.jam_selesai,
      // Data denormalisasi
      display_name: kelasData.display_name || kelasData.nama_kelas,
      nama_mk: kurikulumData?.f_namamk || kelasData.nama_kelas || '',
      kode_mk: kurikulumData?.f_kodemk || '',
      nama_dosen: dosenData?.f_nama_dosen || '',
      nama_ruangan: ruanganData?.f_namaruang || '',
      semester: kurikulumData?.f_semester || kelasData.f_semester || null,
      sks: kurikulumData?.f_sks_kurikulum || kelasData.f_sks_kurikulum || null,
      lantai: ruanganData?.f_lantai || null,
    };
    
    console.log('💾 Inserting data with display_name:', insertData.display_name);
    
    const result = await knex('jadwal').insert(insertData);
    const id = result[0];
    
    return NextResponse.json({ 
      success: true, 
      id: id,
      data: insertData,
      message: 'Jadwal berhasil disimpan'
    });
    
  } catch (err) {
    console.error('❌ POST jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT update jadwal
export async function PUT(req) {
  try {
    const body = await req.json();

    console.log('📝 Received PUT data:', body);

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID jadwal diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah jadwal exists
    const existingJadwal = await knex('jadwal')
      .where({ id: body.id })
      .first();
    
    if (!existingJadwal) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Siapkan data update
    const updateData = {
      updated_at: knex.fn.now()
    };
    
    // Update field yang diizinkan
    if (body.hari) updateData.hari = body.hari;
    if (body.ruangan_id) updateData.ruangan_id = parseInt(body.ruangan_id);
    if (body.jam_mulai) updateData.jam_mulai = body.jam_mulai;
    if (body.jam_selesai) updateData.jam_selesai = body.jam_selesai;
    if (body.dosen_id !== undefined) updateData.dosen_id = body.dosen_id;
    
    // Jika ada perubahan kelas_id, ambil data kelas terbaru
    if (body.kelas_id && body.kelas_id !== existingJadwal.kelas_id) {
      const kelasData = await knex('kelas')
        .where('kelas.id', body.kelas_id)
        .first();
      
      if (!kelasData) {
        return NextResponse.json(
          { error: 'Data kelas tidak ditemukan' },
          { status: 404 }
        );
      }
      
      const kurikulumData = kelasData.f_matkul_id 
        ? await knex('kurikulum')
            .where('kurikulum.id', kelasData.f_matkul_id)
            .first()
        : null;
      
      // Update semua data terkait kelas
      updateData.kelas_id = body.kelas_id;
      updateData.kurikulum_id = kelasData.f_matkul_id || null;
      updateData.display_name = kelasData.display_name || kelasData.nama_kelas;
      updateData.nama_mk = kurikulumData?.f_namamk || kelasData.nama_kelas || '';
      updateData.kode_mk = kurikulumData?.f_kodemk || '';
      updateData.semester = kurikulumData?.f_semester || kelasData.f_semester || null;
      updateData.sks = kurikulumData?.f_sks_kurikulum || kelasData.f_sks_kurikulum || null;
    }
    
    // Jika ada update ruangan, ambil data ruangan terbaru
    if (body.ruangan_id && body.ruangan_id !== existingJadwal.ruangan_id) {
      const ruanganData = await knex('ruangan')
        .where('ruangan.id', body.ruangan_id)
        .first();
      
      if (!ruanganData) {
        return NextResponse.json(
          { error: 'Data ruangan tidak ditemukan' },
          { status: 404 }
        );
      }
      
      updateData.nama_ruangan = ruanganData.f_namaruang || '';
      updateData.lantai = ruanganData.f_lantai || null;
    }
    
    // Jika ada update dosen_id, ambil data dosen terbaru
    if (body.dosen_id && body.dosen_id !== existingJadwal.dosen_id) {
      const dosenData = await knex('dosen')
        .where('dosen.id', body.dosen_id)
        .first();
      
      if (!dosenData) {
        return NextResponse.json(
          { error: 'Data dosen tidak ditemukan' },
          { status: 404 }
        );
      }
      
      updateData.nama_dosen = dosenData.f_nama_dosen || '';
    }
    
    // Cek bentrok jadwal (kecuali dengan dirinya sendiri)
    const hari = updateData.hari || existingJadwal.hari;
    const ruanganId = updateData.ruangan_id || existingJadwal.ruangan_id;
    const jamMulai = updateData.jam_mulai || existingJadwal.jam_mulai;
    const jamSelesai = updateData.jam_selesai || existingJadwal.jam_selesai;
    
    const existingJadwalList = await knex('jadwal')
      .where('id', '!=', body.id)
      .where({
        hari: hari,
        ruangan_id: ruanganId
      })
      .select('*');
    
    // Cek bentrok waktu
    let isConflict = false;
    let conflictingJadwal = null;
    
    const newStart = timeToMinutes(jamMulai);
    const newEnd = timeToMinutes(jamSelesai);
    
    for (const jadwal of existingJadwalList) {
      const existingStart = timeToMinutes(jadwal.jam_mulai);
      const existingEnd = timeToMinutes(jadwal.jam_selesai);
      
      if (newStart < existingEnd && newEnd > existingStart) {
        isConflict = true;
        conflictingJadwal = jadwal;
        break;
      }
    }
    
    if (isConflict) {
      return NextResponse.json(
        { error: `Jadwal bentrok: ${conflictingJadwal.display_name} sudah dijadwalkan pada jam tersebut` },
        { status: 409 }
      );
    }
    
    console.log('🔄 Updating data:', updateData);
    
    await knex('jadwal')
      .where({ id: body.id })
      .update(updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Jadwal berhasil diupdate',
      updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at')
    });
    
  } catch (err) {
    console.error('❌ PUT jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE jadwal
export async function DELETE(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID jadwal diperlukan' },
        { status: 400 }
      );
    }

    // Optional: Ambil data jadwal sebelum dihapus untuk logging
    const jadwalToDelete = await knex('jadwal')
      .where({ id: body.id })
      .first();
    
    if (!jadwalToDelete) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting jadwal: ${jadwalToDelete.display_name} (ID: ${body.id})`);

    const deleted = await knex('jadwal')
      .where({ id: body.id })
      .del();

    if (deleted === 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Jadwal "${jadwalToDelete.display_name}" berhasil dihapus`,
      deleted_id: body.id
    });
    
  } catch (err) {
    console.error('❌ DELETE jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// Helper function: konversi waktu string ke menit
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return (hours * 60) + minutes;
}