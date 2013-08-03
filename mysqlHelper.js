var mysql = require('mysql');
var util = require('node-utilEx');

var pool = null;
var config = null;
var defaultConfig = {
    "supportBigNumbers": true,
    "connectionLimit": 20,
    "timezone": "+08:00",
    "stringifyObjects": false,
    "pooling": true
};

var escape = function (val, stringifyObjects, timezone) {
    return mysql.escape(val, stringifyObjects || config.stringifyObjects, timezone || config.timezone);
};

var queryFormat = function (query, values) {
    if (!values || util.isFunction(values)) return query;
    if (util.isArray(values) && /\:\?/g.test(query)) {
        return query.replace(/\:\?/g, function (txt) {
            if (values.length > 0) {
                return escape(values.shift());
            }
            return txt;
        });
    }
    return query.replace(/\:(\w+)/g, function (txt, key) {
        if (key in values) {
            return escape(values[key]);
        }
        return txt;
    });
};


var init = function (conf) {
    if (util.isString(conf)) {
        conf = require(conf);
    }
    config = util.extend({}, defaultConfig, conf, {
        queryFormat: queryFormat
    });
    if (config.pooling) {
        pool = mysql.createPool(config);
    }
};

var endPool = function () {
    if (!config || !config.pooling) {
        return;
    }
    if (!pool) {
        throw new Error("pool does not init.");
    }
    pool.end();
};

var getConnection = function (fromPool, conf, callback) {
    if (!config) {
        throw new Error('module does not init');
    }
    var cb = arguments[arguments.length - 1];
    if (!config.pooling || (util.isBoolean(fromPool) && !fromPool)) {
        var connection = mysql.createConnection(util.extend({}, config, conf));
        return connection.connect(function (e) {
            if (e) {
                return cb(e);
            }
            return cb(e, connection);
        });
    }
    return pool.getConnection(cb);
};

exports.init = init;
exports.endPool = endPool;
exports.getConnection = getConnection;
exports.escape = escape;
exports.escapeId = mysql.escapeId;
exports.queryFormat = queryFormat;