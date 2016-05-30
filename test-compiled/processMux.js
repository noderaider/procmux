'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _promiseShould = require('promise-should');

var _promiseShould2 = _interopRequireDefault(_promiseShould);

var _util = require('util');

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default);
var should = _chai2.default.should();

describe('procmux', function () {
  var lib = require('../lib');
  var procmux = lib.default;
  var EXIT = lib.EXIT;

  var validModulePath = 'test/helpers/processor.js';
  var invalidModulePath = 'no/child/here.js';
  var nonRegisteringModulePath = 'test/helpers/nonRegistering.js';

  var isFSAStyleAction = function isFSAStyleAction(action) {
    describe('FSA', function () {
      describe('type', function () {
        it('should be defined', function () {
          return should.exist(action.type);
        });
        it('should be a CAPS_STYLE string', function () {
          return action.type.should.be.a('string').that.matches(/^[A-Z_]+$/);
        });
      });
      describe('error', function () {
        if (typeof action.error !== 'undefined') it('should be boolean if defined'), function () {
          return action.error.should.be.a('boolean');
        };
      });
    });
  };

  it('default export is mux function', function () {
    return procmux.should.be.a('function');
  });
  it('has EXIT string export', function () {
    return EXIT.should.be.a('string');
  });

  describe('=> mux', function () {
    var mux = null;
    //beforeEach(() => { mux = procmux() })

    describe('=> fork', function () {
      //it('is a function', () => expect(procmux().fork).toEqual(jasmine.any(Function)))
      it('returns a promise', function () {
        return procmux().fork().should.have.property('then');
      });
      it('rejects for 0 arguments', function () {
        return mux.fork().should.be.rejected;
      });
      /*
      xit('rejects for greater than 4 arguments', promise.should.reject(mux.fork(-1, validModulePath, {}, {}, 3)))
        xit('rejects non-string second argument', promise.should.reject(mux.fork(2, 10)))
      xit('rejects non-existant module path', promise.should.reject(mux.fork(3, invalidModulePath)))
      xit('rejects valid module path that does not register itself', promise.should.reject(mux.fork(5, nonRegisteringModulePath)))
      xit('resolves valid INIT signal for valid module path', promise.should.resolve(mux.fork(4, validModulePath)))
      */
    });

    /*
    describe('=> subscribe', () => {
      it('is a function', () => expect(mux.subscribe).toEqual(jasmine.any(Function)))
      it('throws for 0 params', () => expect(() => mux.subscribe()).toThrow())
      it('throws for greater than 2 params', () => expect(() => mux.subscribe('SOMETHING', () => {}, third)).toThrow())
      it('throws for non-string first argument', () => expect(() => mux.subscribe(1, () => {})).toThrow())
      it('throws for non-FSA type style first argument', () => expect(() => mux.subscribe('not_capitalized', () => {})).toThrow())
      it('throws for non function type second argument', () => expect(() => mux.subscribe('FSA_ACTION', 'blah').toThrow()))
      it('returns undefined for valid arguments', () => expect(mux.subscribe('FSA_ACTION', () => {})).toBeUndefined())
    })
      xdescribe('=> dispatchParent', () => {
      it('exists', () => expect(mux.dispatchParent).toBeDefined())
      it('is a function', () => expect(mux.dispatchParent).toEqual(jasmine.any(Function)))
      it('should return a promise', () => promise.is.a(mux.dispatchParent({ type: 'FSA_ACTION' })))
    })
      describe('=> dispatchFork', () => {
      const forkID = 'forked'
        it('exists', () => expect(mux.dispatchFork).toBeDefined())
      it('is a function', () => expect(mux.dispatchFork).toEqual(jasmine.any(Function)))
      it('should return a promise', () => promise.is.a(mux.dispatchFork(forkID, { type: 'FSA_ACTION' })))
          beforeEach(done => {
        mux.fork(forkID, validModulePath).then(() => { done() }).catch(err => done())
      })
        it('rejects 1 arg', done => promise.should.reject(mux.dispatchFork(0)))
      it('rejects 3 args', done => promise.should.reject(promise.mux.dispatchFork(0, 1, 2)))
      it('rejects number input', promise.should.reject((forkID, 5)))
      it('rejects string input', promise.should.reject(mux.dispatchFork(forkID, 'string input')))
      it('rejects array input', promise.should.reject(mux.dispatchFork(forkID, ['an', 'array'])))
      it('rejects non-FSA style action', promise.should.reject(mux.dispatchFork(forkID, { tip: 'NOT_FSA', error: 'should be boolean' })))
      it('rejects non-FSA style action type', promise.should.reject(mux.dispatchFork(forkID, { type: 'not_capitalized', error: true })))
      it('resolves valid FSA style action', promise.should.resolve(mux.dispatchFork(forkID, { type: 'FSA_TYPE' })))
        afterEach(done => mux.kill(forkID).then(() => done()).catch(err => done()))
    })
      xdescribe('=> dispatch', () => {
      it('is a function', () => expect(mux.dispatch).toEqual(jasmine.any(Function)))
      it('throws on 0 arguments', () => expect(() => mux.dispatch()).toThrow())
      it('throws on 2 arguments', () => expect(() => mux.dispatch(1, 2)).toThrow())
      it('throws on number input', () => expect(() => mux.dispatch(5)).toThrow())
      it('throws on string input', () => expect(() => mux.dispatch('string input')).toThrow())
      it('throws on array input', () => expect(() => mux.dispatch(['an', 'array'])).toThrow())
      it('should throw on non-FSA style action', () => expect(() => mux.dispatch({ tip: 'NOT_FSA', error: 'should be boolean' })).toThrow())
      it('should throw on non-FSA style action type', () => expect(() => mux.dispatch({ type: 'not_capitalized', error: true })).toThrow())
      it('should not throw for valid FSA style action', () => expect(() => mux.dispatch({ type: 'FSA_TYPE' })).not.toThrow())
        it('should return a promise', () => {
        promise.is.a(mux.dispatch({ type: 'FSA_TYPE' }))
      })
        describe('when run', () => {
        beforeEach(done => {
          mux.fork('proc', validModulePath)
            .then(() => done())
            .catch(err => console.error(err))
        })
          it('should get exit response from fork when killed', done => {
          mux.subscribe('EXIT', payload => {
            done()
          })
          mux.kill('proc')
        })
          afterEach(done => {
          mux.kill('proc')
            .then(() => done())
            .catch(err => console.error(err))
        })
        })
      })

    describe('=> getState', () => {
      it('is a function', () => expect(mux.getState).toEqual(jasmine.any(Function)))
      it('throws if args are passed', () => expect(() => mux.getState(1)).toThrow())
      it('returns an object', () => expect(mux.getState()).toEqual(jasmine.any(Object)))
      it('returns an object with keys matching registered forks', done => {
        mux.fork('proc', validModulePath)
          .then(() => {
            const state = mux.getState()
            expect(state.proc).toBeDefined()
            done()
          })
      })
    })
      describe('=> reducer', () => {
      it('is a function', () => expect(mux.reducer).toEqual(jasmine.any(Function)))
      it('throws for 0 args', () => expect(() => mux.reducer()).toThrow())
      it('throws for more than 1 args', () => expect(() => mux.reducer((state, action) => {}, 2)).toThrow())
      it('throws for non-function arg', () => expect(() => mux.reducer(2)).toThrow())
      it('does not throw for valid args', () => expect(mux.reducer((state, actions) => state)))
    })
      describe('=> exit', () => {
      it('is a function', () => expect(mux.exit).toEqual(jasmine.any(Function)))
      it('throws for more than 1 parameter', () => expect(() => mux.exit(1, 2)).toThrow())
    })
      describe('=> kill', () => {
      it('is a function', () => expect(mux.kill).toEqual(jasmine.any(Function)))
      it('throws for more than 1 parameter', () => expect(() => mux.kill(1, 2)).toThrow())
      it('should return a promise', () => promise.is.a(mux.kill('proc')))
    })
      describe('=> orphan', () => {
      it('is a boolean', () => expect(mux.orphan).toEqual(jasmine.any(Boolean)))
    })
    */

    //afterEach(() => { mux = null })
  });
});
