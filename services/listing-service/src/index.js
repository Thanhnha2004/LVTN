const express = require('express'); const app = express(); app.use(require('express').json()); app.listen(3003, () => console.log('Listing running on 3003'));
