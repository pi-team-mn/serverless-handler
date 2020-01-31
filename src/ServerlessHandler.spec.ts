import {ServerlessHandler} from "./ServerlessHandler";
import {APIGatewayProxyEvent} from "aws-lambda";
import {expect} from "chai";
import sinon = require("sinon");
import chai = require("chai");

sinon.assert.expose(chai.assert, {prefix: ""});

describe('ServerlessHandler', () => {
    describe('basic', () => {
        it('only runs then when no error has occurred', async () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().resolves(expectedResult);
            const errFunc = sinon.spy();

            const result = await new ServerlessHandler(testEvent)
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result).to.equal(expectedResult);
            sinon.assert.calledOnce(thenFunc);
            sinon.assert.notCalled(errFunc);
        });

        it('executes error function when an exception occurs', async () => {
            const thrownResult = {
                message: "nee"
            };
            const expectedResult = {
                statusCode: 200,
                body: undefined,
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().rejects(thrownResult);
            const errFunc = sinon.stub().resolves(expectedResult);

            const result = await new ServerlessHandler(testEvent)
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result).to.deep.equal(expectedResult);
            sinon.assert.calledOnce(thenFunc);
            sinon.assert.calledOnce(errFunc);
        });
    })

    describe('withRequiredParam', () => {
        it('works when param is present', async () => {
            const expectedResult = {
                body: "world",
                statusCode: 200
            };
            const testEvent: APIGatewayProxyEvent = {
                pathParameters: {
                    "test": 1
                }
            } as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().resolves(expectedResult);
            const errFunc = sinon.stub().returns(expectedResult);

            const result = await new ServerlessHandler(testEvent)
                .withRequiredPathParam("test")
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result).to.equal(expectedResult);
            sinon.assert.calledOnce(thenFunc);
            sinon.assert.notCalled(errFunc);
        });

        it('does not call the error function when the path param is not present', () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {
                pathParameters: {
                    "notMatching": 1
                }
            } as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().returns(expectedResult);
            const errFunc = sinon.stub().returns(expectedResult);

            const result = new ServerlessHandler(testEvent)
                .withRequiredPathParam("test")
                .then(thenFunc)
                .catch(errFunc)
                .build();

            // Since a built in handled exception occured, it should not be the expected result
            expect(result).not.to.equal(expectedResult);
            sinon.assert.notCalled(thenFunc);
            sinon.assert.notCalled(errFunc);
        });

        it('does not call the error function when no path param is not present', () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().returns(expectedResult);
            const errFunc = sinon.stub().returns(expectedResult);

            const result = new ServerlessHandler(testEvent)
                .withRequiredPathParam("test")
                .then(thenFunc)
                .catch(errFunc)
                .build();

            // Since a built in handled exception occured, it should not be the expected result
            expect(result).not.to.equal(expectedResult);
            sinon.assert.notCalled(thenFunc);
            sinon.assert.notCalled(errFunc);
        })
    })

    it('Basic Happy Case', async () => {
        const testEvent = {
            pathParameters: {
                administratie: "NVSCHADE",
            },
            queryStringParameters: {
                "testQuery": 1
            }
        } as unknown as APIGatewayProxyEvent;

        const result = await new ServerlessHandler(testEvent)
            .withRequiredPathParam("administratie")
            .withSomeQueryParams(['testQuery'])
            .then(async _ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'We made it'
                    })
                }
            })
            .build();

        expect(result.statusCode).to.equal(200);
        expect(result)
    })

    it('Basic Sad Case', async () => {
        const testEvent = {
            pathParameters: {
                administratie: "NVSCHADE",
            },
            queryStringParameters: {
                "testQuery": 1
            }
        } as unknown as APIGatewayProxyEvent;

        const result = await new ServerlessHandler(testEvent)
            .withRequiredPathParam("administratie")
            .withSomeQueryParams(['testQuery'])
            .then(async _ => {
                return Promise.reject({message: "test"})
            })
            .catch(async _ => {
                return {
                    statusCode: 418,
                    body: "I'm a teapot"
                }
            })
            .build();

        expect(result.statusCode).to.equal(418);
        expect(result)
    })
});
