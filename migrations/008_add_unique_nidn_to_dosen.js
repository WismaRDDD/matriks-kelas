export function up(knex) {
  return knex.schema.alterTable('dosen', table => {
    table.unique('f_nidn');
  });
}

export function down(knex) {
  return knex.schema.alterTable('dosen', table => {
    table.dropUnique('f_nidn');
  });
}
