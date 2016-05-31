'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EXIT = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _toArray2 = require('babel-runtime/helpers/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = procmux;

var _co = require('co');

var _co2 = _interopRequireDefault(_co);

var _coEmitter = require('co-emitter');

var _coEmitter2 = _interopRequireDefault(_coEmitter);

var _bunyan = require('bunyan');

var _redux = require('redux');

var _redux2 = _interopRequireDefault(_redux);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _util = require('util');

var _constants = require('./constants');

var __ = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var should = require('chai').should();

var EXIT = exports.EXIT = __.EXIT;
var noop = function noop() {};

/** Creates an observer of sorts */
var forkListener = function forkListener(child) {
  var action = function action(emitted) {
    return child.on('message', emitted);
  };
  var error = function error(emitted) {
    return child.on('error', emitted);
  };
  var close = function close(emitted) {
    return child.on('close', emitted);
  };

  /** ONLY OCCURS IF process.diconnect() OR child.disconnect() */
  var disconnect = function disconnect(emitted) {
    return child.on('disconnect', emitted);
  };

  var exit = function exit(emitted) {
    return child.on('exit', emitted);
  };
  var stdout = child.stdout ? function (emitted) {
    return child.stdout.on('data', emitted);
  } : noop;
  var stderr = child.stderr ? function (emitted) {
    return child.stderr.on('data', emitted);
  } : noop;
  return { action: action, error: error, close: close, disconnect: disconnect, exit: exit, stdout: stdout, stderr: stderr };
};

var registerTimeout = function registerTimeout(kill, timeoutMS) {
  var timeoutID = null;
  timeoutID = setTimeout(function () {
    kill();
    throw new Error(__.FORK_TIMEOUT);
  }, timeoutMS);
  return function () {
    return clearTimeout(timeoutID);
  };
};

var createFork = function createFork(_ref) {
  var timeoutMS = _ref.timeoutMS;
  var store = _ref.store;
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new _promise2.default(function (resolve, reject) {
      var initialized = false;
      timeoutMS.should.be.a('number');
      args.should.be.an('array').and.have.length.within(1, 3);
      var child = _child_process2.default.fork.apply(_child_process2.default, args);
      var listeners = forkListener(child);

      var kill = function kill() {
        return child.kill();
      };
      var cancelTimeout = registerTimeout(kill, timeoutMS);

      listeners.close(function (code) {
        return initialized ? console.warn('PARENT|CLOSED => ' + code) : reject(new Error('PARENT|CLOSE_BEFORE_INIT => ' + code));
      });
      listeners.error(function (err) {
        return initialized ? console.error(err, 'PARENT|RECEIVED ERROR') : reject(err);
      });
      listeners.exit(function (code, signal) {
        if (!initialized) reject(new Error('PARENT|EXIT_BEFORE_INIT => ' + code + ', signal'));
      });

      /*
        const dispatchReceive = notify => {
          console.warn('PARENT|DISPATCHRECEIVE')
          notify(action)
        }
        */

      var dispatch = function dispatch(action) {
        console.warn('PARENT|DISPATCH', action);
        child.send(action);
      };

      listeners.action(function (action) {
        console.warn('ACTION RECEIVED =>', action);
        if (!action || !action.type) return;
        var type = action.type;
        var meta = action.meta;
        var payload = action.payload;
        var error = action.error;

        if (error) return log.error({ action: action }, 'RECEIVE_ERROR');

        switch (meta) {
          case __.INIT:
            if (initialized) throw new Error('FORK ALREADY INITIALIZED: INIT signal should only be called once.');
            initialized = true;
            cancelTimeout();
            resolve({ listeners: listeners, dispatch: dispatch, kill: kill });
            break;
        }
      });

      listeners.stdout(function (data) {
        return console.info('STDOUT: ' + data);
      });
      listeners.stderr(function (data) {
        return console.warn('STDERR: ' + data);
      });
    });
  };
};

var reduceChild = function reduceChild(_ref2) {
  var child = _ref2.child;
  var timeoutMS = _ref2.timeoutMS;
  return function (action) {
    return new _promise2.default(function (resolve, reject) {
      child.send((0, _extends4.default)({ meta: __.REDUCE }, action));
    });
  };
};

function procmux(reducer) {
  var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var _ref3$log = _ref3.log;
  var log = _ref3$log === undefined ? (0, _bunyan.createLogger)({ name: 'procmux' }) : _ref3$log;
  var _ref3$timeoutMS = _ref3.timeoutMS;
  var timeoutMS = _ref3$timeoutMS === undefined ? 4000 : _ref3$timeoutMS;


  var done = false;
  var orphan = typeof process.env[__.PMUX] === 'undefined';
  var forks = new _map2.default();
  var registers = new _map2.default();
  var currentState = {};

  var reduce = function reduce(action) {
    return (0, _co2.default)(_regenerator2.default.mark(function _callee() {
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return reduceChildren(action);

            case 2:
              currentState = _context.sent;
              return _context.abrupt('return', currentState);

            case 4:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));
  };

  var reduceChildren = function reduceChildren(action) {
    return (0, _co2.default)(_regenerator2.default.mark(function _callee2() {
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return (0, _from2.default)(forks.entries()).reduce(function (prevState, _ref4) {
                var _ref5 = (0, _slicedToArray3.default)(_ref4, 2);

                var forkID = _ref5[0];
                var child = _ref5[1];

                return (0, _extends4.default)({}, prevState, (0, _defineProperty3.default)({}, forkID, reduceChild(action)));
              }, {});

            case 2:
              return _context2.abrupt('return', _context2.sent);

            case 3:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));
  };

  /**
   * Registers an action to be run when the appropriate action type is emitted
   * actions always run before reducers and are the location where mutation may occur
   */
  var register = function register(type, action) {
    should.exist(type);
    should.exist(action);
    type.should.be.a('string').that.matches(/^[A-Z_]+$/);
    action.should.be.a('function');
    process.on('message', function (_action) {
      if (_action.type === type) action(_action);
    });
    registers.set(type, action);
  };

  /** DISPATCH UP THE TREE TO PARENTS */
  var dispatch = function dispatch() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return (0, _co2.default)(_regenerator2.default.mark(function _callee3() {
      var action;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              action = args[0];

              should.exist(action);
              action.should.be.an('object').that.has.property('type').that.is.a('string').that.matches(/^[A-Z_]+$/);

              reduce(action);

              process.send(action);

              return _context3.abrupt('return', (0, _extends4.default)({}, args));

            case 6:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));
  };

  var getState = function getState() {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    args.should.have.lengthOf(0);
    return currentState;
  };
  var queryState = function queryState() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    return (0, _co2.default)(_regenerator2.default.mark(function _callee4() {
      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              args.should.have.lengthOf(0);
              _context4.next = 3;
              return reduce(action);

            case 3:
              return _context4.abrupt('return', _context4.sent);

            case 4:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));
  };

  var exit = function exit() {
    var exitCode = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
    return (0, _co2.default)(_regenerator2.default.mark(function _callee5() {
      var exitAction;
      return _regenerator2.default.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              exitAction = { type: EXIT };
              /** TODO REDUCE FIRST? */

              _context5.next = 3;
              return dispatch({ type: __.EXIT });

            case 3:
              process.exit(exitCode);

            case 4:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));
  };

  var validateFork = function validateFork() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    try {
      args.length.should.be.above(0).and.below(5);
      var forkID = args[0];
      var forkArgs = args.slice(1);

      should.exist(forkID);
      forks.has(forkID).should.be.false;

      var _forkArgs = (0, _slicedToArray3.default)(forkArgs, 3);

      var modulePath = _forkArgs[0];
      var childArgs = _forkArgs[1];
      var options = _forkArgs[2];

      should.exist(modulePath);
      modulePath.should.be.a('string');
      var env = (0, _defineProperty3.default)({}, __.PMUX, forkID);
      var opts = options ? (0, _extends4.default)({}, options, { env: env }) : { env: env };
      var lastArgs = childArgs ? [childArgs, opts] : [opts];
      return [forkID, modulePath].concat(lastArgs);
    } catch (err) {
      throw new Error(__.FORK_DNV);
    }
  };

  var fork = function fork() {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    return (0, _co2.default)(_regenerator2.default.mark(function _callee6() {
      var _validateFork, _validateFork2, forkID, forkArgs, forked;

      return _regenerator2.default.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _validateFork = validateFork.apply(undefined, args);
              _validateFork2 = (0, _toArray3.default)(_validateFork);
              forkID = _validateFork2[0];
              forkArgs = _validateFork2.slice(1);
              _context6.next = 6;
              return createFork({ timeoutMS: timeoutMS }).apply(undefined, (0, _toConsumableArray3.default)(forkArgs));

            case 6:
              forked = _context6.sent;

              /** CHILD REGISTERS HERE AND HERE ALONE */

              currentState[forkID] = {};
              forks.set(forkID, forked);
              /** listeners, dispatch, kill */
              forked.listeners.action(function (action) {
                if (action.meta === 'DONE') {
                  done = true;
                }
              });
              return _context6.abrupt('return', forked);

            case 11:
            case 'end':
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));
  };

  var init = function init() {
    var orphanInit = arguments.length <= 0 || arguments[0] === undefined ? function () {} : arguments[0];

    if (orphan) return orphanInit();

    process.on('message', function (action) {
      console.warn('CHILD|RECEIVED FROM PARENT =>', action);
      if (!action || !action.type) return;
      var type = action.type;
      var meta = action.meta;
      var payload = action.payload;
      var error = action.error;

      if (error) return log.error({ action: action }, 'RECEIVE_ERROR');
    });
    console.warn('CHILD|SENDING INIT TO PARENT', process.env[__.PMUX]);
    process.send({ type: __.INIT, meta: __.INIT, payload: process.env[__.PMUX] });
  };
  var initSync = function initSync() {
    init.apply(undefined, arguments);
    require('deasync').loopWhile(function () {
      done !== true;
    });
  };
  return { fork: fork, dispatch: dispatch, register: register, getState: getState, reducer: reducer, exit: exit, init: init, initSync: initSync, orphan: orphan };
}