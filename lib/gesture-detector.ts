import { Landmark, FingerAnalysis, GestureType, Point } from './drawing-types';

export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17], [0, 17]
];

export function distance2D(p1: Landmark | Point, p2: Landmark | Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz * 0.5);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function analyzeHandLandmarks(
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  options: {
    pinchThreshold?: number;
    fistThreshold?: number;
    handedness?: 'Left' | 'Right' | 'Unknown';
    handConfidence?: number;
  } = {}
): FingerAnalysis {
  const pinchThreshold = options.pinchThreshold ?? 0.075;
  const fistThreshold = options.fistThreshold ?? 0.65;
  const handedness = options.handedness ?? 'Unknown';
  const handConfidence = options.handConfidence ?? 0.95;

  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
  const thumbIP = landmarks[HAND_LANDMARKS.THUMB_IP];
  const thumbMCP = landmarks[HAND_LANDMARKS.THUMB_MCP];

  const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
  const indexPIP = landmarks[HAND_LANDMARKS.INDEX_PIP];
  const indexMCP = landmarks[HAND_LANDMARKS.INDEX_MCP];

  const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_TIP];
  const middlePIP = landmarks[HAND_LANDMARKS.MIDDLE_PIP];
  const middleMCP = landmarks[HAND_LANDMARKS.MIDDLE_MCP];

  const ringTip = landmarks[HAND_LANDMARKS.RING_TIP];
  const ringPIP = landmarks[HAND_LANDMARKS.RING_PIP];
  const ringMCP = landmarks[HAND_LANDMARKS.RING_MCP];

  const pinkyTip = landmarks[HAND_LANDMARKS.PINKY_TIP];
  const pinkyPIP = landmarks[HAND_LANDMARKS.PINKY_PIP];
  const pinkyMCP = landmarks[HAND_LANDMARKS.PINKY_MCP];

  // Palm scale reference: distance between wrist and middle MCP
  const palmScale = Math.max(0.001, distance2D(wrist, middleMCP));

  // 1. Pinch Detection (Thumb Tip to Index Tip)
  const rawPinchDist = distance2D(thumbTip, indexTip);
  const normalizedPinchDist = rawPinchDist / (palmScale * 1.2);
  const isPinching = rawPinchDist < pinchThreshold || normalizedPinchDist < 0.35;

  const pinchMidpoint: Point = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };

  // 2. Individual Finger Analysis (Extended vs Curled)
  // For index, middle, ring, pinky: compare tip distance to wrist against PIP distance to wrist
  const calcFingerCurl = (tip: Landmark, pip: Landmark, mcp: Landmark) => {
    const tipToWrist = distance2D(tip, wrist);
    const pipToWrist = distance2D(pip, wrist);
    const tipToMCP = distance2D(tip, mcp);
    const pipToMCP = distance2D(pip, mcp);

    // If tip is closer to wrist than pip, or tip is very close to mcp
    const isCurled = tipToWrist < pipToWrist * 1.05 || tipToMCP < pipToMCP * 1.1;
    // Curl ratio between 0 (fully extended) and 1 (fully curled)
    const ratio = clamp(1 - (tipToWrist - pipToWrist * 0.6) / (palmScale * 1.1), 0, 1);
    return {
      extended: !isCurled && ratio < 0.45,
      curl: Number(ratio.toFixed(2)),
    };
  };

  // Thumb curl: compare tip distance to pinky MCP or index MCP
  const thumbTipToPinkyMCP = distance2D(thumbTip, pinkyMCP);
  const thumbIPToPinkyMCP = distance2D(thumbIP, pinkyMCP);
  const thumbCurlRatio = clamp(1 - (thumbTipToPinkyMCP / (palmScale * 1.3)), 0, 1);
  const isThumbExtended = thumbTipToPinkyMCP > thumbIPToPinkyMCP * 1.1 && thumbCurlRatio < 0.55;

  const fingerStates = {
    thumb: { extended: isThumbExtended, curl: Number(thumbCurlRatio.toFixed(2)) },
    index: calcFingerCurl(indexTip, indexPIP, indexMCP),
    middle: calcFingerCurl(middleTip, middlePIP, middleMCP),
    ring: calcFingerCurl(ringTip, ringPIP, ringMCP),
    pinky: calcFingerCurl(pinkyTip, pinkyPIP, pinkyMCP),
  };

  // 3. Fist / Closed Gap Detection
  // In a fist, the 4 non-thumb fingers are all curled, and thumb is tucked
  const curledFingersCount = [
    fingerStates.index.curl > 0.55,
    fingerStates.middle.curl > 0.55,
    fingerStates.ring.curl > 0.55,
    fingerStates.pinky.curl > 0.55,
  ].filter(Boolean).length;

  const averageCurl = (
    fingerStates.index.curl +
    fingerStates.middle.curl +
    fingerStates.ring.curl +
    fingerStates.pinky.curl
  ) / 4;

  // Hand spread / gap between adjacent fingertips
  const fingerSpread = (
    distance2D(indexTip, middleTip) +
    distance2D(middleTip, ringTip) +
    distance2D(ringTip, pinkyTip)
  ) / (palmScale * 3);

  // Fist is true when 4 fingers are curled or average curl exceeds threshold
  const isFist = (curledFingersCount >= 3 && averageCurl >= fistThreshold) || averageCurl > 0.82;

  // 4. Determine Active Gesture
  let gesture: GestureType = 'NONE';
  if (isFist) {
    gesture = 'FIST';
  } else if (isPinching) {
    gesture = 'PINCH';
  } else if (fingerStates.index.extended && !fingerStates.middle.extended && !fingerStates.ring.extended && !fingerStates.pinky.extended) {
    gesture = 'POINT';
  } else if (fingerStates.index.extended && fingerStates.middle.extended && fingerStates.ring.extended && fingerStates.pinky.extended) {
    gesture = 'OPEN_PALM';
  }

  return {
    gesture,
    isPinching,
    pinchDistance: Number(rawPinchDist.toFixed(3)),
    pinchDistancePx: Math.round(rawPinchDist * Math.min(canvasWidth, canvasHeight)),
    pinchMidpoint,
    isFist,
    fistConfidence: Number(averageCurl.toFixed(2)),
    fingerStates,
    handSpread: Number(fingerSpread.toFixed(2)),
    handedness,
    handConfidence: Number(handConfidence.toFixed(2)),
  };
}
