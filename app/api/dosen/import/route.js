import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import knex from '@/lib/knex';

// 🔥 convert excel number → date
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// 🔥 format ke MM/DD/YYYY
function formatDate(value) {
  if (!value) return null;

  // 🔥 kalau sudah string seperti 6/15/1993
  if (typeof value === 'string') {
    return value;
  }

  // 🔥 kalau number (excel serial)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  }

  return null;
}
<<<<<<< HEAD
=======

>>>>>>> recovery
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    const buffer = Buffer.from(await file.arrayBuffer());

<<<<<<< HEAD
    // 🔥 penting: cellDates true
  const workbook = XLSX.read(buffer, {
    cellDates: false, // penting!
=======
  const workbook = XLSX.read(buffer, {
    cellDates: false, 
>>>>>>> recovery
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
            f_nidn: row.f_nidn,
            f_nip: row.f_nip,
            f_title_depan: row.f_title_depan,
            f_namapegawai: row.f_namapegawai,
            f_title_belakang: row.f_title_belakang,
            f_tempatlahir: row.f_tempatlahir,
<<<<<<< HEAD

            // 🔥 FIX DATE DI SINI
            f_tanggallahir: formatDate(row.f_tanggallahir),

=======
            f_tanggallahir: formatDate(row.f_tanggallahir),
>>>>>>> recovery
            f_jeniskelamin: row.f_jeniskelamin,
            f_progdi_id: row.f_progdi_id,
          };

<<<<<<< HEAD
          // 🔥 INSERT KE DATABASE
=======
>>>>>>> recovery
          await trx('dosen').insert(data);

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
}