import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { teams, players } from "../seed/teams";
import { generateBatch } from "../shared/util";
import * as custom from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Teams Table
    const teamsTable = new dynamodb.Table(this, 'TeamsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "teams",
    });

    // Players Table
    const playersTable = new dynamodb.Table(this, "PlayersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "teamId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "playerId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Players",
    });

    playersTable.addLocalSecondaryIndex({
      indexName: "positionIx",
      sortKey: { name: "position", type: dynamodb.AttributeType.STRING },
    });

    const createTeamFn = new lambdanode.NodejsFunction(this, "CreateTeamFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/createTeam.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const getAllTeamsFn = new lambdanode.NodejsFunction(this, "GetAllTeamsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllTeams.ts`, 
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1", 
      },
    });

    const getTeamByIdFn = new lambdanode.NodejsFunction(this, "GetTeamByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getTeamById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        PLAYERS_TABLE_NAME: playersTable.tableName, 
        REGION: "eu-west-1",
      },
    });

    const getTeamPlayersFn = new lambdanode.NodejsFunction(this, "GetTeamPlayersFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getTeamPlayers.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        PLAYERS_TABLE_NAME: playersTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const updateTeamFn = new lambdanode.NodejsFunction(this, "UpdateTeamFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/updateTeam.ts`, 
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const translateTeamFn = new lambdanode.NodejsFunction(this, "TranslateTeamFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/translateTeam.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1"
      }
    });
    

    new custom.AwsCustomResource(this, "TeamsDbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [teamsTable.tableName]: generateBatch(teams),
            [playersTable.tableName]: generateBatch(players)
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("TeamsDbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [teamsTable.tableArn, playersTable.tableArn],
      }),
    });

    //Access Grants
    teamsTable.grantReadWriteData(createTeamFn);
    teamsTable.grantReadData(getAllTeamsFn);
    teamsTable.grantReadData(getTeamByIdFn);
    playersTable.grantReadData(getTeamByIdFn);
    playersTable.grantReadData(getTeamPlayersFn);
    teamsTable.grantReadWriteData(updateTeamFn);
    teamsTable.grantReadData(translateTeamFn);
    

    translateTeamFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["translate:TranslateText"],
        resources: ["*"]
      })
    );


    // REST API 
    const api = new apig.RestApi(this, "TeamsApi", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // create api key
    const apiKey = new apig.ApiKey(this, "TeamsAPIKey", {
      apiKeyName: "Teams-API-Key",
      description: "API key for Teams Management API",
    });

    // create usage plan
    const usagePlan = new apig.UsagePlan(this, "TeamsAPIUsagePlan", {
      name: "Teams Management API Usage Plan",
      apiStages:[
        {
          api: api,
          stage:  api.deploymentStage,
        },
      ],
    });

    usagePlan.addApiKey(apiKey);
    

    // Teams endpoint
    const teamsEndpoint = api.root.addResource("teams");
    teamsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(createTeamFn, { proxy: true }),
      {
        apiKeyRequired: true 
      }
    );
    teamsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllTeamsFn, { proxy: true })
    );

    const specificTeamEndpoint = teamsEndpoint.addResource("{teamId}");
    specificTeamEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTeamByIdFn, { proxy: true })
    );
    specificTeamEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateTeamFn, { proxy: true }),
      {
        apiKeyRequired: true 
      }
    );

    const playersEndpoint = api.root.addResource("players");
    playersEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTeamPlayersFn, { proxy: true })
    );

    const translateEndpoint = specificTeamEndpoint.addResource("translate");
    translateEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(translateTeamFn, { proxy: true })
    );

   
  }
}
