// 018_create_jadwal_copy.js
export async function up(knex) {
  // Cek apakah tabel sudah ada, jika ada drop dulu
  if (await knex.schema.hasTable('jadwal_copy')) {
    await knex.schema.dropTable('jadwal_copy');
  }

  await knex.schema.createTable('jadwal_copy', (table) => {
    table.increments('id').primary();

    // Foreign key ke tabel jadwal
    table.integer('jadwal_id')
      .unsigned()
      .references('id')
      .inTable('jadwal')
      .onDelete('CASCADE')
      .comment('Referensi ke tabel jadwal');

    // Foreign keys (denormalisasi dari jadwal)
    table.integer('kelas_id')
      .unsigned()
      .references('id')
      .inTable('kelas')
      .onDelete('CASCADE')
      .comment('Referensi ke tabel kelas (copy dari jadwal)');

    table.integer('ruangan_id')
      .unsigned()
      .references('id')
      .inTable('ruangan')
      .onDelete('RESTRICT')
      .comment('Referensi ke tabel ruangan (copy dari jadwal)');

    table.integer('dosen_id')
      .unsigned()
      .references('id')
      .inTable('dosen')
      .onDelete('RESTRICT')
      .nullable()
      .comment('Referensi ke tabel dosen (copy dari jadwal)');

    table.integer('kurikulum_id')
      .unsigned()
      .references('id')
      .inTable('kurikulum')
      .onDelete('RESTRICT')
      .nullable()
      .comment('Referensi ke tabel kurikulum (copy dari jadwal)');

    // Informasi jadwal (copy dari jadwal original)
    table.string('hari').notNullable().comment('Hari: Senin, Selasa, dll');
    table.time('jam_mulai').notNullable();
    table.time('jam_selesai').notNullable();

    // Denormalisasi data (copy dari jadwal original)
    table.string('display_name').nullable().comment('Format: Nama MK (Semester+Kelas+Kode-Dosen)');
    table.integer('sks').nullable().comment('Jumlah SKS (dari f_sks_kurikulum)');
    table.string('nama_mk').nullable().comment('Nama mata kuliah');
    table.string('kode_mk').nullable().comment('Kode mata kuliah');
    table.string('nama_dosen').nullable().comment('Nama dosen');
    table.string('nama_ruangan').nullable().comment('Nama ruangan');
    table.integer('semester').nullable().comment('Semester mata kuliah');
    table.integer('lantai').nullable().comment('Lantai ruangan');

    // Informasi pembelajaran dosen
    table.string('learning_type').nullable().comment('Tipe pembelajaran: daring atau luring');
    table.dateTime('learning_time').nullable().comment('Waktu dosen memilih tipe pembelajaran');

    table.timestamps(true, true);

    // Index untuk performance query
    table.index(['jadwal_id']);
    table.index(['dosen_id']);
    table.index(['kelas_id']);
    table.index(['ruangan_id']);
    table.index(['hari', 'ruangan_id']);
    table.index(['dosen_id', 'hari']);
    table.unique(['jadwal_id'], 'unique_jadwal_copy_per_jadwal');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('jadwal_copy');
}
