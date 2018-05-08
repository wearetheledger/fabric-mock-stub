import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';

export class MockProtoTimestamp extends Timestamp {
    seconds: number;
    nanos: number;

    constructor() {
        super();
        this.seconds = Math.floor(Date.now() / 1000);
    }

    getSeconds() {
        return this.seconds;
    }

    toDate() {
        return new Date(this.seconds);
    }
}