import * as queryEngine from '@theledger/couchdb-query-engine';
import {
    ChaincodeInterface, ChaincodeProposal, ChaincodeResponse, ChaincodeStub, Iterators, SplitCompositekey,
    StateQueryResponse
} from 'fabric-shim';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { LoggerInstance } from 'winston';
import { KV, MockStub } from '.';
import { ChaincodeError } from './ChaincodeError';
import { ChaincodeProposalCreator } from './ChaincodeProposalCreator';
import { CompositeKeys } from './CompositeKeys';
import { MockHistoryQueryIterator } from './MockHistoryQueryIterator';
import { MockStateQueryIterator } from './MockStateQueryIterator';
import { MockKeyModification } from './models/mockKeyModification';
import { MockKeyValue } from './models/mockKeyValue';
import { Transform } from './utils/datatransform';
import { Helpers } from './utils/helpers';

const defaultUserCert = '-----BEGIN CERTIFICATE-----' +
    'MIIB6TCCAY+gAwIBAgIUHkmY6fRP0ANTvzaBwKCkMZZPUnUwCgYIKoZIzj0EAwIw' +
    'GzEZMBcGA1UEAxMQZmFicmljLWNhLXNlcnZlcjAeFw0xNzA5MDgwMzQyMDBaFw0x' +
    'ODA5MDgwMzQyMDBaMB4xHDAaBgNVBAMTE015VGVzdFVzZXJXaXRoQXR0cnMwWTAT' +
    'BgcqhkjOPQIBBggqhkjOPQMBBwNCAATmB1r3CdWvOOP3opB3DjJnW3CnN8q1ydiR' +
    'dzmuA6A2rXKzPIltHvYbbSqISZJubsy8gVL6GYgYXNdu69RzzFF5o4GtMIGqMA4G' +
    'A1UdDwEB/wQEAwICBDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBTYKLTAvJJK08OM' +
    'VGwIhjMQpo2DrjAfBgNVHSMEGDAWgBTEs/52DeLePPx1+65VhgTwu3/2ATAiBgNV' +
    'HREEGzAZghdBbmlscy1NYWNCb29rLVByby5sb2NhbDAmBggqAwQFBgcIAQQaeyJh' +
    'dHRycyI6eyJhdHRyMSI6InZhbDEifX0wCgYIKoZIzj0EAwIDSAAwRQIhAPuEqWUp' +
    'svTTvBqLR5JeQSctJuz3zaqGRqSs2iW+QB3FAiAIP0mGWKcgSGRMMBvaqaLytBYo' +
    '9v3hRt1r8j8vN0pMcg==' +
    '-----END CERTIFICATE-----';

/**
 * Mock implementation of the fabric-shim stub
 */

export type StateMap = Map<string, Buffer>;

export class ChaincodeMockStub implements MockStub, ChaincodeStub {
    private logger: LoggerInstance;

    private txTimestamp: Timestamp;
    private txID = '';
    private args: string[];
    public state: StateMap = new Map();
    public transientMap: StateMap = new Map();
    public privateCollections: Map<string, StateMap> = new Map();
    public event: Map<string, Buffer> = new Map();
    public history: Map<string, Iterators.KeyModification[]> = new Map();
    private invokables: Map<string, MockStub> = new Map();
    private signedProposal: ChaincodeProposal.SignedProposal;
    private mspId = 'dummymspId';

    /**
     * @param {string} name - Name of the mockstub
     * @param {ChaincodeInterface} cc - Your chaincode
     * @param {string} [usercert] - User creds certificate with/without attributes
     */
    constructor(private name: string, private cc: ChaincodeInterface, private usercert: string = defaultUserCert) {
        this.logger = Helpers.getLoggerInstance(this.name);
    }

    /**
     * @returns {string}
     */
    getTxID(): string {
        return this.txID;
    }

    /**
     * Get the current arguments
     *
     * @returns {string[]}
     */
    getArgs(): string[] {
        return this.args;
    }

    getSignedProposal() {
        return this.signedProposal;
    }

    mockInvokeWithSignedProposal(uuid: string, args: string[], sp: ChaincodeProposal.SignedProposal): Promise<ChaincodeResponse> {
        this.setSignedProposal(sp);

        return this.mockInvoke(uuid, args);
    }

    setSignedProposal(sp: ChaincodeProposal.SignedProposal): void {
        this.signedProposal = sp;
    }

    /**
     * Same as getArgs()
     *
     * @returns {string[]}
     */
    getStringArgs(): string[] {
        return this.args;
    }

    /**
     * @returns {{params: string[]; fcn: string}}
     */
    getFunctionAndParameters(): { params: string[]; fcn: string } {

        const params = this.getStringArgs();
        let fcn = '';

        if (params.length >= 1) {
            fcn = params[0];
            params.splice(0, 1);
        }

        return {
            fcn,
            params,
        };
    }

    /**
     * Used to indicate to a chaincode that it is part of a transaction.
     * This is important when chaincodes invoke each other.
     * MockStub doesn't support concurrent transactions at present.
     *
     * @param {string} txid
     * @param transientMap
     */
    mockTransactionStart(txid: string, transientMap?: StateMap): void {
        this.txID = txid;
        this.setChaincodeProposal(<ChaincodeProposal.SignedProposal>{});
        this.setTxTimestamp(new Timestamp());
        this.transientMap = transientMap;
    }

    /**
     * End a mocked transaction, clearing the UUID.
     *
     * @param {string} uuid
     */
    mockTransactionEnd(uuid: string): void {
        this.signedProposal = null;
        this.txID = '';
        this.transientMap = new Map();
    }

    /**
     * Register a peer chaincode with this MockStub
     * invokableChaincodeName is the name or hash of the peer
     * otherStub is a MockStub of the peer, already intialised
     *
     * @param {string} invokableChaincodeName
     * @param {"fabric-shim".MockStub} otherStub
     */
    mockPeerChaincode(invokableChaincodeName: string, otherStub: MockStub): void {
        this.invokables[invokableChaincodeName] = otherStub;
    }

    /**
     * Initialise this chaincode,  also starts and ends a transaction.
     *
     * @param {string} uuid
     * @param {string[]} args
     * @param transientMap
     * @returns {Promise<"fabric-shim".ChaincodeResponse>}
     */
    async mockInit(uuid: string, args: string[], transientMap?: StateMap): Promise<ChaincodeResponse> {
        this.args = args;
        this.mockTransactionStart(uuid, transientMap);
        const res = await this.cc.Init(this);
        this.mockTransactionEnd(uuid);
        return res;
    }

    /**
     * Invoke this chaincode, also starts and ends a transaction.
     *
     * @param {string} uuid
     * @param {string[]} args
     * @param transientMap
     * @returns {Promise<"fabric-shim".ChaincodeResponse>}
     */
    async mockInvoke(uuid: string, args: string[], transientMap?: StateMap): Promise<ChaincodeResponse> {
        this.args = args;
        this.mockTransactionStart(uuid, transientMap);
        const res = await this.cc.Invoke(this);
        this.mockTransactionEnd(uuid);
        return res;
    }

    /**
     * InvokeChaincode calls a peered chaincode.
     *
     * @param {string} chaincodeName
     * @param {Buffer[]} args
     * @param {string} channel
     * @returns {Promise<"fabric-shim".ChaincodeResponse>}
     */
    async invokeChaincode(chaincodeName: string, args: string[], channel: string): Promise<ChaincodeResponse> {
        // Internally we use chaincode name as a composite name
        if (channel != '') {
            chaincodeName = chaincodeName + '/' + channel;
        }

        const otherStub = this.invokables[chaincodeName];

        if (!otherStub) {
            throw new Error(`Chaincode ${chaincodeName} could not be found. Please create this using mockPeerChaincode.`);
        }

        return await otherStub.mockInvoke(this.txID, args);
    }

    /**
     * Invoke this chaincode, also starts and ends a transaction.
     *
     * @param {string} uuid
     * @param {string[]} args
     * @param {"fabric-shim".ChaincodeProposal.SignedProposal} sp
     * @returns {Promise<"fabric-shim".ChaincodeResponse>}
     */
    async mockInvokeWithChaincodeProposal(uuid: string, args: string[], sp: ChaincodeProposal.SignedProposal): Promise<ChaincodeResponse> {
        this.args = args;
        this.mockTransactionStart(uuid);
        this.signedProposal = sp;
        const res = await this.cc.Invoke(this);
        this.mockTransactionEnd(uuid);
        return res;
    }

    /**
     * Get a stored value for this key in the local state
     *
     * @param {string} key
     * @returns {Promise<Buffer>}
     */
    getState(key: string): Promise<Buffer> {
        if (!this.state[key]) {
            return Promise.resolve(Buffer.from(''));
        }
        return Promise.resolve(this.state[key]);
    }

    /**
     * Store a value for this key in the local state
     *
     * @param {string} key
     * @param value
     * @returns {Promise<Buffer>}
     */
    putState(key: string, value: Buffer): Promise<any> {
        if (this.txID == '') {
            return Promise.reject(new Error('Cannot putState without a transaction - call stub.mockTransactionStart()!'));
        }

        this.state[key] = value;

        if (!this.history[key]) {
            this.history[key] = [];
        }

        this.history[key].push(new MockKeyModification(false, value, this.txID));

        return Promise.resolve();
    }

    /**
     * DelState removes the specified `key` and its value from the ledger.
     *
     * @param {string} key
     * @returns {Promise<any>}
     */
    deleteState(key: string): Promise<any> {
        const value = this.state[key];

        this.history[key].push(new MockKeyModification(true, value, this.txID));

        delete this.state[key];

        return Promise.resolve();
    }

    /**
     * Get state by range of keys, empty keys will return everything
     *
     * @param {string} startKey
     * @param {string} endKey
     * @returns {Promise<"fabric-shim".Iterators.StateQueryIterator>}
     */
    getStateByRange(startKey: string, endKey: string): Promise<Iterators.StateQueryIterator> {

        const items: Iterators.KV[] = Object.keys(this.state)
            .filter((k: string) => {
                const comp1 = Helpers.strcmp(k, startKey);
                const comp2 = Helpers.strcmp(k, endKey);

                return (comp1 >= 0 && comp2 <= 0) || (startKey == '' && endKey == '');
            })
            .map((k: string) => new MockKeyValue(k, this.state[k]));

        return Promise.resolve(new MockStateQueryIterator(items, this.txID));

    }

    // tslint:disable-next-line:max-line-length
    getStateByRangeWithPagination(startKey: string, endKey: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        throw new Error('Method not implemented.');
    }

    // tslint:disable-next-line:max-line-length
    getStateByPartialCompositeKeyWithPagination(objectType: string, attributes: string[], pageSize: number, bookmark?: string): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        throw new Error('Method not implemented.');
    }

    getQueryResultWithPagination(query: string, pageSize: number, bookmark?: string): Promise<StateQueryResponse<Iterators.StateQueryIterator>> {
        throw new Error('Method not implemented.');
    }

    /**
     *
     * GetQueryResult function can be invoked by a chaincode to perform a
     * rich query against state database.  Only supported by state database implementations
     * that support rich query.  The query string is in the syntax of the underlying
     * state database. An iterator is returned which can be used to iterate (next) over
     * the query result set.
     *
     * Blog post on writing rich queries -
     * https://medium.com/wearetheledger/hyperledger-fabric-couchdb-fantastic-queries-and-where-to-find-them-f8a3aecef767
     *
     * @param {string} query
     * @returns {Promise<"fabric-shim".Iterators.StateQueryIterator>}
     */
    getQueryResult(query: string): Promise<Iterators.StateQueryIterator> {

        const keyValues: any = {};

        Object.keys(this.state)
            .forEach(k => {
                keyValues[k] = Transform.bufferToObject(this.state[k]);
            });

        let parsedQuery: any;

        try {
            parsedQuery = JSON.parse(query);
        } catch (err) {
            throw new ChaincodeError('Error parsing query, should be string');
        }

        if (parsedQuery.sort) {
            this.logger.warn('Sorting might work using the mockstub, but on a live network you need to add an index to CouchDB');
        }

        const items = queryEngine.parseQuery(keyValues, parsedQuery)
            .map((item: KV) => new MockKeyValue(item.key, Transform.serialize(item.value)));

        return Promise.resolve(new MockStateQueryIterator(items, this.txID));
    }

    /**
     * Retrieve state by partial keys
     *
     * @param {string} objectType
     * @param {string[]} attributes
     * @returns {Promise<"fabric-shim".Iterators.StateQueryIterator>}
     */
    getStateByPartialCompositeKey(objectType: string, attributes: string[]): Promise<Iterators.StateQueryIterator> {
        const partialCompositeKey = CompositeKeys.createCompositeKey(objectType, attributes);

        return this.getStateByRange(partialCompositeKey, partialCompositeKey + CompositeKeys.MAX_UNICODE_RUNE_VALUE);
    }

    createCompositeKey(objectType: string, attributes: string[]): string {
        return CompositeKeys.createCompositeKey(objectType, attributes);
    }

    splitCompositeKey(compositeKey: string): SplitCompositekey {
        return CompositeKeys.splitCompositeKey(compositeKey);
    }

    getChaincodeProposal(): ChaincodeProposal.SignedProposal {
        return this.signedProposal;
    }

    setChaincodeProposal(sp: ChaincodeProposal.SignedProposal): void {
        this.signedProposal = sp;
    }

    setTxTimestamp(t: Timestamp): void {
        this.txTimestamp = t;
    }

    getTxTimestamp(): Timestamp {
        if (this.txTimestamp == null) {
            throw new Error('TxTimestamp not set.');
        }
        return this.txTimestamp;
    }

    /**
     * Store a mspId of the transaction's creator
     *
     * @param {string} mspId
     * @returns {void}
     */
    setCreator(mspId: string): void {
        this.mspId = mspId;
    }

    getCreator(): ChaincodeProposalCreator {
        return new ChaincodeProposalCreator(this.mspId, this.usercert);
    }

    /**
     * GetHistory for key
     *
     * @param {string} key
     * @returns {Promise<"fabric-shim".Iterators.HistoryQueryIterator>}
     */
    getHistoryForKey(key: string): Promise<Iterators.HistoryQueryIterator> {
        return Promise.resolve(new MockHistoryQueryIterator(this.history[key]));
    }

    /**
     * @todo Implement
     * @returns {string}
     */
    getBinding(): string {
        return undefined;
    }

    /**
     * Returns mocked transient values. These need to be set using the mockInvoke or mockTransactionStart
     *
     * @returns {Map<string, Buffer>}
     */
    getTransient(): StateMap {
        return this.transientMap;
    }

    /**
     * Store the payload corresponding to an event name to the local event map
     *
     * @param {string} name
     * @param {Buffer} payload
     */
    setEvent(name: string, payload: Buffer): Promise<any> {
        if (this.txID == '') {
            return Promise.reject(new Error('Cannot putState without a transaction - call stub.mockTransactionStart()!'));
        }

        this.event[name] = payload;

        return Promise.resolve();
    }

    /**
     * Get the stored payload for an event name in the local event map
     *
     * @returns {Promise<Buffer>}
     * @param name
     */
    getEvent(name: string): Promise<Buffer> {
        return this.event[name];
    }

    /**
     * @todo Implement
     *
     * @returns {string}
     */
    getChannelID(): string {
        return undefined;
    }

    /**
     * Get a stored value for this key in the local state
     *
     * @param collection
     * @param {string} key
     * @returns {Promise<Buffer>}
     */
    getPrivateData(collection: string, key: string): Promise<Buffer> {
        return (this.privateCollections[collection] || {})[key];
    }

    /**
     * Store a value for this key in the local state
     *
     * @param collection
     * @param {string} key
     * @param value
     * @returns {Promise<Buffer>}
     */
    putPrivateData(collection: string, key: string, value: Buffer): Promise<any> {
        if (this.txID == '') {
            return Promise.reject('Cannot putState without a transaction - call stub.mockTransactionStart()!');
        }

        if (!this.privateCollections[collection]) {
            this.privateCollections[collection] = new Map();
        }

        this.privateCollections[collection][key] = value;

        return Promise.resolve();
    }

    /**
     * DelState removes the specified `key` and its value from the ledger.
     *
     * @param collection
     * @param {string} key
     * @returns {Promise<any>}
     */
    deletePrivateData(collection: string, key: string): Promise<any> {
        const value = (this.privateCollections[collection] || {})[key];

        if (value) {
            (this.privateCollections[collection] as StateMap).delete(key);
        }

        return Promise.resolve();
    }

    /**
     * Get state by range of keys, empty keys will return everything
     *
     * @param collection
     * @param {string} startKey
     * @param {string} endKey
     * @returns {Promise<"fabric-shim".Iterators.StateQueryIterator>}
     */
    getPrivateDataByRange(collection: string, startKey: string, endKey: string): Promise<Iterators.StateQueryIterator> {

        const privateCollection = this.privateCollections[collection] || {};

        const items: Iterators.KV[] = Object.keys(privateCollection)
            .filter((k: string) => {
                const comp1 = Helpers.strcmp(k, startKey);
                const comp2 = Helpers.strcmp(k, endKey);

                return (comp1 >= 0 && comp2 <= 0) || (startKey == '' && endKey == '');
            })
            .map((k: string) => new MockKeyValue(k, privateCollection[k]));

        return Promise.resolve(new MockStateQueryIterator(items, this.txID));

    }

    /**
     *
     * GetQueryResult function can be invoked by a chaincode to perform a
     * rich query against state database.  Only supported by state database implementations
     * that support rich query.  The query string is in the syntax of the underlying
     * state database. An iterator is returned which can be used to iterate (next) over
     * the query result set.
     *
     * Blog post on writing rich queries -
     * https://medium.com/wearetheledger/hyperledger-fabric-couchdb-fantastic-queries-and-where-to-find-them-f8a3aecef767
     *
     * @param collection
     * @param {string} query
     * @returns {Promise<"fabric-shim".Iterators.StateQueryIterator>}
     */
    getPrivateDataQueryResult(collection: string, query: string): Promise<Iterators.StateQueryIterator> {

        const privateCollection = this.privateCollections[collection] || {};

        const keyValues: any = {};

        Object.keys(privateCollection)
            .forEach(k => {
                keyValues[k] = Transform.bufferToObject(privateCollection[k]);
            });

        let parsedQuery: any;

        try {
            parsedQuery = JSON.parse(query);
        } catch (err) {
            throw new ChaincodeError('Error parsing query, should be string');
        }

        if (parsedQuery.sort) {
            this.logger.warn('Sorting might work using the mockstub, but on a live network you need to add an index' +
                ' to CouchDB. More info can be found here: http://hyperledger-fabric.readthedocs.io/en/release-1.1/' +
                'couchdb_as_state_database.html#using-couchdb-from-chaincode');
        }

        const items = queryEngine.parseQuery(keyValues, parsedQuery)
            .map((item) => new MockKeyValue(item.key, Transform.serialize(item.value)));

        return Promise.resolve(new MockStateQueryIterator(items, this.txID));
    }

    getPrivateDataByPartialCompositeKey(collection: string, objectType: string, attributes: string[]): Promise<Iterators.StateQueryIterator> {
        const partialCompositeKey = CompositeKeys.createCompositeKey(objectType, attributes);

        return this.getPrivateDataByRange(collection, partialCompositeKey, partialCompositeKey + CompositeKeys.MAX_UNICODE_RUNE_VALUE);
    }

}
