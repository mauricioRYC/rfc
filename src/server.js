const express = require("express");
const path = require("path");
const ejs = require("ejs");
const QRCode = require("qrcode");
const fs = require("fs").promises;
const puppeteer = require("puppeteer");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "assets/views"));
app.use(express.static(path.resolve(__dirname, "assets")));

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
