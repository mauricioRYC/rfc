const express = require("express");
const path = require("path");
const ejs = require("ejs");
const QRCode = require("qrcode");
const fs = require("fs").promises;
const bwipjs = require("bwip-js");
const puppeteer = require("puppeteer");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/assets/views"));
app.use(express.static(path.resolve(__dirname, "assets")));

app.get("/", async (req, res) => {
    const { idCIF, rfc, nombreCompleto, fecha } = req.query;
    const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idCIF}_${rfc}`;
    const qrPath = await QRCode.toString(url, {
        type: "svg",
        size: 200,
    });
    const qr = "qrcode.svg";
    const barcode = "barcode.png";
    const svgFilePath = path.join(__dirname, "assets/svg", qr);
    const barcodeFilePath = path.join(__dirname, "assets/barcodes", barcode);
    const data = {
        qrPath: `/svg/${qr}`,
        barcodePath: `/barcodes/${barcode}`,
        rfc,
        nombre: nombreCompleto,
        idCIF,
        fecha,
    };
    try {
        await fs.writeFile(svgFilePath, qrPath);
        await generateBarcode(rfc, barcodeFilePath);
        const template = path.resolve(__dirname, "./assets/views/index.ejs");
        ejs.renderFile(template, data, async function (err, html) {
            if (err) {
                console.log("ERROR EN IF: ", err, "<=");
            }
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.pdf({
                path: "./assets/rfc.pdf",
                format: "A4",
            });
            await browser.close();
        });
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        res.status(500).send("Error al generar el PDF");
    }
});

// app.get("/", async (req, res) => {
//     const { idCIF, rfc, nombreCompleto, fecha } = req.query;
//     console.log(idCIF, rfc, " jajaja");
//     const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idCIF}_${rfc}`;
//     // const qrText = await QRCode.toString(url);
//     const qrPath = await QRCode.toString(url, {
//         type: "svg",
//         size: 200,
//     });
//     const qr = "qrcode.svg";
//     const barcode = "barcode.png";
//     const svgFilePath = path.join(__dirname, "assets/svg", qr);
//     await fs.writeFile(svgFilePath, qrPath);

//     const barcodeFilePath = path.join(__dirname, "assets/barcodes", barcode);
//     await generateBarcode(rfc, barcodeFilePath);
//     const html = await ejs.renderFile(
//         path.join(__dirname, "assets/views", "index.ejs"),
//         {
//             qrPath: `/svg/${qr}`,
//             barcodePath: `/barcodes/${barcode}`,
//             rfc: rfc,
//             nombre: nombreCompleto,
//             idCIF: idCIF,
//             fecha: fecha,
//         },
//     );
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setContent(html);
//     const pdfBuffer = await page.pdf({
//         format: "A4",
//         printBackground: true,
//     });
//     await browser.close();

//     // Enviar el PDF como respuesta
//     res.contentType("application/pdf");
//     res.send(pdfBuffer);
// });

app.get("/generar-pdf", async (req, res) => {
    const { idCIF, rfc, nombreCompleto, fecha } = req.query;
    const url = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idCIF}_${rfc}`;
    const qrPath = await QRCode.toString(url, {
        type: "svg",
        size: 200,
    });
    const qr = "qrcode.svg";
    const barcode = "barcode.png";
    const svgFilePath = path.join(__dirname, "assets/svg", qr);
    await fs.writeFile(svgFilePath, qrPath);
    const barcodeFilePath = path.join(__dirname, "assets/barcodes", barcode);
    await generateBarcode(rfc, barcodeFilePath);
    const html = await ejs.renderFile(
        path.join(__dirname, "assets/views", "index.ejs"),
        {
            qrPath: `/svg/${qr}`,
            barcodePath: `/barcodes/${barcode}`,
            rfc: rfc,
            nombre: nombreCompleto,
            idCIF: idCIF,
            fecha: fecha,
        },
    );
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const { width, height } = await page.evaluate(() => {
        return {
            width: window.screen.availWidth,
            height: window.screen.availHeight,
        };
    });
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForTimeout(2000);
    const pdf = await page.pdf({ format: "letter" });
    await browser.close();

    res.contentType("application/pdf");
    res.send(pdf);
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
app.listen(8080, () => {
    console.log(`express server running on 8080`);
});
