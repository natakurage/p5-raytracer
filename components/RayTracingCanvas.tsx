"use client"

import dynamic from 'next/dynamic'
import p5Types from 'p5'
import * as rt from "../utils/raytracing"
import { Camera } from '../utils/camera'
import { Renderer } from '../utils/renderer'
import { DiffuseBRDF, DiffuseSpecularBRDF, MicrofacetSpecularBRDF, SimpleEmitter } from '../utils/materials'
import { CheckerTexture, UniformColorTexture } from '../utils/textures'

const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
  ssr: false,
})

export const RayTracingCanvas = () => {

  let scene: rt.scene.Scene
  let renderer: rt.renderer.Renderer

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    const xSize = 500
    const ySize = 500
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)
    p5.fill("gray")
    p5.text("click to render", p5.width / 2, p5.height / 2)

    const camera = new Camera(
      p5, p5.createVector(0, 0, 10),
      p5.createVector(0, 0, -1).normalize(), 0.1
    )
    const tex1 = new CheckerTexture(
      p5,
      p5.createVector(0.7, 0.5, 0.5),
      p5.createVector(0.8, 0.8, 0.8),
      5
    )
    const tex2 = new UniformColorTexture(
      p5, p5.createVector(0.5, 0.5, 0.5)
    )
    const mat1 = new DiffuseBRDF(p5, tex1)
    const mat2 = new DiffuseSpecularBRDF(
      p5, tex2,  0.2
    )
    const light = new SimpleEmitter(
      p5, p5.createVector(1, 1, 1), 1
    )
    const ambColor = p5.createVector(0.5, 0.5, 0.5)
    scene = new rt.scene.Scene([
      new rt.primitives.Sphere(
        p5, p5.createVector(0.7, 0.7, 0.7), 0.1, light),
      new rt.primitives.Sphere(
        p5, p5.createVector(0, 0, 0), 1, mat1),
      new rt.primitives.Sphere(
        p5, p5.createVector(0, -101, 0), 100, mat2)
    ], camera, ambColor)

    renderer = new Renderer(50)
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
