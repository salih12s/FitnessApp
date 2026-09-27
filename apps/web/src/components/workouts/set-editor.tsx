import { Plus, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWeightUnit } from '@/lib/format';
import type { useWorkoutSets } from './use-workout-sets';

interface SetEditorProps {
  editor: ReturnType<typeof useWorkoutSets>;
  disabled?: boolean;
  onChange?: () => void;
}

export function SetEditor({
  editor,
  disabled = false,
  onChange,
}: SetEditorProps) {
  return (
    <div>
      <div className="grid grid-cols-[2rem_minmax(0,1.1fr)_minmax(0,0.9fr)_2.75rem] items-end gap-2 text-xs text-muted-foreground">
        <span className="text-center">Set</span>
        <span>Ağırlık</span>
        <span>Tekrar</span>
        <span className="sr-only">Set işlemi</span>
      </div>
      <ol className="mt-2 flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {editor.sets.map((set, index) => {
            const setErrors = editor.errors[set.id];
            const hasErrors = Boolean(setErrors?.weight || setErrors?.reps);

            return (
              <m.li
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="rounded-md"
                exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                key={set.id}
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <div className="grid grid-cols-[2rem_minmax(0,1.1fr)_minmax(0,0.9fr)_2.75rem] items-center gap-2">
                  <span className="metric-number text-center text-sm text-muted-foreground">
                    {index + 1}
                  </span>
                  <label className="relative min-w-0">
                    <span className="sr-only">Set {index + 1} ağırlık</span>
                    <Input
                      aria-invalid={Boolean(setErrors?.weight)}
                      className="metric-number h-12 min-w-0 px-3 pr-9 text-lg font-semibold sm:text-lg"
                      disabled={disabled}
                      inputMode="decimal"
                      max="9999.99"
                      min="0"
                      onChange={(event) => {
                        editor.update(set.id, 'weight', event.target.value);
                        onChange?.();
                      }}
                      placeholder="0"
                      required
                      step="0.01"
                      type="number"
                      value={set.weight}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {getWeightUnit()}
                    </span>
                  </label>
                  <label className="relative min-w-0">
                    <span className="sr-only">Set {index + 1} tekrar</span>
                    <Input
                      aria-invalid={Boolean(setErrors?.reps)}
                      className="metric-number h-12 min-w-0 px-3 pr-14 text-lg font-semibold sm:text-lg"
                      disabled={disabled}
                      inputMode="numeric"
                      max="1000"
                      min="1"
                      onChange={(event) => {
                        editor.update(set.id, 'reps', event.target.value);
                        onChange?.();
                      }}
                      placeholder="0"
                      required
                      step="1"
                      type="number"
                      value={set.reps}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      tekrar
                    </span>
                  </label>
                  <Button
                    aria-label={`Set ${index + 1}'i kaldır`}
                    className="size-11 min-h-11 text-muted-foreground hover:text-destructive"
                    disabled={editor.sets.length === 1 || disabled}
                    onClick={() => {
                      editor.remove(set.id);
                      onChange?.();
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                {hasErrors ? (
                  <p
                    className="mt-1.5 pl-10 text-xs leading-5 text-destructive"
                    role="alert"
                  >
                    {setErrors?.weight ?? setErrors?.reps}
                  </p>
                ) : null}
              </m.li>
            );
          })}
        </AnimatePresence>
      </ol>
      <Button
        className="mt-3 w-full border-dashed"
        disabled={editor.sets.length >= 50 || disabled}
        onClick={() => {
          editor.add();
          onChange?.();
        }}
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" className="size-4" />
        Set ekle
      </Button>
    </div>
  );
}
