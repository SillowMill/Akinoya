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

const SEEDANCE_VIDEO_ENDPOINT = 'https://queue.fal.run/bytedance/seedance-2.5/us/image-to-video';

interface JobSpec {
  id: string;
  planetName: string;
  rank: number;
  imageUrl: string;
  prompt: string;
}

const JOBS: JobSpec[] = [
  {
    id: 'planet-nathan-pioneer-03',
    planetName: 'Ankrau',
    rank: 3,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf680b/abVXKSJD21rsIkKAINQUP_DMkQXa60.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, aggressive low-altitude acceleration diving under floating upside-down flying trees and levitating obsidian stone shards on surreal planet Ankrau, close-proximity orbit around glowing neon violet anti-gravity fractures and ultraviolet auroras, 1080p HD vertical 9:16 cinematic flight.',
  },
  {
    id: 'planet-florian-pioneer-04',
    planetName: 'Florium',
    rank: 4,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf698b/27kxKI6v8phTiLmYnxq3c_au3ooi6U.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, aggressive low-altitude acceleration skimming over wet dark asphalt canals and diving through illuminated modern architectural steel arches of planet Florium, close-proximity orbit around the colossal King Power Concord arena glowing in electric sapphire blue and crisp white stadium floodlights, Leuven-by-night neo-noir energy, 1080p HD vertical 9:16 cinematic flight.',
  },
  {
    id: 'planet-seppe-pioneer-05',
    planetName: 'Sepplon',
    rank: 5,
    imageUrl: 'https://v3b.fal.media/files/b/0aaf6863/fTRjYgpPsxLtYE5rkxzCH_imKRu1DN.png',
    prompt:
      'Single continuous FPV drone shot, no cuts, ultra-wide 14mm lens, aggressive low-altitude acceleration tracking along razor-sharp cyan laser meridians and geometric quantum hypercube grids on planet Sepplon, close-proximity orbit through towering crystalline silicon spires and cobalt circuitry with absolute mathematical precision, 1080p HD vertical 9:16 cinematic flight.',
  },
];

async function submitJob(job: JobSpec): Promise<{ statusUrl: string; responseUrl: string; requestId: string }> {
  console.log(`[${job.planetName} #${job.rank}] Submitting FPV Seedance 2.5 1080p Video job...`);
  const submitRes = await fetch(SEEDANCE_VIDEO_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: job.prompt,
      image_url: job.imageUrl,
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
    throw new Error(`[${job.planetName}] Seedance submit failed HTTP ${submitRes.status}: ${errText}`);
  }

  const submitData = (await submitRes.json()) as any;
  console.log(`[${job.planetName} #${job.rank}] ✓ Job submitted: Request ID ${submitData.request_id || 'unknown'}`);
  return {
    statusUrl: submitData.status_url,
    responseUrl: submitData.response_url,
    requestId: submitData.request_id,
  };
}

async function pollJob(
  job: JobSpec,
  statusUrl: string,
  responseUrl: string,
  maxWaitMs = 720000
): Promise<string> {
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
      console.log(
        `   [${job.planetName} #${job.rank}] Poll #${pollCount}: ${sData.status} (${Math.round(
          (Date.now() - start) / 1000
        )}s elapsed)`
      );
    }
    if (sData.status === 'COMPLETED') {
      const respRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      const rData = (await respRes.json()) as any;
      const url = rData?.video?.url;
      if (url) {
        console.log(`🎉 [${job.planetName} #${job.rank}] COMPLETED! URL: ${url}`);
        return url;
      }
      throw new Error(`[${job.planetName}] Completed but no video URL found`);
    } else if (sData.status === 'FAILED') {
      throw new Error(`[${job.planetName}] Seedance video job failed: ${sData.error || 'Unknown error'}`);
    }
  }
  throw new Error(`[${job.planetName}] Seedance video timeout after ${maxWaitMs / 1000}s`);
}

async function run() {
  console.log('================================================================');
  console.log('🚀 TARGETED PER-WORLD FPV SEEDANCE 2.5 TRAILER SYNTHESIS');
  console.log('   Ankrau (#3), Florium (#4), Sepplon (#5)');
  console.log('   Advanced FPV Cinematic Drone Blueprint (Continuous 14mm)');
  console.log('================================================================\n');

  // Submit all 3 concurrently
  const submitted = await Promise.all(
    JOBS.map(async (job) => {
      const info = await submitJob(job);
      return { job, ...info };
    })
  );

  console.log('\nAll 3 FPV Seedance jobs submitted. Polling concurrently...\n');

  // Poll all 3 concurrently
  const results = await Promise.all(
    submitted.map(async ({ job, statusUrl, responseUrl }) => {
      const videoUrl = await pollJob(job, statusUrl, responseUrl);
      return {
        id: job.id,
        planetName: job.planetName,
        rank: job.rank,
        prompt: job.prompt,
        videoUrl,
      };
    })
  );

  const outPath = path.resolve(process.cwd(), 'data/fpv_trailers.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ Saved all 3 FPV trailer URLs to ${outPath}`);
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Fatal error in FPV trailer generator:', err);
  process.exit(1);
});
