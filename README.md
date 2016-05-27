# process-mux

**a lightweight module to ease control flow and signaling between forked processes and their parents heavily inspired by Redux.**

[![NPM](https://nodei.co/npm/process-mux.png?stars=true&downloads=true)](https://nodei.co/npm/process-mux/)

## Install

`npm i -S process-mux`


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

This process schedules child processes via publishing actions.

```js
import pmux, {EXIT} from 'process-mux'
import {fork} from 'child_process'

import {START,PROCESS,STOP} from './actionTypes'


/** fork and subscribe a child process under key processor */
let proc = pmux.fork('processor', 'processor.js')

/** publish START action to all processes. */
pmux.pub(START)

/** get the state of the child processor. */
console.info('post-start', proc.getState())

/** publish PROCESS action to child processor and its subprocesses only. */
proc.pub(PROCESS, { indices: [1, 2, 3] })

/** get state of all processes, with keys of their process names */
const { processor } = pmux.getState()


/** subscribe to EXIT action from processor */
proc.sub(EXIT, ({ code }) => console.info(`child process exited with code ${code}`))

/** subscribe to EXIT action from any processor */
pmux.sub(EXIT, ({ processKey, code }) => console.info(`child process ${processKey} exited with code ${code}`))

/** Ask processor to stop processing after 10 seconds */
setTimeout(() => proc.pub(STOP), 10000)
```


**processor.js**

This process is launched as a fork from its parent and should have no knowledge regarding its parent.

```js
import pmux, {EXIT} from 'process-mux'
import {START,STARTED,PROCESS,PROCESSING,PROCESSED,STOP} from './actionTypes'

pmux.middleware(next => action => {
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

pmux.reducer((state = { status: 'child is dead', lastError: null }, action) => {
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
  pmux.pub(STARTED)
}

const process = ({ indices }) => {
  /** kick off some processing */
  pmux.pub(PROCESSING)
  setTimeout(() => pmux.dispatch(PROCESSED, { results: indices.map(x => x * 2 + 1) }), 5000)
}

const stop = () => {
  /** pmux.exit triggers a process.exit but ensures the middleware and reducer get run with the exit status first. */
  pmux.exit(0)
}



/** handle special logic when this was run directly from command line (not forked). */
if(pmux.orphan) start()
```
