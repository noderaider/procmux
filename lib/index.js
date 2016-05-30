'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EXIT = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _toArray2 = require('babel-runtime/helpers/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = procmux;

var _co = require('co');

var _co2 = _interopRequireDefault(_co);

var _bunyan = require('bunyan');

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _util = require('util');

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var should = _chai2.default.should();

var PMUX = 'PMUX';
var ROOT = 'ROOT';
var INIT = 'INIT';
var DISPATCH = 'DISPATCH';
var REDUCE = 'REDUCE';
var NO_INIT = 'NO_INIT';
var SYNC_ERROR = 'SYNC_ERROR';
var FORK_DNE = 'FORK_DNE';
var FORK_ERROR = 'FORK_ERROR';
var FORK_DNV = 'FORK_DNV';
var TIMEOUT = 'TIMEOUT';
var PARENT_RECEIVED = 'PARENT_RECEIVED';
var FORK_RECEIVED = 'FORK_RECEIVED';
var ORPHAN = 'ORPHAN';
var EXIT = exports.EXIT = 'EXIT';
var KILL = 'KILL';

function muxAction() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  var type = args[0];
  var payload = args[1];

  if (!type) return;
  return { type: type, payload: payload };
}

var createFork = function createFork(_ref) {
  var timeoutMS = _ref.timeoutMS;
  return function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return new _promise2.default(function (resolve, reject) {
      var timeoutID = null;
      timeoutMS.should.be.a('number');
      args.should.be.an('array').and.have.length.within(1, 3);
      var child = _child_process2.default.fork.apply(_child_process2.default, args);
      timeoutID = setTimeout(function () {
        if (child.stdin) child.stdin.pause();
        child.kill();
        reject(new Error(NO_INIT));
      }, timeoutMS);
      child.on('close', function () {
        return reject(new Error('CLOSE_BEFORE_INIT'));
      });
      child.on('disconnect', function () {
        return console.warn('DISCONNECT');
      });
      child.on('error', function (err) {
        return reject(err);
      });
      child.on('exit', function () {
        return reject(new Error('EXIT_BEFORE_INIT'));
      });
      child.on('message', function (action) {
        if (action.type === INIT) {
          clearTimeout(timeoutID);
          resolve(child);
        }
      });
    });
  };
};

var createForkDispatcher = function createForkDispatcher(_ref2) {
  var child = _ref2.child;
  var timeoutMS = _ref2.timeoutMS;
  return function (action) {
    return new _promise2.default(function (resolve, reject) {
      should.exist(child);
      action.should.be.an('object');
      that.has.property('type').that.matches(/^[A-Z_]+$/);

      child.on('message', {});
      child.send(action);
    });
  };
};

function procmux() {
  var _ref3 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref3$log = _ref3.log;
  var log = _ref3$log === undefined ? (0, _bunyan.createLogger)({ name: 'procmux' }) : _ref3$log;
  var _ref3$timeoutMS = _ref3.timeoutMS;
  var timeoutMS = _ref3$timeoutMS === undefined ? 4000 : _ref3$timeoutMS;


  var orphan = typeof process.env[PMUX] === 'undefined';
  var forks = new _map2.default();
  var registers = new _map2.default();
  var state = {};
  var reducers = {};

  /** Kill a fork of this process */
  var _kill = function _kill() {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    args.should.have.lengthOf(1);
    var forkID = args[0];

    return dispatchFork(forkID, { type: KILL, payload: { forkID: forkID } });
  };

  var reduceState = function reduceState(action) {
    var forkIDs = (0, _from2.default)(forks.keys());
    state = (0, _keys2.default)(reducers).reduce(function (prevState, x) {
      var reducer = reducers[x];
      return reducer ? (0, _extends4.default)({}, prevState, (0, _defineProperty3.default)({}, x, reducer(state, action))) : prevState;
    }, {});
  };

  /**
   * Registers an action to be run when the appropriate action type is emitted
   * actions always run before reducers and are the location where mutation may occur
   */
  var register = function register() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    args.should.have.lengthOf(2);
    var type = args[0];
    var action = args[1];

    type.should.be.a('string').that.matches(/^[A-Z_]+$/);
    action.should.be.a('function');
    registers.set(type, action);
  };

  var dispatchParent = function dispatchParent(action) {
    if (orphan) return _promise2.default.reject(new Error(ORPHAN));
    return new _promise2.default(function (resolve, reject) {
      var timeoutID = setTimeout(function () {
        return reject(new Error(TIMEOUT));
      });
      process.on('message', function (action) {
        var type = action.type;
        var payload = action.payload;

        if (type === PARENT_RECEIVED) {
          resolve(payload);
        }
      });
      process.send(action);
    });
  };

  var dispatchFork = function dispatchFork(forkID, action) {
    var child = forks.get(forkID);
    return child ? createForkDispatcher({ child: child, timeoutMS: timeoutMS })(action) : _promise2.default.reject(new Error(FORK_DNE));
  };

  /** IMPLEMENT THUNKS */
  var dispatch = function dispatch() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    return (0, _co2.default)(_regenerator2.default.mark(function _callee() {
      var action;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              action = args[0];

              should.exist(action);
              action.should.be.an('object').that.has.property('type').that.is.a('string').that.matches(/^[A-Z_]+$/);

              reduceState(action);

              if (!orphan) {
                _context.next = 8;
                break;
              }

              _context.t0 = null;
              _context.next = 11;
              break;

            case 8:
              _context.next = 10;
              return dispatchParent(action);

            case 10:
              _context.t0 = _context.sent;

            case 11:
              _context.t1 = _context.t0;
              _context.next = 14;
              return (0, _from2.default)(forks.entries()).map(function () {
                return dispatchFork.apply(undefined, arguments);
              });

            case 14:
              _context.t2 = _context.sent;
              return _context.abrupt('return', {
                parent: _context.t1,
                children: _context.t2
              });

            case 16:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));
  };

  var validateFork = function validateFork() {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    try {
      console.warn('INSIDE CO 1', args);
      args.length.should.be.above(0).and.below(5);
      console.warn('INSIDE CO 2');
      var forkID = args[0];
      var forkArgs = args.slice(1);

      console.warn('INSIDE CO 3');
      should.exist(forkID);
      forks.has(forkID).should.be.false;
      console.warn('INSIDE CO 4');

      var _forkArgs = (0, _slicedToArray3.default)(forkArgs, 3);

      var modulePath = _forkArgs[0];
      var childArgs = _forkArgs[1];
      var options = _forkArgs[2];

      console.warn('INSIDE CO 5');
      should.exist(modulePath);
      console.warn('INSIDE CO 6');
      modulePath.should.be.a('string');
      var env = (0, _defineProperty3.default)({}, PMUX, forkID);
      var opts = options ? (0, _extends4.default)({}, options, { env: env }) : { env: env };
      var lastArgs = childArgs ? [childArgs, opts] : [opts];
      return [forkID, modulePath].concat(lastArgs);
    } catch (err) {
      throw new Error(FORK_DNV);
    }
  };

  var fork = function fork() {
    for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    return (0, _co2.default)(_regenerator2.default.mark(function _callee2() {
      var _validateFork, _validateFork2, forkID, forkArgs, child;

      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _validateFork = validateFork.apply(undefined, args);
              _validateFork2 = (0, _toArray3.default)(_validateFork);
              forkID = _validateFork2[0];
              forkArgs = _validateFork2.slice(1);
              _context2.next = 6;
              return createFork({ timeoutMS: timeoutMS }).apply(undefined, (0, _toConsumableArray3.default)(forkArgs));

            case 6:
              child = _context2.sent;

              state[forkID] = {};
              forks.set(forkID, child);
              /** Yield back controls to allow control over this specific child. */
              return _context2.abrupt('return', { dispatch: createForkDispatcher({ child: child, timeoutMS: timeoutMS }),
                kill: function kill() {
                  return _kill(forkID);
                }
              });

            case 10:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));
  };
  var getState = function getState() {
    for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }

    args.should.have.lengthOf(0);
    return state;
  };
  var queryState = function queryState() {
    for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }

    args.should.have.lengthOf(0);
    reduceState(action);
    return state;
  };
  var reducer = function reducer() {
    for (var _len10 = arguments.length, args = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
      args[_key10] = arguments[_key10];
    }

    args.should.have.lengthOf(1);
    var _reducer = args[0];

    _reducer.should.be.a('function');
    reducers[process.env[PMUX] || ROOT] = _reducer;
  };
  var exit = function exit() {
    var _process;

    for (var _len11 = arguments.length, args = Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
      args[_key11] = arguments[_key11];
    }

    args.length.should.be.below(2);
    var exitAction = { type: EXIT };
    /** TODO REDUCE FIRST? */
    dispatch({ type: EXIT });
    (_process = process).exit.apply(_process, args);
  };
  if (!orphan) {
    process.on('message', function (action) {
      var type = action.type;

      if (!type) return;

      if (registers.has(type)) process.send();
      switch (type) {
        case DISPATCH:
          process.send();
      }
    });
    process.send(muxAction(INIT, process.env[PMUX]));
  }
  return { fork: fork, dispatchParent: dispatchParent, dispatchFork: dispatchFork, dispatch: dispatch, register: register, getState: getState, reducer: reducer, exit: exit, kill: _kill, orphan: orphan };
}