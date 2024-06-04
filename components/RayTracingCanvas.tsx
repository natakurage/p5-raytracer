"use client"

import dynamic from 'next/dynamic'
import p5Types from 'p5'
import * as rt from "../utils/raytracing"
import { Camera } from '../utils/camera'
import { Renderer } from '../utils/renderer'

const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
  ssr: false,
})

export const RayTracingCanvas = () => {

  let scene: rt.scene.Scene
  let renderer: rt.renderer.Renderer

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    const xSize = 1000
    const ySize = 500
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)
    p5.fill("gray")
    p5.text("click to render", p5.width / 2, p5.height / 2)

    const camera = new Camera(
      p5, p5.createVector(0, 1, 5),
      p5.createVector(0, 0, -1).normalize(), 0.1
    )
    scene = new rt.scene.Scene([
      new rt.primitives.Sphere(p5, p5.createVector(0, 0, 0), 1),
      new rt.primitives.Sphere(p5, p5.createVector(0, -101, 0), 100)
    ], camera, p5.createVector(1, 1, 1))

    renderer = new Renderer(10)
  }

  const draw = (p5: p5Types) => {
    
  }

  // const windowResized = (p5: p5Types) => {
  //   p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  // }

  const mouseClicked = (p5: p5Types) => {
    renderer.render(p5, scene)
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
