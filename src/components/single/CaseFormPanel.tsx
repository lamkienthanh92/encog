import { useRef, type ChangeEvent, type FormEvent } from 'react';
import type { Analysis, CaseForm, DateField, ScoreKey, Timing } from '../../types';
import { COMPOSITES, INDEXES } from '../../core/wisc';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Field } from '../common/ui';
import { IconFolder, IconSave, IconTrash, IconWand } from '../common/icons';

export interface CaseFormPanelProps {
  form: CaseForm;
  analysis: Analysis;
  timing: Timing;
  fileError: string;
  onChange: (field: keyof CaseForm, value: string) => void;
  onExample: () => void;
  onClear: () => void;
  onSave: () => void;
  onOpen: (file: File) => void;
}

/** Left-hand input panel for one assessment. */
export function CaseFormPanel({ form, analysis, timing, fileError, onChange, onExample, onClear, onSave, onOpen }: CaseFormPanelProps) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const anyIndex = INDEXES.some((k) => form[k].trim() !== '');
  const bind = (field: keyof CaseForm) => ({
    value: form[field],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(field, e.target.value),
  });
  const scoreError = (k: ScoreKey): string | null => {
    const code = analysis.errors[k];
    if (!code) return null;
    if (code === 'missing' && (!anyIndex || !(INDEXES as readonly string[]).includes(k))) return null;
    return t(`errors.${code}`);
  };
  const dateError = (field: DateField): string | null => {
    const e = timing.errors.find((x) => x.field === field);
    return e ? t(`errors.${e.code}`) : null;
  };
  const selected = analysis.complete ? analysis.selection.type : null;

  return (
    <form className="case-form card" onSubmit={(e: FormEvent<HTMLFormElement>) => e.preventDefault()} noValidate>
      <fieldset>
        <legend>{t('form.sectionChild')}</legend>
        <Field id="code" label={t('form.childCode')} hint={t('form.childCodeHint')}>
          <input id="code" className="input" autoComplete="off" {...bind('code')} />
        </Field>
        <div className="grid-2">
          <Field id="birth" label={t('form.birth')} error={dateError('birth')}>
            <input id="birth" className="input" type="date" {...bind('birth')} />
          </Field>
          <Field id="discharge" label={t('form.discharge')} error={dateError('discharge')}>
            <input id="discharge" className="input" type="date" {...bind('discharge')} />
          </Field>
        </div>
        <Field id="assessment" label={t('form.assessment')} error={dateError('assessment')}>
          <input id="assessment" className="input" type="date" {...bind('assessment')} />
        </Field>
      </fieldset>

      <fieldset>
        <legend>{t('form.sectionIndexes')}</legend>
        <p className="legend-hint">{t('form.sectionIndexesHint')}</p>
        <div className="grid-2">
          {INDEXES.map((k) => (
            <Field key={k} id={k} label={<><b>{k}</b> <span className="muted">{t(`index.${k}.name`)}</span></>} error={scoreError(k)}>
              <input id={k} className="input input-score" inputMode="numeric" placeholder="40–160" {...bind(k)} />
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('form.sectionComposites')}</legend>
        <p className="legend-hint">{t('form.sectionCompositesHint')}</p>
        <div className="grid-3">
          {COMPOSITES.map((k) => (
            <Field key={k} id={k} label={<b>{k}</b>} error={scoreError(k)} hint={selected === k ? t('form.wanted') : null} className={selected === k ? 'is-wanted' : ''}>
              <input id={k} className="input input-score" inputMode="numeric" {...bind(k)} />
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('form.sectionOptions')}</legend>
        <Field id="los" label={t('form.los')}>
            <select id="los" className="input" {...bind('los')}>
              <option value="">{t('form.losNone')}</option>
              {['5', '4', '3', '2', '1'].map((v) => <option key={v} value={v}>{t(`form.los${v}`)}</option>)}
            </select>
        </Field>
        <Field id="threshold" label={t('form.threshold')} hint={t('form.thresholdHint')} className="field-narrow">
          <input id="threshold" className="input" inputMode="numeric" {...bind('threshold')} />
        </Field>
      </fieldset>

      <div className="form-actions">
        <Button variant="primary" icon={<IconWand />} onClick={onExample}>{t('form.example')}</Button>
        <Button variant="ghost" icon={<IconTrash />} onClick={onClear}>{t('form.clear')}</Button>
        <Button icon={<IconSave />} onClick={onSave}>{t('form.save')}</Button>
        <Button icon={<IconFolder />} onClick={() => fileRef.current?.click()}>{t('form.open')}</Button>
        <input
          ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) onOpen(file);
            e.target.value = '';
          }}
        />
      </div>
      {fileError && <p className="field-error" role="alert">{fileError}</p>}
    </form>
  );
}
