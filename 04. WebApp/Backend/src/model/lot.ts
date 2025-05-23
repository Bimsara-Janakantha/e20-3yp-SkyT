import createHttpError from "http-errors";
import { RowDataPacket } from "mysql2";
import { formatTimestamp, getColomboTime } from "../util/formatTimestamp";
import { DateTime } from "luxon";
import { getDbPool } from "../database/tunnelSqlDB";

interface DataProps {
  Temperature: number;
  Humidity: number;
  lowPH: number;
  highPH: number;
  optimalPH: number;
  PH: number;
  Nitrogen: number;
  Phosphorus: number;
  Potassium: number;
}

class LotModel {
  // Gets Lot summary
  static async getLotSummaryByEstate(estateId: number) {
    const pool = await getDbPool();
    const query = `
          SELECT 
            L.lotId,
            L.lot,
            L.lat,
            L.lng,
            MAX(R.timestamp) AS lastUpdate,
            AVG(R.temperature) AS temperature,
            AVG(R.humidity) AS humidity,
            AVG(R.ph) AS ph,
            AVG(R.n) AS n,
            AVG(R.p) AS p,
            AVG(R.k) AS k
          FROM LOTS L
          JOIN NODES N ON N.lotId = L.lotId
          JOIN (
            SELECT SR1.*
            FROM SENSOR_READINGS SR1
            INNER JOIN (
              SELECT nodeId, MAX(timestamp) AS latestTime
              FROM SENSOR_READINGS
              GROUP BY nodeId
            ) AS LatestPerNode
            ON SR1.nodeId = LatestPerNode.nodeId AND SR1.timestamp = LatestPerNode.latestTime
          ) R ON R.nodeId = N.nodeId
          WHERE L.estateId = ?
          GROUP BY L.lotId, L.lot, L.lat, L.lng
          `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [estateId]);

    if (rows.length === 0) return null;

    return rows.map((row) => ({
      lotId: row.lotId,
      lot: row.lot,
      location: [parseFloat(row.lat), parseFloat(row.lng)],
      lastUpdate: row.lastUpdate,
      temperature: parseFloat(row.temperature),
      humidity: parseFloat(row.humidity),
      ph: parseFloat(row.ph),
      n: parseFloat(row.n),
      p: parseFloat(row.p),
      k: parseFloat(row.k),
    }));
  }

  static async getLotsByEstate(estateId: number) {
    const pool = await getDbPool();
    const query = `
          SELECT 
            lotId,
            lot,
            lat,
            lng
          FROM LOTS
          WHERE estateId = ?
          GROUP BY lotId
          `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [estateId]);

    if (rows.length === 0) return null;

    return rows.map((row) => ({
      lotId: row.lotId,
      lot: row.lot,
      location: [parseFloat(row.lat), parseFloat(row.lng)],
    }));
  }

  static async isLotAccessibleByUser(userId: number, lotId: number) {
    const pool = await getDbPool();
    const query = `
          SELECT L.* 
          FROM LOTS L
          JOIN EMPLOYEES E ON E.estateId = L.estateId
          WHERE E.employeeId = ? AND L.lotId = ?
          `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [userId, lotId]);

    return rows.length === 0 ? null : rows[0];
  }

  static async getLotDataById(lotId: number, lowerPH: number, upperPH: number) {
    const pool = await getDbPool();
    const query = `
      WITH LatestReadings AS (
        SELECT sr.*
        FROM SENSOR_READINGS sr
        JOIN (
          SELECT nodeId, MAX(timestamp) as latest
          FROM SENSOR_READINGS
          GROUP BY nodeId
        ) latest ON sr.nodeId = latest.nodeId AND sr.timestamp = latest.latest
        JOIN NODES n ON sr.nodeId = n.nodeId
        WHERE n.lotId = ?
      )
      SELECT
        ROUND(AVG(temperature),1) AS Temperature,
        ROUND(AVG(humidity),1) AS Humidity,
        ROUND(AVG(ph), 2) AS PH,
        ROUND(AVG(n), 2) AS Nitrogen,
        ROUND(AVG(p), 2) AS Phosphorus,
        ROUND(AVG(k), 2) AS Potassium,
        COUNT(CASE WHEN ph < ? THEN 1 END) AS lowPH,
        COUNT(CASE WHEN ph BETWEEN ? AND ? THEN 1 END) AS optimalPH,
        COUNT(CASE WHEN ph > ? THEN 1 END) AS highPH
      FROM LatestReadings;
    `;

    const params = [lotId, lowerPH, lowerPH, upperPH, upperPH];
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    if (rows.length === 0) {
      throw createHttpError(404, "Lot data not found");
    }

    return rows[0] as DataProps;
  }

  static async getLatestLotImage(lotId: number) {
    const pool = await getDbPool();
    const query = `
      SELECT I.url, I.uploadedAt
      FROM NODE_IMAGES I
      JOIN NODES N ON I.nodeId = N.nodeId
      WHERE N.lotId = ?
      ORDER BY I.uploadedAt DESC
      LIMIT 1
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [lotId]);

    if (rows.length > 0) {
      return {
        url: rows[0].url,
        uploadedAt: formatTimestamp(rows[0].uploadedAt),
      };
    } else {
      return null;
    }
  }

  static async getPHAnalyticsData(
    lotId: number,
    userId: number,
    reqType: string
  ) {
    const pool = await getDbPool();
    let startDate: DateTime;

    switch (reqType) {
      case "week":
        startDate = getColomboTime().minus({ days: 7 });
        break;
      case "month":
        startDate = getColomboTime().minus({ months: 1 });
        break;
      case "year":
        startDate = getColomboTime().minus({ years: 1 });
        break;
      default:
        throw new Error("Invalid reqType");
    }

    const formattedDate = startDate.toFormat("yyyy-MM-dd");

    console.log("Today: ", formattedDate);

    const query = `
      SELECT 
        DATE_FORMAT(sr.timestamp, '%Y-%m-%d') AS date, 
        AVG(sr.ph) AS ph
      FROM SENSOR_READINGS sr
      JOIN NODES n ON sr.nodeId = n.nodeId
      JOIN LOTS l ON n.lotId = l.lotId
      JOIN ESTATES es ON l.estateId = es.estateId
      JOIN EMPLOYEES e ON es.estateId = e.estateId
      WHERE n.lotId = ? 
        AND sr.timestamp >= ?
        AND e.employeeId = ?
      GROUP BY DATE_FORMAT(sr.timestamp, '%Y-%m-%d')
      ORDER BY DATE_FORMAT(sr.timestamp, '%Y-%m-%d') ASC;
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [
      lotId,
      formattedDate,
      userId,
    ]);

    if (rows.length === 0) {
      //throw createHttpError(404, "pH data not found!");
      return [];
    }

    return rows.map((row) => ({
      date: row.date,
      ph: parseFloat(row.ph),
    }));
  }

  static async getNPKAnalyticsData(
    lotId: number,
    userId: number,
    reqType: string
  ) {
    const pool = await getDbPool();
    let startDate: DateTime;

    switch (reqType) {
      case "week":
        startDate = getColomboTime().minus({ days: 7 });
        break;
      case "month":
        startDate = getColomboTime().minus({ months: 1 });
        break;
      case "year":
        startDate = getColomboTime().minus({ years: 1 });
        break;
      default:
        throw new Error("Invalid reqType");
    }

    const formattedDate = startDate.toFormat("yyyy-MM-dd");

    console.log("Today: ", formattedDate);

    const query = `
      SELECT 
        DATE_FORMAT(sr.timestamp, '%Y-%m-%d') AS date, 
        AVG(sr.n) AS n,
        AVG(sr.p) AS p,
        AVG(sr.k) AS k
      FROM SENSOR_READINGS sr
      JOIN NODES n ON sr.nodeId = n.nodeId
      JOIN LOTS l ON n.lotId = l.lotId
      JOIN ESTATES es ON l.estateId = es.estateId
      JOIN EMPLOYEES e ON es.estateId = e.estateId
      WHERE n.lotId = ? 
        AND sr.timestamp >= ?
        AND e.employeeId = ?
      GROUP BY DATE_FORMAT(sr.timestamp, '%Y-%m-%d')
      ORDER BY DATE_FORMAT(sr.timestamp, '%Y-%m-%d') ASC;
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [
      lotId,
      formattedDate,
      userId,
    ]);

    if (rows.length === 0) {
      //throw createHttpError(404, "NPK data not found!");
      return [];
    }

    return rows.map((row) => ({
      date: row.date,
      n: parseFloat(row.n),
      p: parseFloat(row.p),
      k: parseFloat(row.k),
    }));
  }

  static async getLotCenterAndNodes(lotId: number) {
    const pool = await getDbPool();
    const query = `
      SELECT 
        L.lot AS name,
        L.lat,
        L.lng,
        N.id,
        N.nodeId,
        N.latitude AS nodeLat,
        N.longitude AS nodeLng,
        SR.temperature,
        SR.humidity,
        SR.ph,
        SR.nitrogen,
        SR.phosphorus,
        SR.potassium
      FROM LOTS L
      JOIN NODES N ON N.lotId = L.id
      LEFT JOIN (
        SELECT nodeId, MAX(id) AS latestId
        FROM SENSOR_READINGS
        GROUP BY nodeId
      ) AS Latest ON N.id = Latest.nodeId
      LEFT JOIN SENSOR_READINGS SR ON SR.id = Latest.latestId
      WHERE L.id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [lotId]);
    return rows;
  }

  static async getNodesByLotId(lotId: number) {
    const pool = await getDbPool();
    const query = `
      SELECT 
        N.nodeId,
        N.node,
        N.lat AS nodeLat,
        N.lng AS nodeLng,
        SR.temperature,
        SR.humidity,
        SR.ph,
        SR.n,
        SR.p,
        SR.k
      FROM NODES N
      LEFT JOIN (
        SELECT nodeId, MAX(readingId) AS latestId
        FROM SENSOR_READINGS
        GROUP BY nodeId
      ) Latest ON N.nodeId = Latest.nodeId
      LEFT JOIN SENSOR_READINGS SR ON SR.readingId = Latest.latestId
      WHERE N.lotId = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [lotId]);

    return rows;
  }

  static async getGalleryImages(lotId: number, lastId: number | null) {
    const pool = await getDbPool();
    // Step 1: Get 3 most recent distinct dates
    const dateQuery = `
      SELECT DISTINCT DATE(I.uploadedAt) AS date
      FROM NODE_IMAGES I
      JOIN NODES N ON I.nodeId = N.nodeId
      WHERE N.lotId = ?
      AND (? IS NULL OR I.imageId < ?)
      ORDER BY DATE(I.uploadedAt) DESC
      LIMIT 3;
    `;
    const [dateRows] = await pool.query<RowDataPacket[]>(dateQuery, [
      lotId,
      lastId,
      lastId,
    ]);
    const dates = dateRows.map((r) => r.date);

    //console.log("Dates: ", dates);

    if (dates.length === 0) return [];

    // Step 2: Fetch all images from those 3 dates
    const placeholders = dates.map(() => "?").join(", ");
    const imageQuery = `
      SELECT I.imageId, I.url, I.uploadedAt, N.nodeId AS node
      FROM NODE_IMAGES I
      JOIN NODES N ON I.nodeId = N.nodeId
      WHERE N.lotId = ?
      AND DATE(I.uploadedAt) IN (${placeholders})
      ORDER BY I.imageId DESC;
    `;
    const [images] = await pool.query<RowDataPacket[]>(imageQuery, [
      lotId,
      ...dates,
    ]);
    return images;
  }
}

export default LotModel;
