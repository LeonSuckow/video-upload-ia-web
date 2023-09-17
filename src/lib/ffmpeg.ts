import { FFmpeg } from '@ffmpeg/ffmpeg'

let ffmpeg: FFmpeg | null;

import coreURL from '../ffmpeg/ffmpeg-core.js?url';
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url';
import workerURL from '../ffmpeg/ffmpeg-worker.js?url';

export async function getFFmpeg() {
  if (ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL
    });
  }
  return ffmpeg
}