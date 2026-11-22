import {decodeMidi, midiPayload, findMarbleHits} from './music.mjs';

const cancelled = () => new DOMException('Import cancelled', 'AbortError');

export async function importMusic(file, context, signal, status) {
  const bytes = await file.arrayBuffer();
  checkSignal(signal);
  if (midiPayload(new Uint8Array(bytes)) || /\.(mid|midi|rmi|kar)$/i.test(file.name)) {
    return {...decodeMidi(new Uint8Array(bytes)), kind:'midi', name:file.name};
  }
  let buffer;
  try {
    buffer = await context.decodeAudioData(bytes);
  } catch {
    checkSignal(signal);
    status('Opening extended audio decoder…');
    const undecoded = await file.arrayBuffer();
    const result = await workerRequest(new URL('./file-worker.js',import.meta.url), undecoded, [undecoded], signal);
    buffer = await context.decodeAudioData(result.wav);
  }
  checkSignal(signal);
  status('Finding hits in the recording…');
  if (!buffer.length || !Number.isFinite(buffer.duration)) throw new Error('The selected audio file is empty.');

  // A smaller analysis copy avoids duplicating the full stereo playback buffer.
  const stride = Math.max(1, Math.floor(buffer.sampleRate / 12000));
  const count = Math.floor(buffer.length / stride);
  const channels = [];
  for (let index = 0; index < Math.min(buffer.numberOfChannels,2); index++) {
    const source = buffer.getChannelData(index);
    const signalSamples = new Float32Array(count);
    for (let i=0; i<count; i++) signalSamples[i] = (source[i*stride] + source[i*stride+stride-1]) * .5;
    channels.push(signalSamples);
  }
  const sampleRate = buffer.sampleRate / stride;
  const events = typeof Worker === 'undefined'
    ? findMarbleHits(channels, sampleRate)
    : (await workerRequest(new URL('./analysis-worker.mjs',import.meta.url), {channels,sampleRate},
      channels.map(channel => channel.buffer), signal, {type:'module'})).events;
  return {kind:'audio', events, buffer, duration:buffer.duration, name:file.name};
}

function checkSignal(signal) {
  if (signal.aborted) throw cancelled();
}

function workerRequest(url, data, transfer, signal, options) {
  return new Promise((resolve, reject) => {
    checkSignal(signal);
    const worker = new Worker(url, options);
    const finish = (callback, result) => {
      clearTimeout(expiration);
      signal.removeEventListener('abort', abort);
      worker.terminate();
      callback(result);
    };
    const abort = () => finish(reject, cancelled());
    const expiration = setTimeout(() => finish(reject, new Error('Processing took too long. Try a shorter file.')), 150000);
    signal.addEventListener('abort', abort, {once:true});
    worker.onerror = () => finish(reject, new Error('Could not start the audio processing worker.'));
    worker.onmessage = ({data:result}) => {
      if (result.error) finish(reject, new Error(result.error));
      else finish(resolve, result);
    };
    worker.postMessage(data,transfer);
  });
}
