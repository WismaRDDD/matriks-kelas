export function up(knex) {
  return knex.schema.createTable('dosen', table => {
    table.increments('id');
    table.string('f_nidn');
    table.string('f_nip');
    table.string('f_title_depan');
    table.string('f_namapegawai');
    table.string('f_title_belakang');
    table.string('f_tempatlahir');
    table.date('f_tanggallahir');
    table.string('f_jeniskelamin');
    table.string('f_progdi_id');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('dosen');
}