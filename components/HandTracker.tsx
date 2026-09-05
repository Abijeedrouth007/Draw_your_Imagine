'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Landmark, FingerAnalysis, CanvasSettings, Point } from '@/lib/drawing-types';
import { analyzeHandLandmarks, HAND_CONNECTIONS, HAND_LANDMARKS } from '@/lib/gesture-detector';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  MousePointer2,
  ExternalLink,
  ChevronDown,
  Check,
  Video,
  VideoOff,
  AlertCircle,
  HelpCircle,
  X,
  Laptop,
} from 'lucide-react';

export interface CameraInfo {
  state: 'idle' | 'requesting' | 'active' | 'denied' | 'error';
  errorMessage: string;
  activeLabel: string;
  isSimulator: boolean;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  selectDevice: (deviceId: string) => void;
  startCamera: (targetDeviceId?: string) => void;
  stopCamera: () => void;
  toggleCamera: () => void;
  openSetupModal: () => void;
}

interface HandTrackerProps {
  settings: CanvasSettings;
  onAnalysisUpdate: (analysis: FingerAnalysis | null) => void;
  onPinchStateChange: (isPinching: boolean, point: Point | null) => void;
  onFistStateChange: (isFist: boolean, point: Point | null) => void;
  onFpsUpdate: (fps: number) => void;
  onVideoReady?: (video: HTMLVideoElement | null) => void;
  onCameraInfoChange?: (info: CameraInfo) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function HandTracker({
  settings,
  onAnalysisUpdate,
  onPinchStateChange,
  onFistStateChange,
  onFpsUpdate,
  onVideoReady,
  onCameraInfoChange,
  canvasWidth,
  canvasHeight,
}: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMediaPipeReady, setIsMediaPipeReady] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing Spyder Vision Engine...');
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // PC/Laptop multi-camera device states
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState<boolean>(false);
  const [isInIframe] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    }
    return false;
  });
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

  // Stable references to prevent cascading effect updates
  const selectedDeviceIdRef = useRef<string>(selectedDeviceId);
  const onVideoReadyRef = useRef(onVideoReady);
  const onCameraInfoChangeRef = useRef(onCameraInfoChange);

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  useEffect(() => {
    onVideoReadyRef.current = onVideoReady;
  }, [onVideoReady]);

  useEffect(() => {
    onCameraInfoChangeRef.current = onCameraInfoChange;
  }, [onCameraInfoChange]);

  // MediaPipe references
  const handLandmarkerRef = useRef<any>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const fpsFramesRef = useRef<number[]>([]);

  // Virtual simulator state for testing without webcam
  const simMouseRef = useRef<{ x: number; y: number; isDown: boolean; isFist: boolean }>({
    x: 0.5,
    y: 0.5,
    isDown: false,
    isFist: false,
  });

  // 1. Draw futuristic "Spyder" Skeleton in Elegant Dark styling
  const drawSpyderSkeleton = useCallback(
    (canvas: HTMLCanvasElement, landmarks: Landmark[], analysis: FingerAnalysis) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      const toScreen = (pt: Landmark | Point): Point => ({
        x: (settings.mirrorCamera ? 1 - pt.x : pt.x) * w,
        y: pt.y * h,
      });

      const isPinch = analysis.isPinching;
      const isFist = analysis.isFist;

      const activeBrushColor = settings.color || '#6366f1';

      // Elegant Dark colors: Selected brush color when pinching, Crimson alert on fist
      const boneColor = isFist
        ? 'rgba(239, 68, 68, 0.7)'
        : isPinch
        ? activeBrushColor
        : 'rgba(99, 102, 241, 0.4)'; // Subtle Indigo

      const jointColor = isFist ? '#ef4444' : isPinch ? activeBrushColor : '#6366f1';

      // 1. Draw connecting bones
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
        const p1 = toScreen(landmarks[startIndex]);
        const p2 = toScreen(landmarks[endIndex]);

        ctx.strokeStyle = boneColor;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw 21 joints
      landmarks.forEach((landmark, idx) => {
        const pt = toScreen(landmark);
        const isTip = [4, 8, 12, 16, 20].includes(idx);
        const isThumbOrIndexTip = idx === 4 || idx === 8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isThumbOrIndexTip ? 5.5 : isTip ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isThumbOrIndexTip
          ? isPinch
            ? activeBrushColor
            : '#818cf8'
          : jointColor;
        ctx.fill();

        // Glowing targeting ring on thumb/index tips
        if (isThumbOrIndexTip) {
          ctx.strokeStyle = isPinch ? activeBrushColor : 'rgba(99, 102, 241, 0.5)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isPinch ? 11 : 7, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 3. Dynamic Pinch Laser & Target Reticle
      const thumbPt = toScreen(landmarks[HAND_LANDMARKS.THUMB_TIP]);
      const indexPt = toScreen(landmarks[HAND_LANDMARKS.INDEX_TIP]);
      const midPt = toScreen(analysis.pinchMidpoint);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(thumbPt.x, thumbPt.y);
      ctx.lineTo(indexPt.x, indexPt.y);

      if (isPinch) {
        // Vibrant laser beam matching selected color
        ctx.strokeStyle = activeBrushColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = activeBrushColor;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Crosshair reticle at midpoint
        ctx.strokeStyle = activeBrushColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(midPt.x, midPt.y, 14, 0, Math.PI * 2);
        ctx.moveTo(midPt.x - 20, midPt.y);
        ctx.lineTo(midPt.x + 20, midPt.y);
        ctx.moveTo(midPt.x, midPt.y - 20);
        ctx.lineTo(midPt.x, midPt.y + 20);
        ctx.stroke();

        // "PINCH TO DRAW" label
        ctx.fillStyle = activeBrushColor;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PINCH TO DRAW', midPt.x, midPt.y - 24);
      } else {
        // Subtle proximity dashed guide
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Distance in px
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${analysis.pinchDistancePx}px`, midPt.x, midPt.y - 10);
      }
      ctx.restore();

      // 4. Fist Aura if clenched
      if (isFist) {
        const palmCenter = toScreen(landmarks[HAND_LANDMARKS.MIDDLE_MCP]);
        const eraserRadius = settings.eraserSize || 44;
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(palmCenter.x, palmCenter.y, eraserRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`PRECISION ERASER (${eraserRadius}px)`, palmCenter.x, palmCenter.y - eraserRadius - 8);
        ctx.restore();
      }
    },
    [settings.mirrorCamera, settings.color, settings.eraserSize]
  );

  // 2. Simulator Mode frame handler
  const handleSimulatorFrame = useCallback(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const m = simMouseRef.current;
    const isPinch = m.isDown && !m.isFist;
    const isFist = m.isFist;

    const mx = m.x;
    const my = m.y;
    const pinchGap = isPinch ? 0.015 : 0.06;
    const fingerFold = isFist ? 0.03 : 0.09;

    const syntheticLandmarks: Landmark[] = [
      { x: mx, y: my + 0.12, z: 0 },
      { x: mx - 0.05, y: my + 0.07, z: 0 },
      { x: mx - 0.06, y: my + 0.04, z: 0 },
      { x: mx - 0.05, y: my + 0.01, z: 0 },
      { x: mx - (isPinch ? 0.01 : 0.035), y: my + (isPinch ? 0.005 : -0.01), z: 0 },
      { x: mx - 0.02, y: my + 0.03, z: 0 },
      { x: mx - 0.02, y: my - 0.02, z: 0 },
      { x: mx - 0.015, y: my - 0.05, z: 0 },
      { x: mx + (isPinch ? 0.01 : 0.02), y: my + (isPinch ? 0.005 : -0.07), z: 0 },
      { x: mx, y: my + 0.03, z: 0 },
      { x: mx, y: my - 0.02, z: 0 },
      { x: mx, y: my - 0.05, z: 0 },
      { x: mx, y: my - fingerFold, z: 0 },
      { x: mx + 0.02, y: my + 0.035, z: 0 },
      { x: mx + 0.02, y: my - 0.015, z: 0 },
      { x: mx + 0.02, y: my - 0.045, z: 0 },
      { x: mx + 0.02, y: my - fingerFold, z: 0 },
      { x: mx + 0.04, y: my + 0.045, z: 0 },
      { x: mx + 0.04, y: my, z: 0 },
      { x: mx + 0.04, y: my - 0.03, z: 0 },
      { x: mx + 0.04, y: my - (fingerFold - 0.01), z: 0 },
    ];

    const syntheticAnalysis: FingerAnalysis = {
      gesture: isFist ? 'FIST' : isPinch ? 'PINCH' : 'OPEN_PALM',
      isPinching: isPinch,
      pinchDistance: Number(pinchGap.toFixed(3)),
      pinchDistancePx: Math.round(pinchGap * canvas.width),
      pinchMidpoint: { x: mx, y: my },
      isFist,
      fistConfidence: isFist ? 0.95 : 0.1,
      fingerStates: {
        thumb: { extended: !isFist && !isPinch, curl: isFist ? 0.9 : 0.2 },
        index: { extended: !isFist, curl: isFist ? 0.95 : 0.15 },
        middle: { extended: !isFist, curl: isFist ? 0.95 : 0.1 },
        ring: { extended: !isFist, curl: isFist ? 0.95 : 0.1 },
        pinky: { extended: !isFist, curl: isFist ? 0.95 : 0.1 },
      },
      handSpread: isFist ? 0.2 : 0.85,
      handedness: 'Right',
      handConfidence: 0.98,
    };

    onAnalysisUpdate(syntheticAnalysis);
    onPinchStateChange(isPinch, { x: mx, y: my });
    onFistStateChange(isFist, { x: mx, y: my });
    onFpsUpdate(60);

    drawSpyderSkeleton(canvas, syntheticLandmarks, syntheticAnalysis);
  }, [drawSpyderSkeleton, onAnalysisUpdate, onPinchStateChange, onFistStateChange, onFpsUpdate]);

  // 3. Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        const visionTasks = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, HandLandmarker } = visionTasks;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isCancelled) return;

        handLandmarkerRef.current = handLandmarker;
        setIsMediaPipeReady(true);
        setLoadingStatus('Spyder Vision Engine Ready');
      } catch (err: any) {
        console.warn('GPU delegate failed, retrying with CPU...', err);
        try {
          const visionTasks = await import('@mediapipe/tasks-vision');
          const { FilesetResolver, HandLandmarker } = visionTasks;
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
          const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
          });
          handLandmarkerRef.current = handLandmarker;
          setIsMediaPipeReady(true);
          setLoadingStatus('Spyder Vision Engine Ready (CPU)');
        } catch (e: any) {
          console.error('Fatal MediaPipe initialization error:', e);
          setLoadingStatus('MediaPipe load failed. Fallback simulation available.');
          setIsSimulatorMode(true);
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (handLandmarkerRef.current) {
        try {
          handLandmarkerRef.current.close?.();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // 4. Robust Camera Stream Initializer for Laptop & PC Cameras
  const startCamera = useCallback(
    async (targetDeviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error');
        setErrorMessage('Browser does not support webcam mediaDevices API.');
        setIsSimulatorMode(true);
        return;
      }

      setCameraState('requesting');
      setLoadingStatus('Connecting to PC / Laptop Webcam...');

      const deviceIdToUse = targetDeviceId || selectedDeviceIdRef.current;
      const isMobile =
        typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

      // Device constraints:
      // Note: We deliberately avoid strict facingMode: 'user' on PC/laptops, as desktop webcams throw OverconstrainedError
      const baseConstraints: MediaTrackConstraints = deviceIdToUse
        ? { deviceId: { exact: deviceIdToUse } }
        : isMobile
        ? { facingMode: 'user' }
        : {};

      let stream: MediaStream | null = null;

      // Tier 1: HD 720p (Ideal for modern PC & laptop webcams)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...baseConstraints,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1: any) {
        console.warn('Tier 1 HD constraints failed, falling back to Tier 2 SD 640x480:', err1);
        // Tier 2: SD 640x480 (Ideal for built-in low-res webcams)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...baseConstraints,
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch (err2: any) {
          console.warn('Tier 2 SD constraints failed, falling back to Tier 3 universal video: true:', err2);
          // Tier 3: Universal fallback (Guaranteed compatibility across any PC camera or virtual source)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: deviceIdToUse ? { deviceId: { exact: deviceIdToUse } } : true,
              audio: false,
            });
          } catch (fatalErr: any) {
            console.error('All camera initialization tiers failed:', fatalErr);
            setCameraState('denied');

            if (fatalErr.name === 'NotAllowedError' || fatalErr.name === 'PermissionDeniedError') {
              setErrorMessage(
                'Camera access was blocked. Please grant browser camera permissions or launch in a dedicated tab.'
              );
            } else if (fatalErr.name === 'NotFoundError' || fatalErr.name === 'DevicesNotFoundError') {
              setErrorMessage(
                'No webcam was detected. Please verify your PC webcam or laptop camera is connected and unmuted.'
              );
            } else if (fatalErr.name === 'NotReadableError' || fatalErr.name === 'TrackStartError') {
              setErrorMessage(
                'Camera is currently occupied by another program (e.g., Zoom, Microsoft Teams, OBS, or Skype).'
              );
            } else if (fatalErr.name === 'OverconstrainedError') {
              setErrorMessage('Hardware resolution constraints could not be satisfied by this webcam.');
            } else {
              setErrorMessage(`Webcam connection failed: ${fatalErr.message || fatalErr.name}`);
            }

            setShowSetupModal(true);
            setIsSimulatorMode(true);
            return;
          }
        }
      }

      if (!stream) return;

      // Bind stream to video element
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => {
              setCameraState('active');
              setIsSimulatorMode(false);
              setShowSetupModal(false);
              onVideoReadyRef.current?.(video);
            })
            .catch((err) => {
              console.error('Error playing video:', err);
            });
        };
      }

      // Enumerate all available PC and laptop camera devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices((prev) => {
          if (
            prev.length === videoInputs.length &&
            prev.every((p, idx) => p.deviceId === videoInputs[idx]?.deviceId && p.label === videoInputs[idx]?.label)
          ) {
            return prev;
          }
          return videoInputs;
        });

        const currentTrack = stream.getVideoTracks()[0];
        const trackSettings = currentTrack?.getSettings?.();
        if (trackSettings?.deviceId) {
          selectedDeviceIdRef.current = trackSettings.deviceId;
          setSelectedDeviceId((prev) => (prev === trackSettings.deviceId ? prev : trackSettings.deviceId!));
        }
        const nextLabel =
          currentTrack?.label ||
          (videoInputs.length > 0 ? videoInputs[0].label || 'PC/Laptop Webcam' : 'PC Webcam');
        setActiveCameraLabel((prev) => (prev === nextLabel ? prev : nextLabel));
      } catch (enumErr) {
        console.warn('Device enumeration error:', enumErr);
      }
    },
    []
  );

  // Handle switching to a specific PC webcam device
  const handleSelectCameraDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      selectedDeviceIdRef.current = deviceId;
      setIsDeviceMenuOpen(false);

      // Stop current track before switching to prevent hardware lock
      if (videoRef.current?.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((track) => track.stop());
      }

      startCamera(deviceId);
    },
    [startCamera]
  );

  // Stop camera hardware and switch cleanly to simulator
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      currentStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    const canvas = skeletonCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onVideoReadyRef.current?.(null);
    onAnalysisUpdate(null);
    onPinchStateChange(false, null);
    onFistStateChange(false, null);

    setCameraState('idle');
    setIsSimulatorMode(true);
    setLoadingStatus('Camera turned off (Simulator active)');
  }, [onAnalysisUpdate, onPinchStateChange, onFistStateChange]);

  // Toggle camera between active and off
  const toggleCamera = useCallback(() => {
    if (cameraState === 'active' || cameraState === 'requesting') {
      stopCamera();
    } else {
      setIsSimulatorMode(false);
      startCamera();
    }
  }, [cameraState, stopCamera, startCamera]);

  // Sync camera hardware with settings.cameraEnabled if toggled externally
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (isCancelled) return;
      if (settings.cameraEnabled === false && cameraState === 'active') {
        stopCamera();
      } else if (settings.cameraEnabled === true && cameraState === 'idle') {
        setIsSimulatorMode(false);
        startCamera();
      }
    }, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [settings.cameraEnabled, cameraState, stopCamera, startCamera]);

  // Mount effect to start camera or listen for hardware changes
  useEffect(() => {
    const videoNode = videoRef.current;
    let isCancelled = false;

    // Asynchronously trigger camera start to avoid cascading synchronous render warning
    const timer = setTimeout(() => {
      if (!isCancelled) {
        if (settings.cameraEnabled !== false) {
          startCamera();
        } else {
          setIsSimulatorMode(true);
        }
      }
    }, 0);

    const handleDeviceChange = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices((prev) => {
            if (
              prev.length === videoInputs.length &&
              prev.every((p, idx) => p.deviceId === videoInputs[idx]?.deviceId && p.label === videoInputs[idx]?.label)
            ) {
              return prev;
            }
            return videoInputs;
          });
        }
      } catch {
        // ignore
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      if (videoNode?.srcObject) {
        const currentStream = videoNode.srcObject as MediaStream;
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [retryTrigger, startCamera, settings.cameraEnabled]);

  // Notify parent component of camera diagnostics & switcher controls
  useEffect(() => {
    onCameraInfoChangeRef.current?.({
      state: cameraState,
      errorMessage,
      activeLabel: activeCameraLabel,
      isSimulator: isSimulatorMode,
      devices: availableDevices,
      selectedDeviceId,
      selectDevice: handleSelectCameraDevice,
      startCamera: (targetId?: string) => {
        setIsSimulatorMode(false);
        startCamera(targetId);
      },
      stopCamera,
      toggleCamera,
      openSetupModal: () => setShowSetupModal(true),
    });
  }, [
    cameraState,
    errorMessage,
    activeCameraLabel,
    isSimulatorMode,
    availableDevices,
    selectedDeviceId,
    handleSelectCameraDevice,
    startCamera,
    stopCamera,
    toggleCamera,
  ]);

  // 5. Main Vision Detection & Skeleton Rendering Loop
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = skeletonCanvasRef.current;
      const landmarker = handLandmarkerRef.current;

      // Handle Simulator Mode
      if (isSimulatorMode) {
        handleSimulatorFrame();
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      if (
        !video ||
        !canvas ||
        !landmarker ||
        cameraState !== 'active' ||
        video.readyState < 2
      ) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Calculate FPS
      const now = performance.now();
      fpsFramesRef.current.push(now);
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] < now - 1000) {
        fpsFramesRef.current.shift();
      }
      onFpsUpdate(fpsFramesRef.current.length);

      // Perform Hand Landmark Detection
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const results = landmarker.detectForVideo(video, now);

          if (results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks: Landmark[] = results.landmarks[0];
            const handednessStr = results.handednesses?.[0]?.[0]?.categoryName ?? 'Unknown';
            const handConfidence = results.handednesses?.[0]?.[0]?.score ?? 0.96;

            const analysis = analyzeHandLandmarks(
              rawLandmarks,
              canvas.width,
              canvas.height,
              {
                pinchThreshold: settings.pinchThreshold,
                fistThreshold: settings.fistThreshold,
                handedness: handednessStr as 'Left' | 'Right',
                handConfidence,
              }
            );

            onAnalysisUpdate(analysis);
            onPinchStateChange(analysis.isPinching, analysis.pinchMidpoint);
            onFistStateChange(analysis.isFist, rawLandmarks[HAND_LANDMARKS.MIDDLE_MCP]);

            if (settings.showSkeleton) {
              drawSpyderSkeleton(canvas, rawLandmarks, analysis);
            } else {
              const ctx = canvas.getContext('2d');
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
          } else {
            // No hand detected in frame
            onAnalysisUpdate(null);
            onPinchStateChange(false, null);
            onFistStateChange(false, null);

            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
          }
        } catch (detectionErr) {
          console.warn('Hand detection error in frame:', detectionErr);
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isSimulatorMode,
    cameraState,
    settings,
    onAnalysisUpdate,
    onPinchStateChange,
    onFistStateChange,
    onFpsUpdate,
    drawSpyderSkeleton,
    handleSimulatorFrame,
  ]);

  // Mouse / Touch handlers for Simulator Mode
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSimulatorMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    simMouseRef.current.x = settings.mirrorCamera ? 1 - x : x;
    simMouseRef.current.y = y;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSimulatorMode) return;
    if (e.button === 2) {
      simMouseRef.current.isFist = true;
    } else {
      simMouseRef.current.isDown = true;
      simMouseRef.current.isFist = false;
    }
  };

  const handlePointerUp = () => {
    if (!isSimulatorMode) return;
    simMouseRef.current.isDown = false;
    simMouseRef.current.isFist = false;
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => {
        if (isSimulatorMode) e.preventDefault();
      }}
    >
      {/* Elegant Dark Background Canvas */}
      <div className="absolute inset-0 bg-[#0A0A0A]">
        {/* Video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            settings.mirrorCamera ? '-scale-x-100' : ''
          } ${
            isSimulatorMode
              ? 'opacity-15'
              : settings.backgroundMode === 'camera_dimmed'
              ? 'opacity-35'
              : settings.backgroundMode === 'dark' || settings.backgroundMode === 'light'
              ? 'opacity-0'
              : 'opacity-95'
          }`}
        />

        {/* Elegant Dark Radial gradient backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)] opacity-40 pointer-events-none" />

        {/* Studio chalkboard or whiteboard backdrop */}
        {settings.backgroundMode === 'dark' && (
          <div className="absolute inset-0 bg-[#0A0A0A]" />
        )}
        {settings.backgroundMode === 'light' && (
          <div className="absolute inset-0 bg-slate-900" />
        )}
      </div>

      {/* Futuristic skeleton & HUD layer */}
      <canvas
        ref={skeletonCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Top PC/Laptop Camera Status Hub & Device Switcher (Fallback if not rendered by parent) */}
      {!onCameraInfoChange && (
        <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2">
          {/* Active Camera Badge or Connect Trigger */}
          {cameraState === 'active' && !isSimulatorMode ? (
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-2 bg-[#0F0F0F]/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white/90 shadow-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium truncate max-w-40 sm:max-w-64">
                  {activeCameraLabel || 'PC Camera Active'}
                </span>

                {/* Multi-device selector dropdown trigger */}
                {availableDevices.length > 1 && (
                  <button
                    id="camera-device-dropdown-btn"
                    onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
                    className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                    title="Switch PC Camera Device"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isDeviceMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}

                {/* Turn Off Camera Action Button */}
                <button
                  id="standalone-turn-off-cam-btn"
                  onClick={stopCamera}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-bold border border-red-500/30 transition cursor-pointer ml-1"
                  title="Turn Off Camera"
                >
                  <VideoOff className="w-3 h-3 text-red-300" />
                  <span>Turn Off</span>
                </button>
              </div>

              {/* Device Switcher Dropdown Menu */}
              {isDeviceMenuOpen && availableDevices.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/15 rounded-xl p-2 shadow-2xl z-50 text-xs text-[#E0E0E0] space-y-1 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-mono text-white/40 uppercase px-2 py-1 tracking-wider border-b border-white/10 flex items-center justify-between">
                    <span>Detected Cameras</span>
                    <Laptop className="w-3 h-3 text-indigo-400" />
                  </div>
                  {availableDevices.map((dev, idx) => {
                    const isCur = dev.deviceId === selectedDeviceId;
                    return (
                      <button
                        key={dev.deviceId || idx}
                        id={`switch-camera-${idx}`}
                        onClick={() => handleSelectCameraDevice(dev.deviceId)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                          isCur
                            ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        <span className="truncate">{dev.label || `Camera ${idx + 1}`}</span>
                        {isCur && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* When Camera is Inactive or Simulator is Active */
            <div className="flex items-center gap-2">
              <button
                id="connect-pc-camera-btn"
                onClick={() => {
                  setIsSimulatorMode(false);
                  startCamera();
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition cursor-pointer"
                title="Connect PC/Laptop Camera"
              >
                <Camera className="w-3.5 h-3.5 animate-pulse" />
                <span>Connect PC Camera</span>
              </button>

              <button
                id="camera-setup-help-btn"
                onClick={() => setShowSetupModal(true)}
                className="flex items-center gap-1.5 bg-[#0F0F0F]/80 hover:bg-white/10 text-white/70 hover:text-white px-2.5 py-1.5 rounded-full text-xs border border-white/10 transition cursor-pointer backdrop-blur-md"
                title="Camera Troubleshooting & Setup"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Camera Setup</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Simulator Mode Bar (Visible when in Simulator Mode) */}
      {isSimulatorMode && (
        <div className="absolute top-14 left-4 z-30 flex items-center gap-2.5 bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white/80 shadow-2xl">
          <MousePointer2 className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>Mouse Simulator: Drag to <b>Draw</b> • Right-Click to <b>Erase</b></span>
          {cameraState !== 'active' && (
            <button
              id="simulator-turn-on-camera-btn"
              onClick={() => toggleCamera()}
              className="ml-1 px-2.5 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md"
              title="Turn On Camera"
            >
              <Video className="w-3 h-3" />
              <span>Turn On Camera</span>
            </button>
          )}
        </div>
      )}

      {/* PC & Laptop Camera Setup & Troubleshooting Modal */}
      {showSetupModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0F0F0F] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-[#E0E0E0] space-y-4 relative">
            {/* Close modal button */}
            <button
              id="close-camera-modal-btn"
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  PC & Laptop Camera Setup
                </h3>
                <p className="text-[11px] text-white/50">
                  Enable your webcam for real-time hand & finger tracking
                </p>
              </div>
            </div>

            {/* Error diagnostic banner if permission failed */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-red-200">Status Notice:</span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Steps & Guidance for PC Users */}
            <div className="space-y-2 text-xs text-white/70">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Grant Browser Camera Permission
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed pl-5.5">
                  Click the <b>Lock (🔒) or Camera icon</b> on the left of your browser address bar in Chrome or Edge, then set <b>Camera</b> to <b>Allow</b>.
                </p>
              </div>

              {isInIframe && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                      2
                    </span>
                    Open in a Dedicated Window
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed pl-5.5">
                    Inside sandboxed preview frames, desktop browsers may restrict hardware webcam access. Opening the app in a new tab allows direct hardware acceleration.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  Release Other Apps
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed pl-5.5">
                  Ensure no other desktop app (e.g. Zoom, Teams, Skype, OBS) is currently locking your webcam.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                id="modal-connect-cam-btn"
                onClick={() => {
                  setShowSetupModal(false);
                  setIsSimulatorMode(false);
                  startCamera();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/30"
              >
                <Camera className="w-4 h-4" /> Connect PC Camera Now
              </button>

              {/* Open in New Tab Button (Essential for PC users in iframe preview) */}
              <button
                type="button"
                id="open-in-new-tab-cam-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(window.location.href, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <ExternalLink className="w-4 h-4 text-indigo-400" /> Open App in Full Tab (Recommended for PC)
              </button>

              <button
                id="modal-continue-simulator-btn"
                onClick={() => {
                  setShowSetupModal(false);
                  setIsSimulatorMode(true);
                }}
                className="w-full py-2 px-4 text-white/50 hover:text-white/80 text-xs transition cursor-pointer text-center"
              >
                Continue with Mouse / Trackpad Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MediaPipe Engine Loading State */}
      {!isMediaPipeReady && !isSimulatorMode && cameraState === 'active' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 bg-[#0F0F0F]/90 border border-indigo-500/30 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl text-xs text-indigo-300">
          <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="font-mono">{loadingStatus}</span>
        </div>
      )}
    </div>
  );
}
