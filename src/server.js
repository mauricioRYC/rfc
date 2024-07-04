const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const QRCode = require("qrcode");
const fs = require("fs").promises;
const bwipjs = require("bwip-js");
const responses = require("../responses.json");
const app = express();

// Configuración de la vista y los archivos estáticos
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "assets", "views"));
app.use(express.static(path.resolve(__dirname, "assets")));

// Ruta principal
app.get("/", async (req, res) => {
    try {
        const {
            rfc,
            nombreCompleto,
            codigosPostales,
            regimenes,
            obligaciones,
            actividades,
        } = responses.data;
        const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=1234_POCE900801PV3`;
        const qrPath = await QRCode.toString(url, {
            type: "svg",
            size: 200,
        });
        const qr = "qrcode.svg";
        const barcode = "barcode.png";
        const svgFilePath = path.join(__dirname, "assets/svg", qr);
        await fs.writeFile(svgFilePath, qrPath);

        const barcodeFilePath = path.join(
            __dirname,
            "assets/barcodes",
            barcode,
        );
        await generateBarcode("POCE900801PV3", barcodeFilePath);
        const partes = nombreCompleto.trim().split(/\s+/);
        const segundoApellido = partes.pop();
        const nombre = partes.shift();
        const primerApellido = partes.join(" ");
        //!P
        const browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        data = {
            segundoApellido,
            nombre,
            primerApellido,
            actividades,
            rfc,
            qrPath: `/svg/${qr}`,
            barcodePath: `/barcodes/${barcode}`,
            idCIF: 22120114385,
            obligaciones,
            codigosPostales: codigosPostales[0].clave,
            regimenes,
            fecha: "2024/07/04",
            curp: "MATM960529HCSTMR08",
            inicioOperaciones: "05 DE JULIO 2025",
            padron: "ACTIVO",
            fechaCambio: "15 DE JUNIO 2024",
            nombreComercial: "",
            tipoVialidad: "",
            nombreVialidad: "",
            numExt: "1234",
            numInt: "RTYU",
            colonia: "SAN FRANCISCO",
            nameLocaliad: "MI CASA",
            municipio: "MI OTRA CASA",
            federativa: "MI OTRA CASA POS SI",
            entreCalle: "5ta",
            yCalle: "19a",
        };
        console.log(data, " veamos que mando");
        const content = await compile("index", data);
        const page = await browser.newPage();
        await page.setContent(content, {
            waitUntil: "networkidle2",
            timeout: 90000,
        });
        await page.waitForSelector("#detalles", { timeout: 5000 });
        await page.emulateMediaType("screen");
        const pdfPath = path.join(__dirname, "test.pdf");
        await page.evaluateHandle("document.fonts.ready");

        // Genera el PDF
        await page.pdf({
            path: "output.pdf",
            format: "A4",
            printBackground: true,
            // margin: {
            //     top: "0px",
            //     right: "0px",
            //     bottom: "0px",
            //     left: "0px",
            // },
        });
        await browser.close();
        res.status(200).json({ message: "TODO BEM" });
    } catch (e) {
        console.error("Error al generar el PDF:", e);
        res.status(500).send("Error al generar el PDF");
    }
});

app.get("/index", async (req, res) => {
    const {
        rfc,
        nombreCompleto,
        codigosPostales,
        regimenes,
        obligaciones,
        actividades,
    } = responses.data;
    const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=22120114385_${rfc}`;
    const qrPath = await QRCode.toString(url, {
        type: "svg",
        size: 200,
    });
    const qr = "qrcode.svg";
    const barcode = "barcode.png";
    const svgFilePath = path.join(__dirname, "assets/svg", qr);
    await fs.writeFile(svgFilePath, qrPath);
    const partes = nombreCompleto.trim().split(/\s+/);
    const segundoApellido = partes.pop();
    const nombre = partes.shift();
    const primerApellido = partes.join(" ");
    const barcodeFilePath = path.join(__dirname, "assets/barcodes", barcode);
    await generateBarcode(rfc, barcodeFilePath);
    console.log(obligaciones.length, "codigosPostales");
    data = {
        segundoApellido,
        nombre,
        primerApellido,
        actividades,
        rfc,
        qrPath: `/svg/${qr}`,
        barcodePath: `/barcodes/${barcode}`,
        idCIF: 22120114385,
        obligaciones,
        codigosPostales: codigosPostales[0].clave,
        regimenes,
        fecha: "2024/07/04",
        curp: "MATM960529HCSTMR08",
        inicioOperaciones: "05 DE JULIO 2025",
        padron: "ACTIVO",
        fechaCambio: "15 DE JUNIO 2024",
        nombreComercial: "",
        tipoVialidad: "",
        nombreVialidad: "",
        numExt: "1234",
        numInt: "RTYU",
        colonia: "SAN FRANCISCO",
        nameLocaliad: "MI CASA",
        municipio: "MI OTRA CASA",
        federativa: "MI OTRA CASA POS SI",
        entreCalle: "5ta",
        yCalle: "19a",
    };
    // Renderiza la página EJS
    res.render("index", data);
});

async function generateBarcode(text, outputPath) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer(
            {
                bcid: "code128",
                text: text,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: "center",
            },
            function (err, png) {
                if (err) {
                    return reject(err);
                }
                fs.writeFile(outputPath, png).then(resolve).catch(reject);
            },
        );
    });
}

async function compile(templeteName, data) {
    const filePath = path.join(
        process.cwd(),
        "src",
        "assets",
        "views",
        `${templeteName}.ejs`,
    );
    const html = await fs.readFile(filePath, "utf-8");
    return ejs.compile(html)(data);
}
// Iniciar el servidor
app.listen(8080, () => {
    console.log("Servidor Express ejecutándose en el puerto 8080");
});
