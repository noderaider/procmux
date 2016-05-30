const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const should = chai.should()

describe('procmux', () => {
  const lib = require('../lib')
  const procmux = lib.default
  const {EXIT} = lib
  const validModulePath = 'test/helpers/processor.js'
  const invalidModulePath = 'no/child/here.js'
  const nonRegisteringModulePath = 'test/helpers/nonRegistering.js'


  const isFSAStyleAction = action => {
    describe('FSA', () => {
      describe('type', () => {
        it('should be defined', () => should.exist(action.type))
        it('should be a CAPS_STYLE string', () => action.type.should.be.a('string')
                                                    .that.matches(/^[A-Z_]+$/))
      })
      describe('error', () => {
        if(typeof action.error !== 'undefined')
          it('should be boolean if defined'), () => action.error.should.be.a('boolean')
      })
    })
  }

  it('default export is mux function', () => procmux.should.be.a('function'))
  it('has EXIT string export', () => EXIT.should.be.a('string'))

  describe(':mux', () => {
    let mux = null
    beforeEach(function() { mux = procmux() })
    afterEach(function() { mux = null })

    describe('#fork', () => {

      it('is a function', () => mux.fork.should.be.an('function'))
      it('returns a promise', () => mux.fork().should.have.property('then'))
      it('rejects with DNV for 0 arguments', () => mux.fork().should.be.rejectedWith(Error, /FORK_DNV/))
      it('rejects with DNV for greater than 4 arguments', () => mux.fork(-1, validModulePath, {}, {}, 3).should.be.rejectedWith(Error, /FORK_DNV/))
      it('rejects with DNV for non-string second argument', () => mux.fork(2, 10).should.be.rejectedWith(Error, /FORK_DNV/))
      it('rejects with EXIT_BEFORE_INIT for non-existant module path', () => mux.fork(3, invalidModulePath).should.be.rejectedWith(Error, /EXIT_BEFORE_INIT/))
      it('rejects with EXIT_BEFORE_INIT for valid module path that does not register itself', () => mux.fork(5, nonRegisteringModulePath).should.be.rejectedWith(Error, /EXIT_BEFORE_INIT/))
      it('resolves valid INIT signal for valid module path', () => mux.fork(4, validModulePath).should.be.fulfilled)
    })

    describe('#register', () => {
      it('is a function', () => mux.register.should.be.a('function'))
      it('throws for 0 params', () => (() => mux.register()).should.throw())
      it('throws for greater than 2 params', () => (() => mux.register('SOMETHING', () => {}, third)).should.throw())
      it('throws for non-string first argument', () => (() => mux.register(1, () => {})).should.throw())
      it('throws for non-FSA type style first argument', () => (() => mux.register('not_capitalized', () => {})).should.throw())
      it('throws for non function type second argument', () => (() => mux.register('FSA_ACTION', 'blah')).should.throw())
      it('returns undefined for valid arguments', () => should.not.exist(mux.register('FSA_ACTION', () => {})))
    })

    describe('#dispatchParent', () => {
      it('exists', () => should.exist(mux.dispatchParent))
      it('is a function', () => mux.dispatchParent.should.be.a('function'))
      it('should return a promise', () => mux.dispatchParent({ type: 'FSA_ACTION' }).should.be.a('promise'))
    })

    describe('#dispatchFork', () => {
      const forkID = 'forked'

      it('exists', () => should.exist(mux.dispatchFork))
      it('is a function', () => mux.dispatchFork.should.be.a('function'))

      /** TODO: REENABLE AFTER FORK IS WORKING RIGHT */
      xcontext('is executed', () => {
        beforeEach(() => { mux.fork(forkID, validModulePath) })
        afterEach(() => { mux.kill(forkID) })

        it('should return a promise', () => mux.dispatchFork(forkID, { type: 'FSA_ACTION' }).should.be.rejected)
        it('rejects 1 arg', () => mux.dispatchFork(0).should.be.rejected)
        it('rejects 3 args', () => mux.dispatchFork(0, 1, 2).should.be.rejected)
        it('rejects number input', () => mux.dispatchFork(forkID, 5).should.be.rejected)
        it('rejects string input', () => mux.dispatchFork(forkID, 'string input').should.be.rejected)
        it('rejects string input', () => mux.dispatchFork(forkID, ['an array']).should.be.rejected)
        it('rejects array input', () => mux.dispatchFork(forkID, ['an', 'array']).should.be.rejected)
        it('rejects non-FSA style action', () => mux.dispatchFork(forkID, { tip: 'NOT_FSA', error: 'should be boolean' }).should.be.rejected)
        it('rejects non-FSA style action type', () => mux.dispatchFork(forkID, { type: 'not_capitalized', error: true }).should.be.rejected)
        it('resolves valid FSA style action', () => mux.dispatchFork(forkID, { type: 'FSA_TYPE' }).should.be.fulfilled)
      })

    })

    describe('#dispatch', () => {
      it('is a function', () => mux.dispatch.should.be.a('function'))
      it('should return a promise', () => mux.dispatch({ type: 'FSA_ACTION' }).should.be.a('promise'))
      it('rejects 0 args', () => mux.dispatch().should.be.rejected)
      it('rejects 2 args', () => mux.dispatch(0, 1).should.be.rejected)
      it('rejects number input', () => mux.dispatch(5).should.be.rejected)
      it('rejects string input', () => mux.dispatch('string input').should.be.rejected)
      it('rejects string input', () => mux.dispatch(['an array']).should.be.rejected)
      it('rejects array input', () => mux.dispatch(['an', 'array']).should.be.rejected)
      it('rejects non-FSA style action', () => mux.dispatch({ tip: 'NOT_FSA', error: 'should be boolean' }).should.be.rejected)
      it('rejects non-FSA style action type', () => mux.dispatch({ type: 'not_capitalized', error: true }).should.be.rejected)
      it('resolves valid FSA style action', () => mux.dispatch({ type: 'FSA_TYPE' }).should.be.fulfilled)


      xcontext('when run', () => {
        it('should get exit response from fork when killed', done => {
          mux.register('EXIT', payload => {
            done()
          })
          mux.kill('proc')
        })
      })
    })



    describe('#getState', () => {
      it('is a function', () => mux.getState.should.be.a('function'))
      it('throws if args are passed', () => (() => mux.getState(1)).should.throw())
      it('returns an object', () => mux.getState().should.be.an('object'))
      it('returns an object with keys matching forks', done => mux.fork('proc', validModulePath)
                                                              .then(() => {
                                                                const state = mux.getState()
                                                                should.exist(state.proc)
                                                                done()
                                                              }))
    })

    describe('#reducer', () => {
      it('is a function', () => mux.reducer.should.be.a('function'))
      it('throws for 0 args', () => (() => mux.reducer()).should.throw())
      it('throws for more than 1 args', () => (() => mux.reducer((state, action) => {}, 2)).should.throw())
      it('throws for non-function arg', () => (() => mux.reducer(2)).should.throw())
      it('does not throw for valid args', () => (() => mux.reducer((state, actions) => state)).should.not.throw())
    })

    describe('#exit', () => {
      it('is a function', () => mux.exit.should.be.a('function'))
      it('throws for more than 1 parameter', () => (() => mux.exit(1, 2)).should.throw())
    })

    describe('#kill', () => {
      it('is a function', () => mux.kill.should.be.a('function'))
      it('throws for more than 1 parameter', () => (() => mux.kill(1, 2)).should.throw())
      it('should return a promise', () => mux.kill('proc').should.be.a('promise'))
    })

    describe('#orphan', () => {
      it('is a boolean', () => mux.orphan.should.be.a('boolean'))
    })
  })
})
