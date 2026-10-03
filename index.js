
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Para enviar mensajes a Telegram
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// CONFIGURACIÓN DE MONGODB ATLAS (Reemplaza con tu enlace real)
mongoose.connect('mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas correctamente"))
.catch(err => console.error("Error de conexión a MongoDB:", err));

// Esquema de Usuario
const userSchema = new mongoose.Schema({
    telegramUser: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    edad: { type: Number, required: true },
    saldo: { type: Number, default: 100 },
    inventario: { type: Array, default: [] }
});
const User = mongoose.model('User', userSchema);

// TOKEN DE TELEGRAM (Opcional, pon tu token si deseas usar el botón de enviar a Telegram)
const TELEGRAM_BOT_TOKEN = "TU_TOKEN_DE_TELEGRAM_AQUI";

// REGISTRO DE NUEVO USUARIO
app.post('/api/registrar', async (req, res) => {
    try {
        const { telegramUser, nombre, edad } = req.body;
        let user = await User.findOne({ telegramUser });
        if (user) {
            return res.json({ success: true, user });
        }
        user = new User({ telegramUser, nombre, edad, saldo: 100, inventario: [] });
        await user.save();
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// OBTENER DATOS DE USUARIO
app.get('/api/usuario/:telegramUser', async (req, res) => {
    const user = await User.findOne({ telegramUser: req.params.telegramUser });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
});

// GIRAR RULETA (Cuesta 30 créditos, elige aleatorio de personajes.json)
app.post('/api/ruleta', async (req, res) => {
    const { telegramUser } = req.body;
    let user = await User.findOne({ telegramUser });
    const costoTirada = 30;

    if (!user || user.saldo < costoTirada) {
        return res.status(400).json({ error: "Saldo insuficiente para girar" });
    }

    const personajes = JSON.parse(fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8'));
    const randomPersonaje = personajes[Math.floor(Math.random() * personajes.length)];

    user.saldo -= costoTirada;
    user.inventario.push(randomPersonaje);
    await user.save();

    res.json({ success: true, personaje: randomPersonaje, nuevoSaldo: user.saldo });
});

// COMPRAR PERSONAJE EN TIENDA (Cuesta 100 créditos)
app.post('/api/comprar', async (req, res) => {
    const { telegramUser, personajeIndex } = req.body;
    let user = await User.findOne({ telegramUser });
    const precio = 100;

    if (!user || user.saldo < precio) {
        return res.status(400).json({ error: "Saldo insuficiente" });
    }

    const personajes = JSON.parse(fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8'));
    const personajeElegido = personajes[personajeIndex];

    user.saldo -= precio;
    user.inventario.push(personajeElegido);
    await user.save();

    res.json({ success: true, nuevoSaldo: user.saldo, personaje: personajeElegido });
});

// MINAR / RECLAMAR CRÉDITOS DIARIOS (Da 50 créditos)
app.post('/api/minar', async (req, res) => {
    const { telegramUser } = req.body;
    let user = await User.findOne({ telegramUser });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    user.saldo += 50;
    await user.save();
    res.json({ success: true, nuevoSaldo: user.saldo });
});

// ENVIAR PERSONAJE A TELEGRAM (Desde el botón "Elegir" del inventario)
app.post('/api/enviar-telegram', async (req, res) => {
    const { telegramUser, personaje } = req.body;
    // Extraer chatID o usar el usuario de telegram si es público
    try {
        const mensaje = `🎮 *PERSONAJE SELECCIONADO* 🎮\n👤 Usuario: @${telegramUser}\n🆔 ID: ${personaje.id}\n⭐ Rareza: ${personaje.rareza}\n🏷️ Categoría: #${personaje.categoria}`;
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: `@${telegramUser}`, // O un chat ID predeterminado del grupo
            text: mensaje,
            parse_mode: "Markdown"
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "No se pudo enviar a Telegram (Verifica el Token o el usuario)" });
    }
});

// PANEL ADMIN: OBTENER TODOS LOS USUARIOS
app.get('/api/admin/usuarios', async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

// PANEL ADMIN: ELIMINAR USUARIO
app.delete('/api/admin/usuario/:telegramUser', async (req, res) => {
    await User.deleteOne({ telegramUser: req.params.telegramUser });
    res.json({ success: true });
});

// PANEL ADMIN: EDITAR USUARIO
app.put('/api/admin/usuario/:telegramUser', async (req, res) => {
    const { nuevoNombre, nuevaEdad, nuevoSaldo } = req.body;
    await User.updateOne(
        { telegramUser: req.params.telegramUser },
        { $set: { nombre: nuevoNombre, edad: nuevaEdad, saldo: nuevoSaldo } }
    );
    res.json({ success: true });
});

app.listen(3000, () => console.log("Servidor corriendo en el puerto 3000"));
