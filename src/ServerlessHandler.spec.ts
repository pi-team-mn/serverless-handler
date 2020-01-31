import {ServerlessHandler} from "./ServerlessHandler";
import sinon = require("sinon");
import chai = require("chai");
import {APIGatewayProxyEvent} from "aws-lambda";
import {expect} from "chai";

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
        })
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
});
