import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

async function generateSeedance1080pVideo(imageUrl: string, prompt: string, maxWaitMs = 720000): Promise<string> {
  console.log('Submitting Seedance 2.5 1080p Video job...');
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
  console.log(`Job submitted: Request ID ${submitData.request_id || 'unknown'}`);

  const start = Date.now();
  let pollCount = 0;
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000));
    pollCount++;
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!statusRes.ok) continue;
    const sData = (await statusRes.json()) as any;
    if (pollCount % 4 === 0) {
      console.log(`    [Seedance Poll #${pollCount}] Status: ${sData.status}... (${Math.round((Date.now() - start) / 1000)}s elapsed)`);
    }
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

async function run() {
  console.log('================================================================');
  console.log('🚀 FLORIUM (#4) COMPLETE RE-GENERATION PIPELINE');
  console.log('   Theme: Sleek, Cool, Stylish Urban / Stadium Guy Aesthetic (Leuven Vibes, Zero Cats)');
  console.log('================================================================\n');

  const prompts = {
    hero: 'Spectacular cinematic orbital perspective of planet Florium floating in deep space, glowing with sleek modern urban energy, subtle deep sapphire blue and pristine architectural white illumination, modern arena lighting lattices, illuminated skyline grids and river canals reflecting stadium glow, sleek masculine 8K sci-fi space art, Sillow Mill cinematic aesthetic.',
    flora: 'Sleek architectural vertical bio-forests and illuminated rooftop gardens on planet Florium, glowing indigo and cool crisp white bio-moss, sleek geometric glass towers and steel bridges, Leuven-by-night stylish urban atmosphere, modern masculine design, volumetric evening mist, photorealistic 8K render.',
    fauna: 'A sleek, dynamic kinetic energy falcon and cybernetic companion walking with quiet confidence through a stylish pedestrian plaza on planet Florium, illuminated by deep blue and white stadium floodlights reflecting on wet dark asphalt, cool modern guy vibe, 8K photorealistic photography.',
    atmosphere: 'Moody, stylish twilight sky over planet Florium seen from a high-rise terrace, deep royal blue evening troposphere cut by powerful crisp white stadium floodlights, architectural silhouettes of modern arenas and historic gothic towers under illuminated night clouds, Leuven night vibes, 8K cinematic render.',
    landmark: 'The Stadium of Florium (The King Power Concord): A colossal, ultra-modern architectural sports arena and illuminated amphitheater forged from brushed steel and glass, radiating with deep sapphire blue and electric white stadium lighting over water canals, 8K architectural photography.',
  };

  const renders: Record<string, string> = {};
  const slots = ['hero', 'flora', 'fauna', 'atmosphere', 'landmark'] as const;

  for (const slot of slots) {
    console.log(`-> Synthesizing slot [${slot}] via Nano-Banana 2.1...`);
    const url = await generateNanoBananaImage(prompts[slot]);
    renders[slot] = url;
    console.log(`   ✓ [${slot}]: ${url}`);
  }

  renders['ecosystem'] = renders['flora'];
  renders['01_main'] = renders['hero'];
  renders['02_flora'] = renders['flora'];
  renders['03_fauna'] = renders['fauna'];
  renders['04_atmo'] = renders['atmosphere'];
  renders['05_lore'] = renders['landmark'];

  const videoPrompt = 'Cinematic 9:16 vertical camera diving smoothly over sleek modern city skyline and glowing stadium arenas on planet Florium, deep blue and bright white floodlights cutting through night mist, stylish urban energy in 1080p HD loop.';

  console.log('\n-> Synthesizing 1080p HD 9:16 Vertical Video Trailer via Seedance 2.5...');
  const videoUrl = await generateSeedance1080pVideo(renders['hero'], videoPrompt);
  console.log(`   ✓ [1080p Video]: ${videoUrl}`);

  const output = {
    planetName: 'Florium',
    authorName: 'Florian H.',
    prompts,
    renders,
    videoUrl,
  };

  const outPath = path.resolve(process.cwd(), 'data/florium_verified_assets.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Saved Florium assets to ${outPath}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
