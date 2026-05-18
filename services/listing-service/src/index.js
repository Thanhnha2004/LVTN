const express = require("express");
const cors = require("cors");
require("dotenv").config();
const listingRoutes = require("./routes/listing");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/listing", listingRoutes);

app.listen(process.env.PORT || 3003, () =>
  console.log(`Listing service running on port ${process.env.PORT || 3003}`),
);
