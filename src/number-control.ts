/** Keep a slider and exact-number field in sync without interrupting typing. */
export function bindNumberControl(
  slider: HTMLInputElement, input: HTMLInputElement,
  min: number, max: number, initial: number, save: (value: number) => void,
): void {
  let value = initial;
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  const render = () => { slider.value = input.value = String(value); };
  const commit = (raw: string) => {
    const parsed = raw.trim() === '' ? NaN : Number(raw);
    const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : value;
    const changed = next !== value;
    value = next;
    render();
    if (changed) save(value);
  };
  render();
  slider.addEventListener('input', () => commit(slider.value));
  input.addEventListener('change', () => commit(input.value));
  input.addEventListener('blur', () => commit(input.value));
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); commit(input.value); }
    if (event.key === 'Escape') { event.preventDefault(); render(); }
  });
}
