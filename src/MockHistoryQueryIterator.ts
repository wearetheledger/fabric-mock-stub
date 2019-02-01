import { Iterators } from 'fabric-shim';

/**
 * @hidden
 */
export class MockHistoryQueryIterator implements Iterators.HistoryQueryIterator {

    private currentLoc = 0;
    private closed = false;

    constructor(private data: Iterators.KeyModification[], public txID: string) {
    }

    get response() {
        return {
            results: this.data,
            has_more: this.data.length - (this.currentLoc + 1) >= 0,
            metadata: Buffer.from(''),
            id: 'mockId'
        };
    }

    next(): Promise<Iterators.NextKeyModificationResult> {

        if (this.closed) {
            throw new Error('Iterator has already been closed');
        }

        this.currentLoc++;

        return Promise.resolve({
            value: this.data[this.currentLoc - 1],
            done: this.data.length <= this.currentLoc
        });
    }

    async close(): Promise<void> {
        this.closed = true;
    }

    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    off(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    removeAllListeners(event?: string | symbol): this {
        throw new Error('Method not implemented.');
    }
    setMaxListeners(n: number): this {
        throw new Error('Method not implemented.');
    }
    getMaxListeners(): number {
        throw new Error('Method not implemented.');
    }
    listeners(event: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    rawListeners(event: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    emit(event: string | symbol, ...args: any[]): boolean {
        throw new Error('Method not implemented.');
    }
    eventNames(): (string | symbol)[] {
        throw new Error('Method not implemented.');
    }
    listenerCount(type: string | symbol): number {
        throw new Error('Method not implemented.');
    }

}