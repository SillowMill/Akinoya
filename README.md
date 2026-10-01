<div align="center">

# SILLOW MILL — ÄKINOYA

**An interactive VIP portal for the upcoming Äkinoya novel by Sillow Mill.**

*Coming 2027*

</div>

---

## Overview

This is the official web portal for **Äkinoya** — a science-fiction novel by Sillow Mill set on the ice-world planet Äkinoya. The portal features:

- 🌌 **Immersive planetary backdrop** — animated cosmic canvas with twinkling particles
- 🔐 **VIP access gate** — code-locked entry for archive holders
- 🃏 **Holographic VIP Pass** — 3D tilt-reactive collector's pass card
- 📖 **Lore reader** — exclusive prologue excerpt for code entrants
- 🎧 **Atmospheric audio** — Web Audio API sound design for portal events
- 📱 **Fully responsive** — optimised for mobile and desktop

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** (build tool)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Motion** (Framer Motion successor — animations)
- **Lucide React** (icons)
- **canvas-confetti** (celebratory particle burst)
- **Web Audio API** (procedural sound effects)

## Getting Started

**Prerequisites:** Node.js ≥ 18 or Bun

### 1. Clone the repository

```bash
git clone https://github.com/SillowMill/Akinoya.git
cd Akinoya
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment

Copy the example env file and add your Gemini API key (required for AI features):

```bash
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key_here
```

### 4. Run locally

```bash
npm run dev
# App runs at http://localhost:3000
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type-check |
| `npm run clean` | Remove build artifacts |

## Access Code

The portal is protected by a VIP access code. Holders of the Äkinoya book can find their code on the back cover.

---

<div align="center">

© 2027 Sillow Mill · All Rights Reserved · ÄKINOYA LIVE PROTOCOL

</div>
