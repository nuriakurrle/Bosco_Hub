// public/pcm-worklet.js — AudioWorklet que convierte el audio del micrófono
// (Float32) a PCM16 y lo envía al hilo principal, que lo manda al microservicio.
// Servido como estático desde /pcm-worklet.js. Ver components/LiveCall.js.
class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const pcm = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true; // mantener el procesador vivo
  }
}
registerProcessor("pcm-worklet", PCMWorklet);
