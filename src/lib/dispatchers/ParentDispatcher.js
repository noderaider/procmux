import { EventEmitter } from 'events'
import * as __ from '../constants'
const should = require('chai').should()

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


export default class ParentDispatcher extends EventEmitter {
  constructor({ log, handleReduceSelf, handleDispatch } = {}) {
    super()

    should.exist(this.log)
    should.exist(handleReduceSelf)
    should.exist(handleDispatch)
    this.log = log
    this.handleReduceSelf = handleReduceSelf
    this.handleDispatch = handleDispatch
  }


  init = () => new Promise((resolve, reject) => {
    process.on('message', action => {
      if(!action || !action.type) return
        const { type, meta, payload, error } = action
        if(error) return this.log.error({ action }, 'RECEIVE_ERROR')

        /** CAN BE ORDERED TO REDUCE OR DISPATCH BY ITS PARENT, MUST SIGNAL FINALIZERS BACK */
        switch(meta) {
          case __.REDUCE:
            this._reduceSelf(action)
            break
          case __.DISPATCH:
            this.dispatch(action)
            break
          case __.DISPATCH_PARENT_END:
            this._dispatchParentEnd(action)
            break
        }
    })
  });

    /** Starts the dispatch */
  dispatch = action => {
    console.warn('dispatch called (parent-dispatcher)')
    this.dispatch(action)
    process.send({ type: 'INTERNAL', meta: __.DISPATCH_END, otherOtherMeta: 'BLAAAAAH' })
  };
  dispatchParent = action => {
    if(process.send)
      process.send({ ...action, meta: __.DISPATCH, otherMeta: 'BLAHBLAH' })
  };
  _dispatchParentEnd = action => {
    this.handleDispatchParent({ type: 'DISPATCH_PARENT_END', meta: 'BLAH'})
  };
  /** Starts the reduce */
  _reduceSelf = action => {
    console.warn('reduce called')
    this.handleReduceSelf(action)
    process.send({ msg: 'REDUCE SELF'})
  };
}
