import p5Types from 'p5'

class Sampler {
  p5: p5Types
  seed = 0
  constructor(p5: p5Types, seed?: number) {
    this.p5 = p5
    if (seed) { this.seed = seed }
  }

  sample1D = () => {
    throw new Error("not implemented")
    return 0
  }

  sampleND = (n: number) => {
    return Array.from({length: n}).map(() => {this.sample1D})
  }

  sample2D = () => {
    return [this.sample1D(), this.sample1D()]
  }

}

class IndependentSampler extends Sampler{
  constructor(p5: p5Types, seed?: number) {
    super(p5, seed)
  }

  sample1D = () => {
    return 0
  }
}

export { Sampler, IndependentSampler }