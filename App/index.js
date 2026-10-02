const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Servir la carpeta 'app' para la interfaz web
app.use('/app', express.static('app'));
 
// Servir el archivo de personajes para que la web los lea
app.use('/personajes.json', express.static('personajes.json'));

app.get('/', (req, res) => {
    res.send('¡Servidor Gacha Activo!');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

