# cdk-lambda-template-for-scraping
## Deployment Environment
This project was built and deployed on an Ubuntu 22.04 EC2 instance
The follow commands were used to bootstrap the environment
```
$ sudo apt-get update
$ sudo apt install curl
$ sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
$ sudo apt install tsc
$ sudo apt install node-typescript
$ sudo apt install cdk
```

Docker was installed following the guidance here, [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/).

## Building and deploying
`$ npm i`
`$ npm run build:lambda`
`$ npm run cdk:synth`
`$ npm run cdk:bootstrap`
`$ npm run cdk:deploy`

## Features
### Base
- Basic notifications are provided through AWS SNS and must be applied manually through the SNS console
- The Amazon Kindle Fire product page is scraped for the following product description, "Amazon Fire Max 11 tablet (newest model)"
- If the above product description doesn't match anything on the Kindle Fire product page, the app will search Amazon for that product description and then sort by price, lowest to highest. (collecting and reporting this backup price isn't working in code)
- The app will run every 15 minutes
- The app stores a history of the prices collected in order from latest to oldest
- Logs for the app, including timestamps, are produced and available in CloudWatch Logs/Insights
- To perform a simple log review the following CloudWatch Insights query can be performed on the Lambda
```
fields @timestamp, @message
| filter @message like 'PRICE REVIEWED'
| sort @timestamp desc
| limit 100
```
- The minimum price difference to notify on can be configured through the Lambda console by setting the environment variable `MINIMUM_PRICE_DROP`
- Price comparison history is available for programmatic access through the stack's DynamoDB table

## Discussion
### Tradeoffs and challenges
- Using Lambda - this was a tradeoff to limit the infrastructure required for the project. It avoided setting up an ECS stack to run the process, but required that the solution use dated versions of the Node runtime and Chromium along with deprecated versions of Puppeteer.
- On making the scraping util self-healing, I ended up just adding a call to the search bar for this step (not currently working in code) but would have liked a better solution to track the Kindle Fire product page.
- Would have preferred to avoid using Puppeteer and just used a solution with `fetch` and `cheerio`, but portions of the Amazon.com shopping experience are loaded asynchronously and those bits necessitated the use of a full web browser to access.
### CDK build
- Glob and inflight `npm` warnings should be fixed in upcoming cdk versions, see GitHub issue [here](https://github.com/aws/aws-cdk/issues/32801).

## Statement on web scraping
[See statement here](./web-scraping-statement.md)
