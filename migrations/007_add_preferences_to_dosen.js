export function up(knex) {
  return knex.schema.alterTable('dosen', table => {
    table.string('prefer_lantai').nullable().comment('Lantai yang diinginkan (misal: 1, 2, 3)');
    table.string('prefer_hari').nullable().comment('Hari yang diinginkan (misal: Senin,Selasa,Rabu)');
    table.string('avoid_hari').nullable().comment('Hari yang dihindari (misal: Jumat)');
    table.time('prefer_jam_mulai').nullable().comment('Jam mulai yang diinginkan');
    table.time('prefer_jam_selesai').nullable().comment('Jam selesai yang diinginkan');
  });
}

export function down(knex) {
  return knex.schema.alterTable('dosen', table => {
    table.dropColumn('prefer_lantai');
    table.dropColumn('prefer_hari');
    table.dropColumn('avoid_hari');
    table.dropColumn('prefer_jam_mulai');
    table.dropColumn('prefer_jam_selesai');
  });
}
