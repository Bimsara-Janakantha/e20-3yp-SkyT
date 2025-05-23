import mysql, { PoolOptions } from "mysql2/promise";
import env from "../util/validateEnv";
import { startSshTunnel, stopSshTunnel } from "../util/sshTunnel";

let pool: mysql.Pool;

const access: PoolOptions = {
  host: env.DB_HOST, // This is '127.0.0.1'
  port: env.DB_PORT, // This is the local tunnel port (e.g. 3309)
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export async function getDbPool(): Promise<mysql.Pool> {
  if (!pool) {
    if (env.DB_USE_SSH_TUNNEL) {
      await startSshTunnel();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for tunnel
    }

    pool = mysql.createPool(access);
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) await pool.end();
  await stopSshTunnel();
}
