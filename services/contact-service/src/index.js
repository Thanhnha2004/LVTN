const express = require("express");
const cors = require("cors");
require("dotenv").config();
const contactRoutes = require("./routes/contact");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/contact", contactRoutes);

app.listen(process.env.PORT || 3004, () =>
  console.log(`Contact service running on port ${process.env.PORT || 3004}`),
);
