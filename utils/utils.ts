import { Vector3 } from "./vector"

const randomOnUnitSphere = () => {
  const cosTheta = 1 - 2 * Math.random()
  const sinTheta = (1 - cosTheta ** 2) * (1/2)
  const phi = Math.random() * 2 * Math.PI
  return new Vector3(
    sinTheta * Math.cos(phi),
    sinTheta * Math.sin(phi),
    cosTheta
  )
}

const randomOnHemiSphere = (normal: Vector3) => {
  let vec = randomOnUnitSphere()
  if (vec.dot(normal) < 0) {
    vec = vec.mult(-1)
  }
  return vec
}

export { randomOnUnitSphere, randomOnHemiSphere }