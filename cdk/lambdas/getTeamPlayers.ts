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

    const queryParams = event.queryStringParameters;

    if (!queryParams || !queryParams.teamId) {
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

    let commandInput: QueryCommandInput = {
        TableName: process.env.PLAYERS_TABLE_NAME,
        KeyConditionExpression: "teamId = :teamId",
        ExpressionAttributeValues: {
          ":teamId": teamId,
        },
      };

    if (position) {
        commandInput = {
          TableName: process.env.PLAYERS_TABLE_NAME,
          IndexName: "positionIx",
          KeyConditionExpression: "teamId = :teamId AND begins_with(#pos, :pos)",
          ExpressionAttributeNames: {
            "#pos": "position"
          },
          ExpressionAttributeValues: {
            ":teamId": teamId,
            ":pos": position
          }
        };
      } 
        
    
    if (typeof isCaptain !== "undefined") {
        const isCaptainBoolean = isCaptain === "true"; 
        
        commandInput.FilterExpression = "#isCaptain = :isCaptain";
        commandInput.ExpressionAttributeNames = {
          ...(commandInput.ExpressionAttributeNames || {}),
          "#isCaptain": "isCaptain",
        };
        commandInput.ExpressionAttributeValues = {
          ...(commandInput.ExpressionAttributeValues || {}),
          ":isCaptain": isCaptainBoolean,
        };
      }

    const commandOutput = await ddbDocClient.send(
      new QueryCommand(commandInput)
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: commandOutput.Items,
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
