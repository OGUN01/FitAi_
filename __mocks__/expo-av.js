// Manual mock for expo-av.
//
// Native AV module (requireNativeModule('ExponentAV')) — no unit-testable
// playback logic in this project. Any component importing `Video` from
// expo-av (ExerciseGifPlayer.tsx, Workout Engine v2 §K.7) crashes Jest's
// native module registry with "Cannot find native module 'ExponentAV'"
// without this, exactly the same class of failure expo-haptics.js already
// works around for haptics. Video renders as a plain no-op component —
// nothing in this project's tests inspects actual video playback, just that
// components importing it render without crashing.
const React = require("react");

module.exports = {
  Video: React.forwardRef((_props, _ref) => null),
  ResizeMode: { CONTAIN: "contain", COVER: "cover", STRETCH: "stretch" },
  Audio: {
    Sound: { createAsync: jest.fn(() => Promise.resolve({ sound: {} })) },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  },
};
