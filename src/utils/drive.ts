/**
 * Internal Sillow Mill Production Asset Vault Configuration & Mappings
 * Maps workflow stages (01-05) to internal folder modules in the Drive Asset Vault.
 */

export const VAULT_STAGE_FOLDER_IDS: Record<string, string> = {
  '01': 'folder-01',
  '02': 'folder-02',
  '03': 'folder-03',
  '04': 'folder-04',
  '05': 'folder-05',
};

export const VAULT_STAGE_NAMES: Record<string, string> = {
  '01': '01 Storyboards',
  '02': '02 Art Direction',
  '03': '03 Audio Masters',
  '04': '04 Blender 3D',
  '05': '05 Prompt Engineering',
};

/**
 * Returns the matching internal folder ID for any stage key or label.
 */
export const getVaultFolderIdForStage = (stageNumOrKey: string | number): string => {
  const normalized = String(stageNumOrKey).trim().replace(/^stage-?/i, '');
  const padded = normalized.padStart(2, '0');
  return VAULT_STAGE_FOLDER_IDS[padded] || 'folder-01';
};
