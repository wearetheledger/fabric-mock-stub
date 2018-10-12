import { ChaincodeError } from './ChaincodeError';
import { Transform } from './utils/datatransform';
import { ChaincodeMockStub } from './ChaincodeMockStub';
import { Helpers } from './utils/helpers';
import { ChaincodeStub, ChaincodeResponse, ChaincodeProposal } from 'fabric-shim';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';

export {
    ChaincodeError,
    Transform,
    ChaincodeMockStub,
    Helpers
};

export interface KeyModificationItem {
    is_delete: boolean;
    value: Object;
    timestamp: number;
    tx_id: string;
}

export interface KV {
    key: string;
    value: any;
}

export interface MockStub {
    mockTransactionStart(txid: string): void;

    mockTransactionEnd(uuid: string): void;

    mockInit(uuid: string, args: string[]): Promise<ChaincodeResponse>;

    mockInvoke(uuid: string, args: string[]): Promise<ChaincodeResponse>;

    mockPeerChaincode(invokableChaincodeName: string, otherStub: MockStub): void;

    mockInvokeWithSignedProposal(uuid: string, args: string[], sp: ChaincodeProposal.SignedProposal): Promise<ChaincodeResponse>;

    setSignedProposal(sp: ChaincodeProposal.SignedProposal): void;

    setTxTimestamp(timestamp: Timestamp): void;
}