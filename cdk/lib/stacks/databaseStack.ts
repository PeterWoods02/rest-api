
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as custom from 'aws-cdk-lib/custom-resources';
import { teams, players } from '../../seed/teams';
import { generateBatch } from '../../shared/util';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly teamsTable: dynamodb.Table;
  public readonly playersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.teamsTable = new dynamodb.Table(this, 'TeamsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: 'teams',
    });

    this.playersTable = new dynamodb.Table(this, 'PlayersTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: 'players'
    });
    
    this.playersTable.addLocalSecondaryIndex({
      indexName: 'positionIx',
      sortKey: { name: 'position', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });
    
    new custom.AwsCustomResource(this, 'TeamsDbInitData', {
      onCreate: {
        service: 'DynamoDB',
        action: 'batchWriteItem',
        parameters: {
          RequestItems: {
            [this.teamsTable.tableName]: generateBatch(teams),
            [this.playersTable.tableName]: generateBatch(players)
          }
        },
        physicalResourceId: custom.PhysicalResourceId.of('TeamsDbInitData'),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [this.teamsTable.tableArn, this.playersTable.tableArn],
      }),
    });
  }
}
