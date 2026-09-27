import { INITIAL_C_VOLUME } from '../data/filesystem.js';
import { ALLOWED_TELEMETRY_TYPES } from './telemetry.js';
import { compareSnapshotSources } from './finale.js';
import { ArgFileNode } from './types.js';

const REQUIRED_CLUE_IDS = [
  'c-todo-old','c-temp-lacuna-log','c-tech-overview','c-performance','c-prediction-run','c-clock-drift',
  'c-participants','c-opr019','c-crosswalk','c-suspension','c-incident','c-final-reconstruction','c-ws03-image',
] as const;

export interface ArgHardeningAudit {
  unprotectedRequiredClues: string[];
  mundaneVisibleFiles: number;
  visibleStoryFiles: number;
  forbiddenTelemetryTypes: string[];
  historicalEthicsCorroborated: boolean;
}

export function auditArgHardening(): ArgHardeningAudit {
  const files = INITIAL_C_VOLUME.nodes.filter((node): node is ArgFileNode => node.kind === 'file');
  const unprotectedRequiredClues = REQUIRED_CLUE_IDS.filter((id) => {
    const node = files.find((file) => file.id === id);
    return !node || !node.protectedStoryFile;
  });
  const visible = files.filter((file) => !file.hidden && !file.system && !file.deleted && file.path.startsWith('C:\\Users\\evale'));
  const visibleStoryFiles = visible.filter((file) => file.protectedStoryFile).length;
  const mundaneVisibleFiles = visible.filter((file) => !file.protectedStoryFile).length;
  const forbiddenTelemetryTypes = ALLOWED_TELEMETRY_TYPES.filter((type) => /microphone|camera|geo|location|fingerprint|upload|browser-history/i.test(type));
  const comparison = compareSnapshotSources();
  const historicalEthicsCorroborated = comparison.corroborated.some((item) => /participants/i.test(item)) && comparison.corroborated.some((item) => /project-status|suspended/i.test(item));
  return { unprotectedRequiredClues, mundaneVisibleFiles, visibleStoryFiles, forbiddenTelemetryTypes, historicalEthicsCorroborated };
}
