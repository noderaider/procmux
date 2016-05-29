import Promise from 'bluebird'
import { inspect } from 'util'

describe('process-mux', () => {
  const lib = require('../../lib')
  const processMux = lib.default
  const {EXIT} = lib
  const validModulePath = 'spec/helpers/processor.js'
  const invalidModulePath = 'no/child/here.js'
  const nonRegisteringModulePath = 'spec/helpers/nonRegistering.js'

  it('default export is pmux function', () => expect(processMux).toEqual(jasmine.any(Function)))
  it('has EXIT string export', () => expect(EXIT).toEqual(jasmine.any(String)))

  describe('pmux', () => {
    let pmux = null
    beforeEach(() => { pmux = processMux() })

    describe('fork', () => {
      it('is a function', () => expect(pmux.fork).toEqual(jasmine.any(Function)))
      it('throws for 0 arguments', () => expect(() => pmux.fork()).toThrow())
      it('throws for greater than 4 arguments', () => expect(() => pmux.fork(-1, validModulePath, {}, {}, 3)).toThrow())

      beforeEach(() => console.info('running fork async test...'))
      const shouldPass = done => result => {
        expect(result).toEqual(jasmine.any(Object))
        done()
      }
      //const shouldNotPass = result => expect(result).toBeUndefined()
      const shouldFail = done => err => {
        expect(err).toEqual(jasmine.any(Object))
        done()
      }
      it('errors on non-string second argument', done => {
        pmux.fork(2, 10).catch(shouldFail(done))
      })
      it('reports error on non-existant module path', done =>  {
        pmux.fork(3, invalidModulePath).catch(shouldFail(done))
      })
      it('reports error for valid module path that does not register itself', done =>  {
        pmux.fork(5, nonRegisteringModulePath).catch(shouldFail(done))
      })
      it('receives valid INIT signal for valid module path', done =>  {
        pmux.fork(4, validModulePath).then(shouldPass(done))
      })
    })
    describe('sub', () => {
      it('is a function', () => expect(pmux.sub).toEqual(jasmine.any(Function)))
      it('throws for 0 params', () => expect(() => pmux.sub()).toThrow())
      it('throws for greater than 2 params', () => expect(() => pmux.sub('SOMETHING', () => {}, third)).toThrow())
      it('throws for non-string first argument', () => expect(() => pmux.sub(1, () => {})).toThrow())
      it('throws for non-FSA type style first argument', () => expect(() => pmux.sub('not_capitalized', () => {})).toThrow())
      it('throws for non function type second argument', () => expect(() => pmux.sub('FSA_ACTION', 'blah').toThrow()))
      it('returns undefined for valid arguments', () => expect(pmux.sub('FSA_ACTION', () => {})).toBeUndefined())
    })


    describe('pub', () => {
      it('is a function', () => expect(pmux.pub).toEqual(jasmine.any(Function)))
      it('throws on 0 arguments', () => expect(() => pmux.pub()).toThrow())
      it('throws on number input', () => expect(() => pmux.pub(5)).toThrow())
      it('throws on string input', () => expect(() => pmux.pub('string input')).toThrow())
      it('throws on array input', () => expect(() => pmux.pub(['an', 'array'])).toThrow())
      it('should throw on non-FSA style action', () => expect(() => pmux.pub({ tip: 'NOT_FSA', error: 'should be boolean' })).toThrow())
      it('should throw on non-FSA style action type', () => expect(() => pmux.pub({ type: 'not_capitalized', error: true })).toThrow())
      it('should not throw for valid FSA style action', () => expect(() => pmux.pub({ type: 'FSA_TYPE' })).not.toThrow())
    })



    describe('getState', () => {
      it('is a function', () => expect(pmux.getState).toEqual(jasmine.any(Function)))
      it('throws if args are passed', () => expect(() => pmux.getState(1)).toThrow())
      it('returns an object', () => expect(pmux.getState()).toEqual(jasmine.any(Object)))
      it('returns an object with keys matching registered forks', done => {
        pmux.fork('proc', validModulePath)
          .then(() => {
            const state = pmux.getState()
            expect(state.proc).toBeDefined()
            done()
          })
      })
    })

    describe('reducer', () => {
      it('is a function', () => expect(pmux.reducer).toEqual(jasmine.any(Function)))
      it('throws for 0 args', () => expect(() => pmux.reducer()).toThrow())
      it('throws for more than 1 args', () => expect(() => pmux.reducer((state, action) => {}, 2)).toThrow())
      it('throws for non-function arg', () => expect(() => pmux.reducer(2)).toThrow())
      it('does not throw for valid args', () => expect(pmux.reducer((state, actions) => state)))
    })

    describe('exit', () => {
      it('is a function', () => expect(pmux.exit).toEqual(jasmine.any(Function)))
      it('throws for more than 1 parameter', () => expect(() => pmux.exit(1, 2)).toThrow())
    })

    describe('orphan', () => {
      it('is a boolean', () => expect(pmux.orphan).toEqual(jasmine.any(Boolean)))
    })

    afterEach(() => { pmux = null })
  })
})
