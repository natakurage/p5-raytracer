import p5Types from 'p5'

const randomOnUnitSphere = (p5: p5Types) => {
  const cosTheta = 1 - 2 * p5.random()
  const sinTheta = (1 - cosTheta ** 2) * (1/2)
  const phi = p5.random(0, 2 * p5.PI)
  return p5.createVector(
    sinTheta * p5.cos(phi),
    sinTheta * p5.sin(phi),
    cosTheta
  )
}

const randomOnHemiSphere = (p5: p5Types, normal: p5Types.Vector) => {
  let vec = randomOnUnitSphere(p5)
  if (p5Types.Vector.dot(vec, normal) < 0) {
    vec.mult(-1)
  }
  return vec
}

export { randomOnUnitSphere, randomOnHemiSphere }