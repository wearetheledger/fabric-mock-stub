import { Iterators } from 'fabric-shim';

export class MockKeyValue implements Iterators.KV {

    constructor(public key: string, public value: Buffer) {
    }

    getKey(): string {
        return this.key;
    }
    getValue(): Buffer {
        return this.value;
    }
}