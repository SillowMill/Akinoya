/**
 * Internal Sillow Mill Production Asset Vault Configuration & Mappings
 * Maps the 3 top-level master folders and the standardized 5-step 3D-to-AI + Logic Pro DAW pipeline.
 */

export const MASTER_VAULT_FOLDER_IDS = {
  WORKFLOW: 'folder-01',
  LOGIC_2D: 'folder-01',
  VOCAL_PACK: 'folder-02',
  BINGAA_DIGITAL: 'folder-03',
} as const;

export const VAULT_STAGE_FOLDER_IDS: Record<string, string> = {
  '01': 'stage-01',
  '02': 'stage-02',
  '03': 'stage-03',
  '04': 'stage-04',
  '05': 'stage-05',
};

export const VAULT_AUDIO_SUBFOLDER_IDS = {
  WAV_STEMS: 'stage-05-wav-stems',
  VISUALIZER_LOGIC_ASSETS: 'stage-05-visualizer-assets',
} as const;

export const VAULT_STAGE_NAMES: Record<string, string> = {
  '01': '01_Blender_Greybox_Base',
  '02': '02_Spatial_Blocking_Rigs',
  '03': '03_24fps_Camera_Previz',
  '04': '04_Canonical_Tag_References',
  '05': '05_Audio_DAW_Templates_Stems',
};

/**
 * Returns the matching internal folder ID for any stage key or label.
 */
export const getVaultFolderIdForStage = (stageNumOrKey: string | number): string => {
  const normalized = String(stageNumOrKey).trim().replace(/^stage-?/i, '');
  const padded = normalized.padStart(2, '0');
  return VAULT_STAGE_FOLDER_IDS[padded] || 'stage-01';
};
