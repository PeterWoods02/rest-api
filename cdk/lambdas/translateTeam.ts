import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const REGION = process.env.REGION || "eu-west-1";
const TABLE_NAME = process.env.TABLE_NAME || "";
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || "";

const ddbDocClient = createDocumentClient();
const translateClient = new TranslateClient({ region: REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const teamId = event?.pathParameters?.teamId;
    const language = event?.queryStringParameters?.language;

    if (!teamId || !language) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Missing required parameters: teamId or language"
        })
      };
    }
    // Fetch the team from Teams table
    const getTeamCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: parseInt(teamId) }
    });

    const teamResult = await ddbDocClient.send(getTeamCommand);
    if (!teamResult.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: `Team with ID ${teamId} not found`
        })
      };
    }

    const historyText = teamResult.Item.history;
    if (!historyText) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "No history field found to translate"
        })
      };
    }

    // Build a key for caches table
    const getCacheCommand = new GetCommand({
      TableName: CACHE_TABLE_NAME,
      Key: {
        teamId: teamId,
        language: language
      }
    });

    const cachedResult = await ddbDocClient.send(getCacheCommand);

    let fromCache = false;
    let translatedHistory;

    if (cachedResult.Item) {
      console.log("Cached translation found");

      // Compare cached history with current history
      if (cachedResult.Item.originalHistory === historyText) {
        console.log("History matches cache - returning cached translation");
        translatedHistory = cachedResult.Item.translatedHistory;
        fromCache = true;
      } else {
        console.log("History changed - invalidating cache and re-translating");
      }
    }

    // If no cached translation OR history changed. translate 
    if (!translatedHistory) {
      const translateCommand = new TranslateTextCommand({
        Text: historyText,
        SourceLanguageCode: "en",
        TargetLanguageCode: language
      });

      const translated = await translateClient.send(translateCommand);
      translatedHistory = translated.TranslatedText;

      // Save the new translation along with the current history
      const putCacheCommand = new PutCommand({
        TableName: CACHE_TABLE_NAME,
        Item: {
          teamId: teamId,
          language: language,
          translatedHistory: translatedHistory,
          originalHistory: historyText,
          timestamp: new Date().toISOString()
        }
      });

      await ddbDocClient.send(putCacheCommand);
      console.log("Translation cached in translations table");
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teamId,
        translatedHistory: translatedHistory,
        targetLanguage: language,
        cached: fromCache
      })
    };

  } catch (error: any) {
    console.error(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Failed to translate history",
        error: error.message
      })
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true },
    unmarshallOptions: { wrapNumbers: false }
  });
}
