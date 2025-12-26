export class MarkJSAudio {
  constructor() {
    this.sfxGain = null;
    this.volumes = {
      master: 100,
      music: 100,
      sfx: 100,
    };

    this.audioBuffers = new Map();

    this.preloadedAudioData = new Map();

    this.activeSources = new Set();
    this.activeMusicSources = new Set();

    this.currentMusic = null;
    this.isMusicPaused = false;
    this.musicStartTime = 0;
    this.musicPauseTime = 0;

    this.isInitialized = false;
  }

  async waitForAllPreloads() {
    if (this.preloadedAudioData.size > 0) {
      try {
        await Promise.all(Array.from(this.preloadedAudioData.values()));
        return true;
      } catch (preloadError) {
        alert(`Some audio preloads failed: ${preloadError.message}`);
        return false;
      }
    }
    return true;
  }

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const preloadsOk = await this.waitForAllPreloads();
      if (!preloadsOk) {
        return false;
      }
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      this.updateVolumes();
      this.isInitialized = true;
      return true;
    } catch (error) {
      alert(`MarkJSAudio initialization failed: ${error.message}`);
      return false;
    }
  }

  async loadAudio(name, source) {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return false;
    }
    try {
      let arrayBuffer;
      if (source instanceof ArrayBuffer) {
        arrayBuffer = source.slice(0);
      } else if (source instanceof File) {
        arrayBuffer = await source.arrayBuffer();
      } else {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      }
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
      return true;
    } catch (error) {
      alert(`Failed to load audio "${name}": ${error.message}`);
      return false;
    }
  }

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
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.audioBuffers.set(name, audioBuffer);

      return true;
    } catch (error) {
      alert(`Failed to load audio from ArrayBuffer "${name}": ${error.message}`);
      return false;
    }
  }

  async preloadAudio(name, source) {
    try {
      const loadPromise = (async () => {
        let arrayBuffer;

        if (source instanceof File) {
          arrayBuffer = await source.arrayBuffer();
        } else {
          const response = await fetch(source);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
        return arrayBuffer;
      })();

      this.preloadedAudioData.set(name, loadPromise);

      await loadPromise;

      return true;
    } catch (error) {
      alert(`Failed to preload audio "${name}": ${error.message}`);
      this.preloadedAudioData.delete(name);
      return false;
    }
  }

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
      const arrayBuffer = await arrayBufferPromise;

      const bufferCopy = arrayBuffer.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
      this.audioBuffers.set(name, audioBuffer);

      this.preloadedAudioData.delete(name);

      return true;
    } catch (error) {
      alert(`Failed to process preloaded audio "${name}": ${error.message}`);
      return false;
    }
  }

  async processAllPreloadedAudio() {
    if (!this.isInitialized) {
      alert('MarkJSAudio not initialized. Call initialize() first.');
      return { preloadsOk: false, results: [] };
    }

    const preloadsOk = await this.waitForAllPreloads();
    const names = Array.from(this.preloadedAudioData.keys());
    const results = [];

    if (!preloadsOk) {
      // If preloads failed, mark all as failed
      for (const name of names) {
        results.push({ name, success: false });
      }
      return { preloadsOk, results };
    }

    for (const name of names) {
      const success = await this.processPreloadedAudio(name);
      results.push({ name, success });
    }

    return { preloadsOk, results };
  }

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

  playSFX(name, options = {}) {
    const { loop = false, volume = 1.0, fadeIn = 0 } = options;

    return this._playAudio(name, this.sfxGain, {
      loop,
      volume,
      fadeIn,
      type: 'sfx',
    });
  }

  playMusic(name, options = {}) {
    const { loop = true, volume = 1.0, fadeIn = 0, stopCurrent = true } = options;

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
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = options.loop;

      const sourceGain = this.audioContext.createGain();
      source.connect(sourceGain);
      sourceGain.connect(gainNode);

      sourceGain.gain.setValueAtTime(options.volume, this.audioContext.currentTime);

      if (options.fadeIn > 0) {
        sourceGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        sourceGain.gain.linearRampToValueAtTime(options.volume, this.audioContext.currentTime + options.fadeIn);
      }

      this.activeSources.add(source);

      source.onended = () => {
        this.activeSources.delete(source);
        if (options.type === 'music') {
          this.activeMusicSources.delete(source);
          if (this.currentMusic && this.currentMusic.source === source) {
            this.currentMusic = null;
          }
        }
      };

      source.start(0);

      return source;
    } catch (error) {
      alert(`Failed to play audio "${name}": ${error.message}`);
      return null;
    }
  }

  stopMusic() {
    this.activeMusicSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeMusicSources.clear();
    this.currentMusic = null;
    this.isMusicPaused = false;
  }

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

  setVolume(type, volume) {
    volume = Math.max(0, Math.min(100, volume));
    this.volumes[type] = volume;
    this.updateVolumes();
  }

  getVolume(type) {
    return this.volumes[type];
  }

  updateVolumes() {
    if (!this.isInitialized) return;

    const masterVol = this.volumes.master / 100;
    const musicVol = (this.volumes.music / 100) * masterVol;
    const sfxVol = (this.volumes.sfx / 100) * masterVol;

    this.masterGain.gain.setValueAtTime(masterVol, this.audioContext.currentTime);
    this.musicGain.gain.setValueAtTime(musicVol, this.audioContext.currentTime);
    this.sfxGain.gain.setValueAtTime(sfxVol, this.audioContext.currentTime);
  }

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
