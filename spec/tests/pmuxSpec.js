'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('process-mux', function () {
  var lib = require('../../lib');
  var processMux = lib.default;
  var EXIT = lib.EXIT;

  var validModulePath = 'spec/helpers/processor.js';
  var invalidModulePath = 'no/child/here.js';
  var nonRegisteringModulePath = 'spec/helpers/nonRegistering.js';

  it('default export is pmux function', function () {
    return expect(processMux).toEqual(jasmine.any(Function));
  });
  it('has EXIT string export', function () {
    return expect(EXIT).toEqual(jasmine.any(String));
  });

  describe('pmux', function () {
    var pmux = null;
    beforeEach(function () {
      pmux = processMux();
    });

    describe('fork', function () {
      it('is a function', function () {
        return expect(pmux.fork).toEqual(jasmine.any(Function));
      });
      it('throws for 0 arguments', function () {
        return expect(function () {
          return pmux.fork();
        }).toThrow();
      });
      it('throws for greater than 4 arguments', function () {
        return expect(function () {
          return pmux.fork(-1, validModulePath, {}, {}, 3);
        }).toThrow();
      });

      beforeEach(function () {
        return console.info('running fork async test...');
      });
      var shouldPass = function shouldPass(done) {
        return function (result) {
          expect(result).toEqual(jasmine.any(Object));
          done();
        };
      };
      //const shouldNotPass = result => expect(result).toBeUndefined()
      var shouldFail = function shouldFail(done) {
        return function (err) {
          expect(err).toEqual(jasmine.any(Object));
          done();
        };
      };
      it('errors on non-string second argument', function (done) {
        pmux.fork(2, 10).catch(shouldFail(done));
      });
      it('reports error on non-existant module path', function (done) {
        pmux.fork(3, invalidModulePath).catch(shouldFail(done));
      });
      it('reports error for valid module path that does not register itself', function (done) {
        pmux.fork(5, nonRegisteringModulePath).catch(shouldFail(done));
      });
      it('receives valid INIT signal for valid module path', function (done) {
        pmux.fork(4, validModulePath).then(shouldPass(done));
      });
    });
    describe('sub', function () {
      it('is a function', function () {
        return expect(pmux.sub).toEqual(jasmine.any(Function));
      });
      it('throws for 0 params', function () {
        return expect(function () {
          return pmux.sub();
        }).toThrow();
      });
      it('throws for greater than 2 params', function () {
        return expect(function () {
          return pmux.sub('SOMETHING', function () {}, third);
        }).toThrow();
      });
      it('throws for non-string first argument', function () {
        return expect(function () {
          return pmux.sub(1, function () {});
        }).toThrow();
      });
      it('throws for non-FSA type style first argument', function () {
        return expect(function () {
          return pmux.sub('not_capitalized', function () {});
        }).toThrow();
      });
      it('throws for non function type second argument', function () {
        return expect(function () {
          return pmux.sub('FSA_ACTION', 'blah').toThrow();
        });
      });
      it('returns undefined for valid arguments', function () {
        return expect(pmux.sub('FSA_ACTION', function () {})).toBeUndefined();
      });
    });

    describe('pub', function () {
      it('is a function', function () {
        return expect(pmux.pub).toEqual(jasmine.any(Function));
      });
      it('throws on 0 arguments', function () {
        return expect(function () {
          return pmux.pub();
        }).toThrow();
      });
      it('throws on number input', function () {
        return expect(function () {
          return pmux.pub(5);
        }).toThrow();
      });
      it('throws on string input', function () {
        return expect(function () {
          return pmux.pub('string input');
        }).toThrow();
      });
      it('throws on array input', function () {
        return expect(function () {
          return pmux.pub(['an', 'array']);
        }).toThrow();
      });
      it('should throw on non-FSA style action', function () {
        return expect(function () {
          return pmux.pub({ tip: 'NOT_FSA', error: 'should be boolean' });
        }).toThrow();
      });
      it('should throw on non-FSA style action type', function () {
        return expect(function () {
          return pmux.pub({ type: 'not_capitalized', error: true });
        }).toThrow();
      });
      it('should not throw for valid FSA style action', function () {
        return expect(function () {
          return pmux.pub({ type: 'FSA_TYPE' });
        }).not.toThrow();
      });
    });

    describe('getState', function () {
      it('is a function', function () {
        return expect(pmux.getState).toEqual(jasmine.any(Function));
      });
      it('throws if args are passed', function () {
        return expect(function () {
          return pmux.getState(1);
        }).toThrow();
      });
      it('returns an object', function () {
        return expect(pmux.getState()).toEqual(jasmine.any(Object));
      });
      it('returns an object with keys matching registered forks', function (done) {
        pmux.fork('proc', validModulePath).then(function () {
          var state = pmux.getState();
          expect(state.proc).toBeDefined();
          done();
        });
      });
    });

    describe('reducer', function () {
      it('is a function', function () {
        return expect(pmux.reducer).toEqual(jasmine.any(Function));
      });
      it('throws for 0 args', function () {
        return expect(function () {
          return pmux.reducer();
        }).toThrow();
      });
      it('throws for more than 1 args', function () {
        return expect(function () {
          return pmux.reducer(function (state, action) {}, 2);
        }).toThrow();
      });
      it('throws for non-function arg', function () {
        return expect(function () {
          return pmux.reducer(2);
        }).toThrow();
      });
      it('does not throw for valid args', function () {
        return expect(pmux.reducer(function (state, actions) {
          return state;
        }));
      });
    });

    describe('exit', function () {
      it('is a function', function () {
        return expect(pmux.exit).toEqual(jasmine.any(Function));
      });
      it('throws for more than 1 parameter', function () {
        return expect(function () {
          return pmux.exit(1, 2);
        }).toThrow();
      });
    });

    describe('orphan', function () {
      it('is a boolean', function () {
        return expect(pmux.orphan).toEqual(jasmine.any(Boolean));
      });
    });

    afterEach(function () {
      pmux = null;
    });
  });
});