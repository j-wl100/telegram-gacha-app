const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// Conexión a MongoDB utilizando la variable de entorno de Render
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Definir el modelo de usuario para el gacha
const usuarioSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  monedas: { type: Number, default: 100 }, // Empiezan con 100 monedas de regalo
  personajes: { type: Array, default: [] }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

// Ruta para verificar o registrar al usuario al abrir la Mini App
app.get('/api/usuario/:id', async (req, res) => {
  try {
    let user = await Usuario.findOne({ telegramId: req.params.id });
    if (!user) {
      user = new Usuario({ telegramId: req.params.id });
      await user.save();
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error en el servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
