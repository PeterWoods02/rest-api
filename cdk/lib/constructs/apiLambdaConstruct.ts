import { Construct } from 'constructs';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apig from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

interface ApiConstructorProps {
  api: apig.RestApi;
  path: string;
  method: string;
  table: dynamodb.Table;
  lambdaEntry: string;
  apiKeyRequired?: boolean;
  readWriteAccess?: boolean;
  additionalEnv?: { [key: string]: string };
  attachTranslatePolicy?: boolean;
}

export class ApiConstructor extends Construct {
  public readonly lambdaFn: lambdanode.NodejsFunction; 

  constructor(scope: Construct, id: string, props: ApiConstructorProps) {
    super(scope, id);

    this.lambdaFn = new lambdanode.NodejsFunction(this, `${id}Fn`, {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: props.lambdaEntry,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: props.table.tableName,
        REGION: 'eu-west-1',
        ...(props.additionalEnv || {}),
      },
    });

    if (props.readWriteAccess) {
      props.table.grantReadWriteData(this.lambdaFn);
    } else {
      props.table.grantReadData(this.lambdaFn);
    }

    if (props.attachTranslatePolicy) {
      this.lambdaFn.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['translate:TranslateText'],
          resources: ['*'],
        })
      );
    }

    const resource = props.api.root.resourceForPath(props.path);
    resource.addMethod(
      props.method,
      new apig.LambdaIntegration(this.lambdaFn, { proxy: true }),
      {
        apiKeyRequired: props.apiKeyRequired || false,
      }
    );
  }
}
