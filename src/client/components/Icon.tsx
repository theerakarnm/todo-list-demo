// Line icons from the mockups: 16x16 grid, 1.6 stroke, square ends.
const ICON_PATHS = {
  settings: "M2 5 H14 M2 11 H14 M10 2.5 V7.5 M6 8.5 V13.5",
  search: "M7 2.5 A4.5 4.5 0 1 0 7 11.5 A4.5 4.5 0 1 0 7 2.5 M10.5 10.5 L14 14",
  plus: "M8 2.5 V13.5 M2.5 8 H13.5",
  inbox: "M2 9 L4.5 3 H11.5 L14 9 V13 H2 Z M2 9 H5.5 L6.5 11 H9.5 L10.5 9 H14",
  today: "M2 3 H14 V14 H2 Z M2 6.5 H14 M5 1.5 V4.5 M11 1.5 V4.5 M6 10 H10",
  upcoming: "M2 3 H14 V14 H2 Z M2 6.5 H14 M5 10.5 H11 M9 8.5 L11 10.5 L9 12.5",
  completed: "M2.5 8.5 L6.5 12.5 L13.5 3.5",
  collapse: "M10 3 L5 8 L10 13 M2 2 V14",
  expand: "M6 3 L11 8 L6 13 M14 2 V14",
  menu: "M2 4 H14 M2 8 H14 M2 12 H14",
  close: "M3 3 L13 13 M13 3 L3 13",
  eye: "M1.5 8 C4 3.5 12 3.5 14.5 8 C12 12.5 4 12.5 1.5 8 Z M8 6 V10",
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className="flex-none"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
