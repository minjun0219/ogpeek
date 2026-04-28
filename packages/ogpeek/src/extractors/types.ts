// Shared shape for everything that consumes the htmlparser2 stream inside
// scanHead. The orchestrator handles the inHead bookkeeping; each extractor
// reads the flag from `state` and decides whether the event belongs to it.
//
// Splitting the head scan into focused extractors keeps the giant switch
// inside meta.ts from growing every time we add a new "auxiliary" signal
// (icons, JSON-LD, application-name, ...).

export type ScanState = {
  inHead: boolean;
  done: boolean;
};

export interface HeadExtractor {
  onOpenTag?(
    name: string,
    attrs: Record<string, string>,
    state: ScanState,
  ): void;
  onText?(text: string, state: ScanState): void;
  onCloseTag?(name: string, state: ScanState): void;
}
