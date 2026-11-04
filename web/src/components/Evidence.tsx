import { useState } from 'react'
import { CheckCircle, Warning, CaretDown, CaretRight, Flask, DownloadSimple } from '@phosphor-icons/react'
import type { Job, Outcome } from '../types'

function outcomeText(outcome: Outcome): string {
  if (outcome.status === 'raised') return `${outcome.exception}: ${outcome.message}`
  if (outcome.status !== 'returned') return outcome.message || outcome.status
  const value = outcome.value as { type?: string; value?: unknown } | null
  return value && typeof value === 'object' && 'value' in value ? `${value.type} · ${JSON.stringify(value.value)}` : JSON.stringify(value)
}

export function Evidence({ job, onValidate, busy }: { job: Job; onValidate: () => void; busy: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const report = job.report
  if (!report) return <div className="empty-evidence"><Flask size={40} weight="light"/><h2>Good code needs evidence.</h2><p>Run {job.request.scenarios.length} scenarios against the original and the extracted package. Every result is captured in a fresh process.</p><button className="button primary" onClick={onValidate} disabled={busy || !['extracted', 'completed'].includes(job.status)}>Run behavioral comparison</button>{!job.request.scenarios.length && <p className="muted">Add scenarios in the extraction settings first.</p>}</div>
  return <section className="evidence"><div className={`evidence-banner ${report.status}`}><div className="evidence-icon">{report.status === 'matched' ? <CheckCircle size={32} weight="duotone"/> : <Warning size={32}/>}</div><div><h2>{report.status === 'matched' ? 'Same behavior. Smaller footprint.' : report.status === 'diverged' ? 'A behavioral difference needs review.' : 'Some scenarios could not be verified.'}</h2><p>{report.matched} matched · {report.diverged} diverged · {report.unverified} unverified · {report.runner} runner</p></div><a className="button subtle" href={`/api/jobs/${job.id}/download`}><DownloadSimple size={17}/> Download evidence</a></div>
    <div className="result-table" role="table" aria-label="Behavioral comparison results"><div className="result-row result-header" role="row"><span>SCENARIO</span><span>ORIGINAL</span><span>EXTRACTED</span><span>RESULT</span></div>{report.cases.map(result => <div key={result.name}><button className="result-row" role="row" onClick={() => setExpanded(expanded === result.name ? null : result.name)} aria-expanded={expanded === result.name}><span className="case-name">{expanded === result.name ? <CaretDown/> : <CaretRight/>}{result.name}</span><samp>{outcomeText(result.original)}</samp><samp>{outcomeText(result.candidate)}</samp><span className={`status-tag ${result.status}`}>{result.status === 'matched' && <CheckCircle size={13}/>} {result.status}</span></button>{expanded === result.name && <div className="case-detail"><pre>{JSON.stringify({ original: result.original, candidate: result.candidate }, null, 2)}</pre></div>}</div>)}</div>
    <p className="evidence-scope"><Flask size={15}/>{report.scope}</p>
  </section>
}
