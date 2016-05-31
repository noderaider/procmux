import co from 'co'
import { createLogger } from 'bunyan'
import cp from 'child_process'
import { inspect } from 'util'
import ParentDispatcher from './dispatchers/ParentDispatcher'
import ForkDispatcher from './dispatchers/ForkDispatcher'
import * as __ from './constants'

const should = require('chai').should()

export const EXIT = __.EXIT


const reduceChild = ({ child, timeoutMS }) => action => new Promise((resolve, reject) => {
  child.send({ meta: __.REDUCE, ...action })
})

export default function procmux(reducer,  { log = createLogger({ name: 'procmux' })
                                          , timeoutMS = 4000
                                          } = {} ) {

  const orphan = typeof process.env[__.PMUX] === 'undefined'
  let forks = new Map()
  let registers = new Map()
  let currentState = {}

  /** Kill a fork of this process */
  const kill = (...args) => {
    args.should.have.lengthOf(1)
    const [forkID] = args
    return dispatchFork(forkID, ({ type: __.KILL, payload: { forkID }}))
  }

  const reduce = action => co(function* () {
    currentState = yield reduceChildren(action)
    return currentState
  })

  const reduceChildren = action => co(function* () {
    return yield Array.from(forks.entries()).reduce((prevState, [forkID, child]) => {
      return { ...prevState, [forkID]: reduceChild(action) }
    }, {})
  })

  /**
   * Registers an action to be run when the appropriate action type is emitted
   * actions always run before reducers and are the location where mutation may occur
   */
  const register = (type, action) => {
    should.exist(type)
    should.exist(action)
    type.should.be.a('string')
      .that.matches(/^[A-Z_]+$/)
    action.should.be.a('function')
    registers.set(type, action)
  }

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

  const dispatchFork = (forkID, action) => {
    const child = forks.get(forkID)
    return child ? createForkDispatcher({ child, timeoutMS })(action) : Promise.reject(new Error(__.FORK_DNE))
  }

  /** IMPLEMENT THUNKS */
  const dispatch = (...args) => co(function* () {
    return co(function* () {
      const [action] = args
      should.exist(action)
      action.should.be.an('object')
        .that.has.property('type')
          .that.is.a('string')
          .that.matches(/^[A-Z_]+$/)


      reduce(action)

      return  { parent: orphan ? null : yield dispatchParent(action)
              , children: yield Array.from(forks.entries()).map((...args) => dispatchFork(...args))
              }
    })
  })

  const validateFork = (...args) => {
    try {
      args.length.should.be.above(0).and.below(5)
      const [forkID, ...forkArgs] = args
      should.exist(forkID)
      forks.has(forkID).should.be.false
      const [modulePath, childArgs, options] = forkArgs
      should.exist(modulePath)
      modulePath.should.be.a('string')
      const env = { [__.PMUX]: forkID }
      const opts = options ? { ...options, env  } : { env }
      const lastArgs = childArgs ? [childArgs, opts] : [opts]
      return [forkID, modulePath, ...lastArgs]
    } catch(err) {
      throw new Error(__.FORK_DNV)
    }
  }

  const getState = (...args) => {
    args.should.have.lengthOf(0)
    return currentState
  }
  const queryState = (...args) => co(function* () {
    args.should.have.lengthOf(0)
    return yield reduce(action)
  })

  const exit = (exitCode = 0) => co(function* () {
    const exitAction = { type: EXIT }
    /** TODO REDUCE FIRST? */
    yield dispatch({ type: __.EXIT })
    process.exit(exitCode)
  })


  const fork = (...args) => co(function* () {
    const [forkID, ...forkArgs] = validateFork(...args)

    const handleDispatch = action => { console.warn('DISPATCH CALLED FOR =>', action)}
    const handleReduce = action => { console.warn('REDUCE CALLED FOR =>', action)}
    const handleError = action => {}
    const handleDisconnect = () => {}
    const handleClose = () => {}
    const handleExit = () => {}

    const dispatcher = new ForkDispatcher({ log, timeoutMS, handleDispatch, handleReduce, handleError, handleDisconnect, handleClose, handleExit  })
    yield dispatcher.init(cp.fork(...forkArgs))


    /** CHILD REGISTERS HERE AND HERE ALONE */

    currentState[forkID] = {}
    forks.set(forkID, dispatcher)
    /** Yield back controls to allow control over this specific child. */
    return  { dispatch: action => dispatcher.dispatch(action)
            , kill: () => kill(forkID)
            }
  })

  const init = (orphanInit = () => {}) => {
    if(orphan)
      return orphanInit()

    process.on('message', action => {
      if(!action || !action.type) return
      const { type, meta, payload, error } = action
      if(error) return log.error({ action }, 'RECEIVE_ERROR')

      return process.send({ ...action, meta: __.DISPATCH_END } )


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
  }
  return { fork, dispatchParent, dispatchFork, dispatch, register, getState, reducer, exit, kill, init, orphan }
}
