import app from "./app";
import { getDbPool } from "./database/tunnelSqlDB";
import env from "./util/validateEnv";

const port = env.PORT;

const startServer = async () => {
  let connection;
  try {
    const pool = await getDbPool();
    connection = await pool.getConnection();
    console.log("Connected to MySQL database");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

startServer();
