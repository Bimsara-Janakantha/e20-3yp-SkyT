import createHttpError from "http-errors";
import { RowDataPacket } from "mysql2";
import { getDbPool } from "../database/tunnelSqlDB";

interface DroneProps {
  monAct: number;
  monAva: number;
  ferAct: number;
  ferAva: number;
}

interface DroneStatusProps {
  droneId: number;
  type: string;
  location: [number, number];
  battery: number;
  signal: number;
  status: "Active" | "Available" | "Removed" | "Maintenance";
}

class DroneModel {
  static async getDroneSummary(estateId: number): Promise<DroneProps> {
    const pool = await getDbPool();

    const query = `
          SELECT
            SUM(CASE WHEN type = 'Monitoring' AND status = 'Active' THEN 1 ELSE 0 END) AS monAct,
            SUM(CASE WHEN type = 'Monitoring' AND status = 'Available' THEN 1 ELSE 0 END) AS monAva,
            SUM(CASE WHEN type = 'Fertilizing' AND status = 'Active' THEN 1 ELSE 0 END) AS ferAct,
            SUM(CASE WHEN type = 'Fertilizing' AND status = 'Available' THEN 1 ELSE 0 END) AS ferAva
          FROM DRONES
          WHERE estateId = ?
        `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [estateId]);

    return rows[0] as DroneProps;
  }

  static async getDroneStatusByEstate(estateId: number, userId: number) {
    const pool = await getDbPool();
    const conn = await pool.getConnection();
    try {
      // Verify access
      const authQuery = `
        SELECT 1 FROM EMPLOYEES
        WHERE employeeId = ? AND estateId = ?
      `;

      const [authResult] = await conn.query<RowDataPacket[]>(authQuery, [
        userId,
        estateId,
      ]);

      if (authResult.length === 0) {
        throw createHttpError(403, "Access denied to the estate");
      }

      // Fetch drones of the estate
      const droneQuery = `
        SELECT S.droneId, D.type, S.lat, S.lng, S.battery, S.signalStrength, D.status
        FROM DRONE_STATUS S
        JOIN DRONES D ON D.droneId = S.droneId
        JOIN (
          SELECT droneId, MAX(lastUpdate) AS latest
          FROM DRONE_STATUS
          GROUP BY droneId
        ) latest_status ON S.droneId = latest_status.droneId AND S.lastUpdate = latest_status.latest
        WHERE D.estateId = ? AND D.status != 'Removed';

      `;
      const [drones] = await conn.query<RowDataPacket[]>(droneQuery, [
        estateId,
      ]);

      if (drones.length === 0) {
        throw createHttpError(404, "No drones found");
      }

      const res: DroneStatusProps[] = drones.map((drone) => ({
        droneId: parseInt(drone.droneId),
        type: drone.type,
        location: [parseFloat(drone.lat), parseFloat(drone.lng)],
        battery: parseFloat(drone.battery),
        signal: parseFloat(drone.signalStrength),
        status: drone.status,
      }));

      return res;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default DroneModel;
