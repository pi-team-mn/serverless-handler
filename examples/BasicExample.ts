import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {ServerlessPreconditions} from "../src/ServerlessPreconditions";

const headers = {
    'Content-Type': 'application/json'
};

export const handler = async (apiEvent: APIGatewayProxyEvent) => new ServerlessPreconditions(apiEvent)
    .withRequiredPathParams(['path', 'param'])
    .withSomeQueryParams(['maybe', 'test'])
    .then((event: APIGatewayProxyEvent) => {
        console.log("Write your function here!");
        return {
            statusCode: 200,
            headers,
            body: "Hello world"
        };
    })
    .catch((err: Error) => {
        console.error("Error occurred", err);

        return {
            statusCode: 500,
            headers,
            body: "An unknown error occured"
        };
    })
    .build();
