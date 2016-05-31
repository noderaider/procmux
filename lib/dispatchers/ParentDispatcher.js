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

/*
  const dispatchParent = action => {
    if(orphan)
      return Promise.reject(new Error(__.ORPHAN))
    return new Promise((resolve, reject) => {
      const timeoutID = setTimeout(() => reject(new Error(__.TIMEOUT)))
      process.on('message', action => {
        const { type, payload } = action
        if(type === __.PARENT_RECEIVED) {
          resolve(payload)
        }
      })
      process.send(action)
    })
  }


  process.on('message', action => {
      if(!action || !action.type) return
      const { type, meta, payload, error } = action
      if(error) return log.error({ action }, 'RECEIVE_ERROR')


      switch(meta) {
        case __.REDUCE:
          return reduce(action)
          break
        case __.DISPATCH:
          return dispatch(action)
          break
      }
    })
    process.send({ type: __.INIT, meta: __.INIT, payload: process.env[__.PMUX] })
  */

var ParentDispatcher = function (_EventEmitter) {
  (0, _inherits3.default)(ParentDispatcher, _EventEmitter);

  function ParentDispatcher() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var log = _ref.log;
    var handleReduceSelf = _ref.handleReduceSelf;
    var handleDispatch = _ref.handleDispatch;
    (0, _classCallCheck3.default)(this, ParentDispatcher);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(ParentDispatcher).call(this));

    _this.init = function () {
      return new _promise2.default(function (resolve, reject) {
        process.on('message', function (action) {
          if (!action || !action.type) return;
          var type = action.type;
          var meta = action.meta;
          var payload = action.payload;
          var error = action.error;

          if (error) return _this.log.error({ action: action }, 'RECEIVE_ERROR');

          /** CAN BE ORDERED TO REDUCE OR DISPATCH BY ITS PARENT, MUST SIGNAL FINALIZERS BACK */
          switch (meta) {
            case __.REDUCE:
              _this._reduceSelf(action);
              break;
            case __.DISPATCH:
              _this.dispatch(action);
              break;
            case __.DISPATCH_PARENT_END:
              _this._dispatchParentEnd(action);
              break;
          }
        });
      });
    };

    _this.dispatch = function (action) {
      console.warn('dispatch called (parent-dispatcher)');
      _this.dispatch(action);
      process.send({ type: 'INTERNAL', meta: __.DISPATCH_END, otherOtherMeta: 'BLAAAAAH' });
    };

    _this.dispatchParent = function (action) {
      if (process.send) process.send((0, _extends3.default)({}, action, { meta: __.DISPATCH, otherMeta: 'BLAHBLAH' }));
    };

    _this._dispatchParentEnd = function (action) {
      _this.handleDispatchParent({ type: 'DISPATCH_PARENT_END', meta: 'BLAH' });
    };

    _this._reduceSelf = function (action) {
      console.warn('reduce called');
      _this.handleReduceSelf(action);
      process.send({ msg: 'REDUCE SELF' });
    };

    should.exist(_this.log);
    should.exist(handleReduceSelf);
    should.exist(handleDispatch);
    _this.log = log;
    _this.handleReduceSelf = handleReduceSelf;
    _this.handleDispatch = handleDispatch;
    return _this;
  }

  /** Starts the dispatch */

  /** Starts the reduce */


  return ParentDispatcher;
}(_events.EventEmitter);

exports.default = ParentDispatcher;