const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// CONEXIÓN A MONGODB USANDO LAS VARIABLES DE ENTORNO DE RENDER (MONGO_URI)
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "TU_TOKEN_DE_TELEGRAM_AQUI";

// REGISTRO DE NUEVO USUARIO
app.post('/api/registrar', async (req, res) => {
    try {
        const { telegramUser, nombre, edad } = req.body;
        if (!telegramUser || !nombre || !edad) {
            return.status(400).json({ error: "Faltan datos obligatorios" });
        }
        let user = await User.findOne({ telegramUser });
        if (user) {
            return res.json({ success: true, user });
        }
        user = new User({ telegramUser, nombre, edad, saldo: 100, inventario: [] });
        await user.save();
        res.json({ success: true, user });
    } catch (err) {
        console.error("Error al registrar:", err);
        res.status(500).json({ error: "Error en el servidor al registrar" });
    }
});

// OBTENER DATOS DE USUARIO
app.get('/api/usuario/:telegramUser', async (req, res) => {
    try {
        const user = await User.findOne({ telegramUser: req.params.telegramUser });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Error del servidor" });
    }
});

// GIRAR RULETA
app.post('/api/ruleta', async (req, res) => {
    try {
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
    } catch (e) {
        res.status(500).json({ error: "Error al girar la ruleta" });
    }
});

// COMPRAR PERSONAJE EN TIENDA
app.post('/api/comprar', async (req, res) => {
    try {
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
    } catch (e) {
        res.status(500).json({ error: "Error al procesar compra" });
    }
});

// MINAR / RECLAMAR CRÉDITOS
app.post('/api/minar', async (req, res) => {
    try {
        const { telegramUser } = req.body;
        let user = await User.findOne({ telegramUser });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        user.saldo += 50;
        await user.save();
        res.json({ success: true, nuevoSaldo: user.saldo });
    } catch (e) {
        res.status(500).json({ error: "Error al minar créditos" });
    }
});

// ENVIAR A TELEGRAM
app.post('/api/enviar-telegram', async (req, res) => {
    const { telegramUser, personaje } = req.body;
    try {
        const mensaje = `🎮 *PERSONAJE SELECCIONADO* 🎮\n👤 Usuario: @${telegramUser}\n🆔 ID: ${personaje.id}\n⭐ Rareza: ${personaje.rareza}\n🏷️ Categoría: #${personaje.categoria}`;
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: `@${telegramUser}`,
            text: mensaje,
            parse_mode: "Markdown"
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "No se pudo enviar a Telegram" });
    }
});

// PANEL ADMIN: OBTENER USUARIOS
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

// PANEL ADMIN: ELIMINAR USUARIO
app.delete('/api/admin/usuario/:telegramUser', async (req, res) => {
    try {
        await User.deleteOne({ telegramUser: req.params.telegramUser });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
