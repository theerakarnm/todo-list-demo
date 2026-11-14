import { useTranslation } from "react-i18next";
import { PRIORITY_BADGES, type Priority } from "../../shared/constants";
import { Icon } from "../components/Icon";

/** P1 (high) to P4 (none), styled as in the mockups; P4 is muted. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  const badge = PRIORITY_BADGES[priority];
  return (
    <span className={`priority-badge priority-${priority} mono`} title={t(`priorities.${priority}`)}>
      <Icon name="flag" size={11} strokeWidth={1.8} />
      {badge}
    </span>
  );
}
