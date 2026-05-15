const express = require('express'); const app = express(); app.use(require('express').json()); app.listen(3004, () => console.log('Contact running on 3004'));
