
var query = require('..');
var assert = require('assert');
var test = require('node:test');
var describe = test.describe;
var it = test.it;

describe('public API', function(){
  it('exports the compiler function and lower-level helpers', function(){
    assert.strictEqual(typeof query, 'function');
    assert.strictEqual(typeof query.parse, 'function');
    assert.strictEqual(typeof query.compile, 'function');
  });

  it('compiles through parse and compile', function(){
    var ast = query.parse('level:error');

    assert.deepStrictEqual(query.compile(ast), { level: 'error' });
    assert.deepStrictEqual(query('level:error'), { level: 'error' });
  });
});

describe('compile fields', function(){
  it('compiles field values', function(){
    assert.deepStrictEqual(query('level:error'), { level: 'error' });
    assert.deepStrictEqual(query('failed'), { failed: true });
    assert.deepStrictEqual(query('removed:no'), { removed: false });
    assert.deepStrictEqual(query('user.name:Tobi'), { 'user.name': 'Tobi' });
  });

  it('compiles quoted values and numeric values', function(){
    assert.deepStrictEqual(query('type:"uploading item"'), {
      type: 'uploading item'
    });

    assert.deepStrictEqual(query('count:5.2'), {
      count: 5.2
    });
  });

  it('compiles regular expressions and wildcard patterns', function(){
    assert.deepStrictEqual(query('name:/^To/'), {
      name: /^To/
    });

    var ret = query('hostname:api-*');

    assert(ret.hostname instanceof RegExp);
    assert(ret.hostname.test('api-1'));
    assert(!ret.hostname.test('xapi-1'));
  });
});

describe('compile operators', function(){
  it('compiles OR', function(){
    assert.deepStrictEqual(query('level:error OR level:alert'), {
      $or: [
        { level: 'error' },
        { level: 'alert' }
      ]
    });

    assert.deepStrictEqual(query('level: error OR level: alert'), {
      $or: [
        { level: 'error' },
        { level: 'alert' }
      ]
    });
  });

  it('compiles AND', function(){
    assert.deepStrictEqual(query('level:error AND type:upload'), {
      $and: [
        { level: 'error' },
        { type: 'upload' }
      ]
    });
  });

  it('compiles nested operators', function(){
    assert.deepStrictEqual(query('(level:error AND type:upload) OR type:alert'), {
      $or: [
        { $and: [ { level: 'error' }, { type: 'upload' } ] },
        { type: 'alert' }
      ]
    });
  });

  it('compiles right-associative operator chains', function(){
    assert.deepStrictEqual(query('a:1 OR b:2 OR c:3'), {
      $or: [
        { a: 1 },
        {
          $or: [
            { b: 2 },
            { c: 3 }
          ]
        }
      ]
    });
  });
});

describe('compile comparison', function(){
  it('compiles greater than', function(){
    assert.deepStrictEqual(query('level>5'), {
      level: { $gt: 5 }
    });

    assert.deepStrictEqual(query('level > 5'), {
      level: { $gt: 5 }
    });
  });

  it('compiles greater than or equal', function(){
    assert.deepStrictEqual(query('level>=5'), {
      level: { $gte: 5 }
    });

    assert.deepStrictEqual(query('level >= 5'), {
      level: { $gte: 5 }
    });
  });

  it('compiles less than', function(){
    assert.deepStrictEqual(query('level<5'), {
      level: { $lt: 5 }
    });

    assert.deepStrictEqual(query('level < 5'), {
      level: { $lt: 5 }
    });
  });

  it('compiles less than or equal', function(){
    assert.deepStrictEqual(query('level<=5'), {
      level: { $lte: 5 }
    });

    assert.deepStrictEqual(query('level <= 5'), {
      level: { $lte: 5 }
    });
  });

  it('compiles not equal', function(){
    assert.deepStrictEqual(query('level!=5'), {
      level: { $ne: 5 }
    });

    assert.deepStrictEqual(query('level != 5'), {
      level: { $ne: 5 }
    });
  });

  it('compiles comparisons in nested expressions', function(){
    assert.deepStrictEqual(query('(age > 20 AND age < 50) OR gender:male'), {
      $or: [
        { $and: [ { age: { $gt: 20 } }, { age: { $lt: 50 } } ] },
        { gender: 'male' }
      ]
    });
  });
});
