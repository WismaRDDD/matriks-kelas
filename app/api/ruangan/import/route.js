import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import knex from '@/lib/knex';

export async function POST(req) {
<<<<<<< HEAD
  const formData = await req.formData();
  const file = formData.get('file');

  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  await knex.transaction(async (trx) => {
    for (const row of rows) {
      await trx('ruangan').insert({
        f_ruang_id: row.f_ruang_id,
        f_koderuang: row.f_koderuang,
        f_namaruang: row.f_namaruang,
        f_kapasitas_kuliah: row.f_kapasitas_kuliah,
        f_alamatruang: row.f_alamatruang,
      });
    }
  });

  return NextResponse.json({ success: true });
=======
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = XLSX.read(buffer, {
    cellDates: false, // penting!
    raw: true,
  });    
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
  });
    let success = 0;
    let failed = 0;

    await knex.transaction(async (trx) => {
      for (const row of rows) {
        try {
          const data = {
            f_ruang_id: row.f_ruang_id,
            f_koderuang: row.f_koderuang,
            f_namaruang: row.f_namaruang,
            f_kapasitas_kuliah: row.f_kapasitas_kuliah,
            f_alamatruang: row.f_alamatruang,
          };
          await trx('ruangan').insert(data);

          success++;
        } catch (err) {
          console.error(err);
          failed++;
        }
      }
    });

    return NextResponse.json({ success, failed });

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
>>>>>>> recovery
}