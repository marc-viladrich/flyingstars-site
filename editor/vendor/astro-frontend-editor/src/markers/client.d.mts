import type { Address, RecordKey, Path } from './index.mjs';
export interface Marker {
  v: 1;
  kind: 'record' | 'field' | 'media' | 'blocks' | 'body' | 'color' | 'uses' | 'order' | 'item';
  address?: Address;
  rendered?: RecordKey;
  membership?: Address;
  occurrence?: string;
  collection?: string;
  path?: Path;
  addresses?: Address[];
  mode?: 'inline' | 'panel';
  cssVar?: string;
}
export interface MarkerGroup { v: 1; markers: Marker[] }
export interface Binding { address: Address; kind: Marker['kind'] | 'entry' }
export interface Occurrence { node: Element; identity: Marker }
export function decodeMarker(input: unknown): Marker | MarkerGroup | null;
export function markersOf(element: Element | null): Marker[];
export function elementMarkers(element: Element | null): Binding[];
export function renderedFields(root: Element | Document): Binding[];
export function occurrenceOf(element: Element | null): Occurrence | null;
export function sameOccurrence(a: Marker | Occurrence | null, b: Marker | Occurrence | null): boolean;
export function occurrenceMarkers(root: Element | Document, occurrence: Marker | Occurrence | null): Binding[];
