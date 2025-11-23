const path = require('path');
const { handleRequest } = require('../server');

module.exports = (req, res) => {
  const answersPath = process.env.ANSWERS_PATH || path.join(__dirname, '..', 'data', 'answers.json');
  return handleRequest({ req, res, answersPath });
};
