const express = require("express");
process.loadEnvFile();
const app = express();
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const { Mercaderia, Usuario } = require("./product.js");
const connectDB = require("./database.js");
const port = process.env.PORT || 3000;
const secretKey = process.env.SECRET_KEY;

connectDB();

//Middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieParser());

//Ruta Principal
app.get("/", (req, res) => {
  res.render("index");
});

//Registro
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const nuevoUsuario = new Usuario({ ...req.body });
  try {
    await nuevoUsuario.save();
    res.status(201).redirect("/");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error, no se pudo añadir el usuario", error });
  }
});

//Login
app.get("/login", (req, res) => {
  res.render("login");
});

//Login generación JWT
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Datos recibidos: usuario: ${username}, password: ${password}`);
  //Autenticacion del usuario
  const user = await Usuario.findOne({ username, password });

  if (!user) {
    return res.status(401).render("login");
  } else {
    const token = jwt.sign({ username }, secretKey, { expiresIn: "365d" });
    res.cookie("token", token, { httpOnly: true, secure: false });
    res.render("index");
  }
});

//Verificación del token JWT
const verifyToken = (req, res, next) => {
  const token =
    req.cookies.token || req.headers["authorization"]?.split(" ")[1];
  console.log(req.cookies.token);
  if (!token) return res.status(401).redirect("/");

  //Verificacion del token
  jwt.verify(token, secretKey, (err, decoded) => {
    err ? res.status(401).render("index") : (req.decoded = decoded);
    next();
  });
};

//Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).redirect("/");
});

//1. Obtener todos los productos (Ruta protegida por token)
app.get("/productos", verifyToken, async (req, res) => {
  try {
    const mercaderia = await Mercaderia.find();
    mercaderia ? res.render("products", { mercaderia }) : res.render("404");
  } catch (error) {
    res.status(500).send("Error al buscar los productos");
  }
});

//4. Agregar un producto
app.get("/productos/add", verifyToken, async (req, res) => {
  return res.render("addProduct");
});

app.post("/productos", verifyToken, async (req, res) => {
  // Encontrar el máximo código actual
  const maxCodigo = await Mercaderia.findOne()
    .sort({ codigo: -1 })
    .select("codigo");

  // Generar un nuevo código único
  const nuevoCodigo = maxCodigo ? maxCodigo.codigo + 1 : 1;

  const nuevaMercaderia = new Mercaderia({ ...req.body, codigo: nuevoCodigo });
  try {
    await nuevaMercaderia.save();
    res.status(201).redirect("/productos");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error, no se pudo añadir el producto", error });
  }
});

//2.Obtener un producto por ID (Ruta protegida por token)
app.get("/productos/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const producto = await Mercaderia.findById(id);
  producto
    ? res.render("product", { producto })
    : res.status(404).render("404");
});

//2b. Obtener un producto por codigo
app.get("/productos/codigo/:codigo", verifyToken, async (req, res) => {
  const { codigo } = req.params;
  const codigoEnNumero = parseInt(codigo);

  try {
    const productos = await Mercaderia.find({
      codigo: codigoEnNumero,
    });

    productos
      ? res.render("product_filter", { productos })
      : res.status(404).render("404");
  } catch (error) {
    res.status(500).json({ message: "Error al buscar el producto" });
  }
});

//3. Filtrar productos
app.get("/productos/nombre/:nombre", async (req, res) => {
  const { nombre } = req.params;

  try {
    const productos = await Mercaderia.find({
      nombre: new RegExp(nombre, "i"), // Búsqueda insensible a mayúsculas/minúsculas
    });

    if (productos.length > 0) {
      res.render("product_filter", { productos });
    } else {
      res.status(404).render("404");
    }
  } catch (error) {
    res.status(500).json({ message: "Error al buscar el producto" });
  }
});

//5. Modificar el precio de un producto
app.get("/productos/edit/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await Mercaderia.findById(id);
    if (!producto) {
      return res.status(404).render("404");
    }
    return res.render("editProduct", { producto });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Hubo un error al obtener el producto" });
  }
});

app.patch("/productos/edit/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const precioModificado = await Mercaderia.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!precioModificado) {
      return res.status(404).render("404");
    } else {
      res.status(200).redirect("/productos");
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
    const mercaderia = await Mercaderia.findByIdAndDelete(id);
    console.log(mercaderia);
    mercaderia ? res.redirect("/productos") : res.status(404).render("404");
  } catch (error) {
    return res.status(500).json({ message: "Error al borrar el producto" });
  }
});

app.get("*", (req, res) => {
  res.render("404");
});

//Listen::port
app.listen(port, () => {
  console.log(`API corriendo en el puerto http://localhost:${port}`);
});
