# MarkJSAudio Library Documentation

## Overview

MarkJSAudio is a comprehensive JavaScript audio library built on the Web Audio API, designed specifically for web games and interactive applications. It provides high-level functionality for managing both sound effects (SFX) and background music with advanced features like volume control, crossfading, and seamless audio transitions.

## Features

- **Web Audio API Based**: Modern, low-latency audio processing
- **Dual Audio Types**: Optimized handling for SFX (short, frequent) and Music (long, streaming)
- **Simultaneous Playback**: Play multiple audio sources at the same time
- **Advanced Volume Control**: Hierarchical volume controls where music and SFX volumes are multiplied by master volume
- **Smooth Transitions**: Crossfade between music tracks with customizable timing
- **Audio Context Management**: Automatic handling of suspended audio context (user interaction requirement)
- **ArrayBuffer Support**: Direct loading from raw audio data
- **Preloading Workflow**: Fetch audio before user interaction, decode after AudioContext is available
- **Format Support**: MP3 and WAV audio formats
- **Comprehensive Controls**: Play, pause, resume, stop, and loop functionality
- **Fade Effects**: Fade-in and fade-out capabilities
- **Resource Management**: Load, unload, and cleanup audio resources

## ArrayBuffer & Preloading Overview

One of MarkJSAudio's most powerful features is its support for ArrayBuffer loading and preloading workflows. This addresses a common challenge in web audio: browsers require user interaction before creating an AudioContext (and thus decoding audio), but applications often want to fetch audio assets during initial loading.

### The Browser Challenge

Modern browsers implement security policies that prevent audio from playing without user interaction. This means:

1. **AudioContext creation requires user gesture** - You can't decode audio until the user clicks/taps
2. **Audio files are often large** - Fetching them after user interaction creates noticeable delays
3. **Users expect immediate audio** - Any delay after clicking "Start" feels sluggish

### MarkJSAudio's Solution

MarkJSAudio provides a preloading workflow that elegantly solves this problem:

```javascript
// Phase 1: During app initialization (before any user interaction)
const audioMark = new MarkJSAudio();
await audioMark.preloadAudio('theme', 'assets/theme.mp3');
await audioMark.preloadAudio('click', 'assets/click.wav');
// Raw bytes are fetched and stored, but not decoded yet

// Phase 2: After user clicks "Start Game"
await audioMark.initialize(); // Creates AudioContext
await audioMark.processAllPreloadedAudio(); // Decodes all preloaded audio

// Phase 3: Audio is immediately available
audioMark.playMusic('theme'); // Plays instantly, no loading delay
```

### Key Benefits

- **Eliminates double network requests** - Fetch once during loading, use after interaction
- **Reduces perceived latency** - Audio plays immediately after user interaction
- **Optimizes user experience** - No waiting for downloads after clicking "Start"
- **Maintains browser compliance** - Respects security requirements while optimizing performance

### When to Use Each Method

- **`preloadAudio()`** - Best for game loading screens, app initialization
- **`loadFromArrayBuffer()`** - Best when you already have raw audio data (custom sources, APIs)
- **`loadAudio()` with ArrayBuffer** - Convenient wrapper combining both approaches

## Installation

Simply include the MarkJSAudio library in your project:

```html
<script type="module">
  import { MarkJSAudio } from '@markharrison/markjsaudio';
</script>
```

## Quick Start

```javascript
import { MarkJSAudio } from '@markharrison/markjsaudio';

// Create MarkJSAudio instance
const audioMark = new MarkJSAudio();

// Initialize (must be called after user interaction)
await audioMark.initialize();

// Load audio files
await audioMark.loadAudio('bgmusic', 'path/to/music.mp3');
await audioMark.loadAudio('jump', 'path/to/jump.wav');

// Play background music with loop
audioMark.playMusic('bgmusic', { loop: true });

// Play sound effect
audioMark.playSFX('jump');

// Control volumes (0-100) - music and SFX are multiplied by master
audioMark.setVolume('master', 80); // 80% master volume
audioMark.setVolume('music', 60); // Effective: 60% × 80% = 48%
audioMark.setVolume('sfx', 90); // Effective: 90% × 80% = 72%
```

## API Reference

### Constructor

#### `new MarkJSAudio()`

Creates a new MarkJSAudio instance. The instance must be initialized before use.

```javascript
const audioMark = new MarkJSAudio();
```

### Initialization

#### `initialize(): Promise<boolean>`

Initializes the audio context and sets up gain nodes. Must be called after user interaction due to browser security requirements.

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

```javascript
// Call after user interaction (click, keypress, etc.)
const success = await audioMark.initialize();
if (success) {
  console.log('MarkJSAudio ready!');
}
```

### Audio Loading

#### `loadAudio(name, source): Promise<boolean>`

**Loads an audio file into memory for later playback.** This is the most versatile loading method, supporting URLs, File objects, and ArrayBuffers.

**Parameters**:

- `name` (string): Unique identifier for the audio
- `source` (string|File|ArrayBuffer): URL string, File object, or ArrayBuffer

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

**When to use**: General-purpose loading when AudioContext is already available, or when you want a single method that handles all source types.

```javascript
// Traditional URL loading
await audioMark.loadAudio('bgmusic', 'assets/background.mp3');

// File input handling
const fileInput = document.getElementById('audio-upload');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    await audioMark.loadAudio('user-audio', file);
    console.log('User audio loaded and ready to play');
  }
});

// ArrayBuffer loading (convenience wrapper)
const response = await fetch('assets/sound.wav');
const arrayBuffer = await response.arrayBuffer();
await audioMark.loadAudio('sound', arrayBuffer);

// Mixed loading types in sequence
const audioSources = [
  { name: 'theme', source: 'assets/theme.mp3' },
  { name: 'user-upload', source: userFile },
  { name: 'generated', source: generatedAudioBuffer },
];

for (const { name, source } of audioSources) {
  await audioMark.loadAudio(name, source);
}
```

#### `loadFromArrayBuffer(name, arrayBuffer): Promise<boolean>`

Loads audio directly from an ArrayBuffer. Useful when you already have raw audio data.

**Parameters**:

- `name` (string): Unique identifier for the audio
- `arrayBuffer` (ArrayBuffer): Raw audio data

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

```javascript
// Fetch and load in one step
const response = await fetch('assets/music.mp3');
const arrayBuffer = await response.arrayBuffer();
await audioMark.loadFromArrayBuffer('music', arrayBuffer);
```

#### `preloadAudio(name, source): Promise<boolean>`

**Preloads raw audio data without decoding.** This is the cornerstone of MarkJSAudio's optimization strategy - it allows fetching audio files during app initialization, before any user interaction is required.

**Parameters**:

- `name` (string): Unique identifier for the audio
- `source` (string|File): URL string or File object

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

**When to use**: During app loading, splash screens, or any time before user interaction when you want to prepare audio for later use.

```javascript
// Game loading screen example
class GameLoader {
  async loadAssets() {
    const audioMark = new MarkJSAudio();

    // Fetch audio files during loading (no AudioContext needed)
    console.log('Fetching audio assets...');
    await audioMark.preloadAudio('bgmusic', 'assets/battle-theme.mp3');
    await audioMark.preloadAudio('victory', 'assets/victory-fanfare.mp3');
    await audioMark.preloadAudio('jump', 'assets/sfx/jump.wav');
    await audioMark.preloadAudio('coin', 'assets/sfx/coin-collect.wav');

    console.log('Audio assets fetched (ready for processing)');
    return audioMark;
  }
}

// Progressive Web App example
if ('serviceWorker' in navigator) {
  // Preload audio even before service worker is ready
  await audioMark.preloadAudio('startup', 'assets/app-sounds/startup.mp3');
}
```

#### `processPreloadedAudio(name): Promise<boolean>`

**Processes (decodes) a single preloaded audio file.** Converts raw audio data into an AudioBuffer that can be played. The raw data is automatically cleaned up after successful processing.

**Parameters**:

- `name` (string): Identifier of the preloaded audio

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

**When to use**: When you want to decode specific audio files individually, perhaps based on user choices or game state.

```javascript
// Selective processing based on game mode
async function initializeGameAudio(gameMode, audioMark) {
  await audioMark.initialize(); // AudioContext now available

  // Always process essential audio
  await audioMark.processPreloadedAudio('bgmusic');
  await audioMark.processPreloadedAudio('jump');

  // Process mode-specific audio
  if (gameMode === 'adventure') {
    await audioMark.processPreloadedAudio('forest-ambient');
    await audioMark.processPreloadedAudio('sword-clang');
  } else if (gameMode === 'puzzle') {
    await audioMark.processPreloadedAudio('puzzle-complete');
    await audioMark.processPreloadedAudio('piece-place');
  }
}

// Error handling example
async function safeProcessAudio(audioMark, audioName) {
  const success = await audioMark.processPreloadedAudio(audioName);
  if (!success) {
    console.warn(`Failed to process ${audioName}, using fallback`);
    // Load fallback audio or use default sounds
    await audioMark.loadAudio(audioName, 'assets/fallback/default.wav');
  }
}
```

#### `processAllPreloadedAudio(): Promise<Array>`

#### `processAllPreloadedAudio(): Promise<{ preloadsOk: boolean, results: Array<{name, success}> }>`

**Processes all preloaded audio files at once.** This is the most common pattern—fetch everything during loading, then decode everything after user interaction.

**Returns**: Promise that resolves to an object:

- `preloadsOk` (boolean): Indicates if all preloads completed successfully
- `results` (Array): Each result object contains `{name, success}` where `name` is the audio identifier and `success` is a boolean indicating if processing was successful

**When to use**: Most common use case—process all preloaded audio after AudioContext initialization.

```javascript
// Complete game initialization example
class Game {
  constructor() {
    this.audioMark = new MarkJSAudio();
    this.audioReady = false;
  }

  async preloadAssets() {
    // Phase 1: Preload during splash screen
    const audioFiles = [
      { name: 'theme', url: 'assets/music/main-theme.mp3' },
      { name: 'level1', url: 'assets/music/level1-bg.mp3' },
      { name: 'victory', url: 'assets/music/victory.mp3' },
      { name: 'jump', url: 'assets/sfx/jump.wav' },
      { name: 'coin', url: 'assets/sfx/coin.wav' },
      { name: 'powerup', url: 'assets/sfx/powerup.wav' },
    ];

    for (const { name, url } of audioFiles) {
      await this.audioMark.preloadAudio(name, url);
    }
  }

  async startGame() {
    // Phase 2: User clicked "Start" - now we can use AudioContext
    await this.audioMark.initialize();

    // Process all preloaded audio
    const { preloadsOk, results } = await this.audioMark.processAllPreloadedAudio();

    // Log results and handle any failures
    let successCount = 0;
    results.forEach((result) => {
      if (result.success) {
        successCount++;
        console.log(`✓ ${result.name} ready`);
      } else {
        console.error(`✗ ${result.name} failed to process`);
      }
    });

    if (!preloadsOk) {
      console.error('Some audio preloads failed.');
    }

    console.log(`Audio initialization: ${successCount}/${results.length} files ready`);
    this.audioReady = successCount > 0 && preloadsOk;

    // Start background music immediately (no loading delay!)
    if (this.audioReady) {
      this.audioMark.playMusic('theme', { loop: true, fadeIn: 1.0 });
    }
  }
}

// Usage
const game = new Game();
await game.preloadAssets(); // During loading screen
// ... show "Click to Start" button ...
// User clicks button
await game.startGame(); // Audio ready instantly
```

#### `loadFromArrayBuffer(name, arrayBuffer): Promise<boolean>`

**Loads audio directly from an ArrayBuffer.** This method is perfect when you already have raw audio data from custom sources, APIs, or when implementing your own caching mechanisms.

**Parameters**:

- `name` (string): Unique identifier for the audio
- `arrayBuffer` (ArrayBuffer): Raw audio data

**Returns**: Promise that resolves to `true` if successful, `false` if failed.

**When to use**: Custom audio sources, encrypted audio, generated audio, or when implementing advanced caching strategies.

```javascript
// Custom API source example
async function loadAudioFromAPI(audioMark, userId, audioType) {
  const response = await fetch(`/api/user/${userId}/audio/${audioType}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch custom audio: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await audioMark.loadFromArrayBuffer(`custom-${audioType}`, arrayBuffer);
}

// Encrypted audio example
async function loadEncryptedAudio(audioMark, encryptedFile, decryptionKey) {
  // Decrypt the audio data (pseudo-code)
  const decryptedBuffer = await decrypt(encryptedFile, decryptionKey);
  await audioMark.loadFromArrayBuffer('secret-audio', decryptedBuffer);
}

// Generated audio example
function generateTone(frequency, duration, sampleRate = 44100) {
  const samples = sampleRate * duration;
  const arrayBuffer = new ArrayBuffer(samples * 2);
  const view = new Int16Array(arrayBuffer);

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    view[i] = sample * 32767;
  }

  return arrayBuffer;
}

// Use generated audio
const toneBuffer = generateTone(440, 0.5); // A4 for 0.5 seconds
await audioMark.loadFromArrayBuffer('notification-tone', toneBuffer);

// IndexedDB caching example
class AudioCache {
  static async get(audioMark, name, url) {
    // Try to load from IndexedDB cache first
    const cached = await this.getFromCache(name);
    if (cached) {
      console.log(`Loading ${name} from cache`);
      await audioMark.loadFromArrayBuffer(name, cached);
      return;
    }

    // Not cached, fetch and store
    console.log(`Fetching ${name} from network`);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Store in cache for next time
    await this.storeInCache(name, arrayBuffer);

    // Load into MarkJSAudio
    await audioMark.loadFromArrayBuffer(name, arrayBuffer);
  }

  static async getFromCache(name) {
    // IndexedDB implementation
    // Return ArrayBuffer if found, null if not
  }

  static async storeInCache(name, arrayBuffer) {
    // IndexedDB implementation
    // Store ArrayBuffer for future use
  }
}
```

#### `unloadAudio(name): boolean`

Removes audio from memory.

**Parameters**:

- `name` (string): Identifier of the audio to unload

**Returns**: `true` if successfully unloaded, `false` if audio was not found.

```javascript
audioMark.unloadAudio('bgmusic');
```

### Sound Effects (SFX)

#### `playSFX(name, options): AudioBufferSourceNode|null`

Plays a sound effect. SFX are optimized for short, frequent playback with low latency.

**Parameters**:

- `name` (string): Identifier of the loaded audio
- `options` (object, optional):
  - `loop` (boolean): Whether to loop the audio (default: false)
  - `volume` (number): Volume multiplier 0.0-1.0 (default: 1.0)
  - `fadeIn` (number): Fade-in duration in seconds (default: 0)

**Returns**: AudioBufferSourceNode if successful, null if failed.

```javascript
// Simple SFX playback
audioMark.playSFX('jump');

// SFX with options
audioMark.playSFX('engine', {
  loop: true,
  volume: 0.7,
  fadeIn: 0.5,
});
```

### Music

#### `playMusic(name, options): AudioBufferSourceNode|null`

Plays background music with full control options.

**Parameters**:

- `name` (string): Identifier of the loaded audio
- `options` (object, optional):
  - `loop` (boolean): Whether to loop the audio (default: true)
  - `volume` (number): Volume multiplier 0.0-1.0 (default: 1.0)
  - `fadeIn` (number): Fade-in duration in seconds (default: 0)
  - `stopCurrent` (boolean): Whether to stop current music (default: true)

**Returns**: AudioBufferSourceNode if successful, null if failed.

```javascript
// Play looping background music
audioMark.playMusic('level1theme');

// Play with fade-in
audioMark.playMusic('level2theme', {
  fadeIn: 2.0,
  volume: 0.8,
});
```

#### `stopMusic()`

Stops all currently playing music.

```javascript
audioMark.stopMusic();
```

#### `pauseMusic(): boolean`

Pauses the current music track. **Implementation Note**: This stops the current audio source but preserves playback state for resuming.

**Returns**: `true` if music was paused, `false` if no music was playing.

```javascript
const paused = audioMark.pauseMusic();
```

#### `resumeMusic(): boolean`

Resumes paused music from where it was paused. **Implementation Note**: Creates a new audio source and starts playback from the calculated offset position.

**Returns**: `true` if music was resumed, `false` if no music was paused.

```javascript
const resumed = audioMark.resumeMusic();
```

#### `transitionMusic(newTrackName, transitionTime, options): Promise<boolean>`

Smoothly transitions from current music to a new track with crossfading.

**Parameters**:

- `newTrackName` (string): Identifier of the new music track
- `transitionTime` (number): Duration of the transition in seconds (default: 2.0)
- `options` (object, optional): Same options as `playMusic()`

**Returns**: Promise that resolves to `true` if successful.

```javascript
// Smooth 3-second transition to new track
await audioMark.transitionMusic('level2theme', 3.0, {
  loop: true,
  volume: 0.9,
});
```

### Volume Control

#### `setVolume(type, volume)`

Sets volume for master, music, or SFX channels. **Note**: Music and SFX volumes are multiplied by the master volume, creating a hierarchical volume system.

**Parameters**:

- `type` (string): 'master', 'music', or 'sfx'
- `volume` (number): Volume from 0 (silent) to 100 (full volume)

```javascript
audioMark.setVolume('master', 80); // 80% master volume
audioMark.setVolume('music', 60); // Effective music volume: 60% × 80% = 48%
audioMark.setVolume('sfx', 90); // Effective SFX volume: 90% × 80% = 72%
```

#### `getVolume(type): number`

Gets current volume setting.

**Parameters**:

- `type` (string): 'master', 'music', or 'sfx'

**Returns**: Current volume (0-100).

```javascript
const musicVolume = audioMark.getVolume('music');
```

### Advanced Features

#### `fadeOut(source, duration)`

Fades out a specific audio source.

**Parameters**:

- `source` (AudioBufferSourceNode): The audio source to fade out
- `duration` (number): Fade duration in seconds (default: 1.0)

**Note**: This method reconnects the audio source through a new gain node for fading. The source will be routed through the music gain channel during fade-out.

```javascript
const sfxSource = audioMark.playSFX('explosion');
// Fade out after 2 seconds
setTimeout(() => {
  audioMark.fadeOut(sfxSource, 1.5);
}, 2000);
```

#### `stopAll()`

Stops all currently playing audio (music and SFX).

```javascript
audioMark.stopAll();
```

#### `cleanup()`

Cleans up all resources and closes the audio context. Call this when you're done with MarkJSAudio.

```javascript
audioMark.cleanup();
```

### State Management

#### `getState(): object`

Returns current state information for debugging and monitoring.

**Returns**: Object containing current state information.

```javascript
const state = audioMark.getState();
console.log('Loaded audio:', state.loadedAudio);
console.log('Active sources:', state.activeSources);
console.log('Current music:', state.currentMusic);
```

## Usage Patterns

### Game Scene Management

```javascript
class GameScene {
  async init() {
    this.audioMark = new MarkJSAudio();
    await this.audioMark.initialize();

    // Load scene-specific audio
    await this.audioMark.loadAudio('bgmusic', 'assets/level1.mp3');
    await this.audioMark.loadAudio('jump', 'assets/jump.wav');
    await this.audioMark.loadAudio('coin', 'assets/coin.wav');

    // Start background music
    this.audioMark.playMusic('bgmusic');
  }

  onPlayerJump() {
    this.audioMark.playSFX('jump');
  }

  onCoinCollect() {
    this.audioMark.playSFX('coin', { volume: 0.7 });
  }

  async switchToLevel2() {
    await this.audioMark.loadAudio('level2music', 'assets/level2.mp3');
    await this.audioMark.transitionMusic('level2music', 2.0);
  }

  cleanup() {
    this.audioMark.cleanup();
  }
}
```

### ArrayBuffer & Preloading Workflow

This pattern allows you to fetch audio during app initialization (before user interaction) and decode it after AudioContext is available:

```javascript
class GameApp {
  constructor() {
    this.audioMark = new MarkJSAudio();
    this.assetsLoaded = false;
  }

  // Called during app initialization (before user interaction)
  async preloadAssets() {
    console.log('Preloading audio assets...');

    // Fetch raw audio data before user interaction
    await this.audioMark.preloadAudio('theme', 'assets/theme.mp3');
    await this.audioMark.preloadAudio('click', 'assets/click.wav');
    await this.audioMark.preloadAudio('success', 'assets/success.wav');

    this.assetsLoaded = true;
    console.log('Assets preloaded (raw data ready)');
  }

  // Called after user interaction (when AudioContext can be created)
  async initializeAudio() {
    if (!this.assetsLoaded) {
      throw new Error('Call preloadAssets() first');
    }

    // Initialize AudioContext (requires user interaction)
    await this.audioMark.initialize();

    // Process all preloaded audio (decode raw data)
    const results = await this.audioMark.processAllPreloadedAudio();

    console.log('Audio processing complete:');
    results.forEach((result) => {
      console.log(`${result.name}: ${result.success ? 'OK' : 'FAILED'}`);
    });

    // Start background music immediately (no loading delay)
    this.audioMark.playMusic('theme', { loop: true });
  }

  // Alternative: Direct ArrayBuffer usage
  async loadFromCustomSource() {
    // Fetch audio from custom endpoint
    const response = await fetch('/api/user-audio/123');
    const audioData = await response.arrayBuffer();

    // Load directly from ArrayBuffer
    await this.audioMark.loadFromArrayBuffer('custom', audioData);

    // Play immediately
    this.audioMark.playSFX('custom');
  }
}

// Usage:
const app = new GameApp();

// During page load (before any user interaction)
await app.preloadAssets();

// After user clicks "Start Game" button
document.getElementById('startBtn').onclick = async () => {
  await app.initializeAudio();
  // Game can start immediately with no audio loading delays
};
```

### Progressive Audio Loading Strategy

This pattern shows how to implement a sophisticated loading strategy that balances performance with user experience:

```javascript
class ProgressiveAudioLoader {
  constructor() {
    this.audioMark = new MarkJSAudio();
    this.criticalAudio = new Set(['ui-click', 'error', 'success']);
    this.backgroundAudio = new Set(['ambient', 'music-layers']);
    this.gameplayAudio = new Set(['player-actions', 'environment']);
  }

  // Phase 1: Load critical UI audio immediately
  async loadCriticalAudio() {
    console.log('Loading critical audio...');
    await this.audioMark.preloadAudio('ui-click', 'assets/ui/click.wav');
    await this.audioMark.preloadAudio('error', 'assets/ui/error.wav');
    await this.audioMark.preloadAudio('success', 'assets/ui/success.wav');
  }

  // Phase 2: Load background audio while user reads instructions
  async loadBackgroundAudio() {
    console.log('Loading background audio...');
    const promises = [
      this.audioMark.preloadAudio('ambient', 'assets/ambient/forest.mp3'),
      this.audioMark.preloadAudio('music-menu', 'assets/music/menu-theme.mp3'),
      this.audioMark.preloadAudio('music-game', 'assets/music/game-theme.mp3'),
    ];
    await Promise.all(promises);
  }

  // Phase 3: Load gameplay audio just before game starts
  async loadGameplayAudio() {
    console.log('Loading gameplay audio...');
    const promises = [
      this.audioMark.preloadAudio('jump', 'assets/sfx/jump.wav'),
      this.audioMark.preloadAudio('collect', 'assets/sfx/collect.wav'),
      this.audioMark.preloadAudio('damage', 'assets/sfx/damage.wav'),
    ];
    await Promise.all(promises);
  }

  // Initialize after user interaction
  async initialize() {
    await this.audioMark.initialize();

    // Process critical audio first
    await this.audioMark.processPreloadedAudio('ui-click');
    await this.audioMark.processPreloadedAudio('error');
    await this.audioMark.processPreloadedAudio('success');

    // Process remaining audio in background
    this.processRemainingAudio();
  }

  async processRemainingAudio() {
    const remaining = await this.audioMark.processAllPreloadedAudio();
    console.log(`Processed ${remaining.length} additional audio files`);
  }
}

// Usage
const loader = new ProgressiveAudioLoader();

// During page load
await loader.loadCriticalAudio();

// While showing instructions/menu
await loader.loadBackgroundAudio();

// User clicks "Start Game"
document.getElementById('startBtn').onclick = async () => {
  await loader.loadGameplayAudio();
  await loader.initialize();
  // All audio ready, start game
};
```

### Custom Audio Source Integration

This pattern demonstrates how to integrate MarkJSAudio with custom audio sources and APIs:

```javascript
class CustomAudioIntegration {
  constructor(apiToken) {
    this.audioMark = new MarkJSAudio();
    this.apiToken = apiToken;
    this.cache = new Map(); // Simple in-memory cache
  }

  // Load audio from different sources
  async loadAudioFromSource(name, source) {
    switch (source.type) {
      case 'api':
        return await this.loadFromAPI(name, source);
      case 'generated':
        return await this.loadGeneratedAudio(name, source);
      case 'encrypted':
        return await this.loadEncryptedAudio(name, source);
      case 'blob':
        return await this.loadFromBlob(name, source);
      default:
        return await this.audioMark.loadAudio(name, source.url);
    }
  }

  // Load from custom API
  async loadFromAPI(name, source) {
    const cacheKey = `api-${source.endpoint}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`Loading ${name} from cache`);
      const arrayBuffer = this.cache.get(cacheKey);
      return await this.audioMark.loadFromArrayBuffer(name, arrayBuffer);
    }

    // Fetch from API
    console.log(`Fetching ${name} from API`);
    const response = await fetch(source.endpoint, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Cache for future use
    this.cache.set(cacheKey, arrayBuffer);

    return await this.audioMark.loadFromArrayBuffer(name, arrayBuffer);
  }

  // Generate procedural audio
  async loadGeneratedAudio(name, source) {
    console.log(`Generating ${name} audio`);
    const arrayBuffer = this.generateAudio(source.config);
    return await this.audioMark.loadFromArrayBuffer(name, arrayBuffer);
  }

  generateAudio(config) {
    const { frequency, duration, type, sampleRate = 44100 } = config;
    const samples = sampleRate * duration;

    // Create WAV header
    const headerSize = 44;
    const dataSize = samples * 2; // 16-bit samples
    const fileSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(fileSize);
    const view = new DataView(arrayBuffer);
    const samples16 = new Int16Array(arrayBuffer, headerSize);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Generate audio samples
    for (let i = 0; i < samples; i++) {
      let sample;
      const t = i / sampleRate;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'noise':
          sample = Math.random() * 2 - 1;
          break;
        default:
          sample = 0;
      }

      samples16[i] = sample * 32767;
    }

    return arrayBuffer;
  }

  // Load from encrypted source
  async loadEncryptedAudio(name, source) {
    console.log(`Loading encrypted ${name}`);
    const encryptedData = await fetch(source.url).then((r) => r.arrayBuffer());
    const decryptedData = await this.decrypt(encryptedData, source.key);
    return await this.audioMark.loadFromArrayBuffer(name, decryptedData);
  }

  async decrypt(encryptedData, key) {
    // Simplified XOR decryption (use proper crypto in production)
    const decrypted = new Uint8Array(encryptedData);
    const keyBytes = new TextEncoder().encode(key);

    for (let i = 0; i < decrypted.length; i++) {
      decrypted[i] ^= keyBytes[i % keyBytes.length];
    }

    return decrypted.buffer;
  }

  // Load from Blob/File
  async loadFromBlob(name, source) {
    console.log(`Loading ${name} from blob`);
    const arrayBuffer = await source.blob.arrayBuffer();
    return await this.audioMark.loadFromArrayBuffer(name, arrayBuffer);
  }
}

// Usage examples
const integration = new CustomAudioIntegration('your-api-token');

await integration.loadAudioFromSource('background', {
  type: 'api',
  endpoint: 'https://api.example.com/audio/background',
});

await integration.loadAudioFromSource('notification', {
  type: 'generated',
  config: { frequency: 800, duration: 0.3, type: 'sine' },
});

await integration.loadAudioFromSource('secret', {
  type: 'encrypted',
  url: 'assets/encrypted/secret.bin',
  key: 'encryption-key',
});
```

### Real-Time Audio Management

This pattern shows how to dynamically manage audio during gameplay:

```javascript
class DynamicAudioManager {
  constructor() {
    this.audioMark = new MarkJSAudio();
    this.activeRegion = null;
    this.preloadedRegions = new Set();
    this.audioQueue = [];
    this.isProcessing = false;
  }

  // Preload audio for different game regions
  async preloadRegion(regionName, audioList) {
    if (this.preloadedRegions.has(regionName)) {
      return; // Already preloaded
    }

    console.log(`Preloading audio for region: ${regionName}`);
    const promises = audioList.map(({ name, url }) => this.audioMark.preloadAudio(`${regionName}-${name}`, url));

    await Promise.all(promises);
    this.preloadedRegions.add(regionName);
  }

  // Switch to a new region with smooth audio transition
  async switchRegion(newRegion, audioList) {
    // Start preloading new region audio if not already done
    if (!this.preloadedRegions.has(newRegion)) {
      this.preloadRegion(newRegion, audioList);
    }

    // Fade out current region music
    if (this.activeRegion) {
      this.audioMark.setVolume('music', 0); // Quick fade for demo
    }

    // Process new region audio
    const regionAudio = audioList.filter((audio) => this.audioMark.getState().preloadedAudio.includes(`${newRegion}-${audio.name}`));

    for (const { name } of regionAudio) {
      await this.audioMark.processPreloadedAudio(`${newRegion}-${name}`);
    }

    // Start new region music
    this.audioMark.playMusic(`${newRegion}-ambient`, {
      loop: true,
      fadeIn: 2.0,
    });

    this.audioMark.setVolume('music', 100);
    this.activeRegion = newRegion;

    console.log(`Switched to region: ${newRegion}`);
  }

  // Queue audio for lazy loading
  queueAudio(name, source, priority = 'normal') {
    this.audioQueue.push({ name, source, priority });
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority: high, normal, low
    this.audioQueue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    while (this.audioQueue.length > 0) {
      const { name, source } = this.audioQueue.shift();

      try {
        if (source instanceof ArrayBuffer) {
          await this.audioMark.loadFromArrayBuffer(name, source);
        } else {
          await this.audioMark.loadAudio(name, source);
        }
        console.log(`Processed queued audio: ${name}`);
      } catch (error) {
        console.error(`Failed to process queued audio ${name}:`, error);
      }

      // Yield control to prevent blocking
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  // Get memory usage information
  getMemoryInfo() {
    const state = this.audioMark.getState();
    return {
      loadedAudio: state.loadedAudio.length,
      preloadedAudio: state.preloadedAudio.length,
      activeRegion: this.activeRegion,
      queueLength: this.audioQueue.length,
      preloadedRegions: Array.from(this.preloadedRegions),
    };
  }
}

// Usage
const manager = new DynamicAudioManager();

// Game regions with their audio
const regions = {
  forest: [
    { name: 'ambient', url: 'assets/forest/ambient.mp3' },
    { name: 'footsteps', url: 'assets/forest/footsteps.wav' },
    { name: 'bird-song', url: 'assets/forest/birds.wav' },
  ],
  dungeon: [
    { name: 'ambient', url: 'assets/dungeon/ambient.mp3' },
    { name: 'footsteps', url: 'assets/dungeon/stone-steps.wav' },
    { name: 'drip', url: 'assets/dungeon/water-drip.wav' },
  ],
};

// Preload initial region
await manager.preloadRegion('forest', regions.forest);

// Switch regions during gameplay
await manager.switchRegion('dungeon', regions.dungeon);

// Queue additional audio for later loading
manager.queueAudio('boss-music', 'assets/music/boss.mp3', 'high');
manager.queueAudio('victory', 'assets/music/victory.mp3', 'low');
```

### Dynamic Volume Control

```javascript
// Implement dynamic volume based on game state
// Remember: music and SFX volumes are multiplied by master volume
function updateAudioVolume(gameState) {
  if (gameState.isPaused) {
    audioMark.setVolume('master', 50); // Reduce overall volume
    audioMark.setVolume('music', 60); // Effective: 60% × 50% = 30%
    audioMark.setVolume('sfx', 100); // Effective: 100% × 50% = 50%
  } else if (gameState.inCombat) {
    audioMark.setVolume('master', 100); // Full master volume
    audioMark.setVolume('music', 70); // Effective: 70% × 100% = 70%
    audioMark.setVolume('sfx', 100); // Effective: 100% × 100% = 100%
  } else {
    audioMark.setVolume('master', 100); // Full master volume
    audioMark.setVolume('music', 80); // Effective: 80% × 100% = 80%
    audioMark.setVolume('sfx', 90); // Effective: 90% × 100% = 90%
  }
}
```

### User Settings Integration

```javascript
// Save/load user audio preferences
function saveAudioSettings() {
  const settings = {
    master: audioMark.getVolume('master'),
    music: audioMark.getVolume('music'),
    sfx: audioMark.getVolume('sfx'),
  };
  localStorage.setItem('audioSettings', JSON.stringify(settings));
}

function loadAudioSettings() {
  const settings = JSON.parse(localStorage.getItem('audioSettings'));
  if (settings) {
    audioMark.setVolume('master', settings.master);
    audioMark.setVolume('music', settings.music);
    audioMark.setVolume('sfx', settings.sfx);
  }
}
```

## Error Handling

MarkJSAudio uses `alert()` for error reporting and returns boolean values to indicate success/failure. **All methods that can fail will display an alert dialog with error details and return `false` on failure.**

Common errors include:

- **Initialization before user interaction**: Browser security requires user interaction before audio
- **Loading non-existent files**: Check file paths and CORS settings
- **Playing unloaded audio**: Ensure audio is loaded before playback
- **Audio context issues**: Usually resolved by user interaction

```javascript
// Proper error handling pattern
const initialized = await audioMark.initialize();
if (initialized) {
  const loaded = await audioMark.loadAudio('music', 'path/to/music.mp3');
  if (loaded) {
    const source = audioMark.playMusic('music');
    if (source) {
      console.log('Music started successfully');
    }
    // Note: Errors are shown via alert() automatically
  }
}
```

## ArrayBuffer & Preloading Troubleshooting

### Common Issues and Solutions

#### Issue: Preloading fails silently

```javascript
// Problem: Assuming preload success without checking return values
await audioMark.preloadAudio('music', 'invalid-url.mp3'); // Will show alert() and return false

// Solution: Always check return values for fallback strategies
const success = await audioMark.preloadAudio('music', 'assets/music.mp3');
if (!success) {
  console.error('Failed to preload music (alert was shown to user)');
  // Implement fallback strategy
  await audioMark.preloadAudio('music', 'assets/fallback.mp3');
}
```

#### Issue: Processing preloaded audio before AudioContext is ready

```javascript
// Problem: Trying to process before initialize()
const audioMark = new MarkJSAudio();
await audioMark.preloadAudio('music', 'assets/music.mp3');
await audioMark.processPreloadedAudio('music'); // Will fail!

// Solution: Always initialize first
await audioMark.initialize(); // Must be after user interaction
await audioMark.processPreloadedAudio('music'); // Now it works
```

#### Issue: Memory usage growing too large

```javascript
// Problem: Keeping too much preloaded data
const audioMark = new MarkJSAudio();
// Preloading many large files
await audioMark.preloadAudio('track1', 'large-file1.mp3');
await audioMark.preloadAudio('track2', 'large-file2.mp3');
// ... memory usage grows

// Solution: Process and clean up promptly
await audioMark.initialize();
await audioMark.processPreloadedAudio('track1'); // Cleans up raw data
// Only keep processed audio in memory
```

#### Issue: ArrayBuffer loading with incorrect format

```javascript
// Problem: Trying to load non-audio ArrayBuffer
const textData = new TextEncoder().encode('Hello World');
await audioMark.loadFromArrayBuffer('invalid', textData.buffer); // Will fail

// Solution: Ensure ArrayBuffer contains valid audio data
const response = await fetch('assets/audio.wav');
const audioBuffer = await response.arrayBuffer();
await audioMark.loadFromArrayBuffer('audio', audioBuffer); // Works
```

#### Issue: CORS errors when preloading

```javascript
// Problem: Cross-origin audio files
await audioMark.preloadAudio('music', 'https://other-domain.com/music.mp3'); // CORS error

// Solution: Ensure proper CORS headers or use same-origin files
// Server must send: Access-Control-Allow-Origin: *
// Or use same-origin files:
await audioMark.preloadAudio('music', '/assets/music.mp3'); // Same origin
```

### Performance Best Practices

1. **Preload Critical Audio First**

   ```javascript
   // Load UI sounds first, game audio second
   await audioMark.preloadAudio('ui-click', 'assets/ui/click.wav');
   await audioMark.preloadAudio('ui-error', 'assets/ui/error.wav');
   // Then load larger game audio in background
   ```

2. **Monitor Memory Usage**

   ```javascript
   function checkMemoryUsage(audioMark) {
     const state = audioMark.getState();
     console.log(`Loaded: ${state.loadedAudio.length}, Preloaded: ${state.preloadedAudio.length}`);

     if (state.preloadedAudio.length > 10) {
       console.warn('Too many preloaded files, consider processing some');
     }
   }
   ```

3. **Use Appropriate File Formats**

   ```javascript
   // For short SFX: Use WAV (faster decode)
   await audioMark.preloadAudio('click', 'assets/click.wav');

   // For long music: Use MP3 (smaller size)
   await audioMark.preloadAudio('theme', 'assets/theme.mp3');
   ```

4. **Implement Progressive Loading**

   ```javascript
   // Load in phases based on priority
   async function loadAudioByPriority(audioMark) {
     // Phase 1: Critical UI audio
     await Promise.all([audioMark.preloadAudio('click', 'assets/click.wav'), audioMark.preloadAudio('error', 'assets/error.wav')]);

     // Phase 2: Background music
     await audioMark.preloadAudio('bg', 'assets/background.mp3');

     // Phase 3: Game audio (can be delayed)
     setTimeout(async () => {
       await audioMark.preloadAudio('sfx', 'assets/effects.wav');
     }, 1000);
   }
   ```

### Debugging Tips

1. **Check State Information**

   ```javascript
   // Get detailed state for debugging
   const state = audioMark.getState();
   console.log('MarkJSAudio State:', state);
   console.log('Preloaded files:', state.preloadedAudio);
   console.log('Loaded files:', state.loadedAudio);
   ```

2. **Verify File Loading**

   ```javascript
   // Test if files are actually loadable
   async function verifyAudioFile(url) {
     try {
       const response = await fetch(url);
       if (!response.ok) {
         console.error(`File not found: ${url}`);
         return false;
       }

       const contentType = response.headers.get('content-type');
       if (!contentType.includes('audio')) {
         console.warn(`File might not be audio: ${url} (${contentType})`);
       }

       return true;
     } catch (error) {
       console.error(`Error accessing file ${url}:`, error);
       return false;
     }
   }
   ```

3. **Monitor Loading Performance**

   ```javascript
   // Time how long preloading takes
   async function timePreload(audioMark, name, url) {
     const start = performance.now();
     const success = await audioMark.preloadAudio(name, url);
     const duration = performance.now() - start;

     console.log(`Preload ${name}: ${success ? 'SUCCESS' : 'FAILED'} in ${duration.toFixed(2)}ms`);
     return success;
   }
   ```

## Browser Compatibility

MarkJSAudio requires modern browsers with Web Audio API support:

- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

No fallback is provided as specified in the requirements.

## Performance Tips

1. **Preload audio**: Load frequently used audio during initialization
2. **Unload unused audio**: Free memory by unloading audio no longer needed
3. **Limit simultaneous SFX**: Consider pooling for very frequent SFX
4. **Use appropriate formats**: MP3 for music (smaller), WAV for SFX (faster decoding)
5. **Monitor active sources**: Check `getState()` to monitor resource usage

## License

MIT License - see LICENSE file for details.
