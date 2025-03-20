import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Team"] || {}); 

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // Get path parameters
        const parameters = event?.pathParameters;
        const teamId = parameters?.teamId
            ? parseInt(parameters.teamId)
            : undefined;

        if (!teamId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing team ID" }),
            };
        }

        // Parse request body
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        // Validate body against schema
        if (!isValidBodyParams(body)) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: `Incorrect type. Must match the Team schema`,
                    schema: schema.definitions["Team"],
                }),
            };
        }

        // Update the team using explicit fields
        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    id: teamId,
                },
                UpdateExpression: `
                    SET teamName = :tn,
                        country = :cty,
                        league = :lg,
                        #location = :loc,
                        founded = :fnd,
                        stadium = :sd,
                        titlesWon = :tw,
                        isActive = :ia,
                        history = :hst
                `,
                ExpressionAttributeNames: {
                    "#location": "location"
                  },
                ExpressionAttributeValues: {
                    ":tn": body.teamName,
                    ":cty": body.country,
                    ":lg": body.league,
                    ":loc": body.location,
                    ":fnd": body.founded,
                    ":sd": body.stadium,
                    ":tw": body.titlesWon,
                    ":ia": body.isActive,
                    ":hst": body.history
                },
            })
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Team updated successfully",
            }),
        };
    } catch (error: any) {
        console.error(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                message: "Failed to update team",
                error: error.message,
            }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
