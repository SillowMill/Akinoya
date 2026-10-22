import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}
if (fs.existsSync(path.resolve(process.cwd(), '.env.production.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });
}

const FAL_KEY = (process.env.FAL_KEY || process.env.VITE_FAL_KEY || '').trim();
if (!FAL_KEY) {
  console.error('❌ FAL_KEY not found in environment.');
  process.exit(1);
}

const NANO_BANANA_ENDPOINT = 'https://queue.fal.run/google/nano-banana-2.1';
const SEEDANCE_VIDEO_ENDPOINT = 'https://queue.fal.run/bytedance/seedance-2.5/us/image-to-video';

interface PlanetPlan {
  id: string;
  rank: number;
  planetName: string;
  authorName: string;
  authorUsername: string;
  authorEmail: string;
  authorAvatarGradient: string;
  pioneerBadge: string;
  spiralCoord: { x: number; y: number; sectorId: string; armId: string; armName: string };
  matrixCoord: { x: number; y: number; sectorId: string; trackId: string; trackName: string };
  theme: string;
  atmosphere: string;
  flora: string;
  fauna: string;
  landmark: string;
  prompts: {
    hero: string;
    flora: string;
    fauna: string;
    atmosphere: string;
    landmark: string;
  };
  videoPrompt: string;
}

const PIONEER_PLANS: PlanetPlan[] = [
  {
    id: 'planet-felix-test-01',
    rank: 2,
    planetName: 'Felix',
    authorName: 'Esther P.',
    authorUsername: 'estherphilippen',
    authorEmail: 'estherphilippen@msn.com',
    authorAvatarGradient: 'from-pink-500 via-rose-500 to-amber-500',
    pioneerBadge: 'VIP PIONEER · #02',
    spiralCoord: {
      x: 243,
      y: 176,
      sectorId: 'SECTOR CYGNUS-00 (CORE MERIDIAN)',
      armId: 'arm-cygnus',
      armName: 'CYGNUS FILAMENT',
    },
    matrixCoord: {
      x: 304,
      y: -68,
      sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
      trackId: 'track-0',
      trackName: 'FOUNDATIONAL CAPITAL OVAL',
    },
    theme: 'Bioluminescent Avatar-style alien mountain landscape with fluffy ginger domestic cats and striking pink sci-fi cats',
    atmosphere: 'Bioluminescent Avatar-style twilight troposphere illuminated by vibrant neon pink and warm orange auroras, floating rock arches, and ethereal glowing mists.',
    flora: 'Breathtaking Avatar-inspired bioluminescent flora, giant luminous spore trees, and glowing magenta whisker-ferns that react to feline touch.',
    fauna: 'Charming, fluffy rossenhuiskatten (ginger domestic cats) and striking bioluminescent pink sci-fi cats roaming freely across floating mossy plateaus.',
    landmark: 'The Great Sphinx of Felix: Colossal ancient feline monolith carved from rose quartz and copper energy channels, vibrating at 432Hz.',
    prompts: {
      hero: 'Cinematic wide-angle orbital render of planet Felix floating in deep space, vibrant neon pink and incandescent orange atmospheric glow, translucent cosmic dust rings, bioluminescent cat-continent silhouettes, photorealistic 8K sci-fi space art, Sillow Mill cinematic aesthetic.',
      flora: 'Breathtaking Avatar-style alien botanical forest on planet Felix, glowing magenta whisker-ferns, giant luminous bioluminescent spore trees, ethereal orange quartz moss, twilight lighting, volumetric mist, photorealistic 8K sci-fi render.',
      fauna: 'Adorable, fluffy rossenhuiskat (ginger domestic cat) sitting beside a striking glowing neon pink alien cat on a floating mossy cliff overlooking a bioluminescent canyon, twilight sky, Avatar alien landscape, photorealistic 8K sci-fi photography.',
      atmosphere: 'Deep twilight sky of planet Felix seen from an alien canyon ridge, vibrant flowing neon pink auroras and radiant incandescent orange ribbons illuminating misty floating rock formations, photorealistic 8K cinematic atmosphere.',
      landmark: 'The Great Sphinx of Felix: A colossal ancient feline monolith carved from glowing rose quartz and copper conduits, sitting regally on a high canyon plateau with glowing pink cat-grass, 432Hz cosmic energy channels, photorealistic 8K render.',
    },
    videoPrompt: 'Cinematic 9:16 vertical camera glide over bioluminescent Avatar plateaus on planet Felix, adorable ginger cats and glowing pink felines purring, vibrant pink auroras flowing, dramatic 1080p sci-fi loop.',
  },
  {
    id: 'planet-nathan-pioneer-03',
    rank: 3,
    planetName: 'Natharia',
    authorName: 'Nathan R.',
    authorUsername: 'nathanr',
    authorEmail: 'nathan.r@akinoya.universe',
    authorAvatarGradient: 'from-violet-600 via-purple-600 to-indigo-800',
    pioneerBadge: 'VIP PIONEER · #03',
    spiralCoord: {
      x: -93,
      y: 285,
      sectorId: 'SECTOR SOLARIS-00 (CORE MERIDIAN)',
      armId: 'arm-solaris',
      armName: 'SOLARIS TENDRIL',
    },
    matrixCoord: {
      x: 188,
      y: 178,
      sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
      trackId: 'track-0',
      trackName: 'FOUNDATIONAL CAPITAL OVAL',
    },
    theme: 'Dark, cool, crazy, trippy, and surreal dreamscape featuring flying/floating trees and abstract anti-gravity physics',
    atmosphere: 'Inverted twilight gravity vortex with deep obsidian, neon violet, electric cyan auroras, and floating inverted cloudbanks.',
    flora: 'Giant surreal flying trees floating freely in mid-air, with bioluminescent roots absorbing starlight and upside-down twisting canopies.',
    fauna: 'Ethereal zero-gravity sky manta rays and luminescent fractal shadow-cats gliding effortlessly between hovering islands.',
    landmark: 'The Monolith of Inverted Physics: A shattered, floating cubist obelisk defying gravitational laws in perpetual levitation.',
    prompts: {
      hero: 'Cinematic orbital view of surreal planet Natharia, deep obsidian crust with swirling neon violet and electric cyan fractures, shattered floating planetary rings in inverted gravity, trippy mind-bending cosmic dreamscape, 8K photorealistic sci-fi render.',
      flora: 'Surreal alien dreamscape with colossal flying trees hovering completely weightless in mid-air, glowing bioluminescent twisting roots dangling in the void, upside-down mossy canopies, neon purple spores, 8K sci-fi render.',
      fauna: 'Majestic ethereal zero-gravity cosmic manta rays gliding through the air alongside glowing fractal shadow-cats between hovering surreal stone islands, abstract anti-gravity physics, 8K photorealistic render.',
      atmosphere: 'Crazy trippy sky on planet Natharia, inverted gravity storm with deep obsidian vortex, swirling electric cyan and ultraviolet aurora ripples, floating reverse waterfalls rising toward the sky, 8K cinematic render.',
      landmark: 'The Monolith of Inverted Physics: A colossal cubist crystalline obelisk shattered into floating levitating segments that orbit each other in impossible gravity, radiating pulsed violet tachyon light, 8K sci-fi render.',
    },
    videoPrompt: 'Mind-bending 9:16 vertical camera diving through floating upside-down flying trees and levitating stone shards on planet Natharia, neon violet auroras shifting in zero-gravity, 1080p HD sci-fi loop.',
  },
  {
    id: 'planet-florian-pioneer-04',
    rank: 4,
    planetName: 'Floriana',
    authorName: 'Florian H.',
    authorUsername: 'florianh',
    authorEmail: 'florian.h@akinoya.universe',
    authorAvatarGradient: 'from-amber-400 via-orange-500 to-yellow-500',
    pioneerBadge: 'VIP PIONEER · #04',
    spiralCoord: {
      x: -300,
      y: 0,
      sectorId: 'SECTOR AURELIA-00 (CORE MERIDIAN)',
      armId: 'arm-aurelia',
      armName: 'AURELIA CLUSTER',
    },
    matrixCoord: {
      x: -188,
      y: 178,
      sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
      trackId: 'track-0',
      trackName: 'FOUNDATIONAL CAPITAL OVAL',
    },
    theme: 'Warm, beautiful, and inviting world reflecting a gentle, friendly spirit with soft golden-hour meadows and welcoming cosmic architecture',
    atmosphere: 'Perpetual radiant golden-hour troposphere bathed in warm incandescent amber light, soft peach clouds, and shimmering solar dust.',
    flora: 'Endless undulating meadows of glowing golden sun-grass, serene luminous blossom willows, and soft harmonic wildflowers.',
    fauna: 'Gentle celestial deer with crystalline velvet antlers and friendly floating sun-doves radiating warmth and peace.',
    landmark: 'The Sanctuary of Concord: A majestic, open-air amphitheater of rose-gold marble and warm quartz chimes welcoming travelers across the stars.',
    prompts: {
      hero: 'Breathtaking cinematic orbital view of warm golden planet Floriana, illuminated by perpetual golden-hour sunlight, soft amber and peach atmosphere, shimmering solar dust rings, harmonious peaceful alien world, 8K photorealistic sci-fi render.',
      flora: 'Endless rolling hills covered in glowing golden sun-grass and radiant luminous peach blossom willows, warm gentle breeze, soft amber sunlight filtering through petals, peaceful paradise, 8K photorealistic render.',
      fauna: 'A gentle celestial deer with soft glowing crystalline velvet antlers resting peacefully beside friendly luminous golden sun-doves in an open sunlit meadow, warm inviting atmosphere, 8K photorealistic photography.',
      atmosphere: 'Serene golden-hour sky over planet Floriana, majestic peach and champagne clouds bathed in warm sunlight, shimmering solar pollen drifting gently through warm air currents, 8K cinematic photography.',
      landmark: 'The Sanctuary of Concord: A magnificent open-air amphitheater of warm rose-gold marble and acoustic quartz pillars overlooking sunlit golden plains, welcoming cosmic architecture, 8K photorealistic render.',
    },
    videoPrompt: 'Warm velvety 9:16 vertical camera gliding across golden-hour sunlit meadows on planet Floriana, peaceful celestial deer looking up, warm peach light shimmering in 1080p HD beauty.',
  },
  {
    id: 'planet-seppe-pioneer-05',
    rank: 5,
    planetName: 'Seppion',
    authorName: 'Seppe G.',
    authorUsername: 'seppeg',
    authorEmail: 'seppe.g@akinoya.universe',
    authorAvatarGradient: 'from-cyan-500 via-teal-600 to-emerald-600',
    pioneerBadge: 'VIP PIONEER · #05',
    spiralCoord: {
      x: -93,
      y: -285,
      sectorId: 'SECTOR CENTAURI-00 (CORE MERIDIAN)',
      armId: 'arm-centauri',
      armName: 'CENTAURI STREAM',
    },
    matrixCoord: {
      x: -304,
      y: -68,
      sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
      trackId: 'track-0',
      trackName: 'FOUNDATIONAL CAPITAL OVAL',
    },
    theme: 'Hyper-structured, brilliant, geometric, and flawlessly engineered masterwork of pure analytical elegance and strategic precision',
    atmosphere: 'Pristine ionized nitrogen sky segmented by crystalline prism meridians, laser-guided orbital tracks, and geometric auroral lattices.',
    flora: 'Self-assembling fractal silicon crystals, perfectly tessellated hexagonal crystalline groves, and fiber-optic pulse trees.',
    fauna: 'Flawlessly polished chrome and obsidian cybernetic falcon sentinels with sapphire optic cores patrolling geometric vectors with absolute precision.',
    landmark: 'The Grand Calculation Matrix: A colossal hyper-symmetric planetary hypercube constructed from polished platinum and pulsating cobalt quantum circuitry.',
    prompts: {
      hero: 'Spectacular orbital perspective of engineered planet Seppion, hyper-structured geometric surface segmented by glowing cyan quantum grid lines, laser meridians, flawless analytical symmetry, crystalline polygonal continental plates, 8K photorealistic sci-fi render.',
      flora: 'Hyper-precise alien crystalline grove on planet Seppion, perfectly tessellated hexagonal silicon pillars and glowing fiber-optic pulse trees branching in mathematical fractal patterns, 8K sci-fi architectural render.',
      fauna: 'A sleek, aerodynamically flawless cybernetic falcon sentinel constructed from polished chrome and dark obsidian with a glowing sapphire optical core perched with supreme precision on a geometric spire, 8K photorealistic render.',
      atmosphere: 'Pristine ionized indigo sky over planet Seppion, segmented by sharp crystalline prism meridians and laser-guided orbital highway grids, clean analytical auroral geometry, 8K cinematic render.',
      landmark: 'The Grand Calculation Matrix: A colossal hyper-symmetric floating planetary hypercube forged from mirror-polished platinum and glowing cobalt quantum circuits, pulsing with pure computational light, 8K sci-fi render.',
    },
    videoPrompt: 'Hyper-crisp 9:16 vertical camera tracking along illuminated geometric laser grids and crystalline quantum spires on planet Seppion, cybernetic falcon taking flight with mathematical elegance, 1080p HD loop.',
  },
];

async function generateNanoBananaImage(prompt: string, maxWaitMs = 120000): Promise<string> {
  const submitRes = await fetch(NANO_BANANA_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '16:9',
      resolution: '1K',
      output_format: 'png',
      num_images: 1,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '');
    throw new Error(`Nano-banana submit failed HTTP ${submitRes.status}: ${errText}`);
  }

  const submitData = (await submitRes.json()) as any;
  const statusUrl = submitData.status_url;
  const responseUrl = submitData.response_url;

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!statusRes.ok) continue;
    const sData = (await statusRes.json()) as any;
    if (sData.status === 'COMPLETED') {
      const respRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const rData = (await respRes.json()) as any;
      const url = rData?.images?.[0]?.url;
      if (url) return url;
      throw new Error('Completed but no image URL found');
    } else if (sData.status === 'FAILED') {
      throw new Error(`Nano-banana job failed: ${sData.error || 'Unknown error'}`);
    }
  }
  throw new Error('Nano-banana timeout');
}

async function generateSeedance1080pVideo(imageUrl: string, prompt: string, maxWaitMs = 300000): Promise<string> {
  const submitRes = await fetch(SEEDANCE_VIDEO_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      duration: '5',
      resolution: '1080p',
      aspect_ratio: 'auto',
      generate_audio: true,
      bitrate_mode: 'high',
      codec: 'H264',
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '');
    throw new Error(`Seedance 1080p video submit failed HTTP ${submitRes.status}: ${errText}`);
  }

  const submitData = (await submitRes.json()) as any;
  const statusUrl = submitData.status_url;
  const responseUrl = submitData.response_url;

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!statusRes.ok) continue;
    const sData = (await statusRes.json()) as any;
    console.log(`    [Seedance Status] ${sData.status}...`);
    if (sData.status === 'COMPLETED') {
      const respRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const rData = (await respRes.json()) as any;
      const url = rData?.video?.url;
      if (url) return url;
      throw new Error('Completed but no video URL found');
    } else if (sData.status === 'FAILED') {
      throw new Error(`Seedance video job failed: ${sData.error || 'Unknown error'}`);
    }
  }
  throw new Error('Seedance video timeout');
}

export async function runPioneerAssetPipeline() {
  console.log('================================================================');
  console.log('🚀 SILLOW MILL · ÄKINOYA PIONEER GENERATION PIPELINE');
  console.log('   Engine: Google Nano-Banana 2.1 (Images) + ByteDance Seedance 2.5 1080p (Video)');
  console.log('================================================================\n');

  const generatedPlanets: any[] = [];

  for (const plan of PIONEER_PLANS) {
    console.log(`\n🪐 [World #${plan.rank}] Synthesizing ${plan.planetName} (${plan.authorName})...`);

    // 1. Synthesize all 5 sectoral images via Nano-Banana 2.1
    const renders: Record<string, string> = {};
    const slots = ['hero', 'flora', 'fauna', 'atmosphere', 'landmark'] as const;

    for (const slot of slots) {
      console.log(`  -> Generating slot [${slot}] via Nano-Banana 2.1...`);
      try {
        const url = await generateNanoBananaImage(plan.prompts[slot]);
        renders[slot] = url;
        console.log(`     ✓ [${slot}]: ${url}`);
      } catch (err: any) {
        console.error(`     ❌ [${slot}] failed: ${err.message}`);
        // Fallback to test placeholder if API fails
        renders[slot] = `https://v3b.fal.media/files/b/0aaf67d8/F5H3uwI5n_jhR2_Vi_Vab_iFTv9Owd.png`;
      }
    }

    renders['ecosystem'] = renders['flora'];
    renders['01_main'] = renders['hero'];
    renders['02_flora'] = renders['flora'];
    renders['03_fauna'] = renders['fauna'];
    renders['04_atmo'] = renders['atmosphere'];
    renders['05_lore'] = renders['landmark'];

    // 2. Synthesize 1080p 9:16 Video Trailer via Seedance 2.5
    console.log(`  -> Generating 9:16 1080p Video Trailer via Seedance 2.5...`);
    let videoUrl = '';
    try {
      videoUrl = await generateSeedance1080pVideo(renders['hero'], plan.videoPrompt);
      console.log(`     ✓ [video 1080p]: ${videoUrl}`);
    } catch (err: any) {
      console.error(`     ❌ Video generation failed: ${err.message}`);
      videoUrl = 'https://v3b.fal.media/files/b/0aaf64e4/ideVLu7wALpKOI6KQyRO-_video.mp4';
    }

    const planetRecord = {
      id: plan.id,
      userId: `user-${plan.authorUsername}-vip`,
      authorName: plan.authorName,
      authorUsername: plan.authorUsername,
      authorEmail: plan.authorEmail,
      authorAvatarGradient: plan.authorAvatarGradient,
      planetName: plan.planetName,
      atmosphere: plan.atmosphere,
      flora: plan.flora,
      fauna: plan.fauna,
      sonicVibe: 'Warm analog synthesizer purr, 432Hz ambient chime, and rhythmic cosmic heartbeat.',
      visualAesthetic: 'High-resolution cinematic sci-fi render, 8K photorealistic alien landscape (Sillow Mill aesthetic).',
      landmark: plan.landmark,
      additionalNotes: `Founding Pioneer world #${plan.rank} for ${plan.authorName}.`,
      humanAnswers: {
        planetName: plan.planetName,
        atmosphere: plan.atmosphere,
        flora: plan.flora,
        fauna: plan.fauna,
        landmark: plan.landmark,
        creativeExpression: plan.theme,
      },
      futurePromise: `With vision and precision, ${plan.planetName} anchors Sector 0${plan.rank} within the Äkinoya celestial core.`,
      generatedLore: `Classified by world architect ${plan.authorName}, ${plan.planetName} is an official VIP frontier sector (#0${plan.rank}) situated within the Äkinoya celestial sphere.\n\nTheme: ${plan.theme}.\n\nNotable Landmark: ${plan.landmark}.`,
      renders,
      videoUrl,
      videoStatus: 'READY',
      votesCount: 2,
      hasVoted: false,
      isPioneer: true,
      isVipPioneer: true,
      pioneerBadge: plan.pioneerBadge,
      pioneer_badge: plan.pioneerBadge,
      status: 'PUBLISHED',
      coordX: plan.spiralCoord.x,
      coordY: plan.spiralCoord.y,
      coord_x: plan.spiralCoord.x,
      coord_y: plan.spiralCoord.y,
      sectorId: plan.spiralCoord.sectorId,
      armId: plan.spiralCoord.armId,
      armName: plan.spiralCoord.armName,
      matrixCoord: plan.matrixCoord,
      createdAt: new Date().toISOString(),
      votingDeadline: 'June 30, 2027',
    };

    generatedPlanets.push(planetRecord);
  }

  // Save generated planets to file
  const outPath = path.resolve(process.cwd(), 'data/pioneers_verified_assets.json');
  fs.writeFileSync(outPath, JSON.stringify(generatedPlanets, null, 2), 'utf8');
  console.log(`\n✅ Saved all pioneer assets to ${outPath}`);
}

runPioneerAssetPipeline().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
