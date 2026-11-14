import { Icon } from "../components/Icon";

/** Empty state from the Today mockup: a halftone dot and an orange disc behind a big tick. */
export function AllClear({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 pt-14 pb-2 text-center">
      <div aria-hidden="true" className="all-clear-art">
        <div className="all-clear-dots" />
        <div className="all-clear-disc" />
        <Icon name="check" size={68} strokeWidth={1.4} />
      </div>
      <h2 className="mt-3.5 mb-0 text-4xl leading-[1.3] font-extrabold">{title}</h2>
      <div className="mono muted">{note}</div>
    </div>
  );
}
