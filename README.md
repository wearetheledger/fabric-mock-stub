[![Build Status](https://travis-ci.org/wearetheledger/fabric-mock-stub.svg?branch=master)](https://travis-ci.org/wearetheledger/fabric-mock-stub) [![npm version](https://badge.fury.io/js/%40theledger%2Ffabric-mock-stub.svg)](https://badge.fury.io/js/%40theledger%2Ffabric-mock-stub) [![codecov](https://codecov.io/gh/wearetheledger/fabric-mock-stub/branch/master/graph/badge.svg)](https://codecov.io/gh/wearetheledger/fabric-mock-stub)
# Hyperledger Fabric Nodejs mockstub

A Nodejs module that helps you to test your Hyperledger Fabric Nodejs chaincode. When it proves itself, we will be adding this package to the official Gerrit of the Fabric Nodejs SDK.

- [Docs](https://wearetheledger.github.io/fabric-mock-stub)
- [Example usage](https://github.com/wearetheledger/fabric-network-boilerplate/tree/master/chaincode/node)
- [Article about this repo](https://medium.com/wearetheledger/how-to-start-testing-your-hyperledger-fabric-nodejs-chaincode-229453c3c214)

## 🚨 Note
Due to the complexity, key endorsement policies introduced in v1.4 are currently not being enforced.

## Table of contents
- [Version matching](#version-matching)
- [Installation](#installation)
- [Todo](#todo)
- [Usage](#usage)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Version matching
| Fabric node SDK        | Mock stub    |
| ------------- |:-------------:|
| v1.4.X     | v4.X.X |
| v1.3.X     | v3.X.X |
| v1.2.X     | v2.X.X |
| V1.1.X     | v1.3.X     |


## Installation
```sh
yarn add @theledger/fabric-mock-stub --dev
```

## Todo
- [ ] Finish [node-couchdb-query-engine](https://github.com/wearetheledger/node-couchdb-query-engine)
- [ ] Implement `fields` and `sort` into GetQueryResult
- Implement remaining mock methods for
    - [ ] getBinding
    - [ ] getChannelID

## Usage
### ChaincodeMockStub [View definition](https://wearetheledger.github.io/fabric-mock-stub/classes/_chaincodemockstub_.chaincodemockstub.html)
This ChaincodeMockStub is a Mock implementation of the fabric-shim stub. This means you can test your chaincode without actually starting your network.

Examples are located at [examples/tests](examples/tests)

**!! Following methods are not (yet) implemented and will not work !!**
- getBinding
- getChannelID

### How to test
Testing NodeJS chaincode works similarly to testing using the mockstub in the Golang chaincode.

The **ChaincodeMockStub** has 2 important mock functions `mockInit`and `mockInvoke`. By passing your chaincode, it will mock a transaction and execute a invoke/init similarly to how it will originally be called. Both these functions will return a [ChaincodeResponse](https://github.com/wearetheledger/fabric-shim-types/blob/4b8844769c2439303954d03f5c8a66dc0a795ed4/index.d.ts#L93). Using this ChaincodeResponse object, we can test whether or not the action returned an expected result.

On *success*, this response will look like this. If the method returns something, the response will also contain a `payload`.

```json
{
    "status": 200,
    "payload": <Buffer_with_your_data>
}
```

On *error*, this response will look like this.

```json
{
    "status": 500,
    "message": <Buffer_with_your_error_message>
}
```

You'll be able to validate the response using something like `chai`.

```javascript
// Validate response status
expect(response.status).to.eql(200)
// Validate payload - using `Transform.bufferToObject` because we recieve the payload as a buffer
expect(Transform.bufferToObject(response.payload).owner).to.eql("newOwner")
```

#### Include your chaincode
At the top of your test file, you can import and instantiate your chaincode, this only has to be done once.

```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();
```
#### Include the mockstub
After this, in your tests, you can create a new mockstub. You have to pass a random name (not that important) and your chaincode. It's up to you if you want to create a new mockstub for each test, which runs those tests with an empty state. Or use one for all the tests. If you reuse the same stub, you also reuse the previous tests state.

```javascript
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);
```

#### Example

```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should init without issues", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        // Your test code
    });
});
```

### Test Init
The `Init()`method can be tested using the `mockStub.mockInit(txId: string, args: string[])` function. It will create a new mock transaction and call the init method on your chaincode. Since the init happens when instantiating your chaincode, you generally don't want it to return anything. So, for this, we'll check the response status.

```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should init without issues", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        const response = await mockStub.mockInit("tx1", []);

        expect(response.status).to.eql(200)
    });
});
```

### Test Invoke
The `Invoke()`method can be tested using the `mockStub.mockInvoke(txId: string, args: string[])` function. It will create a new mock transaction and call the invoke method on your chaincode. The client will either send a query or an invoke, but the chaincode will accept these both as invoke. In your tests there isn't any difference, both invokes and queries can return a result.

**Test queryCar**
```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should query car", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        const response = await mockStub.mockInvoke("tx2", ['queryCar', `CAR0`]);

        expect(Transform.bufferToObject(response.payload)).to.deep.eq({
            'make': 'prop1',
            'model': 'prop2',
            'color': 'prop3',
            'owner': 'owner',
            'docType': 'car'
        });
    });
});
```

**Test createCar**
```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should be able to add car", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        const response = await mockStub.mockInvoke("tx1", ['createCar', `CAR0`, `prop1`, `prop2`, `prop3`, `owner`]);

        expect(response.status).to.eql(200)

        const response = await mockStub.mockInvoke("tx1", ['queryCar', `CAR0`]);

        expect(Transform.bufferToObject(response.payload)).to.deep.eq({
            'make': 'prop1',
            'model': 'prop2',
            'color': 'prop3',
            'owner': 'owner',
            'docType': 'car'
        })
    });
});
```

### Testing individual classes
You are not required to only test using the `mockInvoke` and `mockInit`. You can directly call the methods on your chaincode or on the mockStub if you really want to.

#### Testing using Mychaincode directly
A remark when using this, depending what you return in your function, you will be able to receive a Buffer or an object in your tests. This is discussed in [chaincode](#writing-chaincode)
```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should be able to add car", async () => {
        const stub = new ChaincodeMockStub("MyMockStub", chaincode);

        const car0 = {
            'make': 'Toyota',
            'model': 'Prius',
            'color': 'blue',
            'owner': 'Tomoko',
            'docType': 'car'
        };

        const car = await chaincode.queryCar(stub, ["CAR0"])

        expect(car).to.deep.equal(car0);
    });
});
```

#### Testing using ChaincodeMockStub directly 🤨
You can do this, but you shouldn't. Your logic should be written in your functions, not your tests.

##### Test query results

```javascript
import { MyChaincode } from '../<path_to_your_chaincode_class>';
import { ChaincodeMockStub, Transform } from "@theledger/fabric-mock-stub";

// You always need your chaincode so it knows which chaincode to invoke on
const chaincode = new MyChaincode();

describe('Test MyChaincode', () => {

    it("Should be able to add car", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        const query = {
            selector: {
                model: {
                    "$in": ['Nano', "Punto"]
                }
            }
        };

        const it = await mockStub.getQueryResult(JSON.stringify(query));

        const items = await Transform.iteratorToList(it);

        expect(items).to.be.length(2)
    });
});
```

##### Test emitted events

```javascript
it("Should get the emitted event", async () => {
        const mockStub = new ChaincodeMockStub("MyMockStub", chaincode);

        await mockStub.mockInvoke("tx1", ['createCar', `CAR0`, `prop1`, `prop2`, `prop3`, `owner`]);

        const eventPayload = await mockStub.getEvent('CREATE_CAR');

        expect(eventPayload).to.equal('Car created.');
});
```

## Contributing

1. Fork it! 🍴
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😁 🎉

## Credits

- Developer - Jo ([@jestersimpps](https://github.com/jestersimpps))
- Developer - Jonas ([@Superjo149](https://github.com/Superjo149))
- Company - TheLedger ([theledger.be](https://theledger.be))

## License
The MIT License (MIT)

Copyright (c) 2018 TheLedger

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
