import co from 'co'
import { createLogger } from 'bunyan'
import cp from 'child_process'
import { inspect } from 'util'
import chai from 'chai'
const should = chai.should()

const PMUX = 'PMUX'
const ROOT = 'ROOT'
const INIT = 'INIT'
const DISPATCH= 'DISPATCH'
const REDUCE = 'REDUCE'
const NO_INIT = 'NO_INIT'
const SYNC_ERROR = 'SYNC_ERROR'
const FORK_DNE = 'FORK_DNE'
const FORK_ERROR = 'FORK_ERROR'
const FORK_DNV = 'FORK_DNV'
const TIMEOUT = 'TIMEOUT'
const PARENT_RECEIVED = 'PARENT_RECEIVED'
const FORK_RECEIVED = 'FORK_RECEIVED'
const ORPHAN = 'ORPHAN'
export const EXIT = 'EXIT'
const KILL = 'KILL'

function muxAction(...args) {
  const [type, payload] = args
  if(!type)
    return
  return ({ type, payload })
}

const createFork = ({ timeoutMS }) => (...args) => new Promise((resolve, reject) => {
  let timeoutID = null
  timeoutMS.should.be.a('number')
  args.should.be.an('array').and.have.length.within(1, 3)
  const child = cp.fork(...args)
  timeoutID = setTimeout(() => {
    if(child.stdin)
      child.stdin.pause()
    child.kill()
    reject(new Error(NO_INIT))
  }, timeoutMS)
  child.on('close', () => reject(new Error('CLOSE_BEFORE_INIT')))
  child.on('disconnect', () => console.warn('DISCONNECT'))
  child.on('error', err => reject(err))
  child.on('exit', () => reject(new Error('EXIT_BEFORE_INIT')))
  child.on('message', action => {
    if(action.type === INIT) {
      clearTimeout(timeoutID)
      resolve(child)
    }
  })
})


const createForkDispatcher = ({ child, timeoutMS }) => action => new Promise((resolve, reject) => {
  should.exist(child)
  action.should.be.an('object')
    that.has.property('type')
      .that.matches(/^[A-Z_]+$/)

  child.on('message', {})
  child.send(action)
})


export default function procmux( { log = createLogger({ name: 'procmux' })
                                    , timeoutMS = 4000
                                    } = {} ) {

  const orphan = typeof process.env[PMUX] === 'undefined'
  let forks = new Map()
  let registers = new Map()
  let state = {}
  let reducers = {}

  /** Kill a fork of this process */
  const kill = (...args) => {
    args.should.have.lengthOf(1)
    const [forkID] = args
    return dispatchFork(forkID, ({ type: KILL, payload: { forkID }}))
  }

  const reduceState = action => {
    let forkIDs = Array.from(forks.keys())
    state = Object.keys(reducers).reduce((prevState, x) => {
      const reducer = reducers[x]
      return reducer ? { ...prevState, [x]: reducer(state, action) } : prevState
    }, {})
  }

  /**
   * Registers an action to be run when the appropriate action type is emitted
   * actions always run before reducers and are the location where mutation may occur
   */
  const register = (...args) => {
    args.should.have.lengthOf(2)
    const [type, action] = args
    type.should.be.a('string')
      .that.matches(/^[A-Z_]+$/)
    action.should.be.a('function')
    registers.set(type, action)
  }

  const dispatchParent = action => {
    if(orphan)
      return Promise.reject(new Error(ORPHAN))
    return new Promise((resolve, reject) => {
      const timeoutID = setTimeout(() => reject(new Error(TIMEOUT)))
      process.on('message', action => {
        const { type, payload } = action
        if(type === PARENT_RECEIVED) {
          resolve(payload)
        }
      })
      process.send(action)
    })
  }

  const dispatchFork = (forkID, action) => {
    const child = forks.get(forkID)
    return child ? createForkDispatcher({ child, timeoutMS })(action) : Promise.reject(new Error(FORK_DNE))
  }

  /** IMPLEMENT THUNKS */
  const dispatch = (...args) => {
    return co(function* () {
      const [action] = args
      should.exist(action)
      action.should.be.an('object')
        .that.has.property('type')
          .that.is.a('string')
          .that.matches(/^[A-Z_]+$/)

      reduceState(action)

      return  { parent: orphan ? null : yield dispatchParent(action)
              , children: yield Array.from(forks.entries()).map((...args) => dispatchFork(...args))
              }
    })
  }

  const validateFork = (...args) => {
    try {
      console.warn('INSIDE CO 1', args)
      args.length.should.be.above(0).and.below(5)
      console.warn('INSIDE CO 2')
      const [forkID, ...forkArgs] = args
      console.warn('INSIDE CO 3')
      should.exist(forkID)
      forks.has(forkID).should.be.false
      console.warn('INSIDE CO 4')
      const [modulePath, childArgs, options] = forkArgs
      console.warn('INSIDE CO 5')
      should.exist(modulePath)
      console.warn('INSIDE CO 6')
      modulePath.should.be.a('string')
      const env = { [PMUX]: forkID }
      const opts = options ? { ...options, env  } : { env }
      const lastArgs = childArgs ? [childArgs, opts] : [opts]
      return [forkID, modulePath, ...lastArgs]
    } catch(err) {
      throw new Error(FORK_DNV)
    }
  }

  const fork = (...args) => {
    return co(function* () {
      const [forkID, ...forkArgs] = validateFork(...args)
      const child = yield createFork({ timeoutMS })(...forkArgs)
      state[forkID] = {}
      forks.set(forkID, child)
      /** Yield back controls to allow control over this specific child. */
      return  { dispatch: createForkDispatcher({ child, timeoutMS })
              , kill: () => kill(forkID)
              }
    })
  }
  const getState = (...args) => {
    args.should.have.lengthOf(0)
    return state
  }
  const queryState = (...args) => {
    args.should.have.lengthOf(0)
    reduceState(action)
    return state
  }
  const reducer = (...args) => {
    args.should.have.lengthOf(1)
    const [_reducer] = args
    _reducer.should.be.a('function')
    reducers[process.env[PMUX] || ROOT] = _reducer
  }
  const exit = (...args) => {
    args.length.should.be.below(2)
    const exitAction = { type: EXIT }
    /** TODO REDUCE FIRST? */
    dispatch({ type: EXIT })
    process.exit(...args)
  }
  if(!orphan) {
    process.on('message', action => {
      const { type } = action
      if(!type)
        return

      if(registers.has(type))
        process.send()
      switch(type) {
        case DISPATCH:
          process.send()
      }
    })
    process.send(muxAction(INIT, process.env[PMUX]))
  }
  return { fork, dispatchParent, dispatchFork, dispatch, register, getState, reducer, exit, kill, orphan }
}
