import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import knex from '@/lib/knex';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const kurikulumId = formData.get('kurikulum_id');

    if (!file || !kurikulumId) {
      return NextResponse.json({ error: 'File atau kurikulum kosong' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const data = rows.map((row) => ({
      f_kurikulum: parseInt(kurikulumId),
      f_kodemk: row.f_kodemk,
      f_namamk: row.f_namamk,
      f_sks_kurikulum: row.f_sks_kurikulum,
      f_semester: row.f_semester,
      f_namakelompok: row.f_namakelompok,
      f_singkatan: row.f_singkatan,
      f_statusaktifmk: row.f_statusaktifmk,
    }));

    await knex('kurikulum').insert(data);

    return NextResponse.json({ success: true, total: data.length });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}