const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const xml2js = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["text/xml", "application/xml", "application/soap+xml"] }));

const padron = {
  "20601234561": { ruc: "20601234561", razonSocial: "CLINICA VETERINARIA PATITAS ALEGRES S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. EJERCITO 450, AREQUIPA, AREQUIPA" },
  "20100047218": { ruc: "20100047218", razonSocial: "DISTRIBUIDORA FARMACEUTICA VET PERU S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE MERCADERES 120, AREQUIPA" },
  "20123456789": { ruc: "20123456789", razonSocial: "EMPRESA DEMO S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "DIRECCION FICTICIA" },
  "20334215866": { ruc: "20334215866", razonSocial: "AGROVETERINARIA EL MISTI S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. EJERCITO 100, AREQUIPA, AREQUIPA" },
  "20146165061": { ruc: "20146165061", razonSocial: "LABORATORIOS ZOOVET DEL SUR S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE MERCADERES 137, YANAHUARA, AREQUIPA" },
  "20263936494": { ruc: "20263936494", razonSocial: "IMPORTADORA MASCOTAS FELICES E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. DOLORES 174, CAYMA, AREQUIPA" },
  "20347985431": { ruc: "20347985431", razonSocial: "ALIMENTOS BALANCEADOS CANINOS PERU S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PARRA 211, JOSE LUIS BUSTAMANTE Y RIVERO, AREQUIPA" },
  "20291251804": { ruc: "20291251804", razonSocial: "DISTRIBUIDORA MEDICA ANIMALIA S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. GOYENECHE 248, CERRO COLORADO, AREQUIPA" },
  "20205862103": { ruc: "20205862103", razonSocial: "CENTRO DE DIAGNOSTICO VETERINARIO AREQUIPA S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. SALAVERRY 285, MIRAFLORES, AREQUIPA" },
  "20394060683": { ruc: "20394060683", razonSocial: "PET SHOP HUELLITAS DEL SUR E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE SAN JUAN DE DIOS 322, MARIANO MELGAR, AREQUIPA" },
  "20464547402": { ruc: "20464547402", razonSocial: "SUMINISTROS QUIRURGICOS VETCARE S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. INDEPENDENCIA 359, PAUCARPATA, AREQUIPA" },
  "20572137652": { ruc: "20572137652", razonSocial: "FARMACIA VETERINARIA SAN FRANCISCO S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. LAMBRAMANI 396, ALTO SELVA ALEGRE, AREQUIPA" },
  "20303015818": { ruc: "20303015818", razonSocial: "COMERCIALIZADORA DE INSUMOS PECUARIOS S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. CAYMA 433, SACHACA, AREQUIPA" },
  "20510489994": { ruc: "20510489994", razonSocial: "INVERSIONES ZOOTECNICAS DEL PERU S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE UGARTE 470, AREQUIPA, AREQUIPA" },
  "20538876071": { ruc: "20538876071", razonSocial: "CLINICA DE ESPECIALIDADES FELINAS S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. MARISCAL CASTILLA 507, YANAHUARA, AREQUIPA" },
  "20454966091": { ruc: "20454966091", razonSocial: "NUTRICION ANIMAL DEL SUR E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PROGRESO 544, CAYMA, AREQUIPA" },
  "20105249994": { ruc: "20105249994", razonSocial: "ACCESORIOS Y ESTETICA CANINA PATITAS S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. SEPULVEDA 581, JOSE LUIS BUSTAMANTE Y RIVERO, AREQUIPA" },
  "20548195404": { ruc: "20548195404", razonSocial: "DROGUERIA VETERINARIA ANDINA S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. ANDRES AVELINO CACERES 618, CERRO COLORADO, AREQUIPA" },
  "20472187296": { ruc: "20472187296", razonSocial: "HOSPITAL VETERINARIO YANAHUARA S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE JERUSALEN 655, MIRAFLORES, AREQUIPA" },
  "20300909672": { ruc: "20300909672", razonSocial: "SOLUCIONES BIOMEDICAS VET S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PAUCARPATA 692, MARIANO MELGAR, AREQUIPA" },
  "20545192633": { ruc: "20545192633", razonSocial: "GRANJA Y VETERINARIA LA CAMPIÑA E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. BOLOGNESI 729, PAUCARPATA, AREQUIPA" },
  "20169515728": { ruc: "20169515728", razonSocial: "PRODUCTOS VETERINARIOS DEL PACIFICO S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. EJERCITO 766, ALTO SELVA ALEGRE, AREQUIPA" },
  "20190121241": { ruc: "20190121241", razonSocial: "COMERCIAL LOS ANDES PETS S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE MERCADERES 803, SACHACA, AREQUIPA" },
  "20277480078": { ruc: "20277480078", razonSocial: "IMPORTACIONES ZOOSALUD S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. DOLORES 840, AREQUIPA, AREQUIPA" },
  "20177462862": { ruc: "20177462862", razonSocial: "CORPORACION VETERINARIA INTEGRAL S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PARRA 877, YANAHUARA, AREQUIPA" },
  "20171830622": { ruc: "20171830622", razonSocial: "LABORATORIO CLINICO ANIMAL LAB S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. GOYENECHE 914, CAYMA, AREQUIPA" },
  "20598227404": { ruc: "20598227404", razonSocial: "DISTRIBUIDORA DE VACUNAS DEL SUR S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. SALAVERRY 951, JOSE LUIS BUSTAMANTE Y RIVERO, AREQUIPA" },
  "20471262103": { ruc: "20471262103", razonSocial: "AGROPECUARIA Y VETERINARIA CAYMA E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE SAN JUAN DE DIOS 988, CERRO COLORADO, AREQUIPA" },
  "20204319325": { ruc: "20204319325", razonSocial: "BIOTECNOLOGIA ANIMAL PERU S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. INDEPENDENCIA 135, MIRAFLORES, AREQUIPA" },
  "20282769795": { ruc: "20282769795", razonSocial: "ESTETICA Y SPA MASCOTAS VIP S.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. LAMBRAMANI 172, MARIANO MELGAR, AREQUIPA" },
  "20289083431": { ruc: "20289083431", razonSocial: "INSUMOS MEDICOS Y HOSPITALARIOS VET S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. CAYMA 209, PAUCARPATA, AREQUIPA" },
  "20505894422": { ruc: "20505894422", razonSocial: "ALIMENTOS PREMIUM PARA MASCOTAS S.A.", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE UGARTE 246, ALTO SELVA ALEGRE, AREQUIPA" },
  "20241351166": { ruc: "20241351166", razonSocial: "SERVICIOS LOGISTICOS VETERINARIOS S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. MARISCAL CASTILLA 283, SACHACA, AREQUIPA" },
  "20581581387": { ruc: "20581581387", razonSocial: "CONSULTORIO VETERINARIO MIRAFLORES E.I.R.L.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PROGRESO 320, AREQUIPA, AREQUIPA" },
  "20330103061": { ruc: "20330103061", razonSocial: "COMERCIALIZADORA EL VOLCAN PETS S.A.C.", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. SEPULVEDA 357, YANAHUARA, AREQUIPA" },
  "10712345671": { ruc: "10712345671", razonSocial: "VILLASANTE VILLASANTE SUEMY ANNE KATRINA", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. ANDRES AVELINO CACERES 394, CAYMA, AREQUIPA" },
  "10456789124": { ruc: "10456789124", razonSocial: "MENDOZA QUISPE CARLOS ALBERTO", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE JERUSALEN 431, JOSE LUIS BUSTAMANTE Y RIVERO, AREQUIPA" },
  "10123456781": { ruc: "10123456781", razonSocial: "TORRES LOPEZ MARIA FERNANDA", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PAUCARPATA 468, CERRO COLORADO, AREQUIPA" },
  "10000000006": { ruc: "10000000006", razonSocial: "OBSERVADO PRUEBA CIUDADANO", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. BOLOGNESI 505, MIRAFLORES, AREQUIPA" },
  "10730433218": { ruc: "10730433218", razonSocial: "VILLASANTE MAMANI ANA GABRIELA", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. EJERCITO 542, MARIANO MELGAR, AREQUIPA" },
  "10729600135": { ruc: "10729600135", razonSocial: "TORRES PAREDES LUIS FERNANDO", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE MERCADERES 579, PAUCARPATA, AREQUIPA" },
  "10418908381": { ruc: "10418908381", razonSocial: "HUAMAN ZEGARRA VALERIA SOFIA", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. DOLORES 616, ALTO SELVA ALEGRE, AREQUIPA" },
  "10473794026": { ruc: "10473794026", razonSocial: "RODRIGUEZ VALDIVIA JUAN DIEGO", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. PARRA 653, SACHACA, AREQUIPA" },
  "10475423513": { ruc: "10475423513", razonSocial: "PAREDES DIAZ ANA LUCIA", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. GOYENECHE 690, AREQUIPA, AREQUIPA" },
  "10726155947": { ruc: "10726155947", razonSocial: "CASTILLO VILLASANTE LUIS MIGUEL", estado: "ACTIVO", condicion: "HABIDO", direccion: "AV. SALAVERRY 727, YANAHUARA, AREQUIPA" },
  "10717816183": { ruc: "10717816183", razonSocial: "CORNEJO FLORES CAMILA ANDREA", estado: "BAJA DE OFICIO", condicion: "HABIDO", direccion: "CALLE SAN JUAN DE DIOS 764, CAYMA, AREQUIPA" },
  "10439593101": { ruc: "10439593101", razonSocial: "APAZA SALAZAR JOSE ANTONIO", estado: "SUSPENSION TEMPORAL", condicion: "NO HABIDO", direccion: "AV. INDEPENDENCIA 801, JOSE LUIS BUSTAMANTE Y RIVERO, AREQUIPA" },
  "10414131641": { ruc: "10414131641", razonSocial: "ALVAREZ APAZA DANIELA PAOLA", estado: "ACTIVO", condicion: "NO HALLADO", direccion: "AV. LAMBRAMANI 838, CERRO COLORADO, AREQUIPA" },
  "10485255341": { ruc: "10485255341", razonSocial: "CARPIO BEGAZO PEDRO PABLO", estado: "BAJA DEFINITIVA", condicion: "NO HABIDO", direccion: "AV. CAYMA 875, MIRAFLORES, AREQUIPA" },
  "10729283270": { ruc: "10729283270", razonSocial: "BUSTAMANTE ORTEGA CLAUDIA PATRICIA", estado: "ACTIVO", condicion: "HABIDO", direccion: "CALLE UGARTE 912, MARIANO MELGAR, AREQUIPA" }
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

app.get("/health", (_req, res) => res.json({ service: "pseudo-sunat", status: "UP", registros:Object.keys(padron).length }));

app.get("/api/sunat/ruc", (_req, res) => res.json({
  total: Object.keys(padron).length,
  documentos: Object.values(padron)
}));

app.get("/api/sunat/ruc/:ruc", (req, res) => {
  const empresa = padron[req.params.ruc];
  if (!empresa) return res.status(404).json({ encontrado:false, mensaje:"RUC no existe en el padrón SUNAT" });
  res.json({ encontrado:true, datos:empresa });
});

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
