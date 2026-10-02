const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); // <- 1. Importar path para manejar carpetas
const app = express();

app.use(express.json());

// 2. Permitir que Express sirva tu archivo index.html y recursos estáticos desde la raíz
app.use(express.static(__dirname));

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

// Ruta para realizar una tirada de Gacha
app.post('/api/gacha', async (req, res) => {
  try {
    const { telegramId } = req.body;
    const costoTirada = 50; // Costo por cada tirada

    // 1. Buscar al usuario en la base de datos
    let user = await Usuario.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // 2. Verificar si tiene suficientes monedas
    if (user.monedas < costoTirada) {
      return res.status(400).json({ success: false, error: 'No tienes suficientes monedas' });
    }

    // 3. Descontar el costo de la tirada
    user.monedas -= costoTirada;

    // 4. Pool de personajes con temática Cyberpunk / Techwear
    const poolPersonajes = [
      { id: 'p_01', nombre: 'Operativo Techwear', rareza: 'Común', tipo: 'Tactical' },
      { id: 'p_02', nombre: 'Hacker Ciber-Minimalista', rareza: 'Común', tipo: 'Netrunner' },
      { id: 'p_03', nombre: 'Androide RK-Model', rareza: 'Raro', tipo: 'Cyber' },
      { id: 'p_04', nombre: 'Unidad Élite ZENITH', rareza: 'Épico', tipo: 'Legendary' }
    ];

    // 5. Sistema de probabilidades (Probabilidad ponderada)
    const rand = Math.random();
    let personajeObtenido;

    if (rand < 0.05) { 
      // 5% de probabilidad para Épico
      personajeObtenido = poolPersonajes.find(p => p.rareza === 'Épico');
    } else if (rand < 0.30) { 
      // 25% de probabilidad para Raro
      personajeObtenido = poolPersonajes.find(p => p.rareza === 'Raro');
    } else { 
      // 70% de probabilidad para Comunes
      const comunes = poolPersonajes.filter(p => p.rareza === 'Común');
      personajeObtenido = comunes[Math.floor(Math.random() * comunes.length)];
    }

    // 6. Registrar el personaje obtenido en el inventario del usuario
    user.personajes.push({
      ...personajeObtenido,
      fechaObtencion: new Date()
    });

    // 7. Guardar cambios en MongoDB Atlas
    await user.save();

    // 8. Responder a la Mini App con el resultado
    res.json({
      success: true,
      personaje: personajeObtenido,
      monedasRestantes: user.monedas,
      inventario: user.personajes
    });

  } catch (error) {
    console.error('Error al procesar la tirada del gacha:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// 3. `app.listen` va obligatoriamente al final de todo el archivo
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
