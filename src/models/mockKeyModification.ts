import { Iterators } from 'fabric-shim';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { MockProtoTimestamp } from '../MockProtoTimestamp';

export class MockKeyModification implements Iterators.KeyModification {

    public timestamp: Timestamp;

    // tslint:disable-next-line:variable-name
    constructor(public is_delete: boolean, public value: Buffer, public tx_id: string) {
        this.timestamp = new MockProtoTimestamp();
    }

    getIsDelete(): boolean {
        return this.is_delete;
    }
    getValue(): Buffer {
        return this.value;
    }
    getTimestamp(): Timestamp {
        return this.timestamp;
    }
    getTxId(): string {
        return this.tx_id;
    }
}