const express = require("express");
const path = require("path");
const ejs = require("ejs");
const QRCode = require("qrcode");
const fs = require("fs").promises;
const bwipjs = require('bwip-js');
const puppeteer = require("puppeteer");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "assets/views"));
app.use(express.static(path.resolve(__dirname, "assets")));

app.get("/", async (req, res) => {
    const { idCIF, rfc, nombreCompleto, fecha } = req.query;
    console.log(idCIF, rfc, " jajaja");
    const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idCIF}_${rfc}`;
    // const qrText = await QRCode.toString(url);
    const qrPath = await QRCode.toString(url, {
        type: "svg",
        size: 200,
    });
    const qr = "qrcode.svg";
    const svgFilePath = path.join(__dirname, "assets/svg", qr);
    await fs.writeFile(svgFilePath, qrPath);

    const barcodeFilePath = path.join(__dirname, 'assets/barcodes', 'barcode.png');
    await generateBarcode(rfc, barcodeFilePath);


    res.render("index", {
        qrPath: qr,
        barcodePath: 'assets/barcodes/barcode.png',
        rfc: rfc,
        nombre: nombreCompleto,
        idCIF: idCIF,
        fecha: fecha,
    });
});

async function generateBarcode(text, outputPath) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: text,            // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: true,     // Show human-readable text
            textxalign: 'center',  // Always good to set this
        }, function (err, png) {
            if (err) {
                return reject(err);
            }
            fs.writeFile(outputPath, png)
                .then(resolve)
                .catch(reject);
        });
    });
}

/**
 *  const { idCIF, rfc } = req.params;
app.get("/generate-pdf", async (req, res) => {
    try {
        const { idCIF, rfc, nombreCompleto, fecha } = req.query;
        const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idCIF}_${rfc}`;
        const qrPath = await QRCode.toString(url, {
            type: "svg",
            size: 200,
        });
        const qr = "qrcode.svg";
        const svgFilePath = path.join(__dirname, "assets/svg", qr);
        await fs.writeFile(svgFilePath, qrPath);
        const html = await res.render("index.ejs", {
            idCIF,
            rfc,
            nombre: nombreCompleto,
            fecha,
        });
        const browser = await puppeteer.launch({
            headless: false, 
            args: ["--start-maximized"], 
        });

        console.log("Navegador abierto.");

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        console.log("Contenido de la página establecido.");

        const pdf = await page.pdf({
            format: "letter",
            printBackground: true,
            margin: {
                top: "0.5in",
                right: "0.5in",
                bottom: "0.5in",
                left: "0.5in",
            },
        });

        await browser.close();
        console.log("Navegador cerrado.");

        // Configurar la respuesta del PDF
        res.contentType("application/pdf");
        res.send(pdf);
    } catch (error) {
        console.log(error, " error en algo la ptm");
        res.status(500).send("Error al generar el PDF");
    }
});

app.listen(8080, () => {
    console.log(`express server running on 8080`);
});
