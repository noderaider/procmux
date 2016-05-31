/** @type {String} PMUX Environment Variable Tracks ForkID for current process.  */
export const PMUX = 'PMUX'

/** @type {String} DISPATCH Meta Action Type */
export const DISPATCH = 'DISPATCH'
export const DISPATCH_END = 'DISPATCH_END'
/** @type {String} REDUCE Meta Action Type */
export const REDUCE = 'REDUCE'
export const REDUCE_END= 'REDUCE_END'



export const ROOT = 'ROOT'
export const INIT = 'INIT'
export const SYNC_ERROR = 'SYNC_ERROR'
export const FORK_DNE = 'FORK_DNE'
export const FORK_ERROR = 'FORK_ERROR'
export const FORK_DNV = 'FORK_DNV'
export const PARENT_RECEIVED = 'PARENT_RECEIVED'
export const FORK_RECEIVED = 'FORK_RECEIVED'
export const ORPHAN = 'ORPHAN'
export const EXIT = 'EXIT'
export const KILL = 'KILL'


/** TIMEOUTS */
export const TIMEOUT = 'TIMEOUT'
export const FORK_TIMEOUT = 'INIT_TIMEOUT'
export const DISPATCH_TIMEOUT = 'INIT_TIMEOUT'
export const REDUCE_TIMEOUT = 'INIT_TIMEOUT'
