import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET semua kelas dengan join data lengkap dari table lain + preferences
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kurikulumId = searchParams.get('kurikulum_id');

    let query = knex('kelas')
      .leftJoin('kurikulum', 'kelas.f_matkul_id', 'kurikulum.id')
      .leftJoin('kurikulum_master', 'kelas.f_kurikulum', 'kurikulum_master.id')
      .leftJoin('dosen', 'kelas.dosen', 'dosen.f_namapegawai')
      .select(
        'kelas.id',
        'kelas.f_kurikulum',
        'kelas.f_matkul_id',
        'kelas.nama_kelas',
        'kelas.dosen',
        'kelas.display_name',
        'kelas.f_sks_kurikulum',
        'kelas.f_semester',
        'kelas.prefer_lantai',
        'kelas.prefer_hari',
        'kelas.avoid_hari',
        'kelas.prefer_jam_mulai',
        'kelas.prefer_jam_selesai',
        'kelas.created_at',
        'kelas.updated_at',
        'kurikulum.f_namamk',
        'kurikulum.f_kodemk',
        'kurikulum.f_semester as matkul_semester',
        'kurikulum.f_sks_kurikulum as matkul_sks',
        'kurikulum_master.kode_kurikulum',
        'kurikulum_master.nama_kurikulum',
        'kurikulum_master.tahun_kurikulum',
        'kurikulum_master.f_tahun_ajaran',
        'dosen.f_namapegawai',
        'dosen.f_title_depan',
        'dosen.f_title_belakang'
      );

    // Filter berdasarkan kurikulum_id jika diberikan
    if (kurikulumId) {
      query = query.where('kelas.f_kurikulum', parseInt(kurikulumId));
    }

    const data = await query.orderBy('kelas.id', 'desc');

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST simpan kelas baru dengan data dari table lain + preferences
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      f_kurikulum,
      f_matkul_id,
      kelasList,
    } = body;

    if (!f_kurikulum || !f_matkul_id || !kelasList || !kelasList.length) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Diperlukan: f_kurikulum, f_matkul_id, kelasList' },
        { status: 400 }
      );
    }

    // Fetch data dari kurikulum untuk SKS, semester, dan nama mata kuliah
    const matkulData = await knex('kurikulum')
      .where({ id: f_matkul_id })
      .first();

    if (!matkulData) {
      return NextResponse.json(
        { error: `Mata kuliah dengan ID ${f_matkul_id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Fetch data dari kurikulum_master untuk kode kurikulum
    const kurikulumData = await knex('kurikulum_master')
      .where({ id: f_kurikulum })
      .first();

    if (!kurikulumData) {
      return NextResponse.json(
        { error: `Kurikulum dengan ID ${f_kurikulum} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Map kelas list dan buat display_name untuk setiap kelas
    const insertData = await Promise.all(kelasList.map(async (k) => {
      if (!k.nama) {
        throw new Error('Setiap kelas harus memiliki nama (field "nama")');
      }

      // Format display_name: [f_namamk] ([f_semester][nama_kelas][kode_kurikulum]-[dosen])
      // Contoh: Pendidikan Agama (2A-S1SI-Suprima)
      const dosenNama = k.dosen && k.dosen.trim() ? k.dosen : 'TBD';
      const displayName = `${matkulData.f_namamk} (${matkulData.f_semester}${k.nama}-${kurikulumData.kode_kurikulum}-${dosenNama})`;

      // Fetch preferences dari dosen jika ada
      let preferences = {
        prefer_lantai: null,
        prefer_hari: null,
        avoid_hari: null,
        prefer_jam_mulai: null,
        prefer_jam_selesai: null,
      };

      if (k.dosen && k.dosen.trim()) {
        const dosenData = await knex('dosen')
          .where({ f_namapegawai: k.dosen.trim() })
          .select('prefer_lantai', 'prefer_hari', 'avoid_hari', 'prefer_jam_mulai', 'prefer_jam_selesai')
          .first();

        if (dosenData) {
          preferences = {
            prefer_lantai: dosenData.prefer_lantai,
            prefer_hari: dosenData.prefer_hari,
            avoid_hari: dosenData.avoid_hari,
            prefer_jam_mulai: dosenData.prefer_jam_mulai,
            prefer_jam_selesai: dosenData.prefer_jam_selesai,
          };
        }
      }

      return {
        f_kurikulum,
        f_matkul_id,
        nama_kelas: k.nama,
        dosen: k.dosen && k.dosen.trim() ? k.dosen : null,
        display_name: displayName,
        f_sks_kurikulum: matkulData.f_sks_kurikulum,
        f_semester: matkulData.f_semester,
        ...preferences,
      };
    }));

    // Insert semua kelas
    await knex('kelas').insert(insertData);

    return NextResponse.json({ 
      success: true, 
      message: `${kelasList.length} kelas berhasil dibuat`,
      insertedCount: kelasList.length 
    });

  } catch (err) {
    console.error('❌ POST /api/kelas error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE kelas
export async function DELETE(req) {
  try {
    const { id } = await req.json();

    await knex('kelas').where({ id }).del();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT update dosen dan regenerate display_name + preferences
export async function PUT(req) {
  try {
    const { id, dosen } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID kelas diperlukan' },
        { status: 400 }
      );
    }

    // Fetch data kelas untuk validasi dan data yang diperlukan
    const kelasData = await knex('kelas')
      .where({ id })
      .first();

    if (!kelasData) {
      return NextResponse.json(
        { error: `Kelas dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Fetch data dari kurikulum
    const matkulData = await knex('kurikulum')
      .where({ id: kelasData.f_matkul_id })
      .first();

    if (!matkulData) {
      return NextResponse.json(
        { error: 'Data mata kuliah tidak ditemukan' },
        { status: 404 }
      );
    }

    // Fetch data dari kurikulum_master
    const kurikulumData = await knex('kurikulum_master')
      .where({ id: kelasData.f_kurikulum })
      .first();

    if (!kurikulumData) {
      return NextResponse.json(
        { error: 'Data kurikulum tidak ditemukan' },
        { status: 404 }
      );
    }

    // Regenerate display_name dengan dosen yang baru
    const dosenNama = dosen && dosen.trim() ? dosen : 'TBD';
    const displayName = `${matkulData.f_namamk} (${matkulData.f_semester}${kelasData.nama_kelas}-${kurikulumData.kode_kurikulum}-${dosenNama})`;

    // Fetch preferences dari dosen yang baru
    let preferences = {
      prefer_lantai: null,
      prefer_hari: null,
      avoid_hari: null,
      prefer_jam_mulai: null,
      prefer_jam_selesai: null,
    };

    if (dosen && dosen.trim()) {
      const dosenData = await knex('dosen')
        .where({ f_namapegawai: dosen.trim() })
        .select('prefer_lantai', 'prefer_hari', 'avoid_hari', 'prefer_jam_mulai', 'prefer_jam_selesai')
        .first();

      if (dosenData) {
        preferences = {
          prefer_lantai: dosenData.prefer_lantai,
          prefer_hari: dosenData.prefer_hari,
          avoid_hari: dosenData.avoid_hari,
          prefer_jam_mulai: dosenData.prefer_jam_mulai,
          prefer_jam_selesai: dosenData.prefer_jam_selesai,
        };
      }
    }

    await knex('kelas')
      .where({ id })
      .update({ 
        dosen: dosen && dosen.trim() ? dosen : null,
        display_name: displayName,
        ...preferences,
        updated_at: knex.fn.now()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Kelas berhasil diupdate'
    });
  } catch (err) {
    console.error('❌ PUT /api/kelas error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PATCH regenerate display_name dan preferences untuk satu atau semua kelas
export async function PATCH(req) {
  try {
    const { id, regenerateAll } = await req.json();

    let kelasIds = [];

    if (regenerateAll) {
      // Regenerate untuk semua kelas
      const allKelas = await knex('kelas').select('id');
      kelasIds = allKelas.map(k => k.id);
    } else if (id) {
      // Regenerate untuk satu kelas
      kelasIds = [id];
    } else {
      return NextResponse.json(
        { error: 'Diperlukan "id" atau "regenerateAll": true' },
        { status: 400 }
      );
    }

    let successCount = 0;

    // Regenerate display_name dan preferences untuk setiap kelas
    for (const kelasId of kelasIds) {
      try {
        const kelasData = await knex('kelas')
          .where({ id: kelasId })
          .first();

        if (!kelasData) continue;

        // Fetch data dari kurikulum
        const matkulData = await knex('kurikulum')
          .where({ id: kelasData.f_matkul_id })
          .first();

        if (!matkulData) continue;

        // Fetch data dari kurikulum_master
        const kurikulumData = await knex('kurikulum_master')
          .where({ id: kelasData.f_kurikulum })
          .first();

        if (!kurikulumData) continue;

        // Generate display_name baru
        const dosenNama = kelasData.dosen && kelasData.dosen.trim() ? kelasData.dosen : 'TBD';
        const displayName = `${matkulData.f_namamk} (${matkulData.f_semester}${kelasData.nama_kelas}-${kurikulumData.kode_kurikulum}-${dosenNama})`;

        // Fetch preferences dari dosen yang sekarang
        let preferences = {
          prefer_lantai: null,
          prefer_hari: null,
          avoid_hari: null,
          prefer_jam_mulai: null,
          prefer_jam_selesai: null,
        };

        if (kelasData.dosen && kelasData.dosen.trim()) {
          const dosenData = await knex('dosen')
            .where({ f_namapegawai: kelasData.dosen.trim() })
            .select('prefer_lantai', 'prefer_hari', 'avoid_hari', 'prefer_jam_mulai', 'prefer_jam_selesai')
            .first();

          if (dosenData) {
            preferences = {
              prefer_lantai: dosenData.prefer_lantai,
              prefer_hari: dosenData.prefer_hari,
              avoid_hari: dosenData.avoid_hari,
              prefer_jam_mulai: dosenData.prefer_jam_mulai,
              prefer_jam_selesai: dosenData.prefer_jam_selesai,
            };
          }
        }

        // Update display_name dan preferences
        await knex('kelas')
          .where({ id: kelasId })
          .update({ 
            display_name: displayName,
            ...preferences,
            updated_at: knex.fn.now()
          });

        successCount++;
      } catch (innerErr) {
        console.error(`❌ Error regenerating display_name dan preferences untuk kelas ${kelasId}:`, innerErr);
        // Lanjut ke kelas berikutnya jika ada error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${successCount} kelas display_name dan preferences berhasil di-regenerate`,
      regeneratedCount: successCount
    });

  } catch (err) {
    console.error('❌ PATCH /api/kelas error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}