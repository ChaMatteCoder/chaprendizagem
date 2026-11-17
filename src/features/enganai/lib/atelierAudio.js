// A quiet synthesized ambience, created only after the user's explicit gesture.
export function createAtelierAudio(AudioContextClass) {
  let context;
  let volume;
  let oscillators = [];
  let request = 0;
  let disposed = false;
  let wantsSound = false;
  let suspendTimer;
  return {
    async start() {
      if (disposed || !AudioContextClass) return false;
      wantsSound = true;
      const current = ++request;
      clearTimeout(suspendTimer);
      try {
        if (!context) {
          context = new AudioContextClass();
          volume = context.createGain();
          volume.gain.value = 0;
          const filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 350;
          volume.connect(filter);
          filter.connect(context.destination);
          oscillators = [110, 164.81].map((frequency) => {
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            oscillator.connect(volume);
            oscillator.start();
            return oscillator;
          });
        }
        await context.resume();
        if (!wantsSound && !disposed && context.state === "running")
          await context.suspend();
        if (disposed || current !== request || context.state !== "running")
          return false;
        volume.gain.cancelScheduledValues(context.currentTime);
        volume.gain.setTargetAtTime(0.012, context.currentTime, 0.4);
        return true;
      } catch {
        return false;
      }
    },
    stop() {
      wantsSound = false;
      request += 1;
      if (!context || disposed) return;
      volume.gain.cancelScheduledValues(context.currentTime);
      volume.gain.setTargetAtTime(0, context.currentTime, 0.08);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => {
        context?.suspend().catch(() => {});
      }, 300);
    },
    dispose() {
      wantsSound = false;
      disposed = true;
      request += 1;
      clearTimeout(suspendTimer);
      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
        } catch {
          /* Already stopped. */
        }
      }
      oscillators = [];
      context?.close().catch(() => {});
    },
  };
}
