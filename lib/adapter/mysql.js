"use strict";
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var drivers = {
    mysql: require('mysql'),
    mysql2: require('mysql2')
};

var Pool = function(pool){
    this.pool = pool;
};

var Query = function(query){
    var self = this;
    var affectedRows = 0;
    query
        .on('error', function(err){
            self.emit('error', err);
        })
        .on('fields', function(fields){
            self.emit('fields', fields);
        })
        .on('result', function(row){
            affectedRows++;
            self.emit('result', row);
        })
        .on('end', function(){
            self.emit('end', {
                affectedRows: affectedRows
            })
        })
};

util.inherits(Query, EventEmitter);

var Connection = function(conn){
    this.connection = conn;
};

Connection.prototype = {
    query: function(sql, data){
        this.connection.query()
    }
};

Pool.prototype = {
    getConnection: function(callback){
        this.pool.getConnection(function(err, conn){
            if(err){
                callback(err);
                return;
            }
            callback(undefined, new Connection(conn));
        });
    }
};

var Adapter = function(type){
    this.driver = drivers[type];
};

Adapter.prototype = {
    getConnection: function(conf, callback){
        var connection = this.driver.createConnection(conf);
        connection.connect(function(err){
            callback(err, new Connection(connection));
        });
    },
    createPool: function(conf, callback){

    }
};


exports.getAdapter = function(type){
    return new Adapter(type);
};

