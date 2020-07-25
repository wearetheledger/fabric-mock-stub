/* tslint:disable */

import { ChaincodeMockStub } from '../src/ChaincodeMockStub';
import { TestChaincode } from './TestChaincode';
import { ChaincodeResponse } from 'fabric-shim';
import { Transform } from '../src/utils/datatransform';

import { expect } from 'chai';
import { PingChaincode } from "./PingChaincode";

const chaincode = new TestChaincode();

describe('Test Mockstub', () => {
    it('Should be able to init', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const args = ['arg1', 'arg2'];

        const response: ChaincodeResponse = await stub.mockInit('uudif', args);

        expect(Transform.bufferToObject(response.payload)['args']).to.deep.equal(args);
    });

    const stubWithInit = new ChaincodeMockStub('mock', chaincode);

    it('Should be able to init and make some cars', async () => {

        const args = ['init', 'arg2'];

        await stubWithInit.mockInit('uudif', args);

        expect(Object.keys(stubWithInit.state).length).to.equal(10);
    });

    it('Should be able to query first car', async () => {

        const car0 = {
            'make': 'Toyota',
            'model': 'Prius',
            'color': 'blue',
            'owner': 'Tomoko',
            'docType': 'car',
            "price": 22000
        };

        const response: ChaincodeResponse = await stubWithInit.mockInvoke('test', ['queryCar', 'CAR0']);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.deep.equal(car0);
    });

    it('Should be able to query using getStateByRange', async () => {

        const response: ChaincodeResponse = await stubWithInit.mockInvoke('test', ['queryAllCars']);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.be.length(10);
    });

    it('Should be able to query using getStateByRange using keys', async () => {

        const res = await stubWithInit.getStateByRange('CAR0', 'CAR4');

        expect((res as any).response.results).to.be.length(4);
    });

    it('Should be able to query using getStateByRange using multiple digits', async () => {

        const res = await stubWithInit.getStateByRange('CAR0', 'CAR2000');

        expect((res as any).response.results).to.be.length(3);
    });

    it('Should be able to query using getStateByRange using multiple digits', async () => {

        const res = await stubWithInit.getStateByRange('CAR', 'CAR3');

        expect((res as any).response.results).to.be.length(3);
    });

    it('Should be able to query using getPrivateDataByRange using keys', async () => {

        const res = await stubWithInit.getPrivateDataByRange('carDetails', 'CAR0', 'CAR4');

        expect((res as any).response.results).to.be.length(4);
    });

    it('Should be able to query using getPrivateDataByRange using multiple digits', async () => {

        const res = await stubWithInit.getPrivateDataByRange('carDetails', 'CAR0', 'CAR2000');

        expect((res as any).response.results).to.be.length(3);
    });

    it('Should be able to query using getPrivateDataByRange using multiple digits', async () => {

        const res = await stubWithInit.getPrivateDataByRange('carDetails', 'CAR', 'CAR3');

        expect((res as any).response.results).to.be.length(3);
    });

    it('Should be able to mock composite keys', async () => {
        const stub = new ChaincodeMockStub('GetStateByPartialCompositeKeyTest', chaincode);

        stub.mockTransactionStart("composite");

        // Add car 1
        const car1 = { objectType: "CAR", make: "volvo", color: "red" };

        const ck1 = stub.createCompositeKey(car1.objectType, [car1.make, car1.color]);

        await stub.putState(ck1, Transform.serialize(car1));

        // Add car 2
        const car2 = { objectType: "CAR", make: "volvo", color: "blue" };

        const ck2 = stub.createCompositeKey(car2.objectType, [car2.make, car2.color]);

        await stub.putState(ck2, Transform.serialize(car2));

        // Add car 3
        const car3 = { objectType: "CAR", make: "jaguar", color: "red" };

        const ck3 = stub.createCompositeKey(car1.objectType, [car3.make, car3.color]);

        await stub.putState(ck3, Transform.serialize(car3));

        stub.mockTransactionEnd("composite");

        // should return in sorted order of attributes
        const expectKeys = [ck1, ck2];
        const expectKeysAttributes = [["volvo", "red"], ["volvo", "blue"]];
        const expectValues = [Transform.serialize(car1), Transform.serialize(car2)];

        const it = await stub.getStateByPartialCompositeKey("CAR", ["volvo"]);

        for (let i = 0; i < 2; i++) {
            const response = await it.next();

            if (expectKeys[i] !== response.value.key) {
                throw new Error(`Expected key ${expectKeys[i]} got ${response.value.key}`)
            }
            const t = stub.splitCompositeKey(response.value.key);

            if (t.objectType !== "CAR") {
                throw new Error(`Expected key "CAR" got ${t.objectType}`)
            }

            t.attributes.forEach((attr: string, index: number) => {
                if (expectKeysAttributes[i][index] != attr) {
                    throw new Error(`Expected keys attribute ${expectKeysAttributes[i][index]} got ${attr}`);
                }
            });

            expect(response.value.value).to.eql(expectValues[i]);

        }
    });

    it('Test invoke', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);

        expect(response.status).to.eq(200);

        expect(Object.keys(stub.state).length).to.equal(1);
    });

    it('Should be able to query using rich queries', async () => {

        const query = {
            selector: {
                make: "Toyota"
            }
        };

        const it = await stubWithInit.getQueryResult(JSON.stringify(query))

        const items = await Transform.iteratorToList(it);

        expect(items).to.deep.include({
            make: 'Toyota',
            model: 'Prius',
            color: 'blue',
            owner: 'Tomoko',
            docType: 'car'
        })
    });

    it('Should be able to get history', async () => {

        const it = await stubWithInit.getHistoryForKey("CAR0")

        const items = await Transform.iteratorToHistoryList(it);

        console.log("it", items)

        expect(items[0]).to.deep.include({
            is_delete: false,
            value:
            {
                make: 'Toyota',
                model: 'Prius',
                color: 'blue',
                owner: 'Tomoko',
                docType: 'car'
            },
            tx_id: 'uudif'
        })
    });

    it('Should be able to full history', async () => {
        const stub = new ChaincodeMockStub('Full history', chaincode);
        const key = "CAR0";

        stub.mockTransactionStart("uudif")
        await stub.putState(key, Transform.serialize({
            make: 'Toyota',
            model: 'Prius',
            color: 'blue',
            owner: 'Tomoko',
            docType: 'car'
        }));

        const it = await stub.getHistoryForKey("CAR0")
        const items = await Transform.iteratorToHistoryList(it);


        stub.mockTransactionEnd("uudif");


        expect(items[0]).to.deep.include({
            is_delete: false,
            value:
            {
                make: 'Toyota',
                model: 'Prius',
                color: 'blue',
                owner: 'Tomoko',
                docType: 'car'
            },
            tx_id: 'uudif'
        });

        stub.mockTransactionStart("uudif2")

        await stub.putState(key, Transform.serialize({
            make: 'Toyota',
            model: 'Prius',
            color: 'blue',
            owner: 'updated',
            docType: 'car'
        }));

        stub.mockTransactionEnd("uudif2");

        const it2 = await stub.getHistoryForKey("CAR0")
        const items2 = await Transform.iteratorToHistoryList(it2);

        expect(items2).to.be.length(2)

        expect((items2[1].value as any).owner).to.eq("updated")

    });

    it('Should be able to query using an rich query operator ', async () => {

        const query = {
            selector: {
                model: {
                    "$in": ['Nano', "Punto"]
                }
            }
        };

        const it = await stubWithInit.getQueryResult(JSON.stringify(query));

        const items = await Transform.iteratorToList(it);

        expect(items).to.be.length(2)
    });

    it('Should be able to get an event', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);

        expect(response.status).to.eq(200);
        expect(Object.keys(stub.event).length).to.equal(1);

        const eventPayload: Buffer = await stub.getEvent('CREATE_CAR');

        expect(eventPayload).to.equal('Car created.');
    });

    it('Should be able to set the mspId', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);
        // Set the right mspId
        stub.setCreator('anotherMSPId');

        const res1: ChaincodeResponse = await stub.mockInvoke('test', ['isRightMspId']);
        expect(res1.status).to.eq(200);
        expect(res1.payload).to.equal(true);

        // Set a bad mspId
        stub.setCreator('aBadMSPId');

        const res2: ChaincodeResponse = await stub.mockInvoke('test', ['isRightMspId']);
        expect(res2.status).to.eq(200);
        expect(res2.payload).to.not.equal(true);
    });

    it('Should be able to set private data', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);

        expect(response.status).to.eq(200);

        expect(Object.keys(stub.state).length).to.equal(1);

        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(1);

        expect(Buffer.from(stub.privateCollections["carDetails"]["CAR0"]).toString('utf8')).to.equal(JSON.stringify({
            price: 20000,
        }));
    });

    it('Should be able to set private data', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);

        expect(response.status).to.eq(200);

        expect(Object.keys(stub.state).length).to.equal(1);

        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(1);

        expect(Buffer.from(stub.privateCollections["carDetails"]["CAR0"]).toString('utf8')).to.equal(JSON.stringify({
            price: 20000,
        }));
    });

    it('Should be able to query all cars private data', async () => {

        const response: ChaincodeResponse = await stubWithInit.mockInvoke('test', ['queryAllCarPrivateDetails']);

        expect(response.status).to.eq(200);

        const prices = JSON.parse(Buffer.from(response.payload).toString("utf8"));

        expect(prices.length).to.equal(10);
        expect(prices[1].Record.price).to.equal(35000);
    });

    it('Should be able to receive and handle transient data', async () => {

        const response: ChaincodeResponse = await stubWithInit.mockInvoke('test', ['checkTransientData'], new Map(Object["entries"]({ "test": Buffer.from("transientValue") })));

        expect(response.status).to.eq(200);
        expect(response.payload).to.equal(true);
    });

    it('Should be able to invoke other chaincode', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);
        const pingmockchaincode = new ChaincodeMockStub('pingmockchaincode', new PingChaincode());

        stub.mockPeerChaincode("pingcode/mychannel", pingmockchaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['crossChaincode']);

        expect(response.status).to.eq(200);
        expect(response.payload).to.equal("pong!");
    });

    it('Should not be able to invoke other chaincode when no chaincode mocked', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeResponse = await stub.mockInvoke('test', ['crossChaincode']);

        expect(response.status).to.eq(500);
        expect((response.message as any).message).to.equal("Chaincode pingcode/mychannel could not be found. Please create this using mockPeerChaincode.");
    });

    it('Should not be able to put state when no txID given', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        expect(await stub.putState.bind(null, 'test', Buffer.from("fefe"))).to.throw(Error)
    });
    it('Should not be able to put state when no txID given', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        expect(await stub.putState.bind(null, 'test', Buffer.from("fefe"), { privateCollection: "testCollection" })).to.throw(Error)
    });


    it('getState with invalid key should return empty buffer', async () => {

        const res = await stubWithInit.getState('someInvalidKey');

        expect((res as any)).to.be.length(0);
    });



    it('Should be able to query using getStateByRangeWithPagination', async () => {

        const res = await stubWithInit.getStateByRangeWithPagination('', '', 2);

        expect(res.metadata.fetched_records_count).to.eq(10);
        expect(res.metadata.bookmark).to.eq("1");
        expect((res.iterator as any).response.results.map(v => v.key)).to.deep.eq(["CAR0", "CAR1"]);

        const res2 = await stubWithInit.getStateByRangeWithPagination('', '', 2, "1");


        expect(res2.metadata.bookmark).to.eq("2");
        expect((res2.iterator as any).response.results.map(v => v.key)).to.deep.eq(["CAR2", "CAR3"]);
    });

    it('Should be able to query using getQueryResultWithPagination', async () => {

        const query = {
            selector: {
                make: { $in: ["Toyota", "Ford", "Hyundai", "Volkswagen", "Volkswagen"] }
            }
        };

        const it = await stubWithInit.getQueryResultWithPagination(JSON.stringify(query), 2)

        const items = await Transform.iteratorToList(it.iterator);

        expect(items).to.be.length(2)


        const it2 = await stubWithInit.getQueryResultWithPagination(JSON.stringify(query), 2, "1")

        expect(await Transform.iteratorToList(it2.iterator)).to.be.length(2)
    });

    it('Should test the getPrivateDataHash which throws an error ', async () => {

        try {
            const it = await stubWithInit.getPrivateDataHash("string", "string")
            // Should have thrown an error at this point
            expect(true).to.be.false;
        } catch (error) {
            expect(true).to.be.true;
        }
    });


    it('Should be able to delete state', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);
        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);
        expect(response.status).to.eq(200);
        expect(Object.keys(stub.state).length).to.equal(1);
        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(1);

        await stub.deleteState('CAR0');

        expect(Object.keys(stub.state).length).to.equal(0);
        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(1);

    });

    it('Should be able to delete private data', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);
        const response: ChaincodeResponse = await stub.mockInvoke('test', ['createCar', 'CAR0', 'prop1', 'prop2', 'prop3', 'test']);
        expect(response.status).to.eq(200);
        expect(Object.keys(stub.state).length).to.equal(1);
        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(1);

        let res = await stub.deletePrivateData("carDetails", 'CAR0');

        expect(Object.keys(stub.state).length).to.equal(1);
        expect(Object.keys(stub.privateCollections["carDetails"]).length).to.equal(0);
    });

});
