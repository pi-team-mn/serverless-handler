import {APIGatewayProxyEvent} from "aws-lambda";
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
            message: "Hello world"
        }
    })
    .catch(err => {
        console.error("Error occurred", err);

        return {
            statusCode: 500,
            headers,
            message: "An unknown error occured"
        };
    })
    .build();
