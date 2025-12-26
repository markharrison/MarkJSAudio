/**
 * MarkJSAudio - JavaScript Audio Library using Web Audio API
 * MIT License
 *
 * A comprehensive audio library for web games supporting SFX and music
 * with volume controls, transitions, and advanced audio features.
 */

export class MarkJSAudio {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Volume settings (0-100)
    this.volumes = {
      master: 100,
      music: 100,
      sfx: 100,
    };

    // Audio buffers storage
    this.audioBuffers = new Map();

    // Preloaded audio data storage (raw ArrayBuffers before decoding)
    // Stores Promises that resolve to ArrayBuffers
    this.preloadedAudioData = new Map();

    // Active sources for tracking and cleanup
    this.activeSources = new Set();
    this.activeMusicSources = new Set();

    // Current music state
    this.currentMusic = null;
    this.isMusicPaused = false;
    this.musicStartTime = 0;
    this.musicPauseTime = 0;

    this.isInitialized = false;
  }

  /**
   * Initialize the audio context and gain nodes
   * Must be called after user interaction
   */
  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Handle suspended context (user interaction requirement)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();

      // Connect gain nodes: sfx/music -> master -> destination
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      // Set initial volumes
      this.updateVolumes();

      this.isInitialized = true;
      return true;
    } catch (error) {
      alert(`MarkJSAudio initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Load audio file from URL, File object, or ArrayBuffer
   * @param {string} name - Identifier for the audio
   * @param {string|File|ArrayBuffer} source - URL string, File object, or ArrayBuffer
   */
  async loadAudio(name, source) {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return false;
    }

    try {
      let arrayBuffer;

      if (source instanceof ArrayBuffer) {
        // Handle ArrayBuffer directly
        // Clone the buffer to prevent the original from being detached
        arrayBuffer = source.slice(0);
      } else if (source instanceof File) {
        // Handle File object
        arrayBuffer = await source.arrayBuffer();
      } else {
        // Handle URL string
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);

      return true;
    } catch (error) {
      alert(`Failed to load audio "${name}": ${error.message}`);
      return false;
    }
  }

  /**
   * Load audio from ArrayBuffer (for when raw data is already available)
   * @param {string} name - Identifier for the audio
   * @param {ArrayBuffer} arrayBuffer - Raw audio data
   */
  async loadFromArrayBuffer(name, arrayBuffer) {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return false;
    }

    if (!(arrayBuffer instanceof ArrayBuffer)) {
      alert('loadFromArrayBuffer requires an ArrayBuffer as input.');
      return false;
    }

    try {
      // Decode audio data
      // Clone the buffer to prevent the original from being detached
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.audioBuffers.set(name, audioBuffer);

      return true;
    } catch (error) {
      alert(`Failed to load audio from ArrayBuffer "${name}": ${error.message}`);
      return false;
    }
  }

  /**
   * Preload raw audio data (fetch before AudioContext is available)
   * @param {string} name - Identifier for the audio
   * @param {string|File} source - URL string or File object
   */
  async preloadAudio(name, source) {
    try {
      const loadPromise = (async () => {
        let arrayBuffer;

        if (source instanceof File) {
          // Handle File object
          arrayBuffer = await source.arrayBuffer();
        } else {
          // Handle URL string
          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
        return arrayBuffer;
      })();

      // Store the promise immediately
      this.preloadedAudioData.set(name, loadPromise);

      // Wait for it to resolve to ensure it loaded correctly, but we already stored the promise
      await loadPromise;

      return true;
    } catch (error) {
      alert(`Failed to preload audio "${name}": ${error.message}`);
      // Remove the failed promise so we don't try to process it later
      this.preloadedAudioData.delete(name);
      return false;
    }
  }

  /**
   * Process preloaded audio data (decode after AudioContext is available)
   * @param {string} name - Identifier for the preloaded audio
   */
  async processPreloadedAudio(name) {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return false;
    }

    const arrayBufferPromise = this.preloadedAudioData.get(name);
    if (!arrayBufferPromise) {
      alert(`No preloaded audio data found for "${name}".`);
      return false;
    }

    try {
      // Wait for the download to finish if it hasn't already
      const arrayBuffer = await arrayBufferPromise;

      // Decode the preloaded audio data
      // Clone the buffer to prevent the original from being detached
      const bufferCopy = arrayBuffer.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
      this.audioBuffers.set(name, audioBuffer);

      // Clean up the raw data since it's now processed
      this.preloadedAudioData.delete(name);

      return true;
    } catch (error) {
      alert(`Failed to process preloaded audio "${name}": ${error.message}`);
      return false;
    }
  }

  /**
   * Process all preloaded audio data
   */
  async processAllPreloadedAudio() {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return false;
    }

    const names = Array.from(this.preloadedAudioData.keys());
    const results = [];

    for (const name of names) {
      const success = await this.processPreloadedAudio(name);
      results.push({ name, success });
    }

    return results;
  }

  /**
   * Unload audio file
   * @param {string} name - Identifier for the audio to unload
   */
  unloadAudio(name) {
    let unloaded = false;

    if (this.audioBuffers.has(name)) {
      this.audioBuffers.delete(name);
      unloaded = true;
    }

    if (this.preloadedAudioData.has(name)) {
      this.preloadedAudioData.delete(name);
      unloaded = true;
    }

    return unloaded;
  }

  /**
   * Play sound effect (SFX) - short, low-latency
   * @param {string} name - Identifier for the SFX
   * @param {Object} options - Playback options
   */
  playSFX(name, options = {}) {
    const { loop = false, volume = 1.0, fadeIn = 0 } = options;

    return this._playAudio(name, this.sfxGain, {
      loop,
      volume,
      fadeIn,
      type: 'sfx',
    });
  }

  /**
   * Play music with full controls
   * @param {string} name - Identifier for the music
   * @param {Object} options - Playback options
   */
  playMusic(name, options = {}) {
    const { loop = true, volume = 1.0, fadeIn = 0, stopCurrent = true } = options;

    // Stop current music if requested
    if (stopCurrent && this.currentMusic) {
      this.stopMusic();
    }

    const source = this._playAudio(name, this.musicGain, {
      loop,
      volume,
      fadeIn,
      type: 'music',
    });

    if (source) {
      this.currentMusic = {
        source,
        name,
        startTime: this.audioContext.currentTime,
        loop,
      };
      this.isMusicPaused = false;
      this.activeMusicSources.add(source);
    }

    return source;
  }

  /**
   * Internal method to play audio
   * @private
   */
  _playAudio(name, gainNode, options) {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized.');
      return null;
    }

    const audioBuffer = this.audioBuffers.get(name);
    if (!audioBuffer) {
      alert(`Audio "${name}" not loaded.`);
      return null;
    }

    try {
      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = options.loop;

      // Create gain node for individual volume control
      const sourceGain = this.audioContext.createGain();
      source.connect(sourceGain);
      sourceGain.connect(gainNode);

      // Set volume
      sourceGain.gain.setValueAtTime(options.volume, this.audioContext.currentTime);

      // Handle fade-in
      if (options.fadeIn > 0) {
        sourceGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        sourceGain.gain.linearRampToValueAtTime(options.volume, this.audioContext.currentTime + options.fadeIn);
      }

      // Track active sources for cleanup
      this.activeSources.add(source);

      // Clean up when finished
      source.onended = () => {
        this.activeSources.delete(source);
        if (options.type === 'music') {
          this.activeMusicSources.delete(source);
          if (this.currentMusic && this.currentMusic.source === source) {
            this.currentMusic = null;
          }
        }
      };

      // Start playback
      source.start(0);

      return source;
    } catch (error) {
      alert(`Failed to play audio "${name}": ${error.message}`);
      return null;
    }
  }

  /**
   * Stop all music
   */
  stopMusic() {
    this.activeMusicSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    this.activeMusicSources.clear();
    this.currentMusic = null;
    this.isMusicPaused = false;
  }

  /**
   * Pause current music
   */
  pauseMusic() {
    if (this.currentMusic && !this.isMusicPaused) {
      this.musicPauseTime = this.audioContext.currentTime;

      // Stop the audio source but preserve the music state for resume
      if (this.currentMusic.source) {
        try {
          this.currentMusic.source.stop();
        } catch (e) {
          // Source may already be stopped
        }
        this.activeSources.delete(this.currentMusic.source);
        this.activeMusicSources.delete(this.currentMusic.source);
        // Set source to null but keep the rest of currentMusic intact
        this.currentMusic.source = null;
      }

      this.isMusicPaused = true;
      return true;
    }
    return false;
  }

  /**
   * Resume paused music
   */
  resumeMusic() {
    if (this.currentMusic && this.isMusicPaused) {
      // Calculate offset for resume
      const elapsed = this.musicPauseTime - this.currentMusic.startTime;
      const buffer = this.audioBuffers.get(this.currentMusic.name);

      if (buffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = this.currentMusic.loop;
        source.connect(this.musicGain);

        // Resume from pause position
        const offset = this.currentMusic.loop ? elapsed % buffer.duration : elapsed;
        source.start(0, Math.max(0, offset));

        // Update the current music source and timing
        this.currentMusic.source = source;
        this.currentMusic.startTime = this.audioContext.currentTime - elapsed;
        this.activeMusicSources.add(source);
        this.activeSources.add(source);

        source.onended = () => {
          this.activeSources.delete(source);
          this.activeMusicSources.delete(source);
          if (this.currentMusic && this.currentMusic.source === source) {
            this.currentMusic = null;
            this.isMusicPaused = false;
          }
        };

        this.isMusicPaused = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Stop all audio
   */
  stopAll() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    this.activeSources.clear();
    this.activeMusicSources.clear();
    this.currentMusic = null;
    this.isMusicPaused = false;
  }

  /**
   * Set volume for master, music, or sfx
   * @param {string} type - 'master', 'music', or 'sfx'
   * @param {number} volume - Volume from 0 to 100
   */
  setVolume(type, volume) {
    volume = Math.max(0, Math.min(100, volume));
    this.volumes[type] = volume;
    this.updateVolumes();
  }

  /**
   * Get current volume
   * @param {string} type - 'master', 'music', or 'sfx'
   */
  getVolume(type) {
    return this.volumes[type];
  }

  /**
   * Update gain node volumes based on current settings
   * @private
   */
  updateVolumes() {
    if (!this.isInitialized) return;

    const masterVol = this.volumes.master / 100;
    const musicVol = (this.volumes.music / 100) * masterVol;
    const sfxVol = (this.volumes.sfx / 100) * masterVol;

    this.masterGain.gain.setValueAtTime(masterVol, this.audioContext.currentTime);
    this.musicGain.gain.setValueAtTime(musicVol, this.audioContext.currentTime);
    this.sfxGain.gain.setValueAtTime(sfxVol, this.audioContext.currentTime);
  }

  /**
   * Fade out audio over specified duration
   * @param {AudioBufferSourceNode} source - The audio source to fade
   * @param {number} duration - Fade duration in seconds
   */
  fadeOut(source, duration = 1.0) {
    if (!source || !this.isInitialized) return;

    try {
      const currentTime = this.audioContext.currentTime;
      const gainNode = source.connect ? this.audioContext.createGain() : null;

      if (gainNode) {
        source.disconnect();
        source.connect(gainNode);
        gainNode.connect(this.musicGain);

        gainNode.gain.setValueAtTime(1.0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

        setTimeout(() => {
          try {
            source.stop();
          } catch (e) {
            // Source may already be stopped
          }
        }, duration * 1000);
      }
    } catch (error) {
      alert(`Fade out error: ${error.message}`);
    }
  }

  /**
   * Transition from one music track to another with crossfade
   * @param {string} newTrackName - Name of the new track to play
   * @param {number} transitionTime - Transition duration in seconds
   * @param {Object} options - Options for the new track
   */
  async transitionMusic(newTrackName, transitionTime = 2.0, options = {}) {
    if (!this.audioBuffers.has(newTrackName)) {
      alert(`Music track "${newTrackName}" not loaded.`);
      return false;
    }

    const currentSource = this.currentMusic ? this.currentMusic.source : null;

    // Start new music with fade-in
    const newSource = this.playMusic(newTrackName, {
      ...options,
      fadeIn: transitionTime,
      volume: options.volume || 1.0,
      stopCurrent: false,
    });

    // Fade out current music
    if (currentSource) {
      this.fadeOut(currentSource, transitionTime);
    }

    return true;
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopAll();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffers.clear();
    this.preloadedAudioData.clear();
    this.activeSources.clear();
    this.activeMusicSources.clear();
    this.currentMusic = null;
    this.isInitialized = false;
  }

  /**
   * Get current state information
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      audioContextState: this.audioContext ? this.audioContext.state : 'none',
      loadedAudio: Array.from(this.audioBuffers.keys()),
      preloadedAudio: Array.from(this.preloadedAudioData.keys()),
      activeSources: this.activeSources.size,
      activeMusicSources: this.activeMusicSources.size,
      currentMusic: this.currentMusic ? this.currentMusic.name : null,
      isMusicPaused: this.isMusicPaused,
      volumes: { ...this.volumes },
    };
  }
}
