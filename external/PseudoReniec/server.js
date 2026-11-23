const express = require("express");
const cors = require("cors");
const xml2js = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["text/xml", "application/xml", "application/soap+xml"] }));

const padron = {
  "71234567": { dni: "71234567", nombres: "SUEMY ANNE KATRINA", apellidoPaterno: "VILLASANTE", apellidoMaterno: "VILLASANTE", estado: "ACTIVO", ubigeo: "040101" },
  "45678912": { dni: "45678912", nombres: "CARLOS ALBERTO", apellidoPaterno: "MENDOZA", apellidoMaterno: "QUISPE", estado: "ACTIVO", ubigeo: "040109" },
  "12345678": { dni: "12345678", nombres: "MARIA FERNANDA", apellidoPaterno: "TORRES", apellidoMaterno: "LOPEZ", estado: "ACTIVO", ubigeo: "150101" },
  "00000000": { dni: "00000000", nombres: "CIUDADANO", apellidoPaterno: "OBSERVADO", apellidoMaterno: "PRUEBA", estado: "RESTRINGIDO", ubigeo: "000000" }
};

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

app.get("/health", (_req, res) => res.json({ service: "pseudo-reniec", status: "UP" }));

app.get("/api/reniec/dni/:dni", (req, res) => {
  const persona = padron[req.params.dni];
  if (!persona) return res.status(404).json({ encontrado: false, mensaje: "DNI no existe en el padrón RENIEC" });
  res.json({ encontrado: true, datos: persona });
});

app.post("/ws/reniec", async (req, res) => {
  try {
    const parsed = await xml2js.parseStringPromise(req.body, { explicitArray: false, ignoreAttrs: true });
    const dni = findValue(parsed, "dni");

    res.set("Content-Type", "text/xml; charset=utf-8");
    if (!/^\d{8}$/.test(dni || "")) {
      return res.status(400).send('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ren="http://clinica.com/reniec"><soapenv:Body><ren:consultarDniResponse><ren:encontrado>false</ren:encontrado><ren:mensaje>DNI invalido</ren:mensaje></ren:consultarDniResponse></soapenv:Body></soapenv:Envelope>');
    }

    const persona = padron[dni];
    if (!persona) {
      return res.status(404).send(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ren="http://clinica.com/reniec"><soapenv:Body><ren:consultarDniResponse><ren:encontrado>false</ren:encontrado><ren:mensaje>DNI ${escapeXml(dni)} no encontrado en RENIEC</ren:mensaje></ren:consultarDniResponse></soapenv:Body></soapenv:Envelope>`);
    }

    res.status(200).send(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ren="http://clinica.com/reniec"><soapenv:Body><ren:consultarDniResponse><ren:encontrado>true</ren:encontrado><ren:dni>${persona.dni}</ren:dni><ren:nombres>${escapeXml(persona.nombres)}</ren:nombres><ren:apellidoPaterno>${escapeXml(persona.apellidoPaterno)}</ren:apellidoPaterno><ren:apellidoMaterno>${escapeXml(persona.apellidoMaterno)}</ren:apellidoMaterno><ren:estado>${persona.estado}</ren:estado><ren:ubigeo>${persona.ubigeo}</ren:ubigeo></ren:consultarDniResponse></soapenv:Body></soapenv:Envelope>`);
  } catch (error) {
    res.status(400).type("xml").send(`<error>Error procesando XML en PseudoRENIEC: ${escapeXml(error.message)}</error>`);
  }
});

const port = Number(process.env.PORT || 9001);
app.listen(port, "0.0.0.0", () => console.log(`[PseudoRENIEC] http://0.0.0.0:${port}`));
