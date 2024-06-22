const mongoose = require("mongoose");
require("dotenv").config();

//Obtenemos la URI desde las variables de entorno
const URI = process.env.MONGODB_URLSTRING;
const DATABASE_NAME = process.env.DATABASE_NAME;

//Conectamos a MongoDB usando Mongoose
const connectDB = () => {
  return mongoose
    .connect(URI + DATABASE_NAME)
    .then(() => console.log("Estas conectado a MongoDB"))
    .catch((err) => console.log("Error al conectarse : ", err));
};

module.exports = connectDB;
