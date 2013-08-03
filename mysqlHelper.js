var mysql = require('mysql');
var util = require('../utilEx');

var escape = function (val) {
    return mysql.escape(val, config.stringifyObjects, config.timezone);
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


var pool = null;
var config = {};

exports.initPool = function (conf) {
    if (util.isString(conf)) {
        conf = require(conf);
    }
    config = util.extend({}, conf, {
        supportBigNumbers: true,
        connectionLimit: 20,
        queryFormat: queryFormat,
        timezone: '+08:00',
        stringifyObjects: false
    });
    pool = mysql.createPool(config);
};

exports.endPool = function () {
    if (!pool) {
        throw new Error("pool does not init.");
    }
    pool.end();
};

exports.getConnection = function (fromPool, conf, callback) {
    var cb = arguments[arguments.length - 1];
    if (util.isBoolean(fromPool) && !fromPool) {
        var connection = mysql.createConnection(util.extend({}, config, conf));
        connection.connect(function (e) {
            if (e) {
                return cb(e);
            }
            return cb(e, connection);
        });
    }
    if (!pool) {
        throw new Error('Pool does not init');
    }
    return pool.getConnection(cb);
};

exports.escape = escape;
exports.escapeId = mysql.escapeId;
exports.queryFormat = queryFormat;