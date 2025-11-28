import { Mesh, Program, Texture } from 'ogl'

import fragment from 'shaders/image-fragment.glsl'
import vertex from 'shaders/image-vertex.glsl'

import { map } from 'utils/math'

import Number from './Number'
import Title from './Title'

export default class {
  constructor ({ geometry, gl, image, index, length, renderer, scene, screen, text, viewport, onClick }) {
    this.extra = 0

    this.geometry = geometry
    this.gl = gl
    this.image = image
    this.index = index
    this.length = length
    this.renderer = renderer
    this.scene = scene
    this.screen = screen
    this.text = text
    this.viewport = viewport
    this.onClick = onClick || null

    this.createShader()
    this.createMesh()
    this.createTitle()

    this.onResize()
  }

  createShader () {
    const texture = new Texture(this.gl, {
      generateMipmaps: false
    })

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uViewportSizes: { value: [this.viewport.width, this.viewport.height] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() }
      },
      transparent: true
    })

    const image = new Image()

    image.src = this.image
    image.onload = _ => {
      texture.image = image

      this.program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight]
    }
  }

  createMesh () {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    })

    this.plane.setParent(this.scene)
  }

  createTitle () {
    this.number = new Number({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.index % (this.length / 2),
    })

    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
    })
  }

  update (scroll, direction) {
    // LAYOUT CUSTOMIZATION:
    // 1. Horizontal positioning - controls spacing along X axis
    this.plane.position.x = this.x - scroll.current - this.extra
    
    // 2. Vertical positioning - creates the circular/wave effect
    //    Change 75 to adjust wave height (larger = more curve)
    //    Change -74.5 to adjust vertical offset
    //    Change Math.PI to adjust wave frequency
    this.plane.position.y = Math.cos((this.plane.position.x / this.widthTotal) * Math.PI) * 75 - 74.5
    
    // 3. Rotation - makes items rotate as they move
    //    Change Math.PI values to adjust rotation range
    //    Set to 0 to disable rotation
    this.plane.rotation.z = map(this.plane.position.x, -this.widthTotal, this.widthTotal, Math.PI, -Math.PI)

    this.speed = scroll.current - scroll.last

    this.program.uniforms.uTime.value += 0.04
    this.program.uniforms.uSpeed.value = this.speed

    const planeOffset = this.plane.scale.x / 2
    const viewportOffset = this.viewport.width

    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset

    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal

      this.isBefore = false
      this.isAfter = false
    }

    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal

      this.isBefore = false
      this.isAfter = false
    }
  }

  /**
   * Check if a 2D point (mouse/touch position) intersects with this media item.
   * @param {number} x - Normalized x position (-1 to 1)
   * @param {number} y - Normalized y position (-1 to 1)
   * @returns {boolean} - True if the point intersects with this item
   */
  checkIntersection (x, y) {
    // Convert normalized coordinates to viewport coordinates
    const viewportX = x * this.viewport.width / 2
    const viewportY = -y * this.viewport.height / 2

    // Check if point is within the bounds of this plane
    const planeLeft = this.plane.position.x - this.plane.scale.x / 2
    const planeRight = this.plane.position.x + this.plane.scale.x / 2
    const planeTop = this.plane.position.y + this.plane.scale.y / 2
    const planeBottom = this.plane.position.y - this.plane.scale.y / 2

    return viewportX >= planeLeft && viewportX <= planeRight &&
           viewportY >= planeBottom && viewportY <= planeTop
  }

  /**
   * Events.
   */
  onResize ({ screen, viewport } = {}) {
    if (screen) {
      this.screen = screen
    }

    if (viewport) {
      this.viewport = viewport

      this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height]
    }

    // LAYOUT CUSTOMIZATION - Item Sizing:
    // Adjust base scale (1500) to make items larger/smaller overall
    this.scale = this.screen.height / 1700

    // Item dimensions - adjust 900 and 700 to change aspect ratio
    // 900 = height multiplier, 700 = width multiplier
    this.plane.scale.y = this.viewport.height * (900 * this.scale) / this.screen.height
    this.plane.scale.x = this.viewport.width * (700 * this.scale) / this.screen.width

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y]

    // LAYOUT CUSTOMIZATION - Spacing:
    // Change padding to adjust space between items (larger = more space)
    this.padding = 2

    this.width = this.plane.scale.x + this.padding
    this.widthTotal = this.width * this.length

    this.x = this.width * this.index
  }
}
