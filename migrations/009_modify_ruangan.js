export function up(knex) {
  return knex.schema.alterTable('ruangan', table => {
    table.integer('lantai').nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable('ruangan', table => {
    table.dropColumn('lantai');
  });
}
