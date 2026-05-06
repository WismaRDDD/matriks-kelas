import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET semua preset
export async function GET(req) {
  try {
    const presets = await knex('presets')
      .orderBy('created_at', 'desc');
    
    return NextResponse.json(presets || []);
  } catch (err) {
    console.error('GET presets error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST simpan preset baru
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.nama_preset) {
      return NextResponse.json(
        { error: 'Nama preset diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah preset dengan nama yang sama sudah ada
    const existingPreset = await knex('presets')
      .where({ nama_preset: body.nama_preset })
      .first();

    if (existingPreset) {
      return NextResponse.json(
        { error: 'Preset dengan nama ini sudah ada' },
        { status: 409 }
      );
    }

    const insertData = {
      nama_preset: body.nama_preset,
      jam_mulai: body.jam_mulai,
      durasi_slot: body.durasiSlot,
      jam_istirahat_mulai_senin_kamis: body.jamIstirahatMulaiSeninKamis,
      jam_istirahat_selesai_senin_kamis: body.jamIstirahatSelesaiSeninKamis,
      jam_istirahat_mulai_jumat: body.jamIstirahatMulaiJumat,
      jam_istirahat_selesai_jumat: body.jamIstirahatSelesaiJumat,
      jam_selesai: body.jamSelesai,
      is_default: body.is_default || false,
    };

    const result = await knex('presets').insert(insertData);
    const id = result[0];

    return NextResponse.json({ 
      success: true, 
      id: id,
      message: 'Preset berhasil disimpan'
    });
    
  } catch (err) {
    console.error('POST preset error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// PUT update preset
export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID preset diperlukan' },
        { status: 400 }
      );
    }

    const existingPreset = await knex('presets')
      .where({ id: body.id })
      .first();

    if (!existingPreset) {
      return NextResponse.json(
        { error: 'Preset tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData = {
      jam_mulai: body.jam_mulai,
      durasi_slot: body.durasiSlot,
      jam_istirahat_mulai_senin_kamis: body.jamIstirahatMulaiSeninKamis,
      jam_istirahat_selesai_senin_kamis: body.jamIstirahatSelesaiSeninKamis,
      jam_istirahat_mulai_jumat: body.jamIstirahatMulaiJumat,
      jam_istirahat_selesai_jumat: body.jamIstirahatSelesaiJumat,
      jam_selesai: body.jamSelesai,
      updated_at: knex.fn.now(),
    };

    await knex('presets')
      .where({ id: body.id })
      .update(updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Preset berhasil diupdate'
    });
    
  } catch (err) {
    console.error('PUT preset error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE preset
export async function DELETE(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID preset diperlukan' },
        { status: 400 }
      );
    }

    const presetToDelete = await knex('presets')
      .where({ id: body.id })
      .first();

    if (!presetToDelete) {
      return NextResponse.json(
        { error: 'Preset tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cegah hapus preset default
    if (presetToDelete.is_default) {
      return NextResponse.json(
        { error: 'Tidak bisa menghapus preset default' },
        { status: 400 }
      );
    }

    await knex('presets')
      .where({ id: body.id })
      .del();

    return NextResponse.json({ 
      success: true,
      message: `Preset "${presetToDelete.nama_preset}" berhasil dihapus`
    });
    
  } catch (err) {
    console.error('DELETE preset error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
