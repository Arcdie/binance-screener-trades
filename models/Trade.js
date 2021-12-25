const mongoose = require('mongoose');

module.exports = {
  modelName: 'Trade',
};

module.exports.setModuleExport = (modelSchema) => {
  const Trade = new mongoose.Schema(modelSchema, { versionKey: false });
  module.exports = mongoose.model('Trade', Trade, 'trades');
  module.exports.modelSchema = modelSchema;
};
