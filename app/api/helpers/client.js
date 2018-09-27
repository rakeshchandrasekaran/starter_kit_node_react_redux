'use strict';
const Joi = require('joi');
const humps = require('humps');
const _ = require('lodash');
const config = require('../../config');
const { axiosInterceptor, addResponseTime } = require('./axios-interceptor');
const https = require('https');
const logger = require('../../utils/logger');
const agent = new https.Agent({
  rejectUnauthorized: false
});

const axios = require('axios').create({
  httpsAgent: agent,
  timeout: config.serviceTimeout,
  maxContentLength: 1024 * 1024 * 40
});

axiosInterceptor(axios);
addResponseTime(axios);

const internals = {};
const util = require('util');

const get = function (options, context) {
  return doHttpRequest('get', options, null, context);
};

const post = function(options, body, context) {
  return doHttpRequest('post', options, body, context);
};

const patch = function(options, body, context) {
  return doHttpRequest('patch', options, body, context);
};

const put = function(options, body, context) {
  return doHttpRequest('put', options, body, context);
};

const createApiLogMessage = (requestDetails) => `${requestDetails.method ? requestDetails.method.toUpperCase() : ''} ${requestDetails.url}`;

const createApiLogMetadata = (requestDetails, responseDetails) => {
  return {
    subject: 'outgoing api call',
    statusCode: responseDetails.status,
    method: requestDetails.method,
    url: requestDetails.url,
    responseTime: responseDetails.timeTaken,
    requestHeaders: requestDetails.headers ? util.inspect(requestDetails.headers) : undefined,
    responseHeaders: responseDetails.headers ? util.inspect(responseDetails.headers) : undefined,
    params: requestDetails.params ? util.inspect(requestDetails.params) : undefined,
    responseBody: util.inspect(responseDetails.data),
    requestBody: util.inspect(requestDetails.data)
  };
};

const doHttpRequest = function(method, options, body, context) {
  return new Promise((resolve, reject) => {
    const validation = Joi.validate(options, internals.postSchema, {allowUnknown: true});
    if (validation.error) {
      return reject(validation.error);
    }

    const requestDetails = {
      method,
      url: options.url,
      params: options.params,
      headers: getHeaders(options.headers)
    };

    if((options || {}).responseType){
      requestDetails.responseType = options.responseType;
    }

    if (body) {
      requestDetails.data = humps.decamelizeKeys(body);
    }

    axios(requestDetails)
      .then(response => {
        logger.info(`API RESPONSE: ${createApiLogMessage(requestDetails)}`, createApiLogMetadata(requestDetails, response), context);

        if((options || {}).responseType === 'stream') resolve(response.data);
        else resolve(humps.camelizeKeys(response.data));
      })
      .catch(err => {
        if (err) {
          err.config = undefined;
          err.request = undefined;
        }
        if (err.response) {
          const metaData = createApiLogMetadata(requestDetails, err.response);
          metaData.stackTrace = err.stack;
          logger.error(`API ERROR: ${createApiLogMessage(requestDetails)}`, metaData, context);

          if(typeof err.response === 'object') {
            err.response.config = undefined;
            err.response.request = undefined;
          }
        }
        else {
          const metaData = Object.assign(createApiLogMetadata(requestDetails, {}), { error: err });
          logger.error(`API ERROR: ${createApiLogMessage(requestDetails)}`, metaData, context);
        }

        if(err) {
          err.message = `${err.message}; happened for ${requestDetails.method ? requestDetails.method.toUpperCase() : ''} ${requestDetails.url}`;
          err.hasBeenLogged = true;
        }

        reject(err);
      });
  });
};

const getHeaders = headers => {
  return _.defaults(headers, {
    'content-type': 'application/json'
  });
};

internals.postSchema =  Joi.object().keys({
  url: Joi.string().min(1).required(),
  headers: Joi.object()
});

internals.getSchema =  Joi.object().keys({
  url: Joi.string().min(1).required(),
  headers: Joi.object()
});

module.exports.get = get;
module.exports.post = post;
module.exports.patch = patch;
module.exports.put = put;
module.exports.getHeaders = getHeaders;
module.exports.createApiLogMetadata = createApiLogMetadata;
module.exports.createApiLogMessage = createApiLogMessage;
