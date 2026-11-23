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
  "00000000": { dni: "00000000", nombres: "CIUDADANO", apellidoPaterno: "OBSERVADO", apellidoMaterno: "PRUEBA", estado: "RESTRINGIDO", ubigeo: "000000" },
  "73043321": { dni: "73043321", nombres: "ANA GABRIELA", apellidoPaterno: "VILLASANTE", apellidoMaterno: "MAMANI", estado: "ACTIVO", ubigeo: "040101" },
  "72960013": { dni: "72960013", nombres: "LUIS FERNANDO", apellidoPaterno: "TORRES", apellidoMaterno: "PAREDES", estado: "ACTIVO", ubigeo: "040102" },
  "41890838": { dni: "41890838", nombres: "VALERIA SOFIA", apellidoPaterno: "HUAMAN", apellidoMaterno: "ZEGARRA", estado: "ACTIVO", ubigeo: "040103" },
  "47379402": { dni: "47379402", nombres: "JUAN DIEGO", apellidoPaterno: "RODRIGUEZ", apellidoMaterno: "VALDIVIA", estado: "ACTIVO", ubigeo: "040104" },
  "47542351": { dni: "47542351", nombres: "ANA LUCIA", apellidoPaterno: "PAREDES", apellidoMaterno: "DIAZ", estado: "ACTIVO", ubigeo: "040107" },
  "72615594": { dni: "72615594", nombres: "LUIS MIGUEL", apellidoPaterno: "CASTILLO", apellidoMaterno: "VILLASANTE", estado: "ACTIVO", ubigeo: "040109" },
  "71781618": { dni: "71781618", nombres: "CAMILA ANDREA", apellidoPaterno: "CORNEJO", apellidoMaterno: "FLORES", estado: "ACTIVO", ubigeo: "040110" },
  "43959310": { dni: "43959310", nombres: "JOSE ANTONIO", apellidoPaterno: "APAZA", apellidoMaterno: "SALAZAR", estado: "ACTIVO", ubigeo: "040112" },
  "41413164": { dni: "41413164", nombres: "DANIELA PAOLA", apellidoPaterno: "ALVAREZ", apellidoMaterno: "APAZA", estado: "ACTIVO", ubigeo: "040116" },
  "48525534": { dni: "48525534", nombres: "PEDRO PABLO", apellidoPaterno: "CARPIO", apellidoMaterno: "BEGAZO", estado: "ACTIVO", ubigeo: "040117" },
  "72928327": { dni: "72928327", nombres: "CLAUDIA PATRICIA", apellidoPaterno: "BUSTAMANTE", apellidoMaterno: "ORTEGA", estado: "ACTIVO", ubigeo: "040122" },
  "46483503": { dni: "46483503", nombres: "MIGUEL ANGEL", apellidoPaterno: "DIAZ", apellidoMaterno: "QUISPE", estado: "ACTIVO", ubigeo: "040126" },
  "71564139": { dni: "71564139", nombres: "ROSA MARIA", apellidoPaterno: "SILVA", apellidoMaterno: "RODRIGUEZ", estado: "ACTIVO", ubigeo: "040129" },
  "44376724": { dni: "44376724", nombres: "JORGE LUIS", apellidoPaterno: "NUÑEZ", apellidoMaterno: "VARGAS", estado: "ACTIVO", ubigeo: "150101" },
  "74388496": { dni: "74388496", nombres: "CARMEN ELENA", apellidoPaterno: "QUISPE", apellidoMaterno: "TICONA", estado: "ACTIVO", ubigeo: "150131" },
  "46532871": { dni: "46532871", nombres: "DIEGO ARMANDO", apellidoPaterno: "MAMANI", apellidoMaterno: "BUSTAMANTE", estado: "ACTIVO", ubigeo: "150122" },
  "71122691": { dni: "71122691", nombres: "LUCIA FERNANDA", apellidoPaterno: "GARCIA", apellidoMaterno: "SOTO", estado: "ACTIVO", ubigeo: "150130" },
  "46697848": { dni: "46697848", nombres: "ANDRES FELIPE", apellidoPaterno: "CONDORI", apellidoMaterno: "LOPEZ", estado: "ACTIVO", ubigeo: "150140" },
  "70184514": { dni: "70184514", nombres: "SOFIA ALEJANDRA", apellidoPaterno: "SALAZAR", apellidoMaterno: "CONDORI", estado: "ACTIVO", ubigeo: "040101" },
  "47270482": { dni: "47270482", nombres: "FERNANDO JOSE", apellidoPaterno: "RAMOS", apellidoMaterno: "CORNEJO", estado: "ACTIVO", ubigeo: "040102" },
  "73489325": { dni: "73489325", nombres: "PAOLA ANDREA", apellidoPaterno: "GUTIERREZ", apellidoMaterno: "FERNANDEZ", estado: "ACTIVO", ubigeo: "040103" },
  "75880957": { dni: "75880957", nombres: "RICARDO MANUEL", apellidoPaterno: "TICONA", apellidoMaterno: "ROJAS", estado: "ACTIVO", ubigeo: "040104" },
  "70154303": { dni: "70154303", nombres: "GABRIELA", apellidoPaterno: "VALDIVIA", apellidoMaterno: "NUÑEZ", estado: "ACTIVO", ubigeo: "040107" },
  "72171822": { dni: "72171822", nombres: "RODRIGO ALEJANDRO", apellidoPaterno: "PORTUGAL", apellidoMaterno: "HUAMAN", estado: "ACTIVO", ubigeo: "040109" },
  "29824896": { dni: "29824896", nombres: "NATALIA", apellidoPaterno: "ROJAS", apellidoMaterno: "DELGADO", estado: "ACTIVO", ubigeo: "040110" },
  "40834657": { dni: "40834657", nombres: "SEBASTIAN", apellidoPaterno: "ORTEGA", apellidoMaterno: "GUTIERREZ", estado: "ACTIVO", ubigeo: "040112" },
  "48133150": { dni: "48133150", nombres: "FIORELLA", apellidoPaterno: "CRUZ", apellidoMaterno: "CARPIO", estado: "ACTIVO", ubigeo: "040116" },
  "41930103": { dni: "41930103", nombres: "DANIEL EDUARDO", apellidoPaterno: "MENDOZA", apellidoMaterno: "MORALES", estado: "ACTIVO", ubigeo: "040117" },
  "72051834": { dni: "72051834", nombres: "MILAGROS", apellidoPaterno: "LOPEZ", apellidoMaterno: "MENDOZA", estado: "ACTIVO", ubigeo: "040122" },
  "29382997": { dni: "29382997", nombres: "CHRISTIAN DAVID", apellidoPaterno: "FLORES", apellidoMaterno: "GARCIA", estado: "ACTIVO", ubigeo: "040126" },
  "41763116": { dni: "41763116", nombres: "JESSICA", apellidoPaterno: "CHAVEZ", apellidoMaterno: "CASTILLO", estado: "ACTIVO", ubigeo: "040129" },
  "45667010": { dni: "45667010", nombres: "MARCO ANTONIO", apellidoPaterno: "DELGADO", apellidoMaterno: "CCAMA", estado: "ACTIVO", ubigeo: "150101" },
  "46513338": { dni: "46513338", nombres: "KAREN LISSETH", apellidoPaterno: "VARGAS", apellidoMaterno: "PORTUGAL", estado: "ACTIVO", ubigeo: "150131" },
  "48262473": { dni: "48262473", nombres: "OSCAR ENRIQUE", apellidoPaterno: "ZEGARRA", apellidoMaterno: "SILVA", estado: "ACTIVO", ubigeo: "150122" },
  "72781080": { dni: "72781080", nombres: "BRENDA", apellidoPaterno: "CCAMA", apellidoMaterno: "TORRES", estado: "ACTIVO", ubigeo: "150130" },
  "72326773": { dni: "72326773", nombres: "HECTOR RAUL", apellidoPaterno: "FERNANDEZ", apellidoMaterno: "CHAVEZ", estado: "ACTIVO", ubigeo: "150140" },
  "46026064": { dni: "46026064", nombres: "XIMENA", apellidoPaterno: "BEGAZO", apellidoMaterno: "RAMOS", estado: "ACTIVO", ubigeo: "040101" },
  "48468723": { dni: "48468723", nombres: "VICTOR HUGO", apellidoPaterno: "LUNA", apellidoMaterno: "ALVAREZ", estado: "ACTIVO", ubigeo: "040102" },
  "43309805": { dni: "43309805", nombres: "ARIANA", apellidoPaterno: "MORALES", apellidoMaterno: "LUNA", estado: "ACTIVO", ubigeo: "040103" },
  "71097882": { dni: "71097882", nombres: "RENZO GABRIEL", apellidoPaterno: "SOTO", apellidoMaterno: "CRUZ", estado: "ACTIVO", ubigeo: "040104" },
  "71812191": { dni: "71812191", nombres: "STEFANY", apellidoPaterno: "VILLASANTE", apellidoMaterno: "MAMANI", estado: "ACTIVO", ubigeo: "040107" },
  "41619399": { dni: "41619399", nombres: "KEVIN ALEXANDER", apellidoPaterno: "TORRES", apellidoMaterno: "PAREDES", estado: "ACTIVO", ubigeo: "040109" },
  "71916998": { dni: "71916998", nombres: "MELISSA", apellidoPaterno: "HUAMAN", apellidoMaterno: "ZEGARRA", estado: "ACTIVO", ubigeo: "040110" },
  "44435346": { dni: "44435346", nombres: "BRYAN STEVEN", apellidoPaterno: "RODRIGUEZ", apellidoMaterno: "VALDIVIA", estado: "ACTIVO", ubigeo: "040112" },
  "74475107": { dni: "74475107", nombres: "KATHERINE", apellidoPaterno: "PAREDES", apellidoMaterno: "DIAZ", estado: "RESTRINGIDO", ubigeo: "040116" },
  "73183842": { dni: "73183842", nombres: "JEAN PIERRE", apellidoPaterno: "CASTILLO", apellidoMaterno: "VILLASANTE", estado: "FALLECIDO", ubigeo: "040117" }
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

app.get("/health", (_req, res) => res.json({ service: "pseudo-reniec", status: "UP", registros:Object.keys(padron).length }));

app.get("/api/reniec/dni", (_req, res) => res.json({
  total: Object.keys(padron).length,
  documentos: Object.values(padron)
}));

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
