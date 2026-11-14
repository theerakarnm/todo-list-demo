type SegmentedChoiceProps<Value extends string> = {
  legend: string;
  name: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
};

/** A row of joined radio buttons (.opt in the Settings mockup). */
export function SegmentedChoice<Value extends string>({ legend, name, options, value, onChange }: SegmentedChoiceProps<Value>) {
  return (
    <fieldset className="m-0 mb-7 border-0 p-0">
      <legend className="mono mb-2.5 p-0">{legend}</legend>
      <div className="flex flex-wrap">
        {options.map((option) => (
          <label key={option.value} className="segment-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
