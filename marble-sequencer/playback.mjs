import {lowerBound} from './music.mjs';

const waveforms = ['triangle','sine','triangle','sine','triangle','sine','sawtooth','sawtooth',
  'triangle','sine','sine','square','triangle','triangle','sine','triangle'];

export class Playback {
  context = null;
  song = null;
  speed = 1;
  volume = .78;
  offset = 0;
  running = false;
  revision = 0;

  constructor(onEnd) { this.onEnd = onEnd; }

  openAudio() {
    if (this.context) return this.context;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser does not support local audio playback.');
    const context = this.context = new Audio();
    this.volumeNode = context.createGain();
    this.volumeNode.gain.value = this.volume;
    const compressor = context.createDynamicsCompressor();
    this.volumeNode.connect(compressor).connect(context.destination);
    return context;
  }

  setVolume(value) {
    this.volume = value;
    this.volumeNode?.gain.setTargetAtTime(value,this.context.currentTime,.02);
  }

  load(song) {
    this.pause();
    this.song = song;
    this.offset = 0;
  }

  get position() {
    if (!this.running) return this.offset;
    return Math.min(this.song.duration, this.offset + Math.max(0,this.context.currentTime - this.origin) * this.speed);
  }

  async play() {
    if (!this.song || this.running) return;
    const revision = ++this.revision;
    const context = this.openAudio();
    await context.resume();
    if (revision !== this.revision) return;
    if (this.offset >= this.song.duration) this.offset = 0;
    this.origin = context.currentTime + .035;
    this.session = context.createGain();
    this.session.connect(this.volumeNode);
    this.sources = new Set();
    this.running = true;
    if (this.song.kind === 'audio') {
      const player = context.createBufferSource();
      player.buffer = this.song.buffer;
      player.playbackRate.value = this.speed;
      this.trackSource(player, this.session);
      player.start(this.origin, this.offset);
    } else {
      this.next = lowerBound(this.song.events,this.offset);
      // Only notes already sounding at the seek position need to be restarted.
      for (let i = 0; i < this.next; i++) {
        const note = this.song.events[i];
        const remainder = (note.time + note.duration - this.offset) / this.speed;
        if (remainder > .008 && note.channel !== 9) this.voice(note,this.origin,remainder,this.session);
      }
    }
    this.tick();
    this.timer = setInterval(() => this.tick(),25);
  }

  trackSource(source, output, nodes=[]) {
    const collection = this.sources;
    source.connect(output);
    collection.add(source);
    source.onended = () => {
      collection.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  }

  tick() {
    if (!this.running) return;
    if (this.position >= this.song.duration) {
      this.pause();
      this.onEnd();
      return;
    }
    if (this.song.kind === 'audio') return;
    const limit = this.position + .18 * this.speed;
    const events = this.song.events;
    while (this.next < events.length && events[this.next].time <= limit) {
      const note = events[this.next++];
      const time = this.origin + (note.time - this.offset) / this.speed;
      const late = Math.max(0,this.context.currentTime - time);
      const duration = note.duration / this.speed - late;
      if (duration > .005 && this.sources.size < 150) {
        this.voice(note,Math.max(time,this.context.currentTime),duration,this.session);
      }
    }
  }

  pause() {
    ++this.revision;
    if (!this.running) return;
    this.offset = this.position;
    this.running = false;
    clearInterval(this.timer);
    for (const source of this.sources) {
      try { source.stop(); } catch { /* It may have just ended. */ }
    }
    this.session.disconnect();
  }

  seek(time) {
    const resume = this.running;
    this.pause();
    this.offset = Math.max(0,Math.min(time,this.song.duration));
    return resume ? this.play() : Promise.resolve();
  }

  async setSpeed(value) {
    const resume = this.running;
    this.pause();
    this.speed = value;
    if (resume) await this.play();
  }

  async preview(note,delay=0) {
    const context = this.openAudio();
    await context.resume();
    this.sources ||= new Set();
    this.voice({...note, velocity:.72, program:12},context.currentTime + Math.max(.015,delay),.2,this.volumeNode);
  }

  voice(note,time,duration,destination) {
    const ctx = this.context;
    const envelope = ctx.createGain();
    envelope.connect(destination);
    const limit = Math.min(1, note.velocity);
    const pitch = 440 * 2 ** ((note.note - 69) / 12);
    const lowDrum = note.channel === 9 && note.note <= 36;
    const noisyDrum = note.channel === 9 && !lowDrum;
    let source;
    const nodes = [envelope];
    if (noisyDrum) {
      if (!this.noise) {
        this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * .35),ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i=0; i<data.length; i++) data[i] = 2 * Math.random() - 1;
      }
      source = ctx.createBufferSource();
      source.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = note.note < 42 ? 'bandpass' : 'highpass';
      filter.frequency.value = note.note < 42 ? 1600 : 5700;
      source.connect(filter).connect(envelope);
      nodes.push(filter);
    } else {
      source = ctx.createOscillator();
      const family = Math.floor((note.program || 0) / 8);
      source.type = lowDrum ? 'sine' : (waveforms[family] || 'triangle');
      source.frequency.setValueAtTime(lowDrum ? 138 : pitch,time);
      if (lowDrum) source.frequency.exponentialRampToValueAtTime(42,time + .14);
    }
    const tail = note.channel === 9 ? Math.min(.19, Math.max(.065,duration + .045)) : Math.max(.04,duration + .055);
    const peak = Math.max(.0002,limit * (lowDrum ? .39 : noisyDrum ? .22 : .125));
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(peak,time + .006);
    if (note.channel !== 9 && tail > .09) envelope.gain.exponentialRampToValueAtTime(peak * .32,time + tail - .035);
    envelope.gain.exponentialRampToValueAtTime(.0001,time + tail);
    // Noise is already routed through its filter.
    if (noisyDrum) {
      const collection = this.sources;
      collection.add(source);
      source.onended = () => { collection.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
    } else this.trackSource(source,envelope,nodes);
    source.start(time);
    source.stop(time + tail + .01);
  }
}
