var utilEx = require('node-utilEx');
var Query = require('../queryHelper').Query;
var Insert = require('../queryHelper').Insert;
var Update = require('../queryHelper').Update;
var Delete = require('../queryHelper').Delete;
var mysqlHelper = require('../mysqlHelper');

var Table1 = function (o) {
    this.A = o.a;
    this.B = o.b;
    this.C = o.c;
    this.D = o.d;
    this.E = o.e;
    this.F = o.a + o.d;
};

Table1.tableName = 'table1';

exports["Init Pool"] = function (test) {
    mysqlHelper.init(require.resolve('./config.json'));
    test.done();
};

exports['Base Query'] = {
    "Query 1": function (test) {
//        test.equals(new Date('2013/08/01'), new Date('2013/08/01'));
        new Query()
            .tableName('table1')
            .field(" a,b,c,d,e, a as f")
            .where(" a = :a", {a: 1})
            .query({}, function (r, result) {
                test.deepEqual(result, [
                    {
                        a: 1,
                        b: '2',
                        c: new Date('2013/08/01'),
                        d: 3.3,
                        e: new Date('2013/08/01 15:05:11'),
                        f: 1
                    }
                ]);
                test.done();
            });
    },
    "Query 2": function (test) {
        test.expect(2);
        new Query()
            .tableName('table1')
            .field(" a,b,c,d,e, a as f")
            .where(" a = :a", {a: 2})
            .query({}, function (r, result) {
                test.deepEqual(result, [
                    {
                        a: 2,
                        b: '4',
                        c: new Date('2013/08/11'),
                        d: 6.6,
                        e: new Date('2013-08-01 15:05:41'),
                        f: 2
                    }
                ]);
                test.notDeepEqual(result, [
                    {
                        a: 1,
                        b: '2',
                        c: new Date('2013/08/11'),
                        d: 3.3,
                        e: new Date('2013-08-01 15:05:11'),
                        f: 1
                    }
                ]);
                test.done();
            });
    },
    "Query 3": function (test) {
        test.expect(2);
        new Query()
            .tableName('table1')
            .field(["a", "b", "c", "d", "e", "a f"])
            .where(" a = :a", {a: 2})
            .query({}, function (r, result) {
                test.deepEqual(result, [
                    {
                        a: 2,
                        b: '4',
                        c: new Date('2013/08/11'),
                        d: 6.6,
                        e: new Date('2013-08-01 15:05:41'),
                        f: 2
                    }
                ]);
                test.notDeepEqual(result, [
                    {
                        a: 1,
                        b: '2',
                        c: new Date('2013/08/11'),
                        d: 3.3,
                        e: new Date('2013-08-01 15:05:11'),
                        f: 1
                    }
                ]);
                test.done();
            });
    },
    "Query by Date": function (test) {
        test.expect(2);
        new Query()
            .tableName('table1')
            .field(" * ")
            .where(" c = :c", {c: new Date('2013/08/01')})
            .query({}, function (r, result) {
                test.deepEqual(result.length, 2);
                test.deepEqual((result[0] || {}).c, new Date('2013/08/01'));
                test.done();
            });
    },
    "Join table": function (test) {
        new Query()
            .tableName('table1')
            .alias('a')
            .field(" * ")
            .joinAs('table2', ' a.a = b.a1', 'b')
            .where(" c = :c", {c: new Date('2013/08/01')})
            .query({}, function (r, result, fields) {
                test.ok(!r);
                test.equal(result.length, 5);
                test.equal(fields.length, 9);
                test.done();
            });
    },
    "Join table2": function (test) {
        new Query()
            .tableName('table1', 'a')
            .field(" * ")
            .joinAs('table2', ' a.a = b.a1', 'b')
            .where(" a.c = :c", {c: new Date('2013/08/01')})
            .query({}, function (r, result, fields) {
                test.ok(!r);
                test.equal(result.length, 5);
                test.equal(fields.length, 9);
                test.done();
            });
    },
    "Join table multi": function (test) {
        new Query()
            .tableName('table1', 'a')
            .field(" * ")
            .joinAs('table2', ' a.a = b.a1', 'b')
            .joinAs('table2', ' a.a = b.a1', 'c')
            .where(" a.c = :c", {c: new Date('2013/08/01')})
            .query({}, function (r, result, fields) {
                test.ok(!r);
                test.equal(result.length, 85);
                test.equal(fields.length, 13);
                test.done();
            });
    },
    'Scale': function (test) {
        new Query()
            .tableName('table1', 'a')
            .field(" * ")
            .joinAs('table2', ' a.a = b.a1', 'b')
            .where(" a.c = :c", {c: new Date('2013/08/01')})
            .scalar(function (r, result) {
                test.ok(!r);
                test.equal(result, 1);
                test.done();
            });
    },
    'Count': function (test) {
        new Query()
            .tableName('table1', 'a')
            .where(" a.c = :c", {c: new Date('2013/08/01')})
            .count(function (r, result) {
                test.ok(!r);
                test.equal(result, 2);
                test.done();
            });
    },
    'Query model': function (test) {
        new Query(Table1)
            .alias('a')
            .where(" a.c = :c", {c: new Date('2013/08/01')})
            .queryModel(function (e, result) {
                test.ok(!e);
                test.deepEqual(result.length, 2);
                test.deepEqual(result[0].A, 1);
                test.deepEqual(result[0].F, 4.3);
                test.deepEqual(result[0].C, new Date('2013/08/01'));
                test.deepEqual(result[1].C, new Date('2013/08/01'));
                test.done();
            })
    },
    'Get model list': function (test) {
        new Query(Table1, 'a')
            .getModelList(" a.c = :c", {c: new Date('2013/08/01')}, function (e, result) {
                test.ok(!e);
                test.deepEqual(result.length, 2);
                test.deepEqual(result[0].A, 1);
                test.deepEqual(result[0].F, 4.3);
                test.deepEqual(result[0].C, new Date('2013/08/01'));
                test.deepEqual(result[1].C, new Date('2013/08/01'));
                test.done();
            })
    },
    'Get model first': function (test) {
        new Query(Table1, 'a')
            .getFirst(" a.c = :c", {c: new Date('2013/08/01')}, function (e, result) {
                test.ok(!e);
                test.deepEqual(result.A, 1);
                test.deepEqual(result.F, 4.3);
                test.deepEqual(result.C, new Date('2013/08/01'));
                test.done();
            })
    }
};

exports["Base Insert"] = {
    "Insert 1": function (test) {
        new Insert().tableName("table1").field(['a', 'b', 'c', 'd', 'e'])
            .insert({
                a: Math.floor(100000000 * Math.random()) + 10000000,
                b: 1000,
                c: new Date(),
                d: 1000.1,
                e: new Date()
            }, function (e, r) {
                test.ok(!e);
                test.equal(r.affectedRows, 1);
                test.done();
            });
    },
    "Insert 2": function (test) {
        new Insert().tableName("table1").field(['a', 'b', 'c', 'd', 'e'])
            .insert({
                a: Math.floor(100000000 * Math.random()) + 10000000,
                b: 1000,
                c: new Date(),
                d: 1000.1,
                e: new Date()
            }, ":a,:b,:c,:d,:e", function (e, r) {
                test.ok(!e);
                test.equal(r.affectedRows, 1);
                test.done();
            });
    },
    "Insert batch": function (test) {
        new Insert().tableName("table1").field(['a', 'b', 'c', 'd', 'e'])
            .insert([
            {
                a: Math.floor(100000000 * Math.random()) + 10000000,
                b: 1000,
                c: new Date(),
                d: 1000.1,
                e: new Date()
            },
            {
                a: Math.floor(100000000 * Math.random()) + 10000000,
                b: 1000,
                c: new Date(),
                d: 1000.1,
                e: new Date()
            },
            {
                a: Math.floor(100000000 * Math.random()) + 10000000,
                b: 1000,
                c: new Date(),
                d: 1000.1,
                e: new Date()
            }
        ], ":a,:b,:c,:d,:e", function (e, r) {
                test.ok(!e);
                test.equal(r.affectedRows, 3);
                test.done();
            });
    }
};

exports['Base update'] = {
    "Update 1": function (test) {
        test.expect(3);
        var o = {
            a: -1,
            b: '-2',
            c: new Date('2000/01/01'),
            d: 1000.1,
            e: new Date('2000/01/01'),
            f: -1
        };
        var record = new Table1(o);
        new Query().tableName('table1').count("d =:d", o, function (e, count) {
            var c = count;
            test.equal(e, undefined);
            new Update()
                .tableName('table1')
                .field(['a', 'b', 'c', 'e'])
                .where('d = :d', o)
                .update(o, function (e, results, fields) {
                    test.equal(e, undefined);
                    test.equal(results.affectedRows, c);
                    test.done();
                });
        });
    },
    "Update 2": function (test) {
        test.expect(3);
        var o = {
            a: -2,
            b: '-2',
            c: new Date('2000/01/01'),
            d: 1000.1,
            e: new Date('2000/01/01'),
            f: -1
        };
        var record = new Table1(o);
        new Query().tableName('table1').count("d =:d", o, function (e, count) {
            var c = count;
            test.equal(e, undefined);
            new Update()
                .tableName('table1')
                .where('d = :D', record)
                .update(record, " a=:A ", function (e, results, fields) {
                    test.equal(e, undefined);
                    test.equal(results.affectedRows, c);
                    test.done();
                });
        });
    }
};

exports['Base delete'] = {
    "Delete 1": function (test) {
        test.expect(3);
        var o = {
            a: -1,
            b: '-2',
            c: new Date('2000/01/01'),
            d: 1000.1,
            e: new Date('2000/01/01'),
            f: -1
        };
        var record = new Table1(o);
        new Query().tableName('table1').count("d =:d", o, function (e, count) {
            var c = count;
            test.equal(e, undefined);
            new Delete()
                .tableName('table1')
                .where('d = :d', o)
                .delete(o, function (e, results, fields) {
                    test.equal(e, undefined);
                    test.equal(results.affectedRows, c);
                    test.done();
                });
        });
    }
};


exports["End pool"] = function (test) {
    mysqlHelper.endPool();
    test.done();
};
