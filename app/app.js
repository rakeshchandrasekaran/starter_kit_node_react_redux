const express =require( 'express');

const app = express();

app.use('/ctc/', routes);

module.exports = app;