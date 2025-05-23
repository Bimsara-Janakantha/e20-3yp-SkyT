import createHttpError from "http-errors";
import argon2 from "argon2";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { NotificationModel } from "./notifications";
import { getDbPool } from "../database/tunnelSqlDB";

// Define the User interface for type checking
export interface NewUser {
  email: string;
  password: string;
  role: string;
  fName: string;
  lName?: string;
  estates: number[];
}

export interface UpdateUser extends Omit<NewUser, "estates"> {
  userId: number;
  profilePic: string | null;
}

// Notification messages
const WELCOME_MESSAGE =
  "We're thrilled to have you join our community! Explore all the features we offer and get the most out of your experience. If you have any questions or feedback, feel free to reach out to our support team anytime. Enjoy your journey with us!";

// Create a User class that will handle database interactions
class UserModel {
  // Create a new user
  static async create(user: NewUser) {
    const pool = await getDbPool();
    const connection = await pool.getConnection();

    try {
      const { email, password, role, fName, lName, estates } = user;

      // Start transaction
      await connection.beginTransaction();

      // Check for existing email
      const [existing] = await connection.query<RowDataPacket[]>(
        "SELECT userId FROM USERS WHERE email = ?",
        [email]
      );
      if (existing.length > 0) {
        throw createHttpError(400, "User with this email already exists");
      }

      // Hash the password
      const hashedPassword = await argon2.hash(password);

      // Insert new user into the database
      const [result] = await pool.query<ResultSetHeader>(
        "INSERT INTO USERS (email, password, role, fName, lName) VALUES (?, ?, ?, ?, ?)",
        [email, hashedPassword, role || "Assistant", fName, lName || ""]
      );

      const userId = result.insertId;

      // Insert estates
      const values = estates.map((estateId) => [userId, estateId]);
      const [rows] = await connection.query<ResultSetHeader>(
        `INSERT INTO EMPLOYEES (employeeId, estateId) VALUES ?`,
        [values]
      );

      if (rows.affectedRows === 0) {
        throw createHttpError(500, "No employees added");
      }

      // Create the welcome message
      await NotificationModel.createOnce({
        userId,
        title: "Welcome to sky T platform",
        message: WELCOME_MESSAGE,
        type: "System",
      });

      await connection.commit();
      return userId;
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get a user by email
  static async findByEmail(email: string) {
    const pool = await getDbPool();
    const result = await pool.query<RowDataPacket[]>(
      "SELECT * FROM USERS WHERE email = ?",
      [email]
    );
    return result[0][0]; // Return the user
  }

  // Get a user by userId
  static async findById(userId: number | string) {
    const pool = await getDbPool();
    const result = await pool.query<RowDataPacket[]>(
      "SELECT * FROM USERS WHERE userId = ?",
      [userId]
    );
    return result[0][0]; // Return the user
  }

  // Get all system users for the developer
  static async getUsers() {
    const pool = await getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.userId AS id,
        u.fName,
        u.lName,
        u.email,
        u.profilePic AS img,
        u.role,
        JSON_ARRAYAGG(e.estateId) AS estates
      FROM USERS u
      JOIN EMPLOYEES e ON e.employeeId = u.userId
      GROUP BY u.userId`
    );

    //console.log("Users in the system managed by developers: ", rows);

    return rows;
  }

  // Delete an assistant
  static async deleteAssistant(userId: number, managerId: number) {
    const pool = await getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Check if the manager has access to delete this assistant and get email
      const authQuery = `
        SELECT U.email 
        FROM USERS U
        JOIN EMPLOYEES E ON E.employeeId = U.userId
        JOIN ESTATES ES ON ES.estateId = E.estateId
        WHERE ES.managerId = ? AND U.userId = ? AND U.role = 'Assistant'
      `;
      const [rows] = await conn.query<RowDataPacket[]>(authQuery, [
        managerId,
        userId,
      ]);

      if (rows.length === 0) {
        throw createHttpError(404, "User not found");
      }

      const userEmail = rows[0].email;

      // Delete assistant from USERS table
      const [result] = await conn.query<ResultSetHeader>(
        "DELETE FROM USERS WHERE userId = ? AND role = 'Assistant'",
        [userId]
      );

      if (result.affectedRows === 0) {
        throw createHttpError(500, "User deletion failed");
      }

      await conn.commit();
      return userEmail;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Update user details
  static async update(user: UpdateUser) {
    const pool = await getDbPool();
    // Extract the props
    const { userId, profilePic, password, ...updates } = user;

    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // Dynamically build the SET clause based on the fields provided in 'updates'
      let fields = Object.keys(updates)
        .map((field) => `${field} = ?`)
        .join(", ");

      // Values to be updated
      const values = Object.values(updates);

      // If a profilePic is provided, add it to the SET clause
      if (profilePic !== null) {
        fields += `, profilePic = ?`;
        values.push(profilePic);
      }

      // If password updated
      if (password !== null) {
        const hashedPassword = await argon2.hash(password);

        fields += `, password = ?`;
        values.push(hashedPassword);
      }

      // User Query
      const query = `UPDATE USERS SET ${fields} WHERE userId = ?`;

      // Execute the query
      const [rows] = await pool.query<ResultSetHeader>(query, [
        ...values,
        userId,
      ]);

      if (rows.affectedRows === 0) {
        throw createHttpError(404, "User not found");
      }

      // Auth Query
      const deleteTokenQuery = "DELETE FROM AUTH WHERE userId = ?";
      await connection.query<ResultSetHeader>(deleteTokenQuery, [userId]);

      // Notify to user
      await NotificationModel.createOnce({
        userId,
        title: "Profile Updated",
        message: "Your profile information has been successfully updated.",
        type: "System",
      });

      await connection.commit();
      return { message: "User updated successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default UserModel;
