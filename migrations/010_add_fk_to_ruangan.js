export function up(knex) {
  return knex.schema.alterTable('ruangan', table => {
    // Drop the old string column and create as integer with FK
    table.dropColumn('f_ruang_id');
  }).then(() => {
    return knex.schema.alterTable('ruangan', table => {
      table.integer('f_ruang_id').nullable();
      table.foreign('f_ruang_id')
        .references('id')
        .inTable('ruangan')
        .onDelete('SET NULL');
    });
  });
}

export function down(knex) {
  return knex.schema.alterTable('ruangan', table => {
    table.dropForeign('f_ruang_id');
    table.dropColumn('f_ruang_id');
  }).then(() => {
    return knex.schema.alterTable('ruangan', table => {
      table.string('f_ruang_id').nullable();
    });
  });
}
