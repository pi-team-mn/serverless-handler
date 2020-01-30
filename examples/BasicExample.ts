import {APIGatewayProxyEvent} from "aws-lambda";
import {ServerlessHandler} from "../src/ServerlessHandler";

const headers = {
    'Content-Type': 'application/json'
};

export const handler = async (apiEvent: APIGatewayProxyEvent) => new ServerlessHandler(apiEvent)
    .withRequiredPathParams(['path', 'param']) // These are both guaranteed to be present
    .withSomeQueryParams(['maybe', 'test']) // At least one of these is guaranteed to be present
    .then(async (event: APIGatewayProxyEvent) => {
        console.log("Write your function here!");
        return {
            statusCode: 200,
            headers,
            body: "Hello world"
        };
    })
    .catch(async (err: Error) => {
        console.error("Error occurred", err);

        return {
            statusCode: 500,
            headers,
            body: "An unknown error occured"
        };
    })
    .build();
