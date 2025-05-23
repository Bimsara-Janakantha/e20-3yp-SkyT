import app from "./app";
import env from "./util/validateEnv";
import sqlDB from "./database/sqldb";

const port = env.PORT;

const startServer = async () => {
  let connection;

  try {
    // Test the DB connection
    connection = await sqlDB.getConnection();
    console.log("Connected to MySQL database");

    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1); // Exit the app if DB connection fails
  } finally {
    if (connection) connection.release(); // Always release the connection
  }
};

startServer();
