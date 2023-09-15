const express = require('express');
const app = express();

require('dotenv').config();

const routerbase = require('./routes/routes.js');

app.use('/eps', routerbase);

const port = process.env.PORT256;

app.use(express.json());

app.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}.`);
})