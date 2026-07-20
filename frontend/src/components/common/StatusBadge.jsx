import { Badge } from '@/components/ui/badge';
import {
  CALL_STATUS_META,
  CALL_RESULT_META,
  AUTOMATION_STATUS_META,
  AGENT_STATUS_META,
} from '@/lib/constants';
import { titleCase } from '@/lib/utils';

const MAPS = {
  callStatus: CALL_STATUS_META,
  callResult: CALL_RESULT_META,
  automation: AUTOMATION_STATUS_META,
  agent: AGENT_STATUS_META,
};

/**
 * <StatusBadge type="callStatus" value="in_queue" />
 * Types: callStatus | callResult | automation | agent
 */
export function StatusBadge({ type = 'callStatus', value, className }) {
  const map = MAPS[type] || {};
  const meta = map[value] || { label: titleCase(value || '—'), variant: 'neutral' };
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
