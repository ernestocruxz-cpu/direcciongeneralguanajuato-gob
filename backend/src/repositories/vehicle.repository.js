import QRCode from "qrcode";
import { randomInt } from "node:crypto";
import { query } from "../config/db.js";
import { env } from "../config/env.js";

function generateFolioCandidate() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function isDuplicateFolioError(error) {
  return error?.code === "23505" && String(error?.constraint || "").includes("vehicles_folio");
}

function buildQrPayload(folio) {
  const url = new URL(env.publicAppUrl);
  url.searchParams.set("folio", folio);
  return url.toString();
}

const validityStatusSql = "case when current_date > expiration_date then 'inactivo' else 'activo' end";

export async function listVehicleRecords({
  page = 1,
  pageSize = 10,
  search = "",
  createdDate = "",
  validityStatus = "activo",
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const allowedPageSizes = [10, 25, 50, 100];
  const safePageSize = allowedPageSizes.includes(Number(pageSize)) ? Number(pageSize) : 10;
  const offset = (safePage - 1) * safePageSize;
  const params = [];
  const where = ["status = 'activo'"];
  const normalizedValidityStatus = String(validityStatus).toLowerCase() === "inactivo" ? "inactivo" : "activo";

  if (normalizedValidityStatus === "activo") {
    where.push("current_date <= expiration_date");
  } else {
    where.push("current_date > expiration_date");
  }

  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`);
    where.push(`(
      lower(folio) like $${params.length}
      or lower(brand) like $${params.length}
      or lower(line) like $${params.length}
      or lower(color) like $${params.length}
      or lower(owner_name) like $${params.length}
      or lower(serial_number) like $${params.length}
      or lower(engine_number) like $${params.length}
      or model_year::text like $${params.length}
    )`);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(createdDate))) {
    params.push(createdDate);
    where.push(`created_at::date = $${params.length}::date`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const countResult = await query(`select count(*)::int as total from vehicles ${whereSql}`, params);
  const total = countResult.rows[0]?.total || 0;
  const resultParams = [...params, safePageSize, offset];
  const result = await query(
    `select id, folio, issue_date, expiration_date, brand, line, model_year,
            color, owner_name, serial_number, engine_number, qr_payload, created_at,
            ${validityStatusSql} as validity_status
     from vehicles
     ${whereSql}
     order by created_at desc
     limit $${resultParams.length - 1} offset $${resultParams.length}`,
    resultParams
  );

  return {
    vehicles: result.rows,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(Math.ceil(total / safePageSize), 1),
    },
  };
}

export async function getVehicleByFolio(folio) {
  const result = await query(
    `select folio, issue_date, expiration_date, brand, line, model_year,
            color, owner_name, serial_number, engine_number, qr_payload, qr_data_url,
            created_at,
            ${validityStatusSql} as validity_status
     from vehicles
     where folio = $1 and status = 'activo'
     limit 1`,
    [folio]
  );

  return result.rows[0] || null;
}

export async function updateVehicleRecord(folio, data) {
  const result = await query(
    `update vehicles
     set issue_date = $2,
         expiration_date = $3,
         brand = $4,
         line = $5,
         model_year = $6,
         color = $7,
         owner_name = $8,
         serial_number = $9,
         engine_number = $10
     where folio = $1 and status = 'activo'
     returning id, folio, issue_date, expiration_date, brand, line, model_year,
               color, owner_name, serial_number, engine_number, qr_payload, qr_data_url,
               created_at,
               ${validityStatusSql} as validity_status`,
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
    ]
  );

  return result.rows[0] || null;
}

export async function cancelVehicleRecord(folio) {
  const result = await query(
    `update vehicles
     set status = 'cancelado'
     where folio = $1 and status = 'activo'
     returning folio`,
    [folio]
  );

  return result.rows[0] || null;
}

export async function createVehicleRecord(data, createdBy) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const folio = generateFolioCandidate();
    const qrPayload = buildQrPayload(folio);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });

    try {
      const result = await query(
        `insert into vehicles (
           folio, issue_date, expiration_date, brand, line, model_year,
           color, owner_name, serial_number, engine_number, qr_payload, qr_data_url, created_by
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning id, folio, issue_date, expiration_date, brand, line, model_year,
                   color, owner_name, serial_number, engine_number, qr_payload, qr_data_url, created_at,
                   ${validityStatusSql} as validity_status`,
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
    } catch (error) {
      if (isDuplicateFolioError(error)) continue;
      throw error;
    }
  }

  throw { status: 500, message: "No fue posible generar un folio unico." };
}
