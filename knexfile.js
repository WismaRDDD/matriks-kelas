export default {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: 'postgres',
      password: 'password1',
      database: 'jadwal_db',
    },
    migrations: {
      directory: './migrations',
    },
  },
};