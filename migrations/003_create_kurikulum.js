export function up(knex) {
  return knex.schema.createTable('kurikulum', table => {
    table.increments('id');
    table.string('f_kodemk', 20);
    table.string('f_namamk', 100);
    table.integer('f_sks_kurikulum');
    table.integer('f_semester');
    table.string('f_namakelompok', 50);
    table.string('f_singkatan', 20);
    table.string('f_statusaktifmk', 20);
    table.integer('f_kurikulum')
      .unsigned()
      .references('id')
      .inTable('kurikulum_master')
      .onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('kurikulum');
}