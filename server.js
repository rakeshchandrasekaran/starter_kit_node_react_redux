const app = require('./app/app');
const colors = require('colors');

const server = app.listen(9898);
console.log(colors.green(`INFO::server started on port 9898`));


const shutdown = function() {
    console.log(colors.yellow('WARN::************shutting down server**************'));
    server.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);