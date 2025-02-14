import * as cdk from 'aws-cdk-lib';
import * as SNS from 'aws-cdk-lib/aws-sns';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Events from 'aws-cdk-lib/aws-events';
import * as EventTargets from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import path = require('path');

const BASE_COLLECTION_PERIOD = 15; // in minutes

export class ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create notifications infrastructure
    const appNotify = new SNS.Topic(this, 'app-notify-topic', {});

    // create failure notification infrastructure
    const failureNotify = new SNS.Topic(this, 'failure-notify-topic', {});

    const appStorage = new DynamoDB.TableV2(this, 'app-storage', {
      partitionKey: { name: 'USER_ID', type: DynamoDB.AttributeType.STRING },
    });

    const appLambda = new NodejsFunction(this, 'app-lambda-nodejs', {
      runtime: Lambda.Runtime.NODEJS_18_X,
      code: Lambda.Code.fromAsset(path.join(__dirname, '../assets/notification-lambda/dist/lambda.zip')),
      // entry: 'assets/notification-lambda/handler.ts',
      handler: 'handler.handler',
      memorySize: 1024,
      timeout: Duration.minutes(5), // give our Lambda about 5 minutes to do find the price
      environment: {
        NOTIFICATION_TOPIC_ARN: appNotify.topicArn,
        FAILURE_TOPIC_ARN: failureNotify.topicArn,
        TABLE_ARN: appStorage.tableArn,
        MINIMUM_PRICE_DROP: '1',
      },
    });

    const accessHistoryTablePolicy = new IAM.PolicyStatement({
      actions: ['dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem'],
      resources: [appStorage.tableArn],
    });

    appLambda.role?.attachInlinePolicy(
      new IAM.Policy(this, 'retrieve-update-history-policy', {
        statements: [accessHistoryTablePolicy],
      }),
    );

    const appNotifyPolicy = new IAM.PolicyStatement({
      actions: ['sns:Publish'],
        resources: [appNotify.topicArn],
    });
    const appNotifySubscribePolicy = new IAM.PolicyStatement({
      actions: ['sns:Subscribe'],
      conditions: {
        StringEquals: {
          "sns:Protocol": "email"
        }
      },
      resources: [appNotify.topicArn],
    });
    const failureNotifyPolicy = new IAM.PolicyStatement({
      actions: ['sns:Publish'],
        resources: [failureNotify.topicArn],
    });

    appLambda.role?.attachInlinePolicy(
      new IAM.Policy(this, 'notifications-policy', {
        statements: [appNotifyPolicy, appNotifySubscribePolicy, failureNotifyPolicy],
      }),
    );

    const cronJob = new Events.Rule(this, 'app-cron-job', {
      schedule: Events.Schedule.rate(Duration.minutes(BASE_COLLECTION_PERIOD)),
    });
    cronJob.addTarget(new EventTargets.LambdaFunction(appLambda));
  }
}
