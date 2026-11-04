import { useState } from 'react'
import { Database, FilePy, Function as FunctionIcon, Package, ArrowRight } from '@phosphor-icons/react'
import type { Plan, SymbolInfo } from '../types'

export function Graph({ plan }: { plan: Plan }) {
  const [selected, setSelected] = useState<SymbolInfo | null>(null)
  const entry = plan.entry
  const dependencies = plan.symbols.filter(s => s.id !== entry.id && s.kind !== 'import').slice(0, 8)
  const adapted = plan.boundaries.length > 0
  return <div className="graph-wrap">
    <div className="graph-toolbar"><span className="micro">DEPENDENCY CLOSURE</span><span className="graph-legend"><i /> retained <i className="boundary-dot" /> boundary</span></div>
    <div className="graph-canvas">
      <div className="graph-flow">
        <div className="graph-column"><div className="graph-node source-node"><FilePy size={22}/><div><span className="micro">SOURCE REPOSITORY</span><strong>{plan.source.split('/').at(-1)}</strong><small>{plan.source_files.toLocaleString()} Python files</small></div></div></div>
        <ArrowRight className="graph-arrow" size={24}/>
        <div className="graph-column graph-middle">
          <button className="graph-node entry-node" onClick={() => setSelected(entry)}><FunctionIcon size={22}/><div><span className="micro">ENTRY POINT</span><strong>{entry.name}</strong><small>{entry.module}</small></div></button>
          <div className="graph-branches">{dependencies.map(symbol => <button key={symbol.id} className="graph-node dependency-node" onClick={() => setSelected(symbol)}><span className="node-port"/><span><strong>{symbol.name}</strong><small>{symbol.kind} · L{symbol.line}</small></span></button>)}</div>
        </div>
        <ArrowRight className="graph-arrow" size={24}/>
        <div className="graph-column"><div className="graph-node output-node"><Package size={24}/><div><span className="micro">TARGET PACKAGE</span><strong>{plan.package_name}</strong><small>Explicit, portable API</small></div></div>{adapted && <div className="boundary-node"><Database size={18}/><div><s>{plan.boundaries[0].call}()</s><strong>→ {plan.boundaries[0].parameter}</strong><small>Replaced during extraction</small></div></div>}</div>
      </div>
    </div>
    <div className="graph-caption">{selected ? <><strong>{selected.name}</strong><span>{selected.docstring || selected.signature || `${selected.path}:${selected.line}`}</span><button className="text-button" onClick={() => setSelected(null)}>Close</button></> : <><span>{plan.edges.length} dependency edges · {plan.symbols.length} declarations in the original closure</span><span>Click a declaration to inspect</span></>}</div>
  </div>
}
