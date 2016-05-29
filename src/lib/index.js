import Promise from 'bluebird'
import co from 'co'
import { createLogger } from 'bunyan'
import cp from 'child_process'
import { inspect } from 'util'
import chai from 'chai'
const should = chai.should()

const PMUX = 'PMUX'
const ROOT = 'ROOT'
const INIT = 'INIT'
const REDUCE = 'REDUCE'
const NO_INIT = 'NO_INIT'
const SYNC_ERROR = 'SYNC_ERROR'
const FORK_ERROR = 'FORK_ERROR'
export const EXIT = 'EXIT'

function pmuxAction(...args) {
  const [type, payload] = args
  if(!type)
    return
  return ({ type, payload })
}

const createFork = ({ timeoutMS }) => (...args) => new Promise((resolve, reject) => {
  let timeoutID = null
  try {
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
  } catch(err) {
    clearTimeout(timeoutID)
    reject(err)
  }
})


export default function processMux( { log = createLogger({ name: 'process-mux' })
                                    , timeoutMS = 4000
                                    } = {} ) {

  const orphan = typeof process.env[PMUX] === 'undefined'
  let forks = new Map()
  let state = {}
  let reducers = {}
  let reduceState = (state, action) => {
    let forkIDs = Array.from(forks.keys())
    return Object.keys(reducers).reduce((prevState, x) => {
      const reducer = reducers[x]
      return reducer ? { ...prevState, [x]: reducer(state, action) } : prevState
    }, {})
  }

  const sub = (...args) => {
    should.exist(args)
    args.should.have.lengthOf(2)
    const [type, callback] = args
    type.should.be.a('string')
      .that.matches(/^[A-Z_]+$/)
    callback.should.be.a('function')

    const subscribePayload = action => {
      if(!action.type)
        return
      if(action.type === type)
        callback(action.payload)
    }

    Array.from(forks.values()).forEach(x => x.on('message', subscribePayload))
    if(!orphan)
      process.on('message', subscribePayload)
  }

  /** IMPLEMENT THUNKS */
  const pub = action => {
    should.exist(action)
    action.should.be.an('object')
      .that.has.property('type')
        .that.is.a('string')
        .that.matches(/^[A-Z_]+$/)

    state = reduceState(state, action)

    /**
     * Publish down the tree, then up the tree
     * NEEDS TESTS
     */
    Array.from(forks.values()).forEach(x => x.send(action))
    if(!orphan)
      process.send(action)
  }

  const fork = (...args) => {
    args.length.should.be.above(0).and.below(5)
    return co(function* () {
      try {
        const [forkID, ...forkArgs] = args
        should.exist(forkID)
        forks.has(forkID).should.be.false
        const [modulePath, childArgs, options] = forkArgs
        should.exist(modulePath)
        modulePath.should.be.a('string')
        const env = { [PMUX]: forkID }
        const opts = options ? { ...options, env  } : { env }
        const lastArgs = childArgs ? [childArgs, opts] : [opts]
        const child = yield createFork({ timeoutMS })(modulePath, ...lastArgs)
        state[forkID] = {}
        /** TODO: RETURN A SPECIALIZED PUB / SUB FOR THIS SPECIFIC CHILD */
        return forks.set(forkID, child)
      } catch(err) {
        throw err
      }
    })
  }
  const getState = (...args) => {
    args.should.have.lengthOf(0)
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
    pub({ type: EXIT })
    process.exit(0)
  }
  if(!orphan)
    process.send(pmuxAction(INIT, process.env[PMUX]))
  return { fork, pub, sub, getState, reducer, exit, orphan }
}
