import QRCode from "qrcode";
import { query } from "../config/db.js";
import { env } from "../config/env.js";

async function generateUniqueFolio() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const folio = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const result = await query("select 1 from vehicles where folio = $1 limit 1", [folio]);

    if (result.rowCount === 0) {
      return folio;
    }
  }

  throw { status: 500, message: "No fue posible generar un folio unico." };
}

export async function listVehicleRecords() {
  const result = await query(
    `select id, folio, issue_date, expiration_date, brand, line, model_year,
            color, owner_name, serial_number, engine_number, qr_payload, created_at
     from vehicles
     order by created_at desc`
  );

  return result.rows;
}

export async function getVehicleByFolio(folio) {
  const result = await query(
    `select folio, issue_date, expiration_date, brand, line, model_year,
            color, owner_name, serial_number, engine_number, qr_payload, qr_data_url
     from vehicles
     where folio = $1 and status = 'activo'
     limit 1`,
    [folio]
  );

  return result.rows[0] || null;
}

export async function createVehicleRecord(data, createdBy) {
  const folio = await generateUniqueFolio();
  const qrPayload = `${env.publicAppUrl}/?folio=${folio}`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });

  const result = await query(
    `insert into vehicles (
       folio, issue_date, expiration_date, brand, line, model_year,
       color, owner_name, serial_number, engine_number, qr_payload, qr_data_url, created_by
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     returning id, folio, issue_date, expiration_date, brand, line, model_year,
               color, owner_name, serial_number, engine_number, qr_payload, qr_data_url, created_at`,
    [
      folio,
      data.issueDate,
      data.expirationDate,
      data.brand.toUpperCase(),
      data.line.toUpperCase(),
      data.modelYear,
      data.color.toUpperCase(),
      data.ownerName.toUpperCase(),
      data.serialNumber.toUpperCase(),
      data.engineNumber.toUpperCase(),
      qrPayload,
      qrDataUrl,
      createdBy,
    ]
  );

  return result.rows[0];
}
