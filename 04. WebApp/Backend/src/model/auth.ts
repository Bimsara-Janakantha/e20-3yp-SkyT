import { ResultSetHeader, RowDataPacket } from "mysql2";
import createHttpError from "http-errors";
import argon2 from "argon2";
import { getDbPool } from "../database/tunnelSqlDB";

class AuthModel {
  // Store reset token in the database (optimistic concurrency control)
  static async storeResetToken(
    userId: number,
    token: string,
    expiration: number
  ) {
    // Create Pool
    const pool = await getDbPool();

    // Begin a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); // Start the transaction

      // Check if the user already has a token (if so, handle it accordingly)
      const [existingToken] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM AUTH WHERE userId = ?",
        [userId]
      );

      if (existingToken.length > 0) {
        // Optionally, handle existing token (either update or invalidate it)
        const updateQuery =
          "UPDATE AUTH SET resetToken = ?, resetTokenExpiration = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?";
        await connection.query(updateQuery, [token, expiration, userId]);
      } else {
        // If no token exists, insert a new record for the reset token
        const insertQuery =
          "INSERT INTO AUTH (userId, resetToken, resetTokenExpiration) VALUES (?, ?, ?)";
        await connection.query(insertQuery, [userId, token, expiration]);
      }

      // Commit the transaction
      await connection.commit();
    } catch (error) {
      console.error("DB Error: ", error);
      await connection.rollback();
      throw createHttpError(500, "Failed to store reset token.");
    } finally {
      connection.release();
    }
  }

  // Find user by reset token
  static async findByUser(userId: string | number) {
    const pool = await getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM AUTH WHERE userId = ?",
      [userId]
    );
    return rows[0]; // Return the record if the token matches
  }

  // Update the password in the database
  static async updatePassword(userId: number, password: string) {
    const pool = await getDbPool();
    // Begin a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Hash the password
      const hashedPassword = await argon2.hash(password);

      // Update the user's password in the USERS table
      const updateQuery = "UPDATE USERS SET password = ? WHERE userId = ?";
      const [result] = await connection.query<ResultSetHeader>(updateQuery, [
        hashedPassword,
        userId,
      ]);

      if (result.affectedRows === 0) {
        throw createHttpError(400, "User not found or password not updated.");
      }

      // Optionally, invalidate the reset token after password is updated
      const deleteTokenQuery = "DELETE FROM AUTH WHERE userId = ?";
      await connection.query(deleteTokenQuery, [userId]);

      // Commit the transaction
      await connection.commit();
    } catch (error) {
      console.error("DB ERROR: ", error);
      await connection.rollback();
      throw createHttpError(500, "Failed to update password.");
    } finally {
      connection.release();
    }
  }
}

export default AuthModel;
