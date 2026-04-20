export function up(knex) {
  return knex.schema.alterTable('kelas', table => {
    table.string('prefer_lantai').nullable().comment('Lantai yang diinginkan dosen');
    table.string('prefer_hari').nullable().comment('Hari yang diinginkan dosen (misal: Senin,Selasa,Rabu)');
    table.string('avoid_hari').nullable().comment('Hari yang dihindari dosen (misal: Jumat)');
    table.time('prefer_jam_mulai').nullable().comment('Jam mulai yang diinginkan dosen');
    table.time('prefer_jam_selesai').nullable().comment('Jam selesai yang diinginkan dosen');
  });
}

export function down(knex) {
  return knex.schema.alterTable('kelas', table => {
    table.dropColumn('prefer_lantai');
    table.dropColumn('prefer_hari');
    table.dropColumn('avoid_hari');
    table.dropColumn('prefer_jam_mulai');
    table.dropColumn('prefer_jam_selesai');
  });
}
