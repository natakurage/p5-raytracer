"use client"

import dynamic from 'next/dynamic'
import p5Types from 'p5'
import * as rt from "../utils/raytracing"
import { Camera } from '../utils/camera'

const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
  ssr: false,
})

export const RayTracingCanvas = () => {

  let scene: rt.scene.Scene
  const xSize = 500
  const ySize = 500
  const nSamples = 10

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)
    p5.fill("gray")
    p5.text("click to render", p5.width / 2, p5.height / 2)
  }

  const render = (p5: p5Types, nSamples: number) => {
    console.log("render started")
    const camera = new Camera(
      p5, p5.createVector(0, 10, 10),
      p5.createVector(0, -1, -1).normalize(), 0.1, xSize / ySize
    )
    scene = new rt.scene.Scene([
      new rt.primitives.Sphere(p5, p5.createVector(0, 0, 0), 1),
      new rt.primitives.Sphere(p5, p5.createVector(0, -101, 0), 100)
    ], camera, p5.createVector(1, 1, 1))

    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = getPixelColor(p5, i, j, nSamples, scene)
        p5.set(j, i, p5.color(
          255 * pixelColor.x,
          255 * pixelColor.y,
          255 * pixelColor.z))
      }
      if (i !== 0 && i % 50 === 0) {
        console.log(`rendered ${i}th scan line...`)
      }
    }
    p5.updatePixels()
  }

  const getPixelColor = (p5: p5Types, i: number, j: number, nSamples: number, scene: rt.scene.Scene) => {
    const pixelColor = p5.createVector(0, 0, 0)
    let validSamples = 0
    for (let sample = 0; sample < nSamples; sample++) {
      // const screen_pos = p5.createVector(
      //   2 * (j / p5.width) - 1,
      //   2 * (1 - i / p5.height) - 1,
      //   0
      // ).add(p5.createVector(
      //   p5.random(-0.5, 0.5) * 2 / p5.width,
      //   p5.random(-0.5, 0.5) * 2 / p5.height,
      //   0
      // ))
      // let ray = new rt.ray.Ray(scene.eyePos, (p5Types.Vector.sub(screen_pos, scene.eyePos)))
      let ray = scene.camera.generateRay(j / p5.width, i / p5.height)

      let depth = 0
      const max_depth = 10
      const ray_color = p5.createVector(1, 1, 1)
      while (depth < max_depth) {
        const rec = scene.hit(ray)
        if (rec.success) {
          let lnDot = p5Types.Vector.dot(rec.normal, rec.l)
          ray_color.mult(rec.brdf.mult(lnDot).div(rec.pdf))
          ray = new rt.ray.Ray(rec.pos, rec.l)
        } else {
          pixelColor.add(scene.ambientColor.copy().mult(ray_color))
          validSamples++
          break
        }
        depth++
      }
    }
    if (validSamples !== 0) {      
      pixelColor.div(validSamples)
    }
    return pixelColor
  }

  const draw = (p5: p5Types) => {
    
  }

  // const windowResized = (p5: p5Types) => {
  //   p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  // }

  const mouseClicked = (p5: p5Types) => {
    render(p5, nSamples)
  }

  return (
    <Sketch
      preload={preload}
      setup={setup}
      draw={draw}
      // windowResized={windowResized}
      mouseClicked={mouseClicked}
    />
  )
}

export default RayTracingCanvas
