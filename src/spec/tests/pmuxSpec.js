describe('BunyanFork', () => {
  const lib = require('../../lib')
  const pmux = lib.default
  const {EXIT} = lib

  it('is an object', () => expect(pmux).toEqual(jasmine.any(Object)))
  it('has fork function', () => expect(pmux.fork).toEqual(jasmine.any(Function)))
  it('has pub function', () => expect(pmux.pub).toEqual(jasmine.any(Function)))
  it('has sub function', () => expect(pmux.sub).toEqual(jasmine.any(Function)))
  it('has getState function', () => expect(pmux.getState).toEqual(jasmine.any(Function)))
  it('has middleware function', () => expect(pmux.middleware).toEqual(jasmine.any(Function)))
  it('has reducer function', () => expect(pmux.reducer).toEqual(jasmine.any(Function)))
  it('has orphan boolean', () => expect(pmux.reducer).toEqual(jasmine.any(Boolean)))
  it('has orphan boolean', () => expect(pmux.reducer).toEqual(jasmine.any(Boolean)))
})
