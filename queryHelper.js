var util = require('node-utilEx');
var mysqlHelper = require('./mysqlHelper');
//var q = require('q');

var SQLBuilderBase = function (model) {
    if (model && util.isFunction(model)) {
        this._model = model;
        this.tableName(model.tableName || "");
    }
    this._field = ['*'];
    this._where = '';
};

SQLBuilderBase.prototype = {
    tableName: function (tableName) {
        if (tableName) {
            this._tableName = mysqlHelper.escapeId(tableName);
        }
        return this;
    },
    field: function (field, isRaw) {
        this._field = field;
        return this;
    },
    _buildField: function () {
        var field = this._field;
        if (!field || field.length == 0 || field[0].trim() == '*') {
            return '*';
        }
        if (!util.isArray(field)) {
            return field;
        }
        var r = [], i = 0, len = field.length;
        for (; i < len; i++) {
            var f = field[i].trim().split(' ');
            util.forEach(f, function (v, i) {
                f[i] = v ? mysqlHelper.escapeId(v) : '';
            });
            r.push(util.joinEx(f, ' '));
        }
        return util.joinEx(r, ',');
    },
    where: function (where, data) {
        if (where) {
            this._where = mysqlHelper.queryFormat(where, data);
        }
        return this;
    },
    _buildSql: function () {
        throw new Error('not implement.');
    },
    _query: function (data, callback) {
        var sql = this._buildSql();
        mysqlHelper.getConnection(function (e, connection) {
            if (e) {
                console.log(e.message);
                return callback(e);
            }
            return connection.query(sql, data, function (e, results, fields) {
                connection.end();
                if (e) {
                    console.log(sql);
                    return callback(e);
                }
                return callback(e, results, fields);
            })
        });
    }
};

var Query = function (model, alias) {
    this.base()(model);
    this.alias(alias);
    this._joinAs = [];
    this._orderBy = '';
    this._groupBy = '';
    this._having = '';
};

Query.prototype = {
    tableName: function (tableName, alias) {
        this.base().tableName(tableName);
        if (alias) {
            this.alias(alias);
        }
        return this;
    },
    alias: function (alias) {
        this._alias = alias ? mysqlHelper.escapeId(alias) : '';
        return this;
    },
    joinAs: function (tableName, joinCondition, alias, data) {
        if (arguments.length == 3 && typeof alias !== 'string') {
            data = alias;
            alias = null;
        } else if (typeof tableName === 'object' && arguments.length == 1) {
            joinCondition = tableName.joinCondition;
            data = tableName.data;
            alias = tableName.alias;
            tableName = tableName.tableName;
        }
        if (!tableName || !joinCondition || typeof tableName !== "string" || typeof joinCondition !== "string") {
            throw new Error('joinAs argument is invalid');
        }
        this._joinAs.push(' join ' + mysqlHelper.escapeId(tableName) + ' ' + ( alias ? mysqlHelper.escapeId(alias) : '') +
            ' on ' + mysqlHelper.queryFormat(joinCondition, data) + ' ');
        return this;
    },
    orderBy: function (orderBy, data) {
        this._orderBy = mysqlHelper.queryFormat(orderBy, data);
        return this;
    },
    groupBy: function (groupBy, data) {
        this._groupBy = mysqlHelper.queryFormat(groupBy, data);
        return this;
    },
    having: function (having, data) {
        this._having = mysqlHelper.queryFormat(having, data);
        return this;
    },
    range: function (limit, start) {
        start = start || 0;
        if (util.isNumber(limit) && util.isNumber(start)) {
            this._limit = util.format(' limit %d , %d ', start, limit);
        }
        return this;
    },
    query: function (data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        return this._query(data, callback);
    },
    queryModel: function (data, callback) {
        if (typeof this._model !== 'function') {
            callback(new Error('model does not set up.'));
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        var self = this;
        return this.query(data, function (e, result) {
            if (e) {
                return callback(e);
            }
            for (var i = 0, len = result.length; i < len; i++) {
                result[i] = new self._model(result[i]);
            }
            return callback(e, result);
        });
    },
    getModelList: function (where, data, callback) {
        if (typeof where === 'function') {
            callback = where;
            where = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        return this.where(where, data).queryModel(callback);
    },
    getFirst: function (where, data, callback) {
        if (typeof where === 'function') {
            callback = where;
            where = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        return this.where(where, data).range(1, 0).queryModel(function (e, result) {
            if (e) {
                return callback(e);
            }
            return callback(e, result[0]);
        });
    },
    scalar: function (where, data, callback) {
        if (typeof where === 'function') {
            callback = where;
            where = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        return this.range(1, 0).where(where, data).query(function (e, result, fields) {
            if (e) {
                return callback(e);
            }
            var obj = result[0];
            var field = fields[0];
            if (obj && field) {
                return callback(e, obj[field.name]);
            }
            return callback(e, null);
        });
    },
    count: function (where, data, callback) {
        if (typeof where === 'function') {
            callback = where;
            where = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        return this.field("count(1)").scalar(where, data, function (e, result) {
            if (e) {
                return callback(e);
            }
            return callback(e, parseInt(result));
        });
    },
    _buildSql: function () {
        return "select " + this._buildField() +
            ' from ' + this._tableName + ' ' + this._alias + ' ' +
            util.joinEx(this._joinAs, ' ') +
            (this._where ? ' where ' : '') + this._where +
            (this._groupBy ? ' group by ' : '') + this._groupBy +
            (this._orderBy ? ' order by ' : '') + this._orderBy +
            (this._having ? ' having ' : '') + this._having +
            (this._limit ? this._limit : '');
    }
};

var Insert = function (model) {
    this.base()(model);
    if (model && model.hasOwnProperty('fields')) {
        this.field(model.fields);
    }
    this._data = [];
};

Insert.prototype = {
    where: function () {
        throw new Error('not support');
    },
    _buildValues: function (object, mapping) {
        if (!util.isArray(object)) {
            object = [object];
        }
        var self = this;
        util.forEach(object, function (v) {
            if (mapping) {
                self._data.push("(" + mysqlHelper.queryFormat(mapping, v) + ")");
            } else {
                var r = [];
                util.forEach(self._field, function (f) {
                    r.push(mysqlHelper.escape(v[f]));
                });
                self._data.push('(' + util.joinEx(r, ',') + ')');
            }
        });
    },
    insert: function (object, mapping, callback) {
        if (util.isFunction(mapping)) {
            callback = mapping;
            mapping = undefined;
        }
        this._buildValues(object, mapping);
        return this._query(undefined, callback);
    },
    _buildSql: function () {
        return 'insert into ' + this._tableName + ' (' + this._buildField() + ")values" + util.joinEx(this._data, ',');
    }
};

var Update = function (model) {
    this.base()(model);
    if (model && model.hasOwnProperty('fields')) {
        this.field(model.fields);
    }
};

Update.prototype = {
    _buildValues: function (v, mapping) {
        var self = this;
        if (mapping) {
            self._data = mysqlHelper.queryFormat(mapping, v);
        } else if (util.isString(v)) {
            self._data = v;
        } else {
            var r = '';
            var number = self._field.length - 1;
            util.forEach(self._field, function (f, i) {
                r += mysqlHelper.escapeId(f) + '=' + mysqlHelper.escape(v[f]);
                if (i < number) {
                    r += ',';
                }
            });
            self._data = r;
        }
    },
    update: function (value, mapping, callback) {
        if (util.isFunction(mapping)) {
            callback = mapping;
            mapping = undefined;
        }
        this._buildValues(value, mapping);
        return this._query(undefined, callback);
    },
    _buildSql: function () {
        return 'update ' + this._tableName + ' set ' + this._data + (this._where ? ' where ' : '') + this._where;
    }
};

var Delete = function (model) {
    this.base()(model);
};

Delete.prototype = {
    delete: function (data, callback) {
        return this._query(data, callback);
    },
    _buildSql: function () {
        return 'delete from ' + this._tableName + (this._where ? ' where ' : '') + this._where;
    }
};


util.inheritEx(Query, SQLBuilderBase);
util.inheritEx(Insert, SQLBuilderBase);
util.inheritEx(Update, SQLBuilderBase);
util.inheritEx(Delete, SQLBuilderBase);

exports.Query = Query;
exports.Insert = Insert;
exports.Update = Update;
exports.Delete = Delete;


