import {ServerlessPreconditions} from "./ServerlessPreconditions";
import sinon = require("sinon");
import chai = require("chai");
import {APIGatewayProxyEvent} from "aws-lambda";
import {expect} from "chai";

sinon.assert.expose(chai.assert, {prefix: ""});

describe('ServerlessPreconditions', () => {
    describe('basic', () => {
        it('only runs then when no error has occurred', () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().returns(expectedResult);
            const errFunc = sinon.spy();

            const result = new ServerlessPreconditions(testEvent)
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result).to.equal(expectedResult);
            sinon.assert.calledOnce(thenFunc);
            sinon.assert.notCalled(errFunc);
        })

        it('executes error function when an exception occurs', () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().throws(expectedResult);
            const errFunc = sinon.stub().returns(expectedResult);

            const result = new ServerlessPreconditions(testEvent)
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result).to.equal(expectedResult);
            sinon.assert.calledOnce(thenFunc);
            sinon.assert.calledOnce(errFunc);
        })
    })

    describe('withRequiredParam', () => {
        it('works when param is present', () => {
            const expectedResult = {
                hello: "world"
            };
            const testEvent: APIGatewayProxyEvent = {
                pathParameters: {
                    "test": 1
                }
            } as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().returns(expectedResult);
            const errFunc = sinon.stub().returns(expectedResult);

            const result = new ServerlessPreconditions(testEvent)
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

            const result = new ServerlessPreconditions(testEvent)
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

            const result = new ServerlessPreconditions(testEvent)
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
