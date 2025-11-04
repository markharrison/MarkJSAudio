# MarkJSAudio

🎵 **MarkJSAudio** - A comprehensive JavaScript audio library for web games and interactive applications

[![npm version](https://img.shields.io/npm/v/%40markharrison%2Fmarkjsaudio)](https://www.npmjs.com/package/@markharrison/markjsaudio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

MarkJSAudio is a modern JavaScript audio library built on the Web Audio API, designed specifically for web games. It provides high-level functionality for managing sound effects (SFX) and background music with advanced features like volume control, smooth transitions, and seamless audio management.

## Key Features

- 🚀 **Modern Web Audio API** - Low-latency, high-performance audio processing
- 🎼 **Dual Audio Types** - Optimized handling for SFX (short, frequent) and Music (long, streaming)
- 🔊 **Simultaneous Playback** - Play multiple audio sources at the same time
- 🎛️ **Advanced Volume Control** - Separate controls for master, music, and SFX volumes
- 🌊 **Smooth Transitions** - Crossfade between music tracks with customizable timing
- 📦 **ArrayBuffer Support** - Load audio directly from raw ArrayBuffer data
- ⏳ **Preloading Workflow** - Fetch audio before user interaction, decode after AudioContext is available
- 📱 **Browser Compatibility** - Works with modern browsers (Chrome, Firefox, Safari, Edge)
- 🎯 **Format Support** - MP3 and WAV audio formats
- ⚡ **Easy Integration** - Simple API with comprehensive error handling

## Installation

```bash
npm install @markharrison/markjsaudio --save
```

## Quick Start

```javascript
import { MarkJSAudio } from "@markharrison/markjsaudio";

// Create and initialize
const audioMark = new MarkJSAudio();
await audioMark.initialize(); // Call after user interaction

// Load audio files
await audioMark.loadAudio("bgmusic", "path/to/music.mp3");
await audioMark.loadAudio("jump", "path/to/jump.wav");

// Alternative: Load from ArrayBuffer
const response = await fetch("path/to/sound.wav");
const arrayBuffer = await response.arrayBuffer();
await audioMark.loadFromArrayBuffer("sound", arrayBuffer);

// Preload audio before user interaction (optimized workflow)
await audioMark.preloadAudio("gamemusic", "path/to/game.mp3");
// ... after user interaction and initialize() ...
await audioMark.processAllPreloadedAudio();

// Play background music
audioMark.playMusic("bgmusic", { loop: true });

// Play sound effects
audioMark.playSFX("jump");

// Control volumes (0-100)
audioMark.setVolume("master", 80);
audioMark.setVolume("music", 60);
audioMark.setVolume("sfx", 90);
```

## Documentation

See the [complete documentation](markjsaudio.md) for detailed usage instructions and examples.

## Test Application

<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/88ef33bb-ebb4-4ef0-8cb6-cda86c792b54" />

Open `index.html` in your browser to see the comprehensive test interface with:

- File loading and unloading
- ArrayBuffer & Preloading functionality - Test the new preload/process workflow
- Music and SFX playback controls
- Volume controls
- Smooth music transitions
- Real-time logging

## Browser Requirements

MarkJSAudio requires modern browsers with Web Audio API support:

- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

## License

MIT License - see [LICENSE](LICENSE) file for details.
