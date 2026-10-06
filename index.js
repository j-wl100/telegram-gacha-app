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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8550303174:AAGJtPRhbPtIuIM5fbR7W5tjPg7H9UilHYY";

// REGISTRO DE NUEVO USUARIO
app.post('/api/registrar', async (req, res) => {
    
