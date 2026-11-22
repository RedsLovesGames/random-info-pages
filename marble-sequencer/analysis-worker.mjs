import {findMarbleHits} from './music.mjs';

self.onmessage = ({data}) => {
  try {
    self.postMessage({events:findMarbleHits(data.channels, data.sampleRate)});
  } catch {
    self.postMessage({error:'The rhythm analysis could not finish for this file.'});
  }
};
