import { SegmentedControl } from "./SegmentedControl";

interface PillTabsProps {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export function PillTabs(props: PillTabsProps) {
  return <SegmentedControl {...props} />;
}
