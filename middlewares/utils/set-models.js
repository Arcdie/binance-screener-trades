const fs = require('fs');
const path = require('path');

const log = require('../../libs/logger')(module);

const {
  getAllModels,
} = require('../../controllers/models/utils/get-all-models');

const {
  getMongooseSchema,
} = require('../../controllers/models/utils/get-mongoose-schema');

const {
  getActiveInstruments,
} = require('../../controllers/instruments/utils/get-active-instruments');

module.exports = (async () => {
  try {
    const resultRequestGetModels = await getAllModels();

    if (!resultRequestGetModels || !resultRequestGetModels.status) {
      const message = resultRequestGetModels.message || 'Cant getAllModels';

      log.warn(message);
      throw new Error(message);
    }

    const models = resultRequestGetModels.result;

    if (!models || !models.status || !models.result || !models.result.length) {
      const message = models.message || 'No models';

      log.warn(message);
      throw new Error(message);
    }

    const pathToModelsFolder = path.join(__dirname, '../../models');

    fs
      .readdirSync(pathToModelsFolder)
      .forEach(fileName => {
        const Model = require(`${pathToModelsFolder}/${fileName}`);
        const targetModel = models.result.find(model => model.modelName === Model.modelName);

        if (!targetModel) {
          const message = `No targetModel; fileName: ${fileName}, modelName: ${Model.modelName}`;

          log.warn(message);
          throw new Error(message);
        }

        const mongooseSchema = getMongooseSchema(targetModel.modelSchema, targetModel.modelName);
        Model.setModuleExport(mongooseSchema);
      });

    const resultRequestGetActiveInstruments = await getActiveInstruments({
      isOnlyFutures: true,
    });

    if (!resultRequestGetActiveInstruments || !resultRequestGetActiveInstruments.status) {
      log.warn(resultRequestGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    const resultGetActiveInstruments = resultRequestGetActiveInstruments.result;

    if (!resultGetActiveInstruments || !resultGetActiveInstruments.status) {
      log.warn(resultGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    // create model for every instrument

    const {
      setInstrumentsModels,
    } = require('../../controllers/models/constants');

    setInstrumentsModels(resultGetActiveInstruments.result || []);
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
});
