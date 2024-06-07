class Sampler {
  seed = 0
  constructor(seed?: number) {
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
  constructor(seed?: number) {
    super(seed)
  }

  sample1D = () => {
    return 0
  }
}

export { Sampler, IndependentSampler }