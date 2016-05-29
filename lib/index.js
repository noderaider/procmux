'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EXIT = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

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

exports.default = processMux;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

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
var REDUCE = 'REDUCE';
var NO_INIT = 'NO_INIT';
var SYNC_ERROR = 'SYNC_ERROR';
var FORK_ERROR = 'FORK_ERROR';
var EXIT = exports.EXIT = 'EXIT';

function pmuxAction() {
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

    return new _bluebird2.default(function (resolve, reject) {
      var timeoutID = null;
      try {
        (function () {
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
        })();
      } catch (err) {
        clearTimeout(timeoutID);
        reject(err);
      }
    });
  };
};

function processMux() {
  var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref2$log = _ref2.log;
  var log = _ref2$log === undefined ? (0, _bunyan.createLogger)({ name: 'process-mux' }) : _ref2$log;
  var _ref2$timeoutMS = _ref2.timeoutMS;
  var timeoutMS = _ref2$timeoutMS === undefined ? 4000 : _ref2$timeoutMS;


  var orphan = typeof process.env[PMUX] === 'undefined';
  var forks = new _map2.default();
  var state = {};
  var reducers = {};
  var reduceState = function reduceState(state, action) {
    var forkIDs = (0, _from2.default)(forks.keys());
    return (0, _keys2.default)(reducers).reduce(function (prevState, x) {
      var reducer = reducers[x];
      return reducer ? (0, _extends4.default)({}, prevState, (0, _defineProperty3.default)({}, x, reducer(state, action))) : prevState;
    }, {});
  };

  var sub = function sub() {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    should.exist(args);
    args.should.have.lengthOf(2);
    var type = args[0];
    var callback = args[1];

    type.should.be.a('string').that.matches(/^[A-Z_]+$/);
    callback.should.be.a('function');

    var subscribePayload = function subscribePayload(action) {
      if (!action.type) return;
      if (action.type === type) callback(action.payload);
    };

    (0, _from2.default)(forks.values()).forEach(function (x) {
      return x.on('message', subscribePayload);
    });
    if (!orphan) process.on('message', subscribePayload);
  };

  /** IMPLEMENT THUNKS */
  var pub = function pub(action) {
    should.exist(action);
    action.should.be.an('object').that.has.property('type').that.is.a('string').that.matches(/^[A-Z_]+$/);

    state = reduceState(state, action);

    /**
     * Publish down the tree, then up the tree
     * NEEDS TESTS
     */
    (0, _from2.default)(forks.values()).forEach(function (x) {
      return x.send(action);
    });
    if (!orphan) process.send(action);
  };

  var fork = function fork() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    args.length.should.be.above(0).and.below(5);
    return (0, _co2.default)(_regenerator2.default.mark(function _callee() {
      var forkID, forkArgs, _forkArgs, modulePath, childArgs, options, env, opts, lastArgs, child;

      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              forkID = args[0];
              forkArgs = args.slice(1);

              should.exist(forkID);
              forks.has(forkID).should.be.false;
              _forkArgs = (0, _slicedToArray3.default)(forkArgs, 3);
              modulePath = _forkArgs[0];
              childArgs = _forkArgs[1];
              options = _forkArgs[2];

              should.exist(modulePath);
              modulePath.should.be.a('string');
              env = (0, _defineProperty3.default)({}, PMUX, forkID);
              opts = options ? (0, _extends4.default)({}, options, { env: env }) : { env: env };
              lastArgs = childArgs ? [childArgs, opts] : [opts];
              _context.next = 16;
              return createFork({ timeoutMS: timeoutMS }).apply(undefined, [modulePath].concat(lastArgs));

            case 16:
              child = _context.sent;

              state[forkID] = {};
              /** TODO: RETURN A SPECIALIZED PUB / SUB FOR THIS SPECIFIC CHILD */
              return _context.abrupt('return', forks.set(forkID, child));

            case 21:
              _context.prev = 21;
              _context.t0 = _context['catch'](0);
              throw _context.t0;

            case 24:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[0, 21]]);
    }));
  };
  var getState = function getState() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    args.should.have.lengthOf(0);
    return state;
  };
  var reducer = function reducer() {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    args.should.have.lengthOf(1);
    var _reducer = args[0];

    _reducer.should.be.a('function');
    reducers[process.env[PMUX] || ROOT] = _reducer;
  };
  var exit = function exit() {
    for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    args.length.should.be.below(2);
    var exitAction = { type: EXIT };
    /** TODO REDUCE FIRST? */
    pub({ type: EXIT });
    process.exit(0);
  };
  if (!orphan) process.send(pmuxAction(INIT, process.env[PMUX]));
  return { fork: fork, pub: pub, sub: sub, getState: getState, reducer: reducer, exit: exit, orphan: orphan };
}