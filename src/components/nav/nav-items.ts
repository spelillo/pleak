import {
  HouseSimple,
  Barbell,
  ClockCounterClockwise,
  // Target,
  UserCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface NavItem {
  label: string;
  path: string;
  icon: Icon;
}

export const navItems: NavItem[] = [
  { label: "Home", path: "/", icon: HouseSimple },
  { label: "Workout", path: "/workout", icon: Barbell },
  { label: "History", path: "/history", icon: ClockCounterClockwise },
  // Goals page is hidden for now — re-enable when it's ready.
  // { label: "Goals", path: "/goals", icon: Target },
  { label: "Profile", path: "/profile", icon: UserCircle },
];
