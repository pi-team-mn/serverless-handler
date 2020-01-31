import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda'

export class ServerlessHandler {
    private readonly apiEvent: APIGatewayProxyEvent;
    // @ts-ignore
    private retValue: Promise<APIGatewayProxyResult>;

    constructor(event: APIGatewayProxyEvent | any) {
        this.apiEvent = event as APIGatewayProxyEvent;
    }

    /**
     * Verify that all path parameters are present
     * @param pathParams
     */
    public withRequiredPathParams = (pathParams: string[]) => this.apply(() => {
        if (!pathParams.every(item => this.aIsInB(item, this.eventPathParamKeys()))) {
            this.retValue = Promise.reject(new HttpError(`Not all path paremeters are present! Required params are ${pathParams}`, 400));
        }
    });

    /**
     * Verify that the Path Param is present
     * @param pathParam
     */
    public withRequiredPathParam = (pathParam: string) => this.apply(() => {
        if (!this.aIsInB(pathParam, this.eventPathParamKeys())) {
            this.retValue = Promise.reject(new HttpError(`Not all path paremeters are present! Required param is ${pathParam}`, 400));
        }
    });

    /**
     * Verify that at least some queryParams are present
     * @param queryParams
     */
    public withSomeQueryParams = (queryParams: string[]) => this.apply(() => {
        if (!queryParams.some(queryParam => this.aIsInB(queryParam, this.eventQueryParamKeys()))) {
            this.retValue = Promise.reject(new HttpError("No valid queryparams are present!", 400));
        }
    });

    /**
     * Runs F if no errors have occurred yet.
     *
     * Thrown errors will automatically be routed to the catch handler.
     *
     * @param f
     */
    public then = (f: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => this.apply(() => {
        if (!this.retValue) {
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
    public catch = (f: ((err: Error) => Promise<APIGatewayProxyResult>)) => this.apply(() => {
        this.retValue = this.retValue.catch(err => {
            console.warn("A handled error occurred", this.apiEvent, err);
            if (!err) {
                // If error does not exist, return a 500 unknown error
                return Promise.resolve({
                    statusCode: 500,
                    body: "An unknown error occurred"
                })
            } else if ('statusCode' in err) {
                // If our error has a statusCode, it's an error we prepared ourselves. Return that exception as a HTTP response
                let e = err as HttpError;
                return Promise.resolve({
                    statusCode: e.statusCode,
                    body: e.message
                })
            } else {
                // If the error exists but is not a HttpError, let the user handle it
                return f(err);
            }
        });
    });

    /**
     * Finished the object.
     */
    public build(): Promise<APIGatewayProxyResult> {
        return this.retValue
            .then(result => result)
            .catch(err => {
                // At this point there should never be an error as the error handling needs to return a result.
                console.error("An unkown error occurred", this.apiEvent, err);
                return {
                    statusCode: 500,
                    body: "No request was prepared!"
                }
            });
    }

    /**
     * Applies F to current object and then returns itself
     * @param f
     */
    private apply(f: () => void) {
        try {
            f();
        } catch (err) {
            this.retValue = Promise.reject(err);
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
            this.retValue = Promise.reject(new HttpError("No path parameters present!", 400))
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
            this.retValue = Promise.reject(new HttpError("No query params present!", 400));
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
}

export class HttpError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}
