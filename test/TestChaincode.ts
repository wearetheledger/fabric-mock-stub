/* tslint:disable */

/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

/*
 * Default fabcar chaincode from fabric-samples
 */

'use strict';
const shim = require('fabric-shim');

export class TestChaincode {

    // The Init method is called when the Smart Contract 'fabcar' is instantiated by the blockchain network
    // Best practice is to have any Ledger initialization in separate function -- see initLedger()
    async Init(stub) {
        console.info('=========== Instantiated fabcar chaincode ===========');
        const args = stub.getArgs();

        if (args[0] === 'init') {
            await this.initLedger(stub, args);
        }

        return shim.success(Buffer.from(JSON.stringify({
            args
        })));
    }

    // The Invoke method is called as a result of an application request to run the Smart Contract
    // 'fabcar'. The calling application program has also specified the particular smart contract
    // function to be called, with arguments
    async Invoke(stub) {
        let ret = stub.getFunctionAndParameters();
        console.info(ret);

        let method = this[ret.fcn];
        if (!method) {
            console.error('no function of name:' + ret.fcn + ' found');
            throw new Error('Received unknown function ' + ret.fcn + ' invocation');
        }
        try {
            let payload = await method(stub, ret.params);
            return shim.success(payload);
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }

    async queryCar(stub, args) {
        if (args.length !== 1) {
            throw new Error('Incorrect number of arguments. Expecting CarNumber ex: CAR01');
        }
        let carNumber = args[0];

        let carAsBytes = await stub.getState(carNumber); //get the car from chaincode state
        if (!carAsBytes || carAsBytes.toString().length <= 0) {
            throw new Error(carNumber + ' does not exist: ');
        }
        const privateData = await stub.getPrivateData("carDetails", carNumber);

        let car = {
            ...JSON.parse(Buffer.from(carAsBytes).toString('utf8')),
            ...JSON.parse(Buffer.from(privateData).toString('utf8'))
        };

        return Buffer.from(JSON.stringify(car));
    }

    async initLedger(stub, args) {
        console.info('============= START : Initialize Ledger ===========');
        let cars = [
            {
                make: 'Toyota',
                model: 'Prius',
                color: 'blue',
                owner: 'Tomoko',
                price: 22000
            },
            {
                make: 'Ford',
                model: 'Mustang',
                color: 'red',
                owner: 'Brad',
                price: 35000
            },
            {
                make: 'Hyundai',
                model: 'Tucson',
                color: 'green',
                owner: 'Jin Soo',
                price: 30000
            },
            {
                make: 'Volkswagen',
                model: 'Passat',
                color: 'yellow',
                owner: 'Max',
                price: 28000
            },
            {
                make: 'Tesla',
                model: 'S',
                color: 'black',
                owner: 'Adriana',
                price: 54000
            },
            {
                make: 'Peugeot',
                model: '205',
                color: 'purple',
                owner: 'Michel',
                price: 21000
            },
            {
                make: 'Chery',
                model: 'S22L',
                color: 'white',
                owner: 'Aarav',
                price: 18000
            },
            {
                make: 'Fiat',
                model: 'Punto',
                color: 'violet',
                owner: 'Pari',
                price: 20000
            },
            {
                make: 'Tata',
                model: 'Nano',
                color: 'indigo',
                owner: 'Valeria',
                price: 24000
            },
            {
                make: 'Holden',
                model: 'Barina',
                color: 'brown',
                owner: 'Shotaro',
                price: 26000
            }
        ];

        for (let i = 0; i < cars.length; i++) {
            (cars[i] as any).docType = 'car';
            await stub.putPrivateData("carDetails", 'CAR' + i, Buffer.from(JSON.stringify({
                price: cars[i].price
            })));
            delete cars[i].price;
            await stub.putState('CAR' + i, Buffer.from(JSON.stringify(cars[i])));
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createCar(stub, args) {
        console.info('============= START : Create Car ===========');
        if (args.length != 5) {
            throw new Error('Incorrect number of arguments. Expecting 5');
        }

        const car = {
            docType: 'car',
            make: args[1],
            model: args[2],
            color: args[3],
            owner: args[4]
        };

        const privateDetails = {
            price: 20000,
        };

        await stub.putState(args[0], Buffer.from(JSON.stringify(car)));
        await stub.putPrivateData("carDetails", args[0], Buffer.from(JSON.stringify(privateDetails)));
        await stub.setEvent('CREATE_CAR', 'Car created.');

        console.info('============= END : Create Car ===========');
    }

    async queryAllCars(stub, args) {

        let startKey = 'CAR0';
        let endKey = 'CAR999';

        let iterator = await stub.getStateByRange(startKey, endKey);

        let allResults = [];
        while (true) {
            let res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes = {};

                (jsonRes as any).Key = res.value.key;
                try {
                    (jsonRes as any).Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    (jsonRes as any).Record = res.value.value.toString('utf8');
                }
                allResults.push(jsonRes);
            }
            if (res.done) {
                await iterator.close();
                return Buffer.from(JSON.stringify(allResults));
            }
        }
    }

    async queryAllCarPrivateDetails(stub, args) {

        let startKey = 'CAR0';
        let endKey = 'CAR999';

        let iterator = await stub.getPrivateDataByRange("carDetails", startKey, endKey);

        let allResults = [];
        while (true) {
            let res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes = {};

                (jsonRes as any).Key = res.value.key;
                try {
                    (jsonRes as any).Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    (jsonRes as any).Record = res.value.value.toString('utf8');
                }
                allResults.push(jsonRes);
            }
            if (res.done) {
                await iterator.close();
                return Buffer.from(JSON.stringify(allResults));
            }
        }
    }

    async changeCarOwner(stub, args) {
        console.info('============= START : changeCarOwner ===========');
        if (args.length !== 2) {
            throw new Error('Incorrect number of arguments. Expecting 2');
        }

        let carAsBytes = await stub.getState(args[0]);
        let car = JSON.parse(carAsBytes);
        car.owner = args[1];

        await stub.putState(args[0], Buffer.from(JSON.stringify(car)));
        console.info('============= END : changeCarOwner ===========');
    }

    async isRightMspId(stub, args) {
        const transactionMspId = stub.getCreator().getMspid();

        return transactionMspId === 'anotherMSPId';
    }

    async checkTransientData(stub, args) {
        const transientMap = stub.getTransient();

        return Buffer.from(transientMap.get("test")).toString('utf8') === 'transientValue';
    }

    async crossChaincode(stub, args) {

        const response = await stub.invokeChaincode("pingcode", ["ping"], "mychannel");

        return response.payload;
    }
}
