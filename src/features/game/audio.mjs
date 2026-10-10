// Web Audio is created only after a player gesture; no audio downloads needed.
export function createGameAudio() {
  let context, master, noise;
  let enabled = true,
    playing = false,
    serial = 0,
    lastHit = -1;
  function volume() {
    if (master)
      master.gain.setValueAtTime(
        enabled && playing ? 0.13 : 0,
        context.currentTime,
      );
  }
  return {
    unlock() {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        if (!context) {
          context = new Audio();
          master = context.createGain();
          master.connect(context.destination);
          noise = context.createBuffer(
            1,
            Math.ceil(context.sampleRate * 0.22),
            context.sampleRate,
          );
          const samples = noise.getChannelData(0);
          for (let i = 0; i < samples.length; i++)
            samples[i] = Math.random() * 2 - 1;
          volume();
        }
        void context.resume().catch(() => {});
      } catch {
        /* Audio is optional on unsupported browsers. */
      }
    },
    setEnabled(value) {
      enabled = value;
      volume();
    },
    setPlaying(value) {
      playing = value;
      volume();
    },
    reset() {
      serial = 0;
      lastHit = -1;
    },
    consume(s) {
      if (s.laserHitSerial === serial) return;
      serial = s.laserHitSerial;
      if (!enabled || !playing || context?.state !== "running") return;
      const now = context.currentTime;
      if (now - lastHit < 0.1) return;
      lastHit = now;
      const tier = s.laserHitTier;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      gain.connect(master);
      const tone = context.createOscillator();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(700 + tier * 240, now);
      tone.frequency.exponentialRampToValueAtTime(80 + tier * 35, now + 0.16);
      tone.connect(gain);
      const crackle = context.createBufferSource();
      crackle.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500 + tier * 350;
      crackle.connect(filter);
      filter.connect(gain);
      tone.start(now);
      crackle.start(now);
      tone.stop(now + 0.2);
      crackle.stop(now + 0.2);
      crackle.onended = () => {
        tone.disconnect();
        crackle.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    },
    dispose() {
      if (context) void context.close().catch(() => {});
    },
  };
}
