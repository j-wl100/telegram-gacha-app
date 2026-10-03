// En lugar de poner el link directo, usa esto en tu index.js:
const mongoURI = process.env.MONGO_URI; // Asegúrate que la Key en Render se llame MONGO_URI

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas con éxito"))
.catch(err => console.error("Error conectando a MongoDB:", err));
