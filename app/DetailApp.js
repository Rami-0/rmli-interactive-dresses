import { Renderer, Camera, Transform, Plane } from 'ogl'
import NormalizeWheel from 'normalize-wheel'

import debounce from 'lodash/debounce'

import { lerp } from 'utils/math'

import Column from './Column'
import Background from './Background'

export default class DetailApp {
  constructor() {
    document.documentElement.classList.remove('no-js')

    // Get item ID from URL if present
    const urlParams = new URLSearchParams(window.location.search)
    this.itemId = urlParams.get('id') || '0'

    this.scroll = {
      ease: 0.05,
      current: 0,
      target: 0,
      last: 0
    }

    this.onCheckDebounce = debounce(this.onCheck, 200)

    this.createRenderer()
    this.createCamera()
    this.createScene()

    this.onResize()

    this.createGeometry()
    this.createColumns()
    this.createBackground()

    this.createCarousel()

    this.update()

    this.addEventListeners()

    this.createPreloader()
  }

  createPreloader() {
    // Columns are rendered to canvas, so we can mark as loaded immediately
    // or wait for canvas rendering to complete
    setTimeout(() => {
      document.documentElement.classList.remove('loading')
      document.documentElement.classList.add('loaded')
    }, 100)
  }

  createRenderer() {
    this.renderer = new Renderer()

    this.gl = this.renderer.gl
    this.gl.clearColor(0.79607843137, 0.79215686274, 0.74117647058, 1)

    document.body.appendChild(this.gl.canvas)
  }

  createCamera() {
    this.camera = new Camera(this.gl)
    this.camera.fov = 45
    this.camera.position.z = 20
  }

  createScene() {
    this.scene = new Transform()
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    })
  }

  createColumns() {
    // Define three columns with their content
    // Order: Column 1 (dress, left) -> Column 2 (info, middle) -> Column 3 (text, right)
    // Start at Column 3 (text, right) and end at Column 1 (dress, left)
    this.columnsData = [
      {
        type: 'left',
        content: {
          text: 'Left column - Dress illustration'
        }
      },
      {
        type: 'middle',
        content: {
          text: 'Middle column - Metadata (map, colors, fabric types, dress name)'
        }
      },
      {
        type: 'right',
        content: {
          text: 'Right column - Descriptive text about the traditional dress. This section contains detailed information about the cultural significance, design elements, and historical context of the dress.'
        }
      }
    ]

    this.columns = this.columnsData.map(({ type, content }, index) => {
      const column = new Column({
        geometry: this.planeGeometry,
        gl: this.gl,
        index,
        length: this.columnsData.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        viewport: this.viewport,
        content,
        type
      })

      return column
    })

    // Bounds will be calculated after resize
    // Initialize to undefined so we know when they're not set yet
    this.maxScroll = undefined
    this.minScroll = undefined

    // Initial scroll will be set after bounds are calculated (to start at Column 3, text)
  }

  createBackground() {
    this.background = new Background({
      gl: this.gl,
      scene: this.scene,
      viewport: this.viewport
    })
  }

  createCarousel() {
    // Create carousel navigation UI
    const carousel = document.createElement('div')
    carousel.className = 'carousel'

    // Left arrow - moves from text → info → dress (decreasing index)
    const leftArrow = document.createElement('button')
    leftArrow.className = 'carousel__arrow carousel__arrow--left'
    leftArrow.innerHTML = '←'
    leftArrow.addEventListener('click', () => {
      const currentIndex = this.getCurrentColumnIndex()
      this.navigateToColumn(currentIndex - 1)
    })

    // Dots container
    const dotsContainer = document.createElement('div')
    dotsContainer.className = 'carousel__dots'

    this.dots = []
    for (let i = 0; i < this.columnsData.length; i++) {
      const dot = document.createElement('button')
      dot.className = 'carousel__dot'
      // Start at Column 3 (text, which is the last dot)
      if (i === this.columnsData.length - 1) dot.classList.add('carousel__dot--active')
      dot.setAttribute('data-index', i)
      dot.addEventListener('click', () => this.navigateToColumn(i))
      dotsContainer.appendChild(dot)
      this.dots.push(dot)
    }

    // Right arrow - moves from dress → info → text (increasing index)
    const rightArrow = document.createElement('button')
    rightArrow.className = 'carousel__arrow carousel__arrow--right'
    rightArrow.innerHTML = '→'
    rightArrow.addEventListener('click', () => {
      const currentIndex = this.getCurrentColumnIndex()
      this.navigateToColumn(currentIndex + 1)
    })

    carousel.appendChild(leftArrow)
    carousel.appendChild(dotsContainer)
    carousel.appendChild(rightArrow)

    document.body.appendChild(carousel)
    this.carousel = carousel
  }

  getCurrentColumnIndex() {
    if (!this.columns || this.columns.length === 0) return 2

    const { width } = this.columns[0]
    if (!width || width === 0) return 2

    // scroll = 2*width → Column 2 (index 2)
    // scroll = width → Column 1 (index 1)
    // scroll = 0 → Column 0 (index 0)
    const index = Math.round(this.scroll.current / width)

    return Math.max(0, Math.min(index, this.columns.length - 1))
  }

  navigateToColumn(index) {
    if (index < 0 || index >= this.columns.length) return

    const { width } = this.columns[0]
    // Column index directly maps to scroll position
    this.scroll.target = width * index
    this.onCheck()
  }

  updateCarousel() {
    if (!this.carousel || !this.dots || !this.columns) return

    const currentIndex = this.getCurrentColumnIndex()

    // Update dots
    this.dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.classList.add('carousel__dot--active')
      } else {
        dot.classList.remove('carousel__dot--active')
      }
    })

    // Update arrow states
    // Left arrow goes from text → info → dress (decreasing index)
    // Right arrow goes from dress → info → text (increasing index)
    const leftArrow = this.carousel.querySelector('.carousel__arrow--left')
    const rightArrow = this.carousel.querySelector('.carousel__arrow--right')

    // Left arrow disabled at Column 1 (dress, index 0), right arrow disabled at Column 3 (text, index 2)
    if (leftArrow) leftArrow.disabled = currentIndex === 0
    if (rightArrow) rightArrow.disabled = currentIndex === this.columns.length - 1
  }

  /**
   * Events.
   */
  onTouchDown(event) {
    this.isDown = true

    this.scroll.position = this.scroll.current
    this.start = event.touches ? event.touches[0].clientX : event.clientX
  }

  onTouchMove(event) {
    if (!this.isDown) return

    const x = event.touches ? event.touches[0].clientX : event.clientX
    const distance = (this.start - x) * 0.01

    // Drag left (negative distance) moves left (negative scroll) from text → info → dress
    // Drag right (positive distance) moves right (positive scroll) from dress → info → text
    this.scroll.target = this.scroll.position - distance

    // Clamp immediately to prevent scrolling into void
    this.clampScroll()
  }

  onTouchUp(event) {
    this.isDown = false
    this.onCheck()
  }

  onWheel(event) {
    const normalized = NormalizeWheel(event)
    const speed = normalized.pixelY

    // Scroll down (positive) should move from right to left (decrease scroll)
    // Scroll up (negative) should move from left to right (increase scroll)
    this.scroll.target -= speed * 0.005

    this.clampScroll()
    this.onCheckDebounce()
  }

  clampScroll() {
    // Only clamp if bounds are properly initialized
    if (this.maxScroll === undefined || this.minScroll === undefined) return

    // Clamp scroll target to bounds
    if (this.scroll.target > this.maxScroll) {
      this.scroll.target = this.maxScroll
    } else if (this.scroll.target < this.minScroll) {
      this.scroll.target = this.minScroll
    }
  }

  onCheck() {
    this.clampScroll()

    if (!this.columns || this.columns.length === 0) {
      this.updateCarousel()
      return
    }

    const { width } = this.columns[0]
    if (!width || width === 0) {
      this.updateCarousel()
      return
    }

    // Snap to nearest column
    const itemIndex = Math.round(this.scroll.target / width)
    const clampedIndex = Math.max(0, Math.min(itemIndex, this.columns.length - 1))
    this.scroll.target = width * clampedIndex

    this.clampScroll()
    this.updateCarousel()
  }

  /**
   * Resize.
   */
  onResize() {
    this.screen = {
      height: window.innerHeight,
      width: window.innerWidth
    }

    this.renderer.setSize(this.screen.width, this.screen.height)

    this.camera.perspective({
      aspect: this.gl.canvas.width / this.gl.canvas.height
    })

    const fov = this.camera.fov * (Math.PI / 180)
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z
    const width = height * this.camera.aspect

    this.viewport = {
      height,
      width
    }

    if (this.columns && this.columns.length > 0) {
      this.columns.forEach(column => column.onResize({
        screen: this.screen,
        viewport: this.viewport
      }))

      // Recalculate scroll bounds after resize
      const { width } = this.columns[0]
      if (width && width > 0) {
        // To center Column 2: scroll = 2*width
        // To center Column 1: scroll = width
        // To center Column 0: scroll = 0
        this.maxScroll = width * (this.columns.length - 1) // Start at Column 2
        this.minScroll = 0 // End at Column 0

        // Set initial scroll to start at Column 2 (right/text)
        if (this.scroll.target === 0 && this.scroll.current === 0) {
          this.scroll.target = this.maxScroll
          this.scroll.current = this.maxScroll
        }

        // Ensure current scroll is within bounds
        this.clampScroll()
      }

    }
  }

  /**
   * Update.
   */
  update() {
    // Ensure target is clamped before lerping (only if bounds are set)
    if (this.maxScroll !== undefined && this.minScroll !== undefined) {
      this.clampScroll()
    }

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease)

    // Also clamp current to prevent any drift (only if bounds are set)
    if (this.maxScroll !== undefined && this.minScroll !== undefined) {
      if (this.scroll.current > this.maxScroll) {
        this.scroll.current = this.maxScroll
      } else if (this.scroll.current < this.minScroll) {
        this.scroll.current = this.minScroll
      }
    }

    if (this.scroll.current > this.scroll.last) {
      this.direction = 'right'
    } else {
      this.direction = 'left'
    }

    if (this.columns) {
      this.columns.forEach(column => column.update(this.scroll, this.direction))
    }

    if (this.background) {
      this.background.update(this.scroll, this.direction)
    }

    // Update carousel to reflect current position
    this.updateCarousel()

    this.renderer.render({
      scene: this.scene,
      camera: this.camera
    })

    this.scroll.last = this.scroll.current

    window.requestAnimationFrame(this.update.bind(this))
  }

  /**
   * Listeners.
   */
  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this))

    window.addEventListener('mousewheel', this.onWheel.bind(this))
    window.addEventListener('wheel', this.onWheel.bind(this))

    window.addEventListener('mousedown', this.onTouchDown.bind(this))
    window.addEventListener('mousemove', this.onTouchMove.bind(this))
    window.addEventListener('mouseup', this.onTouchUp.bind(this))

    window.addEventListener('touchstart', this.onTouchDown.bind(this))
    window.addEventListener('touchmove', this.onTouchMove.bind(this))
    window.addEventListener('touchend', this.onTouchUp.bind(this))
  }
}

new DetailApp()

