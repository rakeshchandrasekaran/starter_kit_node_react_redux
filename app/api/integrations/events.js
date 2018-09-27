const httpClient = require('../helpers/client');

module.exports.getEvents = (customerId, loanNumber, context) => {
    const options = {};
    return httpClient.get(options, context);
};