export type Path = readonly (string | number)[];
export interface RecordKey { collection: string; id: string }
/** Structural typing accepts Astro CollectionEntry without importing Astro at runtime. */
export interface Entry extends RecordKey { data?: unknown; body?: string }
export interface Address { owner: RecordKey; part: 'data' | 'body'; path: Path }
export type MarkerAttributes = Readonly<Record<string, string>>;
export interface FieldOptions { mode?: 'inline' | 'panel' }
export function editorBuild(): boolean;
export function address(entry: Entry | RecordKey | Address, path?: string | Path, part?: 'data' | 'body'): Address;
export function at(base: Address, ...parts: (string | number)[]): Address;
export function record(entry: Entry | RecordKey | Address): MarkerAttributes;
export function field(entry: Entry | RecordKey, path: string | Path, options?: FieldOptions): MarkerAttributes;
export function field(address: Address, options?: FieldOptions): MarkerAttributes;
export function media(entry: Entry | RecordKey, path: string | Path): MarkerAttributes;
export function media(address: Address): MarkerAttributes;
export function blocks(entry: Entry | RecordKey, path: string | Path): MarkerAttributes;
export function blocks(address: Address): MarkerAttributes;
export function body(entry: Entry | RecordKey): MarkerAttributes;
export function item(entry: Entry | RecordKey, options: { entry?: string | Path | Address; occurrence: string }): MarkerAttributes;
export function order(collection: string, field: string | Path): MarkerAttributes;
export function uses(entry: Entry | RecordKey, paths: readonly (string | Path | Address)[]): MarkerAttributes;
export function color(entry: Entry | RecordKey, path: string | Path, cssVar: string): MarkerAttributes;
export function color(address: Address, cssVar: string): MarkerAttributes;
export function merge(...attributes: MarkerAttributes[]): MarkerAttributes;
