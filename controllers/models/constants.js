const mongoose = require('mongoose');

const { modelSchema } = require('../../models/Trade');

const modelSchemasForInstruments = new Map();

module.exports = {
  modelSchemasForInstruments,
};

module.exports.setInstrumentsModels = (instrumentsDocs = []) => {
  instrumentsDocs.forEach(doc => {
    const Trade = new mongoose.Schema(modelSchema, { versionKey: false });
    const mongooseModel = mongoose.model(`Trade${doc.name}`, Trade, `${doc.name.toLowerCase()}-trades`);
    modelSchemasForInstruments.set(doc.name, mongooseModel);
  });
};
