export async function up(knex) {
  await knex.schema.createTable('kelas', (table) => {
    table.increments('id').primary();

    table.integer('f_kurikulum')
      .references('id')
      .inTable('kurikulum_master')
      .onDelete('CASCADE');

    table.integer('f_matkul_id')
      .references('id')
      .inTable('kurikulum')
      .onDelete('CASCADE');

    table.string('nama_kelas'); 
    table.string('dosen');
    
    // Kolom baru yang diambil dari tabel kurikulum
    table.integer('f_sks_kurikulum').nullable().comment('SKS mata kuliah dari kurikulum');
    table.integer('f_semester').nullable().comment('Semester mata kuliah dari kurikulum');
    
    // Field untuk menyimpan format [f_namamk] ([f_semester][kelas][kode_kurikulum]-[f_namapegawai])
    // Contoh: Pendidikan Agama (2A-S1SI-Suprima)
    table.string('display_name').nullable().comment('Format: Nama MK (Semester+Kelas+Kode-Dosen)');

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('kelas');
}