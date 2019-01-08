import { SerializedIdentity } from 'fabric-shim';

/**
 * @hidden
 */
export class ChaincodeProposalCreator implements SerializedIdentity {
    // tslint:disable-next-line:variable-name
    id_bytes: any;

    [fieldName: string]: any;
    mspid: string;

    constructor(private mspId: string, private signingId: string) {
       this.id_bytes = Buffer.from(signingId);
       // fabric-shim 1.3 makes a call to  toBuffer() in ClientIdentity constructor. We need to add this function to the id_bytes.
       this.id_bytes.toBuffer = function() { return this; };
    }

    getMspid(): string {
        return this.mspId;
    }

    getIdBytes(): any {
        return this.id_bytes;
    }
}
