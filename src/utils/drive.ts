/**
 * Internal Sillow Mill Production Asset Vault Configuration & Mappings
 * Maps the 3 top-level master folders and the dissected 5-stage production pipeline.
 */

export const MASTER_VAULT_FOLDER_IDS = {
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

export const VAULT_STAGE_NAMES: Record<string, string> = {
  '01': '01 Storyboards & Script Blueprints',
  '02': '02 Art Direction & Character Anchors',
  '03': '03 Logic Pro Project & DAW Architecture',
  '04': '04 Blender 3D Previs & Camera Trajectories',
  '05': '05 Prompt Engineering Bibles & LUTs',
};

/**
 * Returns the matching internal folder ID for any stage key or label.
 */
export const getVaultFolderIdForStage = (stageNumOrKey: string | number): string => {
  const normalized = String(stageNumOrKey).trim().replace(/^stage-?/i, '');
  const padded = normalized.padStart(2, '0');
  return VAULT_STAGE_FOLDER_IDS[padded] || 'stage-01';
};
