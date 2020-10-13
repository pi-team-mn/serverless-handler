import {ServerlessHandler} from "./ServerlessHandler";
import type {APIGatewayProxyEvent} from "aws-lambda";
import {expect} from "chai";
import {Schema} from "jsonschema";
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
                statusCode: 412,
                body: undefined,
            };
            const testEvent: APIGatewayProxyEvent = {} as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().rejects(thrownResult);
            const errFunc = sinon.stub().resolves(expectedResult);

            const result = await new ServerlessHandler(testEvent)
                .then(thenFunc)
                .catch(errFunc)
                .build();

            expect(result.statusCode).to.equal(412);
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

        it('returns a 400 if pathparamter is not present', async () => {
            const happyResult = {
                statusCode: 200,
                body: "hello world"
            };
            const sadResult = 400
            const testEvent: APIGatewayProxyEvent = {
                pathParameters: {
                    "notMatching": 1
                }
            } as unknown as APIGatewayProxyEvent;
            const thenFunc = sinon.stub().returns(happyResult);
            const errFunc = sinon.stub().returns(happyResult);

            const result = await new ServerlessHandler(testEvent)
                .withRequiredPathParam("test")
                .then(thenFunc)
                .catch(errFunc)
                .build();

            // Since a built in handled exception occured, it should not be the expected result
            expect(result.statusCode).to.equal(sadResult);
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
            .then(async () => {
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
            .then(async () => {
                return Promise.reject({message: "test"})
            })
            .catch(async () => {
                return {
                    statusCode: 418,
                    body: "I'm a teapot"
                }
            })
            .build();

        expect(result.statusCode).to.equal(418);
        expect(result)
    });

    it('Basic Wrong Case', async () => {
        const testEvent = {} as unknown as APIGatewayProxyEvent;

        const result = await new ServerlessHandler(testEvent)
            .build()

        expect(result.statusCode).to.equal(500)
    })

    describe('withJSONSchema', () => {
        it('does not return an error on a valid json schema', async () => {
            const schema: Schema = {
                type: "number"
            };
            const validItem = 4;
            const testEvent = {
                body: validItem
            } as unknown as APIGatewayProxyEvent;

            const result = await new ServerlessHandler(testEvent)
                .withJsonSchema(schema)
                .then(async () => {
                    return {
                        statusCode: 200,
                        body: "success"
                    }
                })
                .build();

            expect(result.statusCode).to.equal(200);
            expect(result)
        });

        it('does return an error on an invalid json schema', async () => {
            const schema: Schema = {
                type: "string"
            };
            const validItem = 4;
            const testEvent = {
                body: validItem
            } as unknown as APIGatewayProxyEvent;

            const result = await new ServerlessHandler(testEvent)
                .withJsonSchema(schema)
                .then(async () => {
                    return {
                        statusCode: 200,
                        body: "success"
                    }
                })
                .build();

            expect(result.statusCode).to.equal(422);
            expect(result)
        });

        it('returns an error when there is no body', async () => {
            const testEvent = {} as unknown as APIGatewayProxyEvent;

            const result = await new ServerlessHandler(testEvent)
                .withJsonSchema({})
                .build();

            expect(result.statusCode).to.equal(422)
        })

        it('validates even when more than one schema is applied', async () => {
            const schemas: Schema[] = [
                {type: "number"},
                {type: "string"}
            ];
            const testEvent = {
                body: 4
            } as unknown as APIGatewayProxyEvent;

            const result = await new ServerlessHandler(testEvent)
                .withJsonSchema(schemas)
                .then(async () => {
                    return {
                        statusCode: 200,
                        body: 'success'
                    }
                })
                .build()

            expect(result.statusCode).to.equal(200)
        })

        it('thrown an error when none of the schemas match', async () => {
            const schemas: Schema[] = [
                {type: "number"},
                {type: "string"}
            ];
            const testEvent = {
                body: JSON.stringify({test: 1})
            } as unknown as APIGatewayProxyEvent;

            const result = await new ServerlessHandler(testEvent)
                .withJsonSchema(schemas)
                .then(async () => {
                    return {
                        statusCode: 200,
                        body: 'success'
                    }
                })
                .build();

            expect(result.statusCode).to.equal(422)
        })
    })
});
