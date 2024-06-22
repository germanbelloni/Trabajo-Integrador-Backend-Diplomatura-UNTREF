const mongoose = require("mongoose");

//Definimos el esquema y el modelo de mongoose
const mercaderiaSchema = new mongoose.Schema({
  codigo: Number,
  nombre: String,
  precio: Number,
  categoria: String,
});

const Mercaderia = mongoose.model("Mercaderia", mercaderiaSchema);

module.exports = Mercaderia;
