const express = require('express');
const cors = require('cors');
require('dotenv').config();
const propertyRoutes = require('./routes/property');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/property', propertyRoutes);

app.use((err, req, res, next) => {
  console.error('ERROR:', JSON.stringify(err, null, 2), err.message, err.stack);
  res.status(500).json({ message: err.message });
});

app.listen(process.env.PORT || 3002, () =>
  console.log(`Property service running on port ${process.env.PORT || 3002}`)
);