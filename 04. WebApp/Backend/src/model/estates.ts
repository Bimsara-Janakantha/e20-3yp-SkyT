import createHttpError from "http-errors";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { NotificationModel } from "./notifications";
import { getDbPool } from "../database/tunnelSqlDB";

class EstateModel {
  // Get owned estates as a summary list
  static async getEstateSummay(userId: number) {
    const pool = await getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.estateId, e.estate 
       FROM ESTATES e 
       INNER JOIN EMPLOYEES u ON e.estateId = u.estateId
       WHERE employeeId = ?`,
      [userId]
    );

    //console.log("Owned Estates: ", rows);

    return rows;
  }

  // Get owned estates as a detailed list
  static async getEstates(employeeId: number) {
    const pool = await getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.estateId, e.estate, e.address, e.image
       FROM ESTATES e 
       INNER JOIN EMPLOYEES u ON e.estateId = u.estateId
       WHERE employeeId = ?`,
      [employeeId]
    );

    //console.log("Owned Estates: ", rows);

    return rows;
  }

  // Fetch employee details working in manager's estates
  static async getEmployees(managerId: number) {
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
      JOIN EMPLOYEES ue ON ue.employeeId = u.userId
      JOIN ESTATES e ON e.estateId = ue.estateId
      WHERE e.managerId = ? AND u.role != 'Developer'
      GROUP BY u.userId`,
      [managerId]
    );

    //console.log("Employees under manager " + managerId + ": ", rows);

    return rows;
  }

  // Get office location of the estate
  static async getOfficeById(estateId: number, userId: number) {
    const pool = await getDbPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.estate AS name, e.lat, e.lng
       FROM ESTATES e
       JOIN EMPLOYEES u ON e.estateId = u.estateId
       WHERE u.estateId = ? AND u.employeeId = ?`,
      [estateId, userId]
    );

    // If no matching rows, return null or empty array
    if (rows.length === 0) return null;

    // Return location object if found
    return {
      name: rows[0].name,
      location: [parseFloat(rows[0].lat), parseFloat(rows[0].lng)],
    };
  }

  // Update employees
  static async update({
    userId,
    estates,
  }: {
    userId: number;
    estates: number[];
  }) {
    const pool = await getDbPool();
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // Delete existing estate assignments
      const [result] = await connection.query<ResultSetHeader>(
        `DELETE FROM EMPLOYEES WHERE employeeId = ?`,
        [userId]
      );

      if (result.affectedRows === 0) {
        throw createHttpError(404, "Employee not found!");
      }

      // Re-insert updated estate assignments
      const estValues = estates.map((estateId) => [userId, estateId]);
      await connection.query<ResultSetHeader>(
        `INSERT INTO EMPLOYEES (employeeId, estateId) VALUES ?`,
        [estValues]
      );

      // Notify user
      await NotificationModel.createOnce({
        userId,
        title: "Estate Assignment Updated",
        message:
          "Your assigned estates have been updated. Please log in to your dashboard to view the latest changes.",
        type: "System",
      });

      await connection.commit();
      return { message: "Estates updated successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default EstateModel;
