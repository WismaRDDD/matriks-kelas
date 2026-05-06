import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: Fetch all jadwal presets
export async function GET() {
  try {
    const presets = await knex('presets')
      .select('*')
      .orderBy('id', 'asc');

    return NextResponse.json(presets);
  } catch (err) {
    console.error('❌ Get presets error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST: Create new preset
export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.nama_preset) {
      return NextResponse.json(
        { error: 'nama_preset diperlukan' },
        { status: 400 }
      );
    }

    const [id] = await knex('presets').insert({
      nama_preset: body.nama_preset,
      jam_mulai: body.jam_mulai,
      durasi_slot: body.durasi_slot,
      jam_istirahat_mulai_senin_kamis: body.jam_istirahat_mulai_senin_kamis,
      jam_istirahat_selesai_senin_kamis: body.jam_istirahat_selesai_senin_kamis,
      jam_istirahat_mulai_jumat: body.jam_istirahat_mulai_jumat,
      jam_istirahat_selesai_jumat: body.jam_istirahat_selesai_jumat,
      jam_selesai: body.jam_selesai,
      is_default: body.is_default || false,
    });

    return NextResponse.json(
      { success: true, id, message: 'Preset berhasil dibuat' },
      { status: 201 }
    );
  } catch (err) {
    console.error('❌ Create preset error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
