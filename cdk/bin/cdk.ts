#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/databaseStack';
import { ApiStack } from '../lib/stacks/apiStack';

const app = new cdk.App();

const dbStack = new DatabaseStack(app, 'DatabaseStack');
new ApiStack(app, 'ApiStack', { databaseStack: dbStack });