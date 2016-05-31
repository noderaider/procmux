'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = require('events');

var _constants = require('../constants');

var __ = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var should = require('chai').should();

var ForkDispatcher = function (_EventEmitter) {
  (0, _inherits3.default)(ForkDispatcher, _EventEmitter);

  function ForkDispatcher() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var log = _ref.log;
    var timeoutMS = _ref.timeoutMS;
    var handleDispatch = _ref.handleDispatch;
    var handleReduce = _ref.handleReduce;
    var handleError = _ref.handleError;
    var handleDisconnect = _ref.handleDisconnect;
    var handleExit = _ref.handleExit;
    var handleClose = _ref.handleClose;
    (0, _classCallCheck3.default)(this, ForkDispatcher);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(ForkDispatcher).call(this));

    _this.init = function (child) {
      return new _promise2.default(function (resolve, reject) {
        var timeoutID = null;
        _this._child = child;

        timeoutID = setTimeout(function () {
          if (_this.initialized) return;
          if (child.stdin) child.stdin.pause();
          child.kill();
          reject(new Error(__.FORK_TIMEOUT));
        }, _this.timeoutMS);

        child.on('close', function () {
          if (!_this.initialized) reject(new Error('CLOSE_BEFORE_INIT'));
          _this._onClose();
        });
        child.on('disconnect', function () {
          _this._onDisconnect();
        });
        child.on('error', function (err) {
          if (!_this.initialized) return reject(err);
          _this._onError(err);
        });
        child.on('exit', function () {
          if (!_this.initialized) reject(new Error('EXIT_BEFORE_INIT'));
          _this._onExit();
        });

        /** CAN RECEIVE INIT EVENT FROM CHILDREN, REDUCE FINALIZER, DISPATCH, AND DISPATCH FINALIZER */
        child.on('message', function (action) {
          if (!action || !action.type) return;
          var type = action.type;
          var meta = action.meta;
          var payload = action.payload;
          var error = action.error;

          console.warn('RECEIVE FROM CHILD =>', action);
          if (error) return _this.log.error({ action: action }, 'RECEIVE_ERROR');
          switch (meta) {
            case __.INIT:
              if (_this.initialized) throw new Error('FORK ALREADY INITIALIZED: INIT signal should only be called once.');
              _this.initialized = true;
              clearTimeout(timeoutID);
              resolve(child);
              break;
            /*
            case __.REDUCE_END:
            this._onReduceEnd()
            break
            */
            case __.DISPATCH:
              console.warn('DISPATCH CALLED FROM CHILD TO PARENT', action);
              _this._onDispatch(action);

              break;
            case __.DISPATCH_END:
              _this._onDispatchEnd(action);
              break;
            default:

          }
        });
      });
    };

    _this.dispatch = function (action) {
      console.warn('dispatch called');
      _this._child.send((0, _extends3.default)({}, action, { meta: __.DISPATCH }));
    };

    _this._onDispatch = function (action) {
      var type = action.type;
      var meta = action.meta;

      switch (type) {}
      //    this._onDispatchEnd()
    };

    _this._onDispatchEnd = function (action) {
      console.warn('_onDispatch called');
      _this.handleDispatch(action);
    };

    _this.reduce = function (action) {
      console.warn('reduce called');
      _this._child.send((0, _extends3.default)({}, action, { meta: __.REDUCE }));
    };

    _this._onReduceEnd = function (action) {
      console.warn('_onReduceEnd called');
      _this.handleReduce(action);
    };

    _this._onError = function (err) {
      console.warn('_onError called');
      _this.handleError(err);
    };

    _this._onDisconnect = function () {
      console.warn('_onDisconnect called');
      _this.handleDisconnect();
    };

    _this._onClose = function () {
      console.warn('_onClose called');
      _this.handleClose();
    };

    _this._onExit = function () {
      console.warn('_onExit called');
      _this.handleExit();
    };

    should.exist(log);
    should.exist(timeoutMS);
    should.exist(handleDispatch);
    should.exist(handleReduce);
    should.exist(handleError);
    should.exist(handleDisconnect);
    should.exist(handleClose);
    should.exist(handleExit);
    timeoutMS.should.be.a('number');
    handleDispatch.should.be.a('function');
    handleReduce.should.be.a('function');
    handleError.should.be.a('function');
    handleDisconnect.should.be.a('function');
    handleClose.should.be.a('function');
    handleExit.should.be.a('function');

    _this.initialized = false;

    _this.log = log;
    _this.timeoutMS = timeoutMS;
    _this.handleDispatch = handleDispatch;
    _this.handleReduce = handleReduce;
    _this.handleError = handleError;
    _this.handleDisconnect = handleDisconnect;
    _this.handleExit = handleExit;
    _this.handleClose = handleClose;
    return _this;
  }
  /** Starts the dispatch */

  /** Gets called when dispatch finishes */

  /** Starts the reduce */

  /** Gets called when the reduce finishes */


  return ForkDispatcher;
}(_events.EventEmitter);

exports.default = ForkDispatcher;