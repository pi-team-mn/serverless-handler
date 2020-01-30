import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda'

export class ServerlessPreconditions {
    private readonly apiEvent: APIGatewayProxyEvent;
    private retValue?: APIGatewayProxyResult;
    private err?: Error | HttpError;

    constructor(event: APIGatewayProxyEvent) {
        this.apiEvent = event;
    }

    /**
     * Applies F to current object and then returns itself
     * @param f
     */
    private apply(f: () => void) {
        try {
            f();
        } catch (err) {
            this.err = err;
        }
        return this;
    }

    /**
     * Assert that a is in b
     * @param a
     * @param b
     */
    private aIsInB = <T>(a: T, b: T[]) => b.some(bItem => bItem === a);

    /**
     * Get the path params.
     * @throws HttpError Http 400 if path params do not exist.
     */
    private eventPathParams = () => {
        if (!this.apiEvent.pathParameters) {
            this.err = new HttpError("No path parameters present!", 400);
            return {};
        }
        return this.apiEvent.pathParameters
    };

    /**
     * Get the event query params.
     * @throws HttpError HTTP 400 if query params do not exist.
     */
    private eventQueryParams = () => {
        if (!this.apiEvent.queryStringParameters) {
            this.err = new HttpError("No query params present!", 400);
            return {};
        }
        return this.apiEvent.queryStringParameters;
    };

    /**
     * Get the keys in the path params
     * @throws HttpError Http 400 if path params do not exist.
     */
    private eventPathParamKeys = () => Object.keys(this.eventPathParams());

    /**
     * Get the keys in the query params
     * @throws HttpError Http 400 if query params do not exist.
     */
    private eventQueryParamKeys = () => Object.keys(this.eventQueryParams());

    /**
     * Verify that all path parameters are present
     * @param pathParams
     */
    public withRequiredPathParams = (pathParams: string[]) => this.apply(() => {
        if (!pathParams.every(item => this.aIsInB(item, this.eventPathParamKeys()))) {
            this.err = new HttpError(`Not all path paremeters are present! Required params are ${pathParams}`, 400);
        }
    });

    /**
     * Verify that the Path Param is present
     * @param pathParam
     */
    public withRequiredPathParam = (pathParam: string) => this.apply(() => {
        if (!this.aIsInB(pathParam, this.eventPathParamKeys())) {
            this.err = new HttpError(`Not all path paremeters are present! Required param is ${pathParam}`, 400);
        }
    });

    /**
     * Verify that at least some queryParams are present
     * @param queryParams
     */
    public withSomeQueryParams = (queryParams: string[]) => this.apply(() => {
        if (!queryParams.some(queryParam => this.aIsInB(queryParam, this.eventQueryParamKeys()))) {
            this.err = new HttpError("No valid queryparams are present!", 400)
        }
    });

    /**
     * Runs F if no errors have occurred yet.
     *
     * Thrown errors will automatically be routed to the catch handler.
     *
     * @param f
     */
    public then = (f: (event: APIGatewayProxyEvent) => APIGatewayProxyResult) => this.apply(() => {
        if (!this.err) {
            this.retValue = f(this.apiEvent);
        }
    });

    /**
     * Runs the error handling code if an exception was thrown.
     *
     * This function automatically handles built-in errors such as missing params and such.
     *
     * @param f
     */
    public catch = (f: ((err: Error) => APIGatewayProxyResult)) => this.apply(() => {
        if (this.retValue) {
            return;
        }

        if (!this.err) {
            this.retValue = {
                statusCode: 500,
                body: "An unknown error occurred"
            }
        } else if ('statusCode' in this.err) {
            let e = this.err as HttpError;
            this.retValue = {
                statusCode: e.statusCode,
                body: e.message
            }
        } else {
            this.retValue = f(this.err);
        }
    });

    /**
     * Finished the object.
     */
    public build(): APIGatewayProxyResult {
        if (this.retValue) {
            return this.retValue
        } else {
            return {
                statusCode: 418,
                body: "No request was prepared!"
            }
        }
    }
}

export class HttpError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}
