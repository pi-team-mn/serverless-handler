"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ServerlessHandler_1 = require("../src/ServerlessHandler");
const headers = {
    'Content-Type': 'application/json'
};
exports.handler = async (apiEvent) => new ServerlessHandler_1.ServerlessHandler(apiEvent)
    .withRequiredPathParams(['path', 'param']) // These are both guaranteed to be present
    .withSomeQueryParams(['maybe', 'test']) // At least one of these is guaranteed to be present
    .then(async (event) => {
    console.log("Write your function here!");
    return {
        statusCode: 200,
        headers,
        body: "Hello world"
    };
})
    .catch(async (err) => {
    console.error("Error occurred", err);
    return {
        statusCode: 500,
        headers,
        body: "An unknown error occured"
    };
})
    .build();
