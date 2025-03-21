import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(
  schema.definitions["PlayerQueryParams"] || {}
);

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const queryParams = event.queryStringParameters || {};

    if (!queryParams.teamId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing required query parameter: teamId" }),
      };
    }

    if (!isValidQueryParams(queryParams)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Incorrect query parameter type. Must match PlayerQueryParams schema.",
          schema: schema.definitions["PlayerQueryParams"],
        }),
      };
    }

    const teamId = queryParams.teamId;
    const position = queryParams.position;
    const isCaptain = queryParams.isCaptain;
    const players = queryParams.players;

    if (players === "false") {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: [],
        }),
      };
    }

    let commandInput: QueryCommandInput = {
      TableName: process.env.PLAYERS_TABLE_NAME,
      KeyConditionExpression: "teamId = :teamId",
      ExpressionAttributeValues: {
        ":teamId": teamId,
      },
    };

    let expressionAttributeNames: Record<string, string> = {};
    let expressionAttributeValues: Record<string, any> = {
      ":teamId": teamId,
    };

    
    if (position) {
      commandInput.IndexName = "positionIx"; 
      commandInput.KeyConditionExpression = "teamId = :teamId AND position = :pos";
      expressionAttributeValues[":pos"] = position;
    }
    if (typeof isCaptain !== "undefined") {
      const isCaptainBoolean = isCaptain === "true";
      commandInput.FilterExpression = "#isCaptain = :isCaptain";
      expressionAttributeNames["#isCaptain"] = "isCaptain";
      expressionAttributeValues[":isCaptain"] = isCaptainBoolean;
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      commandInput.ExpressionAttributeNames = expressionAttributeNames;
    }

    commandInput.ExpressionAttributeValues = expressionAttributeValues;


    const commandOutput = await ddbDocClient.send(
      new QueryCommand(commandInput)
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: commandOutput.Items || [],
      }),
    };

  } catch (error: any) {
    console.error(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}
