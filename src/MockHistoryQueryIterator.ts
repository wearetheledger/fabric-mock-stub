import { Iterators, KeyModification, NextKeyModificationResult } from 'fabric-shim';

/**
 * @hidden
 */
export class MockHistoryQueryIterator implements Iterators.HistoryQueryIterator {

    private currentLoc = 0;
    private closed = false;

    constructor(private data: KeyModification[]) {
    }

    next(): Promise<NextKeyModificationResult> {

        if (this.closed) {
            throw new Error('Iterator has already been closed');
        }

        this.currentLoc++;

        return Promise.resolve({
            value: this.data[this.currentLoc - 1],
            done: this.data.length <= this.currentLoc
        });
    }

    close(): void {
        this.closed = true;
    }

}