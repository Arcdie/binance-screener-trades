const mongoose = require('mongoose');

const {
  isEmpty,
} = require('lodash');

const log = require('../../../libs/logger')(module);

const getMongooseSchema = (modelSchema = {}, modelName) => {
  try {
    if (!modelSchema || isEmpty(modelSchema)) {
      const message = 'No or empty modelSchema';
      log.warn(message);
      return false;
    }

    const mongooseSchema = {};

    Object.keys(modelSchema).forEach(keyOfSchema => {
      if (modelSchema[keyOfSchema][0]) {
        // element is array

        mongooseSchema[keyOfSchema] = [];

        const lElements = modelSchema[keyOfSchema].length;

        for (let i = 0; i < lElements; i += 1) {
          mongooseSchema[keyOfSchema][i] = {};

          const nameOfFunction = getFunctionInsteadOfString(modelSchema[keyOfSchema][i].type, modelName) || 'String';
          mongooseSchema[keyOfSchema][i].type = nameOfFunction;

          Object.keys(modelSchema[keyOfSchema][i]).forEach(key => {
            if (key === 'type') {
              return true;
            }

            if (key === 'default') {
              if (modelSchema[keyOfSchema][i][key] === 'now') {
                mongooseSchema[keyOfSchema][i][key] = Date.now;

                return true;
              }
            }

            mongooseSchema[keyOfSchema][i][key] = modelSchema[keyOfSchema][i][key];
          });
        }
      } else {
        // element is object

        mongooseSchema[keyOfSchema] = {};

        if (!modelSchema[keyOfSchema].type) {
          // element has attachment

          Object.keys(modelSchema[keyOfSchema]).forEach(i => {
            mongooseSchema[keyOfSchema][i] = {};

            const nameOfFunction = getFunctionInsteadOfString(modelSchema[keyOfSchema][i].type, modelName) || 'String';
            mongooseSchema[keyOfSchema][i].type = nameOfFunction;

            Object.keys(modelSchema[keyOfSchema][i]).forEach(key => {
              if (key === 'type') {
                return true;
              }

              if (key === 'default') {
                if (modelSchema[keyOfSchema][i][key] === 'now') {
                  mongooseSchema[keyOfSchema][i][key] = Date.now;

                  return true;
                }
              }

              mongooseSchema[keyOfSchema][i][key] = modelSchema[keyOfSchema][i][key];
            });
          });
        } else {
          const nameOfFunction = getFunctionInsteadOfString(modelSchema[keyOfSchema].type, modelName) || 'String';
          mongooseSchema[keyOfSchema].type = nameOfFunction;

          Object.keys(modelSchema[keyOfSchema]).forEach(key => {
            if (key === 'type') {
              return true;
            }

            if (key === 'default') {
              if (modelSchema[keyOfSchema][key] === 'now') {
                mongooseSchema[keyOfSchema][key] = Date.now;

                return true;
              }
            }

            mongooseSchema[keyOfSchema][key] = modelSchema[keyOfSchema][key];
          });
        }
      }
    });

    return mongooseSchema;
  } catch (error) {
    log.warn(error.message);
    console.log(error);
    return false;
  }
};

const getFunctionInsteadOfString = (functionName, modelName) => {
  let result;

  switch (functionName) {
    case 'Date': result = Date; break;
    case 'Number': result = Number; break;
    case 'String': result = String; break;
    case 'Boolean': result = Boolean; break;
    case 'ObjectId': result = mongoose.Schema.ObjectId; break;

    default: {
      log.warn(`Dont know functionName; functionName: ${functionName}, modelName: ${modelName}`); break;
    }
  }

  return result;
};

module.exports = {
  getMongooseSchema,
};
