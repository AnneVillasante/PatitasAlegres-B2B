const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const xml2js = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["text/xml", "application/xml", "application/soap+xml"] }));

const padron = {
  "20601234561": { ruc: "20601234561", razonSocial: "CLINICA VETERINARIA PATITAS ALEGRES S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. EJERCITO 450, AREQUIPA" },
  "20100047218": { ruc: "20100047218", razonSocial: "DISTRIBUIDORA FARMACEUTICA VET PERU S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE MERCADERES 120, AREQUIPA" },
  "20123456789": { ruc: "20123456789", razonSocial: "EMPRESA DEMO S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "DIRECCION FICTICIA" }
};

let correlativoBoleta = 1;
let correlativoFactura = 1;
const comprobantesEmitidos = [];

function findValue(value, localName) {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (key.split(":").pop() === localName) {
      return typeof child === "object" && child._ !== undefined ? String(child._).trim() : String(child).trim();
    }
    const found = findValue(child, localName);
    if (found !== undefined) return found;
  }
  return undefined;
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]));
}

function emitir(tipo, total, clienteDoc = "", clienteNombre = "") {
  const monto = Number(total);
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El total debe ser mayor que cero");
  const subtotal = +(monto / 1.18).toFixed(2);
  const igv = +(monto - subtotal).toFixed(2);
  const esFactura = String(tipo).toUpperCase() === "FACTURA";
  const serie = esFactura ? "F001" : "B001";
  const numero = String(esFactura ? correlativoFactura++ : correlativoBoleta++).padStart(6, "0");
  const comprobante = `${serie}-${numero}`;
  const hashCdr = crypto.createHash("sha256").update(`${comprobante}-${Date.now()}`).digest("hex").substring(0, 16).toUpperCase();
  const cdr = { aceptado: true, codigoRespuesta: "0", descripcion: `Comprobante ${comprobante} aceptado`, comprobante, fechaEmision: new Date().toISOString(), cliente: { documento: clienteDoc, nombre: clienteNombre }, montos: { subtotal, igv, total: +monto.toFixed(2), moneda: "PEN" }, hashCdr };
  comprobantesEmitidos.push(cdr);
  return cdr;
}

app.get("/health", (_req, res) => res.json({ service: "pseudo-sunat", status: "UP" }));

app.post("/api/sunat/comprobantes", (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ aceptado: false, mensaje: "El comprobante debe tener al menos un ítem" });
    const total = items.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0);
    res.status(201).json(emitir(req.body.tipoComprobante, total, req.body.clienteDoc, req.body.clienteNombre));
  } catch (error) {
    res.status(400).json({ aceptado: false, mensaje: error.message });
  }
});

app.post("/ws/sunat", async (req, res) => {
  try {
    const parsed = await xml2js.parseStringPromise(req.body, { explicitArray: false, ignoreAttrs: true });
    res.set("Content-Type", "text/xml; charset=utf-8");

    const ruc = findValue(parsed, "ruc");
    if (ruc !== undefined) {
      const empresa = padron[ruc];
      if (!empresa) {
        return res.status(404).send(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sun="http://clinica.com/sunat"><soapenv:Body><sun:consultarRucResponse><sun:encontrado>false</sun:encontrado><sun:mensaje>RUC ${escapeXml(ruc)} no registrado en SUNAT</sun:mensaje></sun:consultarRucResponse></soapenv:Body></soapenv:Envelope>`);
      }
      return res.status(200).send(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sun="http://clinica.com/sunat"><soapenv:Body><sun:consultarRucResponse><sun:encontrado>true</sun:encontrado><sun:ruc>${empresa.ruc}</sun:ruc><sun:razonSocial>${escapeXml(empresa.razonSocial)}</sun:razonSocial><sun:estado>${empresa.estado}</sun:estado><sun:condicion>${empresa.condicion}</sun:condicion><sun:direccion>${escapeXml(empresa.direccion)}</sun:direccion></sun:consultarRucResponse></soapenv:Body></soapenv:Envelope>`);
    }

    const tipo = findValue(parsed, "tipo") || "BOLETA";
    const total = findValue(parsed, "total");
    const clienteDoc = findValue(parsed, "dni") || findValue(parsed, "rucCliente") || "";
    const clienteNombre = findValue(parsed, "clienteNombre") || "";
    if (total !== undefined) {
      const cdr = emitir(tipo, total, clienteDoc, clienteNombre);
      return res.status(201).send(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sun="http://clinica.com/sunat"><soapenv:Body><sun:EmitirComprobanteResponse><sun:aceptado>true</sun:aceptado><sun:comprobante>${cdr.comprobante}</sun:comprobante><sun:subtotal>${cdr.montos.subtotal}</sun:subtotal><sun:igv>${cdr.montos.igv}</sun:igv><sun:total>${cdr.montos.total}</sun:total><sun:hashCdr>${cdr.hashCdr}</sun:hashCdr><sun:mensaje>${escapeXml(cdr.descripcion)}</sun:mensaje></sun:EmitirComprobanteResponse></soapenv:Body></soapenv:Envelope>`);
    }
    res.status(400).type("xml").send('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><soapenv:Fault><faultcode>soapenv:Client</faultcode><faultstring>Operacion SOAP no reconocida</faultstring></soapenv:Fault></soapenv:Body></soapenv:Envelope>');
  } catch (error) {
    res.status(400).type("xml").send(`<error>Error en PseudoSUNAT: ${escapeXml(error.message)}</error>`);
  }
});

app.get("/api/sunat/comprobantes", (_req, res) => res.json(comprobantesEmitidos));

const port = Number(process.env.PORT || 9002);
app.listen(port, "0.0.0.0", () => console.log(`[PseudoSUNAT] http://0.0.0.0:${port}`));
