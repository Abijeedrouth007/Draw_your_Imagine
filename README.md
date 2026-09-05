# Spyder Air Canvas 🖐️✨

> A real-time, browser-based hand-gesture air drawing studio powered by computer vision and MediaPipe. Draw, sketch, and erase directly in mid-air using your webcam or trackpad with zero extra hardware.

---

## 🌟 Key Features

- **Pinch-to-Draw**: Natural index-and-thumb pinch gesture detection with sub-pixel smoothing for fluid lines and curves.
- **Precision Fist Eraser**: Clench your hand into a fist to deploy a circular eraser reticle. Rather than wiping the canvas, it splits and trims only the vector strokes you sweep across.
- **Hardware Privacy Controls**: One-click camera on/off button and a keyboard shortcut (`C`) to halt webcam streams instantly and release camera hardware.
- **Mouse & Trackpad Simulator**: Automatic fallback when your webcam is unavailable or switched off. Drag to pinch-draw and right-click or hold to erase.
- **Creative Rendering Modes**:
  - **Styles**: Solid Pen, Neon Glow, and Translucent Watercolor.
  - **Brushes**: Fine (3px), Medium (7px), Bold (14px), and Heavy (24px).
  - **Eraser Sizes**: Small (24px), Medium (44px), and Large (70px).
  - **Color Palette**: Cyberpunk Neon, Natural Pastels, and Monochrome presets with a custom hex picker.
  - **Canvas Backdrops**: Live Video Feed, Dimmed Video (high-contrast drawing), Dark Studio, or Crisp Light.
- **High-Resolution Export**: Download your creations as high-resolution PNGs, with the option to include or exclude the camera background.
- **Non-Destructive History**: Full multi-step Undo (`Ctrl+Z` / `⌘Z`) and Redo (`Ctrl+Y` / `⌘Y`).

---

## 📱 How to Use This on Your Devices

Spyder Air Canvas works directly inside modern web browsers that support WebRTC camera access (`getUserMedia`) and WebAssembly.

### 1. 💻 On Laptops & Desktop PCs (Recommended)

1. **Open the App**: Launch the application in Google Chrome, Microsoft Edge, Brave, or Safari.
2. **Grant Webcam Permission**: When prompted by your browser, click **Allow** to give the studio access to your camera.
3. **Lighting & Distance Setup**:
   - Sit **1.5 to 3 feet** away from your webcam.
   - Make sure your face and hands are lit from the front. Avoid harsh backlights or bright windows directly behind you.
4. **Gesture Controls**:
   - **Pinch (Thumb + Index)**: Bring your thumb and index finger close together to start drawing. Release to stop.
   - **Fist (Clench all fingers)**: Make a tight fist to bring up the crimson precision eraser. Move your fist over any stroke you want to erase.
   - **Open Hand / Palm**: Freely navigate or hover without leaving marks.
5. **Keyboard Shortcuts**:
   - `C` — Turn camera On / Off instantly.
   - `Ctrl + Z` / `⌘ + Z` — Undo previous stroke or erase action.
   - `Ctrl + Y` / `⌘ + Y` — Redo undone action.
   - `O` — Toggle Studio Options panel.
   - `F` — Toggle Fullscreen mode.
   - `Esc` — Close overlays or exit options.

> **Tip for Multiple Cameras:** If you have an external USB webcam, use the camera selector dropdown in the top toolbar to switch between cameras instantly.

---

### 2. 📱 On Tablets & Mobile Phones (iPad, iPhone, Android)

1. **Browser**: Open the application URL in **Safari** (iOS/iPadOS) or **Chrome** (Android).
2. **Camera Permission**: Tap **Allow** when requested.
3. **Device Positioning**:
   - Prop your tablet or phone up on a stand or desk at chest/eye level.
   - Step back **1.5 to 2.5 feet** so your full hand is within the camera frame.
4. **Mirroring**: Ensure the **Mirror Camera** toggle is active so movements feel intuitive (like looking into a mirror).
5. **Direct Touch Fallback**: On tablets with touchscreens or styluses (like Apple Pencil), you can also turn off the camera (`Cam Off`) and sketch directly using the touch/mouse simulator.

---

### 3. 🖱️ Using Without a Camera (Simulator Mode)

If you are in an environment where you cannot use a camera, or on a device without one:
1. Click the **Cam On** button in the toolbar (or press `C`) to turn off the camera.
2. The studio automatically activates **Mouse / Trackpad Simulator Mode**:
   - **Left-Click & Drag**: Simulates the pinch gesture to draw.
   - **Right-Click & Drag** (or clench shortcut): Simulates the fist gesture to erase.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Computer Vision**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) (WebAssembly / GPU accelerated HandLandmarker)
- **Canvas Engine**: Custom HTML5 2D Canvas with sub-pixel interpolation and swept capsule distance algorithms for precise vector splitting.
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18.x or 20.x+
- npm, pnpm, or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/spyder-air-canvas.git
   cd spyder-air-canvas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Open [http://localhost:3000](http://localhost:3000) in Google Chrome or your preferred browser.

5. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🔒 Privacy & Security

- **100% Client-Side Processing**: Hand landmark detection runs entirely on your local device using WebAssembly and WebGL.
- **Zero Video Uploads**: Video frames never leave your browser and are not transmitted to any remote server or stored in any database.
- **Immediate Hardware Release**: Clicking **Turn Off** stops all active video tracks immediately, extinguishing your device's webcam indicator light.

---

## 📄 License

Distributed under the MIT License. Feel free to use, modify, and build upon this project.
