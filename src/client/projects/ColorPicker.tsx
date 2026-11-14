import { useTranslation } from "react-i18next";
import { PROJECT_COLOR_HEX, PROJECT_COLORS, type ProjectColor } from "../../shared/constants";

type ColorPickerProps = {
  legend: string;
  value: ProjectColor;
  onChange: (color: ProjectColor) => void;
  /** Radio group name; unique per picker on the page. */
  name: string;
};

/** The 5 project swatches (ARCHITECTURE §4), as a radio group. */
export function ColorPicker({ legend, value, onChange, name }: ColorPickerProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mono muted mb-1.5 p-0">{legend}</legend>
      <div className="-ml-1 flex">
        {PROJECT_COLORS.map((color) => (
          <label key={color} className="color-option" title={t(`projectColors.${color}`)}>
            <input
              type="radio"
              name={name}
              value={color}
              checked={value === color}
              aria-label={t(`projectColors.${color}`)}
              onChange={() => onChange(color)}
            />
            <i className="swatch h-6 w-6" style={{ background: PROJECT_COLOR_HEX[color] }} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
