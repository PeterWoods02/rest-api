import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { teams } from "../seed/teams";
import { generateBatch } from "../shared/util";
import * as custom from "aws-cdk-lib/custom-resources";

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
        //PLAYERS_TABLE_NAME: playersTable.tableName, 
        REGION: "eu-west-1",
      },
    });

    new custom.AwsCustomResource(this, "TeamsDbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [teamsTable.tableName]: generateBatch(teams),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("TeamsDbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [teamsTable.tableArn],
      }),
    });

    //Access Grants
    teamsTable.grantReadWriteData(createTeamFn);
    teamsTable.grantReadData(getAllTeamsFn);
    teamsTable.grantReadData(getTeamByIdFn);
    //playersTable.grantReadData(getTeamByIdFn);


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

    // Teams endpoint
    const teamsEndpoint = api.root.addResource("teams");
    teamsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(createTeamFn, { proxy: true })
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

   
  }
}
