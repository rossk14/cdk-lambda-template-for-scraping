#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProjectStack } from './stacks/project-stack';

const app = new cdk.App();
new ProjectStack(app, 'ProjectStack', {
  env: {
    region: 'us-east-1',
    account: '[account here]',
  }
});
