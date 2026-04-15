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

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('kelas');
}