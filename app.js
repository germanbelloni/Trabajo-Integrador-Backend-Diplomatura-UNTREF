const express = require("express");
process.loadEnvFile();
const app = express();
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { Mercaderia, Usuario } = require("./product.js");
const connectDB = require("./database.js");
const { v4: uuidv4 } = require("uuid");
const port = process.env.PORT || 3000;
const secretKey = process.env.SECRET_KEY;

connectDB();

//Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
    },
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//Login del usuario donde se genera el JWT
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Datos recibidos: usuario: ${username}, password: ${password}`);
  //Autenticacion del usuario
  const user = await Usuario.findOne({ username, password });

  if (!user) {
    return res.status(401).send({ error: "Credenciales invalidas" });
  } else {
    const token = jwt.sign({ username }, secretKey, { expiresIn: "365d" });
    // return res.json({ token });
    res.cookie("token", token, { httpOnly: true, secure: false });

    res.json({message: 'Inicio de sesion exitoso'})
  }
});

//Midlleware para verificar el token JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  //Verificacion del token
  jwt.verify(token, secretKey, (err, decoded) => {
    err
      ? res.status(401).json({ error: "Invalid token" })
      : (req.decoded = decoded);
    next();
  });
};

//1. Obtener todos los productos (Ruta protegida por token)
app.get("/productos", verifyToken, async (req, res) => {
  const { categoria } = req.query;
  const query = !categoria
    ? {}
    : { categoria: { $regex: categoria, $options: "i" } };
  try {
    const mercaderia = await Mercaderia.find(query);
    mercaderia
      ? res.json(mercaderia)
      : res
          .status(404)
          .json({ message: "No se encontraron productos de esa categoria" });
  } catch (error) {
    res.status(500).send("Error al buscar los productos");
  }
});

//2.Obtener un producto (Ruta protegida por token)
app.get("/productos/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const mercaderia = await Mercaderia.findById(id);
  mercaderia
    ? res.json(mercaderia)
    : res.status(404).json({ message: "Producto no encontrado" });
});

app.get("/productos/:codigo", verifyToken, async (req, res) => {
  const codigo = Number(req.params.codigo);

  if (isNaN(codigo)) {
    return res.status(400).json({ message: "Código de producto inválido" });
  }
  try {
    const mercaderia = await Mercaderia.findOne({ codigo });
    mercaderia
      ? res.json(mercaderia)
      : res.status(404).json({ message: "Producto no encontrado" });
  } catch (error) {
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

//3. Filtrar productos
app.get("/productos/nombre/:nombre", verifyToken, async (req, res) => {
  const { nombre } = req.params;

  try {
    const nombreMercaderia = await Mercaderia.find({
      nombre: new RegExp(nombre, "i"),
    });
    nombreMercaderia
      ? res.json(nombreMercaderia)
      : res.status(404).json({ message: "Error al buscar el producto" });
  } catch (error) {
    res.status(500).json({ message: "Error al buscar el producto" });
  }
});

//4. Agregar un producto
app.post("/productos", verifyToken, async (req, res) => {
  const nuevaMercaderia = new Mercaderia({ ...req.body, codigo: uuidv4() });
  try {
    await nuevaMercaderia.save();
    res.status(201).json(nuevaMercaderia);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error, no se pudo añadir el producto", error });
  }
});

//5. Modificar el precio de un producto
app.patch("/productos/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const precioModificado = await Mercaderia.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!precioModificado) {
      return res
        .status(404)
        .json({ message: "Producto no encontrado para cambiar su precio" });
    } else {
      res.json({
        message: "Precio modificado parcialmente con exito",
        precioModificado,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Hubo un error al modificar el producto" });
  }
});

//6. Borrar un producto
app.delete("/productos/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const productoBorrado = await Mercaderia.findByIdAndDelete(id);
    productoBorrado
      ? res.json({ message: "Producto borrado con exito" })
      : res
          .status(404)
          .json({ message: "No se encontro el producto para borrar" });
  } catch (error) {
    return res.status(500).json({ message: "Error al borrar el producto" });
  }
});

app.listen(port, () => {
  console.log(`API corriendo en el puerto http://localhost:${port}`);
});
