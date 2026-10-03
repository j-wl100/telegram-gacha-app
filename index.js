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

// REGISTRO DE NUEVO USUARIO (CORREGIDO)
app.post('/api/registrar', async (req, res) => {
    try {
        const { telegramUser, nombre, edad } = req.body;
        if (!telegramUser || !nombre || !edad) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
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

// GIRAR RULETA (GACHA DE PERSONAJES)
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

// RECOMPENSA DIARIA
app.post('/api/diario', async (req, res) => {
    try {
        const { telegramUser } = req.body;
        let user = await User.findOne({ telegramUser });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        user.saldo += 100;
        await user.save();
        res.json({ success: true, nuevoSaldo: user.saldo, mensaje: "¡Recompensa diaria reclamada! +$100" });
    } catch (e) {
        res.status(500).json({ error: "Error al reclamar diario" });
    }
});

// MINAR CRÉDITOS
app.post('/api/minar', async (req, res) => {
    try {
        const { telegramUser } = req.body;
        let user = await User.findOne({ telegramUser });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        user.saldo += 50;
        await user.save();
        res.json({ success: true, nuevoSaldo: user.saldo, mensaje: "¡Has minado con éxito! +$50" });
    } catch (e) {
        res.status(500).json({ error: "Error al minar créditos" });
    }
});

// CRIMEN (RIESGO / RECOMPENSA)
app.post('/api/crimen', async (req, res) => {
    try {
        const { telegramUser } = req.body;
        let user = await User.findOne({ telegramUser });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        const exito = Math.random() < 0.5;
        let cambio = 0;
        let mensaje = "";

        if (exito) {
            cambio = Math.floor(Math.random() * 80) + 20;
            user.saldo += cambio;
            mensaje = `[ ÉXITO ] Operación ilegal completada. Ganaste +$${cambio}`;
        } else {
            cambio = Math.floor(Math.random() * 40) + 10;
            if (user.saldo < cambio) cambio = user.saldo;
            user.saldo -= cambio;
            mensaje = `[ FRACASO ] La policía te interceptó. Perdiste -$${cambio}`;
        }
        await user.save();
        res.json({ success: true, nuevoSaldo: user.saldo, mensaje });
    } catch (e) {
        res.status(500).json({ error: "Error al ejecutar el crimen" });
    }
});

// APOSTAR CANTIDAD
app.post('/api/apostar', async (req, res) => {
    try {
        const { telegramUser, cantidad } = req.body;
        let user = await User.findOne({ telegramUser });
        const monto = parseInt(cantidad);

        if (!user || monto <= 0 || isNaN(monto)) {
            return res.status(400).json({ error: "Cantidad inválida" });
        }
        if (user.saldo < monto) {
            return res.status(400).json({ error: "No tienes suficiente saldo para apostar esa cantidad" });
        }

        const gana = Math.random() < 0.45;
        let mensaje = "";

        if (gana) {
            user.saldo += monto;
            mensaje = `[ APUESTA GANADA ] ¡Duplicaste tu apuesta! +$${monto}`;
        } else {
            user.saldo -= monto;
            mensaje = `[ APUESTA PERDIDA ] La suerte no estuvo de tu lado. -$${monto}`;
        }
        await user.save();
        res.json({ success: true, nuevoSaldo: user.saldo, mensaje });
    } catch (e) {
        res.status(500).json({ error: "Error al procesar la apuesta" });
    }
});

// COMPRAR PERSONAJE EN TIENDA (ACTUALIZADO CON ID Y PRECIOS)
app.post('/api/comprar', async (req, res) => {
    try {
        const { telegramUser, personajeId } = req.body;
        let user = await User.findOne({ telegramUser });

        const personajes = JSON.parse(fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8'));
        // Buscar el personaje por su ID en lugar de index
        const personajeElegido = personajes.find(p => p.id === personajeId);

        if (!personajeElegido) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }

        // Leer el precio del JSON (si no tiene, cuesta 100 por defecto)
        const precio = personajeElegido.precio || 100;

        if (!user || user.saldo < precio) {
            return res.status(400).json({ error: "Saldo insuficiente" });
        }

        user.saldo -= precio;
        user.inventario.push(personajeElegido);
        await user.save();

        res.json({ success: true, nuevoSaldo: user.saldo, personaje: personajeElegido });
    } catch (e) {
        res.status(500).json({ error: "Error al procesar compra" });
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
