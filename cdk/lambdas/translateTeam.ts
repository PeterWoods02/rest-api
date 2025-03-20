import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const REGION = process.env.REGION || "eu-west-1";
const TABLE_NAME = process.env.TABLE_NAME || "";

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

    // Fetch the team from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: parseInt(teamId) }
    });

    const result = await ddbDocClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: `Team with ID ${teamId} not found`
        })
      };
    }

    const historyText = result.Item.history;
    if (!historyText) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "No history field found to translate"
        })
      };
    }

    // Translate the history text
    const translateCommand = new TranslateTextCommand({
      Text: historyText,
      SourceLanguageCode: "en",
      TargetLanguageCode: language
    });

    const translated = await translateClient.send(translateCommand);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teamId,
        originalHistory: historyText,
        translatedHistory: translated.TranslatedText,
        targetLanguage: language
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
