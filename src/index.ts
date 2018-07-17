import { ChaincodeError } from './ChaincodeError';
import { Transform } from './utils/datatransform';
import { ChaincodeMockStub } from './ChaincodeMockStub';
import { Helpers } from './utils/helpers';

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