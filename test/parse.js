
var query = require('..');
var assert = require('assert');
var test = require('node:test');
var describe = test.describe;
var it = test.it;

describe('parse fields', function(){
  it('supports dotted and dashed field names', function(){
    assert.deepStrictEqual(query.parse('user.name:Tobi'), {
      type: 'field',
      name: 'user.name',
      value: 'Tobi'
    });

    assert.deepStrictEqual(query.parse('http-status:ok'), {
      type: 'field',
      name: 'http-status',
      value: 'ok'
    });
  });

  it('defaults missing values to true', function(){
    assert.deepStrictEqual(query.parse('failed'), {
      type: 'field',
      name: 'failed',
      value: true
    });
  });

  it('trims outer whitespace and tolerates whitespace around separators', function(){
    assert.deepStrictEqual(query.parse('  level : error  '), {
      type: 'field',
      name: 'level',
      value: 'error'
    });
  });

  it('coerces boolean words', function(){
    assert.deepStrictEqual(query.parse('removed:true'), {
      type: 'field',
      name: 'removed',
      value: true
    });

    assert.deepStrictEqual(query.parse('removed:false'), {
      type: 'field',
      name: 'removed',
      value: false
    });

    assert.deepStrictEqual(query.parse('removed:yes'), {
      type: 'field',
      name: 'removed',
      value: true
    });

    assert.deepStrictEqual(query.parse('removed:no'), {
      type: 'field',
      name: 'removed',
      value: false
    });
  });

  it('coerces numeric values', function(){
    assert.strictEqual(query.parse('count:5').value, 5);
    assert.strictEqual(query.parse('count:5.2').value, 5.2);
    assert.strictEqual(query.parse('count:-5').value, -5);
  });

  it('keeps quoted values as strings', function(){
    assert.deepStrictEqual(query.parse('type:"uploading item"'), {
      type: 'field',
      name: 'type',
      value: 'uploading item'
    });

    assert.deepStrictEqual(query.parse("type:'uploading item'"), {
      type: 'field',
      name: 'type',
      value: 'uploading item'
    });

    assert.deepStrictEqual(query.parse('count:"5"'), {
      type: 'field',
      name: 'count',
      value: '5'
    });
  });

  it('supports slash-delimited regular expressions', function(){
    assert.deepStrictEqual(query.parse('name:/^To/'), {
      type: 'field',
      name: 'name',
      value: /^To/
    });
  });

  it('converts wildcard values to anchored regular expressions', function(){
    var ret = query.parse('hostname:api-*');

    assert.strictEqual(ret.type, 'field');
    assert.strictEqual(ret.name, 'hostname');
    assert(ret.value instanceof RegExp);
    assert(ret.value.test('api-1'));
    assert(!ret.value.test('xapi-1'));
  });

  it('escapes non-wildcard regexp characters in wildcard values', function(){
    var ret = query.parse('path:api.v1*');

    assert(ret.value.test('api.v1users'));
    assert(!ret.value.test('api-v1-users'));
  });
});

describe('parse comparisons', function(){
  it('marks supported comparison operators', function(){
    assert.deepStrictEqual(query.parse('level>5'), {
      type: 'field',
      name: 'level',
      value: 5,
      cmp: 'gt'
    });

    assert.deepStrictEqual(query.parse('level >= 5'), {
      type: 'field',
      name: 'level',
      value: 5,
      cmp: 'gte'
    });

    assert.deepStrictEqual(query.parse('level<5'), {
      type: 'field',
      name: 'level',
      value: 5,
      cmp: 'lt'
    });

    assert.deepStrictEqual(query.parse('level <= 5'), {
      type: 'field',
      name: 'level',
      value: 5,
      cmp: 'lte'
    });

    assert.deepStrictEqual(query.parse('level != 5'), {
      type: 'field',
      name: 'level',
      value: 5,
      cmp: 'ne'
    });
  });
});

describe('parse operators', function(){
  it('supports AND', function(){
    assert.deepStrictEqual(query.parse('level:error AND type:upload'), {
      type: 'op',
      op: 'and',
      left: { type: 'field', name: 'level', value: 'error' },
      right: { type: 'field', name: 'type', value: 'upload' }
    });
  });

  it('supports OR', function(){
    assert.deepStrictEqual(query.parse('level:error OR type:upload'), {
      type: 'op',
      op: 'or',
      left: { type: 'field', name: 'level', value: 'error' },
      right: { type: 'field', name: 'type', value: 'upload' }
    });
  });

  it('matches operators case-insensitively', function(){
    assert.deepStrictEqual(query.parse('level:error and type:upload'), {
      type: 'op',
      op: 'and',
      left: { type: 'field', name: 'level', value: 'error' },
      right: { type: 'field', name: 'type', value: 'upload' }
    });
  });

  it('parses nested expressions', function(){
    assert.deepStrictEqual(query.parse('(level:error AND type:upload) OR level:critical'), {
      type: 'op',
      op: 'or',
      left: {
        type: 'op',
        op: 'and',
        left: { type: 'field', name: 'level', value: 'error' },
        right: { type: 'field', name: 'type', value: 'upload' }
      },
      right: { type: 'field', name: 'level', value: 'critical' }
    });
  });

  it('parses right-associative operator chains', function(){
    assert.deepStrictEqual(query.parse('a:1 OR b:2 OR c:3'), {
      type: 'op',
      op: 'or',
      left: { type: 'field', name: 'a', value: 1 },
      right: {
        type: 'op',
        op: 'or',
        left: { type: 'field', name: 'b', value: 2 },
        right: { type: 'field', name: 'c', value: 3 }
      }
    });
  });
});

describe('parse errors', function(){
  it('rejects empty input', function(){
    assert.throws(function(){
      query.parse('');
    }, /missing opening '\('/);
  });

  it('rejects incomplete operators', function(){
    assert.throws(function(){
      query.parse('level:error OR');
    }, /missing opening '\('/);
  });

  it('rejects unclosed groups', function(){
    assert.throws(function(){
      query.parse('(level:error OR type:upload');
    }, /missing closing '\)'/);
  });
});
