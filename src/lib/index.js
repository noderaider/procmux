import co from 'co'
import Emitter from 'co-emitter'
import { createLogger } from 'bunyan'
import redux from 'redux'
import cp from 'child_process'
import { inspect } from 'util'

import * as __ from './constants'

const should = require('chai').should()

export const EXIT = __.EXIT
const noop = () => {}


/** Creates an observer of sorts */
const forkListener = child => {
  const action = emitted => child.on('message', emitted)
  const error = emitted => child.on('error', emitted)
  const close = emitted => child.on('close', emitted)

  /** ONLY OCCURS IF process.diconnect() OR child.disconnect() */
  const disconnect = emitted => child.on('disconnect', emitted)

  const exit = emitted => child.on('exit', emitted)
  const stdout = child.stdout ? emitted => child.stdout.on('data', emitted) : noop
  const stderr = child.stderr ? emitted => child.stderr.on('data', emitted) : noop
  return { action, error, close, disconnect, exit, stdout, stderr }
}

const registerTimeout = (kill, timeoutMS) => {
  let timeoutID = null
  timeoutID = setTimeout(() => {
    kill()
    throw new Error(__.FORK_TIMEOUT)
  }, timeoutMS)
  return () => clearTimeout(timeoutID)
}


const createFork = ({ timeoutMS, store }) => (...args) => new Promise((resolve, reject) => {
  let initialized = false
  timeoutMS.should.be.a('number')
  args.should.be.an('array').and.have.length.within(1, 3)
  const child = cp.fork(...args)
  const listeners = forkListener(child)

  const kill = () => child.kill()
  let cancelTimeout = registerTimeout(kill, timeoutMS)

  listeners.close(code => initialized ? console.warn(`PARENT|CLOSED => ${code}`) : reject(new Error(`PARENT|CLOSE_BEFORE_INIT => ${code}`)))
  listeners.error(err => initialized ? console.error(err, 'PARENT|RECEIVED ERROR') : reject(err))
  listeners.exit((code, signal) => {
    if(!initialized)
      reject(new Error(`PARENT|EXIT_BEFORE_INIT => ${code}, signal`))
  })

/*
  const dispatchReceive = notify => {
    console.warn('PARENT|DISPATCHRECEIVE')
    notify(action)
  }
  */

  const dispatch = action => {
    console.warn('PARENT|DISPATCH', action)
    child.send(action)
  }

  listeners.action(action => {
    console.warn('ACTION RECEIVED =>', action)
    if(!action || !action.type) return
    const { type, meta, payload, error } = action
    if(error) return log.error({ action }, 'RECEIVE_ERROR')



    switch(meta) {
      case __.INIT:
        if(initialized) throw new Error('FORK ALREADY INITIALIZED: INIT signal should only be called once.')
        initialized = true
        cancelTimeout()
        resolve({ listeners, dispatch, kill })
        break
    }
  })


  listeners.stdout(data => console.info(`STDOUT: ${data}`))
  listeners.stderr(data => console.warn(`STDERR: ${data}`))
})



const reduceChild = ({ child, timeoutMS }) => action => new Promise((resolve, reject) => {
  child.send({ meta: __.REDUCE, ...action })
})



export default function procmux ( reducer
                                , { log = createLogger({ name: 'procmux' })
                                  , timeoutMS = 4000
                                  } = {}
                                ) {

  let done = false
  const orphan = typeof process.env[__.PMUX] === 'undefined'
  let forks = new Map()
  let registers = new Map()
  let currentState = {}

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
    process.on('message', _action => {
      if(_action.type === type)
        action(_action)
    })
    registers.set(type, action)
  }

  /** DISPATCH UP THE TREE TO PARENTS */
  const dispatch = (...args) => co(function* () {
      const [action] = args
      should.exist(action)
      action.should.be.an('object')
        .that.has.property('type')
          .that.is.a('string')
          .that.matches(/^[A-Z_]+$/)

      reduce(action)

      process.send(action)

      return { ...args }
  })


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



  const fork = (...args) => co(function* () {
    const [forkID, ...forkArgs] = validateFork(...args)
    const forked = yield createFork({ timeoutMS })(...forkArgs)
    /** CHILD REGISTERS HERE AND HERE ALONE */

    currentState[forkID] = {}
    forks.set(forkID, forked)
    /** listeners, dispatch, kill */
    forked.listeners.action(action => {
      if(action.meta === 'DONE') {
        done = true
      }
    })
    return forked
  })

  const init = (orphanInit = () => {}) => {
    if(orphan)
      return orphanInit()

    process.on('message', action => {
      console.warn('CHILD|RECEIVED FROM PARENT =>', action)
      if(!action || !action.type) return
      const { type, meta, payload, error } = action
      if(error) return log.error({ action }, 'RECEIVE_ERROR')
    })
    console.warn('CHILD|SENDING INIT TO PARENT', process.env[__.PMUX])
    process.send({ type: __.INIT, meta: __.INIT, payload: process.env[__.PMUX] })
  }
  const initSync = (...args) => {
    init(...args)
    require('deasync').loopWhile(function() {
      done !== true
    })
  }
  return { fork, dispatch, register, getState, reducer, exit, init, initSync, orphan }
}
