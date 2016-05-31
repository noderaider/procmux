const procmux = require('../../lib').default
const mux = procmux()

mux.init(() => console.warn('THIS IS RUN IF THIS MODULE RUNS FROM CLI'))
