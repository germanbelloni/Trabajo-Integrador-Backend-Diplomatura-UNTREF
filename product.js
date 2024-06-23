const mongoose = require("mongoose");

//Definimos el esquema y el modelo de mongoose
const mercaderiaSchema = new mongoose.Schema({
  codigo: Number,
  nombre: String,
  precio: Number,
  categoria: String,
});

const usuariosSchema = new mongoose.Schema({
  username : String, 
  password : String, 
  email : String,
})

const Mercaderia = mongoose.model("Mercaderia", mercaderiaSchema);
const Usuario = mongoose.model("Usuario", usuariosSchema)

module.exports = {
  Mercaderia,
  Usuario,
}
