'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/** @type {String} PMUX Environment Variable Tracks ForkID for current process.  */
var PMUX = exports.PMUX = 'PMUX';

/** @type {String} DISPATCH Meta Action Type */
var DISPATCH = exports.DISPATCH = 'DISPATCH';
var DISPATCH_END = exports.DISPATCH_END = 'DISPATCH_END';
/** @type {String} REDUCE Meta Action Type */
var REDUCE = exports.REDUCE = 'REDUCE';
var REDUCE_END = exports.REDUCE_END = 'REDUCE_END';

var ROOT = exports.ROOT = 'ROOT';
var INIT = exports.INIT = 'INIT';
var SYNC_ERROR = exports.SYNC_ERROR = 'SYNC_ERROR';
var FORK_DNE = exports.FORK_DNE = 'FORK_DNE';
var FORK_ERROR = exports.FORK_ERROR = 'FORK_ERROR';
var FORK_DNV = exports.FORK_DNV = 'FORK_DNV';
var PARENT_RECEIVED = exports.PARENT_RECEIVED = 'PARENT_RECEIVED';
var FORK_RECEIVED = exports.FORK_RECEIVED = 'FORK_RECEIVED';
var ORPHAN = exports.ORPHAN = 'ORPHAN';
var EXIT = exports.EXIT = 'EXIT';
var KILL = exports.KILL = 'KILL';

/** TIMEOUTS */
var TIMEOUT = exports.TIMEOUT = 'TIMEOUT';
var FORK_TIMEOUT = exports.FORK_TIMEOUT = 'INIT_TIMEOUT';
var DISPATCH_TIMEOUT = exports.DISPATCH_TIMEOUT = 'INIT_TIMEOUT';
var REDUCE_TIMEOUT = exports.REDUCE_TIMEOUT = 'INIT_TIMEOUT';