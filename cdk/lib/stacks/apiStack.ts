import * as cdk from 'aws-cdk-lib';
import * as apig from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApiConstructor } from '../constructs/apiLambdaConstruct';
import { DatabaseStack } from './databaseStack';

interface ApiStackProps extends cdk.StackProps {
  databaseStack: DatabaseStack;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const api = new apig.RestApi(this, 'TeamsApi', {
      description: 'Teams REST API',
      deployOptions: { stageName: 'dev' },
      defaultCorsPreflightOptions: {
        allowHeaders: ['Content-Type', 'X-Amz-Date'],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['*'],
      },
    });

    const apiKey = new apig.ApiKey(this, 'TeamsAPIKey', {
      apiKeyName: 'Teams-API-Key',
    });

    const usagePlan = new apig.UsagePlan(this, 'TeamsAPIUsagePlan', {
      name: 'Teams Management API Usage Plan',
      apiStages: [{ api, stage: api.deploymentStage }],
    });

    usagePlan.addApiKey(apiKey);

    // Teams POST
    new ApiConstructor(this, 'CreateTeam', {
      api,
      path: 'teams',
      method: 'POST',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/createTeam.ts`,
      apiKeyRequired: true,
      readWriteAccess: true,
    });

    // Teams GET (all)
    new ApiConstructor(this, 'GetAllTeams', {
      api,
      path: 'teams',
      method: 'GET',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/getAllTeams.ts`,
    });

    // Team GET by id — store it in a variable to add more permissions
    const getTeamByIdConstruct = new ApiConstructor(this, 'GetTeamById', {
      api,
      path: 'teams/{teamId}',
      method: 'GET',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/getTeamById.ts`,
      additionalEnv: {
        PLAYERS_TABLE_NAME: props.databaseStack.playersTable.tableName,
      },
    });

    // permissions to player table
    props.databaseStack.playersTable.grantReadData(getTeamByIdConstruct.lambdaFn);

    // grant dynamodb:Query on the players table
    getTeamByIdConstruct.lambdaFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:Query'],
        resources: [props.databaseStack.playersTable.tableArn],
      })
    );

    // Team PUT 
    new ApiConstructor(this, 'UpdateTeam', {
      api,
      path: 'teams/{teamId}',
      method: 'PUT',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/updateTeam.ts`,
      apiKeyRequired: true,
      readWriteAccess: true,
    });

    // Players GET
    new ApiConstructor(this, 'GetPlayers', {
      api,
      path: 'players',
      method: 'GET',
      table: props.databaseStack.playersTable,
      lambdaEntry: `${__dirname}/../../lambdas/getTeamPlayers.ts`,
    });

    // Translate GET
    new ApiConstructor(this, 'TranslateTeam', {
      api,
      path: 'teams/{teamId}/translate',
      method: 'GET',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/translateTeam.ts`,
      attachTranslatePolicy: true,
    });
  }
}
