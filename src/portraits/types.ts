export interface LicensedPortrait {
  characterId: string;
  characterName: string;
  file: string;
  position: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  rightsEvidenceUrl: string;
  reviewedAt: string;
  changes: string;
  copyrightNotice?: string;
  rights: { publicDisplay: true; redistribution: true; adaptations: true; underlyingRightsCleared: true };
  width: 400;
  height: 500;
  bytes: number;
  sha256: string;
}
export interface PortraitManifest { schemaVersion: 1; portraits: LicensedPortrait[] }
