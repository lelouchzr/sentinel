export interface Boundary { call: string; parameter: string; description: string }
export interface Scenario { name: string; args: unknown[]; kwargs: Record<string, unknown>; candidate_kwargs: Record<string, unknown>; setup: Record<string, unknown> }
export interface Spec { source: string; entry: string; package_name: string; boundaries: Boundary[]; scenarios: Scenario[]; advice_id?: string | null }
export interface SymbolInfo { id: string; name: string; module: string; path: string; line: number; end_line: number; kind: string; signature: string; docstring: string; dependencies: string[] }
export interface Diagnostic { level: 'info' | 'warning' | 'error'; code: string; message: string; symbol?: string }
export interface Plan { source: string; entry: SymbolInfo; package_name: string; symbols: SymbolInfo[]; edges: [string, string][]; external_dependencies: string[]; diagnostics: Diagnostic[]; boundaries: Boundary[]; original_lines: number; selected_lines: number; source_files: number; source_commit: string | null; repository_url: string | null; source_name: string; licenses: string[]; provider: string; advice: string }
export interface Outcome { status: string; value: unknown; exception: string | null; message: string; duration_ms: number }
export interface CaseResult { name: string; status: 'matched' | 'diverged' | 'unverified'; original: Outcome; candidate: Outcome }
export interface Report { status: string; matched: number; diverged: number; unverified: number; runner: string; scope: string; cases: CaseResult[] }
export interface Event { seq: number; time: string; stage: string; message: string }
export interface Job { id: string; status: string; created_at: string; request: Spec; plan: Plan; report: Report | null; manifest: { external_imports: string[]; files: { source: string; generated: string }[] } | null; error: string | null; events: Event[] }
export interface JobSummary { id: string; name: string; package_name: string; status: string; created_at: string }
export interface Analysis { source: string; files: number; lines: number; symbols: SymbolInfo[]; diagnostics: Diagnostic[] }
export interface Health { version: string; model_enabled: boolean; model: string; runner: string; execution_enabled: boolean; workspace: string }
export interface Advice { id: string; entry_id: string; explanation: string; boundaries: Boundary[]; warnings: string[]; model: string; provider: string }
