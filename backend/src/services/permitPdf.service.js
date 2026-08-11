import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, "../../assets");
const policePath = path.join(assetsDir, "police.png");
const sspegPath = path.join(assetsDir, "sspeg.png");
const movilidadIconPath = path.join(assetsDir, "movilidad-icon-clean.png");
const movilidadTextPath = path.join(assetsDir, "movilidad-text-clean.png");
const congresoPath = path.join(assetsDir, "congreso-guanajuato.png");

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl) return null;
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

function fitText(doc, text, x, y, options = {}) {
  doc.text(text || "", x, y, {
    lineBreak: false,
    ellipsis: true,
    ...options,
  });
}

function labelValue(doc, label, value, x, y, labelWidth = 38, valueWidth = 120) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#565656");
  fitText(doc, label, x, y, { width: labelWidth, height: 9 });
  doc.font("Helvetica").fontSize(7).fillColor("#4f4f4f");
  fitText(doc, value, x + labelWidth, y, { width: valueWidth, height: 9 });
}

export async function buildPermitPdf(vehicle) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "portrait",
      margin: 0,
      info: {
        Title: `Permiso provisional ${vehicle.folio}`,
        Author: "Sistema de Pago de Infracciones",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const x = 36;
    const y = 26;
    const w = pageWidth - 72;
    const h = 322;
    const right = x + w;
    const center = x + w / 2;

    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#ffffff");
    doc.rect(x, y, w, h).fill("#fbfdfd");

    doc.save();
    doc.opacity(0.09);
    doc.image(policePath, center - 92, y + 112, { width: 184, height: 184 });
    doc.restore();

    doc.rect(x + 13, y + 156, w - 26, 29).fill("#dce7e9");
    doc.rect(x + 13, y + 232, w - 26, 31).fill("#e8eeee");
    doc.save();
    doc.opacity(0.32);
    doc.rect(x + 13, y + 290, w - 26, 22).fill("#e2eaec");
    doc.rect(x + 13, y + 313, w - 26, 31).fill("#e8eeee");
    doc.restore();

    doc.image(movilidadIconPath, x + 14, y + 14, { width: 58, height: 31 });
    doc.image(movilidadTextPath, x + 72, y + 18, { width: 98, height: 27 });

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5e5e5e");
    fitText(doc, "PERMISO PROVISIONAL PARA", center - 110, y + 14, { width: 220, align: "center", height: 14 });
    fitText(doc, "CIRCULAR SIN PLACAS,", center - 110, y + 30, { width: 220, align: "center", height: 14 });
    fitText(doc, "TARJETA DE CIRCULACION Y", center - 110, y + 46, { width: 220, align: "center", height: 14 });
    fitText(doc, "ENGOMADO", center - 110, y + 62, { width: 220, align: "center", height: 14 });

    doc.image(sspegPath, right - 150, y + 13, { width: 129, height: 66 });

    const qrBuffer = dataUrlToBuffer(vehicle.qr_data_url);
    if (qrBuffer) {
      doc.image(qrBuffer, x + 15, y + 78, { width: 65, height: 65 });
    }

    doc.font("Helvetica").fontSize(5.8).fillColor("#686868");
    fitText(doc, "NIT: D407-002-01961 17/7710", center - 65, y + 83, { width: 130, align: "center", height: 8 });

    doc.roundedRect(center + 58, y + 77, 72, 17, 3).stroke("#696969");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#b56b73");
    fitText(doc, "No", center + 65, y + 82, { width: 18, height: 9 });
    doc.fontSize(9);
    fitText(doc, String(vehicle.folio), center + 89, y + 81, { width: 38, height: 10 });

    doc.font("Helvetica-Bold").fontSize(5.7).fillColor("#646464");
    fitText(doc, "EL PRESENTE DOCUMENTO SOLO ES VALIDO EN ORIGINAL Y/O", center - 102, y + 105, {
      width: 204,
      align: "center",
      height: 8,
    });
    fitText(doc, "FORMATO DIGITAL", center - 102, y + 114, { width: 204, align: "center", height: 8 });

    labelValue(doc, "EXPEDICION:", formatDate(vehicle.issue_date), right - 135, y + 105, 60, 70);
    labelValue(doc, "VENCIMIENTO:", formatDate(vehicle.expiration_date), right - 135, y + 121, 60, 70);

    doc.font("Helvetica").fontSize(5.8).fillColor("#5a5a5a");
    fitText(doc, "EL PERMISO PROVISIONAL PARA QUE EL VEHICULO CON LAS SIGUIENTES CARACTERISTICAS", x + 13, y + 146, {
      width: w - 26,
      height: 8,
    });

    labelValue(doc, "MARCA:", vehicle.brand, x + 14, y + 160, 32, 95);
    labelValue(doc, "LINEA:", vehicle.line, x + 136, y + 160, 31, 72);
    labelValue(doc, "MODELO:", vehicle.model_year, x + 252, y + 160, 41, 43);
    labelValue(doc, "COLOR:", vehicle.color, x + 360, y + 160, 35, 78);
    labelValue(doc, "SERIE:", vehicle.serial_number, x + 14, y + 178, 31, 150);
    labelValue(doc, "MOTOR:", vehicle.engine_number, x + 250, y + 178, 36, 70);

    doc.font("Helvetica").fontSize(5.25).fillColor("#5d5d5d");
    doc.text(
      "TRANSITE SIN PORTAR PLACAS Y DEMAS DOCUMENTOS QUE AMPARAN LA CIRCULACION DE LOS VEHICULOS DE USO PRIVADO POR EL TERMINO DE 30 DIAS CONTADOS A PARTIR DE LA FECHA DE EMISION DE ESTA AUTORIZACION EN VIRTUD DE ESTAR EN TRAMITE LA OBTENCION DE LOS MISMOS",
      x + 14,
      y + 204,
      { width: w - 28, height: 22, align: "justify" }
    );

    doc.font("Helvetica-Bold").fontSize(5.8).fillColor("#5b5b5b");
    fitText(doc, "PRESENTA FACTURA E INE:", x + 14, y + 238, { width: 135, height: 8 });

    doc.font("Helvetica").fontSize(9).fillColor("#5a5a5a");
    fitText(doc, `PROPIETARIO: ${vehicle.owner_name}`, center - 160, y + 249, {
      width: 320,
      align: "center",
      height: 13,
    });

    doc.font("Helvetica").fontSize(4.9).fillColor("#5b5b5b");
    doc.text(
      "LO ANTERIOR CON FUNDAMENTO EN LOS ARTICULOS 15 FRACCIONES V, VI Y VII; 19 FRACCION III, 25 FRACCIONES XXXIII, 53-75, CUARTO Y NOVENO, CONFORME A LA LEY DE MOVILIDAD DEL ESTADO DE GUANAJUATO Y SUS 31 ESTADOS DE LA REPUBLICA MEXICANA",
      x + 14,
      y + 276,
      { width: w - 28, height: 15, align: "justify" }
    );

    doc.font("Helvetica-Bold").fontSize(4.6).fillColor("#5b5b5b");
    fitText(doc, "NOTA:", x + 14, y + 296, { width: 18, height: 7 });
    doc.font("Helvetica").fontSize(4.6);
    fitText(
      doc,
      "LA EXPEDICION DE ESTE PERMISO NO AUTORIZA LA PRESTACION DE SERVICIO PUBLICO ESPECIAL DE TRANSPORTE Y SOLO SERA VALIDO SI LLEVA ANEXO EL RECIBO OFICIAL DE PAGO DE DERECHOS.",
      x + 32,
      y + 296,
      { width: 310, height: 12 }
    );

    if (fs.existsSync(congresoPath)) {
      doc.image(congresoPath, right - 124, y + 256, { width: 72, height: 39, fit: [72, 39] });
    }

    doc.moveTo(right - 126, y + 298).lineTo(right - 47, y + 298).stroke("#777777");
    doc.font("Helvetica-Bold").fontSize(4.4).fillColor("#5d5d5d");
    doc.text("ATENTAMENTE", right - 148, y + 301, {
      width: 126,
      align: "center",
      height: 6,
    });
    doc.text("EL JEFE DE LA OFICINA REGIONAL DE MOVILIDAD", right - 148, y + 308, {
      width: 126,
      align: "center",
      height: 12,
    });

    const footerY = y + 315;
    doc.rect(x + 14, footerY - 4, w - 28, 0.6).fill("#d4dcde");
    doc.font("Helvetica-Bold").fontSize(4.8).fillColor("#616161");
    fitText(doc, "NUESTRA SEDE", x + 14, footerY + 5, { width: 90, height: 6 });
    fitText(doc, "GUANAJUATO", x + 230, footerY + 5, { width: 70, height: 6 });
    doc.font("Helvetica").fontSize(4.65);
    fitText(doc, "Boulevard Euquerio Guerrero S/N", x + 14, footerY + 14, { width: 130, height: 6 });
    fitText(doc, "Col. Yerbabuena, C.P. 36250", x + 14, footerY + 22, { width: 130, height: 6 });
    fitText(doc, "Guanajuato, GTO.", x + 14, footerY + 30, { width: 130, height: 6 });
    fitText(doc, "Boulevard Euquerio Guerrero Esq. Tres Marias, No 1", x + 230, footerY + 14, { width: 160, height: 6 });
    fitText(doc, "Col. Burocratas, Local 9,10 y 11, C.P. 36250", x + 230, footerY + 22, { width: 160, height: 6 });
    fitText(doc, "Plaza Galerena, Guanajuato, GTO.", x + 230, footerY + 30, { width: 160, height: 6 });
    doc.font("Helvetica-Bold").fontSize(4.8);
    fitText(doc, "https://transporte.guanajuato.gob.mx/", right - 140, footerY + 5, { width: 126, align: "center", height: 6 });
    fitText(doc, "TRANSPORTE@GUANAJUATO.GOB.MX", right - 140, footerY + 14, { width: 126, align: "center", height: 6 });
    doc.font("Helvetica").fontSize(4.4);
    fitText(doc, "473 733 6975      473 733 6999      473 733 8721", right - 146, footerY + 23, {
      width: 138,
      align: "center",
      height: 6,
    });
    doc.font("Helvetica-Bold").fontSize(4.5);
    fitText(doc, "VALIDO A NIVEL NACIONAL", right - 126, footerY + 31, { width: 90, align: "center", height: 6 });

    doc.end();
  });
}
