import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowSquareOut, BookOpen, BracketsCurly, CaretRight, Check, CheckCircle, Clock, Code, Cube, Database, DownloadSimple, FilePy, Flask, GearSix, GitBranch, GithubLogo, Lightning, MagnifyingGlass, Package, Play, Plus, Scissors, Sparkle, Spinner, Stack, Terminal, Warning, X } from '@phosphor-icons/react'
import { api } from './api'
import { Graph } from './components/Graph'
import { CodeViewer } from './components/CodeViewer'
import { Evidence } from './components/Evidence'
import type { Advice, Analysis, Health, Job, JobSummary, Spec } from './types'

type Tab = 'plan' | 'code' | 'evidence'
const stages = ['Locate', 'Delimit', 'Decouple', 'Package', 'Compare']
const busyStates = ['extracting', 'validating']

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [spec, setSpec] = useState<Spec | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [query, setQuery] = useState('shipping calculation')
  const [tab, setTab] = useState<Tab>('plan')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('Connecting to the engine')
  const [dialog, setDialog] = useState<'source' | 'settings' | 'help' | null>(null)
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [scenarioText, setScenarioText] = useState('')
  const [scenarioError, setScenarioError] = useState('')
  const [sourceDraft, setSourceDraft] = useState('')
  const [notice, setNotice] = useState('')
  const queryRef = useRef<HTMLInputElement>(null)
  const currentId = useRef<string | null>(null)
  const working = !!loading || !!job && busyStates.includes(job.status)

  const selectJob = useCallback(async (id: string) => {
    currentId.current = id
    const next = await api<Job>(`/jobs/${id}`)
    if (currentId.current !== id) return
    setJob(next); setSpec(next.request); setSourceDraft(next.request.source)
    setScenarioText(JSON.stringify(next.request.scenarios, null, 2)); setScenarioError('')
    setAdvice(null); setAnalysis(null); setTab('plan')
  }, [])
  const refreshJobs = useCallback(async () => setJobs(await api<JobSummary[]>('/jobs')), [])

  useEffect(() => {
    let active = true
    Promise.all([api<Health>('/health'), api<Spec>('/demo'), api<JobSummary[]>('/jobs')]).then(async ([h, demo, list]) => {
      if (!active) return
      setHealth(h); setSpec(demo); setSourceDraft(demo.source); setScenarioText(JSON.stringify(demo.scenarios, null, 2)); setJobs(list)
      if (list.length) await selectJob(list[0].id)
    }).catch(e => { if (active) setError(`Engine unavailable: ${e.message}. Start it with make dev.`) }).finally(() => { if (active) setLoading('') })
    return () => { active = false }
  }, [selectJob])

  useEffect(() => {
    if (!job || !busyStates.includes(job.status)) return
    const id = job.id
    const timer = setInterval(() => {
      api<Job>(`/jobs/${id}`).then(next => {
        if (currentId.current !== id) return
        setJob(next)
        if (!busyStates.includes(next.status)) {
          void refreshJobs()
          if (next.status === 'completed') setTab('evidence')
          if (next.error) setError(next.error)
        }
      }).catch(e => setError(e.message))
    }, 700)
    return () => clearInterval(timer)
  }, [job?.id, job?.status, refreshJobs])

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setDialog('source'); setTimeout(() => queryRef.current?.focus(), 0) }
      if (event.key === 'Escape') setDialog(null)
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  async function act(label: string, action: () => Promise<void>) {
    setError(''); setLoading(label)
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed') } finally { setLoading('') }
  }

  async function loadDemo() {
    await act('Preparing the commerce extraction', async () => {
      const demo = await api<Spec>('/demo')
      const next = await api<Job>('/plans', demo)
      currentId.current = next.id; setJob(next); setSpec(demo); setSourceDraft(demo.source); setScenarioText(JSON.stringify(demo.scenarios, null, 2)); setAdvice(null); setAnalysis(null); setTab('plan'); setDialog(null)
      await refreshJobs()
    })
  }

  async function reviewPlan() {
    if (!spec) return
    await act('Tracing the dependency closure', async () => {
      const scenarios = JSON.parse(scenarioText)
      if (!Array.isArray(scenarios)) throw new Error('Scenarios must be a JSON array')
      const next = await api<Job>('/plans', { ...spec, source: sourceDraft, scenarios })
      currentId.current = next.id; setJob(next); setSpec(next.request); setDialog(null); setTab('plan'); await refreshJobs()
    })
  }

  async function operation(name: 'extract' | 'validate') {
    if (!job) return
    await act(name === 'extract' ? 'Starting extraction' : 'Starting behavioral comparison', async () => {
      setJob(await api<Job>(`/jobs/${job.id}/${name}`, {}))
      if (name === 'validate') setTab('evidence')
      await refreshJobs()
    })
  }

  async function analyzeSource(useLlama = false) {
    await act(useLlama ? 'Meta Llama is inspecting the candidates' : 'Indexing Python source without executing it', async () => {
      const body = { source: sourceDraft, query }
      const result = await api<Analysis>('/analyze', body)
      setAnalysis(result)
      const sameSource = spec?.source === result.source
      setSpec(previous => ({ source: result.source, entry: result.symbols[0]?.id || '', package_name: previous?.package_name || 'slim_feature', boundaries: sameSource ? previous?.boundaries || [] : [], scenarios: sameSource ? previous?.scenarios || [] : [] }))
      if (!sameSource) setScenarioText('[]')
      if (useLlama) {
        const resultAdvice = await api<Advice>('/advise', body)
        setAdvice(resultAdvice)
        setSpec(previous => previous && ({ ...previous, entry: resultAdvice.entry_id, boundaries: resultAdvice.boundaries, advice_id: resultAdvice.id }))
      } else setAdvice(null)
    })
  }

  const plan = job?.plan
  const reduction = plan ? Math.max(0, (1 - plan.selected_lines / Math.max(plan.original_lines, 1)) * 100) : 0
  const stageIndex = job?.status === 'completed' || job?.status === 'validating' ? 4 : job?.status === 'extracted' ? 3 : 2
  const canExtract = job?.status === 'planned'
  const canValidate = !!job && ['extracted', 'completed'].includes(job.status)

  return <div className="app-shell">
    <aside className="icon-rail" aria-label="Main navigation"><a className="brand-mark" href="#" aria-label="Slim home" onClick={e => { e.preventDefault(); setDialog('help') }}><Scissors size={28} weight="bold"/></a><div className="rail-middle"><button className="rail-button selected" aria-label="Extraction workbench" onClick={() => { setTab('plan'); setDialog(null) }}><Stack size={23}/></button><button className="rail-button" aria-label="New extraction" onClick={() => setDialog('source')}><Plus size={23}/></button><button className="rail-button" aria-label="Validation evidence" onClick={() => setTab('evidence')}><Flask size={23}/></button></div><div className="rail-bottom"><button className="rail-button" aria-label="Documentation" onClick={() => setDialog('help')}><BookOpen size={22}/></button><button className="rail-button" aria-label="Engine settings" onClick={() => setDialog('settings')}><GearSix size={23}/></button><div className="user-avatar" title="Local workspace">A</div></div></aside>
    <aside className="project-sidebar"><div className="workspace-heading"><span>slim<span className="brand-period">.</span></span><span className="version">v{health?.version || '0.1.0'}</span></div><button className="workspace-picker" onClick={() => setDialog('source')}><Cube size={18}/><span>Local workspace</span><CaretRight size={13}/></button><div className="sidebar-section-label">WORKSPACE</div><button className="sidebar-link active" onClick={() => { setTab('plan'); setDialog(null) }}><BracketsCurly size={18}/> Extractions <span>{jobs.length}</span></button><button className="sidebar-link" onClick={() => setDialog('help')}><BookOpen size={18}/> How it works <ArrowSquareOut size={13}/></button><div className="sidebar-divider"/><div className="sidebar-section-label">RECENT EXTRACTIONS<button aria-label="New extraction" onClick={() => setDialog('source')}><Plus size={15}/></button></div><div className="job-list">{jobs.map(item => <button key={item.id} className={`job-item ${job?.id === item.id ? 'current' : ''}`} onClick={() => void act('Opening extraction', () => selectJob(item.id))}><FilePy size={17}/><div><strong>{item.package_name}</strong><small>{item.id.slice(0, 7)} · {item.status}</small></div>{item.status === 'completed' && <Check size={13}/>}</button>)}{!jobs.length && <p className="sidebar-empty">Your extractions will appear here.</p>}</div><div className="sidebar-demo"><div className="micro"><Lightning size={14}/> START WITH SOMETHING REAL</div><strong>One feature.<br/>Zero database baggage.</strong><p>Extract shipping logic from the included commerce monolith.</p><button onClick={() => void loadDemo()} disabled={working}>Open demo <ArrowRight size={15}/></button></div><div className="engine-status"><span className={`status-light ${health ? 'online' : ''}`}/><span>{health ? 'Local engine connected' : 'Engine disconnected'}</span><Terminal size={14}/></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><span>Workspace</span><CaretRight size={12}/><span>Extractions</span>{plan && <><CaretRight size={12}/><strong>{plan.package_name}</strong></>}</div><div className="topbar-actions"><span className="local-label"><span className="status-light online"/> LOCAL FIRST</span><button className="shortcut-button" onClick={() => setDialog('source')}><MagnifyingGlass size={16}/><span>Find a feature</span><kbd>⌘ K</kbd></button><a className="icon-button github-link" aria-label="Slim source repository" href="https://github.com/lelouchzr/language-speaking-app/tree/slim/rebuild" target="_blank" rel="noreferrer"><GithubLogo size={21}/></a></div></header>
      <main id="main-content">
        <div className="page-intro"><div><div className="eyebrow"><span className="accent-line"/> FEATURE EXTRACTION WORKBENCH</div><h1>Less repo. <span>More possibility.</span></h1><p>Take the feature you need. Leave the complexity behind.</p></div><button className="button subtle new-extraction" onClick={() => setDialog('source')}><Plus size={17}/> New extraction</button></div>
        {error && <div className="error-banner" role="alert"><Warning size={19}/><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X/></button></div>}
        {notice && <div className="notice-banner" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice"><X/></button></div>}
        {loading && <div className="loading-strip" role="status"><Spinner className="spin" size={16}/>{loading}</div>}
        {plan && job ? <>
          <section className="extraction-heading"><div className="feature-icon"><FunctionMark/></div><div><div className="micro">EXTRACTION / {job.id.slice(0, 8).toUpperCase()}</div><h2>{plan.entry.name}<span className={`status-tag ${job.status}`}>{busyStates.includes(job.status) && <Spinner className="spin" size={12}/>} {job.status}</span></h2><div className="feature-path"><GitBranch size={14}/>{plan.entry.module}<span>→</span><Package size={14}/>{plan.package_name}</div></div><div className="extraction-cta">{canExtract ? <button className="button primary" onClick={() => void operation('extract')} disabled={working}><Scissors size={17}/> Extract feature <ArrowRight size={16}/></button> : <><button className="button subtle" onClick={() => void operation('validate')} disabled={working || !canValidate}><Play size={15} weight="fill"/>{job.report ? 'Run again' : 'Compare behavior'}</button><a className={`button primary ${!canValidate ? 'disabled' : ''}`} href={canValidate ? `/api/jobs/${job.id}/download` : undefined} aria-disabled={!canValidate}><DownloadSimple size={17}/> Package</a></>}</div></section>
          <div className="stage-track" aria-label="Extraction stages">{stages.map((stage, index) => <div className={index <= stageIndex ? 'stage active' : 'stage'} key={stage}><span className="stage-number">{index < stageIndex ? <Check size={12} weight="bold"/> : `0${index + 1}`}</span><span>{stage}</span>{index < 4 && <div className="stage-connector"/>}</div>)}</div>
          <section className="metrics-row" aria-label="Extraction metrics"><div><span className="metric-label">SOURCE FOOTPRINT</span><strong>{plan.original_lines.toLocaleString()} <small>lines</small></strong><span>{plan.source_files.toLocaleString()} Python files analyzed</span></div><div><span className="metric-label">SELECTED CLOSURE</span><strong>{plan.selected_lines.toLocaleString()} <small>lines</small></strong><span>{plan.symbols.length} declarations before adaptation</span></div><div><span className="metric-label">LEFT BEHIND</span><strong className="accent-text">{reduction.toFixed(1)}<small>%</small><ArrowDown size={21}/></strong><span>Of indexed Python source lines</span></div><div><span className="metric-label">BEHAVIORAL EVIDENCE</span><strong>{job.report ? `${job.report.matched}/${job.report.cases.length}` : '—'} <small>{job.report ? 'matched' : 'pending'}</small></strong><span>{job.report ? 'Executed scenarios only' : `${job.request.scenarios.length} scenarios ready to run`}</span></div></section>
          <div className="content-tabs" role="tablist" aria-label="Extraction view">{([{ id: 'plan', label: 'Extraction plan', icon: <GitBranch size={17}/> }, { id: 'code', label: 'Source & output', icon: <Code size={17}/> }, { id: 'evidence', label: 'Behavioral evidence', icon: <Flask size={17}/> }] as const).map(item => <button role="tab" aria-selected={tab === item.id} key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}{item.label}{item.id === 'evidence' && job.report && <span className="tab-count">{job.report.cases.length}</span>}</button>)}<button className="plan-edit" onClick={() => { setSpec(job.request); setScenarioText(JSON.stringify(job.request.scenarios, null, 2)); setDialog('source') }}><GearSix size={16}/> Edit specification</button></div>
          <div role="tabpanel">{tab === 'plan' ? <><Graph key={job.id} plan={plan}/><div className="details-grid"><section className="boundary-panel"><div className="panel-heading"><div><Scissors size={18}/><h2>Make the boundary explicit.</h2></div><span className="micro">{plan.boundaries.length} ADAPTATIONS</span></div>{plan.boundaries.length ? plan.boundaries.map(boundary => <div className="boundary-detail" key={boundary.call}><div><span className="before-label">BEFORE / IMPLICIT</span><code><Database size={14}/>{boundary.call}()</code></div><ArrowRight className="boundary-arrow" size={20}/><div><span className="after-label">AFTER / INJECTED</span><code><BracketsCurly size={14}/>{boundary.parameter}</code></div><p>{boundary.description || 'An external value becomes a required keyword-only argument.'}</p></div>) : <p className="panel-description">No value injection requested. The selected dependency closure will be packaged with its current API.</p>}<div className="boundary-footer"><CheckCircle size={15}/>{job.manifest ? `${job.manifest.external_imports.length} external imports remain in the output` : 'Dependency closure is recomputed after adaptation'}</div></section><section className="activity-panel"><div className="panel-heading"><div><Clock size={18}/><h2>Activity</h2></div><span className="micro">PERSISTED</span></div><ol className="event-list">{job.events.slice(-4).map(event => <li key={event.seq}><span className="event-dot"/><div><strong>{event.message}</strong><small>{new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {event.stage}</small></div></li>)}</ol></section></div>{plan.diagnostics.length > 0 && <details className="diagnostics"><summary><Warning size={15}/>{plan.diagnostics.length} analysis notes</summary>{plan.diagnostics.map((d, i) => <p key={i}><span className={`status-tag ${d.level}`}>{d.level}</span>{d.message}</p>)}</details>}<details className="diagnostics"><summary><GitBranch size={15}/>Inspect {plan.edges.length} resolved dependency edges</summary>{plan.edges.map(([from, to]) => <p key={`${from}-${to}`}><code>{from}</code><ArrowRight size={13}/><code>{to}</code></p>)}</details></> : tab === 'code' ? <CodeViewer key={job.id} job={job}/> : <Evidence key={job.id} job={job} busy={working} onValidate={() => void operation('validate')}/>}</div>
        </> : <section className="empty-workbench"><div className="empty-symbol"><Scissors size={46} weight="light"/></div><span className="micro">FROM COUPLED TO PORTABLE</span><h2>Your next feature<br/>already exists somewhere.</h2><p>Start with the included commerce monolith, or point Slim at a Python repository of your own.</p><div><button className="button primary" onClick={() => void loadDemo()} disabled={working}><Lightning size={18}/> Open the working demo</button><button className="button subtle" onClick={() => setDialog('source')}>Choose a repository <ArrowRight size={17}/></button></div><div className="empty-proof"><span><GitBranch size={16}/> AST dependency graph</span><span><Scissors size={16}/> Explicit boundaries</span><span><Flask size={16}/> Behavioral evidence</span></div></section>}
        <footer className="workbench-footer"><span><Scissors size={13}/> SLIM · CODE THAT TRAVELS</span><span>{health?.model_enabled ? `Meta Llama available · ${health.model}` : 'Static analysis · optional Meta Llama'}<span className="footer-dot">·</span>{health?.runner || 'local'} runner</span></footer>
      </main>
    </div>
    {dialog && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null) }}><section className={`modal ${dialog === 'source' ? 'source-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={21}/></button>{dialog === 'source' && spec ? <><div className="eyebrow">EXTRACTION SPECIFICATION</div><h2 id="dialog-title">Find your next feature.</h2><p className="modal-description">Select a local Python repository or a public GitHub URL. Source analysis does not execute code.</p><label className="field-label" htmlFor="source">SOURCE REPOSITORY</label><input id="source" value={sourceDraft} onChange={e => setSourceDraft(e.target.value)} placeholder="https://github.com/owner/repository"/><label className="field-label" htmlFor="query">WHAT DO YOU WANT TO EXTRACT?</label><input id="query" ref={queryRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. shipping fee calculation"/><div className="form-actions"><button className="button subtle" onClick={() => void analyzeSource()} disabled={working}><MagnifyingGlass size={17}/> Analyze source</button><button className="button primary" onClick={() => void analyzeSource(true)} disabled={working || !health?.model_enabled}><Sparkle size={17}/> Ask Meta Llama</button></div>{loading && <p className="form-loading" role="status"><Spinner className="spin" size={16}/>{loading}</p>}{error && <p className="error-inline" role="alert">{error}</p>}{advice && <div className="advice-box"><span className="micro"><Sparkle size={14}/> {advice.provider} · {advice.model}</span><p>{advice.explanation}</p>{advice.warnings.map((warning, i) => <p key={i} className="muted">{warning}</p>)}</div>}
      <div className="spec-grid"><div><label className="field-label" htmlFor="entry">ENTRY POINT</label>{analysis ? <select id="entry" value={spec.entry} onChange={e => setSpec({ ...spec, entry: e.target.value, advice_id: null })}>{analysis.symbols.map(symbol => <option key={symbol.id} value={symbol.id}>{symbol.id}</option>)}{advice && !analysis.symbols.some(s => s.id === advice.entry_id) && <option value={advice.entry_id}>{advice.entry_id}</option>}</select> : <input id="entry" value={spec.entry} onChange={e => setSpec({ ...spec, entry: e.target.value, advice_id: null })}/>}</div><div><label className="field-label" htmlFor="package">OUTPUT PACKAGE</label><input id="package" value={spec.package_name} onChange={e => setSpec({ ...spec, package_name: e.target.value })}/></div></div>
      <div className="field-label boundary-form-title">BOUNDARY ADAPTATIONS<button className="text-button" onClick={() => setSpec({ ...spec, boundaries: [...spec.boundaries, { call: '', parameter: '', description: '' }] })}><Plus size={13}/> Add boundary</button></div>{spec.boundaries.map((boundary, index) => <div className="boundary-form" key={index}><input aria-label={`Boundary call ${index + 1}`} value={boundary.call} placeholder="db.load_rules" onChange={e => setSpec({ ...spec, boundaries: spec.boundaries.map((b, i) => i === index ? { ...b, call: e.target.value } : b) })}/><ArrowRight size={17}/><input aria-label={`Injected parameter ${index + 1}`} value={boundary.parameter} placeholder="rules" onChange={e => setSpec({ ...spec, boundaries: spec.boundaries.map((b, i) => i === index ? { ...b, parameter: e.target.value } : b) })}/><button className="icon-button" aria-label={`Remove boundary ${index + 1}`} onClick={() => setSpec({ ...spec, boundaries: spec.boundaries.filter((_, i) => i !== index) })}><X size={16}/></button></div>)}<details className="scenario-editor"><summary><Flask size={15}/> Behavioral scenarios · JSON</summary><p>Inputs are sent to both versions. Use candidate_kwargs for injected values and setup for original module fixture state.</p><textarea aria-label="Behavioral scenarios JSON" spellCheck={false} rows={9} value={scenarioText} onChange={e => { setScenarioText(e.target.value); try { if (!Array.isArray(JSON.parse(e.target.value))) throw new Error(); setScenarioError('') } catch { setScenarioError('Enter a valid JSON array of scenarios.') } }}/>{scenarioError && <p className="error-inline">{scenarioError}</p>}</details><div className="modal-footer"><button className="text-button" onClick={() => void loadDemo()} disabled={working}>Use commerce demo</button><button className="button primary" onClick={() => void reviewPlan()} disabled={working || !!scenarioError || !spec.entry}>Review extraction plan <ArrowRight size={16}/></button></div></> : dialog === 'settings' ? <><div className="eyebrow">ENGINE CONFIGURATION</div><h2 id="dialog-title">Your code stays local.</h2><p className="modal-description">Settings are configured on the server through environment variables.</p><dl className="settings-list"><dt>Version</dt><dd>{health?.version || 'Disconnected'}</dd><dt>Runner</dt><dd>{health?.runner || '—'} · process isolation</dd><dt>Arbitrary local execution</dt><dd>{health?.execution_enabled ? 'Explicitly enabled' : 'Disabled; included demo allowed'}</dd><dt>Meta Llama</dt><dd>{health?.model_enabled ? health.model : 'Disabled'}</dd><dt>Workspace</dt><dd>{health?.workspace || '—'}</dd></dl><div className="command-block"><code>SLIM_MODEL_ENABLED=1 make dev</code><button className="icon-button" aria-label="Copy launch command" onClick={() => void navigator.clipboard.writeText('SLIM_MODEL_ENABLED=1 make dev').then(() => setNotice('Launch command copied')).catch(() => setNotice('Select the command to copy it.'))}><Code size={17}/></button></div><p className="muted">Local subprocesses are not a security sandbox. Use trusted repositories. Docker mode provides additional limits.</p></> : <><div className="eyebrow">THE SLIM WORKFLOW</div><h2 id="dialog-title">Move the feature.<br/>Keep the evidence.</h2><p className="modal-description">Slim extracts module-level Python functions and classes into a portable package. Every dependency and adaptation is inspectable.</p><ol className="help-steps">{[['Locate', 'Search an AST index or ask Meta Llama to rank candidates.'], ['Delimit', 'Review the transitive dependency closure and analysis notes.'], ['Decouple', 'Replace zero-argument external lookups with explicit values.'], ['Package', 'Generate Python source, provenance, scenarios and license copies.'], ['Compare', 'Run the original and extracted feature on the same scenarios.']].map(([title, text], i) => <li key={title}><span>0{i + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol><p className="muted">Matching scenarios are evidence, not a general proof of equivalence. Dynamic Python and framework-heavy extractions may need manual work.</p><button className="button primary" onClick={() => void loadDemo()} disabled={working}>Try the working demo <ArrowRight size={16}/></button></>}</section></div>}
  </div>
}

function FunctionMark() { return <span aria-hidden="true">ƒ</span> }
