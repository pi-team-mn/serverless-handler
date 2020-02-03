import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda'
import {Schema, Validator} from 'jsonschema'
import {HttpError} from "./HttpError";

export class ServerlessHandler {
    private readonly apiEvent: APIGatewayProxyEvent;
    // @ts-ignore
    private retValue: Promise<APIGatewayProxyResult>;

    // Use an any if the client uses a different aws-lambda version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            this.retValue = Promise.reject(new HttpError(`Not all path parameters are present! Required param is ${pathParam}`, 400));
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
    public then = (f: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => this.apply(async () => {
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
                return Promise.reject({
                    statusCode: 500,
                    body: JSON.stringify({message: "An unknown error occurred"})
                })
            } else if ('statusCode' in err) {
                // If our error has a statusCode, it's an error we prepared ourselves. Return that exception as a HTTP response
                const e = err as HttpError;
                return Promise.reject({
                    statusCode: e.statusCode,
                    body: JSON.stringify({message: e.message})
                })
            } else {
                // If the error exists but is not a HttpError, let the user handle it
                return f(err);
            }
        });
    });

    /**
     * Assert that the HTTP Body is valid according to the schema.
     *
     * @param schema A JSON Schema to validate against in Object form.
     */
    public withJsonSchema = (schema: Schema | Schema[]) => this.apply(() => {
        if (!this.apiEvent.body) {
            this.retValue = Promise.reject(new HttpError(JSON.stringify({message: "A body is required for this method, but none was present"}), 422))
            return;
        }

        const validator = new Validator();
        const body = JSON.parse(this.apiEvent.body!);

        if (Array.isArray(schema)) {
            const validatorResults = schema.map(item => validator.validate(body, item, {throwError: false}));

            if (!validatorResults.some(item => item.valid)) {
                const responseObject = {
                    message: 'JSON Schema was not valid!',
                    errors: validatorResults
                        .filter(validatorResult => !validatorResult.valid)
                        .map(item => item.errors)
                };
                this.retValue = Promise.reject(new HttpError(JSON.stringify(responseObject), 422))
            }
        } else {
            const result = validator.validate(body, schema, {throwError: false});

            if (!result.valid) {
                const responseObject = {
                    message: 'JSON Schema was not valid!',
                    errors: [result.errors]
                };

                this.retValue = Promise.reject(new HttpError(JSON.stringify(responseObject), 422))
            }
        }
    });

    /**
     * Finished the object.
     */
    public build(): Promise<APIGatewayProxyResult> {
        return this.retValue
            .then(result => result)
            .catch(err => {
                if('statusCode' in err) {
                    const httpErr: HttpError = err;
                    return {
                        statusCode: httpErr.statusCode,
                        body: httpErr.message
                    }
                }
                // At this point there should never be an error as the error handling needs to return a result.
                console.error("An unkown error occurred", this.apiEvent, err);
                return {
                    statusCode: 500,
                    body: JSON.stringify({message: "No request was prepared!"})
                }
            });
    }

    /**
     * Applies F to current object and then returns itself
     * @param f
     */
    private apply(f: () => void): this {
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
            this.retValue = Promise.reject(new HttpError("No path parameters present!", 400));
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
