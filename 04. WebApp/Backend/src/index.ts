import app from "./app";
import { closeDbPool, getDbPool } from "./database/tunnelSqlDB";
import env from "./util/validateEnv";

const port = env.PORT;

const startServer = async () => {
  try {
    const pool = await getDbPool();
    await pool.getConnection();
    console.log("Connected to MySQL database");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });

    // Register cleanup
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    await gracefulShutdown();
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log("Shutting down server...");
  try {
    await closeDbPool(); // Closes DB + tunnel
    console.log("Resources released.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

startServer();
