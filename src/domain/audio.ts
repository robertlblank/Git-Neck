import { getDisplayName, modPitchClass } from "./notes";

export type PitchDetection = {
  frequencyHz: number;
  pitchClass: number;
  displayName: string;
  cents: number;
};

export type TargetPitchClassification = {
  pitchClass: number;
  displayName: string;
  centsFromTarget: number;
  acceptedAsTarget: boolean;
  observedTuningOffsetCents: number;
};

export type TuningOffsetUpdate = {
  tuningOffsetCents: number;
  sampleCount: number;
  acceptedObservation: boolean;
};

export type IdleAdjustedTimer = {
  scoringStartedAtMs: number;
  excludedIdleMs: number;
};

const A4_HZ = 440;
const A4_MIDI = 69;

export const IDLE_SILENCE_GRACE_MS = 5000;

export function frequencyToMidi(frequencyHz: number): number {
  return Math.round(frequencyToMidiFloat(frequencyHz));
}

export function frequencyToMidiFloat(frequencyHz: number): number {
  return 12 * Math.log2(frequencyHz / A4_HZ) + A4_MIDI;
}

export function frequencyToPitchClass(frequencyHz: number): number {
  return modPitchClass(frequencyToMidi(frequencyHz));
}

export function frequencyToPitchClassWithOffset(frequencyHz: number, tuningOffsetCents: number): number {
  return modPitchClass(Math.round(frequencyToMidiFloat(frequencyHz) - tuningOffsetCents / 100));
}

export function describeFrequency(frequencyHz: number): PitchDetection {
  const midi = frequencyToMidi(frequencyHz);
  const nearestFrequency = midiToFrequency(midi);
  const cents = Math.round(1200 * Math.log2(frequencyHz / nearestFrequency));
  const pitchClass = modPitchClass(midi);

  return {
    frequencyHz,
    pitchClass,
    displayName: getDisplayName(pitchClass),
    cents
  };
}

export function midiToFrequency(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export function classifyFrequencyForTarget(params: {
  frequencyHz: number;
  targetPitchClass: number;
  tuningOffsetCents: number;
  toleranceCents?: number;
}): TargetPitchClassification {
  const toleranceCents = params.toleranceCents ?? 75;
  const rawMidi = frequencyToMidiFloat(params.frequencyHz);
  const adjustedMidi = rawMidi - params.tuningOffsetCents / 100;
  const nearestAdjustedTargetMidi = nearestMidiForPitchClass(adjustedMidi, params.targetPitchClass);
  const roundedCentsFromTarget = Math.round((adjustedMidi - nearestAdjustedTargetMidi) * 100);
  const centsFromTarget = Object.is(roundedCentsFromTarget, -0) ? 0 : roundedCentsFromTarget;
  const acceptedAsTarget = Math.abs(centsFromTarget) <= toleranceCents;
  const pitchClass = acceptedAsTarget
    ? modPitchClass(params.targetPitchClass)
    : frequencyToPitchClassWithOffset(params.frequencyHz, params.tuningOffsetCents);
  const nearestRawTargetMidi = nearestMidiForPitchClass(rawMidi, params.targetPitchClass);

  return {
    pitchClass,
    displayName: getDisplayName(pitchClass),
    centsFromTarget,
    acceptedAsTarget,
    observedTuningOffsetCents: Math.round((rawMidi - nearestRawTargetMidi) * 100)
  };
}

export function updateSessionTuningOffset(params: {
  currentOffsetCents: number;
  sampleCount: number;
  observedOffsetCents: number;
}): TuningOffsetUpdate {
  const maxTrustedObservationCents = 45;
  const maxSessionOffsetCents = 40;

  if (Math.abs(params.observedOffsetCents) > maxTrustedObservationCents) {
    return {
      tuningOffsetCents: params.currentOffsetCents,
      sampleCount: params.sampleCount,
      acceptedObservation: false
    };
  }

  const learningRate = params.sampleCount < 4 ? 0.25 : 0.1;
  const nextOffset =
    params.currentOffsetCents + (params.observedOffsetCents - params.currentOffsetCents) * learningRate;

  return {
    tuningOffsetCents: Math.round(clamp(nextOffset, -maxSessionOffsetCents, maxSessionOffsetCents)),
    sampleCount: params.sampleCount + 1,
    acceptedObservation: true
  };
}

export function excludeIdleSilenceFromTimer(params: {
  scoringStartedAtMs: number;
  silenceStartedAtMs: number;
  resumedAtMs: number;
  idleGraceMs?: number;
}): IdleAdjustedTimer {
  const idleGraceMs = params.idleGraceMs ?? IDLE_SILENCE_GRACE_MS;
  const silentMs = Math.max(0, params.resumedAtMs - params.silenceStartedAtMs);

  if (silentMs <= idleGraceMs) {
    return {
      scoringStartedAtMs: params.scoringStartedAtMs,
      excludedIdleMs: 0
    };
  }

  return {
    scoringStartedAtMs: params.scoringStartedAtMs + silentMs,
    excludedIdleMs: silentMs
  };
}

export function estimatePitchFromTimeDomain(buffer: Float32Array, sampleRate: number): PitchDetection | null {
  const rms = Math.sqrt(buffer.reduce((sum, sample) => sum + sample * sample, 0) / buffer.length);
  if (rms < 0.015) {
    return null;
  }

  const minFrequency = 70;
  const maxFrequency = 1200;
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.floor(sampleRate / minFrequency);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;

    for (let index = 0; index < buffer.length - lag; index += 1) {
      correlation += buffer[index] * buffer[index + lag];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorrelation < 0.01) {
    return null;
  }

  return describeFrequency(sampleRate / bestLag);
}

function nearestMidiForPitchClass(midi: number, pitchClass: number): number {
  const normalizedPitchClass = modPitchClass(pitchClass);
  const base = Math.round((midi - normalizedPitchClass) / 12) * 12 + normalizedPitchClass;
  const candidates = [base - 12, base, base + 12];
  return candidates.reduce((nearest, candidate) =>
    Math.abs(candidate - midi) < Math.abs(nearest - midi) ? candidate : nearest
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
