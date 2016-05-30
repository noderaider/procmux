# procmux

**a lightweight module to ease control flow and signaling between forked processes and their parents heavily inspired by Redux.**

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

import {START,PROCESS,STOP} from './actionTypes'

co(function* () {
  const mux = procmux()

  /** fork and subscribe a child process under key processor */
  const proc = yield mux.fork('processor', 'processor.js')

  console.info(inspect(proc))) /** { dispatch, kill } */

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


  /** subscribe to EXIT action from processor */
  proc.subscribe(EXIT, ({ code }) => console.info(`child process exited with code ${code}`))

  /** subscribe to EXIT action from any processor */
  mux.subscribe(EXIT, ({ processKey, code }) => console.info(`child process ${processKey} exited with code ${code}`))

  /** Ask processor to stop processing after 10 seconds */
  setTimeout(() => proc.dispatch(STOP), 10000)
})
```

**DISPATCH => ACTIONS() => REDUCERS()


**processor.js**

This process is launched as a fork from its parent and should have no knowledge regarding its parent.

```js
import procmux, {EXIT} from 'procmux'
import {START,STARTED,PROCESS,PROCESSING,PROCESSED,STOP} from './actionTypes'

const mux = procmux()

/** DROPPING MIDDLEWARE IN FAVOR OF mux.subscribe FOR INITIAL */
/*
mux.middleware(next => action => {
  const { type, payload } = action
  switch(type) {
    case START:
      start(payload)
    case PROCESS:
      process(payload)
    case STOP:
      stop(payload)
  }
  return next(action)
})
*/

mux.reducer((state = { status: 'child is dead', lastError: null }, action) => {
  const { type, payload, error } = action
  if(error)
    return { ...state, lastError: payload }
  switch(type) {
    case START:
      return { ...state, status: 'child is starting' }
    case STARTED:
      return { ...state, status: 'child is running' }
    case PROCESS:
      return { ...state, status: `child is about to process indices ${payload.indices.join(', ')}` }
    case PROCESSING:
      return { ...state, status: 'child is processing' }
    case PROCESSED:
      return { ...state, status: 'child finished processing with results ${payload.results.join(', ')}' }
    case STOP:
      return { ...state, status: 'child is stopping' }
    case EXIT:
      return { ...state, status: `child is dead with exit code ${payload.code}` }
  }
  return state
})


const start = () => {
  /** start doing stuff */
  mux.dispatch(STARTED)
}

const process = ({ indices }) => {
  /** kick off some processing */
  mux.dispatch(PROCESSING)
  setTimeout(() => mux.dispatch(PROCESSED, { results: indices.map(x => x * 2 + 1) }), 5000)
}

const stop = () => {
  /** mux.exit triggers a process.exit but ensures the middleware and reducer get run with the exit status first. */
  mux.exit(0)
}



/** handle special logic when this was run directly from command line (not forked). */
if(mux.orphan) start()
```
