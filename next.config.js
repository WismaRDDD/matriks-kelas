/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
      mysql: 'commonjs mysql',
      mysql2: 'commonjs mysql2',
      oracledb: 'commonjs oracledb',
      sqlite3: 'commonjs sqlite3',
      tedious: 'commonjs tedious',
    });

    return config;
  },
};

export default nextConfig;