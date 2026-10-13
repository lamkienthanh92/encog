import { useLanguage } from '../../context/LanguageContext';
import { VERSION } from '../../version';
import { Card } from '../common/ui';

const REFERENCES: readonly string[] = [
  'Flanagan DP, Kaufman AS. Essentials of WISC-IV Assessment. 2nd ed. Hoboken (NJ): Wiley; 2009.',
  'Weiss LG, Saklofske DH, Prifitera A, Holdnack JA. WISC-IV Advanced Clinical Interpretation. Burlington (MA): Academic Press; 2006.',
  'Raiford SE, Weiss LG, Rolfhus E, Coalson D. General Ability Index. WISC-IV Technical Report No. 4. San Antonio (TX): Harcourt Assessment; 2005.',
  'Dang HM, Weiss B, Pollack A, Nguyen MC. Adaptation of the Wechsler Intelligence Scale for Children-IV (WISC-IV) for Vietnam. Psychol Stud (Mysore). 2012;56(4):387–392.',
  'Lewthwaite P, Begum A, Ooi MH, et al. Disability after encephalitis: development and validation of a new outcome score. Bull World Health Organ. 2010;88:584–592.',
  'Wilson EB. Probable inference, the law of succession, and statistical inference. J Am Stat Assoc. 1927;22:209–212.',
  'Firth D. Bias reduction of maximum likelihood estimates. Biometrika. 1993;80:27–38.',
  'Heinze G, Schemper M. A solution to the problem of separation in logistic regression. Stat Med. 2002;21:2409–2419.',
];

const BLOCKS = ['rule', 'bands', 'timing', 'stats', 'assoc', 'notDo'] as const;

export function MethodPage() {
  const { t } = useLanguage();
  return (
    <div className="method">
      <Card title={t('method.title')}>
        {BLOCKS.map((b) => (
          <section key={b} className="method-block">
            <h3>{t(`method.${b}Title`)}</h3>
            <p>{t(`method.${b}`)}</p>
          </section>
        ))}
        <section className="method-block">
          <h3>{t('method.privacyTitle')}</h3>
          <p>{t('disclaimer.full')}</p>
          <p>{t('disclaimer.privacy')}</p>
        </section>
      </Card>
      <Card title={t('method.citeTitle')}>
        <p className="cite">{t('method.cite', { version: VERSION })}</p>
      </Card>
      <Card title={t('method.refsTitle')}>
        <ol className="refs">{REFERENCES.map((r) => <li key={r}>{r}</li>)}</ol>
      </Card>
    </div>
  );
}
