const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const queryRoutes = require("./routes/queryRoutes");
const authRoutes = require("./routes/authRoutes");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use("/api", queryRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

module.exports = app;
