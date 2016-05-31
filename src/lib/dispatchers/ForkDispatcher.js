import { EventEmitter } from 'events'
import * as __ from '../constants'
const should = require('chai').should()

export default class ForkDispatcher extends EventEmitter {
  constructor({ log, timeoutMS, handleDispatch, handleReduce, handleError, handleDisconnect, handleExit, handleClose } = {}) {
    super()

    should.exist(log)
    should.exist(timeoutMS)
    should.exist(handleDispatch)
    should.exist(handleReduce)
    should.exist(handleError)
    should.exist(handleDisconnect)
    should.exist(handleClose)
    should.exist(handleExit)
    timeoutMS.should.be.a('number')
    handleDispatch.should.be.a('function')
    handleReduce.should.be.a('function')
    handleError.should.be.a('function')
    handleDisconnect.should.be.a('function')
    handleClose.should.be.a('function')
    handleExit.should.be.a('function')

    this.initialized = false

    this.log = log
    this.timeoutMS = timeoutMS
    this.handleDispatch = handleDispatch
    this.handleReduce = handleReduce
    this.handleError = handleError
    this.handleDisconnect = handleDisconnect
    this.handleExit = handleExit
    this.handleClose = handleClose
  }
  init = child => new Promise((resolve, reject) => {
    let timeoutID = null
    this._child = child

    timeoutID = setTimeout(() => {
      if(this.initialized) return
      if(child.stdin)
        child.stdin.pause()
      child.kill()
      reject(new Error(__.FORK_TIMEOUT))
    }, this.timeoutMS)

    child.on('close', () => {
      if(!this.initialized)
        reject(new Error('CLOSE_BEFORE_INIT'))
      this._onClose()
    })
    child.on('disconnect', () => {
      this._onDisconnect()
    })
    child.on('error', err => {
      if(!this.initialized)
        return reject(err)
      this._onError(err)
    })
    child.on('exit', () => {
      if(!this.initialized)
        reject(new Error('EXIT_BEFORE_INIT'))
      this._onExit()
    })

    /** CAN RECEIVE INIT EVENT FROM CHILDREN, REDUCE FINALIZER, DISPATCH, AND DISPATCH FINALIZER */
    child.on('message', action => {
      if(!action || !action.type) return
      const { type, meta, payload, error } = action
      console.warn('RECEIVE FROM CHILD =>', action)
      if(error) return this.log.error({ action }, 'RECEIVE_ERROR')
      switch(meta) {
        case __.INIT:
          if(this.initialized) throw new Error('FORK ALREADY INITIALIZED: INIT signal should only be called once.')
          this.initialized = true
          clearTimeout(timeoutID)
          resolve(child)
          break
          /*
        case __.REDUCE_END:
          this._onReduceEnd()
          break
          */
        case __.DISPATCH:
          console.warn('DISPATCH CALLED FROM CHILD TO PARENT', action)
          this._onDispatch(action)

          break
        case __.DISPATCH_END:
          this._onDispatchEnd(action)
          break
        default:

      }
    })
  });
  /** Starts the dispatch */
  dispatch = action => {
    console.warn('dispatch called')
    this._child.send({ ...action, meta: __.DISPATCH })
  };
  _onDispatch = action => {
    const { type, meta } = action
    switch(type) {

    }
//    this._onDispatchEnd()
  }
  /** Gets called when dispatch finishes */
  _onDispatchEnd = action => {
    console.warn('_onDispatch called')
    this.handleDispatch(action)
  };
  /** Starts the reduce */
  reduce = action => {
    console.warn('reduce called')
    this._child.send({ ...action, meta: __.REDUCE })
  };
  /** Gets called when the reduce finishes */
  _onReduceEnd = action => {
    console.warn('_onReduceEnd called')
    this.handleReduce(action)
  };
  _onError = err => {
    console.warn('_onError called')
    this.handleError(err)
  };
  _onDisconnect = () => {
    console.warn('_onDisconnect called')
    this.handleDisconnect()
  };
  _onClose = () => {
    console.warn('_onClose called')
    this.handleClose()
  };
  _onExit = () => {
    console.warn('_onExit called')
    this.handleExit()
  };

}
