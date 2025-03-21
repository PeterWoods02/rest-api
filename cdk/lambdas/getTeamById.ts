import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    const teamId = pathParameters?.teamId ? parseInt(pathParameters.teamId) : undefined;

    const queryParams = event?.queryStringParameters || {};
    const includePlayers = queryParams.players === "true";
    const isCaptain = queryParams.isCaptain;
    const position = queryParams.position;

    if (!teamId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid team ID" }),
      };
    }

    // Get team details
    const getTeamCommand = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: teamId },
    });

    const teamResult = await ddbDocClient.send(getTeamCommand);

    if (!teamResult.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: `Team with ID ${teamId} not found.` }),
      };
    }

    
    let players: Record<string, any>[] | null = null;
    if (includePlayers) {
      const playersTableName = process.env.PLAYERS_TABLE_NAME;
      if (playersTableName) {
        let queryCommandParams: any = {
          TableName: playersTableName,
          KeyConditionExpression: "teamId = :teamId",
          ExpressionAttributeValues: {
            ":teamId": teamId.toString(),
          },
        };
        let expressionAttributeNames: Record<string, string> = {};
        let expressionAttributeValues: Record<string, any> = {
          ":teamId": teamId.toString(),
        };
        
        if (position) {
          queryCommandParams.IndexName = "positionIx"; 
          queryCommandParams.KeyConditionExpression = "teamId = :teamId AND #position = :position";
          expressionAttributeNames["#position"] = "position";
          expressionAttributeValues[":position"] = position;
        }
        if (typeof isCaptain !== "undefined") {
          const isCaptainBoolean = isCaptain === "true";
          queryCommandParams.FilterExpression = "#isCaptain = :isCaptain";
          expressionAttributeNames["#isCaptain"] = "isCaptain";
          expressionAttributeValues[":isCaptain"] = isCaptainBoolean;
        }

        if (Object.keys(expressionAttributeNames).length > 0) {
          queryCommandParams.ExpressionAttributeNames = expressionAttributeNames;
        }

        queryCommandParams.ExpressionAttributeValues = expressionAttributeValues;
        const playersResult = await ddbDocClient.send(
          new QueryCommand(queryCommandParams)
        );
        players = playersResult.Items || [];
      } else {
        console.warn("PLAYERS_TABLE_NAME environment variable is not set.");
      }
    }

    // Build response
    const response = {
      id: teamResult.Item.id,
      teamName: teamResult.Item.teamName,
      country: teamResult.Item.country,
      league: teamResult.Item.league,
      location: teamResult.Item.location,
      founded: teamResult.Item.founded,
      stadium: teamResult.Item.stadium,
      titlesWon: teamResult.Item.titlesWon,
      isActive: teamResult.Item.isActive,
      history: teamResult.Item.history,
      players: players || null,
    };

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Failed to fetch team",
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
