# Rmli Interactive Dresses - Next.js 15 TypeScript

A Next.js 15+ application featuring an infinite circular WebGL gallery built with TypeScript, OGL, and GLSL shaders.

## Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **WebGL** rendering using OGL library
- **GLSL Shaders** for advanced graphics effects
- **Responsive Design** with SCSS styling
- **Infinite Circular Gallery** with smooth scrolling
- **Detail Pages** with carousel navigation

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
/app
  /components
    /webgl          # WebGL components (App, DetailApp, Media, etc.)
  /detail
    /[id]           # Dynamic detail page route
  /lib
    /utils           # Utility functions
  /shaders           # GLSL shader files
  /styles            # SCSS stylesheets
/public
  /images            # Gallery images
  /fonts             # Font files (JSON + PNG)
```

## Key Components

- **App.tsx**: Main gallery component with infinite circular scrolling
- **DetailApp.tsx**: Detail page with column-based carousel
- **Media.ts**: Individual gallery item with WebGL rendering
- **Column.ts**: Detail page column component
- **Background.ts**: Animated background particles

## Technologies

- Next.js 15
- React 19
- TypeScript
- OGL (WebGL library)
- GSAP (Animation)
- SCSS
- GLSL Shaders

## Migration Notes

This project was migrated from a Webpack-based vanilla JavaScript application to Next.js 15 with TypeScript. Key changes:

- Converted all JavaScript classes to TypeScript
- Wrapped WebGL classes in React components for lifecycle management
- Migrated from HTML entry points to Next.js App Router pages
- Converted SCSS to work with Next.js CSS modules
- Set up GLSL shader loading via Next.js webpack configuration
- Moved static assets to public directory

## License

MIT

