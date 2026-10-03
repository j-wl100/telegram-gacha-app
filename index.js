const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Sirve los archivos HTML y estáticos de la raíz

// Conexión a MongoDB Atlas (Cambia <password> y los datos por los tuyos)
mongoose.connect('mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas con éxito"))
.catch(err => console.error("Error conectando a MongoDB:", err));

// Esquema de Usuario en Mongoose
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    saldo: { type: Number, default: 150 },
    inventario: { type: Array, default: [] }
});
const User = mongoose.model('User', userSchema);

// 1. Obtener o crear perfil del usuario
app.get('/api/usuario/:userId', async (req, res) => {
    try {
        let user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            user = new User({ userId: req.params.userId, saldo: 150, inventario: [] });
            await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Girar la ruleta (Descuenta 50 y guarda el personaje en MongoDB)
app.post('/api/ruleta', async (req, res) => {
    try {
        const { userId } = req.body;
        let user = await User.findOne({ userId });
        if (!user || user.saldo < 50) {
            return res.status(400).json({ error: "Saldo insuficiente" });
        }

        const personajesRaw = fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8');
        const personajes = JSON.parse(personajesRaw);
        const randomPersonaje = personajes[Math.floor(Math.random() * personajes.length)];

        user.saldo -= 50;
        user.inventario.push(randomPersonaje);
        await user.save();

        res.json({ success: true, personaje: randomPersonaje, nuevoSaldo: user.saldo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Comprar personaje directo en la tienda
app.post('/api/comprar', async (req, res) => {
    try {
        const { userId, personajeIndex } = req.body;
        let user = await User.findOne({ userId });
        const precio = 150;

        if (!user || user.saldo < precio) {
            return res.status(400).json({ error: "Saldo insuficiente" });
        }

        const personajesRaw = fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8');
        const personajes = JSON.parse(personajesRaw);
        const personajeElegido = personajes[personajeIndex];

        if (!personajeElegido) return res.status(400).json({ error: "Personaje no encontrado" });

        user.saldo -= precio;
        user.inventario.push(personajeElegido);
        await user.save();

        res.json({ success: true, nuevoSaldo: user.saldo, personaje: personajeElegido });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Listar usuarios (Para el comando /deleteperfil o panel admin)
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const users = await User.find({}, 'userId saldo inventario');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Borrar perfil de un usuario específico (/deleteperfil)
app.delete('/api/admin/perfil/:userId', async (req, res) => {
    try {
        await User.deleteOne({ userId: req.params.userId });
        res.json({ success: true, message: "Perfil eliminado correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Servidor en ejecución en el puerto 3000"));
