/**
 * Official Sillow Mill Google Drive Asset Vault Configuration & Helpers
 * All master deliverables, project files, DAW stems, and Blender rigs redirect to Google Drive.
 */

export const SILLOW_MILL_DRIVE_VAULT_URL =
  (import.meta as any).env?.VITE_GOOGLE_DRIVE_VAULT_URL ||
  'https://drive.google.com/drive/folders/1sillowmill-akinoya-production-vault';

export const SILLOW_MILL_STAGE_DRIVE_URLS: Record<string, string> = {
  '01': `${SILLOW_MILL_DRIVE_VAULT_URL}#01_Storyboards`,
  '02': `${SILLOW_MILL_DRIVE_VAULT_URL}#02_ArtDirection`,
  '03': `${SILLOW_MILL_DRIVE_VAULT_URL}#03_AudioMasters`,
  '04': `${SILLOW_MILL_DRIVE_VAULT_URL}#04_Blender3DRigs`,
  '05': `${SILLOW_MILL_DRIVE_VAULT_URL}#05_PromptBibles`,
};

export const openDriveVault = (url: string = SILLOW_MILL_DRIVE_VAULT_URL): void => {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
