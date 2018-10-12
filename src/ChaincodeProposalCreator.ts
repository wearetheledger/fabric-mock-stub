import { SerializedIdentity } from 'fabric-shim';

/**
 * @hidden
 */
export class ChaincodeProposalCreator implements SerializedIdentity {
    // tslint:disable-next-line:variable-name
    id_bytes: Buffer;

    [fieldName: string]: any;
    mspid: string;

    constructor(private mspId: string, private signingId: string) {
        this.id_bytes = Buffer.from(signingId);
    }

    getMspid(): string {
        return this.mspId;
    }

    getIdBytes(): Buffer {
        return this.id_bytes;
    }
}