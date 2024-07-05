const fs = require('fs');
const path = require('path');

// Ruta a tu imagen
const imagePath = path.join(__dirname, 'src/assets/svg/test.png');

// Leer la imagen y convertirla a base64
const imageBase64 = fs.readFileSync(imagePath, 'base64');

// Crear el string base64 completo
const base64Image = `data:image/png;base64,${imageBase64}`;

console.log(base64Image);
