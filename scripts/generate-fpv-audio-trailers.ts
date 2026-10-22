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

const SEEDANCE_ENDPOINT = 'https://queue.fal.run/bytedance/seedance-2.5/us/image-to-video';

interface TrailerSpec {
  id: string;
  planetName: string;
  rank: number;
  imageUrl: string;
  prompt: string;
}

const TARGETS: TrailerSpec[] = [
  {
    id: 'planet-felix-test-01',
    planetName: 'Felix',
    rank: 2,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf67e3/QCNr60F4WXHza0PgpPzkm_FpQcg8tP.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, realistic motion blur, smooth acceleration skimming through a bioluminescent alien canyon of glowing pink and orange flora on planet Felix, close-proximity orbit around charming fluffy ginger domestic cats and bioluminescent pink sci-fi cats resting near giant rose quartz arches and ancient feline monoliths, vertical 9:16 cinematic flight. Immersive ambient sound design with soft harmonic feline purring, gentle celestial wind, and ethereal chimes.',
  },
  {
    id: 'planet-nathan-pioneer-03',
    planetName: 'Ankrau',
    rank: 3,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf680b/abVXKSJD21rsIkKAINQUP_DMkQXa60.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, realistic motion blur, fluid gliding flight navigating under giant upside-down flying trees and levitating obsidian crystals on planet Ankrau, close-proximity orbit around glowing neon violet anti-gravity rifts and celestial auroras, vertical 9:16 cinematic flight. Immersive ambient sound design of ethereal cosmic wind, deep resonant atmospheric reverberation, and mysterious celestial resonance.',
  },
  {
    id: 'planet-seppe-pioneer-05',
    planetName: 'Sepplon',
    rank: 5,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf6863/fTRjYgpPsxLtYE5rkxzCH_imKRu1DN.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, realistic motion blur, precision flight darting along glowing cyan laser meridians and geometric quantum hypercube grids on planet Sepplon, close-proximity orbit through towering crystalline silicon spires and cobalt circuitry, vertical 9:16 cinematic flight. Immersive ambient sound design of clean electrical hum, harmonic laser chimes, and resonant crystalline frequencies.',
  },
];

async function submitJob(spec: TrailerSpec) {
  console.log(`[${spec.planetName} #${spec.rank}] Submitting Seedance 2.5 1080p FPV Video + Synchronized Audio job...`);
  const res = await fetch(SEEDANCE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: spec.prompt,
      image_url: spec.imageUrl,
      duration: '5',
      resolution: '1080p',
      aspect_ratio: 'auto',
      generate_audio: true,
      bitrate_mode: 'high',
      codec: 'H264',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`[${spec.planetName}] Seedance submit failed HTTP ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as any;
  const requestId = data.request_id || 'unknown';
  console.log(`[${spec.planetName} #${spec.rank}] ✓ Job submitted: Request ID ${requestId}`);
  return {
    statusUrl: data.status_url || `https://queue.fal.run/bytedance/seedance-2.5/requests/${requestId}/status`,
    responseUrl: data.response_url || `https://queue.fal.run/bytedance/seedance-2.5/requests/${requestId}`,
    requestId,
  };
}

async function pollJob(
  spec: TrailerSpec,
  statusUrl: string,
  responseUrl: string,
  maxWaitMs = 720000
): Promise<string> {
  const start = Date.now();
  let pollCount = 0;
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000));
    pollCount++;
    const sRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!sRes.ok) continue;
    const sData = (await sRes.json()) as any;
    if (pollCount % 4 === 0) {
      console.log(
        `   [${spec.planetName} #${spec.rank}] Poll #${pollCount}: ${sData.status} (${Math.round(
          (Date.now() - start) / 1000
        )}s elapsed)`
      );
    }
    if (sData.status === 'COMPLETED') {
      const rRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const rData = (await rRes.json()) as any;
      const url = rData?.video?.url;
      if (url) {
        console.log(`🎉 [${spec.planetName} #${spec.rank}] COMPLETED! URL: ${url}`);
        return url;
      }
      throw new Error(`[${spec.planetName}] Completed without video URL: ${JSON.stringify(rData)}`);
    } else if (sData.status === 'FAILED') {
      throw new Error(`[${spec.planetName}] Job failed: ${JSON.stringify(sData)}`);
    }
  }
  throw new Error(`[${spec.planetName}] Job timeout after ${maxWaitMs / 1000}s`);
}

async function run() {
  console.log('================================================================');
  console.log('🎬 PURE VIDEO TRAILER UPGRADE: SEEDANCE 2.5 1080P FPV + AUDIO');
  console.log('   Targets: Felix (#2), Ankrau (#3), Sepplon (#5)');
  console.log('   Images: 100% UNTOUCHED');
  console.log('   Audio: generate_audio: true (ambient sound design)');
  console.log('================================================================\n');

  // Submit all 3 concurrently
  const submitted = await Promise.all(
    TARGETS.map(async (spec) => {
      const info = await submitJob(spec);
      return { spec, ...info };
    })
  );

  console.log('\nAll 3 video jobs successfully queued on fal.ai. Polling concurrently...\n');

  // Poll all 3 concurrently
  const results = await Promise.all(
    submitted.map(async ({ spec, statusUrl, responseUrl }) => {
      const videoUrl = await pollJob(spec, statusUrl, responseUrl);
      return {
        id: spec.id,
        planetName: spec.planetName,
        rank: spec.rank,
        imageUrl: spec.imageUrl,
        prompt: spec.prompt,
        videoUrl,
        hasAudio: true,
      };
    })
  );

  const outPath = path.resolve(process.cwd(), 'data/fpv_audio_trailers.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ Saved all 3 new FPV + Audio trailers to ${outPath}`);
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Fatal error in trailer upgrade script:', err);
  process.exit(1);
});
