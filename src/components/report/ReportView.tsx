import type { ReportDoc } from '../../types';

export interface ReportViewProps {
  report: ReportDoc;
}

/** Printable rendering of a report built by core/report.ts. */
export function ReportView({ report }: ReportViewProps) {
  return (
    <article className="report">
      <header>
        <p className="report-brand">ENCOG</p>
        <h1>{report.title}</h1>
        {report.meta.map((m) => <p key={m} className="report-meta">{m}</p>)}
      </header>
      {report.sections.map((s, i) => (
        <section key={i}>
          {s.heading && <h2>{s.heading}</h2>}
          {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {s.bullets && s.bullets.length > 0 && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {s.table && (
            <table>
              <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{s.table.rows.map((r) => <tr key={r[0]}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          )}
        </section>
      ))}
      <footer>{report.footer.map((f) => <p key={f}>{f}</p>)}</footer>
    </article>
  );
}
