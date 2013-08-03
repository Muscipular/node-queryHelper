var testRunner = require('nodeunit').reporters.default;
process.chdir(__dirname);
testRunner.run(['./testQueryHelper.js']);