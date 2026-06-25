const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const notificationRoutes = require("./routes/notifications");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

app.listen(process.env.PORT || 3001, () =>
  console.log(`Auth service running on port ${process.env.PORT || 3001}`),
);
