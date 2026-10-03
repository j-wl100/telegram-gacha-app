const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Conexión a MongoDB Atlas (Reemplaza con tus datos reales)
mongoose.connect('mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas"))
.catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    saldo: { type: Number, default: 150 },
    inventario: { type: Array, default: [] }
});
const User = mongoose.model('User', userSchema);

// Obtener o crear usuario
app.get('/api/usuario/:userId', async (req, res) => {
    let user = await User.findOne({ userId: req.params.userId });
    if (!user) {
        user = new User({ userId: req.params.userId, saldo: 150, inventario: [] });
        await user.save();
    }
    res.json(user);
});

// Girar la ruleta (elige aleatoriamente de personajes.json)
app.post('/api/ruleta', async (req, res) => {
    const { userId } = req.body;
    let user = await User.findOne({ userId });
    if (!user || user.saldo < 50) {
        return res.status(400).json({ error: "Saldo insuficiente" });
    }

    const personajes = JSON.parse(fs.readFileSync(path.join(__dirname, 'personajes.json'), 'utf8'));
    const randomPersonaje = personajes[Math.floor(Math.random() * personajes.length)];

    user.saldo -= 50;
    user.inventario.push(randomPersonaje);
    await user.save();

    res.json({ success: true, personaje: randomPersonaje, nuevoSaldo: user.saldo });
});

// Comprar personaje directo en la tienda
app.post('/api/comprar', async (req, res) => {
    const { userId, personajeIndex } = req.body;
    let user = await User.findOne({ userId });
    const precio = 150;

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

// Listar usuarios para administración / borrado
app.get('/api/admin/usuarios', async (req, res) => {
    const users = await User.find({}, 'userId saldo inventario');
    res.json(users);
});

// Borrar perfil de usuario
app.delete('/api/admin/perfil/:userId', async (req, res) => {
    await User.deleteOne({ userId: req.params.userId });
    res.json({ success: true });
});

app.listen(3000, () => console.log("Servidor corriendo en el puerto 3000"));
