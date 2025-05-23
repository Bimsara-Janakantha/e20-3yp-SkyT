import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../database/sqldb";
import { getRelativeTime } from "../util/formatTimestamp";
import createHttpError from "http-errors";
import { getDbPool } from "../database/tunnelSqlDB";

interface messageProps {
  msgId: number;
  title: string;
  message: string;
  time: string;
  sender: string;
  isRead: boolean;
}

interface NewMessageProps {
  title: string;
  userId: number;
  message: string;
  type: "Task" | "Drone" | "Sensor" | "Image" | "System";
}

function findSender(type: string) {
  switch (type.toLowerCase()) {
    case "system":
      return "SkyT Platform";

    case "drone":
      return "Drone Control";

    case "task":
      return "Task Manager";

    case "sensor":
      return "Sensor Network";

    case "image":
      return "Image Processor";

    default:
      return "Unknown Sender";
  }
}

export class NotificationModel {
  static async createOnce({ userId, title, message, type }: NewMessageProps) {
    const pool = await getDbPool();
    try {
      const query = `
        INSERT INTO NOTIFICATIONS (userId, title, message, type)
        VALUES (?, ?, ?, ?)
      `;

      const [result] = await pool.query<ResultSetHeader>(query, [
        userId,
        title,
        message,
        type,
      ]);

      if (result.affectedRows === 0) {
        throw createHttpError(500, "Unable to create a notification");
      }

      console.log("Notify to user " + userId);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  static async getAll(userId: number) {
    const query = `
      SELECT * FROM NOTIFICATIONS
      WHERE userId = ?
      ORDER BY createdAt DESC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [userId]);

    if (rows.length === 0) {
      return [];
    } else {
      const result: messageProps[] = rows.map((row) => ({
        msgId: parseInt(row.msgId),
        title: row.title,
        message: row.message,
        time: getRelativeTime(row.createdAt),
        sender: findSender(row.type),
        isRead: !!row.isRead,
      }));

      return result;
    }
  }

  static async getMsgCount(userId: number) {
    const query = `
      SELECT COUNT(*) AS unreadCount
      FROM NOTIFICATIONS
      WHERE userId = ? AND isRead = FALSE
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [userId]);

    return rows[0]?.unreadCount ?? 0;
  }

  static async markAsRead(userId: number, msgId: number) {
    const query = `UPDATE NOTIFICATIONS SET isRead = TRUE WHERE msgId = ? AND userId = ?`;
    const [result] = await pool.query<ResultSetHeader>(query, [msgId, userId]);

    if (result.affectedRows === 0) {
      throw createHttpError(500, "Fail to update user");
    }

    return { message: "Message updated successfully" };
  }

  static async delete(userId: number, msgId: number) {
    const query = "DELETE FROM NOTIFICATIONS WHERE userId = ? AND msgId = ?";
    const [result] = await pool.query<ResultSetHeader>(query, [userId, msgId]);

    if (result.affectedRows === 0) {
      throw createHttpError(500, "Fail to delete user");
    }

    return { message: "Message deleted successfully" };
  }
}
