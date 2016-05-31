# procmux

**a lightweight module to ease control flow and signaling between forked processes and their parents. Heavily inspired by Redux and works best with co.**

[![NPM](https://nodei.co/npm/procmux.png?stars=true&downloads=true)](https://nodei.co/npm/procmux/)

## Install

`npm i -S procmux`


## How to use

**actionTypes.js - If this looks like Redux, thats because I jacked it.**

```js
export const START = 'START'
export const STARTED = 'STARTED'
export const PROCESS = 'PROCESS'
export const PROCESSING = 'PROCESSING'
export const PROCESSED = 'PROCESSED'
export const STOP = 'STOP'
```

**scheduler.js**

This process schedules child processes via dispatching actions.

```js
import procmux, {EXIT} from 'procmux'
import co from 'co'
import { inspect } from 'util'

import {START,STARTED,PROCESS,STOP,STOPPED} from './actionTypes'



co(function* () {
  const mux = procmux(reducer)

  /** fork and add child process under key 'processor' and stop until the child is ready to go */
  const proc = yield mux.fork('processor', 'processor.js')

  console.info(inspect(proc))) /** { dispatch, register, kill } */

  /** register an action to run when child dispatches its EXIT action. */
  proc.register(EXIT, ({ code }) => console.info(`child process exited with code ${code}`))


  /** dispatch START action to all processes. (maybe return state here) */
  yield mux.dispatch({ type: START })

  /** get the state of the child processor. */
  console.info('post-start', proc.getState())

  /** dispatch PROCESS action to child processor and its subprocesses only. */
  yield proc.dispatch({ type: PROCESS, { indices: [1, 2, 3] } })

  /** get state of all processes currently */
  const { processor } = mux.getState()

  /** force children to reduce and return updated state. */
  const { processor } = yield mux.queryState()



  /** register an action from any child or parent */
  mux.register(EXIT, ({ processKey, code }) => console.info(`child process ${processKey} exited with code ${code}`))

  /** Ask processor to stop processing after 10 seconds */
  setTimeout(() => proc.dispatch(STOP), 10000)
})
```

**DISPATCH => ACTIONS() => REDUCERS()


**processor.js**

This process is launched as a fork from its parent and should have no knowledge regarding its parent.

```js
import procmux, {EXIT} from 'procmux'
import {START,STARTED,PROCESS,PROCESSED,STOP} from './actionTypes'


/** Reducers work identically to those in Redux. */
function reducer (state = {}, action = {}) {
  const { type } = action
  switch(type) {
    case START:
      return { ...state, status: 'STARTING' }
    case STARTED:
    case PROCESSED:
      return { ...state, status: 'RUNNING' }
    case PROCESS:
      return { ...state, status: 'PROCESSING' }
    case STOP:
      return { ...state, status: 'STOPPING' }
    case EXIT:
      return { ...state, status: 'OFF' }
  }
  return state
}

/** Each process can register max of 1 reducer. It is not used within this process, only for its parents. */
const mux = procmux(reducer)

function start() {
  setTimeout(() => mux.dispatch({ type: STARTED }), 1000)
}


mux.register(START, start)

mux.register(PROCESS, () => {
  /** kick off some processing */
  mux.dispatch({ type: PROCESSING })
  setTimeout(() => mux.dispatch({ type: PROCESSED }), 5000)
})

mux.register(STOP, () => {
  /** mux.exit triggers a process.exit but ensures the reducer gets run first to return final state. */
  mux.exit(0)
})

/** Call init to tell parent its ready, provide optional start function to be executed immediately if there is no parent process. (executed at CLI) */
mux.init(start)
```
