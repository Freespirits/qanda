const { handleRequest, resolveAnswersPath } = require('../server');

module.exports = (req, res) => {
  const answersPath = resolveAnswersPath();
  return handleRequest({ req, res, answersPath });
};
